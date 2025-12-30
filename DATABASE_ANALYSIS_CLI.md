# Supabase Database Analysis - CLI Report

**Date:** December 30, 2025  
**Tool:** Supabase CLI v2.67.1  
**Command:** `supabase inspect db [command] --linked`  
**Report Files:** `./2025-12-30/*.csv`

---

## 📊 Overall Database Stats

```
supabase inspect db db-stats --linked
```

| Metric | Value |
|--------|-------|
| **Database Size** | 135 MB |
| **Total Index Size** | 47 MB |
| **Total Table Size** | 54 MB |
| **WAL Size** | 176 MB |
| **Index Hit Rate** | 100% ✅ |
| **Table Hit Rate** | 100% ✅ |
| **Time Since Stats Reset** | 37 days |

---

## 📁 Table Statistics

```
supabase inspect db table-stats --linked
```

| Table | Table Size | Index Size | Total Size | Rows | Seq Scans |
|-------|------------|------------|------------|------|-----------|
| `public.incident_threads` | 52 MB | 45 MB | **97 MB** | 959 | 447 |
| `public.alert_cache` | 2,072 kB | 1,768 kB | 3,840 kB | 2,174 | 96,708 |
| `public.notification_history` | 88 kB | 96 kB | 184 kB | 70 | 100 |
| `public.user_preferences` | 48 kB | 80 kB | 128 kB | 2 | 204 |
| `public.planned_maintenance` | 48 kB | 80 kB | 128 kB | 13 | 10,070 |
| `public.preference_migrations` | 16 kB | 96 kB | 112 kB | 1 | 72 |
| `public.webauthn_challenges` | 24 kB | 80 kB | 104 kB | 0 | 139 |
| `public.user_profiles` | 16 kB | 64 kB | 80 kB | 8 | 98 |
| `public.device_preferences` | 16 kB | 64 kB | 80 kB | 6 | 152 |
| `public.gtfs_routes` | 16 kB | 48 kB | 64 kB | 20 | 1,199 |
| `public.recovery_codes` | 16 kB | 48 kB | 64 kB | 60 | 69 |
| `public.webauthn_credentials` | 16 kB | 48 kB | 64 kB | 7 | 74 |
| `public.gtfs_stations` | 8 kB | 24 kB | 32 kB | 0 | 77 |

---

## 🔥 Table & Index Bloat

```
supabase inspect db bloat --linked
```

### Critical: `incident_threads` Bloat

| Type | Item | Bloat Factor | Wasted Space |
|------|------|--------------|--------------|
| **TABLE** | `public.incident_threads` | **188.6x** | **51 MB** 🔴 |
| INDEX | `idx_incident_threads_id` | 61.8x | 16 MB |
| INDEX | `incident_threads_pkey` | 61.8x | 16 MB |
| INDEX | `idx_thread_updated` | 36.8x | 9,448 kB |
| INDEX | `idx_thread_resolved` | 9.9x | 2,360 kB |
| INDEX | `idx_incident_threads_active` | 48.5x | 760 kB |

**Total Waste: ~95 MB** (70% of database!)

### Other Tables (Healthy)

| Type | Item | Bloat Factor | Wasted Space |
|------|------|--------------|--------------|
| TABLE | `public.alert_cache` | 1.2x | 312 kB ✅ |
| TABLE | `public.notification_history` | 2.0x | 24 kB ✅ |
| TABLE | `public.planned_maintenance` | 1.0x | 0 bytes ✅ |

---

## 🔍 Index Statistics

```
supabase inspect db index-stats --linked
```

### High-Value Indexes (Keep - Heavy Usage)

| Index | Size | % Used | Scans |
|-------|------|--------|-------|
| `idx_alert_thread` | 112 kB | 100% | 5,018,953,113 |
| `idx_alert_cache_thread_created` | 232 kB | 100% | 504,304,817 |
| `idx_incident_threads_id` | 16 MB | 100% | 17,020,417 |
| `alert_cache_pkey` | 176 kB | 100% | 8,589,163 |
| `idx_thread_updated` | 9,712 kB | 100% | 1,071,139 |
| `idx_thread_resolved` | 2,624 kB | 100% | 780,493 |
| `idx_notification_history_alert_id` | 16 kB | 100% | 642,548 |
| `idx_incident_threads_active` | 776 kB | 100% | 135,933 |
| `incident_threads_pkey` | 16 MB | 100% | 86,624 |

### Unused Indexes (0% Used - Safe to Drop)

| Index | Size | Scans | Status |
|-------|------|-------|--------|
| `idx_alert_cache_bluesky_uri` | 136 kB | 0 | **UNUSED** |
| `device_preferences_pkey` | 16 kB | 0 | **UNUSED** |
| `idx_maintenance_active` | 16 kB | 0 | **UNUSED** |
| `idx_notification_history_device_id` | 16 kB | 0 | **UNUSED** |
| `idx_user_preferences_device_id` | 16 kB | 0 | **UNUSED** |
| `idx_maintenance_line` | 16 kB | 0 | **UNUSED** |
| `preference_migrations_pkey` | 16 kB | 0 | **UNUSED** |
| `idx_webauthn_challenges_user_id` | 16 kB | 0 | **UNUSED** |
| `planned_maintenance_pkey` | 16 kB | 0 | **UNUSED** |
| `idx_device_preferences_created_at` | 16 kB | 0 | **UNUSED** |
| `idx_webauthn_credentials_active` | 16 kB | 0 | **UNUSED** |
| `idx_user_profiles_updated_at` | 16 kB | 0 | **UNUSED** |
| `idx_user_preferences_updated_at` | 16 kB | 0 | **UNUSED** |
| `idx_user_profiles_email` | 16 kB | 0 | **UNUSED** |
| `idx_preference_migrations_migrated_at` | 16 kB | 0 | **UNUSED** |
| `idx_preference_migrations_status` | 16 kB | 0 | **UNUSED** |
| `idx_notification_history_success` | 16 kB | 0 | **UNUSED** |
| `preference_migrations_from_device_id_to_user_id_key` | 16 kB | 0 | **UNUSED** |
| `idx_route_type` | 16 kB | 0 | **UNUSED** |
| `idx_preference_migrations_device_id` | 16 kB | 0 | **UNUSED** |
| `user_profiles_email_key` | 16 kB | 0 | **UNUSED** |
| `idx_recovery_codes_unused` | 16 kB | 0 | **UNUSED** |
| `idx_station_name` | 8 kB | 0 | **UNUSED** |
| `idx_station_source` | 8 kB | 0 | **UNUSED** |

**Total Unused Index Space: ~400 kB**

---

## 🧹 Vacuum Statistics

```
supabase inspect db vacuum-stats --linked
```

| Table | Last Auto Vacuum | Dead Rows | Expect Autovacuum? |
|-------|------------------|-----------|-------------------|
| `alert_cache` | 2025-12-30 20:36 | 401 | No |
| `incident_threads` | 2025-12-30 20:57 | 130 | No |
| `notification_history` | 2025-12-04 13:18 | 0 | No |
| `planned_maintenance` | 2025-12-12 04:50 | 19 | No |
| `recovery_codes` | Never | 0 | No |
| `webauthn_challenges` | 2025-12-04 13:19 | 0 | No |

---

## 🐢 Query Outliers

```
supabase inspect db outliers --linked
```

| Query | Execution Time | % of Total | Calls |
|-------|----------------|------------|-------|
| `SELECT invoke_poll_alerts()` | 3m 34s | 46.4% | 14,739 |
| `SELECT pg_sleep($1)` | 2m 30s | 32.4% | 5 |
| `DELETE FROM incident_threads` | 22.6s | 4.9% | 1 |
| `VACUUM FULL incident_threads` | 4.6s | 1.0% | 1 |
| `cleanup_old_alerts_toronto()` | 2.2s | 0.5% | 30 |

---

## 🛡️ Database Lint Errors

```
supabase db lint --linked
```

### Function Errors

| Function | Error | Severity |
|----------|-------|----------|
| `get_thread_with_alerts` | relation "alert_cache" does not exist | ERROR |
| `get_threads_with_alerts_bulk` | relation "alert_cache" does not exist | ERROR |
| `cleanup_old_data` | type cast text[] to uuid[] | WARNING |
| `cleanup_old_data` | operator does not exist: text = uuid | ERROR |

---

## ✅ Inspection Rules Results

```
supabase inspect report --linked
```

| Rule | Status | Matches |
|------|--------|---------|
| No old locks | ✔ PASS | - |
| No ungranted locks | ✔ PASS | - |
| No unused indexes | ✘ FAIL | 5 indexes |
| Cache hit within bounds | ✔ PASS | - |
| No large tables with seq scans >10% | ✘ FAIL | `public.alert_cache` |
| No large tables waiting autovacuum | ✔ PASS | - |
| No tables yet to be vacuumed | ✘ FAIL | 4 tables |

---

## 🚀 Recommended Actions

### Priority 1: Fix Bloat (Save ~95 MB)

```sql
-- WARNING: Requires exclusive lock (brief downtime, ~5 seconds)
VACUUM FULL incident_threads;
REINDEX TABLE incident_threads;
```

### Priority 2: Drop Unused Indexes (Save ~400 kB)

```sql
DROP INDEX IF EXISTS idx_alert_cache_bluesky_uri;
DROP INDEX IF EXISTS idx_notification_history_device_id;
DROP INDEX IF EXISTS idx_notification_history_success;
DROP INDEX IF EXISTS idx_maintenance_active;
DROP INDEX IF EXISTS idx_maintenance_line;
DROP INDEX IF EXISTS idx_user_preferences_device_id;
DROP INDEX IF EXISTS idx_user_preferences_updated_at;
DROP INDEX IF EXISTS idx_user_profiles_updated_at;
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_webauthn_challenges_user_id;
DROP INDEX IF EXISTS idx_webauthn_credentials_active;
DROP INDEX IF EXISTS idx_device_preferences_created_at;
DROP INDEX IF EXISTS idx_preference_migrations_migrated_at;
DROP INDEX IF EXISTS idx_preference_migrations_status;
DROP INDEX IF EXISTS idx_preference_migrations_device_id;
DROP INDEX IF EXISTS idx_recovery_codes_unused;
DROP INDEX IF EXISTS idx_route_type;
DROP INDEX IF EXISTS idx_station_name;
DROP INDEX IF EXISTS idx_station_source;
```

### Priority 3: Fix Broken Functions

```sql
-- The functions reference old table structure
-- Review and fix: get_thread_with_alerts, get_threads_with_alerts_bulk, cleanup_old_data
```

### Priority 4: Run Missing Vacuums

```sql
VACUUM ANALYZE incident_threads;
VACUUM ANALYZE notification_history;
VACUUM ANALYZE planned_maintenance;
VACUUM ANALYZE recovery_codes;
```

---

## 📋 Expected Results After Optimization

| Metric | Current | After |
|--------|---------|-------|
| Database Size | 135 MB | ~40 MB |
| incident_threads | 97 MB | ~1-2 MB |
| Unused Indexes | ~400 kB | 0 kB |
| Total Savings | - | **~95 MB (70%)** |

---

*Report generated by Supabase CLI. Files saved to `./2025-12-30/`*
