# Alert Categorization and Threading System

**Version:** 3.1  
**Date:** December 4, 2025  
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
2. **Multi-category tagging** - Alerts can match multiple non-exclusive categories
3. **Effect-based categorization** - Focus on service impact, not cause
4. **Incident threading** - Group related updates using Jaccard similarity + route matching
5. **Frontend filtering** - Mutually exclusive category filters in UI
6. **Planned alert separation** - Maintenance alerts excluded from main feed

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Bluesky API    │────▶│  poll-alerts         │────▶│  Supabase DB    │
│  @ttcalerts     │     │  (Edge Function)     │     │  alert_cache    │
└─────────────────┘     └──────────────────────┘     │  incident_      │
                                                      │  threads        │
                                                      └────────┬────────┘
                                                               │
                        ┌──────────────────────┐               │
                        │  Svelte Frontend     │◀──────────────┘
                        │  alerts.ts store     │
                        │  + Realtime sub      │
                        └──────────────────────┘
```

**Stack:**

- **Frontend:** Svelte 5 + TypeScript + Tailwind + shadcn-svelte
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **Hosting:** Cloudflare Pages
- **Data Source:** Bluesky AT Protocol (public API)

---

## Alert Sources

### Current Implementation

**Primary Source: Bluesky**

- Official TTC account: [@ttcalerts.bsky.social](https://bsky.app/profile/ttcalerts.bsky.social)
- **API:** Bluesky AT Protocol public API
- **Endpoint:** `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`
- **Polling:** Edge function fetches last 50 posts per invocation
- **Deduplication:** Uses `bluesky_uri` as unique identifier
- **Status:** ✅ Enabled (primary and only source)

**GTFS-Realtime:** ⏸️ Disabled (all GTFS alerts also appear on Bluesky)

### Key Principles

- **Effect > Cause** - "No service" matters more than "due to security incident"
- **Non-exclusive categories** - Alert can be `SERVICE_DISRUPTION` + `SUBWAY`
- **Simple threading** - 50% text similarity for general matching, 20% for SERVICE_RESUMED
- **Latest first** - Most recent update at top of thread
- **Exact route number matching** - Threading uses route NUMBER comparison (e.g., "46" ≠ "996")

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
   - If SERVICE_RESUMED → mark thread as resolved
6. If no match:
   - Create new thread
   - Link alert to new thread
```

### Thread States

- **ACTIVE** (`is_resolved = false`) - Incident ongoing
- **RESOLVED** (`is_resolved = true`) - Closed by SERVICE_RESUMED or age

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

**Trigger:** Cron schedule (every 2 minutes)  
**Purpose:** Fetch, categorize, and thread alerts from Bluesky

**Flow:**

1. Fetch latest posts from @ttcalerts.bsky.social
2. For each post:
   - Extract text and routes
   - Determine category from keywords
   - Find or create incident thread
   - Store in `alert_cache`
3. Update Realtime subscriptions

### `scrape-maintenance`

**Trigger:** Cron schedule (daily)  
**Purpose:** Scrape planned maintenance from TTC website

**Flow:**

1. Fetch TTC service alerts page
2. Parse maintenance announcements
3. Upsert into `planned_maintenance` table

---

## Summary

This system provides:

✅ **Single source (Bluesky)** - @ttcalerts.bsky.social via AT Protocol  
✅ **Keyword-based categorization** - 6 categories with priority ordering  
✅ **Incident threading** - Jaccard similarity + exact route number matching  
✅ **Cross-route prevention** - Route 46 cannot match with 996, 39 cannot match with 939  
✅ **Smart SERVICE_RESUMED** - Lower threshold (20%) for different vocabulary  
✅ **Auto-resolve** - SERVICE_RESUMED closes threads  
✅ **Mutually exclusive filters** - One category filter at a time  
✅ **Planned alert separation** - Maintenance excluded from main feed  
✅ **Realtime updates** - Supabase subscriptions push changes  
✅ **Observable** - Thread state visible in UI

**Architecture:**

```
Bluesky API → poll-alerts Edge Function → Supabase PostgreSQL
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

| Resource                      | Limit   | Period  |
| ----------------------------- | ------- | ------- |
| **Egress (Data Transfer)**    | 5 GB    | Monthly |
| **Database Size**             | 500 MB  | Total   |
| **Edge Function Invocations** | 500,000 | Monthly |
| **Realtime Connections**      | 200     | Concurrent |
| **Realtime Messages**         | 2M      | Monthly |

### Realtime-First Architecture (Current)

**How it works:**
- Initial page load fetches alerts once (~50 KB)
- Supabase Realtime pushes only new/changed alerts (~500 bytes each)
- No polling - updates arrive instantly
- Manual refresh button available if needed

**Data Transfer Per User Session:**

| Activity | Data Transfer |
|----------|---------------|
| Initial page load | ~50 KB |
| Per new alert (pushed) | ~500 bytes |
| 10-min session (2 alerts) | ~51 KB |
| 1-hour session (5 alerts) | ~52.5 KB |

**Comparison with Polling (old approach):**

| Metric | Polling (old) | Realtime (current) | Savings |
|--------|---------------|-------------------|---------|
| 10-min session | ~115 KB | ~51 KB | **56%** |
| 1-hour session | ~350 KB | ~52.5 KB | **85%** |
| Data per new alert | 2.5 KB poll | 0.5 KB push | **80%** |

### Monthly User Capacity

| User Type             | Sessions/Month | Max Users (Realtime) |
| --------------------- | -------------- | -------------------- |
| Casual (2x/week)      | 8              | **~12,500** |
| Regular (daily)       | 30             | **~3,300** |
| Power (3x/day)        | 90             | **~1,100** |
| **Mixed (realistic)** | ~23 avg        | **~4,400** |

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

| Resource | Usage | Limit | Status |
|----------|-------|-------|--------|
| Egress | ~1-2 GB | 5 GB | ✅ Safe |
| Realtime Messages | ~150K | 2M | ✅ Safe |
| Edge Invocations | ~22K | 500K | ✅ Safe |
| Concurrent Connections | ~100 | 200 | ✅ Safe |

**Current safe capacity:** ~4,000 monthly active users on free tier

---

**Document End**
