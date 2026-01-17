# rideTO - Data Polling & Refresh Frequencies

This document describes all data sources, their polling frequencies, and update mechanisms in the rideTO PWA.

---

## Timezone Policy: EST/EDT (America/Toronto)

All time-related logic in this app uses **Eastern Time (America/Toronto)** for consistency with TTC operations. This section documents the timezone strategy:

### UI Display

- All user-facing times display in **local EST/EDT** via `toLocaleDateString()`/`toLocaleTimeString()`
- Holiday checking uses explicit `timeZone: 'America/Toronto'` (see `ttc-holidays.ts`)
- Route change filtering uses local time parsing (TTC publishes times in EST)

### Database Timestamps

- Stored as **ISO 8601 UTC** (`toISOString()`) for database consistency
- PostgreSQL `timestamptz` columns handle timezone conversion automatically
- UTC storage ensures correct sorting and comparison across timezones

### Cron Jobs (pg_cron in Supabase)

| Type                         | Timezone Handling                                        |
| ---------------------------- | -------------------------------------------------------- |
| Interval-based (`* * * * *`) | Timezone-agnostic (runs every N minutes from now)        |
| Fixed-time (cleanup at 4 AM) | DST-aware wrapper using `AT TIME ZONE 'America/Toronto'` |

**DST-aware cleanup example:**

```sql
-- Scheduled at both 8 AM and 9 AM UTC to handle DST transitions
-- Function checks if it's actually 4 AM Toronto time before running
toronto_hour := EXTRACT(hour FROM now() AT TIME ZONE 'America/Toronto');
IF toronto_hour = 4 THEN ...
```

### GitHub Actions Cron

- Cron expressions are in **UTC** (GitHub standard)
- Comments document **EST equivalent** for clarity
- Example: `"0 4 * * 0"` = 4:00 AM UTC = **11:00 PM EST Saturday**

### Summary

| Context          | Timezone             | Example                       |
| ---------------- | -------------------- | ----------------------------- |
| UI display       | EST/EDT (local)      | "Jan 12, 5:00 AM"             |
| Database storage | UTC (ISO 8601)       | "2025-01-12T10:00:00.000Z"    |
| Interval cron    | N/A (relative)       | "_/15 _ \* \* \*"             |
| Fixed-time cron  | DST-aware EST        | Cleanup at 4 AM Toronto       |
| GitHub Actions   | UTC with EST comment | "0 4 \* \* 0" (11 PM EST Sat) |

---

## Real-Time Data (Live Updates)

### 1. Service Alerts

| Property                 | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| **Source**               | Supabase Edge Function (`poll-alerts`) polling TTC Service Alerts API |
| **Update Frequency**     | Every 1 minute (server-side via pg_cron)                              |
| **Client Delivery**      | Supabase Realtime (instant push on changes)                           |
| **Visibility Refresh**   | Auto-refresh when app becomes visible (catches missed updates)        |
| **Reconnection Refresh** | Auto-refresh when Realtime reconnects after disconnect                |
| **Data Type**            | Service disruptions, delays, detours, closures                        |
| **Caching**              | No client-side caching - always fresh from server                     |

**How it works:**

1. Edge Function polls TTC API every 1 minute
2. New/changed alerts are inserted into Supabase database
3. Supabase Realtime pushes changes to connected clients instantly
4. Client receives updates without polling
5. If app is backgrounded and returns visible, alerts are refreshed to catch missed updates
6. If Realtime connection drops and reconnects, alerts are refreshed automatically

### 2. ETA Predictions (Real-Time GPS)

| Property             | Value                                         |
| -------------------- | --------------------------------------------- |
| **Source**           | NextBus API (TTC real-time vehicle positions) |
| **Update Frequency** | On-demand with 30-second cache                |
| **Client Request**   | When user views stop details                  |
| **Data Type**        | Minutes until next bus/streetcar arrival      |
| **Cache TTL**        | 30 seconds                                    |

**How it works:**

1. User opens stop details
2. Client requests ETA from Edge Function
3. Edge Function checks cache (30s TTL)
4. If stale, fetches fresh data from NextBus API
5. Returns prediction with vehicle GPS positions

### 3. Subway ETAs

| Property             | Value                          |
| -------------------- | ------------------------------ |
| **Source**           | TTC Subway API                 |
| **Update Frequency** | On-demand with 30-second cache |
| **Data Type**        | Minutes until next train       |
| **Cache TTL**        | 30 seconds                     |

---

## Static Data (Periodic Refresh)

### 4. Schedule Data (GTFS)

| Property                  | Value                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Source**                | [Toronto Open Data GTFS](https://open.toronto.ca/dataset/ttc-routes-and-schedules/) |
| **TTC Update Frequency**  | Approximately every 6 weeks                                                         |
| **Our Refresh Frequency** | Weekly (Sundays, 4:00 AM UTC)                                                       |
| **Workflow**              | `.github/workflows/refresh-schedule-data.yml`                                       |
| **Output**                | `static/data/ttc-schedules.json` (~9,267 stops)                                     |
| **Data Contents**         | First AM/PM departures per route per stop                                           |

**What's included:**

- First weekday departure time per route per stop
- First Saturday departure time
- First Sunday departure time
- First PM departure (after 3 PM) for express routes (9xx)

**Used for:**

- Fallback when real-time GPS data unavailable
- "First bus at X:XX" information
- Schedule-based departure predictions

### 5. Route Stop Orders & Branches

| Property                  | Value                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Source**                | NextBus API                                                                                     |
| **Our Refresh Frequency** | Weekly (Sundays, 2:00 AM UTC / Sat 9 PM EST)                                                    |
| **Workflow**              | `.github/workflows/refresh-route-data.yml`                                                      |
| **Output Files**          | `static/data/ttc-route-stop-orders.json` (277KB), `static/data/ttc-route-branches.json` (512KB) |
| **Loading Strategy**      | Lazy-loaded on-demand via `route-data.ts` service                                               |

**What's included:**

- Stop sequences for each route (which stops in which order)
- Branch definitions (route variants like "501 Long Branch")
- Direction labels
- **118 route branch variations** across 66 routes

**Branch Letters in Use:**

| Letter | Count | Examples        |
| ------ | ----- | --------------- |
| A      | 47    | 97A, 100A, 504A |
| B      | 34    | 97B, 939B, 985B |
| C      | 16    | 102C, 927C      |
| D      | 10    | 102D, 504D      |
| F      | 2     | 52F, 123F       |
| G      | 1     | 52G             |
| S      | 2     | 79S, 336S       |

**Used for:**

- Route browser stop lists
- Stop sequencing in UI
- Branch selection
- Alert route extraction (supports A-Z branch suffixes)

### 6. Route List (Dynamic)

| Property                  | Value                                          |
| ------------------------- | ---------------------------------------------- |
| **Source**                | NextBus API (routeList command)                |
| **Our Refresh Frequency** | Weekly (Sundays, 2:00 AM UTC)                  |
| **Workflow**              | `.github/workflows/refresh-route-data.yml`     |
| **Script**                | `scripts/fetch-routes.cjs`                     |
| **Output Files**          | `ttc-routes.json` (src/lib/data & static/data) |
| **Total Routes**          | 216 routes (5 subway + 211 from API)           |

**What's included:**

- All active TTC routes from NextBus API
- Routes categorized by type: subway, streetcar, express, night, nightStreetcar, community, bus, shuttle
- Route number and title for each route

**Categorization logic:**

- 500-599: Streetcar
- 900-999: Express (9xx)
- 300-399: Blue Night
- 301-311: Night Streetcar (overlaps with Blue Night range)
- 806: Shuttle
- Others: Regular bus

**Used for:**

- Routes page category display
- Auto-detection of new/discontinued routes
- Keep route list current without manual updates

### 7. Stop Database

| Property             | Value                        |
| -------------------- | ---------------------------- |
| **Source**           | TTC GTFS `stops.txt`         |
| **Update Frequency** | Manual (with schedule data)  |
| **Total Stops**      | 9,346 stops                  |
| **Output**           | `static/data/ttc-stops.json` |

**What's included:**

- Stop ID, name, coordinates
- Accessibility information
- Stop types (bus, streetcar, subway)

---

## Automated Workflows Summary

| Workflow                   | Schedule                             | EST Equivalent          | Output                                |
| -------------------------- | ------------------------------------ | ----------------------- | ------------------------------------- |
| **Alert Polling**          | Every 1 min (pg_cron)                | Every 1 min             | Supabase `alert_cache` table          |
| **Subway Closures Scrape** | Every 6 hours (pg_cron)              | Every 6 hours           | Supabase `planned_maintenance` table  |
| **Elevator Verification**  | Every 15 min (pg_cron)               | Every 15 min            | Supabase `incident_threads` table     |
| **RSZ Verification**       | Every 15 min (pg_cron, +7min offset) | Every 15 min            | Supabase `incident_threads` table     |
| **RSZ Scrape**             | Every 30 min (pg_cron)               | Every 30 min            | Supabase `incident_threads` table     |
| **Database Cleanup**       | Every hour + 4 AM Toronto (pg_cron)  | Hourly + DST-aware      | Deletes old data (see retention)      |
| **Schedule Refresh**       | Sun 4:00 AM UTC (GitHub)             | Sat 11:00 PM EST        | `ttc-schedules.json`                  |
| **Route Data Refresh**     | Sun 2:00 AM UTC (GitHub)             | Sat 9:00 PM EST         | `ttc-routes.json`, `ttc-route-*.json` |

### Database Cleanup & Retention Policy

Two cleanup jobs run to prevent database bloat:

| Job                    | Schedule      | Function                    |
| ---------------------- | ------------- | --------------------------- |
| `cleanup-old-data`     | Every hour    | `cleanup_old_data()`        |
| `cleanup-alerts-*-utc` | 8 & 9 AM UTC  | `cleanup_old_alerts_toronto()` (4 AM Toronto) |

**Retention Policies (cleanup_old_data):**

| Table                    | Retention Period | Notes                           |
| ------------------------ | ---------------- | ------------------------------- |
| `alert_cache`            | 48 hours         | Keeps recent alerts for threading |
| `incident_threads`       | 12-24 hours      | Resolved: 24h, Stale: 12h       |
| `notification_history`   | 7 days           | Push notification logs          |
| `alert_accuracy_logs`    | 30 days          | Monitoring logs (disabled)      |
| `alert_accuracy_reports` | 30 days          | Monitoring reports (disabled)   |
| `planned_maintenance`    | 7 days after end | Deletes past maintenance events |

### Data Integrity Verification Functions

These Edge Functions run periodically to ensure data consistency:

#### verify-elevators (v2)

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| **Source**           | TTC API `accessibility` array                                            |
| **Update Frequency** | Every 15 minutes (pg_cron: :00, :15, :30, :45)                           |
| **Data Type**        | Elevator outages                                                         |
| **Auto-Corrections** | Create missing, unhide hidden-but-active, hide stale threads             |
| **v2 Enhancement**   | Auto-cleanup stale "back in service" alerts when TTC API shows still out |

**v2 Stale Alert Cleanup:**
When an elevator alert shows "back in service" but the TTC API still shows the elevator as out of service, the stale alert is automatically deleted. This handles edge cases where the TTC API briefly reports an elevator as back in service, then reverts.

#### verify-rsz (v1)

| Property             | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| **Source**           | TTC API routes with `effectDesc = "Reduced Speed Zone"`      |
| **Update Frequency** | Every 15 minutes (pg_cron: :07, :22, :37, :52, offset by 7)  |
| **Data Type**        | Reduced Speed Zones (slow orders)                            |
| **Auto-Corrections** | Create missing, unhide hidden-but-active, hide stale threads |

#### scrape-rsz (v4)

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Source**           | TTC website HTML tables                          |
| **Update Frequency** | Every 30 minutes (pg_cron)                       |
| **Data Type**        | RSZ with extended info (defect length, reason)   |
| **Purpose**          | Backup/supplementary source with richer metadata |

### Edge Function: scrape-maintenance

| Property             | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| **Source**           | TTC Sitecore API (subway-service page)                |
| **Update Frequency** | Every 6 hours (pg_cron: 0, 6, 12, 18 UTC)             |
| **Version**          | v3                                                    |
| **Data Type**        | Planned subway closures (nightly, weekend, scheduled) |
| **Output**           | Supabase `planned_maintenance` table                  |
| **Cron Invocation**  | `invoke_scrape_maintenance()` (vault-based auth)      |

**What's included:**

- Subway line (Line 1-4)
- Affected stations (e.g., "Finch to Eglinton")
- Start/end dates
- Start time (for nightly closures)
- Closure type detection (Nightly/Weekend/Scheduled)

**v3 Improvements:**

- Single-day closure support (sa-effective-date fallback)
- Better error logging with HTML snippets

### Cron Job Authentication (Jan 2026)

All Edge Function cron jobs use **vault-based authentication** via wrapper functions. This ensures the service role key is securely retrieved at runtime rather than hardcoded.

| Wrapper Function              | Edge Function      | Auth Method |
| ----------------------------- | ------------------ | ----------- |
| `invoke_poll_alerts()`        | poll-alerts        | ✅ Vault    |
| `invoke_scrape_rsz()`         | scrape-rsz         | ✅ Vault    |
| `invoke_scrape_maintenance()` | scrape-maintenance | ✅ Vault    |
| `invoke_verify_disruptions()` | verify-disruptions | ✅ Vault    |
| `invoke_verify_elevators()`   | verify-elevators   | ✅ Vault    |
| `invoke_verify_rsz()`         | verify-rsz         | ✅ Vault    |

**Why vault-based auth?**

- Service role key is retrieved securely from `vault.decrypted_secrets`
- No hardcoded keys in cron job definitions
- Keys can be rotated without updating cron jobs
- Consistent pattern across all invoke functions

### Workflow Triggers

Both GitHub workflows can be triggered:

1. **Automatically** on schedule (cron)
2. **Manually** via GitHub Actions UI → "Run workflow"

### Workflow Actions

- ✅ **Auto-commit** directly to `version-b` branch
- ✅ **Cloudflare Pages** auto-deploys on commit
- ✅ **No PR review** required

---

## Client-Side Behavior

### Alert Store Subscription

```
Initial Load → Fetch all active alerts
↓
Subscribe → Supabase Realtime channel
↓
On INSERT/UPDATE/DELETE → Update local store instantly
```

### ETA Refresh

```
Stop Details Open → Fetch ETAs
↓
30-second interval → Re-fetch if user still viewing
↓
Close Details → Stop polling
```

### Visibility-Aware Polling

When browser tab is backgrounded:

- Alert Realtime subscription remains active (low overhead)
- ETA polling pauses (no API calls until tab active)

---

## Data Freshness Expectations

| Data Type              | Freshness         | Notes                      |
| ---------------------- | ----------------- | -------------------------- |
| **Service Alerts**     | Real-time (< 30s) | Push-based via Realtime    |
| **Bus/Streetcar ETAs** | 30 seconds max    | On-demand with cache       |
| **Subway ETAs**        | 30 seconds max    | On-demand with cache       |
| **Schedules**          | Monthly           | TTC updates ~every 6 weeks |
| **Route Data**         | Weekly            | Stop sequences, branches   |
| **Route List**         | Weekly            | All routes by category     |

---

## Data Source URLs

| Data                       | URL                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **TTC Service Alerts**     | `https://alerts.ttc.ca/api/alerts/live-alerts`                                                 |
| **NextBus API (XML)**      | `https://retro.umoiq.com/service/publicXMLFeed`                                                |
| **NextBus API (JSON)**     | `https://retro.umoiq.com/service/publicJSONFeed?command=routeList&a=ttc`                       |
| **Toronto Open Data GTFS** | `https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169` |
| **TTC Subway API**         | `https://www.ttc.ca/ttcapi/...`                                                                |

---

## Maintenance Notes

### When TTC Adds/Removes Routes

Route list is now **automatically updated** weekly via `fetch-routes.cjs`:

1. Weekly route refresh fetches current routes from NextBus API
2. Routes are auto-categorized (subway, streetcar, express, night, bus, shuttle)
3. Routes page imports from JSON - no manual code changes needed
4. Manual trigger: GitHub Actions → "Refresh TTC Route Data" → "Run workflow"

### When TTC Changes Stop Sequences

If TTC changes stop sequences or significantly changes routes:

1. Weekly route refresh will catch it automatically
2. Manual trigger: GitHub Actions → "Refresh TTC Route Data" → "Run workflow"

### When TTC Updates GTFS

TTC publishes new GTFS approximately every 6 weeks:

1. Weekly schedule refresh will catch it within ~1 week
2. Manual trigger: GitHub Actions → "Refresh TTC Schedule Data" → "Run workflow"

### Monitoring

Check workflow runs: https://github.com/shabanmohd/ttc-alerts-svelte/actions
