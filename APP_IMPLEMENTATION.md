# TTC Alerts PWA - Implementation Status

## Overview

Real-time Toronto Transit alerts with biometric authentication.

| Stack      | Details                                                     |
| ---------- | ----------------------------------------------------------- |
| Frontend   | Svelte 5 + TypeScript + Tailwind + shadcn-svelte            |
| Typography | Lexend (dyslexic-friendly) via Google Fonts                 |
| Backend    | Supabase (DB, Edge Functions, Realtime)                     |
| Auth       | Custom WebAuthn (displayName + biometrics + recovery codes) |
| Hosting    | Cloudflare Pages                                            |

📐 **Design System**: See [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) for colors, typography, spacing, and component patterns.

---

## 🔀 Version A/B Deployment

| Attribute    | Version A (Stable)                  | Version B (Beta)                              |
| ------------ | ----------------------------------- | --------------------------------------------- |
| **Branch**   | `main`                              | `version-b`                                   |
| **URL**      | https://ttc-alerts-svelte.pages.dev | https://version-b.ttc-alerts-svelte.pages.dev |
| **PWA Name** | "TTC Alerts"                        | "TTC Alerts Beta"                             |
| **SW Cache** | `ttc-alerts-v2`                     | `ttc-alerts-beta-v1`                          |
| **Status**   | ✅ Production                       | 🚧 Development                                |

> ⚠️ **This document tracks Version B (`version-b` branch)**. Version A features are a subset.

### Feature Availability

| Feature                      | Version A | Version B |
| ---------------------------- | --------- | --------- |
| Real-time alerts             | ✅        | ✅        |
| WebAuthn authentication      | ✅        | ✅        |
| Planned maintenance widget   | ✅        | ✅        |
| Accessibility settings       | ❌        | ✅        |
| Visibility-aware polling     | ❌        | ✅        |
| Stop search (9,346 stops)    | ❌        | ✅        |
| Stop bookmarks               | ❌        | ✅        |
| Nearby stops (geolocation)   | ❌        | ✅        |
| Location permission settings | ❌        | ✅        |
| ETA predictions              | ❌        | ✅        |
| GTFS scheduled departures    | ❌        | ✅        |
| Route Browser                | ❌        | ✅        |
| Weather warnings             | ❌        | ✅        |
| French language (i18n)       | ❌        | ✅        |

---

## Status Summary (Version B)

| Phase                           | Status      | %    |
| ------------------------------- | ----------- | ---- |
| Backend (Supabase)              | ✅ Complete | 100% |
| Frontend (Svelte)               | ✅ Complete | 100% |
| PWA Features                    | ✅ Complete | 100% |
| Phase 0: Version A/B Setup      | ✅ Complete | 100% |
| Phase 1: Accessibility          | ✅ Complete | 100% |
| Phase 2: Stop Database & Search | ✅ Complete | 100% |
| Phase 3: ETA Feature            | ✅ Complete | 100% |
| Phase 4: i18n & Features        | ✅ Complete | 100% |
| Phase 5: Polish & Testing       | 🚧 Progress | 50%  |

**Version A URL**: https://ttc-alerts-svelte.pages.dev  
**Version B URL**: https://version-b.ttc-alerts-svelte.pages.dev

---

## File Structure

### Frontend (`src/lib/`)

| File                                             | Status | Purpose                                                       |
| ------------------------------------------------ | ------ | ------------------------------------------------------------- |
| `components/alerts/AccessibilityBadge.svelte`    | ✅     | Wheelchair icon badge for elevator/escalator alerts 🆕        |
| `components/alerts/AlertCard.svelte`             | ✅     | Alert cards w/ accessibility badge, route deduplication (v50) |
| `components/alerts/RSZAlertCard.svelte`          | ✅     | Reduced Speed Zone alerts - grouped table display 🆕          |
| `components/alerts/BookmarkRouteButton.svelte`   | ✅     | Save route button with feedback animation 🆕 **B**            |
| `components/alerts/CategoryFilter.svelte`        | ✅     | Severity category tabs (Major/Minor/Accessibility) - WCAG AA  |
| `components/alerts/ClosuresView.svelte`          | ✅     | Scheduled tab with closure type badges (nightly/weekend)      |
| `components/alerts/FilterChips.svelte`           | ✅     | Category filter buttons                                       |
| `components/alerts/MaintenanceWidget.svelte`     | ✅     | Scheduled maintenance display                                 |
| `components/alerts/MyRouteAlerts.svelte`         | ✅     | My Routes tab with responsive route badge tabs                |
| `components/alerts/RouteBadge.svelte`            | ✅     | TTC-branded route badges (full names, colors)                 |
| `components/alerts/StatusBadge.svelte`           | ✅     | Status indicators (Delay, Detour, Resumed, etc.)              |
| `components/dialogs/HowToUseDialog.svelte`       | ✅     | User guide with sections and bottom sheet on mobile           |
| `components/dialogs/AboutDialog.svelte`          | ✅     | App info, version, links                                      |
| `components/dialogs/ReportIssueDialog.svelte`    | ✅     | Bug/issue report form with Turnstile + Resend                 |
| `components/dialogs/FeatureRequestDialog.svelte` | ✅     | Feature suggestion form with Turnstile + Resend               |
| `components/dialogs/InstallPWADialog.svelte`     | ✅     | PWA install prompt                                            |
| `components/layout/Header.svelte`                | ✅     | App header - language toggle, hamburger menu w/ iOS safe area |
| `components/layout/PullToRefresh.svelte`         | ✅     | Touch-based pull-to-refresh - preserves sticky header         |
| `components/layout/Sidebar.svelte`               | ✅     | Desktop sidebar - nav + footer links (no How to Use)          |
| `components/layout/MobileBottomNav.svelte`       | ✅     | Mobile navigation with iOS PWA safe-area-inset-bottom         |
| `components/ui/*`                                | ✅     | shadcn-svelte base components                                 |
| `components/ui/turnstile/`                       | ✅     | Cloudflare Turnstile captcha component                        |
| `services/webauthn.ts`                           | ✅     | WebAuthn browser API wrapper                                  |
| `stores/alerts.ts`                               | ✅     | Alerts state + 30-day accessibility query window              |
| `stores/auth.ts`                                 | ✅     | Custom WebAuthn auth store                                    |
| `stores/dialogs.ts`                              | ✅     | Shared dialog state (hamburger menu → dialogs)                |
| `stores/preferences.ts`                          | ✅     | User preferences state                                        |
| `types/auth.ts`                                  | ✅     | Auth TypeScript types                                         |
| `types/database.ts`                              | ✅     | Database types (JSONB fields)                                 |
| `supabase.ts`                                    | ✅     | Supabase client config                                        |
| `utils.ts`                                       | ✅     | Utility functions                                             |
| `utils/ttc-service-info.ts`                      | ✅     | TTC service hours, holidays, suspended lines 🆕 **B**         |

### Pages (`src/routes/`)

| File                              | Status | Purpose                                                       |
| --------------------------------- | ------ | ------------------------------------------------------------- |
| `+layout.svelte`                  | ✅     | App layout, auth init, dialogs                                |
| `+page.svelte`                    | ✅     | Homepage with alert tabs + ETA                                |
| `alerts/+page.svelte`             | ✅     | Alerts page with tabs, subway status grid, accordion sections |
| `alerts-archive/+page.svelte.bak` | 📦     | Archived original alerts page                                 |
| `preferences/+page.svelte`        | ✅     | Route/mode preferences                                        |
| `settings/+page.svelte`           | ✅     | Settings with stops, routes, prefs, location 🆕 **B**         |
| `routes/+page.svelte`             | ✅     | Route browser by category 🆕 **B**                            |
| `routes/[route]/+page.svelte`     | ✅     | Route detail page with active alerts (filtered from resolved) |
| `auth/callback/+page.svelte`      | ✅     | Auth callback handler                                         |

### Backend (`supabase/`)

| File                                    | Status | Purpose                                                     |
| --------------------------------------- | ------ | ----------------------------------------------------------- |
| `functions/_shared/auth-utils.ts`       | ✅     | CORS + Supabase client factory                              |
| `functions/auth-register/index.ts`      | ✅     | User registration + recovery codes (uses Supabase Auth)     |
| `functions/auth-challenge/index.ts`     | ✅     | Generate WebAuthn challenge                                 |
| `functions/auth-verify/index.ts`        | ✅     | Verify biometrics, create session                           |
| `functions/auth-session/index.ts`       | ✅     | Validate existing session                                   |
| `functions/auth-recover/index.ts`       | ✅     | Sign in with recovery code                                  |
| `functions/poll-alerts/index.ts`        | ✅     | Fetch/parse/thread alerts (v50: subway route deduplication) |
| `functions/scrape-maintenance/index.ts` | ✅     | Scrape maintenance schedule                                 |
| `functions/get-eta/index.ts`            | ✅     | Fetch TTC ETA: NextBus (surface) + NTAS (subway) 🆕 **B**   |

### Database (EXISTING in Supabase)

| Table                  | Rows | Purpose                                                  |
| ---------------------- | ---- | -------------------------------------------------------- |
| `alert_cache`          | 600+ | Alerts from Bluesky (header_text, categories, is_latest) |
| `incident_threads`     | 255K | Grouped alert threads (title, is_resolved)               |
| `planned_maintenance`  | 9    | Scheduled maintenance                                    |
| `user_profiles`        | -    | User display_name, linked to auth.users                  |
| `webauthn_credentials` | -    | Public keys (credential_id as PK)                        |
| `recovery_codes`       | -    | Bcrypt-hashed one-time codes                             |
| `user_preferences`     | -    | Routes, modes, notification settings, bookmarked_stops   |

### Static (`static/`)

| File                              | Status | Purpose                                                                         |
| --------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `manifest.json`                   | ✅     | PWA manifest (Version B: "TTC Alerts Beta")                                     |
| `sw.js`                           | ✅     | Service worker (Version B: beta cache prefix)                                   |
| `icons/*`                         | ✅     | All PWA icons (72-512px)                                                        |
| `data/ttc-stops.json`             | ✅     | TTC stops database (9,346 stops, 184 subway w/ sequence) 🆕 **V-B**             |
| `data/ttc-route-stop-orders.json` | ✅     | Per-route ordered stop lists (210 routes, auto-generated from NextBus API) 🆕 **V-B** |
| `data/ttc-schedules.json`         | ✅     | First departure schedules (weekday/sat/sun) 🆕 **V-B**                          |

### Data (`src/lib/data/`) 🆕 **Version B Only**

| File                         | Status | Purpose                                                                  |
| ---------------------------- | ------ | ------------------------------------------------------------------------ |
| `stops-db.ts`                | ✅     | IndexedDB layer with Dexie.js, GTFS direction/sequence for subway        |
| `ttc-route-stop-orders.json` | ✅     | Route stop ordering (210 routes, auto-generated from NextBus API) 🆕 **V-B** |
| `route-names.ts`             | ✅     | Comprehensive TTC route name lookup (220+ routes)                        |

### Stops Components (`src/lib/components/stops/`) 🆕 **Version B Only**

| File                        | Status | Purpose                                                       |
| --------------------------- | ------ | ------------------------------------------------------------- |
| `StopSearch.svelte`         | ✅     | Stop search with autocomplete, direction badges, ID search    |
| `BookmarkStopButton.svelte` | ✅     | Bookmark toggle button for stops                              |
| `MyStops.svelte`            | ✅     | Full-page My Stops list                                       |
| `MyStopsEmpty.svelte`       | ✅     | Empty state for My Stops                                      |
| `MyStopsWidget.svelte`      | ✅     | Display bookmarked stops on homepage                          |
| `RouteDirectionTabs.svelte` | ✅     | Direction tabs for route pages (terminal names for subway)    |
| `RouteMapPreview.svelte`    | ✅     | Map preview for route stops                                   |
| `RouteStopItem.svelte`      | ✅     | Stop item with ETA, platform badges, subway direction parsing |
| `RouteStopsList.svelte`     | ✅     | List of stops with ETA expand/collapse, routeFilter prop      |
| `index.ts`                  | ✅     | Component exports                                             |

### ETA Components (`src/lib/components/eta/`) 🆕 **Version B Only**

| File                       | Status | Purpose                                                                            |
| -------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `ETABadge.svelte`          | ✅     | Individual arrival time badge with urgency                                         |
| `ETACard.svelte`           | ✅     | Route-grouped ETA card w/ live times + GTFS scheduled first bus for routes w/o ETA |
| `ETAWidget.svelte`         | ✅     | Homepage widget showing bookmarked stop ETAs                                       |
| `ETADirectionSlide.svelte` | ✅     | Direction carousel slide for ETA swiper 🆕                                         |
| `LiveSignalIcon.svelte`    | ✅     | Animated signal icon for real-time predictions                                     |

**ETACard Features**:

- **Live ETA Display**: Real-time predictions with live signal icon, route badge, direction/destination
- **Scheduled First Bus**: For routes without live data, shows GTFS scheduled first bus times
- **Blue Visual Distinction**: Scheduled section has blue-tinted background to distinguish from live ETAs
- **No Service Indicator**: Shows "No Service" for routes that don't run on current day (e.g., 939 on weekends)
- **Day Type Header**: "Scheduled Next Bus · Weekday (Friday)" with current day name
- **Responsive Layout**: Vertical on mobile (5xl time), horizontal on desktop (4xl time)
- **Vehicle-Type Empty State**: Context-aware messages for buses vs subway

### Weather Components (`src/lib/components/weather/`) 🆕 **Version B Only**

| File                          | Status | Purpose                                                 |
| ----------------------------- | ------ | ------------------------------------------------------- |
| `WeatherWarningBanner.svelte` | ✅     | Transit-relevant weather alerts from Environment Canada |

### i18n (`src/lib/i18n/`) 🆕 **Version B Only**

| File                   | Status | Purpose                                       |
| ---------------------- | ------ | --------------------------------------------- |
| `index.ts`             | ✅     | svelte-i18n setup with locale detection       |
| `en.json`              | ✅     | English translations (SOURCE - edit this)     |
| `fr.json`              | ✅     | French translations (SOURCE - edit this)      |
| `translations/en.json` | ✅     | English translations (GENERATED - don't edit) |
| `translations/fr.json` | ✅     | French translations (GENERATED - don't edit)  |

**Translation Automation Workflow:**

1. **Source Files**: `src/lib/i18n/en.json` and `src/lib/i18n/fr.json` are the SOURCE OF TRUTH
2. **Generated Files**: `src/lib/i18n/translations/*.json` are GENERATED by the translate script
3. **Script**: `scripts/translate-i18n.cjs` syncs source → translations and uses DeepL API for auto-translation
4. **Build Process**: `npm run translate && npm run build` (or just `npm run build` which runs translate first)

**Adding New Translation Keys:**

1. Add the English key to `src/lib/i18n/en.json`
2. Add the French translation to `src/lib/i18n/fr.json` (or leave for DeepL auto-translate)
3. Run `npm run translate` to sync to translations folder
4. Use in components: `$_('your.new.key')` or `$_('your.key', { values: { param: value } })`

⚠️ **NEVER edit files in `translations/` folder** - they are overwritten by the translate script!

### Stores (`src/lib/stores/`) 🆕 **Version B additions**

| File                  | Status | Purpose                                                               | Version |
| --------------------- | ------ | --------------------------------------------------------------------- | ------- |
| `alerts.ts`           | ✅     | Alerts state + date validation filter                                 | A & B   |
| `auth.ts`             | ✅     | Custom WebAuthn auth store                                            | A & B   |
| `preferences.ts`      | ✅     | User preferences state (cloud sync)                                   | A & B   |
| `localPreferences.ts` | ✅     | Local preferences (theme, text size, reduce motion, i18n)             | **B**   |
| `visibility.ts`       | ✅     | Track document visibility for polling control                         | **B**   |
| `accessibility.ts`    | ✅     | Text scaling and reduce motion settings                               | **B**   |
| `bookmarks.ts`        | ✅     | Bookmarked stops (localStorage + Supabase sync)                       | **B**   |
| `savedStops.ts`       | ✅     | Saved stops (IndexedDB storage)                                       | **B**   |
| `savedRoutes.ts`      | ✅     | Saved routes (IndexedDB storage)                                      | **B**   |
| `eta.ts`              | ✅     | ETA state with auto-refresh, subway detection via route name patterns | **B**   |

### Services (`src/lib/services/`)

| File                 | Status | Purpose                                                                | Version |
| -------------------- | ------ | ---------------------------------------------------------------------- | ------- |
| `webauthn.ts`        | ✅     | WebAuthn browser API wrapper                                           | A & B   |
| `storage.ts`         | ✅     | IndexedDB storage for stops, routes, preferences                       | **B**   |
| `schedule-lookup.ts` | ✅     | GTFS schedule lookup with holiday detection, first bus times, day type | **B**   |

**Schedule Lookup Features (`schedule-lookup.ts`)**:

> ⚠️ **Important**: Scheduled times are only displayed as a **fallback** when no real-time ETA data is available for a route. Routes with live predictions always show live ETA instead.

- **GTFS Data**: 9,270 stops with first bus times (weekday/saturday/sunday)
- **Day Type Detection**: Weekday, Saturday, Sunday (auto-detected)
- **Holiday Handling**: TTC holidays use Sunday schedule (2025-2026 holidays defined)
- **Express Route PM Schedule**: 9xx routes show PM first departure (after 3PM) on weekday afternoons when no live ETA
- **No Weekend Service**: Express routes (9xx) show "No Weekend Service" on Sat/Sun (express routes don't operate weekends)
- **No Service Detection**: Routes without schedule data show "No Service"
- **12-Hour Format**: Times displayed as "5:21 AM" format

### Utilities (`src/lib/utils/`) 🆕 **Version B Only**

| File                  | Status | Purpose                                                   |
| --------------------- | ------ | --------------------------------------------------------- |
| `ttc-service-info.ts` | ✅     | TTC service hours, holidays, suspended lines, frequencies |

**TTC Service Info (`ttc-service-info.ts`)**:

- **Annual Holiday Updates**: 2025 & 2026 holiday schedules (update from https://www.ttc.ca/riding-the-ttc/Updates/Holiday-service)
- **Line Hours**: Lines 1/2/4 subway (6am-2am Mon-Sat, 8am-2am Sun) vs Line 6 LRT (5:30am-1:30am)
- **Suspended Lines**: Easy toggle when lines are suspended/restored (Line 6 enabled - opened Dec 14, 2024)
- **Service Frequency**: Rush hour (2-3 min), off-peak (4-5 min), weekend, Sunday, holiday
- **Empty State Messages**: Context-aware messages based on time/day/holiday/line suspension and vehicle type (bus vs subway)

### Configuration (`src/`)

| File       | Status | Purpose                                           |
| ---------- | ------ | ------------------------------------------------- |
| `app.html` | ✅     | HTML template, Lexend font, blocking theme script |
| `app.d.ts` | ✅     | SvelteKit app type declarations                   |

### Scripts (`scripts/`) 🆕 **Version B Only**

| File                         | Status | Purpose                                                                  |
| ---------------------------- | ------ | ------------------------------------------------------------------------ |
| `transform-gtfs.js`          | ✅     | Transform GTFS data, extract direction, sequence for subway/LRT          |
| `generate-icons.js`          | ✅     | Generate PWA icons from source                                           |
| `translate-i18n.cjs`         | ✅     | Sync i18n source files to translations folder, DeepL API                 |
| `process-gtfs-schedules.ts`  | ✅     | Process TTC GTFS data to extract first departure times (AM + PM for 9xx) |
| `fetch-route-sequences.cjs`  | ✅     | Fetch sequential stop orders from NextBus API (210 routes) 🆕            |

### Migrations (`supabase/migrations/`)

| File                                 | Status | Purpose                                    | Version |
| ------------------------------------ | ------ | ------------------------------------------ | ------- |
| `20241204_auth_tables.sql`           | ✅     | WebAuthn auth tables                       | A & B   |
| `20251204_bookmarked_stops.sql`      | ✅     | Add bookmarked_stops column to preferences | **B**   |
| `20251210_cleanup_cron.sql`          | ✅     | Automated 15-day retention cleanup         | **B**   |
| `20251210_threading_constraints.sql` | ✅     | JSONB constraints, helper functions        | **B**   |

---

## Auth System

**Custom WebAuthn** using existing Supabase schema

### Schema Notes

- Uses `user_profiles` linked to `auth.users` (NOT custom `users` table)
- Uses `display_name` for identification (NOT `username`)
- Credentials use `credential_id` as primary key (NOT `id`)
- Recovery codes use `used` boolean (NOT `used_at` timestamp)
- Sessions stored in `user_preferences.push_subscription` JSON field

### Flow

1. **Sign Up**: DisplayName → Supabase Auth user → WebAuthn biometrics → 8 recovery codes
2. **Sign In**: DisplayName → WebAuthn biometrics → Session stored in localStorage
3. **Recovery**: DisplayName → Recovery code → Session created

### Feature Access

| Feature          | Auth Required |
| ---------------- | ------------- |
| View alerts      | ❌ No         |
| View preferences | ❌ No         |
| Save preferences | ✅ Yes        |
| "My Alerts" tab  | ✅ Yes        |

---

## External APIs

### Currently Integrated

| API                        | Endpoint                                                       | Purpose                                                          | Used By                                                |
| -------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| **TTC NextBus**            | `https://retro.umoiq.com/service/publicJSONFeed`               | Real-time bus/streetcar ETAs + route configuration               | `nextbus.ts`, `get-eta` Edge Function, stop sequencing |
| **TTC NTAS**               | `https://ntas.ttc.ca/api/ntas/get-next-train-time`             | Real-time subway train arrivals                                  | `get-eta` Edge Function                                |
| **TTC Live Alerts**        | `https://alerts.ttc.ca/api/alerts/live-alerts`                 | Official real-time service alerts (RSZ, resolution verification) | `poll-alerts` Edge Function                            |
| **Bluesky Feed**           | `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed` | @ttcalerts.bsky.social service alerts (primary source)           | `poll-alerts` Edge Function                            |
| **Environment Canada RSS** | `https://weather.gc.ca/rss/city/on-143_e.xml`                  | Toronto weather warnings                                         | `WeatherWarningBanner.svelte`                          |
| **AllOrigins Proxy**       | `https://api.allorigins.win/raw?url=...`                       | CORS proxy fallback for weather                                  | `WeatherWarningBanner.svelte`                          |
| **Cloudflare Turnstile**   | `challenges.cloudflare.com/turnstile/v0/api.js`                | Bot protection for forms                                         | `Turnstile.svelte`                                     |

### TTC Live Alerts API

**Endpoint:** `https://alerts.ttc.ca/api/alerts/live-alerts`

**Current Usage in `poll-alerts`:**

- ✅ **Sole source for RSZ alerts** - All BlueSky RSZ posts filtered; TTC API provides exact stop locations
- ✅ **Cross-check resolution** - Verifies if routes are still impacted; auto-resolves threads when cleared
- ✅ **Gap-filling** - Creates alerts for routes not yet posted by @ttcalerts

**Response Structure:**

```json
{
  "total": 20,
  "lastUpdated": "2025-12-20T22:38:02.92Z",
  "rszLastUpdated": "2025-12-19T07:11:18.413Z",
  "routes": [
    {
      "id": "59204",
      "alertType": "Planned",
      "route": "1",
      "routeType": "Subway",
      "routeBranch": "",
      "title": "Line 1 Yonge-University Regular service has resumed...",
      "headerText": "...",
      "description": "",
      "direction": "Southbound",
      "effect": "NO_EFFECT|SIGNIFICANT_DELAYS|...",
      "effectDesc": "Regular service|Reduced Speed Zone|...",
      "severity": "Critical|Minor",
      "cause": "TECHNICAL_PROBLEM|MEDICAL_EMERGENCY|MAINTENANCE|OTHER_CAUSE",
      "causeDescription": "Mechanical problem|Track issue|...",
      "stopStart": "Davisville",
      "stopEnd": "Davisville",
      "stopIDList": ["Davisville"],
      "activePeriod": { "start": "...", "end": "..." },
      // RSZ-specific fields:
      "rszLength": "152",
      "distance": "891",
      "trackPercent": "17",
      "reducedSpeed": "25",
      "averageSpeed": "32",
      "targetRemoval": "Early 2026"
    }
  ]
}
```

**Key Fields:**
| Field | Description |
|-------|-------------|
| `route` | Route number (1, 2, 501, etc.) |
| `routeType` | Subway, Streetcar, Bus |
| `direction` | Northbound, Southbound, Eastbound, Westbound |
| `effect` | NO_EFFECT, SIGNIFICANT_DELAYS, NO_SERVICE, etc. |
| `effectDesc` | Human-readable effect description |
| `severity` | Critical, Minor |
| `cause` | TECHNICAL_PROBLEM, MEDICAL_EMERGENCY, MAINTENANCE, OTHER_CAUSE |
| `stopStart`, `stopEnd` | Station/stop names for range |
| `rszLength`, `reducedSpeed`, `targetRemoval` | RSZ-specific metrics |

**Advantages over Bluesky:**

- ✅ Structured JSON (no text parsing needed)
- ✅ Official route/line identification
- ✅ Direction, cause, effect pre-categorized
- ✅ Station start/end information
- ✅ RSZ metrics (speed %, distance, removal date)
- ✅ Severity levels

### TTC NextBus routeConfig API

**Endpoint:** `https://retro.umoiq.com/service/publicJSONFeed?command=routeConfig&a=ttc&r={routeNumber}`

**Purpose:** Provides **sequential stop ordering** for any TTC bus/streetcar route. Used to generate `ttc-route-stop-orders.json`.

**Response Structure:**

```json
{
  "route": {
    "tag": "116",
    "title": "116-Morningside",
    "stop": [
      {"tag": "14090", "stopId": "14559", "title": "Morningside Ave At Finch Ave East", "lat": "43.8195", "lon": "-79.2214"},
      ...
    ],
    "direction": [
      {
        "tag": "116_1_116",
        "name": "West",
        "title": "West - 116 Morningside towards Kennedy Station",
        "stop": [
          {"tag": "14090"},
          {"tag": "6149"},
          ... // Ordered stop tags
        ]
      },
      {
        "tag": "116_0_116am*",
        "name": "East",
        "title": "East - 116 Morningside towards Finch and Morningside",
        "stop": [...]
      }
    ]
  }
}
```

**Key Features:**
| Field | Description |
|-------|-------------|
| `route.stop[]` | Master stop list with tag→stopId mapping |
| `direction[].stop[]` | **Ordered** stop tags for each direction |
| `direction[].name` | Direction name (West, East, North, South) |
| `direction[].tag` | Unique direction identifier |

**Validation:** Route 116 was validated on 2025-01-14 - NextBus API sequence matches manual override exactly (50 Westbound + 57 Eastbound stops).

📚 **See also:** [`alert-categorization-and-threading.md`](alert-categorization-and-threading.md) for full alert source integration details.

---

## Next Steps

| Priority | Task                              | Status      |
| -------- | --------------------------------- | ----------- |
| 1        | Set WebAuthn env vars (see below) | ⚠️ Required |
| 2        | Test full auth flow end-to-end    | ❌ Pending  |

### Cloudflare Pages Deployment

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/)
2. Create new project → Connect to Git → Select `ttc-alerts-svelte`
3. Configure build:
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Environment variables** (⚠️ CRITICAL - must match Supabase project):
     - `VITE_SUPABASE_URL` = `https://wmchvmegxcpyfjcuzqzk.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key from Supabase project settings)
4. Deploy!

> ⚠️ **IMPORTANT**: Ensure `VITE_SUPABASE_URL` matches the project where Edge Functions are deployed.
> Current production Supabase: `wmchvmegxcpyfjcuzqzk` (NOT `ttgytjgpbmkobqvrtbvx`)

### Environment Variables (Set in Supabase Dashboard)

Go to: **Project Settings → Edge Functions → Secrets**

```
WEBAUTHN_RP_ID=ttc-alerts-svelte.pages.dev
WEBAUTHN_RP_NAME=TTC Alerts
WEBAUTHN_ORIGIN=https://ttc-alerts-svelte.pages.dev
```

For local development, use `localhost` and `http://localhost:5173`.

---

## Deployed Edge Functions

| Function           | Status | URL                                                                        |
| ------------------ | ------ | -------------------------------------------------------------------------- |
| auth-register      | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-register`      |
| auth-challenge     | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-challenge`     |
| auth-verify        | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-verify`        |
| auth-session       | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-session`       |
| auth-recover       | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-recover`       |
| poll-alerts        | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/poll-alerts` (v50)  |
| get-eta            | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/get-eta`            |
| scrape-maintenance | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/scrape-maintenance` |
| submit-feedback    | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/submit-feedback`    |

### submit-feedback Edge Function

Handles bug reports and feature requests with Cloudflare Turnstile captcha verification and Resend email delivery.

**Secrets Required:**
| Secret | Purpose |
|--------|---------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile verification |
| `RESEND_API_KEY` | Resend email API |

**Request Body:**

```json
{
  "type": "bug|usability|data-error|complaint|other|feature",
  "title": "Issue title (3-100 chars)",
  "description": "Details (10-2000 chars)",
  "email": "optional@email.com",
  "turnstileToken": "captcha-token",
  "userAgent": "navigator.userAgent",
  "url": "current page URL"
}
```

---

## Changelog

### Dec 20, 2025 - Feedback System & Form Dialog UX

**Change:** Added Report Issue and Feature Request forms with Cloudflare Turnstile captcha and Resend email delivery.

**New Components:**

- `ReportIssueDialog.svelte` - Bug/issue report form with 5 issue categories
- `FeatureRequestDialog.svelte` - Feature suggestion form
- `AboutDialog.svelte` - App info and version
- `HowToUseDialog.svelte` - User guide (updated with bottom sheet)
- `stores/dialogs.ts` - Shared dialog state for hamburger menu
- `components/ui/turnstile/` - Cloudflare Turnstile captcha component
- `submit-feedback` Edge Function - Turnstile verification + Resend email

**Form Dialog UX Patterns:**

- ✅ Mobile: Bottom sheet (fixed bottom, rounded top corners, max 85vh)
- ✅ Desktop: Centered modal (max-width 28rem)
- ✅ Header: Left-aligned with top-aligned icon
- ✅ Text hierarchy: `opacity-50` for descriptions/hints, `text-muted-foreground/60` for counts
- ✅ Email validation (optional but validates format if provided)
- ✅ Placeholder text: Consistent `#71717a` (zinc-500)
- ✅ Close button: Enlarged to `size-5`

**Issue Types:**
| Type | Icon | Use Case |
|------|------|----------|
| Bug | Bug | Technical bugs |
| Usability | AlertTriangle | UX problems |
| Data Error | Database | Incorrect alert data |
| Complaint | MessageSquare | General complaints |
| Other | HelpCircle | Miscellaneous |

**Files Updated:**

- `DESIGN_SYSTEM.md` - Added form dialog patterns, text hierarchy, input validation
- `APP_IMPLEMENTATION.md` - Added new components and Edge Function
- `en.json` / `fr.json` - Added issue type translations

### Dec 16, 2025 - Remove Subway Line Accordion Grouping

**Change:** Removed accordion-style grouping wrapper for subway line alerts.

**Details:**

- ✅ All alerts now display directly without "Line X" accordion wrapper
- ✅ Removed `alertsByLine` derived store and related grouping logic
- ✅ Removed `expandedSections` state and `toggleAccordion` function
- ✅ Removed ~80 lines of accordion CSS styles
- ✅ Kept `getSubwayLineFromThread` helper for lineColor prop on AlertCards

**Rationale:** Simplify UI - alerts are displayed flat with subway line colors preserved via `lineColor` prop.

**Files Updated:**

- `src/routes/alerts/+page.svelte` - Removed accordion code, render alerts directly

### Dec 16, 2025 - Toast Notification Improvements

**Change:** Enhanced toast notifications for better contrast, consistency, and accessibility.

**Details:**

- ✅ Changed toast backgrounds from transparent to solid colors for WCAG AA contrast
- ✅ Standardized "removed" actions from info→success toasts across app
- ✅ Added distinct colors per toast type: green (success), blue (info), amber (warning), red (error)
- ✅ Added icon styling (20x20px, inherits color) for visual consistency
- ✅ Added i18n translations for toast descriptions (3 new keys)

**Color System:**
| Type | Background | Usage |
|---------|---------------------|----------------------------|
| Success | Green (142 72% 29%) | Actions completed, removes |
| Info | Blue (217 91% 40%) | Neutral information |
| Warning | Amber (38 92% 40%) | Caution states |
| Error | Red (0 84% 45%) | Errors, failures |

**Files Updated:**

- `src/lib/components/ui/sonner/sonner.svelte` - Solid background colors
- `src/routes/layout.css` - Toast CSS with distinct colors and icon styling
- `src/lib/i18n/translations/en.json` - Added toast description translations
- `src/routes/settings/+page.svelte` - Use i18n for toast descriptions
- `src/lib/components/alerts/BookmarkRouteButton.svelte` - info→success
- `src/lib/components/stops/BookmarkStopButton.svelte` - info→success
- `src/lib/components/stops/RouteStopItem.svelte` - info→success
- `DESIGN_SYSTEM.md` - Added Toast Notifications section

### Dec 16, 2025 - Subway Status Cards Non-Clickable

**Change:** Made subway status cards in the alerts page header non-interactive.

**Details:**

- ✅ Changed `<button>` elements to `<div>` elements
- ✅ Removed click handler (previously scrolled to line section)
- ✅ Removed hover/active CSS effects and cursor pointer
- ✅ Removed accordion pulse highlight animation (~80 lines CSS)
- ✅ Removed unused state variables (`highlightedLineId`, `highlightTimeout`)

**Rationale:** Simplify UI - status cards show line status (Normal/Delay/Disruption/Scheduled) without interaction.

**Files Updated:**

- `src/routes/alerts/+page.svelte` - Converted button to div, removed click behavior and related CSS

### Dec 16, 2025 - Hide Resolved Accessibility Alerts

**Change:** Resolved accessibility (elevator/escalator) alerts no longer appear in Resolved tab.

**Details:**

- ✅ `resolvedAlerts` derived now filters out alerts with ACCESSIBILITY severity
- ✅ "Working again" updates aren't newsworthy like "service resumed" for regular alerts

**Files Updated:**

- `src/routes/alerts/+page.svelte` - Added ACCESSIBILITY severity filter to resolvedAlerts

### Dec 16, 2025 - Fix Duplicate Route Badges for Subway Lines

**Problem:** Subway alerts showed duplicate badges (e.g., "Line 6" and "6" separately).

**Fixes:**

- ✅ poll-alerts v50: Track `subwayLineNumbers` Set to skip redundant routes
- ✅ AlertCard.svelte: Normalize subway line numbers (1-6) to "Line X" format

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - v50 deployed
- `src/lib/components/alerts/AlertCard.svelte` - SUBWAY_LINE_NUMBERS normalization

### Dec 16, 2025 - Fix Orphan Threading (Sort Posts Oldest-First)

**Problem:** SERVICE_RESUMED alerts orphaned when processed before parent DELAY thread.

**Root Cause:** Bluesky returns posts newest-first, so resolution posts were processed before their parent threads existed.

**Fix:** Sort Bluesky posts by `createdAt` ascending before processing.

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - v49 deployed

### Dec 16, 2025 - RSZ Alerts Priority and Badge Count

**Problem:** RSZ alerts showed at top of lists, and Major tab badge didn't count active scheduled closures.

**Fixes:**

- ✅ RSZ alerts now display at **bottom** of My Routes (after scheduled closures and regular alerts)
- ✅ RSZ alerts now display at **bottom** of Minor tab (after all other alerts)
- ✅ Major tab badge now includes active scheduled maintenance count

**Priority Order (both My Routes and Minor tab):**

1. Scheduled closures (if active and matching routes)
2. Regular alerts (delays, service issues)
3. RSZ alerts (lowest priority)

**Files Updated:**

- `src/lib/components/alerts/MyRouteAlerts.svelte` - Moved RSZ section after regular alerts
- `src/routes/alerts/+page.svelte` - Moved RSZ section to bottom, fixed severityCounts

### Dec 16, 2025 - Scheduled Closures in My Routes Tab

**Problem:** Active scheduled closures not showing in My Routes tab.

**Fix:** My Routes now displays active scheduled maintenance when:

1. User has matching subway line saved (e.g., Line 1)
2. The closure is currently happening (using same `isMaintenanceHappeningNow()` logic as Major tab)

**Files Updated:**

- `src/lib/components/alerts/MyRouteAlerts.svelte` - Added maintenance import, helpers, and display

### Dec 16, 2025 - My Routes Tab: Resolved Filter and RSZ Grouping

**Problem:** My Routes tab showing SERVICE_RESUMED alerts and RSZ alerts as individual cards instead of grouped table.

**Fixes:**

- ✅ Added `isResolved()` helper to filter out resolved/resumed alerts from My Routes
- ✅ Added `isRSZAlert()` helper to identify TTC API RSZ alerts
- ✅ RSZ alerts now displayed using `RSZAlertCard` component (grouped table view)
- ✅ Regular alerts continue using standard `AlertCard` component

**Files Updated:**

- `src/lib/components/alerts/MyRouteAlerts.svelte` - Added resolved filtering and RSZ grouping

### Dec 16, 2025 - Scheduled Maintenance Display in Major Tab

**Problem:** Scheduled closures (nightly subway closures) were not appearing in the Major tab even when currently active.

**Root Causes:**

1. `SCHEDULED_CLOSURE` category not recognized as MAJOR severity
2. `getSubwayLineFromThread()` returned full line name (e.g., "Line 1 (Yonge - University)") instead of normalized "Line 1"
3. Maintenance threads added to all severity tabs instead of just MAJOR
4. Overnight closures didn't account for the "morning after" the last date

**Fixes:**

- ✅ Added `SCHEDULED_CLOSURE` to `majorEffects` and `majorCategories` in `getSeverityCategory()`
- ✅ Fixed `getSubwayLineFromThread()` to extract "Line X" from "Line X (Name)" format
- ✅ Maintenance threads now only included in `combinedActiveAlerts` when `$selectedSeverityCategory === "MAJOR"`
- ✅ `isMaintenanceHappeningNow()` updated with proper overnight closure logic:
  - For nightly closures (start ≥ 10 PM) with no end time, assumes 6 AM service resumption
  - Extended date range check to include morning after last closure date
  - Correctly handles Dec 15-18 closure showing until Dec 19 at 6 AM

**Display Times for Nightly Closures (e.g., Dec 15-18, 11:59 PM start):**
| Period | Shows in Major? |
|--------|-----------------|
| Dec 15, 11:59 PM → Dec 16, 6:00 AM | ✅ Yes |
| Dec 16, 6:01 AM → 11:58 PM | ❌ No |
| Dec 16, 11:59 PM → Dec 17, 6:00 AM | ✅ Yes |
| Dec 17-18 (same pattern) | ✅/❌ |
| Dec 18, 11:59 PM → Dec 19, 6:00 AM | ✅ Yes |
| Dec 19, 6:01 AM onward | ❌ No |

**Files Updated:**

- `src/lib/stores/alerts.ts` - Added SCHEDULED_CLOSURE to major categories
- `src/routes/alerts/+page.svelte` - Fixed line extraction and overnight closure logic

### Dec 16, 2025 - Subway Route Badge Deduplication (poll-alerts v49-v50)

**Problem 1 (v49):** Orphan threading - SERVICE_RESUMED alerts creating new threads instead of joining existing DELAY threads. Root cause: Bluesky API returns posts newest-first, so resolution was processed before the incident thread existed.

**Solution (v49):** Sort Bluesky posts by `createdAt` ascending (oldest-first) before processing.

```typescript
const posts = (bskyData.feed || []).sort(
  (a: any, b: any) =>
    new Date(a.post?.record?.createdAt || 0).getTime() -
    new Date(b.post?.record?.createdAt || 0).getTime()
);
```

**Problem 2 (v50):** Duplicate route badges for subway lines - alerts showing both "Line 6" and "6" (or "6 Finch") as separate badges.

**Solution (v50):**

1. **Backend (poll-alerts):** Track `subwayLineNumbers` Set during route extraction. Skip "X Name" patterns when "Line X" already found.
2. **Frontend (AlertCard.svelte):** Added `SUBWAY_LINE_NUMBERS` Set (1-6). `getDisplayRoutes()` normalizes any standalone subway line numbers to "Line X" format.

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - v49: sort posts, v50: subway route dedup
- `src/lib/components/alerts/AlertCard.svelte` - Subway line badge normalization
- `alert-categorization-and-threading.md` - Documentation updated to v10.0

### Dec 16, 2025 - RSZ Alerts Exclusively from TTC API (poll-alerts v48)

**Problem:** RSZ (Reduced Speed Zone) alerts appeared in both Active and Resolved tabs, and BlueSky posts were redundant with TTC API data.

**Solution (v48):** TTC API is now the **sole source** for RSZ alerts:

- ✅ **ALL BlueSky RSZ posts filtered out** - TTC API provides more accurate data (exact stops, direction)
- ✅ **RSZ alerts DELETED when resolved** - Instead of marking as resolved, stale RSZ alerts are deleted
- ✅ **No RSZ in Resolved tab** - RSZ alerts simply vanish when TTC removes them
- ✅ **Clean 1:1 mapping** - Each RSZ zone has exactly one TTC API alert and one thread

**BlueSky RSZ Detection Patterns:**

```typescript
const patterns = [
  "slower than usual", // Main TTC phrase
  "reduced speed",
  "slow zone",
  "move slower",
  // ... plus 6 more patterns
];
```

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - RSZ exclusive handling (v48)
- `alert-categorization-and-threading.md` - Documentation updated to v9.0

### Dec 15, 2025 - Line 6 Finch West LRT Launch & ETA Improvements

**Line 6 Finch West LRT:**

- ✅ Line 6 opened to the public on December 14, 2024
- ✅ Updated `ttc-service-info.ts` - removed suspension, Line 6 now operational
- ✅ Added Line 6 schedule-based ETA fallback when NTAS has no real-time data
- ✅ ETA Edge Function generates scheduled arrivals based on service frequency
- ✅ Line 6 name corrected: "Line 6 Finch West" (not "Eglinton Crosstown")

**ETA Display Improvements:**

- ✅ Live GPS data: Shows minutes countdown with live signal icon
- ✅ Scheduled data: Shows arrival times in AM/PM format (e.g., "10:35 AM")
- ✅ "Scheduled" badge indicates non-real-time predictions
- ✅ Route pages: Line 5 (under construction) shows informational message, no ETA section

**Files Updated:**

- `src/lib/utils/ttc-service-info.ts` - Line 6 enabled
- `src/lib/components/stops/RouteStopItem.svelte` - Scheduled vs live ETA display
- `src/routes/routes/[route]/+page.svelte` - Line 5 under construction handling
- `supabase/functions/get-eta/index.ts` - Line 6 scheduled ETA fallback

### Dec 12, 2025 - Critical Bug Fix: alert_id Generation (poll-alerts v27)

**Root Cause Analysis:**

- ❌ INSERT into `alert_cache` was silently failing because `alert_id` (NOT NULL primary key) was never provided
- ❌ All new alerts after a schema change were rejected with "null value in column alert_id violates not-null constraint"
- ❌ Deduplication was checking `bluesky_uri` which was NULL for all records
- ❌ No new alerts were being captured - `newAlerts: 0` on every poll

**The Fix (v27):**

| Change              | Before               | After                              |
| ------------------- | -------------------- | ---------------------------------- |
| alert_id generation | Not provided         | Extract from URI: `bsky-{post_id}` |
| Deduplication check | `bluesky_uri` (NULL) | `alert_id` (unique)                |
| Insert success      | All failing          | All succeeding                     |

**Impact:**

| Metric                 | Before       | After         |
| ---------------------- | ------------ | ------------- |
| New alerts captured    | 0            | 7 (immediate) |
| DB accuracy vs TTC API | 22%          | 67%           |
| Routes tracked         | 2            | 6             |
| Postgres errors        | 50+ per poll | 0             |

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - alert_id generation (v27)
- `alert-categorization-and-threading.md` - Updated to v5.6
- `scripts/validate-ttc-crosscheck.ts` - Validation script (NEW)

### Dec 11, 2025 - TTC Live API Cross-Check (poll-alerts v26)

**TTC Live API Integration:**

- ✅ Cross-checks resolution status with official TTC API (`alerts.ttc.ca/api/alerts/live-alerts`)
- ✅ Only marks alerts resolved if they're NOT in TTC's active alerts
- ✅ Replaced time-based auto-resolve with authoritative TTC data
- ✅ Graceful fallback if TTC API is unavailable

**How It Works:**

| Step              | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| Fetch TTC API     | GET `https://alerts.ttc.ca/api/alerts/live-alerts`               |
| Extract routes    | Parse `routes[]` and `siteWideCustom[]` arrays                   |
| Compare           | Check if our unresolved threads' routes are in TTC active alerts |
| Resolve stale     | Mark threads resolved if route no longer in TTC API              |
| Graceful fallback | If TTC API unavailable, skip resolution (don't break function)   |

**Impact:**

- More accurate resolution than time-based approach
- Data matches official TTC service status
- Handles cases where TTC doesn't post SERVICE_RESUMED to Bluesky
- Returns `ttcApiResolvedCount` and `ttcApiError` in response

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - TTC API cross-check (v26)
- `alert-categorization-and-threading.md` - Updated documentation

### Dec 11, 2025 - Auto-Resolve Old Alerts (poll-alerts v24) [SUPERSEDED by v26]

**Auto-Resolve Logic:**

- ✅ Automatically marks old unresolved alerts as resolved based on effect type
- ✅ Runs every time poll-alerts Edge Function is called (every 30 seconds)
- ✅ Handles cases where TTC doesn't post SERVICE_RESUMED alerts
- ✅ Prevents old alerts from incorrectly showing in subway status cards

**Resolution Thresholds by Effect Type:**

| Effect Type              | Threshold | Rationale                           |
| ------------------------ | --------- | ----------------------------------- |
| NO_SERVICE               | 6 hours   | Medical emergencies, short outages  |
| STOP_MOVED               | 6 hours   | Temporary stop relocations          |
| REDUCED_SERVICE          | 6 hours   | Service reductions                  |
| MODIFIED_SERVICE         | 6 hours   | Temporary service changes           |
| ADDITIONAL_SERVICE       | 6 hours   | Extra service periods               |
| SIGNIFICANT_DELAYS       | 8 hours   | Delay incidents                     |
| OTHER_EFFECT             | 8 hours   | "Slower than usual" type alerts     |
| DETOUR                   | 12 hours  | Route diversions                    |
| UNKNOWN_EFFECT (default) | 12 hours  | Conservative threshold for unknowns |

**Impact:**

- Fixed subway status cards showing "Disruption" for 3-day-old medical emergency
- Auto-resolved 25 old alerts on first run
- Prevents false positives in subway status display
- No manual cleanup needed for forgotten SERVICE_RESUMED posts

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - Added auto-resolve logic (v24)

**Technical Details:**

- Queries all unresolved threads with latest alerts
- Calculates alert age in hours
- Marks threads as resolved if age >= threshold
- Returns `autoResolvedCount` in response
- Logs each auto-resolved thread with effect type and age

### Dec 11, 2025 - Mobile Bottom Navigation Compact Mode

**Compact Mode Implementation:**

- ✅ Added automatic compact mode for mobile bottom navigation
- ✅ Activates when scrolling down past 100px threshold
- ✅ Expands when scrolling up or at page top (< 10px)
- ✅ Labels fade out/in with smooth transitions (0.4s cubic-bezier)
- ✅ Navigation height reduces from ~64px to ~48px in compact mode
- ✅ Slight background transparency (95%) in compact mode
- ✅ 5px scroll delta buffer prevents jittery state changes
- ✅ Icons remain full size (22px) for accessible tap targets
- ✅ Active indicator (blue top bar) persists in both modes

**Pull-to-Refresh Sensitivity Fix:**

- ✅ Fixed accidental triggers during normal scrolling
- ✅ Now only activates when within 5px of page top (was > 0)
- ✅ Continuous scroll monitoring cancels pull if user scrolls down
- ✅ Requires 20px pull distance before preventing default scroll (was 10px)
- ✅ Upward scroll movement immediately cancels pull gesture
- ✅ Uses correct scroll position detection (document.body.scrollTop)
- ✅ Transform only applied when actively pulling (preserves sticky positioning)

**Files Updated:**

- `src/lib/components/layout/MobileBottomNav.svelte` - Scroll detection, compact state management
- `src/routes/layout.css` - Compact mode styles with smooth transitions
- `src/lib/components/layout/PullToRefresh.svelte` - Stricter scroll position checks
- `DESIGN_SYSTEM.md` - Added Mobile Bottom Navigation Compact Mode section

**UX Benefits:**

- More screen real estate during content browsing (labels hidden when scrolling)
- Maintains navigation accessibility (icons always visible)
- Smooth, natural transitions feel responsive not jarring
- Pull-to-refresh only works when intended (at page top)

### Dec 11, 2025 - Header/Navigation UX Improvements

**Pull-to-Refresh Implementation:**

- Added `PullToRefresh.svelte` component with 80px threshold and touch-only detection
- Integrated into `+layout.svelte` for all pages
- Removed refresh button from mobile hamburger menu
- Removed `overflow: hidden` from pull-to-refresh container to fix sticky header

**Header Redesign:**

- Removed all auth code (username, sign in/out, user menu)
- Moved language toggle to always-visible position (header + settings sync)
- Grouped desktop refresh button + status indicator with visual connection
- Reordered mobile header: Logo | Status | Language | Hamburger
- Fixed z-index layering: Header now uses `z-index: 1000` to stay above all content

**Hamburger Menu:**

- Restructured into 2 sections: Appearance, Help & Info
- Added animations: `animate-fade-in` (backdrop/header), `animate-fade-in-down` (panel)
- Fixed text visibility with explicit HSL inline styles for all elements
- Made theme toggle darker in light mode with dynamic background colors
- Theme toggle now closes menu after selection

**Accessibility Improvements:**

- Connection status: Pulsing filled dot (connected) vs hollow circle (disconnected)
- Shape + animation differentiation (not color-only)
- Added `role="status"` and `aria-live="polite"` for screen readers
- Language toggle: Maximum contrast with inverted colors (foreground bg / background text)

**Settings Page:**

- Removed text size options (no longer needed)
- Language toggle synced with header via `localPreferences` store
- Reduce Motion toggle verified working (adds `.reduce-motion` class to `<html>`)

**Search Components:**

- Added visible scrollbars to stop and route search dropdowns (8px, translucent)
- Search dropdowns automatically close on scroll to prevent overlapping sticky header
- Fixed z-index hierarchy: search containers use `z-0`, dropdowns use `z-30`, header uses `z-1000`
- Added scroll event listeners to both StopSearch and RouteSearch components

**Persistence:**

- Language and theme stored in IndexedDB (same system as saved stops/routes)
- Uses `localPreferences.updatePreference()` for all setting changes
- Language automatically detects device default (browser language) on first visit

### Dec 21, 2025 - Hamburger Menu UX Enhancements

**Theme Toggle Improvements:**

- ✅ Show both Light and Dark mode options with checkmark for selected
- ✅ Matches settings page checkbox pattern for consistency
- ✅ `animate-scale-in` animation on checkmark appearance
- ✅ Active press feedback with `active:scale-[0.98]` transition

**Close Button & Animation:**

- ✅ Added close (X) button in inverted colors when menu is expanded
- ✅ Hamburger icon rotation animation (90° rotate, 75% scale) on toggle
- ✅ Smooth icon transition using `transition-all duration-200`

**Staggered Animations:**

- ✅ Menu backdrop: `animate-fade-in`
- ✅ Header bar: `animate-fade-in`
- ✅ Menu panel: `animate-fade-in-down`
- ✅ Section groups: staggered `animate-fade-in-up` (50ms, 100ms delays)

**Scroll Lock:**

- ✅ Body scroll locked when hamburger menu is open
- ✅ Uses `$effect` to set/clear `document.body.style.overflow = "hidden"`
- ✅ Proper cleanup on unmount to prevent stuck scroll state

**i18n Fix:**

- ✅ Added missing `emptyStates` translations (en.json, fr.json)
- ✅ Fixed raw translation keys showing ("emptyStates.allClear")
- ✅ Keys: `emptyStates.allClear`, `emptyStates.noActiveDisruptions`

**Files Updated:**

- `src/lib/components/layout/Header.svelte` - Theme UI, close button, animations, scroll lock
- `src/lib/i18n/en.json` - Added emptyStates translations
- `src/lib/i18n/fr.json` - Added emptyStates translations (French)

---

### Dec 21, 2025 - UI Refinements & Production Cleanup

**Demo Mode Removal:**

- ✅ Disabled `DEMO_MODE` for production deployment
- ✅ Removed all demo alerts and maintenance data from UI
- ✅ App now displays only real data from database

**Mobile Tab Responsiveness:**

- ✅ Fixed tab overflow on mobile devices (Active/Resolved/Scheduled tabs)
- ✅ Added `min-width: 0` to allow tabs to shrink below content size
- ✅ Expanded responsive breakpoint from 360px to 450px for better coverage
- ✅ Added text truncation for extra small screens (≤360px)
- ✅ Reduced padding and badge sizes on small screens

**My Stops UX:**

- ✅ Search bar now clears automatically after adding a stop
- ✅ Makes adding multiple stops consecutively easier
- ✅ Previously kept stop name in search input after selection

**ClosuresView Cleanup:**

- ✅ Removed redundant "X scheduled" text badge from header
- ✅ Count badge in Scheduled tab now provides sufficient feedback
- ✅ Eliminated duplicate information display

**Files Updated:**

- `src/routes/alerts/+page.svelte` - DEMO_MODE disabled, tab responsiveness improved
- `src/lib/components/stops/StopSearch.svelte` - Clear search on stop selection
- `src/lib/components/alerts/ClosuresView.svelte` - Remove redundant badge

---

### Dec 21, 2025 - Subway Alerts Accordion Section Headers

**UX Enhancement:**

- ✅ Replaced static subway section headers with collapsible accordion cards
- ✅ 4px colored top border for line identification (matches subway line color)
- ✅ Click to expand/collapse alert section for each subway line
- ✅ Sections default to expanded state for immediate visibility
- ✅ Removed left accent borders from inner alert cards (accordion border provides context)
- ✅ Click-to-scroll from status grid now auto-expands collapsed sections
- ✅ Removed chevron icon for cleaner design (just badge + line name)
- ✅ Added 2-second background pulse animation when highlighted

**Technical Implementation:**

- Added `expandedSections` state (Set) to track which lines are expanded
- Created `alertsByLine` derived store to group alerts by subway line
- Added `toggleAccordion()` function for expand/collapse
- New accordion CSS: `.accordion-card`, `.accordion-header`, `.accordion-content`, `.accordion-body`
- Updated `handleStatusCardClick()` to auto-expand sections when scrolling
- Effect hook to auto-expand all subway line sections on mount
- Scroll offset calculation to account for sticky header (56px + 16px padding)
- Background pulse animation using `color-mix()` for smooth color blending (15% light mode, 25% dark mode)

**Files Updated:**

- `src/routes/alerts/+page.svelte` - Accordion implementation with pulse animation
- `static/test-subway-status-ux.html` - Demo page with final Approach I design
- `APP_IMPLEMENTATION.md` - Changelog entries
- `DESIGN_SYSTEM.md` - Accordion pattern documentation

**Design Decision:**

- Selected Approach I from test HTML: Clean card with top border, line badge + name
- Removed chevron icon (cleaner, simpler header)
- Rejected separate issue count text (redundant with multi-status icons on status cards)
- Simplified inner alert cards by removing left borders (accordion context sufficient)
- Background pulse animation instead of border pulse for better visibility

**Scheduled Tab Count Badge:**

- ✅ Added count badge to Scheduled tab showing number of unique scheduled closures
- ✅ Count matches what's displayed in ClosuresView component
- ✅ Uses `scheduledClosuresCount()` derived that counts `$maintenanceItems`

**Bug Fixes:**

- Fixed highlight not showing: Added `--line-color` CSS variable to accordion card container
- Fixed scroll position: Manual scroll calculation with header offset instead of `scrollIntoView()`
- Fixed Scheduled tab count: Now counts only real maintenance items (was including demo data)

### Dec 20, 2025 - Route Filtering Bug Fix & My Stops UX Improvements

**Route Filtering Fix (Critical):**

Route filtering was using substring matching which caused incorrect matches:

- Example: Route 11 was incorrectly matching routes 119 and 511

**Files Fixed:**
| File | Function | Fix |
|------|----------|-----|
| `src/lib/components/alerts/MyRouteAlerts.svelte` | `matchesRoutes()` | Exact route matching only |
| `src/lib/stores/alerts.ts` | `getAlertsByRoutes()` | Exact route matching only |
| `src/routes/routes/[route]/+page.svelte` | Route alerts filter | Exact route matching only |

**Implementation:**

```typescript
// Remove leading zeros and compare exact match
normalizeRouteId(route1) === normalizeRouteId(route2);
```

**My Stops UX Improvements:**

- ✅ `etaList` derived store now respects `savedStops` order (newest first)
- ✅ Edit mode auto-exits when all stops are deleted
- ✅ Updated `TTC-ROUTE-CONFLICTS.md` with frontend filtering documentation

**Files Updated:**

- `src/lib/stores/eta.ts` - `etaList` derived from both `etaStore` and `savedStops` for ordering
- `src/lib/components/stops/MyStops.svelte` - Auto-exit edit mode on empty stops

**Route UI Improvements:**

- ✅ Route cards now have cursor pointer and tap feedback (active:scale-98)
- ✅ `BookmarkRouteButton` rewritten with save-stop-button matching styles
- ✅ Added `showLabel` prop for optional text labels ("Save to My Routes"/"Saved")
- ✅ Added feedback animation with checkmark on save
- ✅ Route detail page now uses `BookmarkRouteButton` with label

**Files Updated:**

- `src/routes/routes/+page.svelte` - Added cursor-pointer and active:scale-98 tap feedback
- `src/lib/components/alerts/BookmarkRouteButton.svelte` - Complete rewrite with matching styles
- `src/routes/routes/[route]/+page.svelte` - Uses BookmarkRouteButton with showLabel=true

### Dec 10, 2025 - Major Threading Logic Overhaul (v20)

**poll-alerts Edge Function v20 (latest):**

- ✅ **Extended search window**: 12 hours (was 6 hours) for finding matching threads
- ✅ **Resolved thread matching**: SERVICE_RESUMED can now match resolved threads
- ✅ **Title preservation**: SERVICE_RESUMED alerts no longer overwrite original incident title
- ✅ **Route merging**: Thread routes accumulate ALL routes from ALL alerts in the thread
- ✅ **Race condition prevention**: 5-second duplicate detection before creating new threads
- ✅ **Best match selection**: Finds best matching thread, not just first match

**Database Constraints & Functions (Dec 10 PM):**

- ✅ Added `alert_cache_routes_is_array` constraint - ensures affected_routes is array
- ✅ Added `alert_cache_categories_is_array` constraint - ensures categories is array
- ✅ Added `incident_threads_routes_is_array` constraint - ensures affected_routes is array
- ✅ Added `incident_threads_categories_is_array` constraint - ensures categories is array
- ✅ Added `extract_route_number(TEXT)` function - extracts base route (37A → 37)
- ✅ Added `routes_have_family_overlap(JSONB, JSONB)` function - checks route family overlap
- ✅ Added `merge_routes(JSONB, JSONB)` function - merges and dedupes route arrays
- ✅ Fixed `auto_populate_routes()` trigger - now checks `jsonb_typeof()` before `jsonb_array_length()`
- ✅ Removed duplicate triggers (`auto_populate_routes_trigger`)
- ✅ Added `idx_incident_threads_created_at` index for duplicate detection
- ✅ Added `idx_incident_threads_active` partial index for unresolved threads
- ✅ Migration file: `supabase/migrations/20251210_threading_constraints.sql`

**Frontend Fix:**

- ✅ AlertCard.svelte now uses thread routes for badges (shows all routes from all alerts in thread)

### Dec 10, 2025 - Alert Threading Improvements & Database Cleanup

**poll-alerts Edge Function v15 (previous):**

- ✅ Fixed route extraction for comma-separated routes (e.g., "37, 37A" → ["37", "37A"])
- ✅ Added route family matching: 37, 37A, 37B treated as same route family
- ✅ Deployed via Supabase MCP
- ✅ Fixed existing database records for routes 123 and 37 with empty arrays

**Database Fixes (Dec 10 PM):**

- ✅ Fixed 6 alerts with empty `affected_routes` arrays:
  - `123, 123C, 123D Sherway...` → `["123", "123C", "123D"]`
  - `37, 37A Islington...` → `["37", "37A"]`
- ✅ Production branch changed from `main` to `version-b` in Cloudflare Pages

**poll-alerts Edge Function v14 (previous):**

- ✅ Fixed route extraction for comma-separated routes (e.g., "37, 37A" → ["37", "37A"])
- ✅ Added route family matching: 37, 37A, 37B treated as same route family
- ✅ Added enhanced similarity function with location + cause bonuses
- ✅ Lower thresholds: 10% for SERVICE_RESUMED, 25% for DIVERSION, 40% general
- ✅ Added `extractLocationKeywords()` for better location matching
- ✅ Added `extractCause()` to match incident causes (collision, medical emergency, etc.)

**Database Cleanup (Manual):**

- ✅ Deleted 181,165 orphan threads (threads with no alerts)
- ✅ Database reduced from ~181,500 threads to 332 threads
- ✅ Fixed route 37 collision: now 1 thread with 3 alerts (was 3 separate threads)

**Automated Data Retention (pg_cron):**

- ✅ Enabled pg_cron extension for scheduled tasks
- ✅ Created `cleanup_old_alerts()` function - 15-day retention for resolved threads
- ✅ Created `cleanup_old_alerts_toronto()` DST-aware wrapper
- ✅ Scheduled daily cleanup at 4 AM Toronto time (handles EST/EDT automatically)
- ✅ Migration file: `supabase/migrations/20251210_cleanup_cron.sql`

**Retention Policy:**
| Data Type | Retention |
|-----------|-----------|
| Resolved threads | 15 days |
| Orphan alerts | 15 days |
| Active threads | Indefinite |

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - Enhanced threading logic (v14)
- `supabase/migrations/20251210_cleanup_cron.sql` - Automated cleanup setup

### Dec 4, 2025 - Lexend Font + Typography Hierarchy

**Font System:**

- ✅ Switched to Lexend (dyslexic-friendly) from Google Fonts
- ✅ Variable weights 300-700 for flexible hierarchy
- ✅ Latin subset only (~50KB) for optimal performance
- ✅ Preconnect hints for faster font loading

**Typography Hierarchy (weight → meaning):**
| Weight | Usage | Purpose |
|--------|-------|---------|
| 700 (Bold) | Route numbers, brand, user initials | High scannability |
| 600 (Semibold) | Section headings, dates, badges | Important info |
| 500 (Medium) | Nav items, tabs, station names | Interactive elements |
| 400 (Regular) | Body text, descriptions, timestamps | Readability |

**Size Scale:**
| Size | Element |
|------|---------|
| 17px | Card titles |
| 15px | Primary content (alerts, body) |
| 13px | Secondary (tabs, filters, routes) |
| 12px | Tertiary (timestamps, links) |
| 11px | Micro (status badges) |
| 10px | Tiny (count bubbles) |

**Letter-spacing:**

- Tighter (-0.02em): Large headings
- Slightly tight (-0.01em): Body text, nav
- Wider (0.02-0.04em): Uppercase badges, numbers

**Files Updated:**

- `src/app.html` - Google Fonts link with preconnect
- `src/routes/layout.css` - Complete typography system
- `src/lib/components/layout/Header.svelte` - Font weight classes
- `src/lib/components/layout/Sidebar.svelte` - Font weight classes
- `src/lib/components/alerts/AlertCard.svelte` - Font weight classes

### Dec 4, 2025 - Edge Function Alert Parsing Fix

**poll-alerts Edge Function:**

- ✅ Fixed table names: `alerts` → `alert_cache`, `alert_threads` → `incident_threads`
- ✅ Improved route extraction: preserves full names like "306 Carlton" instead of just "306"
- ✅ Updated schema fields: `header` → `header_text`, `body` → `description_text`
- ✅ JSONB arrays for `categories` and `affected_routes` (was scalar fields)
- ✅ Proper thread matching with correct field names (`header_text` vs `initial_header`)
- ✅ `is_latest` flag management: marks old alerts as not latest when adding new ones
- ✅ SERVICE_RESUMED threading: uses route overlap + 25% similarity threshold

**Impact:**

- Alerts from Bluesky API now properly stored in correct database tables
- Routes displayed with full names (e.g., "306 Carlton" not just "306")
- Thread continuity maintained across multiple updates
- SERVICE_RESUMED alerts correctly close their threads

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - Complete refactor to match database schema

### Dec 4, 2025 - Header & Sidebar Layout Refinement

**Header Responsive Layout:**

- ✅ Mobile (< 640px): Last updated + refresh + hamburger menu only
- ✅ Non-mobile (≥ 640px): Last updated + refresh + How to Use + Theme toggle + Language selector
- ✅ Fixed responsive class inconsistencies (`hidden sm:flex` pattern)

**Sidebar Cleanup:**

- ✅ Sidebar now shows: Navigation + Help links (+ User info when authenticated)

**Files Updated:**

- `src/lib/components/layout/Header.svelte` - Fixed responsive visibility classes
- `src/lib/components/layout/Sidebar.svelte` - Desktop navigation only

### Dec 4, 2025 - Planned Alerts & Filter UX Improvements

**Planned Alerts Widget:**

- ✅ Renamed "Planned Maintenance" to "Planned Subway Closures"
- ✅ Moved closure badges (Full Weekend / Nightly Early) below station text
- ✅ Added footer row with badge on left, Details link on right
- ✅ Neutral gray outline style for closure badges (zinc-400)
- ✅ Fixed time parsing to handle HH:MM:SS format → displays as "11:59 PM"
- ✅ Consistent vertical alignment for dates across all cards
- ✅ Background polling every 5 minutes (data updates without page refresh)

### Dec 5, 2025 - Mobile UI & Auth Cleanup

**Mobile Menu Improvements:**

- ✅ Fixed hamburger menu z-index stacking (moved outside header element)
- ✅ Added X close button with circular background when menu is open
- ✅ Proper backdrop blur and dark overlay when menu is open
- ✅ Menu shows: How to Use, Appearance toggle, Language selector

**Sign In Removal:**

- ✅ Removed Sign In button from all pages (feature not in use)
- ✅ Removed SignInDialog, CreateAccountDialog, AuthRequiredDialog components from exports
- ✅ Cleaned up unused auth-related props and functions
- ✅ Preferences now save locally without auth requirement

**Input Placeholder Styling:**

- ✅ Added global placeholder color styling in ttc-theme.css
- ✅ Consistent muted-foreground color for all input placeholders

**My Stops Mobile:**

- ✅ Added location button next to search for finding nearby stops

### Dec 5, 2025 - My Routes Tab Improvements

**Responsive Route Badge Tabs:**

- ✅ Mobile (<768px): Horizontal scroll with right fade indicator
- ✅ Desktop (≥768px): Flex-wrap to show all routes on multiple rows
- ✅ Smooth scrolling with fade gradient visual cue
- ✅ Touch-friendly tap targets for route badges

**Route Browser - Bookmarked Routes First:**

- ✅ Bookmarked routes now appear first in each category section
- ✅ Uses `savedRoutes` store for bookmark state
- ✅ Sort helper function preserves original order for non-bookmarked routes

**Files Updated:**

- `src/lib/components/alerts/MyRouteAlerts.svelte` - Responsive route tabs with scroll/wrap
- `src/routes/routes/+page.svelte` - Show bookmarked routes first in categories

---

**Filter Improvements:**

- ✅ Removed "Planned" filter chip (handled by dedicated widget)
- ✅ Filters are now mutually exclusive (only one selected at a time)
- ✅ Filter only considers latest alert's category (not thread history)
- ✅ Excluded planned alerts from main feed (checks categories, effect, and header text)

**Empty State:**

- ✅ Added SearchX icon for empty filter results
- ✅ Changed message to "No alerts for this filter" with helpful hint

**Service Worker:**

- ✅ Fixed SW to skip Vite dev server requests (/.svelte-kit/, /@vite/, etc.)

**Polling:**

- ✅ Alerts: 30-second polling interval (existing)
- ✅ Maintenance: 5-minute polling interval (new - fetches in background, no UI refresh)
- ✅ "Updated X ago" shows when alerts data was last fetched (not maintenance)

**Files Updated:**

- `src/lib/components/alerts/MaintenanceWidget.svelte` - Closure badge position, time parsing
- `src/lib/components/alerts/FilterChips.svelte` - Removed Planned filter
- `src/lib/stores/alerts.ts` - Mutually exclusive filters, exclude planned alerts
- `src/routes/+page.svelte` - Empty state with icon, maintenance polling interval
- `src/routes/layout.css` - Footer layout, badge styling, time styling
- `static/sw.js` - Skip dev server requests

### Dec 4, 2025 - MaintenanceWidget UX Redesign

**New Features:**

- ✅ Closure type badges: "Full weekend closure" (red) and "Nightly early closure" (amber)
- ✅ Structured layout: Line badge + closure type on left, date + start time on right
- ✅ Timezone-safe date parsing with `parseLocalDate()` helper
- ✅ Smart time display: 12-hour format with "from 11:59 PM" for nightly closures
- ✅ Added `affected_stations` field to PlannedMaintenance type

**Files Updated:**

- `src/lib/types/database.ts` - Added `affected_stations`, `reason`, `start_time` to PlannedMaintenance
- `src/lib/stores/alerts.ts` - Updated fetchMaintenance to map all new fields
- `src/lib/components/alerts/MaintenanceWidget.svelte` - Complete UX overhaul
- `src/routes/layout.css` - New CSS for datetime, stations, closure badges

### Dec 4, 2025 - WCAG 2.2 AA & shadcn Consistency Overhaul

**UI/UX Improvements:**

- ✅ All components now follow shadcn-svelte patterns strictly
- ✅ WCAG 2.2 AA compliant contrast ratios (4.5:1 minimum) for status badges
- ✅ Consistent spacing tokens throughout (p-4 cards, gap-3 flex items, mb-6 sections)
- ✅ Single source of truth pattern: StatusBadge now extends shadcn Badge component
- ✅ Replaced all `hsl(var())` patterns with direct Tailwind classes (`bg-primary`, `text-muted-foreground`, etc.)

**Accessibility Enhancements:**

- Added ARIA attributes across all interactive components
- FilterChips: role="group" with aria-label, aria-pressed states
- AlertCard: aria-live regions, semantic HTML with `<time>` element
- MaintenanceWidget: tablist/tab roles, aria-selected states
- RouteBadge: aria-label with route descriptions, aria-pressed for selection
- Preferences page: aria-pressed on selection buttons, role="group" for day selectors

**Files Updated:**

- `src/routes/layout.css` - Status badge colors (oklch for WCAG), spacing tokens
- `src/lib/components/alerts/StatusBadge.svelte` - Refactored to use shadcn Badge
- `src/lib/components/alerts/RouteBadge.svelte` - cn() utility, ARIA support
- `src/lib/components/alerts/FilterChips.svelte` - ARIA group semantics
- `src/lib/components/alerts/AlertCard.svelte` - Semantic HTML, aria-live
- `src/lib/components/alerts/MaintenanceWidget.svelte` - Tab accessibility
- `src/routes/+page.svelte` - Consistent spacing
- `src/routes/preferences/+page.svelte` - Full styling consistency, ARIA support
- `src/lib/components/layout/Header.svelte` - Direct Tailwind classes, ARIA labels
- `src/lib/components/layout/Sidebar.svelte` - Direct Tailwind classes
- `src/lib/components/dialogs/AuthRequiredDialog.svelte` - Direct Tailwind classes

### Dec 4, 2025 - UI Matching Reference App

- Fixed AlertCard.svelte: `extractRouteName()` parses full route names from header_text (e.g., "306 Carlton")
- Fixed RouteBadge.svelte: Full route names displayed with proper TTC brand colors
- Fixed alerts.ts: Added date validation filter to remove threads with invalid dates
- Deployed to Cloudflare Pages production: https://ttc-alerts-svelte.pages.dev
- UI now matches reference at https://ttc-service-alerts-pwa.onrender.com/

### Dec 4, 2025 - Cloudflare Pages Ready

- Configured @sveltejs/adapter-static for Cloudflare Pages
- Added +layout.ts with SPA mode (prerender: true, ssr: false)
- Build outputs to `build/` directory
- Removed TabNavigation component (redundant tabs)

### Dec 4, 2025 - Real Data & PWA Complete

- Removed all dummy data from alerts.ts
- Connected alerts store to real Supabase data (alert_cache, incident_threads)
- Updated database.ts types for JSONB fields (affected_routes, categories)
- Updated AlertCard.svelte for JSONB handling
- Generated all PWA icons (72-512px) using Sharp
- Added checkDisplayNameAvailable to webauthn.ts
- Build passes successfully

### Dec 5, 2025 - Threading Bug Fix & Mobile UX

**Threading Bug Fix (Critical):**

- ✅ Fixed false positive alert threading where alerts without extracted routes could match any thread based purely on text similarity
- ✅ Added safety check: alerts must have non-empty `affected_routes` array to attempt thread matching
- ✅ Added safety check: skip threads with empty `affected_routes` during matching
- ✅ Prevents unrelated routes from being grouped (e.g., routes 131, 38, 21, 57 incorrectly grouped with route 133)
- ✅ Updated `supabase/functions/poll-alerts/index.ts` with critical safety checks
- ✅ Deployed to production via Supabase CLI

**Mobile Direction Tabs Fix:**

- ✅ Fixed `RouteDirectionTabs.svelte` to show terminal names instead of "All" on mobile
- ✅ Added short labels: VMC, Finch, Kennedy, Kipling, Don Mills, Shep-Yonge, Finch W, Humber
- ✅ Updated `getDirectionIcon()` to map terminal names to arrows

**Documentation:**

- ✅ Updated `alert-categorization-and-threading.md` with new threading rules and safety checks
- ✅ Updated `DESIGN_SYSTEM.md` with mobile direction tab short labels

**Deployment:**

- ✅ Fixed `supabase/config.toml` functions configuration format
- ✅ Deployed threading fix via CLI: `npx supabase functions deploy poll-alerts --project-ref wmchvmegxcpyfjcuzqzk`

### Dec 4, 2025 - Edge Functions Deployed

- Deployed 8 Edge Functions via MCP
- auth-register, auth-challenge, auth-verify, auth-session, auth-recover, poll-alerts, scrape-maintenance
- poll-alerts v5: Fixed schema mismatches (header_text→title, table names, JSONB fields)
- Threading now works correctly for SERVICE_RESUMED alerts (25% similarity threshold)

### Dec 11, 2025 - Header/Navigation UX Improvements

**Pull-to-Refresh Implementation:**

- Added `PullToRefresh.svelte` component with 80px threshold and touch-only detection
- Integrated into `+layout.svelte` for all pages
- Removed refresh button from mobile hamburger menu
- Removed `overflow: hidden` from pull-to-refresh container to fix sticky header

**Header Redesign:**

- Removed all auth code (username, sign in/out, user menu)
- Moved language toggle to always-visible position (header + settings sync)
- Grouped desktop refresh button + status indicator with visual connection
- Reordered mobile header: Logo | Status | Language | Hamburger
- Fixed z-index layering: Header now uses `z-index: 1000` to stay above all content

**Hamburger Menu:**

- Restructured into 2 sections: Appearance, Help & Info
- Added animations: `animate-fade-in` (backdrop/header), `animate-fade-in-down` (panel)
- Fixed text visibility with explicit HSL inline styles for all elements
- Made theme toggle darker in light mode with dynamic background colors
- Theme toggle now closes menu after selection

**Accessibility Improvements:**

- Connection status: Pulsing filled dot (connected) vs hollow circle (disconnected)
- Shape + animation differentiation (not color-only)
- Added `role="status"` and `aria-live="polite"` for screen readers
- Language toggle: Maximum contrast with inverted colors (foreground bg / background text)

**Settings Page:**

- Removed text size options (no longer needed)
- Language toggle synced with header via `localPreferences` store
- Reduce Motion toggle verified working (adds `.reduce-motion` class to `<html>`)

**Search Components:**

- Added visible scrollbars to stop and route search dropdowns (8px, translucent)
- Search dropdowns automatically close on scroll to prevent overlapping sticky header
- Fixed z-index hierarchy: search containers use `z-0`, dropdowns use `z-30`, header uses `z-1000`
- Added scroll event listeners to both StopSearch and RouteSearch components

**Persistence:**

- Language and theme stored in IndexedDB (same system as saved stops/routes)
- Uses `localPreferences.updatePreference()` for all setting changes
- Language automatically detects device default (browser language) on first visit

### Dec 4, 2025 - Schema Adaptation

- Adapted all Edge Functions to work with EXISTING Supabase schema
- Changed from `username` to `displayName` throughout codebase
- Updated auth-register to use Supabase Auth (auth.users + user_profiles)
- Updated webauthn.ts service for displayName-based flow
- Updated auth.ts store for new schema
- Updated SignInDialog and CreateAccountDialog for displayName
- Updated auth types to match database schema

### Dec 4, 2025 - WebAuthn Auth System

- Implemented 5 Edge Functions (register, challenge, verify, session, recover)
- Added WebAuthn service for browser API
- Rewrote auth store for custom WebAuthn
- Updated SignInDialog with multi-step biometric flow
- Updated CreateAccountDialog with recovery codes display

### Pre-Dec 2025 - Initial Setup

- Svelte 5 + TypeScript project scaffolding
- shadcn-svelte UI components installed
- TTC theme with brand colors
- All layout components (Header, Sidebar, MobileBottomNav)
- All alert components (AlertCard, FilterChips, etc.)
- All dialog components
- Homepage, Preferences page, Auth callback
- PWA manifest and service worker
