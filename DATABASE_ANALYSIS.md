# Supabase Database Analysis & Optimization Report

**Date:** December 30, 2025  
**PostgreSQL Version:** 17.6  
**Plan:** Supabase Free Tier (500 MB limit)  
**Analysis Tool:** Supabase CLI v2.67.1  
**Last Updated:** January 17, 2026 - **Removed service_resumed_monitoring table (analysis complete)**

---

## 🎉 OPTIMIZATION RESULTS

### Before vs After (December 30, 2025)

| Metric                  | Before | After     | Change        |
| ----------------------- | ------ | --------- | ------------- |
| **Total Database Size** | 135 MB | **39 MB** | **-71%** ✅   |
| **incident_threads**    | 97 MB  | 696 kB    | **-99.3%** ✅ |
| **Tables Count**        | 13     | 6         | -7 tables     |
| **Unused Indexes**      | 23     | 0         | -23 indexes   |
| **Free Tier Usage**     | 27%    | **7.8%**  | -19.2%        |

### Actions Completed (December 30)

| Action                                | Result           |
| ------------------------------------- | ---------------- |
| ✅ `VACUUM FULL incident_threads`     | 97 MB → 696 kB   |
| ✅ Dropped 7 auth tables              | ~680 kB saved    |
| ✅ Dropped 10+ unused indexes         | ~400 kB saved    |
| ✅ Deleted dead code `preferences.ts` | Codebase cleanup |
| ✅ `VACUUM ANALYZE` all tables        | Stats refreshed  |

### Database Trigger Functions Fix (January 3, 2026)

Fixed database functions with empty `search_path` that caused alerts not to link to threads.

| Action                                    | Result                       |
| ----------------------------------------- | ---------------------------- |
| ✅ Fixed `validate_alert_thread_routes()` | Now uses `public.tablename`  |
| ✅ Fixed `find_or_create_thread()`        | Now uses `public.tablename`  |
| ✅ Fixed `auto_populate_thread_hash()`    | Now uses `public.function()` |
| ✅ Fixed `generate_thread_hash()`         | Now uses `public.function()` |
| ✅ Linked orphaned alerts                 | 19 alerts linked to threads  |
| ✅ Cleaned up duplicate threads           | 120 orphaned threads deleted |

See [alert-categorization-and-threading.md](alert-categorization-and-threading.md) Troubleshooting section for details.

### Current Table Sizes (January 17, 2026)

| Table                  | Total Size  | Rows | Notes              |
| ---------------------- | ----------- | ---- | ------------------ |
| `alert_cache`          | 3.5 MB      | 196  | Main alerts        |
| `incident_threads`     | 816 kB      | 63   | Threading          |
| `planned_maintenance`  | 96 kB       | 13   | Scheduled closures |
| `gtfs_routes`          | 80 kB       | 20   | Route data         |
| `notification_history` | 72 kB       | 0    | Push notifications |
| `gtfs_stations`        | 16 kB       | 0    | Station data       |
| **Total App Tables**   | **~4.5 MB** |      |                    |

### Current Index Usage (All Active)

All remaining indexes have significant scan counts:

- `idx_alert_thread`: 5B+ scans (heavily used)
- `idx_alert_cache_thread_created`: 504M scans
- `idx_incident_threads_id`: 17M scans
- Primary keys: All actively used

---

## 📊 Historical Analysis (Pre-Optimization)

> **Note:** This section documents the state before optimization on December 30, 2025.

### Overall Database Stats (Before)

| Metric                     | Value   |
| -------------------------- | ------- |
| **Database Size**          | 135 MB  |
| **Total Index Size**       | 47 MB   |
| **Total Table Size**       | 54 MB   |
| **WAL Size**               | 176 MB  |
| **Index Hit Rate**         | 100% ✅ |
| **Table Hit Rate**         | 100% ✅ |
| **Time Since Stats Reset** | 37 days |

---

## 🚨 [RESOLVED] Table Bloat Analysis

**Status:** ✅ FIXED via `VACUUM FULL` - 97 MB → 696 kB

~~The `incident_threads` table has 188.6x bloat~~ - this was the #1 optimization target!

### Bloat Statistics Before Fix

| Table                         | Type  | Bloat Factor | Wasted    | Total Size |
| ----------------------------- | ----- | ------------ | --------- | ---------- |
| `incident_threads`            | table | **188.6x**   | **51 MB** | 52 MB      |
| `incident_threads_pkey`       | index | **61.8x**    | **32 MB** | 32 MB      |
| `idx_incident_threads_status` | index | **39.4x**    | 800 kB    | 824 kB     |
| `idx_threads_created_at`      | index | 26.0x        | 600 kB    | 624 kB     |
| `idx_threads_route_ids`       | index | 14.9x        | 1.9 MB    | 2 MB       |

**Key Finding:** ~~The `incident_threads` table has grown to 97 MB total (52 MB data + 45 MB indexes), but only needs ~1-2 MB.~~ **FIXED:** Now 696 kB total.

### Why This Happened (Prevention for Future)

1. **Frequent Updates**: Thread status changes (active→resolved) create dead row versions
2. **JSONB Updates**: Alert array modifications trigger full row copies
3. **No VACUUM FULL**: Regular auto-vacuum doesn't reclaim disk space, only marks it reusable
4. **959 rows using 97 MB** = ~100 kB per row (should be ~1-2 kB)

### Fix: VACUUM FULL ✅ COMPLETED

```sql
-- This was run on December 30, 2025
VACUUM FULL incident_threads;
REINDEX TABLE incident_threads;
```

**Result:** 97 MB → 696 kB (**99.3% space savings**) ✅

---

## 🗑️ [RESOLVED] Dead Code & Unused Auth Tables

**Status:** ✅ All auth tables dropped, dead code deleted

### Context: OAuth Removed from App

The app now uses **local IndexedDB storage only** for user preferences. The old Supabase Auth system (OAuth, WebAuthn) is **completely unused**.

### Active Stores (IndexedDB - Local Only)

| Store File                           | Purpose                                | Status    |
| ------------------------------------ | -------------------------------------- | --------- |
| `src/lib/stores/localPreferences.ts` | Theme, text size, animations, language | ✅ Active |
| `src/lib/stores/savedStops.ts`       | My Stops (max 20)                      | ✅ Active |
| `src/lib/stores/savedRoutes.ts`      | My Routes                              | ✅ Active |
| `src/lib/services/storage.ts`        | IndexedDB wrapper                      | ✅ Active |

### Dead Code ✅ DELETED

| File                                | Purpose                       | Status         |
| ----------------------------------- | ----------------------------- | -------------- |
| ~~`src/lib/stores/preferences.ts`~~ | Old Supabase auth preferences | ✅ **DELETED** |

This file contained `supabase.auth.getUser()` and queries to `user_preferences`/`device_preferences` tables, but nothing in the codebase imported it.

### Database Tables ✅ DROPPED

All auth-related tables have been dropped:

| Table                       | Rows   | Size        | Purpose                   | Status     |
| --------------------------- | ------ | ----------- | ------------------------- | ---------- |
| ~~`user_profiles`~~         | 8      | ~64 kB      | Legacy user accounts      | ✅ Dropped |
| ~~`user_preferences`~~      | 2      | ~16 kB      | Legacy cloud preferences  | ✅ Dropped |
| ~~`device_preferences`~~    | 6      | ~48 kB      | Legacy device prefs       | ✅ Dropped |
| ~~`webauthn_credentials`~~  | 7      | ~56 kB      | Legacy passkeys           | ✅ Dropped |
| ~~`webauthn_challenges`~~   | 0      | ~8 kB       | Legacy WebAuthn temp      | ✅ Dropped |
| ~~`recovery_codes`~~        | 60     | ~480 kB     | Legacy recovery codes     | ✅ Dropped |
| ~~`preference_migrations`~~ | 1      | ~8 kB       | Legacy migration tracking | ✅ Dropped |
| **Total Saved**             | **84** | **~680 kB** |                           | ✅         |

### SQL Executed (December 30, 2025)

```sql
-- WARNING: This permanently deletes user account data!
-- Only run if you confirm OAuth/WebAuthn is permanently removed

-- Drop in dependency order (children first)
DROP TABLE IF EXISTS recovery_codes CASCADE;
DROP TABLE IF EXISTS webauthn_credentials CASCADE;
DROP TABLE IF EXISTS webauthn_challenges CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS device_preferences CASCADE;
DROP TABLE IF EXISTS preference_migrations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Clean up related functions if any exist
DROP FUNCTION IF EXISTS migrate_device_to_user_preferences CASCADE;
```

---

## 📊 Executive Summary

| Metric                   | Value                    | Status                 |
| ------------------------ | ------------------------ | ---------------------- |
| **Total Database Size**  | 135 MB                   | ✅ 27% of 500 MB limit |
| **Largest Table**        | incident_threads (97 MB) | 🔴 **188.6x bloat**    |
| **Total Rows**           | ~5,000 across all tables | ✅ Healthy             |
| **Unused Indexes**       | 23 identified            | ⚠️ ~400 kB wasted      |
| **Dead Auth Tables**     | 7 tables (84 rows)       | 🔴 ~680 kB wasted      |
| **Dead Code**            | `preferences.ts`         | 🔴 Not imported        |
| **Duplicate Key Errors** | Every minute             | 🔴 Edge Function issue |

---

## 🔴 CRITICAL: Duplicate Key Constraint Errors

**Found in PostgreSQL logs:** Frequent `duplicate key value violates unique constraint "alert_cache_pkey"` errors occurring every minute during polling.

### Impact

- Wasted Edge Function invocations
- Increased WAL log writes
- Contributes to dead rows and table bloat
- PostgreSQL error logs filling up

### Root Cause Analysis

The `poll-alerts` Edge Function (`supabase/functions/poll-alerts/index.ts`) has a timing issue:

1. **Line 438** fetches existing alerts from the last 24 hours to build `existingAlertIds` set
2. **Lines 471 and 755** use `supabase.from('alert_cache').insert()` which fails on duplicates
3. **Problem**: TTC API alerts use deterministic IDs (e.g., `ttc-RSZ-40-Stop1-Stop2`) that persist longer than 24 hours
4. When the function runs again, if an alert is >24h old but still exists in the DB, it's not in `existingAlertIds` and insert fails

### Recommended Fixes

**Option A: Use Upsert (Recommended)**

Update both BlueSky and TTC API insert operations:

```typescript
// Line 471 - BlueSky alerts
const { data: newAlert, error: insertError } = await supabase
  .from("alert_cache")
  .upsert(alert, { onConflict: "alert_id" })
  .select()
  .single();

// Line 755 - TTC API alerts
const { error: insertError } = await supabase
  .from("alert_cache")
  .upsert(alert, { onConflict: "alert_id" })
  .select()
  .single();
```

**Option B: Extend Existing Alert Fetch Window**

Change line 438 to fetch more alerts:

```typescript
// Before: 24 hours
const { data: existingAlerts } = await supabase
  .from("alert_cache")
  .select("alert_id, thread_id")
  .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

// After: 7 days (covers all TTC API alert scenarios)
const { data: existingAlerts } = await supabase
  .from("alert_cache")
  .select("alert_id, thread_id")
  .gte(
    "created_at",
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  );
```

**Option C: Add Ignore Conflict (Quick Fix)**

Add error handling to silently ignore duplicate key errors:

```typescript
const { data: newAlert, error: insertError } = await supabase
  .from("alert_cache")
  .insert(alert)
  .select()
  .single();

// Currently continues on any error, but logs as error
// Consider: Check if error is duplicate key and handle differently
if (insertError?.code === "23505") {
  // Duplicate key - alert already exists, skip
  continue;
}
```

### File Locations

| Location                                  | Line | Issue                             |
| ----------------------------------------- | ---- | --------------------------------- |
| `supabase/functions/poll-alerts/index.ts` | 438  | `existingAlerts` only fetches 24h |
| `supabase/functions/poll-alerts/index.ts` | 471  | BlueSky insert without upsert     |
| `supabase/functions/poll-alerts/index.ts` | 755  | TTC API insert without upsert     |

---

## 📁 Table Size Analysis

| Table                  | Size                               | Rows  | Dead Rows | Notes                          |
| ---------------------- | ---------------------------------- | ----- | --------- | ------------------------------ |
| `incident_threads`     | 97 MB (52 MB data + 45 MB indexes) | 959   | 39        | ⚠️ Primary concern - 72% of DB |
| `alert_cache`          | 3.8 MB                             | 2,174 | 261       | 1,083 non-latest records       |
| `notification_history` | ~2 MB                              | 70    | -         | Notification tracking          |
| `device_preferences`   | <1 MB                              | 6     | -         | User settings                  |
| `webauthn_credentials` | <1 MB                              | 7     | -         | Passkey storage                |
| `user_profiles`        | <1 MB                              | 8     | -         | User accounts                  |
| `planned_maintenance`  | <1 MB                              | 13    | -         | Scheduled closures             |
| Other tables           | <1 MB each                         | -     | -         | Minimal impact                 |

### 🚨 Key Finding: `incident_threads` Table

The `incident_threads` table consumes **72% of the database** despite having only 959 rows. This indicates:

1. **JSONB Bloat**: The `affected_routes` and `categories` JSONB columns
2. **Index Overhead**: 45 MB of indexes on 52 MB of data (87% overhead!)
3. **Historical Data**: 924 resolved threads retained vs 35 active

---

## 🔍 Index Analysis

### Complete List of Unused Indexes (23 total - 0 scans)

From `supabase inspect db index-stats`:

```sql
-- All indexes with 0 scans - SAFE TO DROP
-- Auth-related (will be dropped with tables anyway)
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_updated_at;
DROP INDEX IF EXISTS idx_user_preferences_updated_at;
DROP INDEX IF EXISTS idx_user_preferences_device_id;
DROP INDEX IF EXISTS idx_device_preferences_created_at;
DROP INDEX IF EXISTS idx_device_preferences_device_id;
DROP INDEX IF EXISTS idx_webauthn_credentials_device_id;
DROP INDEX IF EXISTS idx_webauthn_credentials_active;
DROP INDEX IF EXISTS idx_webauthn_challenges_user_id;
DROP INDEX IF EXISTS idx_recovery_codes_unused;
DROP INDEX IF EXISTS idx_preference_migrations_device_id;
DROP INDEX IF EXISTS idx_preference_migrations_migrated_at;
DROP INDEX IF EXISTS idx_preference_migrations_status;

-- Core tables (keep tables, drop indexes)
DROP INDEX IF EXISTS idx_alert_cache_bluesky_uri;
DROP INDEX IF EXISTS idx_notification_history_device_id;
DROP INDEX IF EXISTS idx_notification_history_sent_at;
DROP INDEX IF EXISTS idx_notification_history_thread_id;
DROP INDEX IF EXISTS idx_notification_history_success;

-- Reference data tables
DROP INDEX IF EXISTS idx_route_type;
DROP INDEX IF EXISTS idx_station_name;
DROP INDEX IF EXISTS idx_station_source;
DROP INDEX IF EXISTS idx_maintenance_active;
DROP INDEX IF EXISTS idx_maintenance_line;

-- Run VACUUM after dropping
VACUUM ANALYZE;
```

### Rarely Used Indexes (< 10 scans)

| Index                            | Scans | Recommendation    |
| -------------------------------- | ----- | ----------------- |
| `idx_incident_threads_is_hidden` | 5     | Consider dropping |
| `idx_alert_cache_route_id`       | 8     | Monitor usage     |

### High-Value Indexes (Keep)

| Index                             | Scans  | Purpose           |
| --------------------------------- | ------ | ----------------- |
| `idx_alert_cache_is_latest`       | 1,200+ | Core query filter |
| `idx_incident_threads_status`     | 500+   | Thread filtering  |
| `idx_incident_threads_created_at` | 300+   | Date queries      |

---

## � Supabase Advisor Findings

### Performance Advisors (via `mcp_supabase_get_advisors`)

| Issue           | Table                                   | Status                      |
| --------------- | --------------------------------------- | --------------------------- |
| **Table Bloat** | `incident_threads`                      | 🔴 Excessive bloat detected |
| Unused Index    | `idx_user_profiles_email`               | ⚠️ Never used               |
| Unused Index    | `idx_user_profiles_updated_at`          | ⚠️ Never used               |
| Unused Index    | `idx_user_preferences_updated_at`       | ⚠️ Never used               |
| Unused Index    | `idx_user_preferences_device_id`        | ⚠️ Never used               |
| Unused Index    | `idx_notification_history_device_id`    | ⚠️ Never used               |
| Unused Index    | `idx_notification_history_success`      | ⚠️ Never used               |
| Unused Index    | `idx_route_type`                        | ⚠️ Never used               |
| Unused Index    | `idx_station_name`                      | ⚠️ Never used               |
| Unused Index    | `idx_station_source`                    | ⚠️ Never used               |
| Unused Index    | `idx_maintenance_active`                | ⚠️ Never used               |
| Unused Index    | `idx_maintenance_line`                  | ⚠️ Never used               |
| Unused Index    | `idx_preference_migrations_device_id`   | ⚠️ Never used               |
| Unused Index    | `idx_preference_migrations_migrated_at` | ⚠️ Never used               |
| Unused Index    | `idx_preference_migrations_status`      | ⚠️ Never used               |
| Unused Index    | `idx_webauthn_credentials_active`       | ⚠️ Never used               |
| Unused Index    | `idx_recovery_codes_unused`             | ⚠️ Never used               |
| Unused Index    | `idx_device_preferences_created_at`     | ⚠️ Never used               |
| Unused Index    | `idx_webauthn_challenges_user_id`       | ⚠️ Never used               |

### Security Advisors

| Issue                      | Entity                       | Level              |
| -------------------------- | ---------------------------- | ------------------ |
| Mutable search_path        | `find_or_create_thread`      | ⚠️ WARN            |
| Mutable search_path        | `cleanup_old_alerts`         | ⚠️ WARN            |
| Mutable search_path        | `cleanup_old_alerts_toronto` | ⚠️ WARN            |
| Mutable search_path        | `invoke_poll_alerts`         | ⚠️ WARN            |
| Mutable search_path        | + 10 other functions         | ⚠️ WARN            |
| Leaked Password Protection | Auth                         | ⚠️ WARN - Disabled |

**Fix for search_path:**

```sql
-- Add search_path to functions to prevent schema hijacking
ALTER FUNCTION public.find_or_create_thread() SET search_path = public;
ALTER FUNCTION public.cleanup_old_alerts() SET search_path = public;
-- (repeat for all affected functions)
```

**Fix for leaked password protection:**
Enable in Supabase Dashboard → Authentication → Settings → Password Strength

---

## ✅ Fixed Database Functions (2025-01-18)

Previously broken functions have been fixed:

| Function                               | Issue                                                                                                                           | Fix                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `get_thread_with_alerts(text)`         | `SET search_path TO ''` broke table references                                                                                  | Changed to `SET search_path = public`                    |
| `get_threads_with_alerts_bulk(text[])` | Same search_path issue                                                                                                          | Changed to `SET search_path = public`                    |
| `cleanup_old_data()`                   | Referenced dropped `webauthn_challenges` table, wrong type `uuid[]` instead of `text[]`, wrong column `created_at` vs `sent_at` | Removed webauthn reference, fixed types and column names |

**All functions now work correctly** - verified with test calls.

---

## �📅 Data Age Distribution

### `incident_threads`

| Category           | Count | Notes             |
| ------------------ | ----- | ----------------- |
| Active threads     | 35    | Currently visible |
| Resolved threads   | 924   | Historical        |
| Older than 30 days | 1     | ✅ Good retention |

### `alert_cache`

| Category            | Count | Notes               |
| ------------------- | ----- | ------------------- |
| `is_latest = true`  | 1,091 | Current alerts      |
| `is_latest = false` | 1,083 | Historical versions |
| Older than 30 days  | 1     | ✅ Good retention   |

---

## 🧹 Cleanup Recommendations

### 1. Drop Unused Indexes (Immediate - Save ~10-15 MB)

```sql
-- Run these one at a time to reclaim space
DROP INDEX IF EXISTS idx_alert_cache_bluesky_uri;
DROP INDEX IF EXISTS idx_notification_history_device_id;
DROP INDEX IF EXISTS idx_notification_history_sent_at;
DROP INDEX IF EXISTS idx_notification_history_thread_id;

-- Then run VACUUM to reclaim space
VACUUM ANALYZE;
```

### 2. Archive Old Resolved Threads (Save ~30-50 MB)

Keep only recent resolved threads (e.g., last 7-14 days):

```sql
-- Preview: Count threads to be archived
SELECT COUNT(*)
FROM incident_threads
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '14 days';

-- Option A: Delete old resolved threads
DELETE FROM incident_threads
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '14 days';

-- Option B: Move to archive table first (safer)
CREATE TABLE IF NOT EXISTS incident_threads_archive (LIKE incident_threads INCLUDING ALL);

INSERT INTO incident_threads_archive
SELECT * FROM incident_threads
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '14 days';

DELETE FROM incident_threads
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '14 days';
```

### 3. Clean Up Non-Latest Alert Cache (Save ~1-2 MB)

```sql
-- Delete old non-latest alerts (keep last 3 days for history)
DELETE FROM alert_cache
WHERE is_latest = false
AND fetched_at < NOW() - INTERVAL '3 days';
```

### 4. Regular VACUUM (Free Tier Auto-Vacuums, but manual helps)

```sql
-- Full vacuum to reclaim disk space (requires downtime)
VACUUM FULL incident_threads;
VACUUM FULL alert_cache;

-- Or lighter vacuum + analyze
VACUUM ANALYZE incident_threads;
VACUUM ANALYZE alert_cache;
```

---

## ⚡ Performance Optimization Recommendations

### 1. JSONB Column Optimization

The `alerts` JSONB column in `incident_threads` is likely causing bloat:

```sql
-- Check average JSONB sizes
SELECT
    AVG(pg_column_size(alerts)) as avg_alerts_bytes,
    MAX(pg_column_size(alerts)) as max_alerts_bytes
FROM incident_threads;
```

**Recommendation:** Consider normalizing to a separate `thread_alerts` table if alerts JSONB is > 10KB average.

### 2. Add Missing Indexes for Common Queries

Based on your app's query patterns, these might help:

```sql
-- Composite index for common thread queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_status_created
ON incident_threads(status, created_at DESC);

-- Partial index for active threads only (smaller, faster)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_active
ON incident_threads(created_at DESC)
WHERE status = 'active';
```

### 3. Enable pg_stat_statements (If Not Already)

Track slow queries:

```sql
-- Enable extension (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 📋 Automated Cleanup Procedures

### Option A: Supabase Edge Function (Recommended)

Create a scheduled Edge Function to run cleanup daily:

```typescript
// supabase/functions/db-cleanup/index.ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Clean old resolved threads (keep 14 days)
  const { error: threadError } = await supabase.rpc("cleanup_old_threads", {
    days_to_keep: 14,
  });

  // Clean old alert cache (keep 3 days of non-latest)
  const { error: cacheError } = await supabase.rpc("cleanup_old_alerts", {
    days_to_keep: 3,
  });

  return new Response(
    JSON.stringify({
      threads_cleanup: threadError ? "failed" : "success",
      alerts_cleanup: cacheError ? "failed" : "success",
    })
  );
});
```

### Option B: PostgreSQL Functions with pg_cron

```sql
-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old resolved threads
    DELETE FROM incident_threads
    WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '14 days';

    -- Delete old non-latest alerts
    DELETE FROM alert_cache
    WHERE is_latest = false
    AND fetched_at < NOW() - INTERVAL '3 days';

    -- Cleanup notification history
    DELETE FROM notification_history
    WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available on your plan)
SELECT cron.schedule('cleanup-daily', '0 3 * * *', 'SELECT cleanup_old_data();');
```

---

## 🎯 Priority Action Items

### Immediate (This Week)

| Priority  | Action                     | Expected Savings  |
| --------- | -------------------------- | ----------------- |
| 🔴 High   | Drop unused indexes        | 10-15 MB          |
| 🔴 High   | Run VACUUM ANALYZE         | Reclaim dead rows |
| 🟡 Medium | Clean old resolved threads | 30-50 MB          |

### Short-Term (This Month)

| Priority  | Action                   | Benefit                      |
| --------- | ------------------------ | ---------------------------- |
| 🟡 Medium | Set up automated cleanup | Prevent future bloat         |
| 🟡 Medium | Add partial indexes      | Faster queries               |
| 🟢 Low    | Analyze JSONB sizes      | Identify normalization needs |

### Long-Term (If Approaching Limits)

| Priority | Action                      | When Needed          |
| -------- | --------------------------- | -------------------- |
| 🟢 Low   | Archive to external storage | > 400 MB             |
| 🟢 Low   | Consider upgrading plan     | > 450 MB             |
| 🟢 Low   | Normalize JSONB to tables   | If alerts > 10KB avg |

---

## 📈 Monitoring Queries

Save these for periodic checks:

```sql
-- Check total database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check for bloat (high dead row count)
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY n_dead_tup DESC;

-- Check unused indexes
SELECT
    indexrelname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## ✅ Summary & Action Plan

### ✅ OPTIMIZATION COMPLETE (December 30, 2025)

All optimizations have been executed successfully!

### Final Results

| Metric                  | Before  | After     | Savings             |
| ----------------------- | ------- | --------- | ------------------- |
| **Total Database Size** | 135 MB  | **39 MB** | **96 MB (71%)**     |
| **incident_threads**    | 97 MB   | 696 kB    | **96.3 MB (99.3%)** |
| **Auth tables**         | ~680 kB | 0         | 680 kB              |
| **Unused indexes**      | ~400 kB | 0         | ~400 kB             |
| **Free Tier Usage**     | 27%     | **7.8%**  | -19.2%              |

### Actions Completed

| Priority  | Action                                 | Status            |
| --------- | -------------------------------------- | ----------------- |
| ✅ **P0** | `VACUUM FULL incident_threads`         | Done              |
| ✅ **P1** | Drop 10+ unused indexes                | Done              |
| ✅ **P2** | Drop 7 auth tables                     | Done              |
| ✅ **P3** | Delete dead code `preferences.ts`      | Done              |
| ✅ **P4** | `VACUUM ANALYZE` all tables            | Done              |
| ✅ **P5** | Fix poll-alerts duplicate key errors   | Done (2025-01-18) |
| ✅ **P6** | Fix 3 broken database functions        | Done (2025-01-18) |
| ✅ **P7** | Create automated cleanup Edge Function | Done (2025-01-18) |

### Remaining Recommendations (Low Priority)

| Priority  | Action                            | Notes                                 |
| --------- | --------------------------------- | ------------------------------------- |
| 🟢 **P8** | Deploy db-cleanup Edge Function   | Created, needs Supabase cron schedule |
| 🟢 **P9** | Enable leaked password protection | Dashboard → Auth → Settings           |

---

## 🔧 Automated Cleanup System (2025-01-18)

### Edge Function: `db-cleanup`

Created `supabase/functions/db-cleanup/index.ts` for automated maintenance:

**Operations:**

1. Delete old alerts (>48h non-latest, >7d all)
2. Clean up stale/resolved threads (>24h resolved, >12h stale)
3. Delete old notification history (>7 days)
4. Call `cleanup_old_data()` RPC for additional cleanup

**To deploy and schedule:**

```bash
# Deploy the function
supabase functions deploy db-cleanup

# Schedule via Supabase Dashboard or pg_cron:
# Dashboard → Database → Cron Jobs → Create Job
# - Name: db-cleanup-daily
# - Schedule: 0 4 * * * (4 AM daily)
# - Command: SELECT net.http_post('https://[project-ref].supabase.co/functions/v1/db-cleanup', ...)
```

### poll-alerts Fixes (2025-01-18)

Fixed duplicate key constraint errors in `poll-alerts` Edge Function:

| Change                  | Before           | After                                        |
| ----------------------- | ---------------- | -------------------------------------------- |
| existingAlerts lookback | 24 hours         | 7 days                                       |
| BlueSky insert          | `.insert(alert)` | `.upsert(alert, { onConflict: 'alert_id' })` |
| TTC API insert          | `.insert(alert)` | `.upsert(alert, { onConflict: 'alert_id' })` |

This prevents "duplicate key value violates unique constraint" errors when alerts reappear.

### Prevention: Schedule Periodic VACUUM FULL

To prevent bloat from recurring, consider running monthly:

```sql
-- Run monthly during low-traffic period
VACUUM FULL incident_threads;
VACUUM FULL alert_cache;
VACUUM ANALYZE;
```

---

_Report generated from Supabase database analysis. Initial optimization: December 30, 2025. Additional fixes: January 18, 2025._
