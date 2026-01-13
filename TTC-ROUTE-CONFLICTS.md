# TTC Route Conflicts Reference

**Purpose:** Documentation of route number conflicts that could cause threading issues

**Last Updated:** January 12, 2026

---

## Overview

This document identifies TTC bus routes where one route number is a substring of another route number. These conflicts are critical for the alert threading system to handle correctly.

**Total Routes Analyzed:** 158 bus routes
**Problematic Pairs Found:** 29 pairs
**Patterns Identified:** 6 distinct patterns

---

## Summary of Conflicts

### Critical Multi-Way Conflicts

These routes conflict with MULTIPLE other routes and require special attention:

1. **Route 29 (Dufferin)** conflicts with:

   - **329** (Dufferin Night)
   - **929** (Dufferin Express)

2. **Route 35 (Jane)** conflicts with:

   - **335** (Jane Night)
   - **935** (Jane Express)

3. **Route 39 (Finch East)** conflicts with:

   - **339** (Finch East Night)
   - **939** (Finch Express)

4. **Route 86 (Scarborough)** conflicts with:
   - **386** (Scarborough Night)
   - **986** (Scarborough Express)

---

## Pattern A: Regular Routes vs Express Routes (9X)

**Pattern:** "X" and "9X"
**Total Pairs:** 22
**Risk Level:** HIGH

Express routes (900-series) share the same last 2 digits as regular routes and often serve the same street or corridor.

| Regular Route         | Express Route               | Shared Street/Area |
| --------------------- | --------------------------- | ------------------ |
| 24 Victoria Park      | 924 Victoria Park Express   | Victoria Park      |
| 25 Don Mills          | 925 Don Mills Express       | Don Mills          |
| 27 _(not in service)_ | 927 Highway 27 Express      | Highway 27         |
| 29 Dufferin           | 929 Dufferin Express        | Dufferin           |
| 35 Jane               | 935 Jane Express            | Jane               |
| 37 Islington          | 937 Islington Express       | Islington          |
| 38 Highland Creek     | 938 Highland Creek Express  | Highland Creek     |
| **39 Finch East**     | **939 Finch Express**       | **Finch**          |
| 41 Keele              | 941 Keele Express           | Keele              |
| 44 Kipling South      | 944 Kipling South Express   | Kipling South      |
| 45 Kipling            | 945 Kipling Express         | Kipling            |
| 52 Lawrence West      | 952 Lawrence West Express   | Lawrence West      |
| 53 Steeles East       | 953 Steeles East Express    | Steeles East       |
| 54 Lawrence East      | 954 Lawrence East Express   | Lawrence East      |
| 60 Steeles West       | 960 Steeles West Express    | Steeles West       |
| 68 Warden             | 968 Warden Express          | Warden             |
| 84 Sheppard West      | 984 Sheppard West Express   | Sheppard West      |
| 85 Sheppard East      | 985 Sheppard East Express   | Sheppard East      |
| **86 Scarborough**    | **986 Scarborough Express** | **Scarborough**    |
| 89 Weston             | 989 Weston Express          | Weston             |
| 95 York Mills         | 995 York Mills Express      | York Mills         |
| 96 Wilson             | 996 Wilson Express          | Wilson             |

### Why This Pattern Is Problematic

- Both routes serve the same street/corridor
- Alerts for both routes likely mention the same location keywords
- Substring "39" appears in "939", could cause false matches
- Users searching for "86" might get results for "986"

---

## Pattern B: Regular Routes vs Night Routes (3X)

**Pattern:** "X" and "3X"
**Total Pairs:** 6
**Risk Level:** MEDIUM

Night routes (300-series) share the same last 2 digits as regular daytime routes.

| Regular Route      | Night Route               | Shared Street/Area | Additional Conflicts        |
| ------------------ | ------------------------- | ------------------ | --------------------------- |
| 7 Bathurst         | 307 Bathurst Night        | Bathurst           | -                           |
| **29 Dufferin**    | **329 Dufferin Night**    | **Dufferin**       | **Also conflicts with 929** |
| 32 Eglinton West   | 332 Eglinton West Night   | Eglinton West      | -                           |
| **35 Jane**        | **335 Jane Night**        | **Jane**           | **Also conflicts with 935** |
| **39 Finch East**  | **339 Finch East Night**  | **Finch East**     | **Also conflicts with 939** |
| **86 Scarborough** | **386 Scarborough Night** | **Scarborough**    | **Also conflicts with 986** |

### Why This Pattern Is Problematic

- Same corridor served day and night
- Night service alerts might reference same locations as daytime alerts
- Different service types should not thread together
- Time-of-day context could be lost

---

## Pattern C: Regular Routes vs Community Routes (4X)

**Pattern:** "X" and "4X"
**Total Pairs:** 1
**Risk Level:** LOW

Community routes (400-series) potentially conflicting with regular routes.

| Regular Route               | Community Route        | Notes                   |
| --------------------------- | ---------------------- | ----------------------- |
| 2 _(not in active service)_ | 402 Parkdale Community | Different service areas |

### Why This Pattern Is Less Problematic

- Only one conflict found
- Route 2 not in active service
- Different service types (regular vs community)
- Less likely to have overlapping alerts

---

## Technical Risk Explanation

### Substring Matching Risk

If the threading system uses simple substring checks:

```javascript
// ❌ WRONG - Substring matching
if (alertText.includes("39")) {
  // This matches BOTH "39 Finch East" AND "939 Finch Express"
}

// ✅ CORRECT - Exact route number extraction
const routeNum = alertText.match(/^\d+[A-Z]?/i)?.[0]; // "39" or "939"
if (routeNum === "39") {
  // Only matches route 39
}
```

### Real-World Scenario

**Incident on Finch Avenue:**

```
Alert 1 (10:00 AM):
"39 Finch East: Detour via Kennedy Rd due to broken railway crossing"

Alert 2 (10:05 AM):
"939 Finch Express: Detour via Kennedy Rd due to broken railway crossing"

Alert 3 (11:30 AM):
"39 Finch East: Regular service has resumed on Finch Ave"
```

**Problem:** All three alerts mention:

- Substring "39" (appears in both "39" and "939")
- Same street: "Finch"
- Same location: "Kennedy Rd"

**Without proper validation:**

- All three alerts could be incorrectly threaded together
- Route 939 contamination in route 39 thread
- Users see mixed alerts from different routes

**With proper validation:**

- Route 39 alerts thread together (Alert 1 + Alert 3)
- Route 939 alert stays in separate thread (Alert 2)
- Each route maintains its own thread

---

## Current Mitigation

The alert threading system implements exact route number matching to prevent these conflicts:

### Route Number Extraction (poll-alerts/index.ts)

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

### Thread Matching (poll-alerts/index.ts)

```typescript
// Use exact route number matching to prevent 46 matching 996, etc.
const hasRouteOverlap = routes.some((alertRoute) =>
  threadRoutes.some((threadRoute) => routesMatch(alertRoute, threadRoute))
);
```

---

## Validation Examples

### Correct Threading

✅ **Route 39 alerts thread together:**

- `routesMatch("39 Finch East", "39 Finch")` → `true` (both have route number: 39)

✅ **Route 939 alerts thread together:**

- `routesMatch("939 Finch Express", "939")` → `true` (both have route number: 939)

✅ **Different routes stay separate:**

- `routesMatch("86 Scarborough", "986 Scarborough Express")` → `false` (86 ≠ 986)
- `routesMatch("39 Finch East", "339 Finch East Night")` → `false` (39 ≠ 339)
- `routesMatch("46 Martin Grove", "996 Wilson Express")` → `false` (46 ≠ 996)

### Incorrect Threading (Prevented)

❌ **Cross-route contamination blocked:**

- "39" thread + "939" alert → BLOCKED (39 ≠ 939)
- "86" thread + "986" alert → BLOCKED (86 ≠ 986)
- "46" thread + "996" alert → BLOCKED (46 ≠ 996)
- "96" thread + "996" alert → BLOCKED (96 ≠ 996)

---

## Test Cases

### Critical Test Scenarios

**Test Case 1: Route 46 vs 996 (Real Bug - Fixed Dec 4, 2025)**

```
Thread: Route 996 (affected_routes: ["996 Wilson Express"])
Alert: Route 46 (affected_routes: ["46 Martin Grove"])
Expected: BLOCKED - Different route numbers (996 ≠ 46)
```

**Test Case 2: Route 39 vs 939 vs 339**

```
Thread: Route 39 (affected_routes: ["39 Finch East"])
Alert: Route 939 (affected_routes: ["939 Finch Express"])
Expected: BLOCKED - Different route numbers (39 ≠ 939)

Thread: Route 39 (affected_routes: ["39 Finch East"])
Alert: Route 339 (affected_routes: ["339 Finch East Night"])
Expected: BLOCKED - Different route numbers (39 ≠ 339)
```

**Test Case 3: Route 86 vs 986 vs 386**

```
Thread: Route 86 (affected_routes: ["86 Scarborough"])
Alert: Route 986 (affected_routes: ["986 Scarborough Express"])
Expected: BLOCKED - Different route numbers (86 ≠ 986)

Thread: Route 86 (affected_routes: ["86 Scarborough"])
Alert: Route 386 (affected_routes: ["386 Scarborough Night"])
Expected: BLOCKED - Different route numbers (86 ≠ 386)
```

**Test Case 4: Same route, different names**

```
Thread: Route 39 (affected_routes: ["39 Finch East"])
Alert: Route 39 (affected_routes: ["39 Finch"])
Expected: ALLOWED - Same route number (39 = 39)
```

---

## Frontend Route Filtering

The frontend also requires exact route matching when filtering alerts for "My Routes" or individual route pages.

### Affected Files

| File                                             | Function               | Description                 |
| ------------------------------------------------ | ---------------------- | --------------------------- |
| `src/lib/components/alerts/MyRouteAlerts.svelte` | `matchesRoutes()`      | My Routes tab filtering     |
| `src/lib/stores/alerts.ts`                       | `getAlertsByRoutes()`  | Store-level route filtering |
| `src/routes/routes/[route]/+page.svelte`         | `$derived routeAlerts` | Individual route page       |

### Implementation

```typescript
// Helper to normalize route ID for comparison (remove leading zeros, lowercase)
function normalizeRouteId(route: string): string {
  return route.replace(/^0+/, "").toLowerCase();
}

// Exact match only - no substring matching
function routesMatch(route1: string, route2: string): boolean {
  return normalizeRouteId(route1) === normalizeRouteId(route2);
}
```

### Common Bug Pattern (AVOIDED)

❌ **WRONG - Substring matching causes false positives:**

```typescript
// Route 11 would match 119 and 511!
threadRoute.includes(savedRoute) || savedRoute.includes(threadRoute);
```

✅ **CORRECT - Exact match only:**

```typescript
normalizeRouteId(threadRoute) === normalizeRouteId(savedRoute);
```

---

## Pattern D: Subway Lines vs Bus Routes with Same Street Names

**Pattern:** "Line X [Street Name]" vs "XX [Street Name]"
**Risk Level:** HIGH

Subway lines are named after the streets they run on, which can conflict with bus routes serving those same streets.

| Subway Line                     | Bus Route(s) with Same Name | Street/Area  |
| ------------------------------- | --------------------------- | ------------ |
| Line 1 Yonge-University         | (no direct conflicts)       | Yonge        |
| Line 2 Bloor-Danforth           | (no direct conflicts)       | Bloor        |
| Line 4 Sheppard                 | 84/85 Sheppard              | Sheppard     |
| **Line 5 Eglinton**             | **32 Eglinton West**        | **Eglinton** |
| **Line 6 Finch West** (planned) | 36 Finch West               | Finch West   |

### Why This Pattern Is Problematic

- Street name "Eglinton" appears in both "Line 5 Eglinton" and "32 Eglinton West"
- Street name "Sheppard" appears in both "Line 4 Sheppard" and "84/85 Sheppard"
- Naive string matching could confuse bus routes for subway lines
- UI would show wrong badge color (orange subway instead of green bus)

### Historical Bug (Fixed December 18, 2025)

❌ **WRONG - Street name matching caused false positives:**

```typescript
// This incorrectly matched "32 Eglinton West" as Line 5!
if (routeLower.includes("eglinton")) {
  return "route-line-5";
}
```

✅ **CORRECT - Explicit subway line detection only:**

```typescript
// Only match explicit "Line X" patterns or single digits 1-6
function isSubwayLineRoute(route: string): boolean {
  const routeLower = route.toLowerCase().trim();
  return (
    routeLower.match(/^line\s*[1-6]/) !== null ||
    route.trim().match(/^[1-6]$/) !== null
  );
}
```

### Affected Files (Fixed)

| File                                          | Function                | Fix Applied                         |
| --------------------------------------------- | ----------------------- | ----------------------------------- |
| `src/lib/components/alerts/RouteBadge.svelte` | `getRouteClass()`       | Only match "Line X" or single digit |
| `src/lib/components/alerts/AlertCard.svelte`  | `isSubwayLineRoute()`   | Only match "Line X" or single digit |
| `src/lib/components/alerts/AlertCard.svelte`  | `normalizeSubwayLine()` | Only normalize explicit subway refs |

---

## Pattern E: Route Branch Variations (A-Z Suffixes)

**Pattern:** Route number followed by branch letter suffix
**Risk Level:** LOW (handled correctly)
**Total Variations:** 118 branches across 66 routes

TTC uses letter suffixes to indicate route branches (different service patterns on the same route number).

### Branch Letters in Use

| Letter | Count | Description             | Examples         |
| ------ | ----- | ----------------------- | ---------------- |
| **A**  | 47    | Primary/default branch  | 97A, 100A, 504A  |
| **B**  | 34    | Secondary branch        | 97B, 939B, 985B  |
| **C**  | 16    | Tertiary branch         | 102C, 927C, 939C |
| **D**  | 10    | Fourth branch           | 102D, 504D, 960D |
| **F**  | 2     | Special variation       | 52F, 123F        |
| **G**  | 1     | Special variation       | 52G              |
| **S**  | 2     | Shuttle/special service | 79S, 336S        |

### Routes with Most Branches

| Route                 | Branches | Full List               |
| --------------------- | -------- | ----------------------- |
| **52 Lawrence West**  | 5        | 52A, 52B, 52D, 52F, 52G |
| **97 Yonge**          | 3        | 97A, 97B, 97C           |
| **102 Markham Rd**    | 2        | 102C, 102D              |
| **939 Finch Express** | 2        | 939B, 939C              |
| **84 Sheppard West**  | 3        | 84A, 84C, 84D           |

### Extraction Regex (poll-alerts v138+)

```typescript
// Supports ALL letters A-Z (future-proof)
const routeBranchWithNameMatch = text.match(
  /\b(\d{1,3}[A-Z])\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/gi
);

// Stop words prevent capturing "97B Yonge Regular" as route name
const stopWords = [
  "regular",
  "service",
  "detour",
  "diversion",
  "shuttle",
  "delay",
  "resumed",
  "closed",
  "suspended",
];
```

### Why Branches Are NOT Conflicts

- **97A** and **97B** are intentionally separate branches of route 97
- Alerts may be specific to one branch (e.g., "97B Yonge Detour")
- The `extractRouteNumber()` function extracts "97" from both, allowing them to thread together when appropriate
- UI can show specific branch badge (e.g., "97B") when alert specifies it

### Auto-Update Schedule

Branch data is automatically refreshed weekly:

- **Schedule:** Sundays 2:00 AM UTC
- **Workflow:** `.github/workflows/refresh-route-data.yml`
- **Source:** NextBus API
- **Output:** `ttc-route-branches.json`

---

## Pattern F: Scheduled Closures vs Real-Time Incidents (v142)

**Pattern:** Same route with different incident types
**Risk Level:** MEDIUM (now handled correctly)
**Solution:** Separate thread IDs for scheduled closures

### The Problem

Before v142, all alerts for the same route and category went to the same thread:

```
Alert 1: "Line 1: No service Finch-Eglinton starting 11 PM nightly for tunnel improvements"
         → thread-ttc-line1-service_disruption

Alert 2: "Line 1: Delays southbound at Cedarvale due to security incident"
         → thread-ttc-line1-delay (initially)
         → BUT could match thread-ttc-line1-service_disruption if similarity ≥25%
```

This caused unrelated incidents to be grouped together.

### The Solution (v142)

Scheduled closures now get their own dedicated thread ID:

```typescript
function isScheduledClosure(headerText: string): boolean {
  const lowerText = (headerText || '').toLowerCase();
  const scheduledPatterns = [
    /starting\s+\d+\s*(p\.?m\.?|a\.?m\.?),?\s*nightly/i,
    /nightly.*from\s+\d+/i,
    /for\s+(tunnel|track|signal|maintenance|construction)\s+(improvements?|work|repairs?)/i,
    /there will be no.*service.*starting/i,
    /no\s+(subway\s+)?service.*starting\s+\d+/i,
  ];
  return scheduledPatterns.some((pattern) => pattern.test(lowerText));
}

// In processDisruptionAlerts():
const isScheduled = isScheduledClosure(headerText);
const threadType = isScheduled ? 'scheduled_closure' : category.toLowerCase();
const threadId = matchedThreadId || `thread-ttc-${routeKey}-${threadType}`;
```

### Resulting Thread IDs

| Alert Type | Example | Thread ID |
|-----------|---------|-----------|
| **Scheduled closure** | "Line 1: No service Finch-Eglinton starting 11 PM nightly..." | `thread-ttc-line1-scheduled_closure` |
| **Real-time delay** | "Line 1: Delays at Cedarvale due to security incident" | `thread-ttc-line1-delay` |
| **Real-time disruption** | "Line 1: No service due to fire investigation" | `thread-ttc-line1-service_disruption` |
| **Shuttle replacement** | "512 St Clair: Streetcars replaced by buses..." | `thread-ttc-512-shuttle` |

### Why This Matters

1. **Scheduled maintenance** is planned and announced days in advance
2. **Real-time incidents** happen unexpectedly and need immediate attention
3. Users shouldn't see scheduled closures mixed with actual emergencies
4. The "Scheduled" tab shows maintenance; "Disruptions" tab shows real incidents

---

## Monitoring

The Edge Function logs route comparisons when debugging is needed. Check Supabase Edge Function logs for threading decisions.

---

## References

- **[TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)** - Complete list of all TTC bus routes
- **[alert-categorization-and-threading.md](alert-categorization-and-threading.md)** - Threading algorithm documentation
- **[supabase/functions/poll-alerts/index.ts](supabase/functions/poll-alerts/index.ts)** - Edge Function implementation

---

**Version:** 1.5
**Created:** November 20, 2025
**Updated:** January 12, 2026
**Purpose:** Route conflict reference for alert threading system
