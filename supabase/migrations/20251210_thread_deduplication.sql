-- Migration: Thread Deduplication System
-- Date: December 10, 2025
-- Purpose: Add thread_hash for atomic thread creation and prevent duplicate threads
-- 
-- ROOT CAUSE ANALYSIS:
-- The race condition occurs because:
-- 1. Multiple poll-alerts Edge Function workers run concurrently
-- 2. All workers query for existing threads BEFORE any creates one
-- 3. All workers see "no matching thread" and all create new threads
-- 4. Result: 40+ duplicate threads for the same incident
--
-- SOLUTION:
-- 1. Add a deterministic thread_hash column based on title + primary_route + date
-- 2. Add unique constraint on thread_hash (for active threads)
-- 3. Create a find_or_create_thread() function that handles conflicts atomically
-- 4. The unique constraint causes INSERT to fail for duplicates
-- 5. ON CONFLICT clause redirects to existing thread

-- ============================================================
-- STEP 1: Add thread_hash column for deduplication
-- ============================================================

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incident_threads' 
    AND column_name = 'thread_hash'
  ) THEN
    ALTER TABLE incident_threads ADD COLUMN thread_hash TEXT;
    RAISE NOTICE 'Added thread_hash column';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Create function to generate deterministic thread hash
-- ============================================================
-- Hash is based on: normalized_title + primary_route + date
-- This ensures same incident on same day gets same hash

CREATE OR REPLACE FUNCTION generate_thread_hash(
  p_title TEXT,
  p_routes JSONB,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS TEXT AS $$
DECLARE
  primary_route TEXT;
  date_key TEXT;
  normalized_title TEXT;
BEGIN
  -- Normalize title: lowercase, remove extra spaces, remove punctuation
  normalized_title := LOWER(TRIM(regexp_replace(p_title, '[^a-z0-9\s]', '', 'gi')));
  normalized_title := regexp_replace(normalized_title, '\s+', ' ', 'g');
  
  -- Extract primary route (first route in array)
  IF p_routes IS NOT NULL AND jsonb_typeof(p_routes) = 'array' AND jsonb_array_length(p_routes) > 0 THEN
    primary_route := extract_route_number(p_routes->>0);
  ELSE
    primary_route := 'no-route';
  END IF;
  
  -- Use hour-level granularity to group related incidents
  -- Incidents within same hour are more likely to be duplicates
  date_key := TO_CHAR(p_created_at AT TIME ZONE 'America/Toronto', 'YYYY-MM-DD-HH24');
  
  -- Create MD5 hash (sufficient for deduplication)
  RETURN MD5(primary_route || '|' || date_key || '|' || normalized_title);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_thread_hash(TEXT, JSONB, TIMESTAMPTZ) IS 
'Generates deterministic hash for thread deduplication based on title, route, and hour';

-- ============================================================
-- STEP 3: Populate thread_hash for existing records
-- ============================================================

UPDATE incident_threads
SET thread_hash = generate_thread_hash(title, affected_routes, created_at)
WHERE thread_hash IS NULL;

-- ============================================================
-- STEP 4: Create trigger to auto-set thread_hash on insert
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_thread_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Always generate hash based on current data
  NEW.thread_hash := generate_thread_hash(
    NEW.title, 
    NEW.affected_routes, 
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_thread_hash_on_insert ON incident_threads;
CREATE TRIGGER set_thread_hash_on_insert
  BEFORE INSERT ON incident_threads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_thread_hash();

-- ============================================================
-- STEP 5: Create unique index on thread_hash
-- ============================================================
-- This prevents duplicate threads at the database level
-- Using partial index: only enforce for active (unresolved) threads

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_incident_threads_hash_unique;

-- Create unique partial index
-- Only enforces uniqueness for unresolved threads
CREATE UNIQUE INDEX idx_incident_threads_hash_unique 
ON incident_threads (thread_hash)
WHERE is_resolved = false;

COMMENT ON INDEX idx_incident_threads_hash_unique IS 
'Prevents duplicate active threads for same incident. Allows resolved threads to have same hash.';

-- ============================================================
-- STEP 6: Create atomic find_or_create_thread function
-- ============================================================
-- This function handles race conditions properly by using ON CONFLICT

CREATE OR REPLACE FUNCTION find_or_create_thread(
  p_title TEXT,
  p_routes JSONB,
  p_categories JSONB DEFAULT '[]'::jsonb,
  p_is_resolved BOOLEAN DEFAULT false
) RETURNS TABLE(
  out_thread_id TEXT,
  out_is_new BOOLEAN,
  out_thread_hash TEXT
) AS $$
DECLARE
  v_hash TEXT;
  v_thread_id TEXT;
  v_is_new BOOLEAN := false;
BEGIN
  -- Calculate the hash for this potential thread
  v_hash := generate_thread_hash(p_title, p_routes, NOW());
  
  -- First, try to find existing unresolved thread with same hash
  SELECT t.thread_id INTO v_thread_id
  FROM incident_threads t
  WHERE t.thread_hash = v_hash
    AND t.is_resolved = false
  LIMIT 1;
  
  -- If found, return it
  IF v_thread_id IS NOT NULL THEN
    RETURN QUERY SELECT v_thread_id, false, v_hash;
    RETURN;
  END IF;
  
  -- If not found, try to insert new thread
  -- ON CONFLICT handles race condition if another worker inserted first
  BEGIN
    INSERT INTO incident_threads (
      thread_id,
      title,
      affected_routes,
      categories,
      is_resolved,
      thread_hash
    ) VALUES (
      'thread-' || gen_random_uuid()::text,
      p_title,
      p_routes,
      p_categories,
      p_is_resolved,
      v_hash
    )
    RETURNING incident_threads.thread_id INTO v_thread_id;
    
    v_is_new := true;
    
  EXCEPTION WHEN unique_violation THEN
    -- Race condition: another process created the thread
    -- Fetch the existing one
    SELECT t.thread_id INTO v_thread_id
    FROM incident_threads t
    WHERE t.thread_hash = v_hash
      AND t.is_resolved = false
    LIMIT 1;
    
    v_is_new := false;
  END;
  
  RETURN QUERY SELECT v_thread_id, v_is_new, v_hash;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_or_create_thread(TEXT, JSONB, JSONB, BOOLEAN) IS 
'Atomically finds or creates a thread, handling race conditions properly';

-- ============================================================
-- STEP 7: Create function to validate thread-alert route match
-- ============================================================

CREATE OR REPLACE FUNCTION validate_alert_thread_routes(
  p_alert_routes JSONB,
  p_thread_routes JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  -- Both must be non-empty arrays
  IF p_alert_routes IS NULL OR jsonb_typeof(p_alert_routes) != 'array' 
     OR jsonb_array_length(p_alert_routes) = 0 THEN
    RETURN FALSE;
  END IF;
  
  IF p_thread_routes IS NULL OR jsonb_typeof(p_thread_routes) != 'array' 
     OR jsonb_array_length(p_thread_routes) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for route family overlap
  RETURN routes_have_family_overlap(p_alert_routes, p_thread_routes);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_alert_thread_routes(JSONB, JSONB) IS 
'Validates that an alert has route overlap with a thread before assignment';

-- ============================================================
-- STEP 8: Add constraint to prevent invalid thread assignments
-- ============================================================
-- This is a CHECK constraint that runs the validation function
-- NOTE: This needs careful consideration - may want to disable initially

-- We can't add this as a regular CHECK because it references another table
-- Instead, we create a trigger that validates on UPDATE

CREATE OR REPLACE FUNCTION validate_alert_thread_assignment()
RETURNS TRIGGER AS $$
DECLARE
  thread_routes JSONB;
BEGIN
  -- Only validate if thread_id is being set
  IF NEW.thread_id IS NOT NULL THEN
    -- Get thread's routes
    SELECT affected_routes INTO thread_routes
    FROM incident_threads
    WHERE thread_id = NEW.thread_id;
    
    -- Skip validation for SERVICE_RESUMED alerts (they can have different routes in text)
    IF NEW.categories IS NOT NULL 
       AND jsonb_typeof(NEW.categories) = 'array'
       AND NEW.categories @> '["SERVICE_RESUMED"]'::jsonb THEN
      RETURN NEW;
    END IF;
    
    -- Validate route overlap
    IF NOT validate_alert_thread_routes(NEW.affected_routes, thread_routes) THEN
      RAISE WARNING 'Alert % has routes % but thread % has routes % - no overlap detected',
        NEW.alert_id, NEW.affected_routes, NEW.thread_id, thread_routes;
      -- Don't block the insert, just warn
      -- Uncomment below to enforce strictly:
      -- RAISE EXCEPTION 'Alert routes must overlap with thread routes';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_alert_thread ON alert_cache;
CREATE TRIGGER validate_alert_thread
  BEFORE INSERT OR UPDATE ON alert_cache
  FOR EACH ROW
  EXECUTE FUNCTION validate_alert_thread_assignment();

-- ============================================================
-- STEP 9: Grant permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION generate_thread_hash(TEXT, JSONB, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_or_create_thread(TEXT, JSONB, JSONB, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_alert_thread_routes(JSONB, JSONB) TO anon, authenticated, service_role;

-- ============================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================

-- Check for duplicate hashes (should return 0 rows after deduplication)
-- SELECT thread_hash, COUNT(*) as count
-- FROM incident_threads
-- WHERE is_resolved = false
-- GROUP BY thread_hash
-- HAVING COUNT(*) > 1;

-- Test find_or_create_thread function
-- SELECT * FROM find_or_create_thread(
--   'Test alert: Detour northbound',
--   '["501"]'::jsonb,
--   '["DIVERSION"]'::jsonb,
--   false
-- );
