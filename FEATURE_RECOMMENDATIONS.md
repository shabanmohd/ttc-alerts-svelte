# Feature Recommendations: TTC Alerts PWA

Based on analysis of [TO-Bus](https://github.com/TO-Bus/to-bus-ca), [HK Independent Bus ETA](https://github.com/hkbus/hk-independent-bus-eta), and current TTC Alerts implementation.

---

## Executive Summary

TTC Alerts excels at **real-time service alerts** with intelligent threading, push-based updates via Supabase Realtime, and WebAuthn biometric authentication. Compared apps offer **complementary features**:

- **TO-Bus** (Toronto): ETAs, stop bookmarks, nearby stops, maps, i18n
- **HK Bus ETA** (Hong Kong): Collections with scheduling, point-to-point search, weather integration, advanced offline caching, watch apps

### Current Strengths (TTC Alerts)

- ✅ Superior alert categorization (Disruption, Delay, Detour, Resumed)
- ✅ Incident threading with history
- ✅ Supabase Realtime (push) vs polling
- ✅ WebAuthn + recovery codes authentication
- ✅ WCAG AA accessibility, Lexend font
- ✅ Dark mode support

### Gaps vs Competitors

- ❌ No ETA predictions
- ❌ No stop/route bookmarks
- ❌ No nearby stops (geolocation)
- ❌ No vehicle location maps
- ❌ No route browser
- ❌ English only (no i18n)
- ❌ No collections with time-based scheduling
- ❌ No weather integration
- ❌ Limited offline support

---

## Feature Comparison Matrix: TTC Alerts vs TO-Bus vs HK Bus ETA

| Feature                   | TTC Alerts          | TO-Bus         | HK Bus ETA                    | Notes                    |
| ------------------------- | ------------------- | -------------- | ----------------------------- | ------------------------ |
| **Core Focus**            | Service alerts      | ETAs           | ETAs + Routes                 | Different use cases      |
| **Real-time Updates**     | ✅ Supabase push    | ✅ 60s polling | ✅ 20s polling                | TTC most efficient       |
| **Authentication**        | ✅ WebAuthn         | ❌ None        | ❌ None                       | TTC only with auth       |
| **Saved Routes**          | ⚠️ Preferences only | ✅ Bookmarks   | ✅ Collections + Schedules    | HK most advanced         |
| **Time-Based Display**    | ❌                  | ❌             | ✅ Show routes by time of day | Unique to HK             |
| **Nearby Stops**          | ❌                  | ✅ Geolocation | ✅ Configurable range         | Both competitors have it |
| **Point-to-Point Search** | ❌                  | ❌             | ✅ Web Worker + DFS           | Unique to HK             |
| **Maps**                  | ❌                  | ✅ OpenLayers  | ✅ Leaflet + PMTiles          | Both competitors have it |
| **i18n**                  | ❌ English only     | ✅ EN/FR/ZH    | ✅ EN/ZH                      | Need multi-language      |
| **Offline Support**       | ⚠️ Basic SW         | ✅ IndexedDB   | ✅ Full IndexedDB + Workbox   | HK most robust           |
| **Weather Integration**   | ❌                  | ❌             | ✅ HK Observatory             | Unique to HK             |
| **Watch Apps**            | ❌                  | ❌             | ✅ Apple Watch/Wear OS        | Unique to HK             |
| **Share as Image**        | ❌                  | ❌             | ✅ dom-to-image               | Unique to HK             |
| **Accessibility**         | ✅ WCAG AA          | ⚠️ Basic ARIA  | ⚠️ Basic                      | TTC best                 |
| **List Virtualization**   | ❌                  | ❌             | ✅ react-window               | HK handles large lists   |
| **Energy/Battery Mode**   | ❌                  | ❌             | ✅ Reduces fetching           | Unique to HK             |

---

## HK Bus ETA: Deep Dive

### Tech Stack

| Category             | Technology                                  |
| -------------------- | ------------------------------------------- |
| **Framework**        | React 18 + TypeScript                       |
| **Build Tool**       | Vite with SWC                               |
| **UI Library**       | Material-UI (MUI) v5                        |
| **State Management** | React Context + Immer                       |
| **PWA**              | VitePWA + Workbox                           |
| **Maps**             | Leaflet + PMTiles (self-hosted tiles)       |
| **i18n**             | react-i18next                               |
| **Data Storage**     | IndexedDB + localStorage                    |
| **Virtualization**   | react-window + react-virtualized-auto-sizer |
| **Image Generation** | dom-to-image + merge-images                 |

### Unique Features Worth Adopting

#### 1. **Collections with Time-Based Scheduling** ⭐

Users organize routes into collections (Home, Work) that show/hide based on time of day.

```typescript
interface RouteCollection {
  name: string; // "Morning Commute"
  list: string[]; // Route IDs
  schedules: DaySchedule[];
}

interface DaySchedule {
  day: number; // 0-6 (Sunday-Saturday)
  start: string; // "07:00"
  end: string; // "09:00"
}
```

**Value for TTC Alerts**: Show relevant saved routes/alerts automatically based on commute times.

#### 2. **Visibility-Aware Data Fetching** ⭐

Pauses API calls when app is backgrounded to save battery and data.

```typescript
const { isVisible } = useContext(AppContext);

const fetchData = useCallback(() => {
  if (!isVisible) {
    setEtas(null);
    return; // Skip fetch when tab not visible
  }
  // ... fetch data
}, [isVisible]);
```

**Value for TTC Alerts**: Reduce Supabase egress and improve battery life.

#### 3. **Web Workers for Heavy Computation**

Route search calculations run in a Web Worker to avoid blocking the UI.

**Value for TTC Alerts**: Could use for filtering large alert lists or route matching.

#### 4. **Database Versioning & Auto-Renewal**

Tracks data freshness and automatically refreshes after 7 days.

```typescript
const autoRenewThreshold = 7 * 24 * 3600 * 1000; // 7 days
const updateTime = parseInt(localStorage.getItem("updateTime") || "0");
if (Date.now() - updateTime > autoRenewThreshold) {
  await refreshDatabase();
}
```

**Value for TTC Alerts**: Ensure cached stop data stays current.

#### 5. **Share Alert as Image**

Generates shareable images from route/stop info using `dom-to-image`.

**Value for TTC Alerts**: Let users share service alerts on social media.

#### 6. **Energy Mode**

User toggle to reduce data fetching frequency and disable map rendering.

**Value for TTC Alerts**: Useful for users with limited data plans.

#### 7. **Haptic Feedback**

Configurable vibration for button presses.

```typescript
vibrate(vibrateDuration); // 0 = off, 1 = on
```

**Value for TTC Alerts**: Improve tactile feedback on mobile.

---

## Recommended Features

### Priority 1: High Impact, Low-Medium Effort

#### 1. Internationalization (i18n)

**Impact**: High | **Effort**: Medium | **Supabase Impact**: None

Toronto has significant French and Chinese populations. Support EN/FR/ZH.

**Implementation**:

```
src/lib/i18n/
├── index.ts          # svelte-i18n setup
├── en.json           # English translations
├── fr.json           # French translations
└── zh.json           # Simplified Chinese
```

**Tech Options**:

- `svelte-i18n` - Runtime switching, simple API
- `paraglide-js` - Compile-time, better performance

**Supabase Impact**: Zero - translations bundled client-side via Vite.

---

#### 2. Stop Bookmarks System

**Impact**: High | **Effort**: Medium | **Supabase Impact**: Low

Allow users to save favorite stops for quick access.

**Database Schema**:

```sql
CREATE TABLE public.stop_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  route_tags TEXT[],
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stop_id)
);

-- RLS Policy
ALTER TABLE public.stop_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON public.stop_bookmarks
  FOR ALL USING (auth.uid() = user_id);
```

**Components**:

```
src/lib/components/bookmarks/
├── StopBookmarks.svelte      # Bookmark list
├── BookmarkButton.svelte     # Add/remove button
└── BookmarkCard.svelte       # Individual bookmark
```

**Storage Strategy**:

- Authenticated users: Sync to Supabase (cross-device)
- Anonymous users: localStorage only

**Supabase Impact**:

- Database: ~200 bytes/bookmark, ~20 MB at 10K users
- Egress: ~50 MB/month additional

---

#### 3. Enhanced PWA Caching

**Impact**: High | **Effort**: Low | **Supabase Impact**: Reduces egress

Improve offline experience with runtime caching.

**Update `static/sw.js`**:

```javascript
const CACHE_NAME = "ttc-alerts-v2";
const RUNTIME_CACHE = "ttc-runtime-v1";

// Runtime caching strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // NetworkFirst for alerts (fresh data preferred)
  if (url.pathname.includes("/rest/v1/alert_cache")) {
    event.respondWith(networkFirst(event.request, "alerts-cache", 3600));
  }

  // CacheFirst for maintenance (changes rarely)
  if (url.pathname.includes("/rest/v1/planned_maintenance")) {
    event.respondWith(cacheFirst(event.request, "maintenance-cache", 86400));
  }
});

async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}

async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}
```

---

#### 4. SMS Fallback UI

**Impact**: Low | **Effort**: Low | **Supabase Impact**: None

Show TTC SMS shortcode when offline or API unavailable.

```svelte
<!-- In error states or offline banner -->
<div class="sms-fallback">
  <p>Can't connect? Text your stop ID to <strong>898882</strong></p>
</div>
```

---

### Priority 2: High Impact, High Effort

#### 5. Nearby Stops (Geolocation)

**Impact**: High | **Effort**: High | **Supabase Impact**: None (with IndexedDB)

Discover stops within 500m using device location.

**Architecture Decision**: Store stops in **IndexedDB**, not Supabase.

| Approach  | Database | Egress/month | Offline |
| --------- | -------- | ------------ | ------- |
| Supabase  | +3.3 MB  | +4 GB ⚠️     | ❌      |
| IndexedDB | 0        | 0            | ✅      |

**Implementation**:

```
src/lib/data/
├── ttc-stops.json        # Static stop data (~3 MB)
└── stops-db.ts           # Dexie.js IndexedDB wrapper

src/lib/components/nearby/
├── NearbyStops.svelte    # Main component
├── StopCard.svelte       # Individual stop
└── LocationButton.svelte # Geolocation trigger
```

**Stop Data Structure**:

```typescript
interface TTCStop {
  stop_id: string; // "14045"
  stop_name: string; // "Bloor-Yonge Station"
  lat: number; // 43.6711568
  lon: number; // -79.3857383
  routes: string[]; // ["1", "2", "65"]
  type: "subway" | "streetcar" | "bus";
}
```

**Distance Calculation**:

```typescript
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

---

#### 6. ETA Countdown Display

**Impact**: High | **Effort**: High | **Supabase Impact**: Medium

Show "Next bus in X min" for bookmarked stops.

**Data Source**: TTC GTFS-RT API or NextBus API

**New Edge Function**: `supabase/functions/get-eta/index.ts`

```typescript
// Fetch real-time predictions from TTC API
const TTC_API = "https://webservices.umoiq.com/service/publicJSONFeed";

Deno.serve(async (req) => {
  const { stopId, routeTag } = await req.json();

  const response = await fetch(
    `${TTC_API}?command=predictions&a=ttc&stopId=${stopId}&routeTag=${routeTag}`
  );

  const data = await response.json();
  // Parse and return predictions
});
```

**Supabase Impact**:

- Edge Functions: +50K invocations/month (at scale)
- Consider caching predictions for 30s

---

#### 7. Route Browser

**Impact**: Medium | **Effort**: Low | **Supabase Impact**: None

List all TTC routes by category with jump navigation.

**Data**: Use existing `TTC-BUS-ROUTES.md` and `TTC-STREETCAR-ROUTES.md`

```
src/lib/components/routes/
├── RouteBrowser.svelte    # Main browser
├── RouteCategory.svelte   # Category section
└── RouteItem.svelte       # Individual route
```

**Categories**:

- Subway Lines (1-4)
- Streetcars (501-514)
- Regular Bus (1-199)
- Express Bus (900s)
- Night Bus (300s)
- Community Bus (400s)

---

### Priority 3: Nice to Have

#### 8. Vehicle Location Maps

**Impact**: Medium | **Effort**: High | **Supabase Impact**: Low

Show real-time bus/streetcar positions on a map.

**Tech Options**:

- Leaflet (~40KB) - Lighter weight
- MapLibre GL (~200KB) - Vector tiles
- OpenLayers (like TO-Bus) - Full-featured but heavy

**Data Source**: TTC GTFS-RT vehicle positions

**Recommendation**: Defer to v2 unless user demand is high.

---

#### 9. YRT (York Region Transit) Support

**Impact**: Low | **Effort**: High | **Supabase Impact**: Medium

Many GTA commuters use both TTC and YRT.

**Requires**:

- New Edge Function for YRT API
- Additional stop database (~3K stops)
- UI for transit system switching

**Recommendation**: Defer unless user base extends beyond Toronto.

---

#### 10. Push Notifications

**Impact**: Medium | **Effort**: High | **Supabase Impact**: Medium

Alert users about disruptions on their saved routes.

**Requires**:

- WebPush setup in Edge Functions
- Notification permission flow
- User preferences for notification types
- Background sync for subscription management

**Recommendation**: Valuable but complex. Consider after bookmarks/ETA.

---

#### 11. Visibility-Aware Fetching (from HK Bus ETA) ⭐ NEW

**Impact**: Medium | **Effort**: Low | **Supabase Impact**: Reduces egress

Pause data fetching when app is in background to save battery and data.

```typescript
// src/lib/stores/visibility.ts
import { readable } from "svelte/store";

export const isVisible = readable(true, (set) => {
  const handleVisibilityChange = () => {
    set(document.visibilityState === "visible");
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibilityChange);
});

// Usage in alerts store
$effect(() => {
  if (!$isVisible) return; // Skip fetch when not visible
  fetchAlerts();
});
```

---

#### 12. Route Collections with Scheduling (from HK Bus ETA) ⭐ NEW

**Impact**: High | **Effort**: High | **Supabase Impact**: Low

Organize saved routes into collections that appear based on time of day.

**Database Schema**:

```sql
CREATE TABLE public.route_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Morning Commute"
  route_ids TEXT[] NOT NULL,       -- ['501', '94', '1']
  schedules JSONB DEFAULT '[]',    -- Time-based visibility
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example schedules JSONB:
-- [{"day": 1, "start": "07:00", "end": "09:00"}, {"day": 2, "start": "07:00", "end": "09:00"}]
```

**Components**:

```
src/lib/components/collections/
├── CollectionList.svelte     # All collections
├── CollectionCard.svelte     # Single collection
├── ScheduleEditor.svelte     # Set visibility times
└── CollectionManager.svelte  # Create/edit/delete
```

**Value**: Show relevant alerts automatically during commute times.

---

#### 13. Weather Integration (from HK Bus ETA) ⭐ NEW

**Impact**: Medium | **Effort**: Medium | **Supabase Impact**: Low

Show Environment Canada weather warnings that may affect transit.

**Implementation**:

```typescript
// Fetch from Environment Canada Atom feeds
const WEATHER_API = "https://weather.gc.ca/rss/city/on-143_e.xml";

interface WeatherWarning {
  title: string;
  type: "warning" | "watch" | "advisory";
  description: string;
  expires: Date;
}
```

**Component**: `WeatherWarningBanner.svelte`

---

#### 14. Share Alert as Image (from HK Bus ETA) ⭐ NEW

**Impact**: Low | **Effort**: Medium | **Supabase Impact**: None

Generate shareable images from alerts for social media.

**Implementation**:

```typescript
import domToImage from "dom-to-image";

async function shareAlertAsImage(alertElement: HTMLElement) {
  const dataUrl = await domToImage.toPng(alertElement);

  if (navigator.share) {
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.share({
      files: [new File([blob], "ttc-alert.png", { type: "image/png" })],
      title: "TTC Service Alert",
    });
  }
}
```

---

## Implementation Patterns from HK Bus ETA

### 1. Workbox Caching Strategies

```javascript
// vite.config.ts PWA configuration
runtimeCaching: [
  {
    urlPattern: /\/assets\//,
    handler: "CacheFirst",
    options: {
      cacheName: "static-assets",
      expiration: { maxAgeSeconds: 30 * 24 * 3600 }, // 30 days
    },
  },
  {
    urlPattern: /\/api\/alerts/,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "alerts-cache",
      expiration: { maxAgeSeconds: 3600 }, // 1 hour
    },
  },
];
```

### 2. Immer for Immutable State Updates

```typescript
import { produce } from "immer";

const updatePreferences = (draft) => {
  draft.savedRoutes.push(newRoute);
  draft.lastUpdated = Date.now();
};

setPreferences(produce(updatePreferences));
```

### 3. List Virtualization for Performance

```typescript
// Svelte equivalent: @tanstack/svelte-virtual
import { createVirtualizer } from "@tanstack/svelte-virtual";

const virtualizer = createVirtualizer({
  count: alerts.length,
  getScrollElement: () => scrollRef,
  estimateSize: () => 80,
});
```

Consider adding if alert lists grow beyond 100 items.

### 4. Throttled Geolocation Updates

```typescript
import { throttle } from "lodash-es";

const updateNearbyStops = throttle((coords: GeolocationCoordinates) => {
  const nearby = findStopsWithinRadius(coords.latitude, coords.longitude, 500);
  nearbyStopsStore.set(nearby);
}, 500); // Max once per 500ms
```

---

## Supabase Free Tier Analysis

### Current Usage

| Resource       | Used       | Limit          | % Used |
| -------------- | ---------- | -------------- | ------ |
| Database       | ~130 MB    | 500 MB         | 26%    |
| Edge Functions | ~50K/mo    | 500K/mo        | 10%    |
| Egress         | ~300 MB/mo | 5 GB/mo        | 6%     |
| Realtime       | Low        | 200 concurrent | <5%    |

### Projected Usage (with all P1/P2 features)

| Resource       | Projected  | Limit   | % Used | Risk   |
| -------------- | ---------- | ------- | ------ | ------ |
| Database       | ~170 MB    | 500 MB  | 34%    | 🟢 Low |
| Edge Functions | ~150K/mo   | 500K/mo | 30%    | 🟢 Low |
| Egress         | ~500 MB/mo | 5 GB/mo | 10%    | 🟢 Low |

### Critical Decision: Nearby Stops Storage

| Option    | Database | Egress      | Offline | Recommendation |
| --------- | -------- | ----------- | ------- | -------------- |
| Supabase  | +3.3 MB  | +4 GB/mo ⚠️ | ❌      | ❌ Avoid       |
| IndexedDB | 0        | 0           | ✅      | ✅ Use this    |

**Storing 11K stops in Supabase would consume 80%+ of egress limit.**

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Add i18n with `svelte-i18n` (EN/FR/ZH)
- [ ] Enhance PWA caching strategy
- [ ] Add SMS fallback UI

### Phase 2: Bookmarks (Week 3-4)

- [ ] Create `stop_bookmarks` table + RLS
- [ ] Build bookmark components
- [ ] Implement localStorage + Supabase sync

### Phase 3: Nearby Stops (Week 5-6)

- [ ] Source TTC GTFS stop data
- [ ] Build IndexedDB wrapper with Dexie.js
- [ ] Create nearby stops UI with geolocation

### Phase 4: ETA Display (Week 7-8)

- [ ] Build `get-eta` Edge Function
- [ ] Create countdown components
- [ ] Integrate with bookmarks

### Phase 5: Route Browser (Week 9)

- [ ] Build route browser components
- [ ] Link to alert filtering

### Phase 6: Collections & Scheduling (Week 10-11)

- [ ] Create `route_collections` table
- [ ] Build collection components with scheduling
- [ ] Add time-based visibility logic

### Phase 7: Polish (Week 12)

- [ ] Visibility-aware fetching
- [ ] Weather integration
- [ ] Share as image feature
- [ ] Accessibility audit
- [ ] Performance optimization (virtualization if needed)
- [ ] Beta testing

---

## Quick Wins (Implement Today)

1. **SMS Fallback UI** - Show "Text 898882" in error states
2. **Visibility-Aware Fetching** - Pause API calls when backgrounded (from HK Bus ETA)
3. **Skip Navigation Link** - Accessibility improvement
4. **Improve Empty States** - Add "Browse all routes" link
5. **Focus Visible Styles** - Enhance keyboard navigation
6. **Reduced Motion Support** - Respect `prefers-reduced-motion`
7. **Haptic Feedback** - Add vibration to button presses (from HK Bus ETA)

---

## Technical Notes

### Why IndexedDB for Stops?

- 11K stops × 300 bytes = ~3.3 MB
- Each user download from Supabase = 3.3 MB egress
- 1,000 users = 3.3 GB/month (66% of limit)
- IndexedDB: Zero egress, instant offline queries

### i18n Library Choice

| Library      | Bundle Size | Features          | Recommendation            |
| ------------ | ----------- | ----------------- | ------------------------- |
| svelte-i18n  | ~5KB        | Runtime switching | ✅ For this app           |
| paraglide-js | ~1KB        | Compile-time      | Better perf, more complex |

### Virtualization (from HK Bus ETA)

Consider `@tanstack/svelte-virtual` if alert lists grow beyond 100 items:

- Only renders visible items
- Constant memory usage regardless of list size
- Smooth scrolling on low-end devices

### Stop Data Source

TTC GTFS data available at: https://open.toronto.ca/dataset/ttc-routes-and-schedules/

- `stops.txt` contains all stop data
- Update quarterly or with major service changes

### Weather Data Source

Environment Canada RSS feeds: https://weather.gc.ca/rss/city/on-143_e.xml

- Free to use
- Update every 15 minutes
- Parse XML for warnings/watches

---

## Conclusion

Implementing these features in priority order will transform TTC Alerts from an alerts-focused app into a comprehensive Toronto transit companion, while staying within Supabase free tier limits.

**Must-Have (P1)**: i18n, Stop Bookmarks, Enhanced PWA Caching, Visibility-Aware Fetching
**Should-Have (P2)**: Nearby Stops, Route Collections with Scheduling, ETA Display, Route Browser
**Nice-to-Have (P3)**: Weather Integration, Vehicle Maps, Share as Image, YRT Support, Push Notifications
