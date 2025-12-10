-- Migration: Threading Constraints and Helper Functions
-- Date: December 10, 2025
-- Purpose: Add database-level constraints and functions to enforce threading rules

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Extract base route number from route string (37A -> 37, 507 Long Branch -> 507)
CREATE OR REPLACE FUNCTION extract_route_number(route TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN (regexp_matches(route, '^(\d+)'))[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_route_number(TEXT) IS 
'Extracts base route number from route string (37A -> 37, 507 Long Branch -> 507)';

-- Check if two route arrays have overlapping route families
CREATE OR REPLACE FUNCTION routes_have_family_overlap(routes1 JSONB, routes2 JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    r1 TEXT;
    r2 TEXT;
    base1 TEXT;
    base2 TEXT;
BEGIN
    -- Handle null/empty cases
    IF routes1 IS NULL OR routes2 IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF jsonb_typeof(routes1) != 'array' OR jsonb_typeof(routes2) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    IF jsonb_array_length(routes1) = 0 OR jsonb_array_length(routes2) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check for overlap using base route numbers
    FOR r1 IN SELECT jsonb_array_elements_text(routes1) LOOP
        base1 := extract_route_number(r1);
        IF base1 IS NOT NULL THEN
            FOR r2 IN SELECT jsonb_array_elements_text(routes2) LOOP
                base2 := extract_route_number(r2);
                IF base2 IS NOT NULL AND base1 = base2 THEN
                    RETURN TRUE;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION routes_have_family_overlap(JSONB, JSONB) IS 
'Checks if two route arrays have overlapping route families (37 matches 37A, 37B)';

-- Merge routes from two arrays (accumulate all routes from alerts)
CREATE OR REPLACE FUNCTION merge_routes(existing_routes JSONB, new_routes JSONB)
RETURNS JSONB AS $$
DECLARE
    merged JSONB;
BEGIN
    -- Handle null cases
    IF existing_routes IS NULL OR jsonb_typeof(existing_routes) != 'array' THEN
        RETURN COALESCE(new_routes, '[]'::jsonb);
    END IF;
    
    IF new_routes IS NULL OR jsonb_typeof(new_routes) != 'array' THEN
        RETURN existing_routes;
    END IF;
    
    -- Merge and deduplicate
    SELECT jsonb_agg(DISTINCT value)
    INTO merged
    FROM (
        SELECT value FROM jsonb_array_elements_text(existing_routes)
        UNION
        SELECT value FROM jsonb_array_elements_text(new_routes)
    ) combined(value);
    
    RETURN COALESCE(merged, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION merge_routes(JSONB, JSONB) IS 
'Merges two route arrays, deduplicating entries';

-- =====================================================
-- TRIGGER FUNCTIONS (SAFETY NETS)
-- =====================================================

-- Fix double-encoded JSONB strings on INSERT/UPDATE
CREATE OR REPLACE FUNCTION fix_jsonb_string_encoding()
RETURNS TRIGGER AS $$
BEGIN
  -- Fix affected_routes if it's a string containing JSON
  IF jsonb_typeof(NEW.affected_routes) = 'string' THEN
    BEGIN
      NEW.affected_routes := (NEW.affected_routes #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, keep original value
      NULL;
    END;
  END IF;
  
  -- Fix categories if it's a string containing JSON
  IF jsonb_typeof(NEW.categories) = 'string' THEN
    BEGIN
      NEW.categories := (NEW.categories #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-populate routes from title if missing
CREATE OR REPLACE FUNCTION auto_populate_routes()
RETURNS TRIGGER AS $$
DECLARE
    extracted_routes JSONB := '[]'::jsonb;
    route_match TEXT;
    title_text TEXT;
    current_routes JSONB;
BEGIN
    -- Determine source text based on table
    IF TG_TABLE_NAME = 'incident_threads' THEN
        title_text := NEW.title;
        current_routes := NEW.affected_routes;
    ELSIF TG_TABLE_NAME = 'alert_cache' THEN
        title_text := COALESCE(NEW.header_text, '');
        current_routes := NEW.affected_routes;
    ELSE
        RETURN NEW;
    END IF;

    -- IMPORTANT: Check if routes are already populated (and actually an array)
    -- Skip if we have valid routes already
    IF current_routes IS NOT NULL 
       AND jsonb_typeof(current_routes) = 'array' 
       AND jsonb_array_length(current_routes) > 0 THEN
        RETURN NEW;
    END IF;

    -- Extract Line X patterns (Line 1, Line 2, Line 4, Line 6)
    FOR route_match IN 
        SELECT (regexp_matches(title_text, 'Line\s*\d+', 'gi'))[1]
    LOOP
        extracted_routes := extracted_routes || to_jsonb(route_match);
    END LOOP;

    -- Extract comma-separated route lists at start: "37, 37A" or "123, 123C, 123D"
    IF title_text ~ '^\d{1,3}[A-Z]?(?:\s*,\s*\d{1,3}[A-Z]?)+' THEN
        FOR route_match IN 
            SELECT trim(unnest(regexp_split_to_array(
                (regexp_matches(title_text, '^(\d{1,3}[A-Z]?(?:\s*,\s*\d{1,3}[A-Z]?)+)'))[1],
                '\s*,\s*'
            )))
        LOOP
            IF route_match IS NOT NULL AND route_match != '' THEN
                extracted_routes := extracted_routes || to_jsonb(route_match);
            END IF;
        END LOOP;
    ELSE
        -- Extract route with name at start: "501 Queen", "507 Long Branch"
        route_match := (regexp_matches(title_text, '^(\d{1,3})\s+[A-Z][a-z]+'))[1];
        IF route_match IS NOT NULL THEN
            extracted_routes := extracted_routes || to_jsonb(route_match);
        END IF;
    END IF;

    -- Remove duplicates
    SELECT jsonb_agg(DISTINCT value) INTO extracted_routes FROM jsonb_array_elements_text(extracted_routes);
    
    -- Update routes if we extracted any
    IF extracted_routes IS NOT NULL AND jsonb_array_length(COALESCE(extracted_routes, '[]'::jsonb)) > 0 THEN
        NEW.affected_routes := extracted_routes;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Alert cache triggers
DROP TRIGGER IF EXISTS fix_alert_cache_jsonb ON alert_cache;
CREATE TRIGGER fix_alert_cache_jsonb
    BEFORE INSERT OR UPDATE ON alert_cache
    FOR EACH ROW
    EXECUTE FUNCTION fix_jsonb_string_encoding();

DROP TRIGGER IF EXISTS auto_populate_routes_alert ON alert_cache;
CREATE TRIGGER auto_populate_routes_alert
    BEFORE INSERT OR UPDATE ON alert_cache
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_routes();

-- Incident threads triggers
DROP TRIGGER IF EXISTS fix_incident_threads_jsonb ON incident_threads;
CREATE TRIGGER fix_incident_threads_jsonb
    BEFORE INSERT OR UPDATE ON incident_threads
    FOR EACH ROW
    EXECUTE FUNCTION fix_jsonb_string_encoding();

DROP TRIGGER IF EXISTS auto_populate_routes_thread ON incident_threads;
CREATE TRIGGER auto_populate_routes_thread
    BEFORE INSERT OR UPDATE ON incident_threads
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_routes();

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Ensure affected_routes is always an array (not a string or other type)
ALTER TABLE alert_cache 
DROP CONSTRAINT IF EXISTS alert_cache_routes_is_array;
ALTER TABLE alert_cache 
ADD CONSTRAINT alert_cache_routes_is_array 
CHECK (affected_routes IS NULL OR jsonb_typeof(affected_routes) = 'array');

ALTER TABLE alert_cache 
DROP CONSTRAINT IF EXISTS alert_cache_categories_is_array;
ALTER TABLE alert_cache 
ADD CONSTRAINT alert_cache_categories_is_array 
CHECK (categories IS NULL OR jsonb_typeof(categories) = 'array');

ALTER TABLE incident_threads 
DROP CONSTRAINT IF EXISTS incident_threads_routes_is_array;
ALTER TABLE incident_threads 
ADD CONSTRAINT incident_threads_routes_is_array 
CHECK (affected_routes IS NULL OR jsonb_typeof(affected_routes) = 'array');

ALTER TABLE incident_threads 
DROP CONSTRAINT IF EXISTS incident_threads_categories_is_array;
ALTER TABLE incident_threads 
ADD CONSTRAINT incident_threads_categories_is_array 
CHECK (categories IS NULL OR jsonb_typeof(categories) = 'array');

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for faster thread lookups by created_at (used for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_incident_threads_created_at 
ON incident_threads(created_at DESC);

-- Partial index for recent unresolved threads (most common query)
CREATE INDEX IF NOT EXISTS idx_incident_threads_active 
ON incident_threads(updated_at DESC) 
WHERE is_resolved = FALSE;
