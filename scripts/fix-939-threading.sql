-- Fix 939 Finch Express alert threading
-- This script separates 939 alerts that were incorrectly threaded into 39 threads

-- 1. Find alerts for route 939 that are in threads for route 39
WITH conflicting_alerts AS (
  SELECT ac.alert_id, ac.thread_id, ac.header_text, ac.affected_routes, it.title AS thread_title
  FROM alert_cache ac
  JOIN incident_threads it ON ac.thread_id = it.thread_id
  WHERE ac.header_text ILIKE '%939%'
    AND it.title NOT ILIKE '%939%'
    AND it.title ILIKE '%39%'
)
SELECT * FROM conflicting_alerts;

-- 2. Create a new thread for 939 and move the alert to it
-- First, identify the 939 alert
DO $$
DECLARE
  v_alert_id TEXT;
  v_header_text TEXT;
  v_routes JSONB;
  v_new_thread_id UUID;
BEGIN
  -- Find the 939 alert that's incorrectly in a 39 thread
  SELECT ac.alert_id, ac.header_text, ac.affected_routes
  INTO v_alert_id, v_header_text, v_routes
  FROM alert_cache ac
  JOIN incident_threads it ON ac.thread_id = it.thread_id
  WHERE ac.header_text ILIKE '%939%Finch%Express%'
    AND it.title NOT ILIKE '%939%'
  LIMIT 1;
  
  IF v_alert_id IS NOT NULL THEN
    -- Create new thread for 939
    v_new_thread_id := gen_random_uuid();
    
    INSERT INTO incident_threads (thread_id, title, categories, affected_routes, is_resolved, created_at, updated_at)
    VALUES (v_new_thread_id, v_header_text, '["DIVERSION"]'::JSONB, '["939"]'::JSONB, false, NOW(), NOW());
    
    -- Update the alert to point to the new thread
    UPDATE alert_cache SET thread_id = v_new_thread_id WHERE alert_id = v_alert_id;
    
    RAISE NOTICE 'Created new thread % for alert %', v_new_thread_id, v_alert_id;
  ELSE
    RAISE NOTICE 'No conflicting 939 alert found';
  END IF;
END $$;

-- 3. Verify the fix
SELECT ac.alert_id, ac.header_text, ac.affected_routes, it.title AS thread_title
FROM alert_cache ac
JOIN incident_threads it ON ac.thread_id = it.thread_id
WHERE ac.header_text ILIKE '%939%' OR it.title ILIKE '%939%';
