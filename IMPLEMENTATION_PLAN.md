# TTC Alerts PWA - Feature Implementation Plan

Comprehensive plan for ETA feature, stop search, accessibility enhancements, and UX improvements.

**Based on analysis of**: [TO-Bus](https://github.com/TO-Bus/to-bus-ca), [HK Independent Bus ETA](https://github.com/hkbus/hk-independent-bus-eta)

---

## 📊 Implementation Progress Summary

| Phase | Name                         | Status         | Progress |
| ----- | ---------------------------- | -------------- | -------- |
| 0     | Version A/B Deployment Setup | ✅ Complete    | 100%     |
| 1     | Foundation & Accessibility   | ✅ Complete    | 100%     |
| 2     | Stop Database & Search       | ✅ Complete    | 100%     |
| 3     | ETA Feature                  | ✅ Complete    | 100%     |
| 4     | i18n & Additional Features   | ❌ Not Started | 0%       |
| 5     | Polish & Testing             | ❌ Not Started | 0%       |

**Last Updated**: December 4, 2025

---

## Phase 0: Version A/B Parallel Deployment Setup

Deploy the current stable app as **Version A** (production) while developing new features in **Version B** (beta) on a separate URL using Cloudflare Pages branch deployments.

### Deployment Architecture

| Component               | Version A (Stable)     | Version B (Beta)                 |
| ----------------------- | ---------------------- | -------------------------------- |
| Git Branch              | `main`                 | `version-b`                      |
| Cloudflare URL          | `ttc-alerts.pages.dev` | `version-b.ttc-alerts.pages.dev` |
| Supabase Database       | Shared                 | Shared                           |
| Supabase Edge Functions | Shared                 | Shared                           |
| WebAuthn Auth           | Separate credentials   | Separate credentials             |
| PWA Name                | "TTC Alerts"           | "TTC Alerts Beta"                |
| SW Cache Prefix         | `ttc-alerts-v2`        | `ttc-alerts-beta-v1`             |

> ⚠️ **Note:** WebAuthn credentials are domain-specific. Users must register separately on each version.

---

### 0.1 Create Version B Branch

- [x] Create new branch from main: `git checkout -b version-b`
- [x] Push branch to remote: `git push -u origin version-b`
- [x] Verify Cloudflare Pages auto-deploys to `version-b.ttc-alerts.pages.dev`

**Commands:**

```bash
# Create and push version-b branch
git checkout main
git pull origin main
git checkout -b version-b
git push -u origin version-b
```

---

### 0.2 Update PWA Manifest for Version B

- [x] Modify `static/manifest.json` to distinguish beta version
- [x] Change `name` to "TTC Alerts Beta"
- [x] Change `short_name` to "TTC Beta"
- [x] Optionally add beta indicator to `description`

**Changes to `static/manifest.json`:**

```json
{
  "name": "TTC Alerts Beta",
  "short_name": "TTC Beta",
  "description": "Beta version - Real-time TTC service alerts with new features",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#DA291C",
  "background_color": "#ffffff"
}
```

---

### 0.3 Update Service Worker Cache Names

- [x] Modify `static/sw.js` to use beta-specific cache names
- [x] Change cache prefix from `ttc-alerts-v2` to `ttc-alerts-beta-v1`
- [x] Prevents cache conflicts if user has both versions installed

**Changes to `static/sw.js`:**

```javascript
// Change from:
const CACHE_NAME = "ttc-alerts-v2";
const STATIC_CACHE = "ttc-static-v2";
const DYNAMIC_CACHE = "ttc-dynamic-v2";

// To:
const CACHE_NAME = "ttc-alerts-beta-v1";
const STATIC_CACHE = "ttc-static-beta-v1";
const DYNAMIC_CACHE = "ttc-dynamic-beta-v1";
```

---

### 0.4 Configure Cloudflare Pages Branch Deployments

- [ ] Go to Cloudflare Dashboard → Pages → `ttc-alerts` project
- [ ] Navigate to Settings → Builds & deployments
- [ ] Under "Branch deployments", ensure preview deployments are enabled
- [ ] Verify `version-b` branch auto-deploys to `version-b.ttc-alerts.pages.dev`

**Cloudflare Dashboard Steps:**

1. Log in to Cloudflare Dashboard
2. Go to **Workers & Pages** → Select `ttc-alerts` project
3. Click **Settings** → **Builds & deployments**
4. Under **Branch deployments**:
   - Production branch: `main`
   - Preview branches: Enable "All non-production branches" or add `version-b` specifically
5. Save changes

---

### 0.5 Add WebAuthn Multi-Origin Support

- [x] Update Supabase Edge Function secrets to support both origins
- [x] Modify `supabase/functions/_shared/auth-utils.ts` to accept multiple origins
- [x] Add `version-b.ttc-alerts.pages.dev` to allowed origins

**Option A: Environment-based (Recommended)**

Add new Supabase secrets for the beta domain:

```bash
# In Supabase Dashboard → Edge Functions → Secrets
# Add these alongside existing secrets:

WEBAUTHN_RP_ID_BETA=version-b.ttc-alerts.pages.dev
WEBAUTHN_ORIGIN_BETA=https://version-b.ttc-alerts.pages.dev
```

**Option B: Multi-origin in auth-utils.ts**

```typescript
// supabase/functions/_shared/auth-utils.ts
const ALLOWED_ORIGINS = [
  "https://ttc-alerts.pages.dev",
  "https://version-b.ttc-alerts.pages.dev",
];

export function getWebAuthnConfig(requestOrigin: string) {
  const origin = ALLOWED_ORIGINS.find((o) => o === requestOrigin);
  if (!origin) throw new Error("Invalid origin");

  const rpId = new URL(origin).hostname;
  return {
    rpId,
    rpName: rpId.includes("version-b") ? "TTC Alerts Beta" : "TTC Alerts",
    origin,
  };
}
```

---

### 0.6 Set Branch-Specific Environment Variables (Optional)

- [ ] In Cloudflare Pages, set environment variables per branch if needed
- [ ] Both versions can share the same Supabase project

**Cloudflare Dashboard Steps:**

1. Go to **Workers & Pages** → `ttc-alerts` → **Settings** → **Environment variables**
2. Under **Preview** environment, add any beta-specific variables if needed
3. Both versions use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

### 0.7 Development Workflow

**Working on Version B features:**

```bash
# Switch to version-b branch
git checkout version-b

# Make changes, commit, push
git add .
git commit -m "feat: add ETA feature"
git push origin version-b

# Cloudflare auto-deploys to version-b.ttc-alerts.pages.dev
```

**Keeping Version A stable:**

```bash
# main branch remains unchanged
# Only merge version-b → main when features are production-ready

git checkout main
git merge version-b  # When ready to release
git push origin main
```

**Syncing main updates to version-b:**

```bash
git checkout version-b
git merge main  # Get any hotfixes from production
git push origin version-b
```

---

### Phase 0 Checklist Summary

- [x] Create `version-b` branch from `main`
- [x] Update `static/manifest.json` with beta name
- [x] Update `static/sw.js` cache names
- [x] Verify Cloudflare branch deployment works
- [x] Add WebAuthn multi-origin support
- [ ] Test beta deployment at `version-b.ttc-alerts.pages.dev`
- [ ] Document workflow for team (if applicable)

---

## Executive Summary

Transform TTC Alerts from an alerts-focused app into a comprehensive Toronto transit companion with:

- Real-time ETA predictions for bookmarked stops
- Stop search with autocomplete (11K stops in IndexedDB)
- Accessibility settings (text scaling, reduced motion)
- French language support
- Weather warning integration
- Enhanced offline support

All features designed to stay within **Supabase free tier limits**.

---

## Phase 1: Foundation & Accessibility (Week 1-2)

### 1.1 Visibility-Aware Fetching

- [x] Create `src/lib/stores/visibility.ts`
- [x] Add `document.visibilitychange` listener
- [x] Export `isVisible` readable store
- [x] Integrate into `alerts.ts` to pause polling when hidden
- [x] Test: Verify no API calls when tab is backgrounded

**Implementation:**

```typescript
// src/lib/stores/visibility.ts
import { readable } from "svelte/store";

export const isVisible = readable(true, (set) => {
  const handleVisibilityChange = () => {
    set(document.visibilityState === "visible");
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }
});
```

**Supabase Impact:** Reduces egress ~30% (saves ~100 MB/month)

---

### 1.2 Accessibility Settings Store

- [x] Create `src/lib/stores/accessibility.ts`
- [x] Add `textScale` state: `'normal' | 'medium' | 'large'` (1.0, 1.15, 1.3)
- [x] Add `reduceMotion` state: boolean
- [x] Persist to localStorage
- [x] Apply CSS custom properties to `<html>` element on change
- [x] Respect `prefers-reduced-motion` media query as default

**Implementation:**

```typescript
// src/lib/stores/accessibility.ts
import { writable } from "svelte/store";
import { browser } from "$app/environment";

type TextScale = "normal" | "medium" | "large";

const SCALE_VALUES = { normal: 1, medium: 1.15, large: 1.3 };

function createAccessibilityStore() {
  const stored = browser ? localStorage.getItem("accessibility") : null;
  const initial = stored
    ? JSON.parse(stored)
    : {
        textScale: "normal" as TextScale,
        reduceMotion: browser
          ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
          : false,
      };

  const { subscribe, set, update } = writable(initial);

  return {
    subscribe,
    setTextScale: (scale: TextScale) => {
      update((s) => {
        const newState = { ...s, textScale: scale };
        if (browser) {
          localStorage.setItem("accessibility", JSON.stringify(newState));
          document.documentElement.style.setProperty(
            "--text-scale",
            String(SCALE_VALUES[scale])
          );
          document.documentElement.classList.remove(
            "text-scale-normal",
            "text-scale-medium",
            "text-scale-large"
          );
          document.documentElement.classList.add(`text-scale-${scale}`);
        }
        return newState;
      });
    },
    setReduceMotion: (reduce: boolean) => {
      update((s) => {
        const newState = { ...s, reduceMotion: reduce };
        if (browser) {
          localStorage.setItem("accessibility", JSON.stringify(newState));
          document.documentElement.classList.toggle("reduce-motion", reduce);
        }
        return newState;
      });
    },
  };
}

export const accessibility = createAccessibilityStore();
```

---

### 1.3 Accessibility CSS

- [x] Add CSS custom property `--text-scale` to `layout.css`
- [x] Add text scale classes (`.text-scale-normal`, `.text-scale-medium`, `.text-scale-large`)
- [x] Add `.reduce-motion` class that disables all animations
- [x] Add `@media (prefers-reduced-motion)` fallback
- [x] Update all `font-size` values to use `calc(Xpx * var(--text-scale))`

**Implementation:**

```css
/* Add to src/routes/layout.css */

/* Text Scaling */
:root {
  --text-scale: 1;
}

html.text-scale-medium {
  --text-scale: 1.15;
}
html.text-scale-large {
  --text-scale: 1.3;
}

/* Apply scaling to typography */
body {
  font-size: calc(15px * var(--text-scale));
}

.text-xs {
  font-size: calc(11px * var(--text-scale));
}
.text-sm {
  font-size: calc(13px * var(--text-scale));
}
.text-base {
  font-size: calc(15px * var(--text-scale));
}
.text-lg {
  font-size: calc(17px * var(--text-scale));
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

html.reduce-motion *,
html.reduce-motion *::before,
html.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

---

### 1.4 Accessibility Settings UI

- [x] Add "Accessibility" section to `preferences/+page.svelte`
- [x] Create text size selector with A / A+ / A++ buttons
- [x] Create "Reduce motion" toggle switch
- [x] Add visual preview of text size change
- [x] Ensure settings work WITHOUT authentication (localStorage only)
- [x] Add ARIA labels and descriptions

**UI Design:**

```
┌─────────────────────────────────────┐
│ Accessibility                       │
├─────────────────────────────────────┤
│ Text Size                           │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │  A  │ │ A+  │ │ A++ │            │
│ └─────┘ └─────┘ └─────┘            │
│ Smaller  Medium  Larger             │
├─────────────────────────────────────┤
│ Reduce Motion                [  ○─] │
│ Minimize animations and transitions │
└─────────────────────────────────────┘
```

---

### 1.5 Enhanced Service Worker

- [x] Update `static/sw.js` with Workbox-style caching
- [x] NetworkFirst for `/rest/v1/alert_cache` (1 hour max-age)
- [ ] NetworkFirst for `/functions/v1/get-eta` (30 second max-age)
- [x] CacheFirst for `/rest/v1/planned_maintenance` (24 hour max-age)
- [x] CacheFirst for static assets (`/_app/`, fonts, icons)
- [ ] Add offline fallback page
- [ ] Test offline functionality

**Implementation:**

```javascript
// static/sw.js
const CACHE_NAME = "ttc-alerts-v3";
const OFFLINE_URL = "/offline.html";

// Cache strategies
async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("Network failed and no cache");
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip dev server requests
  if (
    url.pathname.startsWith("/.svelte-kit/") ||
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/node_modules/")
  ) {
    return;
  }

  // Alerts: NetworkFirst with 1 hour cache
  if (
    url.pathname.includes("/rest/v1/alert_cache") ||
    url.pathname.includes("/rest/v1/incident_threads")
  ) {
    event.respondWith(networkFirst(event.request, "alerts-cache", 3600));
    return;
  }

  // ETA: NetworkFirst with 30 second cache
  if (url.pathname.includes("/functions/v1/get-eta")) {
    event.respondWith(networkFirst(event.request, "eta-cache", 30));
    return;
  }

  // Maintenance: CacheFirst with 24 hour cache
  if (url.pathname.includes("/rest/v1/planned_maintenance")) {
    event.respondWith(cacheFirst(event.request, "maintenance-cache"));
    return;
  }

  // Static assets: CacheFirst
  if (
    url.pathname.startsWith("/_app/") ||
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(event.request, "static-cache"));
    return;
  }
});
```

---

## Phase 2: Stop Database & Search (Week 3-4)

### 2.1 TTC Stops Data

- [x] Download TTC GTFS data from Toronto Open Data ✅
- [x] Extract and transform `stops.txt` to JSON format ✅
- [x] Create `static/data/ttc-stops.json` (1.1MB, 9,346 stops) ✅
- [x] Define `TTCStop` TypeScript interface ✅
- [x] Include: stop_id, stop_name, lat, lon, routes[], stop_type ✅

**Data Structure:**

```typescript
// src/lib/types/stops.ts
export interface TTCStop {
  id: string; // "14045"
  name: string; // "Bloor-Yonge Station"
  lat: number; // 43.6711568
  lon: number; // -79.3857383
  routes: string[]; // ["1", "2", "65", "141"]
  type: "subway" | "streetcar" | "bus";
}
```

**Data Source:** https://open.toronto.ca/dataset/ttc-routes-and-schedules/

---

### 2.2 IndexedDB Layer with Dexie.js

- [x] Install `dexie` package ✅
- [x] Create `src/lib/data/stops-db.ts` ✅
- [x] Define Dexie database schema with stops table ✅
- [x] Add compound index on `name` for search ✅
- [x] Create `initStopsDB()` function to populate from JSON ✅
- [x] Add database version tracking in localStorage ✅
- [x] Create `searchStops(query)` function with fuzzy matching ✅
- [x] Create `getStopById(id)` function ✅
- [x] Test with 9,346 stops ✅

**Implementation:**

```typescript
// src/lib/data/stops-db.ts
import Dexie, { type Table } from "dexie";
import type { TTCStop } from "$lib/types/stops";

class StopsDatabase extends Dexie {
  stops!: Table<TTCStop>;

  constructor() {
    super("ttc-stops");
    this.version(1).stores({
      stops: "id, name, type, *routes",
    });
  }
}

export const db = new StopsDatabase();

const DB_VERSION = "2025-12-01"; // Update when stops data changes

export async function initStopsDB(): Promise<boolean> {
  const storedVersion = localStorage.getItem("stops-db-version");

  if (storedVersion === DB_VERSION) {
    const count = await db.stops.count();
    if (count > 0) return false; // Already initialized
  }

  // Load stops from bundled JSON
  const response = await fetch("/data/ttc-stops.json");
  const stops: TTCStop[] = await response.json();

  await db.stops.clear();
  await db.stops.bulkAdd(stops);

  localStorage.setItem("stops-db-version", DB_VERSION);
  return true; // Database was initialized
}

export async function searchStops(
  query: string,
  limit = 10
): Promise<TTCStop[]> {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase();

  return db.stops
    .filter((stop) => stop.name.toLowerCase().includes(normalizedQuery))
    .limit(limit)
    .toArray();
}

export async function getStopById(id: string): Promise<TTCStop | undefined> {
  return db.stops.get(id);
}
```

---

### 2.3 Stop Search Component

- [x] Create `src/lib/components/stops/StopSearch.svelte` ✅
- [x] Add debounced input (200ms delay) ✅
- [x] Show autocomplete dropdown with matching stops ✅
- [x] Display stop name + routes served as badges ✅
- [x] Handle keyboard navigation (up/down/enter/escape) ✅
- [x] Emit `select` event with chosen stop ✅
- [x] Add loading state during IndexedDB init ✅
- [x] Add "No results" empty state ✅
- [x] Add ARIA attributes for accessibility ✅
- [x] Add "Find Nearby" button with geolocation ✅

**Component Design:**

```svelte
<!-- src/lib/components/stops/StopSearch.svelte -->
<script lang="ts">
  import { searchStops } from '$lib/data/stops-db';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import { debounce } from '$lib/utils';

  let query = $state('');
  let results = $state<TTCStop[]>([]);
  let isLoading = $state(false);
  let selectedIndex = $state(-1);

  const { onSelect } = $props<{ onSelect: (stop: TTCStop) => void }>();

  const search = debounce(async (q: string) => {
    if (q.length < 2) {
      results = [];
      return;
    }
    isLoading = true;
    results = await searchStops(q, 8);
    isLoading = false;
  }, 300);

  $effect(() => {
    search(query);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      onSelect(results[selectedIndex]);
    }
  }
</script>

<div class="stop-search" role="combobox" aria-expanded={results.length > 0}>
  <input
    type="text"
    bind:value={query}
    placeholder="Search stops..."
    onkeydown={handleKeydown}
    aria-label="Search for TTC stops"
    aria-autocomplete="list"
  />

  {#if results.length > 0}
    <ul class="search-results" role="listbox">
      {#each results as stop, i}
        <li
          role="option"
          aria-selected={i === selectedIndex}
          class:selected={i === selectedIndex}
          onclick={() => onSelect(stop)}
        >
          <span class="stop-name">{stop.name}</span>
          <div class="stop-routes">
            {#each stop.routes.slice(0, 4) as route}
              <RouteBadge {route} size="sm" />
            {/each}
            {#if stop.routes.length > 4}
              <span class="more">+{stop.routes.length - 4}</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

---

### 2.4 Stop Bookmarks

- [x] Add `bookmarked_stops` column to `user_preferences` table (migration) ✅
- [x] Create `src/lib/stores/bookmarks.ts` ✅
- [x] Store bookmarks in localStorage for anonymous users ✅
- [x] Sync to Supabase for authenticated users ✅
- [x] Create `BookmarkStopButton.svelte` component ✅
- [x] Add bookmark toggle to stop search results ✅
- [x] Create `MyStopsWidget.svelte` for homepage ✅
- [x] Limit to 10 bookmarked stops per user ✅

**Database Migration:**

```sql
-- Add bookmarked_stops to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS bookmarked_stops JSONB DEFAULT '[]';

-- Example structure:
-- [{"id": "14045", "name": "Bloor-Yonge Station", "routes": ["1", "2"]}]
```

**Store Implementation:**

```typescript
// src/lib/stores/bookmarks.ts
import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import { supabase } from "$lib/supabase";
import { user } from "$lib/stores/auth";
import type { TTCStop } from "$lib/types/stops";

interface BookmarkedStop {
  id: string;
  name: string;
  routes: string[];
}

function createBookmarksStore() {
  const stored = browser ? localStorage.getItem("bookmarked-stops") : null;
  const initial: BookmarkedStop[] = stored ? JSON.parse(stored) : [];

  const { subscribe, set, update } = writable<BookmarkedStop[]>(initial);

  // Sync with Supabase when user signs in
  user.subscribe(async (u) => {
    if (u) {
      const { data } = await supabase
        .from("user_preferences")
        .select("bookmarked_stops")
        .eq("user_id", u.id)
        .single();

      if (data?.bookmarked_stops) {
        set(data.bookmarked_stops);
      }
    }
  });

  async function persist(stops: BookmarkedStop[]) {
    if (browser) {
      localStorage.setItem("bookmarked-stops", JSON.stringify(stops));
    }

    const currentUser = get(user);
    if (currentUser) {
      await supabase.from("user_preferences").upsert({
        user_id: currentUser.id,
        bookmarked_stops: stops,
      });
    }
  }

  return {
    subscribe,
    add: (stop: TTCStop) => {
      update((stops) => {
        if (stops.length >= 10) return stops; // Limit to 10
        if (stops.some((s) => s.id === stop.id)) return stops;

        const newStops = [
          ...stops,
          {
            id: stop.id,
            name: stop.name,
            routes: stop.routes.slice(0, 5),
          },
        ];
        persist(newStops);
        return newStops;
      });
    },
    remove: (stopId: string) => {
      update((stops) => {
        const newStops = stops.filter((s) => s.id !== stopId);
        persist(newStops);
        return newStops;
      });
    },
    isBookmarked: (stopId: string) => {
      let bookmarked = false;
      subscribe((stops) => {
        bookmarked = stops.some((s) => s.id === stopId);
      })();
      return bookmarked;
    },
  };
}

export const bookmarks = createBookmarksStore();
```

---

## Phase 3: ETA Feature (Week 5-6)

### 3.1 ETA Edge Function

- [x] Create `supabase/functions/get-eta/index.ts` ✅
- [x] Fetch from TTC NextBus API ✅
- [x] Parse XML/JSON response ✅
- [x] Return next 3 arrivals per route at stop ✅
- [x] Add 30-second cache headers ✅
- [x] Handle API errors gracefully ✅
- [x] Deploy to Supabase ✅

**Implementation:**

```typescript
// supabase/functions/get-eta/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TTC_API = "https://webservices.umoiq.com/service/publicJSONFeed";

interface Prediction {
  route: string;
  direction: string;
  arrivals: number[]; // Minutes until arrival
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { stopId } = await req.json();

    if (!stopId) {
      return new Response(JSON.stringify({ error: "stopId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = `${TTC_API}?command=predictions&a=ttc&stopId=${stopId}`;
    const response = await fetch(url);
    const data = await response.json();

    const predictions: Prediction[] = [];

    // Parse NextBus response format
    const preds = data.predictions;
    const predsArray = Array.isArray(preds) ? preds : [preds];

    for (const pred of predsArray) {
      if (!pred || !pred.direction) continue;

      const directions = Array.isArray(pred.direction)
        ? pred.direction
        : [pred.direction];

      for (const dir of directions) {
        const arrivals = Array.isArray(dir.prediction)
          ? dir.prediction.slice(0, 3).map((p: any) => parseInt(p.minutes))
          : [parseInt(dir.prediction?.minutes)].filter(Boolean);

        if (arrivals.length > 0) {
          predictions.push({
            route: pred.routeTag,
            direction: dir.title,
            arrivals,
          });
        }
      }
    }

    return new Response(JSON.stringify({ predictions, stopId }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch predictions" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

---

### 3.2 ETA Store

- [x] Create `src/lib/stores/eta.ts` ✅
- [x] Fetch ETAs for all bookmarked stops ✅
- [x] Auto-refresh every 30 seconds (visibility-aware) ✅
- [x] Handle loading and error states ✅
- [x] Cache last successful response for offline display ✅

**Implementation:**

```typescript
// src/lib/stores/eta.ts
import { writable, derived, get } from "svelte/store";
import { bookmarks } from "./bookmarks";
import { isVisible } from "./visibility";
import { supabase } from "$lib/supabase";

interface ETAPrediction {
  route: string;
  direction: string;
  arrivals: number[];
}

interface StopETA {
  stopId: string;
  stopName: string;
  predictions: ETAPrediction[];
  lastUpdated: Date;
  error?: string;
}

function createETAStore() {
  const { subscribe, set, update } = writable<Map<string, StopETA>>(new Map());

  let refreshInterval: number | null = null;

  async function fetchETA(stopId: string, stopName: string): Promise<StopETA> {
    try {
      const { data, error } = await supabase.functions.invoke("get-eta", {
        body: { stopId },
      });

      if (error) throw error;

      return {
        stopId,
        stopName,
        predictions: data.predictions,
        lastUpdated: new Date(),
      };
    } catch (e) {
      return {
        stopId,
        stopName,
        predictions: [],
        lastUpdated: new Date(),
        error: "Unable to load predictions",
      };
    }
  }

  async function refreshAll() {
    const stops = get(bookmarks);
    const results = await Promise.all(
      stops.map((stop) => fetchETA(stop.id, stop.name))
    );

    const etaMap = new Map<string, StopETA>();
    results.forEach((eta) => etaMap.set(eta.stopId, eta));
    set(etaMap);
  }

  function startAutoRefresh() {
    if (refreshInterval) return;

    refreshAll(); // Initial fetch

    refreshInterval = setInterval(() => {
      if (get(isVisible)) {
        refreshAll();
      }
    }, 30000) as unknown as number;
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  return {
    subscribe,
    refresh: refreshAll,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export const etaStore = createETAStore();
```

---

### 3.3 ETA Display Components

- [x] Create `src/lib/components/eta/ETABadge.svelte` - Inline "5 min" badge ✅
- [x] Create `src/lib/components/eta/ETACard.svelte` - Stop card with all predictions ✅
- [x] Create `src/lib/components/eta/ETAWidget.svelte` - Homepage widget ✅
- [x] Add urgency colors (respects reduced motion) ✅
- [x] Add loading skeleton ✅
- [x] Add error state with retry button ✅
- [x] Add "No predictions" state for late night ✅

**ETACard Design:**

```
┌─────────────────────────────────────┐
│ Bloor-Yonge Station            [🗑] │
├─────────────────────────────────────┤
│ 🔴 Line 1 Yonge-University          │
│    Finch    →   2 min  5 min  9 min │
│    Vaughan  →   3 min  8 min 12 min │
├─────────────────────────────────────┤
│ 🟢 Line 2 Bloor-Danforth            │
│    Kipling  →   1 min  4 min  7 min │
│    Kennedy  →   2 min  6 min 10 min │
├─────────────────────────────────────┤
│ Updated 30 seconds ago              │
└─────────────────────────────────────┘
```

---

### 3.4 ETA Widget on Homepage

- [x] Add "Live Arrivals" section to `+page.svelte` ✅
- [x] Show above alerts when user has bookmarked stops ✅
- [x] Grid layout for multiple stops ✅
- [x] Add "Add Stop" button that opens search ✅
- [x] Show empty state prompting to add stops ✅
- [x] Integrate with visibility-aware auto-refresh ✅

**Homepage Layout Update:**

```
┌─────────────────────────────────────┐
│ [Weather Warning Banner]            │ ← If active
├─────────────────────────────────────┤
│ My Stops                    [+ Add] │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Stop A  │ │ Stop B  │ │ Stop C  │ │
│ │ 3, 8min │ │ 5, 12m  │ │ 2, 7min │ │
│ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────┤
│ [All] [My Alerts] | Filters         │
├─────────────────────────────────────┤
│ Active Alerts                       │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## Phase 4: i18n & Additional Features (Week 7-8)

### 4.1 French Language Support

- [ ] Install `svelte-i18n` package
- [ ] Create `src/lib/i18n/index.ts` setup file
- [ ] Create `src/lib/i18n/en.json` with all UI strings
- [ ] Create `src/lib/i18n/fr.json` with French translations
- [ ] Add `$t()` wrapper to all UI strings
- [ ] Add language toggle to Header (EN/FR buttons)
- [ ] Persist language preference to localStorage
- [ ] Update HTML `lang` attribute dynamically

**i18n Setup:**

```typescript
// src/lib/i18n/index.ts
import { browser } from "$app/environment";
import { init, register, locale } from "svelte-i18n";

register("en", () => import("./en.json"));
register("fr", () => import("./fr.json"));

const defaultLocale = "en";

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser
    ? localStorage.getItem("language") || navigator.language.split("-")[0]
    : defaultLocale,
});

// Persist language changes
if (browser) {
  locale.subscribe((l) => {
    if (l) localStorage.setItem("language", l);
  });
}
```

**Translation Files:**

```json
// src/lib/i18n/en.json
{
  "app.name": "TTC Alerts",
  "nav.home": "Home",
  "nav.preferences": "Preferences",
  "nav.routes": "Routes",
  "tabs.all": "All Alerts",
  "tabs.my": "My Alerts",
  "filters.delay": "Delay",
  "filters.detour": "Detour",
  "filters.disruption": "Disruption",
  "filters.resumed": "Resumed",
  "eta.minutes": "{minutes} min",
  "eta.loading": "Loading predictions...",
  "eta.noService": "No predictions available",
  "eta.addStop": "Add Stop",
  "accessibility.title": "Accessibility",
  "accessibility.textSize": "Text Size",
  "accessibility.reduceMotion": "Reduce Motion",
  "weather.warning": "Weather Warning"
}
```

```json
// src/lib/i18n/fr.json
{
  "app.name": "Alertes TTC",
  "nav.home": "Accueil",
  "nav.preferences": "Préférences",
  "nav.routes": "Lignes",
  "tabs.all": "Toutes les alertes",
  "tabs.my": "Mes alertes",
  "filters.delay": "Retard",
  "filters.detour": "Détour",
  "filters.disruption": "Perturbation",
  "filters.resumed": "Reprise",
  "eta.minutes": "{minutes} min",
  "eta.loading": "Chargement des prévisions...",
  "eta.noService": "Aucune prévision disponible",
  "eta.addStop": "Ajouter un arrêt",
  "accessibility.title": "Accessibilité",
  "accessibility.textSize": "Taille du texte",
  "accessibility.reduceMotion": "Réduire les animations",
  "weather.warning": "Avertissement météo"
}
```

---

### 4.2 Route Browser Page

- [ ] Create `src/routes/routes/+page.svelte`
- [ ] Organize routes by category (Subway, Streetcar, Bus, Express, Night)
- [ ] Display route badge + name for each
- [ ] Add quick jump navigation (A-Z or category tabs)
- [ ] Link each route to homepage with route filter applied
- [ ] Add route to navigation sidebar
- [ ] Add search/filter within route browser

**Route Categories:**

- Subway Lines (1-4)
- Streetcars (501-514)
- Regular Bus (1-199)
- Express Bus (900s)
- Night Bus (300s)
- Community Bus (400s)

---

### 4.3 Weather Warning Banner

- [ ] Create `src/lib/components/weather/WeatherWarningBanner.svelte`
- [ ] Fetch Environment Canada RSS feed client-side
- [ ] Parse XML for active warnings
- [ ] Filter for transit-relevant warnings (ice, snow, extreme cold)
- [ ] Display dismissible banner above main content
- [ ] Cache warnings in localStorage (15 min TTL)
- [ ] Add expand/collapse for full warning text

**Weather API:**

```typescript
const WEATHER_RSS = "https://weather.gc.ca/rss/city/on-143_e.xml";

interface WeatherWarning {
  title: string;
  summary: string;
  type: "warning" | "watch" | "advisory";
  expires: Date;
}

async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  const response = await fetch(WEATHER_RSS);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const entries = xml.querySelectorAll("entry");
  const warnings: WeatherWarning[] = [];

  entries.forEach((entry) => {
    const title = entry.querySelector("title")?.textContent || "";
    if (
      title.toLowerCase().includes("warning") ||
      title.toLowerCase().includes("watch")
    ) {
      warnings.push({
        title,
        summary: entry.querySelector("summary")?.textContent || "",
        type: title.toLowerCase().includes("warning") ? "warning" : "watch",
        expires: new Date(entry.querySelector("updated")?.textContent || ""),
      });
    }
  });

  return warnings;
}
```

---

## Phase 5: Polish & Testing (Week 9-10)

### 5.1 User Flow Testing

- [ ] Test new user onboarding flow
- [ ] Test returning user daily commute flow
- [ ] Test accessibility settings flow
- [ ] Test offline functionality
- [ ] Test ETA refresh behavior
- [ ] Test stop search performance with 11K stops
- [ ] Test text scaling at all sizes on various devices

### 5.2 Performance Optimization

- [ ] Measure IndexedDB init time
- [ ] Optimize stop search query performance
- [ ] Add loading skeletons throughout
- [ ] Implement virtual scrolling if needed for route browser
- [ ] Profile memory usage with large ETA datasets

### 5.3 Accessibility Audit

- [ ] Run axe-core automated tests
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Verify keyboard navigation throughout
- [ ] Check color contrast at all text scales
- [ ] Test reduced motion with actual animations

### 5.4 Documentation

- [ ] Update `APP_IMPLEMENTATION.md` with new files
- [ ] Update `DESIGN_SYSTEM.md` with new components
- [ ] Update `FEATURE_RECOMMENDATIONS.md` status
- [ ] Add inline code comments for complex logic
- [ ] Create user-facing help documentation

---

## Supabase Free Tier Impact Summary

| Feature             | Database   | Edge Functions | Egress       | Status   |
| ------------------- | ---------- | -------------- | ------------ | -------- |
| **Current App**     | 130 MB     | 50K/mo         | 300 MB/mo    | ✅       |
| Visibility-aware    | 0          | 0              | -100 MB/mo   | ✅ Saves |
| Accessibility       | 0          | 0              | 0            | ✅ None  |
| Stop bookmarks      | +1 KB/user | 0              | +10 MB/mo    | ✅ Low   |
| Stops in IndexedDB  | 0          | 0              | 0            | ✅ None  |
| ETA feature         | 0          | +50K/mo        | +100 MB/mo   | ✅ OK    |
| i18n                | 0          | 0              | +5 KB bundle | ✅ None  |
| Weather             | 0          | 0              | 0            | ✅ None  |
| **Projected Total** | ~135 MB    | ~100K/mo       | ~300 MB/mo   | ✅ Safe  |

**Free Tier Limits:** 500 MB database | 500K edge functions | 5 GB egress

---

## User Flow Diagrams

### New User Onboarding

```
First Visit
    ↓
App loads → IndexedDB setup shows "Loading TTC stops..." (3s)
    ↓
Homepage with all alerts visible
    ↓
Floating prompt: "Add stops to see arrival times" (dismissible)
    ↓
User taps "Add Stop" → Search overlay opens
    ↓
Types stop name → Autocomplete shows matches
    ↓
Taps selection → Stop bookmarked
    ↓
"My Stops" widget appears with ETA
    ↓
Optional: Sign in prompt to sync across devices
```

### Daily Commuter Flow

```
Open App
    ↓
"My Stops" widget shows ETAs for bookmarked stops
    ↓
Active alerts below, can filter to bookmarked routes
    ↓
Weather warning banner if applicable
    ↓
One tap to expand any alert thread
    ↓
Pull-to-refresh updates ETAs and alerts
    ↓
Background: Auto-refresh every 30s (visibility-aware)
```

### Accessibility Settings Flow

```
User opens Preferences
    ↓
Accessibility section visible (no sign-in required)
    ↓
Taps A++ for largest text
    ↓
Text immediately scales throughout app
    ↓
Toggles "Reduce motion" on
    ↓
All animations disabled instantly
    ↓
Returns to homepage with settings applied
    ↓
Settings persist via localStorage
```

---

## File Checklist

### New Files to Create

- [x] `src/lib/stores/visibility.ts` ✅ Phase 1
- [x] `src/lib/stores/accessibility.ts` ✅ Phase 1
- [x] `src/lib/stores/bookmarks.ts` ✅ Phase 2
- [x] `src/lib/stores/eta.ts` ✅ Phase 3
- [x] `src/lib/data/stops-db.ts` ✅ Phase 2
- [x] `static/data/ttc-stops.json` ✅ Phase 2 (9,346 stops)
- [x] `src/lib/components/stops/StopSearch.svelte` ✅ Phase 2
- [x] `src/lib/components/stops/BookmarkStopButton.svelte` ✅ Phase 2
- [x] `src/lib/components/stops/MyStopsWidget.svelte` ✅ Phase 2
- [x] `src/lib/components/eta/ETABadge.svelte` ✅ Phase 3
- [x] `src/lib/components/eta/ETACard.svelte` ✅ Phase 3
- [x] `src/lib/components/eta/ETAWidget.svelte` ✅ Phase 3
- [ ] `src/lib/components/weather/WeatherWarningBanner.svelte`
- [ ] `src/lib/i18n/index.ts`
- [ ] `src/lib/i18n/en.json`
- [ ] `src/lib/i18n/fr.json`
- [ ] `src/routes/routes/+page.svelte`
- [x] `supabase/functions/get-eta/index.ts` ✅ Phase 3
- [x] `supabase/migrations/20251204_bookmarked_stops.sql` ✅ Phase 2
- [x] `scripts/transform-gtfs.js` ✅ Phase 2

### Files to Modify

- [x] `src/lib/stores/alerts.ts` - Add visibility-aware fetching ✅ Phase 1
- [x] `src/routes/layout.css` - Add text scaling, reduce motion CSS ✅ Phase 1
- [x] `src/routes/+layout.svelte` - Initialize accessibility ✅ Phase 1
- [x] `src/routes/+page.svelte` - Add ETA widget ✅ Phase 3
- [x] `src/routes/preferences/+page.svelte` - Add accessibility section, stop search ✅ Phase 1 & 2
- [ ] `src/lib/components/layout/Header.svelte` - Add language toggle
- [ ] `src/lib/components/layout/Sidebar.svelte` - Add Routes nav item
- [x] `static/sw.js` - Upgrade caching strategies ✅ Phase 0, 1 & 3
- [x] `static/manifest.json` - Beta version name ✅ Phase 0
- [x] `package.json` - Add dexie dependency ✅ Phase 2
- [x] `src/lib/types/database.ts` - Add BookmarkedStop type ✅ Phase 2

---

## Success Metrics

| Metric                   | Target          | Measurement     |
| ------------------------ | --------------- | --------------- |
| IndexedDB init time      | < 3 seconds     | Performance API |
| Stop search latency      | < 100ms         | Performance API |
| ETA refresh rate         | 30 seconds      | Interval timer  |
| Offline alert viewing    | Works           | Manual testing  |
| Text scale rendering     | No overflow     | Visual testing  |
| Reduced motion           | Zero animations | Visual testing  |
| Lighthouse accessibility | > 95            | Lighthouse      |
| Bundle size increase     | < 50 KB         | Build output    |
| Supabase egress          | < 500 MB/mo     | Dashboard       |
