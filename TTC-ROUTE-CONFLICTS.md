# TTC Route Conflicts Reference

**Purpose:** Documentation of route number conflicts that could cause threading issues

**Last Updated:** December 4, 2025

---

## Overview

This document identifies TTC bus routes where one route number is a substring of another route number. These conflicts are critical for the alert threading system to handle correctly.

**Total Routes Analyzed:** 158 bus routes
**Problematic Pairs Found:** 29 pairs
**Patterns Identified:** 3 distinct patterns

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

| Regular Route | Express Route | Shared Street/Area |
|--------------|---------------|-------------------|
| 24 Victoria Park | 924 Victoria Park Express | Victoria Park |
| 25 Don Mills | 925 Don Mills Express | Don Mills |
| 27 *(not in service)* | 927 Highway 27 Express | Highway 27 |
| 29 Dufferin | 929 Dufferin Express | Dufferin |
| 35 Jane | 935 Jane Express | Jane |
| 37 Islington | 937 Islington Express | Islington |
| 38 Highland Creek | 938 Highland Creek Express | Highland Creek |
| **39 Finch East** | **939 Finch Express** | **Finch** |
| 41 Keele | 941 Keele Express | Keele |
| 44 Kipling South | 944 Kipling South Express | Kipling South |
| 45 Kipling | 945 Kipling Express | Kipling |
| 52 Lawrence West | 952 Lawrence West Express | Lawrence West |
| 53 Steeles East | 953 Steeles East Express | Steeles East |
| 54 Lawrence East | 954 Lawrence East Express | Lawrence East |
| 60 Steeles West | 960 Steeles West Express | Steeles West |
| 68 Warden | 968 Warden Express | Warden |
| 84 Sheppard West | 984 Sheppard West Express | Sheppard West |
| 85 Sheppard East | 985 Sheppard East Express | Sheppard East |
| **86 Scarborough** | **986 Scarborough Express** | **Scarborough** |
| 89 Weston | 989 Weston Express | Weston |
| 95 York Mills | 995 York Mills Express | York Mills |
| 96 Wilson | 996 Wilson Express | Wilson |

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

| Regular Route | Night Route | Shared Street/Area | Additional Conflicts |
|--------------|-------------|-------------------|---------------------|
| 7 Bathurst | 307 Bathurst Night | Bathurst | - |
| **29 Dufferin** | **329 Dufferin Night** | **Dufferin** | **Also conflicts with 929** |
| 32 Eglinton West | 332 Eglinton West Night | Eglinton West | - |
| **35 Jane** | **335 Jane Night** | **Jane** | **Also conflicts with 935** |
| **39 Finch East** | **339 Finch East Night** | **Finch East** | **Also conflicts with 939** |
| **86 Scarborough** | **386 Scarborough Night** | **Scarborough** | **Also conflicts with 986** |

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

| Regular Route | Community Route | Notes |
|--------------|-----------------|-------|
| 2 *(not in active service)* | 402 Parkdale Community | Different service areas |

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
if (alertText.includes('39')) {
  // This matches BOTH "39 Finch East" AND "939 Finch Express"
}

// ✅ CORRECT - Exact route number extraction
const routeNum = alertText.match(/^\d+[A-Z]?/i)?.[0]; // "39" or "939"
if (routeNum === '39') {
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
const hasRouteOverlap = routes.some(alertRoute => 
  threadRoutes.some(threadRoute => routesMatch(alertRoute, threadRoute))
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

## Monitoring

The Edge Function logs route comparisons when debugging is needed. Check Supabase Edge Function logs for threading decisions.

---

## References

- **[TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)** - Complete list of all TTC bus routes
- **[alert-categorization-and-threading.md](alert-categorization-and-threading.md)** - Threading algorithm documentation
- **[supabase/functions/poll-alerts/index.ts](supabase/functions/poll-alerts/index.ts)** - Edge Function implementation

---

**Version:** 1.1
**Created:** November 20, 2025
**Updated:** December 4, 2025
**Purpose:** Route conflict reference for alert threading system
