-- Migration: Enable pg_cron and create automated cleanup job
-- Created: 2025-12-10
-- Timezone: America/Toronto (EST/EDT) - DST-aware scheduling
-- Retention Policy: 15 days for resolved threads and orphan alerts

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Core cleanup function for 15-day retention
DROP FUNCTION IF EXISTS cleanup_old_alerts();

CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS TABLE(threads_deleted INT, alerts_deleted INT, cleanup_time TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_threads INT;
    v_alerts INT;
    v_orphans INT;
BEGIN
    -- Step 1: Delete resolved threads older than 15 days
    DELETE FROM incident_threads 
    WHERE is_resolved = true 
    AND updated_at < now() - interval '15 days';
    GET DIAGNOSTICS v_threads = ROW_COUNT;
    
    -- Step 2: Delete alerts whose threads no longer exist
    DELETE FROM alert_cache 
    WHERE thread_id NOT IN (SELECT thread_id FROM incident_threads WHERE thread_id IS NOT NULL);
    GET DIAGNOSTICS v_alerts = ROW_COUNT;
    
    -- Step 3: Delete orphan alerts (no thread) older than 15 days
    DELETE FROM alert_cache
    WHERE thread_id IS NULL
    AND created_at < now() - interval '15 days';
    GET DIAGNOSTICS v_orphans = ROW_COUNT;
    
    -- Return results with Toronto time
    RETURN QUERY SELECT 
        v_threads, 
        v_alerts + v_orphans, 
        to_char(now() AT TIME ZONE 'America/Toronto', 'YYYY-MM-DD HH24:MI:SS');
END;
$$;

-- DST-aware wrapper: Only executes at 4 AM Toronto time
DROP FUNCTION IF EXISTS cleanup_old_alerts_toronto();

CREATE OR REPLACE FUNCTION cleanup_old_alerts_toronto()
RETURNS TABLE(threads_deleted INT, alerts_deleted INT, cleanup_time TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    toronto_hour INT;
BEGIN
    -- Get current hour in Toronto timezone
    toronto_hour := EXTRACT(hour FROM now() AT TIME ZONE 'America/Toronto');
    
    -- Only run if it's 4 AM in Toronto (regardless of DST)
    IF toronto_hour = 4 THEN
        RETURN QUERY SELECT * FROM cleanup_old_alerts();
    ELSE
        -- Return empty result if not 4 AM Toronto
        RETURN QUERY SELECT 0::INT, 0::INT, 
            'Skipped: Currently ' || toronto_hour || ':00 Toronto time';
    END IF;
END;
$$;

-- ============================================
-- CRON SCHEDULING (DST-aware)
-- ============================================
-- Schedule at both 8 AM and 9 AM UTC to handle DST transitions
-- The function only executes when it's actually 4 AM in Toronto

-- 8 AM UTC = 4 AM EDT (Daylight Saving Time, summer)
SELECT cron.schedule(
    'cleanup-alerts-8am-utc',           
    '0 8 * * *',
    'SELECT cleanup_old_alerts_toronto()'
);

-- 9 AM UTC = 4 AM EST (Standard Time, winter)
SELECT cron.schedule(
    'cleanup-alerts-9am-utc',           
    '0 9 * * *',
    'SELECT cleanup_old_alerts_toronto()'
);

-- ============================================
-- USEFUL COMMANDS
-- ============================================
-- Manually run cleanup (bypasses time check):
--   SELECT * FROM cleanup_old_alerts();
--
-- Test DST-aware cleanup (respects 4 AM check):
--   SELECT * FROM cleanup_old_alerts_toronto();
--
-- View scheduled jobs:
--   SELECT jobid, jobname, schedule, command FROM cron.job;
--
-- View job history:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Unschedule jobs:
--   SELECT cron.unschedule('cleanup-alerts-8am-utc');
--   SELECT cron.unschedule('cleanup-alerts-9am-utc');
--
-- Check Toronto time:
--   SELECT now() AT TIME ZONE 'America/Toronto' as toronto_time;
--
-- Check if currently DST:
--   SELECT EXTRACT(timezone FROM now() AT TIME ZONE 'America/Toronto') / 3600 as utc_offset;
