-- Migration: poll-alerts pg_cron automation
-- Created: 2025-12-10
-- Version: 1.1 (Updated 2026-01-17 - changed from 2 min to 1 min polling)
-- 
-- This migration sets up automated polling of TTC alerts every 1 minute
-- using pg_cron and pg_net extensions to call the poll-alerts Edge Function

-- ============================================
-- STEP 1: Enable pg_net extension for HTTP requests
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- STEP 2: Store service role key in vault
-- ============================================
-- NOTE: This must be done manually in the Supabase dashboard or via SQL
-- The service_role key should be stored as 'service_role_key' in vault.secrets
-- 
-- Example (replace with actual key):
-- SELECT vault.create_secret('your-service-role-key', 'service_role_key', 'Service role key for Edge Function invocation');

-- ============================================
-- STEP 3: Create function to invoke poll-alerts Edge Function
-- ============================================
CREATE OR REPLACE FUNCTION invoke_poll_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
BEGIN
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  IF service_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key not found in vault. Add it with: SELECT vault.create_secret(''your-key'', ''service_role_key'');';
  END IF;
  
  -- Make async HTTP POST to poll-alerts Edge Function
  PERFORM net.http_post(
    url := 'https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/poll-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION invoke_poll_alerts IS 'Invokes the poll-alerts Edge Function via HTTP POST using pg_net. Called by pg_cron every 1 minute.';

-- ============================================
-- STEP 4: Schedule cron job (every 1 minute)
-- ============================================
-- Note: This will error if the job already exists - that's expected
DO $$
BEGIN
  -- Check if job already exists
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'poll-alerts-cron') THEN
    PERFORM cron.schedule(
      'poll-alerts-cron',           -- unique job name
      '* * * * *',                  -- every 1 minute
      'SELECT invoke_poll_alerts()' -- command to run
    );
    RAISE NOTICE 'Created poll-alerts-cron job';
  ELSE
    RAISE NOTICE 'poll-alerts-cron job already exists';
  END IF;
END $$;

-- ============================================
-- STEP 5: Fix cleanup_old_data function (foreign key issue)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  old_thread_ids uuid[];
BEGIN
  -- Step 1: Delete old alerts (keep 48 hours for threading)
  DELETE FROM public.alert_cache 
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  -- Step 2: Find threads that are either:
  --   a) Resolved and older than 24 hours
  --   b) Unresolved but stale (older than 12 hours)
  SELECT ARRAY_AGG(thread_id) INTO old_thread_ids
  FROM public.incident_threads 
  WHERE (is_resolved = true AND updated_at < NOW() - INTERVAL '24 hours')
     OR (updated_at < NOW() - INTERVAL '12 hours');
  
  -- Step 3: Unlink any alerts still pointing to these threads
  IF old_thread_ids IS NOT NULL THEN
    UPDATE public.alert_cache 
    SET thread_id = NULL 
    WHERE thread_id = ANY(old_thread_ids);
    
    -- Step 4: Now safely delete the old threads
    DELETE FROM public.incident_threads 
    WHERE thread_id = ANY(old_thread_ids);
  END IF;
  
  -- Delete expired webauthn challenges
  DELETE FROM public.webauthn_challenges 
  WHERE expires_at < NOW();
  
  -- Delete old notification history (keep 7 days)
  DELETE FROM public.notification_history 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$function$;

COMMENT ON FUNCTION cleanup_old_data IS 'Cleans up old alerts, threads, challenges, and notifications. Fixed to handle foreign key constraints properly.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- View all cron jobs:
-- SELECT jobid, jobname, schedule, command, active FROM cron.job ORDER BY jobname;

-- View recent poll-alerts runs:
-- SELECT jobid, runid, status, start_time, end_time, return_message 
-- FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'poll-alerts-cron')
-- ORDER BY start_time DESC LIMIT 10;

-- View HTTP responses from poll-alerts:
-- SELECT id, status_code, content, created FROM net._http_response ORDER BY id DESC LIMIT 10;

-- Manually trigger poll-alerts:
-- SELECT invoke_poll_alerts();

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To disable the cron job:
-- SELECT cron.unschedule('poll-alerts-cron');
-- 
-- To remove the function:
-- DROP FUNCTION IF EXISTS invoke_poll_alerts();
