# Route Page Enhancement - Implementation Checklist

## Overview

Enhanced routes page with stops, map preview, and ETA integration.

**Decisions Made:**

- Map Library: Leaflet + OpenStreetMap (40KB, free tiles)
- Route Shapes: Connect stops in sequence (no shapes.txt import)
- ETA API: Client-side NextBus calls (unlimited, no Edge Function overhead)

---

## Phase 1: Foundation ✅

### Dependencies

- [x] Install `leaflet` package
- [x] Install `@types/leaflet` for TypeScript
- [x] Leaflet CSS dynamically imported in component

### Data Layer

- [x] Create `src/lib/services/nextbus.ts` - Client-side NextBus API

  - [x] `fetchStopETA(stopId: string)` function
  - [x] In-memory cache with 30s TTL
  - [x] Error handling and timeout
  - [x] TypeScript interfaces for responses
  - [x] `filterPredictionsForRoute()` helper
  - [x] `fetchMultipleStopETAs()` batch function

- [x] Extend `src/lib/data/stops-db.ts`
  - [x] `getStopsByRouteGroupedByDirection(routeId: string)` function
  - [x] Returns `DirectionGroup[]` with stops grouped by direction
  - [x] Direction normalization (Eastbound, Westbound, etc.)
  - [x] Stops sorted by geographic position within each direction
  - [x] `DIRECTION_COLORS` for consistent styling
  - [x] `getRouteCenterPoint()` and `getRouteBounds()` helpers

---

## Phase 2: Components ✅

### Map Component

- [x] Create `src/lib/components/stops/RouteMapPreview.svelte`
  - [x] Props: `stops`, `routeColor`, `routeName`, `onStopClick`
  - [x] Leaflet map initialization (dynamic import)
  - [x] OpenStreetMap tile layer
  - [x] Stop markers with popups (stop name, ID)
  - [x] Polyline connecting stops (dashed, approximate route)
  - [x] Auto-fit bounds to show all stops
  - [x] Collapsible/expandable toggle
  - [x] Loading skeleton while map initializes
  - [x] Error state with retry button

### Stop List Component

- [x] Create `src/lib/components/stops/RouteStopsList.svelte`

  - [x] Props: `stops`, `direction`, `isLoading`, `onGetETA`, `expandedStopId`
  - [x] Scrollable list with stop items
  - [x] Staggered fade-in animation (40ms increments)
  - [x] Loading skeleton state
  - [x] Empty state if no stops

- [x] Create `src/lib/components/stops/RouteStopItem.svelte`
  - [x] Props: `stop`, `index`, `routeFilter`, `isExpanded`, `onGetETA`
  - [x] Stop name with numbered index
  - [x] "Get ETA" button (compact)
  - [x] Expandable inline ETA display
  - [x] Loading state while fetching ETA
  - [x] Live indicator for real-time GPS data
  - [x] Multiple arrivals display with timing badges
  - [x] Direction info for each prediction

### Direction Tabs Component

- [x] Create `src/lib/components/stops/RouteDirectionTabs.svelte`
  - [x] Props: `directions`, `selected`, `onSelect`, `stopCounts`
  - [x] Tab buttons with direction icons
  - [x] Direction-specific colors (sky=East, amber=West, etc.)
  - [x] Underline indicator for selected tab
  - [x] Stop count badges
  - [x] Responsive labels (short on mobile, full on desktop)

---

## Phase 3: Route Detail Page Enhancement ✅

### Update `src/routes/routes/[route]/+page.svelte`

- [x] Import new components
- [x] Fetch stops on mount using `getStopsByRouteGroupedByDirection()`
- [x] Add "Stops & Schedule" section below alerts
- [x] Direction tabs at top of section
- [x] Map preview (collapsible)
- [x] Stop list with ETA buttons
- [x] Inline ETA expansion when user clicks "Get ETA"
- [x] Loading skeletons for stops/map
- [x] Error state if stops fetch fails
- [x] Total stops count display

---

## Phase 4: Testing

### Manual Testing (TODO)

- [ ] Test with streetcar route (501 Queen)
- [ ] Test with bus route (7 Bathurst)
- [ ] Test with express bus (900 series)
- [ ] Test with night bus (300 series)
- [ ] Test ETA loading and display
- [ ] Test map zoom and pan
- [ ] Test direction tab switching
- [ ] Test on mobile viewport
- [ ] Test map click → stop selection
- [ ] Test offline behavior

### Notes

- Subway lines may not have stop data in the database
- Some routes may have all stops in "All Stops" if direction data missing

---

## Files Created/Modified

### New Files ✅

1. `src/lib/services/nextbus.ts` - Client-side NextBus API
2. `src/lib/components/stops/RouteMapPreview.svelte` - Leaflet map
3. `src/lib/components/stops/RouteStopsList.svelte` - Stop list wrapper
4. `src/lib/components/stops/RouteStopItem.svelte` - Individual stop with ETA
5. `src/lib/components/stops/RouteDirectionTabs.svelte` - Direction selector

### Modified Files ✅

1. `src/lib/data/stops-db.ts` - Added direction grouping functions
2. `src/routes/routes/[route]/+page.svelte` - Added stops/map sections
3. `package.json` - Added Leaflet dependencies

---

## Build Verification ✅

```
✓ Build completed successfully
✓ Leaflet CSS: 15.61 kB (gzip: 6.46 kB)
✓ All components compile without errors
```

---

## Free Tier Status

| Metric                  | Impact                                       |
| ----------------------- | -------------------------------------------- |
| Supabase Edge Functions | No additional calls - ETA is client-side     |
| Database size           | No change                                    |
| Static assets           | +~50KB for Leaflet (code-split, lazy loaded) |
| API calls               | Client → NextBus directly (unlimited)        |
