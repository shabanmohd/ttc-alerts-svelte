# Alert Categorization and Threading System

**Version:** 3.21  
**Date:** January 11, 2026  
**poll-alerts Version:** 116  
**scrape-maintenance Version:** 3  
**verify-elevators Version:** 1  
**verify-rsz Version:** 1  
**Status:** ✅ Implemented and Active  
**Architecture:** Svelte 5 + Supabase Edge Functions + Cloudflare Pages

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Alert Sources](#alert-sources)
4. [Multi-Category System](#multi-category-system)
5. [Incident Threading](#incident-threading)
6. [Frontend Filtering](#frontend-filtering)
7. [Database Schema](#database-schema)
8. [Edge Functions](#edge-functions)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring and Tuning](#monitoring-and-tuning)

---

## Overview

This document describes the alert categorization and threading system designed to:

1. **Bluesky integration** - Primary source from @ttcalerts.bsky.social
2. **TTC API integration** - RSZ (Reduced Speed Zone) and Elevator/Escalator alerts
3. **Multi-category tagging** - Alerts can match multiple non-exclusive categories
4. **Effect-based categorization** - Focus on service impact, not cause
5. **Incident threading** - Group related updates using Jaccard similarity + route matching
6. **Frontend filtering** - Mutually exclusive category filters in UI
7. **Planned alert separation** - Maintenance alerts excluded from main feed

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  TTC API        │────▶│  poll-alerts         │────▶│  Supabase DB    │
│  live-alerts    │     │  (Edge Function)     │     │  alert_cache    │
│  - routes       │     │                      │     │  incident_      │
│  - accessibility│     │  1. Fetch TTC API    │     │  threads        │
└─────────────────┘     │  2. Process RSZ      │     └────────┬────────┘
        │               │  3. Process Elevator │              │
        │               │  4. Hide stale       │              │
┌───────▼───────┐       │  5. Process Bluesky  │              │
│  Bluesky API  │──────▶│                      │              │
│  @ttcalerts   │       └──────────────────────┘              │
└───────────────┘                                              ▼
                        ┌──────────────────────┐
                        │  Svelte Frontend     │◀──────────────┘
                        │  alerts.ts store     │
                        │  + Realtime sub      │
                        └──────────────────────┘
```

**Stack:**

- **Frontend:** Svelte 5 + TypeScript + Tailwind + shadcn-svelte
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **Hosting:** Cloudflare Pages
- **Data Sources:**
  - **TTC API** (Authority for active status + RSZ + Elevators): `https://alerts.ttc.ca/api/alerts/live-alerts`
  - **Bluesky** (Context/History): `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`

---

## Alert Sources

### Current Implementation (v93+)

**Authority Source: TTC API**

- Official TTC live alerts API
- **Endpoint:** `https://alerts.ttc.ca/api/alerts/live-alerts`
- **Data Used:**
  - `routes` array - Active service disruptions and RSZ alerts
  - `accessibility` array - Elevator/escalator outages
- **Behavior:** If a route has no TTC API alert, threads for that route are hidden
- **RSZ Alerts:** Ingested with category `RSZ`, effect `RSZ`, classified as `MINOR` severity
- **Elevator Alerts:** Ingested with category `ACCESSIBILITY`, effect `ACCESSIBILITY_ISSUE`
- **Status:** ✅ Enabled as authority

**Context Source: Bluesky**

- Official TTC account: [@ttcalerts.bsky.social](https://bsky.app/profile/ttcalerts.bsky.social)
- **API:** Bluesky AT Protocol public API
- **Endpoint:** `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`
- **Polling:** Edge function fetches last 50 posts per invocation
- **Deduplication:** Uses `bluesky_uri` as unique identifier
- **Purpose:** Provides context, threading, and history for alerts
- **Status:** ✅ Enabled (supplements TTC API)

**GTFS-Realtime:** ⏸️ Disabled (all GTFS alerts also appear on Bluesky)

### Key Principles

- **TTC API is Authority** - If TTC API says route has no alert, thread is hidden
- **RSZ alerts from TTC API** - Reduced Speed Zone alerts now ingested (category: `RSZ`)
- **Elevator alerts from TTC API** - Accessibility alerts now ingested (category: `ACCESSIBILITY`)
- **Effect > Cause** - "No service" matters more than "due to security incident"
- **Non-exclusive categories** - Alert can be `SERVICE_DISRUPTION` + `SUBWAY`
- **Simple threading** - 50% text similarity for general matching, 20% for SERVICE_RESUMED
- **Latest first** - Most recent update at top of thread
- **Exact route number matching** - Threading uses route NUMBER comparison (e.g., "46" ≠ "996")
- **Auto-hide stale** - Threads hidden when route not in TTC API
- **Auto-unhide** - Threads restored if route returns to TTC API

---

## Multi-Category System

### Category Definitions

Defined in `supabase/functions/poll-alerts/index.ts`:

```typescript
const ALERT_CATEGORIES = {
  SERVICE_DISRUPTION: {
    keywords: [
      "no service",
      "suspended",
      "closed",
      "not stopping",
      "bypassing",
    ],
    priority: 1,
  },
  SERVICE_RESUMED: {
    keywords: [
      "regular service",
      "resumed",
      "restored",
      "back to normal",
      "now stopping",
    ],
    priority: 2,
  },
  DELAY: {
    keywords: ["delay", "delayed", "slower", "longer wait"],
    priority: 3,
  },
  DIVERSION: {
    keywords: ["diverting", "detour", "alternate route", "diversion"],
    priority: 4,
  },
  SHUTTLE: {
    keywords: ["shuttle", "buses replacing"],
    priority: 4,
  },
  PLANNED_CLOSURE: {
    keywords: ["planned", "scheduled", "maintenance", "this weekend"],
    priority: 5,
  },
};
```

#### Category Priority (for display ordering)

| Priority | Category           | User Impact               |
| -------- | ------------------ | ------------------------- |
| 1        | SERVICE_DISRUPTION | CRITICAL - No service     |
| 2        | SERVICE_RESUMED    | POSITIVE - Back to normal |
| 3        | DELAY              | MEDIUM - Longer journey   |
| 4        | DIVERSION          | MEDIUM - Different route  |
| 4        | SHUTTLE            | MEDIUM - Bus replacement  |
| 5        | PLANNED_CLOSURE    | HIGH - Advance notice     |

### Category Matching Logic

```typescript
function categorizeAlert(text: string): { category: string; priority: number } {
  const lowerText = text.toLowerCase();

  for (const [category, config] of Object.entries(ALERT_CATEGORIES)) {
    if (config.keywords.some((kw) => lowerText.includes(kw))) {
      return { category, priority: config.priority };
    }
  }

  return { category: "OTHER", priority: 10 };
}
```

**Note:** Current implementation returns single category (first match by priority order).

### Route Number Matching

To prevent cross-route threading (e.g., route 46 matching with 996), exact route number comparison is used:

```typescript
// Extract route NUMBER only (for comparison)
function extractRouteNumber(route: string): string {
  const match = route.match(/^(\d+)/);
  return match ? match[1] : route;
}

// Check if two routes have the same route number
function routesMatch(route1: string, route2: string): boolean {
  const num1 = extractRouteNumber(route1);
  const num2 = extractRouteNumber(route2);
  return num1 === num2;
}
```

**Examples:**

- `routesMatch("46 Martin Grove", "46")` → `true` (both have route number 46)
- `routesMatch("996 Wilson Express", "96")` → `false` (996 ≠ 96)
- `routesMatch("39 Finch East", "939 Finch Express")` → `false` (39 ≠ 939)

### Route Extraction

Routes are extracted from alert text using regex patterns:

```typescript
function extractRoutes(text: string): string[] {
  const routes: string[] = [];

  // Match subway lines: Line 1, Line 2, Line 4
  const lineMatch = text.match(/Line\s*(\d+)/gi);
  if (lineMatch) {
    lineMatch.forEach((m) => routes.push(m));
  }

  // Match numbered routes with names: "306 Carlton", "504 King"
  const routeWithNameMatch = text.match(
    /\b(\d{1,3})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
  );
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach((m) => routes.push(m));
  }

  // Match standalone route numbers
  const standaloneMatch = text.match(/\b(\d{1,3})(?=\s|:|,|$)/g);
  if (standaloneMatch) {
    standaloneMatch.forEach((num) => {
      if (parseInt(num) < 1000 && !routes.some((r) => r.startsWith(num))) {
        routes.push(num);
      }
    });
  }

  return [...new Set(routes)];
}
```

**Examples:**

- "Line 1: No service" → `["Line 1"]`
- "306 Carlton: Detour" → `["306 Carlton"]`
- "504 King delays" → `["504 King"]`
- "Routes 39, 85, 939" → `["39", "85", "939"]`

---

## Incident Threading

### Overview

Incident threading groups related alerts over time to:

- Prevent duplicate notifications (12 updates → 1 thread)
- Show incident timeline (expand to see earlier updates)
- Track incident duration
- Display most recent update first
- Auto-resolve threads when SERVICE_RESUMED

### Threading Algorithm

**Implemented in:** `supabase/functions/poll-alerts/index.ts`

```typescript
// Thread matching logic
let matchedThread = null;

for (const thread of unresolvedThreads || []) {
  const threadRoutes = Array.isArray(thread.affected_routes)
    ? thread.affected_routes
    : [];

  // Use exact route number matching to prevent 46 matching 996, etc.
  const hasRouteOverlap = routes.some((alertRoute) =>
    threadRoutes.some((threadRoute) => routesMatch(alertRoute, threadRoute))
  );

  if (hasRouteOverlap) {
    const threadTitle = thread.title || "";
    const similarity = jaccardSimilarity(text, threadTitle);

    // Medium similarity (50%) for general matching
    if (similarity >= 0.5) {
      matchedThread = thread;
      break;
    }

    // Lower threshold (20%) for SERVICE_RESUMED with route overlap
    if (category === "SERVICE_RESUMED" && similarity >= 0.2) {
      matchedThread = thread;
      break;
    }
  }
}
```

### Threading Rules

1. **Exact route number match required** - Route NUMBERS must match (e.g., "46" = "46 Martin Grove", but "46" ≠ "996")
2. **Medium similarity (≥50%)** - For general alert matching
3. **Low similarity (≥20%)** - For SERVICE_RESUMED (different vocabulary)
4. **6-hour window** - Only match unresolved threads updated within 6 hours
5. **Auto-resolve** - SERVICE_RESUMED alerts mark thread as resolved

### Text Similarity Calculation

**Jaccard Similarity** on word sets:

```typescript
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
```

**Example:**

```
Text 1: "Line 1: No service between Lawrence West and Wilson"
Text 2: "Line 1: No service between Lawrence West and Wilson stations"

Words 1: {line, no, service, between, lawrence, west, and, wilson}
Words 2: {line, no, service, between, lawrence, west, and, wilson, stations}

Shared: 8 words
Total: 9 words
Similarity: 8/9 = 0.89 → MATCH (≥ 0.8)
```

### Thread Lifecycle

```
1. New alert arrives
2. Extract routes and category
3. Find unresolved threads (last 6 hours)
4. Check route overlap + similarity threshold
5. If match found:
   - Mark previous alerts as is_latest=false
   - Link new alert to existing thread
   - Update thread title and timestamp
   - If SERVICE_RESUMED:
     → Set thread.is_resolved = true
     → Set thread.resolved_at = current timestamp
     → Add SERVICE_RESUMED to thread.categories array
6. If no match:
   - Create new thread
   - Link alert to new thread
```

### Thread States

- **ACTIVE** (`is_resolved = false`) - Incident ongoing
- **RESOLVED** (`is_resolved = true`) - Closed by SERVICE_RESUMED or age
- **HIDDEN** (`is_hidden = true`) - Thread no longer in TTC API without SERVICE_RESUMED confirmation

### Recently Resolved Display

**Implemented in:** `src/routes/alerts/+page.svelte`

Resolved threads are displayed in a "Recently Resolved" section under the Disruptions tab for **12 hours** after the latest SERVICE_RESUMED alert was posted.

**Requirements for display:**

1. `is_resolved = true` - Thread must be marked resolved
2. `is_hidden = false` - Thread must not be hidden
3. `latestAlert.created_at` within 12 hours of current time (uses alert timestamp, not thread.resolved_at)
4. Thread must have `SERVICE_RESUMED` category (confirmed by Bluesky)
5. Not an RSZ alert (those don't have "resolved" state)

**Note:** Standalone SERVICE_RESUMED threads (without preceding DELAY/DISRUPTION) ARE shown. Bluesky posts these when service genuinely resumes, so they should be displayed.

**Store Configuration:**

The `threadsWithAlerts` store includes resolved threads (only filters out hidden):

```typescript
// src/lib/stores/alerts.ts
export const threadsWithAlerts = derived(
  [threads, alerts],
  ([$threads, $alerts]) => {
    return (
      $threads
        // Filter out hidden threads only - keep resolved for "Recently Resolved" section
        .filter((thread) => !thread.is_hidden)
        .map((thread): ThreadWithAlerts => {
          /* ... */
        })
    );
  }
);
```

**SQL Query includes `resolved_at`:**

```typescript
.select('thread_id, title, categories, affected_routes, is_resolved, is_hidden, resolved_at, created_at, updated_at')
```

**Frontend Filter:**

```typescript
// src/routes/alerts/+page.svelte
let recentlyResolved = $derived.by(() => {
  if (selectedCategory !== "disruptions") return [];
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

  return $threadsWithAlerts.filter((t) => {
    if (!t.is_resolved || t.is_hidden || !t.resolved_at) return false;

    // Use the latest alert's timestamp for the cutoff (matches what AlertCard displays)
    const latestAlertTime = t.latestAlert?.created_at
      ? new Date(t.latestAlert.created_at).getTime()
      : new Date(t.resolved_at).getTime();

    if (latestAlertTime < twelveHoursAgo) return false;

    const categories = (t.categories as string[]) || [];
    if (!categories.includes("SERVICE_RESUMED")) return false;
    if (isRSZAlert(t)) return false;

    // Show all SERVICE_RESUMED threads, including standalone ones
    // Bluesky posts them when service genuinely resumes
    return true;
  });
});
```

---

## Frontend Filtering

### Overview

**Implemented in:** `src/lib/stores/alerts.ts`

The frontend provides filtering capabilities for categorized alerts:

### Filter State

```typescript
// Mutually exclusive filters (only one active at a time)
export const activeFilters = writable<Set<string>>(new Set());

export function toggleFilter(category: string) {
  activeFilters.update((filters) => {
    const newFilters = new Set<string>();
    // If clicking already-active filter, clear all (show all alerts)
    // Otherwise, set only the clicked filter
    if (!filters.has(category)) {
      newFilters.add(category);
    }
    return newFilters;
  });
}
```

### Planned Alert Exclusion

Planned maintenance alerts are excluded from the main "All Alerts" tab:

```typescript
// Filter out planned alerts from main feed
export const threadsWithAlerts = derived(
  [threads, alerts, activeFilters],
  ([$threads, $alerts, $activeFilters]) => {
    // Build thread list excluding PLANNED_CLOSURE from main view
    return $threads.filter((thread) => {
      const threadAlerts = $alerts.filter((a) => a.thread_id === thread.id);
      const latestAlert = threadAlerts.find((a) => a.is_latest);

      // Exclude if primary category is PLANNED_CLOSURE
      if (latestAlert?.category === "PLANNED_CLOSURE") {
        return false;
      }

      // Apply active filters if any
      if ($activeFilters.size > 0) {
        const categories = extractCategories(latestAlert);
        return [...$activeFilters].some((f) => categories.includes(f));
      }

      return true;
    });
  }
);
```

### Category Extraction Helper

```typescript
function extractCategories(alert: Alert | undefined): string[] {
  if (!alert) return [];

  const categories = [alert.category];

  // Extract routes as pseudo-categories for filtering
  if (alert.affected_routes?.length) {
    categories.push(...alert.affected_routes);
  }

  return categories;
}
```

### Filter UI

Filters are displayed as chips in `FilterChips.svelte`:

- Click a chip → Show only alerts in that category
- Click active chip → Clear filter (show all)
- Categories come from `ALERT_CATEGORIES` in poll-alerts Edge Function

### Subway Line Status Calculation

**Implemented in:** `src/routes/alerts-v3/+page.svelte` and `src/routes/alerts/+page.svelte`

The subway status cards ("Normal service", "Delay", "Disruption", "Scheduled") are calculated based on MAJOR severity alerts only:

```typescript
// Get ALL active alerts for a specific subway line
// EXCLUDES: RSZ (MINOR) and ACCESSIBILITY alerts - these don't affect line status
function getAllAlertsForLine(lineId: string): ThreadWithAlerts[] {
  const active = activeAlerts();
  return active.filter((thread) => {
    const routes = getThreadRoutes(thread);
    if (!routes.some((r) => routeMatchesLine(r, lineId))) return false;

    // Only MAJOR alerts affect line status
    const categories = thread.latestAlert?.categories || [];
    const effect = thread.latestAlert?.effect || "";
    const headerText = thread.latestAlert?.header_text || "";

    const severity = getSeverityCategory(categories, effect, headerText);
    return severity === "MAJOR";
  });
}
```

**Why RSZ and ACCESSIBILITY are excluded:**

1. **RSZ (Reduced Speed Zone)** - "Slower than usual" alerts are informational, not disruptions

   - Trains still running, just slower
   - Users should see these in "Slow Zones" section, not affect status cards

2. **ACCESSIBILITY** - Elevator/escalator issues are separate concern
   - Displayed in dedicated "Accessibility" section
   - Don't indicate service disruptions for the line

**Status determination:**

| Condition                                   | Status       | Display             |
| ------------------------------------------- | ------------ | ------------------- |
| No MAJOR alerts, no active maintenance      | `ok`         | "Normal service" ✅ |
| Has alert with DELAY effect                 | `delay`      | "Delay" 🕐          |
| Has alert with DISRUPTION/NO_SERVICE effect | `disruption` | "Disruption" ⛔     |
| Has active scheduled maintenance only       | `scheduled`  | "Scheduled" 📅      |

### Slow Zones Tab Filtering (v3.18+)

**Implemented in:** `src/routes/alerts/+page.svelte`

The Slow Zones tab (`?category=slowzones`) displays **ONLY RSZ alerts**, NOT regular DELAY alerts:

```typescript
// Slow Zones tab shows ONLY RSZ alerts via RSZAlertCard - no regular alerts
let activeAlerts = $derived.by(() => {
  if (selectedCategory === "delays") {
    return []; // RSZ alerts rendered separately via RSZAlertCard
  }
  // ... normal filtering for other categories
});

// RSZ alerts displayed via dedicated component
let rszAlerts = $derived.by(() => {
  if (selectedCategory !== "delays") return [];
  return $threadsWithAlerts.filter(
    (t) => !t.is_resolved && !t.is_hidden && isRSZAlert(t)
  );
});
```

**Why this separation is critical:**

1. **DELAY alerts have MINOR severity** - `getSeverityCategory(['DELAY'], 'DISRUPTION', ...)` returns `'MINOR'`
2. **RSZ alerts also have MINOR severity** - They're classified as informational, not disruptive
3. **Without separation:** Regular DELAY alerts (e.g., "medical emergency at Osgoode") would appear in Slow Zones tab
4. **With separation:** Only true RSZ alerts ("slower than usual between X and Y") appear in Slow Zones tab

**RSZ Detection (`isRSZAlert` helper):**

```typescript
function isRSZAlert(thread: ThreadWithAlerts): boolean {
  const alert = thread.latestAlert;
  if (!alert) return false;

  // Primary: TTC API RSZ alerts have alert_id starting with "ttc-rsz-"
  if (alert.alert_id?.toLowerCase().startsWith("ttc-rsz-")) return true;

  // Secondary: Bluesky-sourced RSZ detected by text patterns
  const headerText = (alert.header_text || "").toLowerCase();
  return (
    headerText.includes("slower than usual") ||
    headerText.includes("reduced speed") ||
    headerText.includes("move slower") ||
    headerText.includes("running slower") ||
    headerText.includes("slow zone")
  );
}
```

**Category Counts:**

The pill badge count for "Slow Zones" shows only RSZ alerts, not all MINOR alerts:

```typescript
let categoryCounts = $derived.by(() => {
  const active = $threadsWithAlerts.filter(
    (t) => !t.is_resolved && !t.is_hidden
  );
  return {
    // ... other counts
    delays: active
      .filter((t) => isRSZAlert(t))
      .reduce((total, thread) => {
        return total + (thread.alerts?.length || 0);
      }, 0),
  };
});
```

---

## Database Schema

### Table: `alert_cache`

Stores all alerts from Bluesky with threading and categorization metadata.

```sql
CREATE TABLE alert_cache (
  id SERIAL PRIMARY KEY,
  alert_id TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL,
  category TEXT,                        -- Primary category
  affected_routes TEXT[],               -- Array of route names
  thread_id UUID REFERENCES incident_threads(id),
  is_latest BOOLEAN DEFAULT true,       -- Latest in thread?
  bluesky_uri TEXT,                     -- AT Protocol URI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ                -- When indexed by Bluesky
);

CREATE INDEX idx_alert_cache_thread ON alert_cache(thread_id);
CREATE INDEX idx_alert_cache_category ON alert_cache(category);
CREATE INDEX idx_alert_cache_latest ON alert_cache(is_latest);
```

### Table: `incident_threads`

Groups related alerts into incident threads.

```sql
CREATE TABLE incident_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                  -- Latest alert text (for similarity)
  affected_routes TEXT[],               -- Combined routes from all alerts
  is_resolved BOOLEAN DEFAULT false,    -- Closed by SERVICE_RESUMED?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_resolved ON incident_threads(is_resolved);
CREATE INDEX idx_threads_updated ON incident_threads(updated_at);
```

### Table: `planned_maintenance`

Stores planned subway closures scraped from TTC website via `scrape-maintenance` Edge Function.

```sql
CREATE TABLE planned_maintenance (
  id SERIAL PRIMARY KEY,
  maintenance_id TEXT NOT NULL UNIQUE,  -- TTC's unique ID for the closure
  subway_line TEXT NOT NULL,            -- "Line 1 (Yonge - University)", etc.
  affected_stations TEXT NOT NULL,      -- "Finch to Eglinton stations"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,                      -- "23:00:00" for nightly closures, NULL for full-day
  end_time TIME,
  reason TEXT,                          -- "Station work", "Track work", etc.
  description TEXT,                     -- Full description text
  details_url TEXT,                     -- Link to TTC page
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE        -- Deactivated when past or removed from API
);
```

**Closure Type Detection:**

| Pattern                          | Type              | Badge                   |
| -------------------------------- | ----------------- | ----------------------- |
| `start_time: "23:00:00"` (10PM+) | Nightly           | "Nightly Early Closure" |
| `start_time: null` + Sat-Sun     | Weekend           | "Weekend Closure"       |
| Everything else                  | Generic scheduled | "Scheduled Closure"     |

---

## Edge Functions

### `poll-alerts` (v113)

**Trigger:** Cron schedule (every 2 minutes)  
**Purpose:** Fetch, categorize, and thread alerts; manage thread lifecycle

**Flow:**

1. **STEP 1:** Fetch TTC API (`/api/alerts/live-alerts`)
   - Get authoritative list of active routes, RSZ alerts, and elevator alerts
   - **Effect Recognition (v116+):** Now includes ALL non-RSZ, non-ServiceResumed alerts as active disruptions
     - Previous bug: Only recognized effects like `NO_SERVICE`, `SIGNIFICANT_DELAYS`, `DETOUR`
     - Fix: Effects like `"Subway Closure - Early Access"` (nightly closures) now properly recognized
     - Any TTC API route alert (except RSZ and Service Resumed) is considered an active disruption
2. **STEP 2:** Hide threads no longer in TTC API
   - Excludes RSZ and ACCESSIBILITY (they have their own lifecycle)
3. **STEP 2b:** Resolve threads with matching SERVICE_RESUMED alerts
   - Matches by route + 10% text similarity
   - **CRITICAL:** Only matches if SERVICE_RESUMED was created AFTER the thread (v104+)
   - Prevents old "service resumed" alerts from resolving new incidents
   - Skips RSZ, ACCESSIBILITY, SERVICE_RESUMED threads
4. **STEP 3:** Unhide threads if routes return to TTC API
   - Re-activates threads if alert comes back
5. **STEP 4:** Fetch Bluesky posts for context/history
   - Extract routes, categorize, thread matching
   - **LAYER 1 (v105):** Skips RSZ/ACCESSIBILITY by categories array
   - **LAYER 2 (v108):** Skips threads by thread_id pattern (`rsz`, `elev`, `accessibility`)
   - Never resolves RSZ/ACCESSIBILITY threads even if matched
   - Create new threads via `find_or_create_thread()` if no match found
6. **STEP 5:** Process RSZ alerts from TTC API
   - Normalize route format ("1" → "Line 1")
   - Uses `generateRszThreadId()` function (v112+) for consistent thread IDs
   - Create/update RSZ threads and alerts
   - **Thread ID Pattern:** `thread-rsz-line{line}-{start}-{end}` (e.g., `thread-rsz-line1-eglinton-davisville`)
   - **STEP 6e (v112+):** Auto-repair orphaned RSZ alerts with null `thread_id`
7. **STEP 6:** Process elevator alerts from TTC API

   - Extract station name from header
   - **Each elevator gets its own thread** via centralized `generateElevatorThreadId()` function (v111+)
   - **De-duplicates by elevatorCode** - TTC API sometimes returns duplicate alerts for same elevator
   - Multiple elevators at same station appear as separate alerts
   - No threading between different elevators at same station
   - **Text cleanup (v110+):** Strips "-TTC" suffix and technical metadata from descriptions

   **Thread ID Patterns (v111+):**

   - **Standard TTC elevators:** `thread-elev-{elevatorCode}` (e.g., `thread-elev-57P2L`)
   - **Non-TTC elevators:** `thread-elev-nonttc-{station}-{detail}` (e.g., `thread-elev-nonttc-tmu-10dundassteentrance`)

   **Non-TTC Elevator Handling:**
   Non-TTC elevators (at TMU, Bloor-Yonge PATH, etc.) share `elevatorCode: "Non-TTC"` in the API.
   To prevent threading conflicts, detail is extracted from headerText:

   ```typescript
   // Extract detail from "between X and Y" pattern
   const detailMatch = headerText.match(/between\s+(.+?)\s+and\s+/i);
   const detail = detailMatch
     ? detailMatch[1]
         .replace(/[^a-zA-Z0-9]/g, "")
         .toLowerCase()
         .substring(0, 20)
     : "";
   ```

8. **STEP 6b:** Auto-resolve elevator threads

   - Uses same `generateElevatorThreadId()` function to match active suffixes
   - Builds `activeElevatorSuffixes` set from current TTC API alerts
   - Resolves threads whose suffix is no longer in the active set

9. **STEP 7:** Deduplicate similar threads (v113+)
   - Finds threads with identical `affected_routes` and high text similarity (>70%)
   - Hides duplicate threads (newer ones get hidden)
   - **EXCLUDES RSZ threads** - RSZ alerts share same `affected_routes` (e.g., `["Line 1"]`) but are unique zones
   - RSZ threads are identified by `thread_id LIKE 'thread-rsz%'`

### `find_or_create_thread` Database Function

**Purpose:** Find or create incident thread with thread_hash collision prevention

**Critical RSZ/ACCESSIBILITY Protection:**

The function now excludes protected threads from route-based matching to prevent DELAY/DISRUPTION alerts from being incorrectly attached:

```sql
-- Route-based matching stage EXCLUDES protected threads
WHERE t.is_resolved = false
  AND t.is_hidden = false
  -- LAYER 1: thread_id pattern check
  AND t.thread_id NOT LIKE '%rsz%'
  AND t.thread_id NOT LIKE '%elev%'
  AND t.thread_id NOT LIKE '%accessibility%'
  -- LAYER 2: categories check
  AND NOT (t.categories ? 'RSZ')
  AND NOT (t.categories ? 'ACCESSIBILITY')
```

- Legacy threads: fall back to station name matching
- Uses `.filter('categories', 'cs', '["ACCESSIBILITY"]')` for JSONB containment

9. **STEP 6c:** RSZ thread lifecycle management (v105+, **v114: individual zone tracking**)
   - **v114 change:** Now tracks individual RSZ zones by `thread_id`, not just by LINE
   - Builds `activeRszThreadIds` set from TTC API using `generateRszThreadId()` for each alert
   - **STEP 6c-repair:** Un-resolve RSZ threads if their `thread_id` is in `activeRszThreadIds`
   - **STEP 6c-resolve:** Hide RSZ threads if their `thread_id` is NOT in `activeRszThreadIds`
   - **STEP 6c-fix-title (v106+):** Fix RSZ thread titles if they have SERVICE_RESUMED text
   - Skips `legacy` threads (they don't have consistent thread IDs)
   - Uses `.filter('categories', 'cs', '["RSZ"]')` for JSONB containment
10. **STEP 6d:** Auto-repair orphaned elevator alerts (v107+)
    - Scans for alerts with `thread_id IS NULL` and `effect = ACCESSIBILITY_ISSUE`
    - Uses centralized `generateElevatorThreadId()` function for consistent thread ID generation
    - Extracts elevator code from alert_id (e.g., `ttc-elev-15S2L-...` → `15S2L`) or generates from headerText
    - Creates missing thread if needed (respects Non-TTC patterns)
    - Links alert to thread with `is_latest = true`
11. **STEP 6e:** Auto-repair orphaned RSZ alerts (v112+)
    - Scans for alerts with `thread_id IS NULL` and `effect = RSZ`
    - Uses centralized `generateRszThreadId()` function for consistent thread ID generation
    - Pattern: `ttc-rsz-{line}-{start}-{end}` → `thread-rsz-line{line}-{start}-{end}`
    - Creates missing thread if needed, unhides if hidden
    - Links alert to thread with `is_latest = true`
    - Skips legacy format alerts (prevent creating more legacy threads)
12. **STEP 7:** Merge duplicate threads only
    - Groups visible threads by affected_routes + categories
    - Keeps newest, hides older duplicates
    - **No longer unhides hidden threads** (fixed in v110)

---

## Elevator Thread ID Generation (v111+)

### Centralized Function: `generateElevatorThreadId()`

**Added in v111** to ensure consistent thread ID generation across all elevator-related steps.

```typescript
interface ElevatorInfo {
  elevatorCode: string | null | undefined;
  headerText: string;
  alertId?: string;
}

function generateElevatorThreadId(info: ElevatorInfo): {
  threadId: string;
  suffix: string;
} {
  const { elevatorCode, headerText, alertId } = info;
  const stationMatch = headerText.match(/^([^:]+):/);
  const station = stationMatch ? stationMatch[1].trim() : "Unknown";
  const cleanStation = station.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  // Standard TTC elevators - use elevator code directly
  if (elevatorCode && elevatorCode !== "Non-TTC") {
    return { threadId: `thread-elev-${elevatorCode}`, suffix: elevatorCode };
  }

  // Non-TTC elevators - use station + detail from "between X and Y" pattern
  const detailMatch = headerText.match(/between\s+(.+?)\s+and\s+/i);
  const detail = detailMatch
    ? detailMatch[1]
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .substring(0, 20)
    : "";
  const suffix = `nonttc-${cleanStation}-${
    detail || (alertId ? alertId.slice(-8) : "unknown")
  }`;
  return { threadId: `thread-elev-${suffix}`, suffix: suffix };
}
```

### Thread ID Patterns

| Elevator Type | Example headerText                                                                   | Thread ID                                            |
| ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Standard TTC  | "Bessarion: Elevator out of service..."                                              | `thread-elev-57P2L`                                  |
| Non-TTC       | "TMU: Elevator out of service between 10 Dundas St E entrance and..."                | `thread-elev-nonttc-tmu-10dundassteentrance`         |
| Non-TTC       | "Bloor-Yonge: Elevator out of service between Bloor St E south side entrance and..." | `thread-elev-nonttc-blooryonge-bloorstesouthsideent` |

### Why This Fix Was Needed

**Problem:** Non-TTC elevators (TMU, Bloor-Yonge PATH, etc.) share `elevatorCode: "Non-TTC"` in the TTC API. Previously, this caused:

1. **Threading conflicts** - Multiple Non-TTC elevators shared `thread-elev-Non` thread ID
2. **Incorrect resolution** - When one Non-TTC elevator was fixed, all were marked resolved
3. **Pattern mismatch** - STEP 6 created threads with different patterns than STEP 6b expected

**Previous Bug:** The regex `/between\s+([^and]+)/i` used `[^and]` which is a **character class** (any char except 'a', 'n', 'd'), not a word boundary. For "between 10 Dundas...", it captured only "10 " because 'D' contains 'd'.

**Fix (v111):** Non-greedy capture `/between\s+(.+?)\s+and\s+/i` extracts full detail text up to " and ".

### Consistency Guarantee

The centralized function is now used in **three locations**:

1. **STEP 6 (processElevatorAlerts)** - When creating new elevator alerts/threads
2. **STEP 6b** - When building `activeElevatorSuffixes` set for resolution checking
3. **STEP 6d** - When repairing orphaned elevator alerts

This ensures thread IDs are always generated consistently, preventing mismatches between creation and resolution.

---

## RSZ Thread ID Generation (v112+)

### Centralized Function: `generateRszThreadId()`

**Added in v112** to ensure consistent thread ID generation across RSZ-related steps.

```typescript
function generateRszThreadId(alertId: string): {
  threadId: string;
  lineNumber: string;
  location: string;
} {
  // Pattern: ttc-rsz-{line}-{start}-{end}
  // Example: ttc-rsz-1-eglinton-davisville -> thread-rsz-line1-eglinton-davisville

  const parts = alertId.replace(/^ttc-rsz-/i, "").split("-");
  const lineNumber = parts[0]; // "1" or "2"
  const location = parts.slice(1).join("-"); // "eglinton-davisville"

  // Check for legacy format (e.g., "line1yongeuniversitysubwaytrainswillmoves")
  if (location.toLowerCase().startsWith("line")) {
    return {
      threadId: `thread-rsz-legacy-${lineNumber}`,
      lineNumber,
      location: "legacy",
    };
  }

  return {
    threadId: `thread-rsz-line${lineNumber}-${location}`,
    lineNumber,
    location,
  };
}
```

### Thread ID Patterns

| Alert ID                            | Thread ID                              |
| ----------------------------------- | -------------------------------------- |
| `ttc-rsz-1-eglinton-davisville`     | `thread-rsz-line1-eglinton-davisville` |
| `ttc-rsz-2-chester-broadview`       | `thread-rsz-line2-chester-broadview`   |
| `ttc-rsz-1-line1yongeuniversity...` | `thread-rsz-legacy-1` (legacy format)  |

### Why This Fix Was Needed

**Problem:** RSZ alerts were created with `thread_id = null` (orphaned) because:

1. The old `find_or_create_thread` RPC generated generic hash-based thread IDs
2. Thread creation sometimes failed silently after alert insert
3. Frontend check for `ttc-RSZ-` was case-sensitive (alerts use lowercase `ttc-rsz-`)

**Fixes (v112):**

1. `generateRszThreadId()` creates location-based thread IDs from alert_id pattern
2. STEP 6e auto-repairs orphaned RSZ alerts on every poll
3. Frontend `isRSZAlert()` now uses case-insensitive `.toLowerCase().startsWith('ttc-rsz-')`

### Consistency Guarantee

The centralized function is now used in **two locations**:

1. **STEP 5 (processRszAlerts)** - When creating new RSZ alerts/threads
2. **STEP 6e** - When repairing orphaned RSZ alerts

---

## Self-Healing System (v107+)

The alert system is **self-healing** - even if processing errors occur, automatic repair mechanisms fix issues on the next poll cycle (within 1 minute).

### Backend Auto-Repair Steps

| Step              | Protection                      | Runs           | Description                                                |
| ----------------- | ------------------------------- | -------------- | ---------------------------------------------------------- |
| STEP 4            | LAYER 1: Category check         | Every poll     | Skip RSZ/ACCESSIBILITY categories during matching          |
| STEP 4            | **LAYER 2: Thread ID pattern**  | Every poll     | Skip threads with `rsz`, `elev`, `accessibility` in ID     |
| STEP 4            | Never resolve protected threads | Every poll     | Block SERVICE_RESUMED from resolving RSZ/ACCESSIBILITY     |
| STEP 6c-repair    | Un-resolve RSZ                  | Every poll     | Restore threads if zone is in TTC API `activeRszThreadIds` |
| STEP 6c-resolve   | Hide stale RSZ                  | Every poll     | Hide threads if zone NOT in TTC API `activeRszThreadIds`   |
| STEP 6c-fix-title | Fix RSZ titles                  | Every poll     | Replace "resumed" text with actual RSZ alert               |
| **STEP 6d**       | **Repair orphaned elevators**   | **Every poll** | **Create threads for alerts without thread_id**            |
| **STEP 6e**       | **Repair orphaned RSZ**         | **Every poll** | **Create threads for RSZ alerts without thread_id**        |

### Thread ID Pattern Protection (v108+)

As a belt-and-suspenders defense, the code now also checks `thread_id` patterns:

```typescript
// LAYER 1: Category-based skip
if (
  threadCategories.includes("RSZ") ||
  threadCategories.includes("ACCESSIBILITY")
) {
  continue;
}

// LAYER 2: Thread ID pattern skip (prevents issues if categories malformed)
if (
  threadId.includes("rsz") ||
  threadId.includes("elev") ||
  threadId.includes("accessibility")
) {
  console.log(`Skipping protected thread ${threadId} during Bluesky matching`);
  continue;
}
```

This ensures that even if the categories array is somehow corrupted, the thread ID patterns will still protect RSZ and elevator threads from incorrect matching.

### Frontend Defense-in-Depth

| Protection                        | Location                         | Purpose                                                 |
| --------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `isResolved()` category check     | alerts-v3, routes, MyRouteAlerts | RSZ/ACCESSIBILITY only trust `is_resolved` flag         |
| `latestAlert` prefers `is_latest` | alerts.ts store                  | Ensures correct alert is displayed, not SERVICE_RESUMED |

### Monitoring

The poll-alerts response includes repair counters:

```json
{
  "repairedRszThreads": 0, // RSZ threads un-resolved
  "repairedElevators": 0 // Orphaned elevators fixed
}
```

If these numbers are consistently > 0, it indicates an upstream issue to investigate.

### Before vs After

**Before (broken):**

```
Alert created → Thread creation fails → Alert orphaned → Never displayed
SERVICE_RESUMED matches RSZ → Thread resolved → RSZ hidden
```

**After (self-healing):**

```
Alert created → Thread creation fails → STEP 6d detects → Creates thread → Alert displayed ✅
SERVICE_RESUMED matches RSZ → STEP 4 skips RSZ → RSZ protected ✅
SERVICE_RESUMED somehow resolves RSZ → STEP 6c-repair detects → Un-resolves → RSZ displayed ✅
```

---

**RSZ/ACCESSIBILITY Thread Protection (v107+):**

RSZ and ACCESSIBILITY threads have a **6-layer protection** system ensuring they're only managed by TTC API:

**RSZ Protection (4 layers):**

1. **Layer 1 - Skip during Bluesky matching (STEP 4 loop):**

   - When iterating Bluesky posts to find matching threads, skip RSZ/ACCESSIBILITY threads entirely
   - These threads should only be managed by TTC API, not Bluesky

2. **Layer 2 - Never resolve via SERVICE_RESUMED (STEP 4 resolve):**

   - Even if a Bluesky SERVICE_RESUMED post matches by route, do NOT resolve RSZ/ACCESSIBILITY threads
   - Log warning and skip resolution

3. **Layer 3 - Auto-repair (STEP 6c-repair):**

   - If RSZ threads are incorrectly resolved, check TTC API for active RSZ alerts
   - If TTC API has RSZ alerts for that line, un-resolve the thread
   - Also fixes `is_latest` flag and thread title to point to correct RSZ alert

4. **Layer 4 - Title self-healing (STEP 6c-fix-title, v106+):**
   - Check active RSZ threads for SERVICE_RESUMED text in title
   - If found, reset `is_latest` flags and update title to match actual RSZ alert
   - Prevents frontend `isResolved()` false positives

**Elevator Protection (2 layers):**

5. **Layer 5 - Bluesky skip (same as RSZ, STEP 4):**

   - Skip ACCESSIBILITY threads during Bluesky matching
   - Elevators only resolve via TTC API (STEP 6b)

6. **Layer 6 - Orphan repair (STEP 6d, v107+):**
   - Detect alerts with `thread_id IS NULL` and `effect = ACCESSIBILITY_ISSUE`
   - Extract elevator code from alert_id
   - Create missing thread if needed
   - Link alert to thread with `is_latest = true`

**Why is_latest and title matter:**
The frontend `isResolved()` function checks the **latest alert text** (not just `is_resolved` flag) for "resumed" keywords. If a SERVICE_RESUMED alert gets `is_latest: true`, the thread will appear resolved in the UI even if `is_resolved: false`.

**Frontend Defense (additional protection):**

- `isResolved()` in alerts-v3, routes, MyRouteAlerts checks categories first
- RSZ/ACCESSIBILITY threads **only** trust the `is_resolved` flag, never text matching
- Store `latestAlert` prefers `is_latest: true` alert over timestamp-based selection

**False Positive Prevention:**

- `nonRoutePatterns` filter removes "Bay X", "Platform X", "Track X" before route extraction
- Line regex only matches Lines 1-4: `/\bLine\s+(1|2|3|4)\b/gi`
- Exact route number matching prevents 46 ≠ 996 confusion

**TTC API Data Quality Issues:**

- **Duplicate elevator alerts:** TTC API sometimes returns multiple alerts for the same elevator (same `elevatorCode`).  
  Our system de-duplicates by `elevatorCode`, so you may see fewer alerts in the app than in the raw API.
- **Non-TTC elevator codes:** Some elevators (TMU, Bloor-Yonge) share the `Non-TTC` code.  
  We handle these as separate threads based on station name.

### `scrape-maintenance` (v2)

**Trigger:** Cron schedule (`scrape-maintenance-6hr` - every 6 hours at 0, 6, 12, 18 UTC)  
**Purpose:** Scrape planned subway closures from TTC website

**TTC API Endpoint:**

```
https://www.ttc.ca/sxa/search/results/?s={SCOPE_ID}&itemid={ITEM_ID}&sig=&v={VARIANT_ID}&p=10&e=0&o=SortDatesAscending
```

**API Parameters:**

- SCOPE_ID: `{99D7699F-DB47-4BB1-8946-77561CE7B320}`
- ITEM_ID: `{72CC555F-9128-4581-AD12-3D04AB1C87BA}` (subway-service)
- VARIANT_ID: `{23DC07D4-6BAC-4B98-A9CC-07606C5B1322}`

**Flow:**

1. Fetch TTC Sitecore search API for subway service advisories
2. Parse HTML response to extract:
   - Subway line (Line 1, Line 2, etc.)
   - Affected stations (e.g., "Finch to Eglinton")
   - Date range (start_date, end_date)
   - Start time (if specified, e.g., "11 p.m.")
   - Details URL
3. Upsert into `planned_maintenance` table (keyed by `maintenance_id`)
4. Deactivate items no longer in API or past their end date

**Closure Type Detection (Frontend):**

The `ClosuresView.svelte` component detects closure type based on the data:

| Closure Type        | Badge Label             | Color          | Detection Logic                   |
| ------------------- | ----------------------- | -------------- | --------------------------------- |
| `NIGHTLY_CLOSURE`   | "Nightly Early Closure" | Blue           | `start_time` >= 22:00 (10 PM)     |
| `WEEKEND_CLOSURE`   | "Weekend Closure"       | Purple/Magenta | No `start_time` AND spans Sat-Sun |
| `SCHEDULED_CLOSURE` | "Scheduled Closure"     | Purple         | Default fallback                  |

```typescript
// ClosuresView.svelte - getClosureType()
function getClosureType(maintenance: PlannedMaintenance): string {
  const startHour = parseTimeHour(maintenance.start_time);

  // Nightly: starts at 10 PM or later
  if (startHour !== null && startHour >= 22) return "NIGHTLY_CLOSURE";

  // Weekend: no start time + spans Sat-Sun
  if (!maintenance.start_time) {
    const startDay = parseLocalDate(maintenance.start_date).getDay();
    const endDay = parseLocalDate(maintenance.end_date).getDay();
    if (
      (startDay === 6 && endDay === 0) || // Sat-Sun
      (startDay === 5 && endDay === 0) || // Fri-Sun
      (startDay === 6 && endDay === 1)
    ) {
      // Sat-Mon
      return "WEEKEND_CLOSURE";
    }
  }

  return "SCHEDULED_CLOSURE";
}
```

---

### `verify-elevators` (v1)

**Trigger:** Cron schedule (`verify-elevators-15min` - every 15 minutes at :00, :15, :30, :45)  
**Purpose:** Verify elevator data integrity against TTC API

**Flow:**

1. Fetch current elevator alerts from TTC API (`accessibility` array)
2. Query database for elevator threads (category = `ACCESSIBILITY`)
3. Compare and auto-correct discrepancies:
   - **Create missing:** If elevator in TTC API but not in database
   - **Unhide hidden:** If elevator in TTC API but thread is `is_hidden = true`
   - **Hide stale:** If thread in database but elevator no longer in TTC API

**Response:**

```json
{
  "success": true,
  "ttcApiCount": 6,
  "databaseCount": 6,
  "corrections": { "created": 0, "unhidden": 0, "hidden": 0 },
  "details": {
    /* per-elevator breakdown */
  }
}
```

**Thread ID Generation:** Uses same `generateElevatorThreadId()` as `poll-alerts` for consistency.

---

### `verify-rsz` (v1)

**Trigger:** Cron schedule (`verify-rsz-15min` - every 15 minutes at :07, :22, :37, :52)  
**Purpose:** Verify RSZ data integrity against TTC API/website

**Flow:**

1. Fetch RSZ alerts from TTC API (routes with `effectDesc = "Reduced Speed Zone"`)
2. Query database for RSZ threads (category = `RSZ`)
3. Compare and auto-correct discrepancies:
   - **Create missing:** If RSZ zone in TTC API but not in database
   - **Unhide hidden:** If RSZ zone in TTC API but thread is `is_hidden = true`
   - **Hide stale:** If thread in database but zone no longer in TTC API

**Response:**

```json
{
  "success": true,
  "ttcApiCount": 11,
  "databaseCount": 11,
  "corrections": { "created": 0, "unhidden": 0, "hidden": 0 },
  "details": {
    /* per-zone breakdown */
  }
}
```

**Thread ID Generation:** Uses same `generateRszThreadId()` as `poll-alerts` for consistency.

---

### `scrape-rsz` (v4)

**Trigger:** Cron schedule (`scrape-rsz-30min` - every 30 minutes)  
**Purpose:** Alternative RSZ data source from TTC website

**Data Source:** `https://www.ttc.ca/riding-the-ttc/Updates/Reduced-Speed-Zones`

**Flow:**

1. Fetch TTC website HTML page
2. Parse HTML tables to extract:
   - Line (1 or 2)
   - Direction (Northbound, Southbound, etc.)
   - Location (stop start - stop end)
   - Defect length, distance, track %, reduced speed, normal speed
   - Reason, target removal date
3. Upsert threads and alerts to database

**Why Website Scraping:** The TTC website provides richer data than the API:

- Defect length
- Target removal date
- Reason for slow zone

**Hybrid Approach:** Used as backup/supplementary source alongside TTC API.

---

## Summary

This system provides:

✅ **Dual source (TTC API + Bluesky)** - TTC API is authority, Bluesky adds context  
✅ **Keyword-based categorization** - 6 categories with priority ordering  
✅ **Incident threading** - Jaccard similarity + exact route number matching  
✅ **Cross-route prevention** - Route 46 cannot match with 996, 39 cannot match with 939  
✅ **False positive prevention** - "Bay 2", "Platform 1" filtered from route extraction  
✅ **Smart SERVICE_RESUMED** - Lower threshold (10%) for route-matched alerts  
✅ **Auto-resolve disruptions** - SERVICE_RESUMED or route disappears from TTC API  
✅ **Auto-resolve elevators** - Station no longer in TTC API → elevator restored  
✅ **Auto-resolve RSZ** - Line no longer has RSZ in TTC API → resolved  
✅ **Mutually exclusive filters** - One category filter at a time  
✅ **Planned alert separation** - Maintenance excluded from main feed  
✅ **Realtime updates** - Supabase subscriptions push changes  
✅ **Observable** - Thread state visible in UI

**Architecture:**

```
TTC API + Bluesky → poll-alerts Edge Function → Supabase PostgreSQL
                                                     ↓
                                              Realtime subscriptions
                                                     ↓
                                              Svelte stores (alerts.ts)
                                                     ↓
                                              AlertCard.svelte / RSZAlertCard.svelte UI
```

---

## Capacity Planning

### Supabase Free Tier Limits

| Resource                      | Limit   | Period     |
| ----------------------------- | ------- | ---------- |
| **Egress (Data Transfer)**    | 5 GB    | Monthly    |
| **Database Size**             | 500 MB  | Total      |
| **Edge Function Invocations** | 500,000 | Monthly    |
| **Realtime Connections**      | 200     | Concurrent |
| **Realtime Messages**         | 2M      | Monthly    |

### Realtime-First Architecture (Current)

**How it works:**

- Initial page load fetches alerts once (~50 KB)
- Supabase Realtime pushes only new/changed alerts (~500 bytes each)
- No polling - updates arrive instantly
- Manual refresh button available if needed

**Data Transfer Per User Session:**

| Activity                  | Data Transfer |
| ------------------------- | ------------- |
| Initial page load         | ~50 KB        |
| Per new alert (pushed)    | ~500 bytes    |
| 10-min session (2 alerts) | ~51 KB        |
| 1-hour session (5 alerts) | ~52.5 KB      |

**Comparison with Polling (old approach):**

| Metric             | Polling (old) | Realtime (current) | Savings |
| ------------------ | ------------- | ------------------ | ------- |
| 10-min session     | ~115 KB       | ~51 KB             | **56%** |
| 1-hour session     | ~350 KB       | ~52.5 KB           | **85%** |
| Data per new alert | 2.5 KB poll   | 0.5 KB push        | **80%** |

### Monthly User Capacity

| User Type             | Sessions/Month | Max Users (Realtime) |
| --------------------- | -------------- | -------------------- |
| Casual (2x/week)      | 8              | **~12,500**          |
| Regular (daily)       | 30             | **~3,300**           |
| Power (3x/day)        | 90             | **~1,100**           |
| **Mixed (realistic)** | ~23 avg        | **~4,400**           |

### Realtime Message Usage

With ~50 alerts/day and estimated concurrent users:

```
50 alerts × 100 concurrent users = 5,000 messages/day
Monthly: 150,000 messages ✅ (well under 2M limit)
```

### Edge Function Usage

`poll-alerts` runs every 2 minutes:

```
30 days × 24 hours × 30/hour = 21,600 invocations/month
```

✅ Well under 500,000 limit

### Current Capacity Summary

| Resource               | Usage   | Limit | Status  |
| ---------------------- | ------- | ----- | ------- |
| Egress                 | ~1-2 GB | 5 GB  | ✅ Safe |
| Realtime Messages      | ~150K   | 2M    | ✅ Safe |
| Edge Invocations       | ~22K    | 500K  | ✅ Safe |
| Concurrent Connections | ~100    | 200   | ✅ Safe |

**Current safe capacity:** ~4,000 monthly active users on free tier

---

## Implementation Notes

### Supabase JS JSONB Queries in Edge Functions

**⚠️ Important:** The Supabase JS client `.contains()` method does not work correctly with JSONB array columns in Edge Functions. It fails with `"invalid input syntax for type json"`.

**❌ Broken:**

```typescript
// This does NOT work in edge functions
const { data } = await supabase
  .from("incident_threads")
  .select("*")
  .contains("categories", ["ACCESSIBILITY"]);
```

**✅ Working:**

```typescript
// Use .filter() with 'cs' (containment) operator instead
const { data } = await supabase
  .from("incident_threads")
  .select("*")
  .filter("categories", "cs", '["ACCESSIBILITY"]');
```

**Note:** The `cs` operator is the PostgREST abbreviation for containment (`@>` in PostgreSQL). The value must be a JSON string, not a JavaScript array.

---

## Version History

| Version | Date       | Changes                                                                                                                                          |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| v3.21   | 2026-01-11 | poll-alerts v116: Fix effect recognition - ALL non-RSZ, non-ServiceResumed alerts now recognized as disruptions (fixes "Subway Closure - Early Access" not appearing) |
| v3.20   | 2026-01-11 | Added verify-elevators v1, verify-rsz v1 verification functions; scrape-rsz v4 with pg_cron; poll-alerts v115 unhide elevator repair            |
| v3.19   | 2026-01-10 | poll-alerts v114: Individual RSZ zone tracking via `activeRszThreadIds` set; hide zones not in TTC API instead of checking entire lines          |
| v3.18   | 2026-01-10 | Frontend slow zones fix: `activeAlerts` returns `[]` for delays tab; `categoryCounts.delays` counts only `isRSZAlert()` threads                  |
| v3.16   | 2026-01-09 | poll-alerts v110: Strip "-TTC" suffix from elevator descriptions; Clean technical metadata from elevator alerts                                  |
| v3.15   | 2026-01-09 | Database function `find_or_create_thread` protection: exclude RSZ/ACCESSIBILITY threads from route-based matching                                |
| v3.14   | 2026-01-09 | Frontend: `getAllAlertsForLine()` now excludes MINOR (RSZ) and ACCESSIBILITY alerts from subway status calculation                               |
| v3.13   | 2026-01-09 | LAYER 2: Thread ID pattern protection (belt-and-suspenders) - skip threads containing 'rsz', 'elev', 'accessibility' in ID                       |
| v3.12   | 2026-01-09 | scrape-maintenance v3: Handle single-day closures (sa-effective-date fallback), TTC API duplicate documentation                                  |
| v3.11   | 2026-01-09 | Added STEP 6d: repair orphaned elevator alerts (alerts with thread_id = null); Frontend: prefer is_latest flag for latestAlert selection         |
| v3.10   | 2026-01-08 | Enhanced RSZ protection: auto-fix title/is_latest when SERVICE_RESUMED text detected in RSZ threads                                              |
| v3.9    | 2026-01-08 | Comprehensive RSZ/ACCESSIBILITY protection: skip during Bluesky matching, never resolve via SERVICE_RESUMED, auto-repair if incorrectly resolved |
| v3.8    | 2026-01-08 | STEP 2b: Only match SERVICE_RESUMED if created AFTER the thread (prevents false positives)                                                       |
| v3.7    | 2026-01-08 | Fixed JSONB queries (`.filter()` not `.contains()`), per-elevator threading                                                                      |
| v3.6    | 2026-01-07 | Fixed STEP 7 unhide bug, added elevator code extraction                                                                                          |

---

**Document End**
