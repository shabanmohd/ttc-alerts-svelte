# Alert Categorization and Threading System

**Version:** 12.1  
**Date:** June 19, 2025  
**Status:** ✅ Implemented and Active (poll-alerts v60 + Bluesky reply threading + TTC API dual-use + RSZ exclusive from TTC API + Subway route deduplication + Orphaned SERVICE_RESUMED prevention + Simplified scheduled maintenance view + Hidden stale alerts + SiteWide alerts for Facilities category)  
**Architecture:** Svelte 5 + Supabase Edge Functions + Cloudflare Pages

---

## 📚 Related Documentation

| Document                                         | Purpose                                    |
| ------------------------------------------------ | ------------------------------------------ |
| [APP_IMPLEMENTATION.md](APP_IMPLEMENTATION.md)   | File inventory, Edge Function locations    |
| [TTC-ROUTE-CONFLICTS.md](TTC-ROUTE-CONFLICTS.md) | Route number conflicts affecting threading |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md)           | Edge Function security review              |

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Alert Sources](#alert-sources)
4. [Source Prioritization](#source-prioritization)
5. [Multi-Category System](#multi-category-system)
6. [Incident Threading](#incident-threading)
7. [Bluesky Reply Threading](#bluesky-reply-threading)
8. [Frontend Filtering](#frontend-filtering)
9. [Database Schema](#database-schema)
10. [Edge Functions](#edge-functions)
11. [Testing Strategy](#testing-strategy)
12. [Monitoring and Tuning](#monitoring-and-tuning)

---

## Overview

This document describes the alert categorization and threading system designed to:

1. **Bluesky integration** - Primary source from @ttcalerts.bsky.social
2. **TTC Live API secondary source** - Fills gaps when Bluesky hasn't posted yet (v39)
3. **TTC API is authoritative for RSZ alerts** - Skip redundant BlueSky speed reduction posts (v46)
4. **Bluesky reply threading** - Priority to reply chain relationships (v31)
5. **Multi-category tagging** - Alerts can match multiple non-exclusive categories
6. **Effect-based categorization** - Focus on service impact, not cause
7. **Incident threading** - Group related updates using reply chains + similarity + route matching
8. **Frontend filtering** - Mutually exclusive category filters in UI
9. **Planned alert separation** - Maintenance/scheduled alerts excluded from main feed
10. **TTC API cross-check** - Official TTC Live API used for resolution verification

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Bluesky API    │────▶│  poll-alerts (v50)   │────▶│  Supabase DB    │
│  @ttcalerts     │     │  (Edge Function)     │     │  alert_cache    │
│  (PRIMARY)      │     └──────────────────────┘     │  incident_      │
└─────────────────┘              │   │               │  threads        │
                                 │   │               └────────┬────────┘
┌─────────────────┐              │   │                        │
│  TTC Live API   │──────────────┘   │                        │
│  alerts.ttc.ca  │     (SECONDARY)  │                        │
│  (non-planned)  │                  │                        │
└─────────────────┘                  ▼                        │
                            ┌──────────────────┐              │
                            │  Cross-Check &   │              │
                            │  Resolution      │              │
                            └──────────────────┘              │
                                                              │
                            ┌──────────────────────┐          │
                            │  Svelte Frontend     │◀─────────┘
                            │  alerts.ts store     │
                            │  + Realtime sub      │
                            └──────────────────────┘
```

**Stack:**

- **Frontend:** Svelte 5 + TypeScript + Tailwind + shadcn-svelte
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **Hosting:** Cloudflare Pages
- **Primary Data Source:** Bluesky AT Protocol (public API)
- **Secondary Data Source:** TTC Live API (v39+)
- **Verification:** TTC Live API (alerts.ttc.ca)

---

## Alert Sources

### Current Implementation

**Primary Source: Bluesky**

- Official TTC account: [@ttcalerts.bsky.social](https://bsky.app/profile/ttcalerts.bsky.social)
- **API:** Bluesky AT Protocol public API
- **Endpoint:** `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`
- **Polling:** Edge function fetches last 50 posts per invocation
- **Post Sorting:** Posts sorted by `createdAt` ascending (oldest first) before processing (v49)
- **Deduplication:** Uses `alert_id` (generated from bluesky URI post_id as `bsky-{post_id}`)
- **Reply Threading:** Extracts `reply.parent.uri` for thread chain detection (v31)
- **Status:** ✅ Enabled (primary source, always prioritized)

**Post Sorting Fix (v49):**

Bluesky API returns posts newest-first by default. This caused threading issues where SERVICE_RESUMED alerts were processed before their DELAY/DISRUPTION counterparts, creating orphan threads.

```typescript
// Sort posts oldest-first so DELAY creates thread before SERVICE_RESUMED
const posts = (bskyData.feed || []).sort(
  (a: any, b: any) =>
    new Date(a.post?.record?.createdAt || 0).getTime() -
    new Date(b.post?.record?.createdAt || 0).getTime()
);
```

**Secondary Source: TTC Live API (v39+)**

- **Endpoint:** `https://alerts.ttc.ca/api/alerts/live-alerts`
- **Purpose:** Fill gaps when @ttcalerts hasn't posted yet
- **Filtering:**
  - ✅ Include: `alertType !== "Planned"` (real-time incidents only)
  - ✅ Include: Effects `NO_SERVICE`, `REDUCED_SERVICE`, `DETOUR`, `SIGNIFICANT_DELAYS`, `ACCESSIBILITY_ISSUE`
  - ✅ Include: `alertType === "SiteWide"` for station entrance/facility closures (v61)
  - ❌ Exclude: `alertType === "Planned"` (scheduled closures, maintenance)
- **Deduplication:** Only creates alerts for routes NOT already covered by Bluesky
- **Alert ID Format:** `ttc-{route}-{effect}-{id}` (e.g., `ttc-1-SIGNIFICANT_DELAYS-54744`)
- **Status:** ✅ Enabled (v39+)

**TTC Live API (Cross-Check):**

- **Endpoint:** `https://alerts.ttc.ca/api/alerts/live-alerts`
- **Purpose:** Verify alert resolution status
- **Usage:** If a route is no longer in TTC API, thread is marked resolved
- **Status:** ✅ Enabled (v26+)

**GTFS-Realtime:** ⏸️ Disabled (all GTFS alerts also appear on Bluesky)

### Dual-Source Priority Rules (v51)

1. **Bluesky is always primary** - If a route has an active Bluesky thread, TTC API alerts for that route are skipped
2. **TTC API fills gaps** - Only creates alerts for routes without Bluesky coverage
3. **Planned alerts excluded** - TTC API planned/scheduled alerts are never imported (Bluesky handles these)
4. **Same threading logic** - TTC API alerts create/join threads using same rules as Bluesky
5. **TTC API is SOLE source for RSZ alerts** - ALL BlueSky speed reduction posts are filtered out (v48)
6. **Oldest-first processing** - Bluesky posts sorted by createdAt ascending to ensure DELAY threads exist before SERVICE_RESUMED (v49)
7. **Subway route deduplication** - Skip redundant "X Name" routes when "Line X" already extracted (v50)
8. **SERVICE_RESUMED orphan prevention** - SERVICE_RESUMED alerts only join existing threads; if no match found, alert is deleted (v51)

### SERVICE_RESUMED Orphan Prevention (v51)

**Problem:** SERVICE_RESUMED alerts occasionally created orphaned threads when no matching parent disruption thread was found. This resulted in confusing "service resumed" entries appearing without any associated disruption.

**Solution (v51):** SERVICE_RESUMED alerts can only **join** existing threads, never create new ones.

**Key Behaviors:**

1. **Extended lookback** - SERVICE_RESUMED searches 24h (instead of 12h) for matching parent threads
2. **No orphan creation** - If no matching thread found, SERVICE_RESUMED alert is **deleted** instead of creating a new thread
3. **New counter** - Response includes `skippedOrphanedServiceResumed` tracking deleted orphans
4. **Frontend backup filter** - Alerts page also filters out any existing orphaned SERVICE_RESUMED threads

**Code (poll-alerts v51):**

```typescript
} else if (category === 'SERVICE_RESUMED') {
  // SERVICE_RESUMED alerts should NEVER create new threads
  // If we couldn't match it to an existing thread, just delete the orphaned alert
  await supabase.from('alert_cache').delete().eq('alert_id', newAlert.alert_id);
  existingAlertIds.delete(alertId);
  newAlerts--;
  skippedOrphanedServiceResumed++;
  continue;
}
```

### Hidden Stale Alerts (v56)

**Problem:** When TTC API clears an alert but Bluesky hasn't posted SERVICE_RESUMED yet, we had two bad options:

1. Mark thread as resolved → DETOUR alerts appear in Resolved tab without SERVICE_RESUMED
2. Keep thread active → Stale alerts stay in Active tab indefinitely

**Solution (v56):** Add `is_hidden` flag to hide stale threads from frontend while waiting for Bluesky SERVICE_RESUMED.

**Database Schema:**

```sql
ALTER TABLE incident_threads ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_incident_threads_is_hidden ON incident_threads(is_hidden);
```

**Key Behaviors:**

1. **Immediate hiding** - When TTC clears an alert without SERVICE_RESUMED, set `is_hidden = true` immediately
2. **6-hour grace period** - Hidden threads kept for 6 hours to allow Bluesky SERVICE_RESUMED to arrive
3. **Auto-delete after 6h** - If no SERVICE_RESUMED arrives within 6 hours, delete thread and alerts
4. **Unhide on SERVICE_RESUMED** - When Bluesky posts SERVICE_RESUMED, set `is_hidden = false` and `is_resolved = true`
5. **Frontend filtering** - Hidden threads excluded from both Active and Resolved tabs

**Code (poll-alerts v56):**

```typescript
if (!isStillActive) {
  const hasServiceResumed = (thread.categories || []).includes(
    "SERVICE_RESUMED"
  );
  if (hasServiceResumed) {
    // Thread has SERVICE_RESUMED - mark as resolved and unhide
    await supabase
      .from("incident_threads")
      .update({
        is_resolved: true,
        is_hidden: false,
        resolved_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("thread_id", thread.thread_id);
  } else {
    // Thread cleared from TTC API without SERVICE_RESUMED - hide immediately
    const threadAge =
      now.getTime() -
      new Date(thread.updated_at || thread.created_at).getTime();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    if (threadAge > sixHoursMs) {
      // Delete the thread and its alerts - stale and won't get SERVICE_RESUMED
      await supabase
        .from("alert_cache")
        .delete()
        .eq("thread_id", thread.thread_id);
      await supabase
        .from("incident_threads")
        .delete()
        .eq("thread_id", thread.thread_id);
    } else {
      // Hide the thread immediately (will be deleted later or shown if SERVICE_RESUMED arrives)
      await supabase
        .from("incident_threads")
        .update({
          is_hidden: true,
          updated_at: now.toISOString(),
        })
        .eq("thread_id", thread.thread_id);
    }
  }
}
```

**Frontend Filter:**

```typescript
// Combine real alerts with demo alerts (filter out hidden threads)
let allThreads = $derived(() => {
  const visibleThreads = $threadsWithAlerts.filter((t) => !t.is_hidden);
  return visibleThreads;
});
```

**State Transitions:**

| State                                   | Active Tab | Resolved Tab | Notes                                  |
| --------------------------------------- | ---------- | ------------ | -------------------------------------- |
| Active (in TTC API)                     | ✅ Visible | ❌ Hidden    | Normal active alert                    |
| Hidden (stale, no SERVICE_RESUMED)      | ❌ Hidden  | ❌ Hidden    | Waiting up to 6h for Bluesky           |
| Resolved (has SERVICE_RESUMED)          | ❌ Hidden  | ✅ Visible   | Proper resolution with SERVICE_RESUMED |
| Deleted (6h passed, no SERVICE_RESUMED) | ❌ Gone    | ❌ Gone      | Cleaned up silently                    |

### RSZ (Reduced Speed Zone) Handling (v48)

**Problem:** Both BlueSky and TTC API can post about subway speed reductions, but TTC API provides more accurate data (exact stop locations, direction).

**Solution (v48):** TTC API is the **sole authoritative source** for RSZ alerts. All BlueSky RSZ posts are filtered out.

**Key Behaviors:**

1. **No BlueSky RSZ alerts** - All BlueSky posts mentioning speed reductions are skipped
2. **Deletion on resolve** - When TTC removes an RSZ alert, it's **deleted** from database (not marked resolved)
3. **No Resolved tab** - RSZ alerts never appear in Resolved tab; they simply vanish when resolved
4. **1:1 mapping** - Each active RSZ zone has exactly one TTC API alert and one thread

**Keyword Detection for BlueSky RSZ Filtering:**

```typescript
const patterns = [
  "slower than usual", // Main RSZ phrase from TTC
  "reduced speed",
  "slow zone",
  "speed restriction",
  "slower speeds",
  "operating at reduced speed",
  "trains running slower",
  "slower service",
  "move slower", // "trains will move slower"
  "running slower",
];
```

**Response Counters:**

- `skippedRszAlerts` - BlueSky RSZ posts that were filtered out
- `rszDeletedCount` - Stale RSZ alerts deleted (TTC removed them)

### Key Principles

- **Reply chain priority** - Bluesky reply relationships take precedence over similarity matching
- **Effect > Cause** - "No service" matters more than "due to security incident"
- **Non-exclusive categories** - Alert can be `SERVICE_DISRUPTION` + `SUBWAY`
- **Route family threading** - 37, 37A, 37B treated as same route family (via base number)
- **Enhanced similarity** - Jaccard + location keywords + cause matching
- **Tuned thresholds** - 40% general, 25% DIVERSION, 10% SERVICE_RESUMED
- **Latest first** - Most recent update at top of thread
- **TTC API authority** - Official API is authoritative for resolution status

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
      "service has resumed",
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
  ACCESSIBILITY: {
    keywords: [
      "elevator",
      "escalator",
      "accessible",
      "wheelchair",
      "out of service",
    ],
    priority: 6,
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
| 6        | ACCESSIBILITY      | INFO - Elevator/escalator |

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

### Route Number Matching (Route Family)

To enable route family threading (37, 37A, 37B = same family) while preventing cross-route threading (46 vs 996):

```typescript
// Extract route NUMBER only (base number for family matching)
function extractRouteNumber(route: string): string {
  const match = route.match(/^(\d+)/);
  return match ? match[1] : route;
}

// Check if two routes are in the same family (same base number)
function routesMatch(route1: string, route2: string): boolean {
  const num1 = extractRouteNumber(route1);
  const num2 = extractRouteNumber(route2);
  return num1 === num2;
}
```

**Route Family Examples:**

- `routesMatch("37", "37A")` → `true` (same family: 37)
- `routesMatch("37B", "37 Islington")` → `true` (same family: 37)
- `routesMatch("46 Martin Grove", "46")` → `true` (same family: 46)
- `routesMatch("996 Wilson Express", "96")` → `false` (996 ≠ 96)
- `routesMatch("39 Finch East", "939 Finch Express")` → `false` (39 ≠ 939)

### Route Extraction

Routes are extracted from alert text using regex patterns:

```typescript
function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  const subwayLineNumbers = new Set<string>(); // Track subway line numbers (1-6) we've found

  // Match subway lines: Line 1, Line 2, Line 4, Line 6
  const lineMatch = text.match(/Line\s*\d+/gi);
  if (lineMatch) {
    lineMatch.forEach((m) => {
      routes.push(m);
      // Track the line number (e.g., "Line 6" -> "6")
      const num = m.match(/\d+/);
      if (num) subwayLineNumbers.add(num[0]);
    });
  }

  // Match route numbers with letter suffix variants: "37A", "37B", "123C", "123D"
  const routeWithSuffixMatch = text.match(/\b(\d{1,3}[A-Z])\b/g);
  if (routeWithSuffixMatch) {
    routeWithSuffixMatch.forEach((m) => routes.push(m));
  }

  // Match numbered routes with names: "306 Carlton", "504 King"
  // SKIP if we already have this as a subway line (e.g., "6 Finch" when we have "Line 6")
  const routeWithNameRegex = /\b(\d{1,3})\s+([A-Z][a-z]+)/g;
  let m;
  while ((m = routeWithNameRegex.exec(text)) !== null) {
    if (subwayLineNumbers.has(m[1])) continue; // Skip "6 Finch" if "Line 6" exists
    if (!routes.some((r) => r.startsWith(m[1]))) routes.push(m[0]);
  }

  // Match standalone route numbers at start of text
  const startMatch = text.match(/^(\d{1,3})\s+[A-Z]/);
  if (
    startMatch &&
    !subwayLineNumbers.has(startMatch[1]) &&
    !routes.some((r) => r.startsWith(startMatch[1]))
  ) {
    routes.push(startMatch[1]);
  }

  return [...new Set(routes)];
}
```

**Examples:**

- "Line 1: No service" → `["Line 1"]`
- "Line 6 Finch: Delay" → `["Line 6"]` ✅ (NOT `["Line 6", "6 Finch"]`)
- "306 Carlton: Detour" → `["306 Carlton"]`
- "504 King delays" → `["504 King"]`
- "Routes 39, 85, 939" → `["39", "85", "939"]`
- "37, 37A Islington: Detour" → `["37A", "37 Islington", "37"]` (all variants captured)

**Subway Line Deduplication (v50):**

When text contains "Line X" (subway lines 1-6), subsequent patterns like "X Name" are skipped to prevent duplicate badges:

| Input Text                     | Before v50              | After v50    |
| ------------------------------ | ----------------------- | ------------ |
| "Line 6 Finch: Delay"          | `["Line 6", "6 Finch"]` | `["Line 6"]` |
| "Line 2: No service at Warden" | `["Line 2", "2 No"]`    | `["Line 2"]` |

---

## Enhanced Similarity (v14)

### Location Keyword Matching

Extracts location keywords from alert text for better similarity matching:

```typescript
function extractLocationKeywords(text: string): Set<string> {
  const keywords = new Set<string>();

  // Common TTC location patterns
  const locationPatterns = [
    /\bat\s+(\w+)\s+(ave|st|blvd|rd|dr|cres|way|pkwy)\b/gi,
    /\b(\w+)\s+station\b/gi,
    /\bvia\s+(\w+)/gi,
    /\bnear\s+(\w+)/gi,
  ];

  locationPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => keywords.add(m.toLowerCase()));
    }
  });

  // Extract specific street names
  const streetMatch = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Ave|St|Blvd|Rd|Dr|Cres|Way)\b/g
  );
  if (streetMatch) {
    streetMatch.forEach((s) => keywords.add(s.toLowerCase()));
  }

  return keywords;
}
```

### Incident Cause Matching

Identifies incident causes for better thread matching:

```typescript
function extractCause(text: string): string | null {
  const lowerText = text.toLowerCase();
  const causes = [
    "collision",
    "medical emergency",
    "fire",
    "police",
    "construction",
    "stalled",
    "track work",
    "signal problem",
    "power",
    "trespasser",
  ];
  return causes.find((c) => lowerText.includes(c)) || null;
}
```

### Enhanced Similarity Function

Combines Jaccard similarity with location and cause bonuses:

```typescript
function enhancedSimilarity(text1: string, text2: string): number {
  // Base Jaccard similarity
  const jaccard = jaccardSimilarity(text1, text2);

  // Location overlap bonus (up to +20%)
  const loc1 = extractLocationKeywords(text1);
  const loc2 = extractLocationKeywords(text2);
  const locOverlap = [...loc1].filter((l) => loc2.has(l)).length;
  const locationBonus = locOverlap > 0 ? Math.min(0.2, locOverlap * 0.1) : 0;

  // Same cause bonus (+15%)
  const cause1 = extractCause(text1);
  const cause2 = extractCause(text2);
  const causeBonus = cause1 && cause1 === cause2 ? 0.15 : 0;

  return Math.min(1, jaccard + locationBonus + causeBonus);
}
```

**Example:**

- Alert 1: "37 Islington: Detour via Rexdale Blvd due to a collision"
- Alert 2: "37B Islington: Detour via Elmhurst Dr due to a collision"
- Base Jaccard: ~30%
- Location bonus: +10% (both mention Islington area)
- Cause bonus: +15% (both mention collision)
- **Enhanced similarity: 55%** → Threads together!

---

## Incident Threading

### Overview

Incident threading groups related alerts over time to:

- Prevent duplicate notifications (12 updates → 1 thread)
- Show incident timeline (expand to see earlier updates)
- Track incident duration
- Display most recent update first
- Auto-resolve threads when SERVICE_RESUMED

### Threading Algorithm (v20)

**Implemented in:** `supabase/functions/poll-alerts/index.ts`

```typescript
// Thread matching logic with route family matching and enhanced similarity
let matchedThread = null;
let bestSimilarity = 0;

// CRITICAL: Only attempt thread matching if alert has extracted routes
if (routes.length > 0) {
  // Extract base route numbers for family matching
  const alertBaseRoutes = routes.map(extractRouteNumber);

  // Search BOTH unresolved AND recently resolved threads (12-hour window)
  // This allows SERVICE_RESUMED to match and close existing threads
  for (const thread of candidateThreads || []) {
    const threadRoutes = Array.isArray(thread.affected_routes)
      ? thread.affected_routes
      : [];

    // Skip threads with no routes
    if (threadRoutes.length === 0) continue;

    // Extract base route numbers from thread
    const threadBaseRoutes = threadRoutes.map(extractRouteNumber);

    // Route FAMILY matching (37 matches 37A, 37B, etc.)
    const hasRouteOverlap = alertBaseRoutes.some((alertBase) =>
      threadBaseRoutes.includes(alertBase)
    );

    if (hasRouteOverlap) {
      const threadTitle = thread.title || "";
      // Use enhanced similarity (Jaccard + location + cause)
      const similarity = enhancedSimilarity(text, threadTitle);

      // General threshold: 40%
      if (similarity >= 0.4) {
        matchedThread = thread;
        break;
      }

      // SERVICE_RESUMED: 10% (very different vocabulary)
      if (category === "SERVICE_RESUMED" && similarity >= 0.1) {
        matchedThread = thread;
        break;
      }

      // DIVERSION/DELAY: 25%
      if (
        (category === "DIVERSION" || category === "DELAY") &&
        similarity >= 0.25
      ) {
        matchedThread = thread;
        break;
      }
    }
  }
}
```

### Threading Rules (v20)

| Rule                     | Threshold         | Description                                        |
| ------------------------ | ----------------- | -------------------------------------------------- |
| **Route Family Match**   | Required          | Base route numbers must match (37 = 37A = 37B)     |
| **General Similarity**   | ≥40%              | Default threshold for matching                     |
| **DIVERSION/DELAY**      | ≥25%              | Lower threshold for route updates                  |
| **SERVICE_RESUMED**      | ≥10%              | Very different vocabulary from original            |
| **Time Window**          | 12 hours          | Match threads updated within 12 hours              |
| **Search Scope**         | Resolved + Active | SERVICE_RESUMED can match resolved threads         |
| **Enhanced Similarity**  | Jaccard + bonuses | Location (+20%) + Cause (+15%) bonuses             |
| **Title Preservation**   | SERVICE_RESUMED   | Don't overwrite original incident title            |
| **Route Merging**        | On match          | Thread routes accumulate from all alerts           |
| **Duplicate Prevention** | 5-second window   | Check for recently created threads before creating |

### Thread Update Rules (v20)

When an alert matches an existing thread:

```typescript
// Merge routes: combine thread's existing routes with new alert's routes
const mergedRoutes = [...new Set([...existingRoutes, ...routes])];

// IMPORTANT: Preserve original incident title when SERVICE_RESUMED
const updates: any = {
  updated_at: new Date().toISOString(),
  affected_routes: mergedRoutes,
};

// Only update title if NOT a SERVICE_RESUMED alert
// SERVICE_RESUMED alerts should keep the original incident description
if (category !== "SERVICE_RESUMED") {
  updates.title = text.split("\n")[0].substring(0, 200);
}

// Resolve thread if SERVICE_RESUMED
if (category === "SERVICE_RESUMED") {
  updates.is_resolved = true;
}
```

### Race Condition Prevention (v20)

Before creating a new thread, check if one was just created for the same route:

```typescript
// Check for threads created in last 5 seconds with same route
if (routes.length > 0) {
  const alertBaseRoutes = routes.map(extractRouteNumber);
  const { data: recentThreads } = await supabase
    .from("incident_threads")
    .select("*")
    .gte("created_at", new Date(Date.now() - 5000).toISOString());

  for (const recentThread of recentThreads || []) {
    const recentBaseRoutes = recentRoutes.map(extractRouteNumber);
    const hasOverlap = alertBaseRoutes.some((base) =>
      recentBaseRoutes.includes(base)
    );

    if (hasOverlap) {
      // Join existing thread instead of creating duplicate
      console.log(`Joining recently created thread ${recentThread.thread_id}`);
      // ... link alert to existing thread ...
      joinedRecentThread = true;
      break;
    }
  }
}
if (joinedRecentThread) continue; // Skip to next alert
```

### Similarity Calculation

**Enhanced Similarity = Jaccard + Location Bonus + Cause Bonus**

| Component | Weight  | Description                                    |
| --------- | ------- | ---------------------------------------------- |
| Jaccard   | Base    | Word overlap between texts                     |
| Location  | +10-20% | Same street/station mentions                   |
| Cause     | +15%    | Same incident cause (collision, medical, etc.) |

### Critical Safety Checks (Prevent False Matches)

```typescript
// CRITICAL: Only attempt thread matching if alert has extracted routes
// Alerts without routes should NEVER match existing threads
if (routes.length > 0) {
  for (const thread of unresolvedThreads || []) {
    const threadRoutes = Array.isArray(thread.affected_routes)
      ? thread.affected_routes
      : [];

    // Skip threads with no routes - they can't be reliably matched
    if (threadRoutes.length === 0) continue;

    // Use exact route number matching
    const hasRouteOverlap = routes.some((alertRoute) =>
      threadRoutes.some((threadRoute) => routesMatch(alertRoute, threadRoute))
    );

    // Only proceed with similarity check if routes match
    if (hasRouteOverlap) {
      // ... similarity checks
    }
  }
}
```

**Why This Matters:**

- Prevents alerts like "All clear" (no routes) from matching unrelated threads
- Prevents threads with empty routes from becoming catch-all buckets
- Ensures route extraction is the FIRST gate before any similarity matching

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
   - If SERVICE_RESUMED → mark thread as resolved
6. If no match:
   - Create new thread
   - Link alert to new thread
```

### Thread States

- **ACTIVE** (`is_resolved = false`) - Incident ongoing
- **RESOLVED** (`is_resolved = true`) - Closed by SERVICE_RESUMED or age

---

## Bluesky Reply Threading (v31)

### Overview

**Implemented in:** `supabase/functions/poll-alerts/index.ts` (v31)

Bluesky posts can be replies to previous posts. The TTC alerts account often posts updates as replies to their original alert. This creates a natural thread chain that we can leverage for better alert grouping.

### Priority Order

Threading now follows this priority:

1. **Bluesky Reply Chain** - If alert is a reply to an existing alert, use parent's thread
2. **Similarity Matching** - Fall back to route + text similarity matching
3. **New Thread** - Create new thread if no match found

### Reply Info Extraction

```typescript
interface BlueskyReplyInfo {
  parentUri: string | null; // Full URI of parent post
  parentPostId: string | null; // Extracted alert_id (bsky-{post_id})
  rootUri: string | null; // Full URI of thread root
}

function extractReplyInfo(record: any): BlueskyReplyInfo {
  const reply = record?.reply;
  if (!reply) {
    return { parentUri: null, parentPostId: null, rootUri: null };
  }

  const parentUri = reply.parent?.uri || null;
  const rootUri = reply.root?.uri || null;

  // Extract post_id from parent URI: at://did:plc:xxx/app.bsky.feed.post/{post_id}
  let parentPostId: string | null = null;
  if (parentUri) {
    const match = parentUri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
    if (match) {
      parentPostId = `bsky-${match[1]}`;
    }
  }

  return { parentUri, parentPostId, rootUri };
}
```

### Reply-Based Threading Rules

| Rule                                           | Behavior                                             |
| ---------------------------------------------- | ---------------------------------------------------- |
| **Reply to active thread**                     | Always add to parent's thread, even if routes differ |
| **Reply to resolved thread + SERVICE_RESUMED** | Add to parent's thread (keeps it resolved)           |
| **Reply to resolved thread + other category**  | Create new thread (don't reopen old incidents)       |
| **No reply data**                              | Fall back to similarity-based matching               |

### Route Mismatch Handling

When a reply mentions different routes than its parent thread:

```typescript
// Per Rule B: Add to parent thread even if routes differ
if (!hasRouteOverlap && routes.length > 0) {
  console.log(
    `Reply chain: ${alertId} -> thread ${parentThreadId} ` +
      `(routes differ: alert=${routes.join(",")} thread=${threadRoutes.join(
        ","
      )} ` +
      `- adding anyway per rule B)`
  );
}
// Routes are merged, preserving both thread's and alert's routes
const mergedRoutes = [...new Set([...existingRoutes, ...routes])];
```

**Rationale:** TTC often posts follow-up updates as replies even when service extends to additional routes. The reply relationship is strong evidence of continuity.

### Resolved Thread Handling

When an alert replies to an already-resolved thread:

```typescript
if (parentThread.is_resolved) {
  if (category === "SERVICE_RESUMED") {
    // SERVICE_RESUMED matching resolved thread - keep it resolved
    matchedThread = parentThread;
    console.log(`Reply chain: SERVICE_RESUMED added to resolved thread`);
  } else {
    // Non-SERVICE_RESUMED alert replying to resolved thread
    // Create new thread instead of reopening old incident
    console.log(`Reply chain: category=${category}, creating new thread`);
    matchedThread = null; // Force new thread creation
  }
}
```

**Rationale:** If an incident was resolved but TTC posts a new update (not SERVICE_RESUMED), it's likely a new incident on the same route, not a continuation.

### In-Memory Thread Map

To support reply chain threading within the same polling batch:

```typescript
// Build alert_id -> thread_id map for reply chain threading
const alertToThreadMap = new Map<string, string>();
existingAlerts?.forEach((a) => {
  if (a.thread_id) {
    alertToThreadMap.set(a.alert_id, a.thread_id);
  }
});

// Update map when new alerts are processed
alertToThreadMap.set(alertId, matchedThread.thread_id);
```

This ensures that if Alert B replies to Alert A, and both arrive in the same 50-post batch, Alert B can still find Alert A's thread.

### Example Scenarios

**Scenario 1: Normal Reply Chain**

```
Post 1: "501 Queen: No service due to collision at Queen/Spadina"
  └─ Post 2 (reply): "501 Queen: Service resuming shortly"
     └─ Post 3 (reply): "501 Queen: Regular service has resumed"

Result: All 3 posts in same thread, thread marked resolved by Post 3
```

**Scenario 2: Route Addition via Reply**

```
Post 1: "Line 2: No service Kennedy to Main"
  └─ Post 2 (reply): "Line 2, Line 4: Shuttle buses running"

Result: Both posts in same thread, routes merged to [Line 2, Line 4]
```

**Scenario 3: Reply to Resolved Thread**

```
Post 1: "510 Spadina: Diversion via Bay"
Post 2: "510 Spadina: Regular service has resumed"  [thread resolved]
  └─ Post 3 (reply to Post 1): "510 Spadina: Diversion due to new incident"

Result: Post 3 creates NEW thread (category != SERVICE_RESUMED)
```

---

## Frontend Filtering

### Overview

**Implemented in:** `src/lib/stores/alerts.ts` and `src/lib/components/alerts/CategoryFilter.svelte`

The frontend provides two levels of filtering for alerts:

1. **Severity Category Filter** (New) - MAJOR, MINOR, ACCESSIBILITY, ALL
2. **Route/Type Filter** - By specific route or alert type

### Severity Category System

**Component:** `CategoryFilter.svelte`

Alerts are categorized into three severity levels based on their effect and type:

| Category          | TTC API Effects                                                                                     | Description                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **MAJOR**         | NO_SERVICE, REDUCED_SERVICE, DETOUR, MODIFIED_SERVICE, SCHEDULED_CLOSURE, DELAY, SIGNIFICANT_DELAYS | Closures, detours, shuttles, no service, delays, maintenance            |
| **MINOR**         | RSZ (Reduced Speed Zone) only                                                                       | Subway slow zones ("slower than usual", "reduced speed")                |
| **FACILITIES** 🆕 | ACCESSIBILITY_ISSUE (Elevator/Escalator), SiteWide (Station entrance closures)                      | Elevator/escalator outages and station entrance/facility closures (v61) |

**Categorization Logic (`getSeverityCategory()` in alerts.ts):**

```typescript
export function getSeverityCategory(
  categories: string[],
  effect?: string,
  headerText?: string
): SeverityCategory {
  const upperCategories = categories.map((c) => c.toUpperCase());
  const upperEffect = (effect || "").toUpperCase();
  const lowerHeader = (headerText || "").toLowerCase();

  // Check for station alerts first (elevator/escalator/station closures)
  if (
    upperCategories.includes("ACCESSIBILITY_ISSUE") ||
    upperCategories.includes("ACCESSIBILITY") ||
    upperEffect.includes("ACCESSIBILITY") ||
    lowerHeader.includes("elevator") ||
    lowerHeader.includes("escalator") ||
    lowerHeader.includes("entrance")
  ) {
    return "FACILITIES";
  }

  // Check for RSZ (Reduced Speed Zone) alerts FIRST - these are MINOR
  // RSZ alerts are specifically about subway slow zones, not general delays
  const isRSZ =
    lowerHeader.includes("slower than usual") ||
    lowerHeader.includes("slow zone") ||
    lowerHeader.includes("reduced speed") ||
    lowerHeader.includes("move slower") ||
    lowerHeader.includes("running slower") ||
    lowerHeader.includes("speed restriction");

  if (isRSZ) {
    return "MINOR";
  }

  // Check for major disruptions (closures, detours, no service, shuttles, delays)
  // Note: Regular delays are now MAJOR (not MINOR) - only RSZ is MINOR
  const majorEffects = [
    "NO_SERVICE",
    "REDUCED_SERVICE",
    "DETOUR",
    "MODIFIED_SERVICE",
    "SCHEDULED_CLOSURE",
    "SIGNIFICANT_DELAYS",
    "DELAY",
  ];
  const majorCategories = [
    "SERVICE_DISRUPTION",
    "DISRUPTION",
    "CLOSURE",
    "SCHEDULED_CLOSURE",
    "DETOUR",
    "SHUTTLE",
    "DELAY",
  ];

  if (
    majorEffects.some((e) => upperEffect.includes(e)) ||
    majorCategories.some((c) => upperCategories.includes(c)) ||
    lowerHeader.includes("closed") ||
    lowerHeader.includes("shuttle") ||
    lowerHeader.includes("no service") ||
    lowerHeader.includes("suspended") ||
    lowerHeader.includes("diverting") ||
    lowerHeader.includes("detour") ||
    lowerHeader.includes("delay")
  ) {
    return "MAJOR";
  }

  return "MAJOR"; // Default to MAJOR for unknown
}
```

**Default Selection:** MAJOR is selected by default when loading the alerts page.

**Icons:**

- Major: ⚠️ AlertTriangle (Lucide)
- Minor: 🕐 Clock (Lucide)
- Accessibility: ♿ Accessibility (Lucide) - **NOT emoji**
- All: 📋 List (Lucide)

### Route/Type Filter State

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

### Scheduled Maintenance Display

**Component:** `ClosuresView.svelte` (in Scheduled tab)

The scheduled maintenance tab displays all upcoming and active subway closures in a single sorted list (no sub-tabs).

**Display Logic:**

1. **Items shown** - Sorted by start date (earliest first)
2. **Past closures hidden** - Except nightly closures until 6am (see below)
3. **Badge types** - "Weekend" for full weekend closures, "Nightly" for late-night closures

**Nightly Closure Extension (6am Rule):**

Nightly closures (starting at 10 PM or later) remain visible in the Scheduled tab until 6 AM the day AFTER the `end_date`:

```typescript
function shouldShowInScheduled(item: PlannedMaintenance): boolean {
  // Future or current items always shown
  if (endDate >= today) return true;

  // Past nightly closures: show until 6am after end_date
  const isNightlyClosure = startHour >= 22;
  if (isNightlyClosure) {
    const morningAfterEnd = new Date(endDate);
    morningAfterEnd.setDate(morningAfterEnd.getDate() + 1);
    morningAfterEnd.setHours(6, 0, 0);
    return now < morningAfterEnd;
  }
  return false;
}
```

**Example:** Dec 15-18 nightly closure → visible until Dec 19 at 6:00 AM

### Active Maintenance in Active Tab

**Function:** `isMaintenanceHappeningNow()` (in `+page.svelte`)

Nightly closures also appear in the Active alerts tab while they're in progress:

1. **Within date range** - Shows when `startDate <= now <= endDate`
2. **Overnight extension** - Shows until 6 AM on the morning after each nightly closure
3. **Morning after end_date** - Shows until 6 AM on `endDate + 1` for the final night

```typescript
// Nightly closures with start time >= 10 PM
const isNightlyClosure = startTime && startTime.hours >= 22;

// Extend end to 6 AM if no explicit end time
if (isNightlyClosure && !endTime) {
  endTime = { hours: 6, minutes: 0 };
}

// Extend date range to include morning after end_date
if (isNightlyClosure && endTime?.hours < 12) {
  endDateExtended.setDate(endDateExtended.getDate() + 1);
}

// Active if: late night (>= start time) OR early morning (<= 6 AM)
return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
```

**Result:** Nightly closures appear in MAJOR severity tab while active, alongside real-time alerts.

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

Stores planned maintenance alerts separately (scraped from TTC website).

```sql
CREATE TABLE planned_maintenance (
  id SERIAL PRIMARY KEY,
  route TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Edge Functions

### `poll-alerts`

**Trigger:** Cron schedule (every 30 seconds)  
**Purpose:** Fetch, categorize, thread alerts from Bluesky + TTC Live API secondary source + cross-check resolution
**Version:** v43 (January 2025)

**Flow:**

1. **TTC Live API Fetch + Cross-Check**

   - Fetch active alerts from `https://alerts.ttc.ca/api/alerts/live-alerts`
   - **Save non-planned alerts** for later processing (v39)
   - Extract all routes with active disruptions
   - Query unresolved threads in our database
   - Mark threads as resolved if their routes are NOT in TTC's active alerts
   - Log resolved threads with reason
   - Falls back gracefully if TTC API is unavailable

2. **Bluesky Processing (Primary Source)**

   - Fetch latest posts from @ttcalerts.bsky.social
   - For each post:
     - Extract text and routes (including letter suffix variants)
     - Determine category from keywords
     - Check reply chain for thread linking (v31)
     - Find or create incident thread (using route family matching + enhanced similarity)
     - Store in `alert_cache`
     - **Track routes covered** by Bluesky for deduplication (v39)

3. **TTC Live API Processing (Secondary Source, v39)**

   - Process saved non-planned TTC alerts
   - For each TTC alert:
     - Skip if route already has active Bluesky thread (deduplication)
     - Map TTC effect to internal category
     - Create thread using same rules as Bluesky alerts
     - Store with `alert_id = ttc-{route}-{effect}-{id}`

4. Update Realtime subscriptions

**TTC Live API Dual-Use (v39):**

| Use Case         | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| Cross-check      | Resolve threads when routes no longer in TTC API                     |
| Secondary source | Create alerts for routes not covered by Bluesky                      |
| Filtering        | Exclude `alertType: "Planned"` (scheduled closures)                  |
| Deduplication    | Bluesky threads take priority over TTC API                           |
| Alert ID format  | `ttc-{route}-{effect}-{id}` (e.g., `ttc-1-SIGNIFICANT_DELAYS-54744`) |

**TTC Alert Type Mapping (v39):**

| TTC API `effect`      | Internal Category    |
| --------------------- | -------------------- |
| `NO_SERVICE`          | `SERVICE_DISRUPTION` |
| `REDUCED_SERVICE`     | `SERVICE_DISRUPTION` |
| `DETOUR`              | `DIVERSION`          |
| `SIGNIFICANT_DELAYS`  | `DELAY`              |
| `ACCESSIBILITY_ISSUE` | `ACCESSIBILITY`      |

**Accessibility Thread Auto-Resolve (v43):**

Accessibility alerts (elevator/escalator outages) use **station names** instead of route numbers. This requires separate auto-resolve logic:

```typescript
// Separate auto-resolve for accessibility threads
// These use station names, not route numbers
const accessibilityThreads = unresolvedThreads.filter((t) => {
  const routes = t.affected_routes || [];
  // Accessibility threads typically have station names like "Dupont Station"
  // Not route numbers like "501" or "Line 1"
  return routes.some(
    (r) =>
      r.toLowerCase().includes("station") ||
      r.toLowerCase().includes("elevator") ||
      r.toLowerCase().includes("escalator")
  );
});

// Standard threads (routes like "501", "Line 1", etc.)
const standardThreads = unresolvedThreads.filter(
  (t) => !accessibilityThreads.includes(t)
);

// Auto-resolve standard threads based on TTC API active routes
for (const thread of standardThreads) {
  const threadRoutes = thread.affected_routes || [];
  const hasActiveRoute = threadRoutes.some((r) =>
    ttcActiveRoutes.includes(normalizeRoute(r))
  );
  if (!hasActiveRoute) {
    // Route no longer in TTC API - resolve thread
    await resolveThread(thread.thread_id);
  }
}

// Accessibility threads resolve based on TTC API accessibility alerts
const ttcAccessibilityStations = ttcAlerts
  .filter((a) => a.effect === "ACCESSIBILITY_ISSUE")
  .map((a) => a.routeAffected); // Station names like "Dupont Station"

for (const thread of accessibilityThreads) {
  const threadStations = thread.affected_routes || [];
  const hasActiveStation = threadStations.some((s) =>
    ttcAccessibilityStations.some(
      (active) =>
        active.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(active.toLowerCase())
    )
  );
  if (!hasActiveStation) {
    // Station no longer has accessibility issue - resolve thread
    await resolveThread(thread.thread_id);
  }
}
```

| Thread Type   | Auto-Resolve Criteria                             |
| ------------- | ------------------------------------------------- |
| Standard      | Route no longer in TTC API active routes          |
| Accessibility | Station no longer in TTC API accessibility alerts |

**Why Separate Logic?**

- Standard threads: Routes like "501", "Line 1" match TTC API route IDs
- Accessibility threads: Station names like "Dupont Station" don't match route IDs
- Without v43: Accessibility threads never auto-resolved (station ≠ route)
- With v43: Accessibility threads resolve when station outage cleared in TTC API

**Response Fields (v43):**

```json
{
  "success": true,
  "newAlerts": 3,
  "updatedThreads": 1,
  "ttcApiResolvedCount": 0,
  "accessibilityResolvedCount": 0,
  "ttcApiNewAlerts": 0,
  "ttcApiError": null,
  "version": 43,
  "timestamp": "2025-12-16T01:02:50.350Z"
}
```

| Field                        | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `newAlerts`                  | New alerts created (Bluesky)                      |
| `updatedThreads`             | Existing threads updated                          |
| `ttcApiResolvedCount`        | Standard threads resolved via TTC API cross-check |
| `accessibilityResolvedCount` | Accessibility threads resolved (v43)              |
| `ttcApiNewAlerts`            | New alerts from TTC API secondary source          |
| `ttcApiError`                | Error message if TTC API failed                   |
| `version`                    | Edge function version                             |

### `scrape-maintenance`

**Trigger:** Cron schedule (daily)  
**Purpose:** Scrape planned maintenance from TTC website

**Flow:**

1. Fetch TTC service alerts page
2. Parse maintenance announcements
3. Upsert into `planned_maintenance` table

---

## Data Retention (pg_cron)

Automated cleanup runs daily at 4 AM Toronto time (DST-aware).

### Retention Policy

| Data Type                   | Retention      | Cleanup Action      |
| --------------------------- | -------------- | ------------------- |
| Resolved threads            | 15 days        | Auto-deleted        |
| Orphan alerts (no thread)   | 15 days        | Auto-deleted        |
| Active (unresolved) threads | Indefinite     | Kept until resolved |
| Alerts linked to threads    | Matches thread | Deleted with thread |

### Cleanup Functions

```sql
-- Core cleanup function
SELECT * FROM cleanup_old_alerts();

-- DST-aware wrapper (runs at 4 AM Toronto)
SELECT * FROM cleanup_old_alerts_toronto();
```

### Scheduled Jobs

| Job Name                 | Schedule     | Purpose           |
| ------------------------ | ------------ | ----------------- |
| `cleanup-alerts-8am-utc` | 0 8 \* \* \* | 4 AM EDT (summer) |
| `cleanup-alerts-9am-utc` | 0 9 \* \* \* | 4 AM EST (winter) |

### Useful Commands

```sql
-- Manually run cleanup
SELECT * FROM cleanup_old_alerts();

-- View scheduled jobs
SELECT jobid, jobname, schedule, command FROM cron.job;

-- View job history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Check Toronto time
SELECT now() AT TIME ZONE 'America/Toronto' as toronto_time;
```

---

## Database Constraints and Triggers

### Thread Deduplication System (v5.2)

Prevents duplicate threads from being created when multiple Edge Function isolates run in parallel.

**Components:**

1. **`thread_hash` Column**: MD5 hash of normalized title + route + hour-level timestamp
2. **Unique Index**: `idx_incident_threads_hash_unique` prevents duplicate hashes
3. **Auto-populate Trigger**: Computes hash automatically on INSERT
4. **Exception Handling**: `find_or_create_thread` catches unique violations and returns existing thread

```sql
-- Hash generation function
CREATE FUNCTION generate_thread_hash(p_title TEXT, p_routes JSONB, p_created_at TIMESTAMPTZ)
RETURNS TEXT AS $$
  primary_route := extract_route_number(p_routes->>0);
  date_key := TO_CHAR(p_created_at AT TIME ZONE 'America/Toronto', 'YYYY-MM-DD-HH24');
  RETURN MD5(primary_route || '|' || date_key || '|' || normalized_title);
$$;

-- Unique index prevents duplicates
CREATE UNIQUE INDEX idx_incident_threads_hash_unique
ON incident_threads (thread_hash) WHERE thread_hash IS NOT NULL;

-- Auto-populate trigger
CREATE TRIGGER auto_populate_thread_hash_trigger
    BEFORE INSERT ON incident_threads
    FOR EACH ROW EXECUTE FUNCTION auto_populate_thread_hash();
```

### Route Validation Trigger (v5.1)

A database trigger prevents route mismatches when assigning alerts to threads. This acts as a safety net against bugs in the Edge Function.

```sql
-- Trigger function: validate_alert_thread_routes()
-- Blocks UPDATE/INSERT if alert routes don't overlap with thread routes

-- Example: Blocks Route 16 alert from being assigned to Route 9 thread
-- even if they share similar location text (Danforth Rd, Mack Ave, Warden Ave)
```

**How it works:**

1. On INSERT/UPDATE to `alert_cache`, extract base route numbers (e.g., "16" from "16A")
2. Compare with target thread's route numbers
3. RAISE EXCEPTION if no route overlap found

**Why this was added:**

- Route 9 and Route 16 alerts share similar locations (same collision area)
- Old poll-alerts versions matched based on similarity score alone
- This caused Route 16 alerts to appear under Route 9 threads

### JSONB Array Constraints

```sql
-- Ensures affected_routes is always a valid JSONB array
ALTER TABLE alert_cache
  ADD CONSTRAINT affected_routes_is_array
  CHECK (jsonb_typeof(affected_routes) = 'array');
```

---

## Summary

This system provides:

✅ **Dual data sources** - Bluesky primary + TTC Live API secondary (v39+)
✅ **Keyword-based categorization** - 7 categories with priority ordering (incl. ACCESSIBILITY)
✅ **Bluesky reply threading** - Native thread chains take priority (v31)
✅ **Incident threading** - Jaccard similarity + exact route number matching  
✅ **Cross-route prevention** - Route 46 cannot match with 996, 39 cannot match with 939  
✅ **Smart SERVICE_RESUMED** - Lower threshold (10%) for different vocabulary  
✅ **Auto-resolve** - SERVICE_RESUMED closes threads + TTC API cross-check + separate accessibility logic (v43)
✅ **Mutually exclusive filters** - One category filter at a time  
✅ **Planned alert separation** - TTC API planned alerts excluded from import
✅ **Deduplication** - Bluesky routes prioritized, TTC API fills gaps only
✅ **Realtime updates** - Supabase subscriptions push changes  
✅ **Observable** - Thread state visible in UI  
✅ **Database validation** - Trigger prevents route mismatches
✅ **Accessibility threads** - Station-based matching and separate auto-resolve (v43)

**Architecture:**

```
Bluesky API → poll-alerts Edge Function → Supabase PostgreSQL
                                              ↓
                                       Route validation trigger
                                              ↓
                                       Realtime subscriptions
                                              ↓
                                       Svelte stores (alerts.ts)
                                              ↓
                                       AlertCard.svelte UI
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

## Changelog

### Version 11.1 - June 17, 2025 (Simplified Scheduled Maintenance View)

**Frontend Changes:**

- ✅ **Removed tabs from ClosuresView.svelte**: No more "Starting Soon", "This Weekend", "Coming Up" tabs
- ✅ **Single sorted list**: All closures displayed in one list sorted by start date
- ✅ **Nightly closure 6am extension**: Nightly closures remain visible until 6 AM the day after `end_date`
- ✅ **Active tab integration**: Nightly closures appear in Active alerts (MAJOR) while in progress

**Implementation:**

```typescript
// ClosuresView.svelte - Show nightly closures until 6am after end_date
function shouldShowInScheduled(item: PlannedMaintenance): boolean {
  if (endDate >= today) return true;
  const isNightlyClosure = startHour >= 22;
  if (isNightlyClosure) {
    const morningAfterEnd = new Date(endDate);
    morningAfterEnd.setDate(morningAfterEnd.getDate() + 1);
    morningAfterEnd.setHours(6, 0, 0);
    return now < morningAfterEnd;
  }
  return false;
}
```

**Files Modified:**

- `src/lib/components/alerts/ClosuresView.svelte` - Simplified to single list with 6am extension
- `src/lib/components/alerts/MaintenanceWidget.svelte` - Removed (unused)

---

### Version 5.4 - December 10, 2025 (Stale Candidate Threads Fix)

**Root Cause of 507 Not Threading:**
SERVICE_RESUMED alerts weren't matching their corresponding disruption threads because the `candidateThreads` query ran ONCE at the start of processing (before the `for` loop). When multiple alerts arrived in the same batch:

1. "No service" alert processed → Creates new thread
2. "SERVICE_RESUMED" alert processed → Looks in STALE candidateThreads list → Thread doesn't exist yet → Creates DUPLICATE thread

**Fix (poll-alerts v23):**

- Moved `candidateThreads` query INSIDE the per-alert loop
- Each alert now gets a fresh list of threads, including threads created by earlier alerts in the same batch

```typescript
// BEFORE (v22): Query ONCE outside loop - STALE DATA BUG
const { data: candidateThreads } = await supabase.from('incident_threads')...
for (const item of posts) { ... }

// AFTER (v23): Query INSIDE loop - ALWAYS FRESH DATA
for (const item of posts) {
  // Fresh query catches threads created by earlier alerts
  const { data: candidateThreads } = await supabase.from('incident_threads')...
}
```

**Impact:**

- SERVICE_RESUMED alerts now properly match threads created in the same polling batch
- Fixed 507 Long Branch threading issue (merged orphaned SERVICE_RESUMED alert back to correct thread)

---

### Version 5.3 - December 10, 2025 (pg_cron Automation)

**Automated poll-alerts Invocation:**

- ✅ **pg_net Extension Enabled**: HTTP requests can now be made from within PostgreSQL
- ✅ **`invoke_poll_alerts()` Function**: Wrapper function that calls poll-alerts Edge Function via HTTP POST
- ✅ **Service Role Key in Vault**: Securely stored in `vault.secrets` for Edge Function authentication
- ✅ **pg_cron Job Created**: `poll-alerts-cron` runs every 2 minutes (`*/2 * * * *`)
- ✅ **Fixed `cleanup_old_data()`**: Now properly handles foreign key constraints when deleting threads

**New Database Components:**

```sql
-- invoke_poll_alerts() - Calls Edge Function using pg_net
CREATE FUNCTION invoke_poll_alerts() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  PERFORM net.http_post(
    url := 'https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/poll-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
    body := '{}'::jsonb
  );
$$;

-- pg_cron schedule
SELECT cron.schedule('poll-alerts-cron', '*/2 * * * *', 'SELECT invoke_poll_alerts()');
```

**Monitoring Cron Jobs:**

```sql
-- View all cron jobs
SELECT jobid, jobname, schedule, active FROM cron.job;

-- View recent poll-alerts runs
SELECT status, start_time, return_message FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'poll-alerts-cron')
ORDER BY start_time DESC LIMIT 10;

-- View HTTP responses
SELECT status_code, content, created FROM net._http_response ORDER BY id DESC LIMIT 10;
```

**Impact:**

- Alerts are now polled automatically every 2 minutes without external triggers
- No need for external cron services (GitHub Actions, Cloudflare Workers, etc.)
- Self-contained within Supabase infrastructure
- HTTP responses stored in `net._http_response` for debugging

---

### Version 5.2 - December 10, 2025 (Thread Deduplication Fix)

**Thread Duplication Race Condition Fix:**

- ✅ **Root Cause Identified**: Multiple Edge Function isolates running in parallel created duplicate threads (13-14 threads for same alert in same second)
- ✅ **Unique Index Added**: `idx_incident_threads_hash_unique` on `thread_hash` column prevents duplicate inserts at database level
- ✅ **Updated `find_or_create_thread`**: Uses `EXCEPTION WHEN unique_violation` to handle concurrent inserts atomically
- ✅ **Fixed `extract_route_number`**: Now handles subway lines ("Line 1", "Line 2") in addition to bus/streetcar routes
- ✅ **Auto-populate Trigger**: `auto_populate_thread_hash_trigger` ensures hash is always computed on insert
- ✅ **Data Cleanup**: Removed 310 duplicate threads, consolidated to 278 unique threads

**Why Advisory Locks Didn't Work:**
Supabase Edge Functions run in separate Deno isolates with independent database connections. PostgreSQL advisory locks (`pg_advisory_xact_lock`) only work within the same connection, so parallel isolates bypassed the locks entirely.

**New Database Protection:**

```sql
-- Unique partial index prevents duplicates
CREATE UNIQUE INDEX idx_incident_threads_hash_unique
ON incident_threads (thread_hash)
WHERE thread_hash IS NOT NULL;

-- find_or_create_thread now handles race conditions
BEGIN
    INSERT INTO incident_threads (...) VALUES (...);
EXCEPTION WHEN unique_violation THEN
    -- Another concurrent request created same thread - return that one
    SELECT thread_id INTO v_thread_id
    FROM incident_threads WHERE thread_hash = v_thread_hash;
END;
```

**Impact:**

- Eliminated 13-14x thread duplication for identical alerts
- Database now prevents duplicates regardless of Edge Function bugs
- Thread hash based on: route number + normalized title + hour-level timestamp

### Version 5.1 - December 10, 2025 (poll-alerts v22)

**Route Mismatch Prevention:**

- ✅ **Strict Route Matching for SERVICE_RESUMED**: Changed from `hasRouteOverlap` (ANY route matches) to `allAlertRoutesMatchThread` (ALL routes must match)
- ✅ **Database Trigger Validation**: Added `validate_alert_thread_routes()` trigger that BLOCKS route mismatches at database level
- ✅ **Version Tracking**: Added `FUNCTION_VERSION` constant and version in API response for debugging
- ✅ **Fixed Route 9/16 Issue**: Alerts with different routes but similar locations (Danforth Rd, Mack Ave, Warden Ave) no longer incorrectly thread together

**Root Cause:**
Route 9 Bellamy and Route 16 McCowan both use the same streets during detours (same collision area). Old code matched based on similarity score which included location keywords, causing Route 16 alerts to match Route 9 threads.

**Solution:**

1. Strict route validation in Edge Function (v22)
2. Database trigger prevents mismatches even if Edge Function has bugs
3. SERVICE_RESUMED alerts require ALL routes to match thread (not just any)

### Version 5.0 - December 10, 2025 (poll-alerts v20)

**Major Threading Logic Improvements:**

- ✅ **Extended Search Window**: 12 hours (was 6 hours) for finding matching threads
- ✅ **Resolved Thread Matching**: SERVICE_RESUMED alerts can now match resolved threads
- ✅ **Title Preservation**: SERVICE_RESUMED alerts no longer overwrite original incident title
- ✅ **Route Merging**: Thread routes accumulate ALL routes from ALL alerts in the thread
- ✅ **Race Condition Prevention**: 5-second duplicate detection before creating new threads
- ✅ **Best Match Selection**: Finds BEST matching thread, not just first match

**SERVICE_RESUMED Handling:**

```typescript
// Don't overwrite title for SERVICE_RESUMED - preserve original incident description
if (category !== "SERVICE_RESUMED") {
  updates.title = text.split("\\n")[0].substring(0, 200);
}
// Resolve thread when SERVICE_RESUMED arrives
if (category === "SERVICE_RESUMED") {
  updates.is_resolved = true;
}
```

**Duplicate Thread Prevention:**

```typescript
// Before creating new thread, check for recently created threads with same route
const { data: recentThreads } = await supabase
  .from("incident_threads")
  .select("*")
  .gte("created_at", new Date(Date.now() - 5000).toISOString());

// If found matching recent thread, join it instead of creating duplicate
if (hasOverlap) {
  joinedRecentThread = true;
  // Link alert to existing thread
}
```

**Impact:**

- Prevents SERVICE_RESUMED from creating separate threads
- Thread titles remain descriptive (original incident, not "service resumed")
- Route badges show all affected routes from entire incident
- No more duplicate threads when alerts arrive simultaneously

---

### Version 4.1 - December 10, 2025 (poll-alerts v15)

**Enhanced Similarity and Route Family Matching:**

- ✅ **Route Family Matching**: 37, 37A, 37B treated as same route (base number matching)
- ✅ **Enhanced Similarity**: Jaccard + location bonus (+20%) + cause bonus (+15%)
- ✅ **Tuned Thresholds**: 40% general, 25% DIVERSION, 10% SERVICE_RESUMED
- ✅ **Comma-Separated Routes**: Handle "37, 37A Islington" format

---

### Version 3.2 - December 5, 2025

**Threading Bug Fix (Production Deployment):**

- ✅ **Critical Fix**: Prevented false positive alert threading
  - Bug: Alerts without extracted routes could match threads based purely on text similarity
  - Result: Unrelated routes (131, 38, 21, 57) were incorrectly grouped with route 133 thread
- ✅ **Safety Check #1**: Alerts must have non-empty `routes` array to attempt thread matching
- ✅ **Safety Check #2**: Threads with empty `affected_routes` are skipped during matching
- ✅ **Deployment**: Updated `poll-alerts` Edge Function deployed via Supabase CLI
- ✅ **Documentation**: Updated threading rules and added "Critical Safety Checks" section

**Technical Details:**

```typescript
// Before: All alerts attempted thread matching
for (const thread of unresolvedThreads || []) { ... }

// After: Only alerts WITH routes attempt matching
if (routes.length > 0) {
  for (const thread of unresolvedThreads || []) {
    const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];

    // Skip threads with no routes
    if (threadRoutes.length === 0) continue;

    // ... route matching logic
  }
}
```

**Impact:**

- Eliminates false positive threading where vague alerts match unrelated routes
- Ensures route extraction is the first gate before similarity matching
- Improves alert accuracy and prevents confusion for users

---

## Troubleshooting Guide

### Common Threading Issues and Solutions

#### Issue: SERVICE_RESUMED Creates Separate Thread

**Symptoms:**

- New thread created with just "service has resumed" text
- Original incident thread stays unresolved
- Two threads for same incident

**Root Cause:**

- SERVICE_RESUMED has very different vocabulary from original alert
- Jaccard similarity is low (~17%) when matching "delay due to collision" vs "regular service resumed"

**Solution (v20):**

1. Lower threshold for SERVICE_RESUMED (10%)
2. Search resolved threads (SERVICE_RESUMED may arrive after thread auto-resolved)
3. Use route family matching (base number)
4. Extended search window (12 hours)

#### Issue: Thread Title Becomes "Service Resumed"

**Symptoms:**

- Thread title shows "507 Long Branch: Regular service has resumed"
- Lost original incident description

**Root Cause:**

- Thread title updated on every alert match
- SERVICE_RESUMED overwrote descriptive incident title

**Solution (v20):**

```typescript
// Only update title if NOT SERVICE_RESUMED
if (category !== "SERVICE_RESUMED") {
  updates.title = text.split("\\n")[0].substring(0, 200);
}
```

#### Issue: Duplicate Threads for Same Incident

**Symptoms:**

- Multiple threads with identical or similar titles
- Same route, same time period

**Root Cause:**

- Multiple alerts arrive simultaneously (batch from Bluesky)
- Race condition: both create threads before either finishes

**Solution (v20):**

- 5-second window duplicate detection before creating new thread
- Check for recently created threads with same base route number
- Join existing thread instead of creating duplicate

#### Issue: Route Badges Not Showing All Routes

**Symptoms:**

- Thread has 37, 37A, 37B alerts but only shows 37 badge
- Latest alert overwrites thread routes instead of merging

**Root Cause:**

- Frontend used `latestAlert.affected_routes` instead of `thread.affected_routes`
- Thread routes weren't being merged when new alerts joined

**Solution:**

1. Backend: Merge routes on thread update
   ```typescript
   const mergedRoutes = [...new Set([...existingRoutes, ...routes])];
   ```
2. Frontend (AlertCard.svelte): Use thread routes for badges
   ```typescript
   const rawRoutes = $derived(threadRoutes);
   ```

#### Issue: JSONB Columns Storing String Instead of Array

**Symptoms:**

- `affected_routes` shows `"[]"` instead of `[]`
- Route extraction works but stored incorrectly
- Fallback route extraction runs unnecessarily

**Root Cause:**

- Double JSON encoding: `JSON.stringify()` called twice
- Or string passed to JSONB column

**Solution:**

- Database trigger `fix_jsonb_string_encoding` auto-corrects on INSERT
- Pass arrays directly to Supabase (it handles serialization)
- Don't use `JSON.stringify()` before insert

---

## Testing Checklist

When modifying threading logic, verify:

1. [ ] New alert with matching route joins existing thread
2. [ ] SERVICE_RESUMED matches and resolves original thread
3. [ ] Thread title preserved when SERVICE_RESUMED arrives
4. [ ] Route variants (37, 37A, 37B) grouped together
5. [ ] Different routes NOT grouped (39 vs 939, 46 vs 996)
6. [ ] Thread routes accumulate all routes from all alerts
7. [ ] No duplicate threads when batch alerts arrive
8. [ ] Route badges display all affected routes in thread
9. [ ] Resolved threads can be matched by SERVICE_RESUMED

---

**Document End**
