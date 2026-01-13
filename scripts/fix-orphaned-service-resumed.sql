-- Fix orphaned SERVICE_RESUMED threads by linking their alerts to the parent disruption thread
-- and hiding the orphaned threads

-- 1. Update alert_cache: Link orphaned SERVICE_RESUMED alert to the main thread
UPDATE alert_cache 
SET thread_id = 'thread-ttc-512-service_disruption'
WHERE thread_id = 'thread-d69f5716-f3cb-4a35-9eb1-c451f6261e11';

-- 2. Hide the orphaned thread
UPDATE incident_threads
SET is_hidden = true, updated_at = NOW()
WHERE thread_id = 'thread-d69f5716-f3cb-4a35-9eb1-c451f6261e11';

-- 3. Ensure the main thread has SERVICE_RESUMED category and is resolved
UPDATE incident_threads
SET is_resolved = true,
    resolved_at = COALESCE(resolved_at, NOW()),
    categories = categories || CASE WHEN NOT categories @> '["SERVICE_RESUMED"]' THEN '["SERVICE_RESUMED"]'::jsonb ELSE '[]'::jsonb END,
    updated_at = NOW()
WHERE thread_id = 'thread-ttc-512-service_disruption';
