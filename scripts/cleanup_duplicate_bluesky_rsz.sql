-- One-time cleanup script to resolve duplicate BlueSky RSZ threads
-- that overlap with TTC API RSZ threads
-- 
-- TTC API is authoritative for RSZ (Reduced Speed Zone) alerts
-- BlueSky RSZ posts are redundant when TTC API already provides the data
-- 
-- Run this script once after deploying poll-alerts v46
-- Date: December 15, 2025

-- Step 1: Identify BlueSky threads that are RSZ-related and have overlapping TTC API threads
-- We detect BlueSky RSZ threads by checking if the title contains RSZ keywords
WITH bluesky_rsz_threads AS (
  SELECT DISTINCT
    it.thread_id,
    it.title,
    it.affected_routes,
    it.created_at
  FROM incident_threads it
  INNER JOIN alert_cache ac ON ac.thread_id = it.thread_id
  WHERE it.is_resolved = false
    AND ac.alert_id LIKE 'bsky-%'
    AND (
      LOWER(it.title) LIKE '%reduced speed%'
      OR LOWER(it.title) LIKE '%slow zone%'
      OR LOWER(it.title) LIKE '%speed restriction%'
      OR LOWER(it.title) LIKE '%slower speeds%'
      OR LOWER(it.title) LIKE '%operating at reduced speed%'
      OR LOWER(it.title) LIKE '%trains running slower%'
      OR LOWER(it.title) LIKE '%slower service%'
    )
    -- Only subway lines (Line 1-4)
    AND (
      it.affected_routes::text LIKE '%Line 1%'
      OR it.affected_routes::text LIKE '%Line 2%'
      OR it.affected_routes::text LIKE '%Line 3%'
      OR it.affected_routes::text LIKE '%Line 4%'
    )
),
ttc_api_rsz_threads AS (
  SELECT DISTINCT
    it.thread_id,
    it.affected_routes
  FROM incident_threads it
  INNER JOIN alert_cache ac ON ac.thread_id = it.thread_id
  WHERE it.is_resolved = false
    AND (
      ac.alert_id LIKE 'ttc-RSZ-%'
      OR (ac.raw_data->>'source' = 'ttc-api' AND ac.raw_data->>'stopStart' IS NOT NULL)
    )
),
duplicate_bluesky_threads AS (
  SELECT 
    brt.thread_id,
    brt.title,
    brt.affected_routes
  FROM bluesky_rsz_threads brt
  WHERE EXISTS (
    SELECT 1 FROM ttc_api_rsz_threads tat
    WHERE (
      -- Check for route overlap
      brt.affected_routes::text LIKE '%Line 1%' AND tat.affected_routes::text LIKE '%Line 1%'
      OR brt.affected_routes::text LIKE '%Line 2%' AND tat.affected_routes::text LIKE '%Line 2%'
      OR brt.affected_routes::text LIKE '%Line 3%' AND tat.affected_routes::text LIKE '%Line 3%'
      OR brt.affected_routes::text LIKE '%Line 4%' AND tat.affected_routes::text LIKE '%Line 4%'
    )
  )
)
-- Preview what will be resolved (run this first to verify)
SELECT 
  dbt.thread_id,
  dbt.title,
  dbt.affected_routes,
  'Will be resolved - redundant with TTC API RSZ thread' as action
FROM duplicate_bluesky_threads dbt;

-- Step 2: Actually resolve the duplicate threads (uncomment to execute)
-- UPDATE incident_threads
-- SET 
--   is_resolved = true,
--   resolved_at = NOW(),
--   updated_at = NOW()
-- WHERE thread_id IN (
--   SELECT thread_id FROM duplicate_bluesky_threads
-- );

-- Alternative: Run this direct UPDATE if the CTE approach doesn't work
-- This resolves BlueSky RSZ threads when TTC API RSZ thread exists for same line
/*
UPDATE incident_threads it_update
SET 
  is_resolved = true,
  resolved_at = NOW(),
  updated_at = NOW()
WHERE it_update.thread_id IN (
  SELECT DISTINCT it.thread_id
  FROM incident_threads it
  INNER JOIN alert_cache ac ON ac.thread_id = it.thread_id
  WHERE it.is_resolved = false
    AND ac.alert_id LIKE 'bsky-%'
    -- BlueSky thread has RSZ keywords in title
    AND (
      LOWER(it.title) LIKE '%reduced speed%'
      OR LOWER(it.title) LIKE '%slow zone%'
      OR LOWER(it.title) LIKE '%speed restriction%'
      OR LOWER(it.title) LIKE '%slower speeds%'
    )
    -- Is a subway line
    AND (
      it.affected_routes::text LIKE '%Line 1%'
      OR it.affected_routes::text LIKE '%Line 2%'
      OR it.affected_routes::text LIKE '%Line 3%'
      OR it.affected_routes::text LIKE '%Line 4%'
    )
    -- Has overlapping TTC API RSZ thread
    AND EXISTS (
      SELECT 1 FROM incident_threads it2
      INNER JOIN alert_cache ac2 ON ac2.thread_id = it2.thread_id
      WHERE it2.is_resolved = false
        AND it2.thread_id != it.thread_id
        AND (ac2.alert_id LIKE 'ttc-RSZ-%' OR (ac2.raw_data->>'source' = 'ttc-api' AND ac2.raw_data->>'stopStart' IS NOT NULL))
        AND (
          (it.affected_routes::text LIKE '%Line 1%' AND it2.affected_routes::text LIKE '%Line 1%')
          OR (it.affected_routes::text LIKE '%Line 2%' AND it2.affected_routes::text LIKE '%Line 2%')
          OR (it.affected_routes::text LIKE '%Line 3%' AND it2.affected_routes::text LIKE '%Line 3%')
          OR (it.affected_routes::text LIKE '%Line 4%' AND it2.affected_routes::text LIKE '%Line 4%')
        )
    )
);
*/
