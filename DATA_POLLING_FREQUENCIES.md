# TTC Alerts - Data Polling & Refresh Frequencies

This document describes all data sources, their polling frequencies, and update mechanisms in the TTC Alerts PWA.

---

## Real-Time Data (Live Updates)

### 1. Service Alerts

| Property             | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| **Source**           | Supabase Edge Function (`poll-alerts`) polling TTC Service Alerts API |
| **Update Frequency** | Every 30 seconds (server-side)                                        |
| **Client Delivery**  | Supabase Realtime (instant push on changes)                           |
| **Data Type**        | Service disruptions, delays, detours, closures                        |
| **Caching**          | No client-side caching - always fresh from server                     |

**How it works:**

1. Edge Function polls TTC API every 30 seconds
2. New/changed alerts are inserted into Supabase database
3. Supabase Realtime pushes changes to connected clients instantly
4. Client receives updates without polling

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
| **Our Refresh Frequency** | Monthly (1st of month, 4:00 AM UTC)                                                 |
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

| Property                  | Value                                                   |
| ------------------------- | ------------------------------------------------------- |
| **Source**                | NextBus API                                             |
| **Our Refresh Frequency** | Weekly (Sundays, 2:00 AM UTC)                           |
| **Workflow**              | `.github/workflows/refresh-route-data.yml`              |
| **Output Files**          | `ttc-route-stop-orders.json`, `ttc-route-branches.json` |

**What's included:**

- Stop sequences for each route (which stops in which order)
- Branch definitions (route variants like "501 Long Branch")
- Direction labels

**Used for:**

- Route browser stop lists
- Stop sequencing in UI
- Branch selection

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

| Workflow               | Schedule                | Data Source            | Output                                         |
| ---------------------- | ----------------------- | ---------------------- | ---------------------------------------------- |
| **Schedule Refresh**   | Monthly (1st, 4 AM UTC) | Toronto Open Data GTFS | `ttc-schedules.json`                           |
| **Route Data Refresh** | Weekly (Sun, 2 AM UTC)  | NextBus API            | `ttc-routes.json`, `ttc-route-*.json`          |
| **Alert Polling**      | Every 30 seconds        | TTC Service Alerts API | Supabase `alerts` table                        |

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

| Data Type              | Freshness         | Notes                         |
| ---------------------- | ----------------- | ----------------------------- |
| **Service Alerts**     | Real-time (< 30s) | Push-based via Realtime       |
| **Bus/Streetcar ETAs** | 30 seconds max    | On-demand with cache          |
| **Subway ETAs**        | 30 seconds max    | On-demand with cache          |
| **Schedules**          | Monthly           | TTC updates ~every 6 weeks    |
| **Route Data**         | Weekly            | Stop sequences, branches      |
| **Route List**         | Weekly            | All routes by category        |

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

1. Monthly schedule refresh will catch it within ~4-6 weeks
2. Manual trigger: GitHub Actions → "Refresh TTC Schedule Data" → "Run workflow"

### Monitoring

Check workflow runs: https://github.com/shabanmohd/ttc-alerts-svelte/actions
