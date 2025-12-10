-- Cleanup Script: Remove Duplicate Threads and Fix Misassigned Alerts
-- Date: December 10, 2025
-- Purpose: One-time cleanup to fix data from race condition bug
--
-- IMPORTANT: Run this AFTER the 20251210_thread_deduplication.sql migration!
--
-- This script:
-- 1. Identifies duplicate threads (same title/route/date)
-- 2. Keeps one "canonical" thread per group
-- 3. Reassigns alerts from duplicate threads to canonical thread
-- 4. Deletes empty duplicate threads
-- 5. Fixes Route 9/16 misassigned alerts

-- ============================================================
-- STEP 0: Ensure thread_hash column exists and is populated
-- ============================================================

DO $$ 
BEGIN
  -- Add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incident_threads' 
    AND column_name = 'thread_hash'
  ) THEN
    RAISE EXCEPTION 'thread_hash column does not exist! Run 20251210_thread_deduplication.sql first.';
  END IF;
  
  -- Populate if empty
  UPDATE incident_threads
  SET thread_hash = generate_thread_hash(title, affected_routes, created_at)
  WHERE thread_hash IS NULL;
END $$;

-- ============================================================
-- STEP 1: Create temporary table to track duplicate groups
-- ============================================================

DROP TABLE IF EXISTS temp_duplicate_threads;

CREATE TEMP TABLE temp_duplicate_threads AS
WITH duplicate_groups AS (
  SELECT 
    thread_hash,
    title,
    affected_routes,
    COUNT(*) as duplicate_count,
    MIN(thread_id) as canonical_thread_id,  -- Keep the first one created (lexicographically)
    array_agg(thread_id ORDER BY thread_id) as all_thread_ids
  FROM incident_threads
  WHERE thread_hash IS NOT NULL
  GROUP BY thread_hash, title, affected_routes
  HAVING COUNT(*) > 1
)
SELECT 
  dg.thread_hash,
  dg.title,
  dg.affected_routes,
  dg.duplicate_count,
  dg.canonical_thread_id,
  unnest(dg.all_thread_ids) as duplicate_thread_id
FROM duplicate_groups dg;

-- Show summary
DO $$
DECLARE
  group_count INTEGER;
  total_duplicates INTEGER;
BEGIN
  SELECT COUNT(DISTINCT thread_hash) INTO group_count FROM temp_duplicate_threads;
  SELECT COUNT(*) INTO total_duplicates FROM temp_duplicate_threads WHERE duplicate_thread_id != canonical_thread_id;
  
  RAISE NOTICE 'Found % duplicate groups with % total duplicate threads to clean up', group_count, total_duplicates;
END $$;

-- ============================================================
-- STEP 2: Reassign alerts from duplicate threads to canonical threads
-- ============================================================

-- Count alerts to be reassigned
DO $$
DECLARE
  alert_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO alert_count
  FROM alert_cache a
  JOIN temp_duplicate_threads t ON a.thread_id = t.duplicate_thread_id
  WHERE t.duplicate_thread_id != t.canonical_thread_id;
  
  RAISE NOTICE 'Will reassign % alerts from duplicate threads to canonical threads', alert_count;
END $$;

-- Reassign alerts
UPDATE alert_cache a
SET thread_id = t.canonical_thread_id
FROM temp_duplicate_threads t
WHERE a.thread_id = t.duplicate_thread_id
  AND t.duplicate_thread_id != t.canonical_thread_id;

-- ============================================================
-- STEP 3: Update canonical thread with merged routes from all duplicates
-- ============================================================

-- For each canonical thread, merge all routes from its duplicates
WITH merged_routes AS (
  SELECT 
    t.canonical_thread_id,
    jsonb_agg(DISTINCT route_value) as all_routes
  FROM temp_duplicate_threads t
  JOIN incident_threads it ON t.duplicate_thread_id = it.thread_id
  CROSS JOIN LATERAL jsonb_array_elements_text(it.affected_routes) as route_value
  GROUP BY t.canonical_thread_id
)
UPDATE incident_threads
SET affected_routes = merged_routes.all_routes
FROM merged_routes
WHERE incident_threads.thread_id = merged_routes.canonical_thread_id;

-- ============================================================
-- STEP 4: Delete duplicate threads (keep only canonical)
-- ============================================================

-- Count threads to be deleted
DO $$
DECLARE
  delete_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT duplicate_thread_id) INTO delete_count
  FROM temp_duplicate_threads
  WHERE duplicate_thread_id != canonical_thread_id;
  
  RAISE NOTICE 'Will delete % duplicate threads', delete_count;
END $$;

-- Delete duplicates
DELETE FROM incident_threads
WHERE thread_id IN (
  SELECT DISTINCT duplicate_thread_id 
  FROM temp_duplicate_threads 
  WHERE duplicate_thread_id != canonical_thread_id
);

-- ============================================================
-- STEP 5: Fix Route 9/16 misassigned alerts specifically
-- ============================================================

-- Check for alerts where routes don't match their thread
DO $$
DECLARE
  mismatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatched_count
  FROM alert_cache a
  JOIN incident_threads t ON a.thread_id = t.thread_id
  WHERE NOT routes_have_family_overlap(a.affected_routes, t.affected_routes)
    AND a.affected_routes IS NOT NULL 
    AND jsonb_array_length(a.affected_routes) > 0
    AND t.affected_routes IS NOT NULL
    AND jsonb_array_length(t.affected_routes) > 0;
  
  RAISE NOTICE 'Found % alerts with mismatched routes to their threads', mismatched_count;
END $$;

-- Show mismatched alerts (for verification)
SELECT 
  a.alert_id,
  a.affected_routes as alert_routes,
  LEFT(a.header_text, 60) as alert_header,
  t.thread_id,
  t.affected_routes as thread_routes,
  LEFT(t.title, 60) as thread_title
FROM alert_cache a
JOIN incident_threads t ON a.thread_id = t.thread_id
WHERE NOT routes_have_family_overlap(a.affected_routes, t.affected_routes)
  AND a.affected_routes IS NOT NULL 
  AND jsonb_array_length(a.affected_routes) > 0
  AND t.affected_routes IS NOT NULL
  AND jsonb_array_length(t.affected_routes) > 0
ORDER BY a.created_at DESC
LIMIT 20;

-- For each mismatched alert, find or create the correct thread
-- and reassign the alert to it
WITH mismatched_alerts AS (
  SELECT 
    a.alert_id,
    a.affected_routes as alert_routes,
    a.header_text,
    a.categories
  FROM alert_cache a
  JOIN incident_threads t ON a.thread_id = t.thread_id
  WHERE NOT routes_have_family_overlap(a.affected_routes, t.affected_routes)
    AND a.affected_routes IS NOT NULL 
    AND jsonb_array_length(a.affected_routes) > 0
    AND t.affected_routes IS NOT NULL
    AND jsonb_array_length(t.affected_routes) > 0
),
correct_threads AS (
  SELECT 
    ma.alert_id,
    (SELECT out_thread_id FROM find_or_create_thread(
      ma.header_text,
      ma.alert_routes,
      ma.categories,
      false
    )) as correct_thread_id
  FROM mismatched_alerts ma
)
UPDATE alert_cache a
SET thread_id = ct.correct_thread_id
FROM correct_threads ct
WHERE a.alert_id = ct.alert_id
  AND ct.correct_thread_id IS NOT NULL;

-- ============================================================
-- STEP 6: Clean up orphaned threads (threads with no alerts)
-- ============================================================

-- Count orphaned threads
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM incident_threads t
  WHERE NOT EXISTS (
    SELECT 1 FROM alert_cache a WHERE a.thread_id = t.thread_id
  )
  AND t.created_at > NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Found % orphaned threads (no alerts) from last 7 days', orphan_count;
END $$;

-- Delete orphaned threads from last 7 days
DELETE FROM incident_threads
WHERE thread_id IN (
  SELECT t.thread_id
  FROM incident_threads t
  WHERE NOT EXISTS (
    SELECT 1 FROM alert_cache a WHERE a.thread_id = t.thread_id
  )
  AND t.created_at > NOW() - INTERVAL '7 days'
);

-- ============================================================
-- STEP 7: Verification queries
-- ============================================================

-- Final summary
DO $$
DECLARE
  total_threads INTEGER;
  active_threads INTEGER;
  total_alerts INTEGER;
  alerts_with_threads INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_threads FROM incident_threads;
  SELECT COUNT(*) INTO active_threads FROM incident_threads WHERE is_resolved = false;
  SELECT COUNT(*) INTO total_alerts FROM alert_cache;
  SELECT COUNT(*) INTO alerts_with_threads FROM alert_cache WHERE thread_id IS NOT NULL;
  
  RAISE NOTICE '=== CLEANUP COMPLETE ===';
  RAISE NOTICE 'Total threads: %', total_threads;
  RAISE NOTICE 'Active threads: %', active_threads;
  RAISE NOTICE 'Total alerts: %', total_alerts;
  RAISE NOTICE 'Alerts with threads: %', alerts_with_threads;
END $$;

-- Check for any remaining route mismatches
SELECT 
  'REMAINING MISMATCHES' as status,
  COUNT(*) as count
FROM alert_cache a
JOIN incident_threads t ON a.thread_id = t.thread_id
WHERE NOT routes_have_family_overlap(a.affected_routes, t.affected_routes)
  AND a.affected_routes IS NOT NULL 
  AND jsonb_array_length(a.affected_routes) > 0
  AND t.affected_routes IS NOT NULL
  AND jsonb_array_length(t.affected_routes) > 0;

-- Check for duplicate hashes (should be 0)
SELECT 
  'DUPLICATE HASHES (should be 0)' as status,
  COUNT(*) as count
FROM (
  SELECT thread_hash
  FROM incident_threads
  WHERE is_resolved = false AND thread_hash IS NOT NULL
  GROUP BY thread_hash
  HAVING COUNT(*) > 1
) dups;

-- ============================================================
-- CLEANUP: Drop temp table
-- ============================================================
DROP TABLE IF EXISTS temp_duplicate_threads;
