-- Migration: scrape-rsz pg_cron automation
-- Created: 2026-01-10
-- Version: 1.0
-- 
-- This migration sets up automated scraping of RSZ data from TTC website
-- every 30 minutes using pg_cron and pg_net extensions

-- ============================================
-- STEP 1: Create function to invoke scrape-rsz Edge Function
-- ============================================
CREATE OR REPLACE FUNCTION invoke_scrape_rsz()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
BEGIN
  -- Get service role key from vault (same as poll-alerts)
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  IF service_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key not found in vault.';
  END IF;
  
  -- Make async HTTP POST to scrape-rsz Edge Function
  PERFORM net.http_post(
    url := 'https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/scrape-rsz',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION invoke_scrape_rsz IS 'Invokes the scrape-rsz Edge Function via HTTP POST using pg_net. Called by pg_cron every 30 minutes.';

-- ============================================
-- STEP 2: Schedule cron job (every 30 minutes)
-- ============================================
-- Note: This will error if the job already exists
SELECT cron.schedule(
  'scrape-rsz-30min',          -- job name
  '*/30 * * * *',              -- every 30 minutes
  $$SELECT invoke_scrape_rsz()$$  -- SQL to execute
);

-- ============================================
-- USAGE NOTES
-- ============================================
-- 
-- To view scheduled jobs:
--   SELECT * FROM cron.job;
--
-- To view recent job runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- To manually invoke the function:
--   SELECT invoke_scrape_rsz();
--
-- To unschedule the job:
--   SELECT cron.unschedule('scrape-rsz-30min');
