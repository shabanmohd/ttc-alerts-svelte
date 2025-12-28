# TTC Alerts PWA - Implementation Status

## Overview

Real-time Toronto Transit alerts PWA.

| Stack      | Details                                          |
| ---------- | ------------------------------------------------ |
| Frontend   | Svelte 5 + TypeScript + Tailwind + shadcn-svelte |
| Typography | Lexend (dyslexic-friendly) via Google Fonts      |
| Backend    | Supabase (DB, Edge Functions, Realtime)          |
| Hosting    | Cloudflare Pages                                 |

---

## 📚 Documentation Index

| Document                                                                           | Purpose                                         | When to Update                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| **[APP_IMPLEMENTATION.md](APP_IMPLEMENTATION.md)** (this file)                     | File inventory, completion status, architecture | New files, status changes, feature completion |
| **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**                               | Version B feature roadmap & phases              | Phase progress, Version B feature completion  |
| **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)**                                           | Colors, typography, spacing, components         | UI/UX changes, new components                 |
| **[alert-categorization-and-threading.md](alert-categorization-and-threading.md)** | Edge Function logic, threading algorithm        | Alert processing changes                      |
| **[TTC-ROUTE-CONFLICTS.md](TTC-ROUTE-CONFLICTS.md)**                               | Route number conflicts (39/939, 46/996, etc.)   | Route matching bugs                           |
| **[TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)**                                         | Complete TTC bus route reference                | Route additions/removals                      |
| **[TTC-STREETCAR-ROUTES.md](TTC-STREETCAR-ROUTES.md)**                             | Complete TTC streetcar route reference          | Route additions/removals                      |
| **[CODEBASE_ACTION_PLAN.md](CODEBASE_ACTION_PLAN.md)**                             | Code optimization tasks (completed)             | Future optimization work                      |
| **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)**                                         | Security audit findings and fixes               | Security changes/updates                      |
| **[ROUTE_BADGE_STYLES.md](ROUTE_BADGE_STYLES.md)**                                 | Route badge color system                        | Badge styling changes                         |

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

| File                                             | Status | Purpose                                                                      |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `components/alerts/AccessibilityBadge.svelte`    | ✅     | Wheelchair icon badge for elevator/escalator alerts                          |
| `components/alerts/AlertCard.svelte`             | ✅     | Alert cards w/ accessibility badge, route deduplication (v50)                |
| `components/alerts/RSZAlertCard.svelte`          | ✅     | Reduced Speed Zone alerts - grouped table display                            |
| `components/alerts/BookmarkRouteButton.svelte`   | ✅     | Save route button with feedback animation 🅱️                                 |
| `components/alerts/CategoryFilter.svelte`        | ✅     | Severity category tabs (Major/Minor/Accessibility) - WCAG AA                 |
| `components/alerts/ClosuresView.svelte`          | ✅     | Scheduled tab with closure type badges (nightly/weekend), uses $derived.by() |
| `components/alerts/RouteChangesView.svelte`      | ✅     | Route changes: AlertCard-style (2px border, hover), title case route names   |
| `components/alerts/FilterChips.svelte`           | ✅     | Category filter buttons                                                      |
| `components/alerts/MyRouteAlerts.svelte`         | ✅     | My Routes tab with elevator alerts, section headings, dividers               |
| `components/alerts/RouteBadge.svelte`            | ✅     | TTC-branded route badges (full names, colors)                                |
| `components/alerts/RouteSearch.svelte`           | ✅     | Route search component                                                       |
| `components/alerts/StatusBadge.svelte`           | ✅     | Status indicators (Delay, Detour, Resumed, etc.)                             |
| `components/dialogs/HowToUseDialog.svelte`       | ✅     | User guide with sections and bottom sheet on mobile                          |
| `components/dialogs/AboutDialog.svelte`          | ✅     | App info, version, links                                                     |
| `components/dialogs/ReportIssueDialog.svelte`    | ✅     | Bug/issue report form with Turnstile + Resend                                |
| `components/dialogs/FeatureRequestDialog.svelte` | ✅     | Feature suggestion form with Turnstile + Resend                              |
| `components/dialogs/InstallPWADialog.svelte`     | ✅     | PWA install prompt                                                           |
| `components/layout/Header.svelte`                | ✅     | App header - language toggle, hamburger menu w/ iOS safe area                |
| `components/layout/PullToRefresh.svelte`         | ✅     | Touch-based pull-to-refresh - preserves sticky header                        |
| `components/layout/Sidebar.svelte`               | ✅     | Desktop sidebar - nav + footer links (no How to Use)                         |
| `components/layout/MobileBottomNav.svelte`       | ✅     | Mobile navigation with iOS PWA safe-area-inset-bottom                        |
| `components/layout/StatusBanner.svelte`          | ✅     | Network status banner (offline/degraded) with retry link 🆕                  |
| `components/layout/HolidayBanner.svelte`         | ✅     | TTC holiday schedule banner with dismissal per holiday 🆕                    |
| `components/ui/*`                                | ✅     | shadcn-svelte base components                                                |
| `components/ui/turnstile/`                       | ✅     | Cloudflare Turnstile captcha component                                       |
| `stores/alerts.ts`                               | ✅     | Alerts state + parallelized queries + 30-day accessibility window            |
| `stores/dialogs.ts`                              | ✅     | Shared dialog state (hamburger menu → dialogs)                               |
| `stores/preferences.ts`                          | ✅     | User preferences state                                                       |
| `stores/savedStops.ts`                           | ✅     | Bookmarked stops (IndexedDB) - replaces deprecated bookmarks.ts 🅱️           |
| `types/database.ts`                              | ✅     | Database types (JSONB fields)                                                |
| `supabase.ts`                                    | ✅     | Supabase client config                                                       |
| `utils.ts`                                       | ✅     | Utility functions                                                            |
| `utils/date-formatters.ts`                       | ✅     | Shared date/time formatting utilities (extracted Jan 2025) 🆕                |
| `utils/fetch-with-retry.ts`                      | ✅     | Network retry utility with exponential backoff 🆕                            |
| `utils/ttc-service-info.ts`                      | ✅     | TTC service hours, holidays, suspended lines 🅱️                              |

### Pages (`src/routes/`)

| File                          | Status | Purpose                                                   |
| ----------------------------- | ------ | --------------------------------------------------------- |
| `+layout.svelte`              | ✅     | App layout, auth init, dialogs                            |
| `+error.svelte`               | ✅     | 404 and error page - responsive, i18n, helpful links      |
| `+page.svelte`                | ✅     | Homepage with alert tabs + ETA                            |
| `alerts/+page.svelte`         | ✅     | Main alerts page - Now/Planned tabs, improved IA (was v3) |
| `alerts-v3/+page.svelte`      | 📦     | Legacy alerts page (old design, kept for reference)       |
| `help/+page.svelte`           | ✅     | How to Use - Quick Start, Features, FAQ, Get in Touch     |
| `about/+page.svelte`          | ✅     | About page - app info, data sources, links                |
| `preferences/+page.svelte`    | ✅     | Route/mode preferences                                    |
| `settings/+page.svelte`       | ✅     | Settings with stops, routes, prefs, location 🅱️           |
| `routes/+page.svelte`         | ✅     | Route browser by category 🅱️                              |
| `routes/[route]/+page.svelte` | ✅     | Route detail page with alerts and route changes           |
| `auth/callback/+page.svelte`  | ✅     | Auth callback handler                                     |

### Alerts Components (`src/routes/alerts/`)

| File                      | Status | Purpose                                                                                           |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `+page.svelte`            | ✅     | Main page: Now/Scheduled tabs, URL param sync (tab/category), TTC attribution link, 600px layout  |
| `SubwayStatusBar.svelte`  | ✅     | 4-col subway status grid (2x2 mobile) - no slowzone status, minmax(0, 1fr) grid                   |
| `CategoryFilterV3.svelte` | ✅     | Compact pill filter with fade indicator on mobile (Disruptions & Delays / Elevators / Slow Zones) |
| `PlannedContent.svelte`   | ✅     | Sub-tabs: Closures (from DB) / Route Changes (fetched from TTC.ca API)                            |
| `ResolvedSection.svelte`  | ✅     | Collapsible recently resolved section (SERVICE_RESUMED only)                                      |

### Backend (`supabase/`)

| File                                    | Status | Purpose                                                     |
| --------------------------------------- | ------ | ----------------------------------------------------------- |
| `functions/_shared/cors.ts`             | ✅     | CORS headers utility                                        |
| `functions/poll-alerts/index.ts`        | ✅     | Fetch/parse/thread alerts (v60: elevator reconciliation)    |
| `functions/scrape-maintenance/index.ts` | ✅     | Scrape maintenance schedule                                 |
| `functions/get-eta/index.ts`            | ✅     | Fetch TTC ETA: NextBus (surface) + NTAS (subway) 🅱️         |
| `functions/submit-feedback/index.ts`    | ✅     | Feedback form handler w/ Turnstile + Resend + HTML escaping |

### Database (EXISTING in Supabase)

| Table                 | Rows | Purpose                                                  |
| --------------------- | ---- | -------------------------------------------------------- |
| `alert_cache`         | 600+ | Alerts from Bluesky (header_text, categories, is_latest) |
| `incident_threads`    | 255K | Grouped alert threads (title, is_resolved, is_hidden)    |
| `planned_maintenance` | 9    | Scheduled maintenance                                    |
| `device_preferences`  | -    | Device-based preferences (localStorage backup)           |

### Static (`static/`)

| File                              | Status | Purpose                                                                               |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `manifest.json`                   | ✅     | PWA manifest (Version B: "TTC Alerts Beta")                                           |
| `sw.js`                           | ✅     | Service worker (Version B: beta cache prefix)                                         |
| `icons/*`                         | ✅     | All PWA icons (72-512px)                                                              |
| `data/ttc-stops.json`             | ✅     | TTC stops database (9,346 stops, 184 subway w/ sequence) 🆕 **V-B**                   |
| `data/ttc-route-stop-orders.json` | ✅     | Per-route ordered stop lists (211 routes, auto-generated from NextBus API) 🆕 **V-B** |
| `data/ttc-schedules.json`         | ✅     | First departure schedules (weekday/sat/sun) 🆕 **V-B**                                |

### Data (`src/lib/data/`) 🆕 **Version B Only**

| File                         | Status | Purpose                                                                            |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `stops-db.ts`                | ✅     | IndexedDB layer with Dexie.js, GTFS direction/sequence, branch helpers             |
| `subway-stations.ts`         | ✅     | Station-to-line mapping (69 stations) for elevator alert filtering 🆕              |
| `ttc-holidays.ts`            | ✅     | TTC holiday schedule data with helper functions 🆕                                 |
| `ttc-route-stop-orders.json` | ✅     | Route stop ordering (211 routes, auto-generated from NextBus API) 🆕 **V-B**       |
| `ttc-route-branches.json`    | ✅     | Route branch data - directions with branches (102A/B/C/D, 501 variants) 🆕 **V-B** |
| `ttc-direction-labels.json`  | ✅     | Direction display labels ("Towards Kennedy", etc.) 🆕 **V-B**                      |
| `route-names.ts`             | ✅     | Comprehensive TTC route name lookup (220+ routes)                                  |

### Stops Components (`src/lib/components/stops/`) �️

| File                        | Status | Purpose                                                       |
| --------------------------- | ------ | ------------------------------------------------------------- |
| `StopSearch.svelte`         | ✅     | Stop search with autocomplete, direction badges, ID search    |
| `BookmarkStopButton.svelte` | ✅     | Bookmark toggle button for stops                              |
| `BranchDropdown.svelte`     | ✅     | Branch selection dropdown for multi-branch routes (102, 501)  |
| `MyStops.svelte`            | ✅     | Full-page My Stops list                                       |
| `MyStopsWidget.svelte`      | ✅     | Display bookmarked stops on homepage                          |
| `RouteDirectionTabs.svelte` | ✅     | Direction tabs (cardinal directions) for route pages          |
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

- **Live ETA Display**: Real-time predictions with green LiveSignalIcon, route badge, direction/destination
- **isLive Check**: Properly checks `prediction.isLive` before showing live icon vs scheduled format
- **Scheduled Format**: When `isLive: false`, shows time format (e.g., "12:43 PM") with amber "Scheduled" label
- **Scheduled First Bus Section**: For routes without live data, shows GTFS scheduled first bus times
- **Blue Visual Distinction**: Scheduled section has blue-tinted background to distinguish from live ETAs
- **No Service Indicator**: Shows "No Service" for routes that don't run on current day (e.g., 939 on weekends)
- **Day Type Header**: "Scheduled Next Bus · Weekday (Friday)" with current day name
- **Responsive Layout**: Vertical on mobile (5xl time), horizontal on desktop (4xl time)
- **Vehicle-Type Empty State**: Context-aware messages for buses vs subway

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

### Stores (`src/lib/stores/`)

| File                  | Status | Purpose                                                               | Version |
| --------------------- | ------ | --------------------------------------------------------------------- | ------- |
| `alerts.ts`           | ✅     | Alerts state + parallelized queries + date validation filter          | A & B   |
| `preferences.ts`      | ✅     | User preferences state (cloud sync)                                   | A & B   |
| `dialogs.ts`          | ✅     | Dialog state management (hamburger menu → dialogs)                    | A & B   |
| `localPreferences.ts` | ✅     | Local preferences (theme, text size, reduce motion, i18n)             | **B**   |
| `visibility.ts`       | ✅     | Track document visibility for polling control                         | **B**   |
| `accessibility.ts`    | ✅     | Text scaling and reduce motion settings                               | **B**   |
| `savedStops.ts`       | ✅     | Saved stops (IndexedDB storage) - replaces deprecated bookmarks.ts    | **B**   |
| `savedRoutes.ts`      | ✅     | Saved routes (IndexedDB storage)                                      | **B**   |
| `eta.ts`              | ✅     | ETA state with auto-refresh, subway detection via route name patterns | **B**   |
| `route-changes.ts`    | ✅     | TTC service changes from ttc.ca (5-min polling, visibility-aware)     | **B**   |
| `language.ts`         | ✅     | Language selection state                                              | **B**   |
| `networkStatus.ts`    | ✅     | Network connectivity monitoring                                       | **B**   |

### Services (`src/lib/services/`)

| File                 | Status | Purpose                                                                | Version |
| -------------------- | ------ | ---------------------------------------------------------------------- | ------- |
| `webauthn.ts`        | ✅     | WebAuthn browser API wrapper                                           | A & B   |
| `storage.ts`         | ✅     | IndexedDB storage for stops, routes, preferences                       | **B**   |
| `schedule-lookup.ts` | ✅     | GTFS schedule lookup with holiday detection, first bus times, day type | **B**   |
| `route-changes.ts`   | ✅     | Fetch TTC service changes from ttc.ca API (route detours, closures)    | **B**   |

**Route Changes Polling Strategy (`route-changes.ts` store)**:

- **Initial fetch**: On component mount
- **Polling interval**: Every 5 minutes (same as maintenance)
- **Visibility-aware**: Only polls when browser tab is visible
- **Data source**: TTC.ca Sitecore SXA API (not our Supabase database)
- **Deduplication**: Skips fetch if already loading

**Schedule Lookup Features (`schedule-lookup.ts`)**:

> ⚠️ **Important**: Scheduled times are only displayed as a **fallback** when no real-time ETA data is available for a route. Routes with live predictions always show live ETA instead.

- **GTFS Data**: 9,270 stops with first bus times (weekday/saturday/sunday)
- **Day Type Detection**: Weekday, Saturday, Sunday (auto-detected)
- **Holiday Handling**: TTC holidays use Sunday schedule (2024-2026 holidays defined)
- **7-Day Lookahead**: Checks up to 7 days ahead to find next service (handles holiday gaps, weekends for express routes)
- **Express Route PM Schedule**: 9xx routes show PM first departure (after 3PM) on weekday afternoons when no live ETA
- **Express Route Holiday Handling**: On holidays/weekends, express routes find the NEXT actual weekday (skipping holidays)
  - Example: On Boxing Day (Friday), shows "Mon, Dec 29" instead of incorrectly showing "Friday"
- **No Weekend Service**: Express routes (9xx) show "No Weekend Service" on Sat/Sun (express routes don't operate weekends)
- **No Service Detection**: Routes without schedule data show "No Service"
- **12-Hour Format**: Times displayed as "5:21 AM" format
- **Label Formats**:
  - Tomorrow: `Tomorrow` or `Tomorrow - Christmas Day`
  - Future days: `Mon, Dec 29` (abbreviated day, comma, date)
  - Future holidays: `Thu, Dec 25 - Christmas Day`

### Utilities (`src/lib/utils/`) 🆕 **Version B Only**

| File                  | Status | Purpose                                                   |
| --------------------- | ------ | --------------------------------------------------------- |
| `ttc-service-info.ts` | ✅     | TTC service hours, holidays, suspended lines, frequencies |

**TTC Service Info (`ttc-service-info.ts`)**:

- **Annual Holiday Updates**: 2024, 2025 & 2026 holiday schedules (update from https://www.ttc.ca/riding-the-ttc/Updates/Holiday-service)
- **Holiday Types**: 'sunday' (Christmas/New Year's - full Sunday service ~8am) vs 'holiday' (other holidays - Sunday schedule but ~6am start)
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

| File                        | Status | Purpose                                                                   |
| --------------------------- | ------ | ------------------------------------------------------------------------- |
| `transform-gtfs.js`         | ✅     | Transform GTFS data, extract direction, sequence for subway/LRT           |
| `generate-icons.js`         | ✅     | Generate PWA icons from source                                            |
| `translate-i18n.cjs`        | ✅     | Sync i18n source files to translations folder, DeepL API                  |
| `download-gtfs.ts`          | ✅     | Download and extract GTFS from Toronto Open Data (~28 MB ZIP) 🆕          |
| `process-gtfs-schedules.ts` | ✅     | Process TTC GTFS data to extract first departure times (AM + PM for 9xx)  |
| `fetch-route-sequences.cjs` | ✅     | Fetch sequential stop orders from NextBus API (210 routes)                |
| `fetch-route-branches.ts`   | ✅     | Fetch branch data from NextBus API (224 routes, direction/branch mapping) |
| `fix-route-stop-orders.cjs` | ✅     | Convert route stop IDs from NextBus tags to GTFS stopIds (211 routes) 🆕  |
| `fix-route-branches.cjs`    | ✅     | Convert branch stop IDs from NextBus tags to GTFS stopIds (211 routes) 🆕 |

### GitHub Workflows (`.github/workflows/`) 🆕 **Version B Only**

| File                        | Status | Purpose                                                 |
| --------------------------- | ------ | ------------------------------------------------------- |
| `refresh-route-data.yml`    | ✅     | Weekly automated refresh of route data from NextBus API |
| `refresh-schedule-data.yml` | ✅     | Monthly automated refresh of GTFS schedule data 🆕      |

**Route Data Refresh Workflow:**

- **Schedule:** Weekly (Sundays 2:00 AM UTC / Saturday 9:00 PM EST)
- **Trigger:** Also manually triggerable via GitHub Actions UI
- **Action:** Runs `fix-route-stop-orders.cjs` and `fix-route-branches.cjs`
- **Output:** Creates PR if data changes detected

**Schedule Data Refresh Workflow:** 🆕

- **Schedule:** Monthly (1st of month, 4:00 AM UTC / 11:00 PM EST previous day)
- **Trigger:** Also manually triggerable via GitHub Actions UI
- **Data Source:** [Toronto Open Data GTFS](https://open.toronto.ca/dataset/ttc-routes-and-schedules/)
- **Action:** Runs `download-gtfs.ts` and `process-gtfs-schedules.ts`
- **Output:** Creates PR with updated `ttc-schedules.json` (~9,270 stops)

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

### ⚠️ NextBus Tag vs GTFS StopId (Critical Technical Note)

**Issue Discovered:** 2025-01-15

The NextBus API uses **two different ID systems** for stops:

| Field    | Description                 | Example   | Used By                             |
| -------- | --------------------------- | --------- | ----------------------------------- |
| `tag`    | NextBus internal identifier | `"14229"` | `direction[].stop[].tag` references |
| `stopId` | GTFS standard identifier    | `"14709"` | `ttc-stops.json`, IndexedDB lookups |

**Problem:** Original `fetch-route-sequences.cjs` and `fetch-route-branches.ts` saved stop lists using NextBus `tag` values, but `stops-db.ts` lookups use GTFS `stopId`. This caused:

- "No stops found for route X" on all route detail pages
- Branch switching not updating stops list

**Solution:** Created conversion scripts that re-fetch NextBus routeConfig API and map `tag` → `stopId`:

```javascript
// Build tag→stopId mapping from routeConfig response
const tagToStopId = new Map();
for (const stop of route.route.stop) {
  tagToStopId.set(stop.tag, stop.stopId);
}

// Convert stored tags to GTFS stopIds
const gtfsStopId = tagToStopId.get(nextbusTag);
```

**Scripts:**
| Script | Purpose | Routes Fixed |
|--------|---------|--------------|
| `fix-route-stop-orders.cjs` | Convert `ttc-route-stop-orders.json` tags → stopIds | 211 |
| `fix-route-branches.cjs` | Convert `ttc-route-branches.json` branch.stops tags → stopIds | 211 |

**Additional Fix:** Stop tags with `_ar` suffix (arrival markers) needed stripping in `stops-db.ts`:

```typescript
const cleanStopId = stopId.replace(/_ar$/, "");
```

**Data Files Updated (2025-01-15):**

- `src/lib/data/ttc-route-stop-orders.json` - All 211 routes use GTFS stopIds
- `static/data/ttc-route-stop-orders.json` - Copy in static folder
- `src/lib/data/ttc-route-branches.json` - All branch stop lists use GTFS stopIds
- `static/data/ttc-route-branches.json` - Copy in static folder

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
| poll-alerts        | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/poll-alerts` (v56)  |
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

### Dec 26, 2025 - Page Entrance Animations & Skeleton Loading

**Purpose:** Add smooth entrance animations to static pages (About, Help, Settings, Preferences) and skeleton loading state for ETA cards to eliminate jarring content jumps.

**Entrance Animations Added:**

- ✅ **About page** - Header (0ms) → App Info → Developer → Data Sources → Privacy → Disclaimer → Support → Footer (350ms)
- ✅ **Help page** - Header (0ms) → Quick Start → Features Guide → Troubleshooting (150ms)
- ✅ **Settings page** - Header (0ms) → Saved Stops → Saved Routes → Preferences → Data Management (200ms)
- ✅ **Preferences page** - Header (0ms) → Step 1-4 → Help & Feedback → Accessibility (300ms)
- ✅ **Alerts page** - AlertCards with staggered 50ms delays (capped at 300ms)
- ✅ **ResolvedSection** - Section header and resolved alert cards with staggered animations
- ✅ **RSZ alerts section** - Fade-in-up animation
- ✅ **Empty state** - Fade-in-up animation for "All Clear" state

**Animation Pattern:**

- Using existing `animate-fade-in-up` class (defined in `layout.css`)
- Staggered delays: 50ms increments for smooth cascade effect
- `animation: fadeInUp 0.25s ease-out forwards`

**Skeleton Loading:**

- ✅ **MyStops component** - Added skeleton cards during initial ETA fetch
- Shows placeholder cards with animated Skeleton components
- Displays `isInitialLoading` state when stops exist but ETAs not yet loaded

**Files Changed:**

- `src/routes/about/+page.svelte` - Entrance animations
- `src/routes/help/+page.svelte` - Entrance animations
- `src/routes/settings/+page.svelte` - Entrance animations
- `src/routes/preferences/+page.svelte` - Entrance animations
- `src/routes/alerts/+page.svelte` - AlertCard staggered animations
- `src/routes/alerts/ResolvedSection.svelte` - Resolved alerts animations
- `src/lib/components/stops/MyStops.svelte` - Skeleton loading state

---

### Dec 25, 2025 - Express Route Holiday Schedule Fix

**Purpose:** Fix express routes (900 series) showing incorrect next service date on holidays. Previously showed the literal next weekday (e.g., "Friday" for Boxing Day) instead of the next actual service day.

**Bug Fixed:**

- On Christmas Day (Dec 25), express routes like 939 Finch Express incorrectly showed "Friday" as next service
- Boxing Day (Dec 26) is a holiday, so express routes don't run
- Now correctly shows "Mon, Dec 29" (the actual next weekday service)

**Changes:**

- ✅ **schedule-lookup.ts** - Express route logic now iterates through days to find next non-holiday weekday
- ✅ **ttc-service-info.ts** - Added 2024 holidays (was missing, only had 2025-2026)

**Express Route Holiday Behavior:**
Express routes (900 series) only operate on **regular weekdays during peak hours**. On holidays and weekends, they show the next actual service date:

- Christmas Day (Dec 25) → Shows "Mon, Dec 29" (skips Boxing Day weekend)
- Boxing Day (Dec 26) → Shows "Mon, Dec 29"
- Regular weekend → Shows "Monday" or next weekday

**Files Changed:**

- `src/lib/services/schedule-lookup.ts` - Express route next weekday logic
- `src/lib/utils/ttc-service-info.ts` - Added HOLIDAYS_2024 constant

---

### Jan 20, 2025 - Hover States, Typography & Dark Mode Contrast

**Purpose:** Fix invisible hover states across the app (theme colors too similar to background), improve text readability by increasing font sizes, and soften dark mode contrast to reduce eye strain.

**Hover State Fixes:**

- ✅ **Button component** - Updated `outline` and `ghost` variants to use `hover:bg-zinc-100 dark:hover:bg-zinc-800` instead of invisible `hover:bg-muted`
- ✅ **Header buttons** - Fixed refresh, language toggle, theme toggle, help button hover states
- ✅ **Settings page** - Language and theme toggle buttons now have visible hover
- ✅ **Preferences page** - Text scale toggle buttons fixed
- ✅ **Switch component** - Added hover ring glow, background change, and active scale
- ✅ **MyStopsWidget** - Stop item hover states fixed
- ✅ Added `cursor-pointer` to all interactive elements

**Typography Improvements:**

- ✅ **About page** - All `text-xs` (12px) → `text-sm` (14px) for descriptions, links, footer
- ✅ **Help page** - Step descriptions updated to `text-sm`
- ✅ **Settings page** - Toggle descriptions, footer text updated
- ✅ **Preferences page** - Button subtitles, accessibility descriptions updated
- ✅ **Route detail page** - Construction notices, empty states updated

**Dark Mode Contrast (layout.css):**

| Property             | Old Value (harsh) | New Value (softer) |
| -------------------- | ----------------- | ------------------ |
| `--background`       | `240 10% 3.9%`    | `240 6% 10%`       |
| `--foreground`       | `0 0% 98%`        | `0 0% 93%`         |
| `--muted-foreground` | `240 5% 71%`      | `240 5% 65%`       |

**Card Spacing (About page):**

- ✅ Reduced gap from `gap-6` to `gap-4` on cards without descriptions (About Developer, Disclaimer)
- ✅ Removed nested `space-y-3` wrapper in Data Sources card
- ✅ Standardized `space-y-4` across all Card.Content sections

**Files Changed:**

- `src/lib/components/ui/button/button.svelte` - Hover state classes
- `src/lib/components/ui/switch/switch.svelte` - Hover ring, cursor, active state
- `src/lib/components/layout/Header.svelte` - All button hover states + cursor-pointer
- `src/routes/settings/+page.svelte` - Back button added, toggle hover, text sizes
- `src/routes/about/+page.svelte` - Card spacing, text sizes
- `src/routes/help/+page.svelte` - Text sizes
- `src/routes/preferences/+page.svelte` - Text sizes
- `src/routes/routes/[route]/+page.svelte` - Text sizes
- `src/routes/layout.css` - Dark mode color values
- `DESIGN_SYSTEM.md` - Added "Interactive States" section with hover patterns

---

### Jan 19, 2025 - Elevator Alerts, Section Organization & Label Consistency

**Purpose:** Show elevator alerts for saved subway lines in My Routes and on subway route pages, organize alerts into clearly labeled sections with icons and dividers, and standardize terminology across the app.

**My Routes Page Changes (`MyRouteAlerts.svelte`):**

- ✅ Added **Elevator Alerts section** - shows elevator/escalator alerts for saved subway lines
- ✅ Added **section headings with icons** and horizontal dividers between alert types
- ✅ Added station-to-line mapping via `subway-stations.ts` to identify which line an elevator alert belongs to
- ✅ **Section order**: Active Service Alerts → Scheduled Closures → Planned Route Changes → Elevator Alerts → Slow Zones
- ✅ Hidden empty sections (e.g., no "Planned Route Changes" heading if user has no route changes)

**Subway Route Page Changes (`[route]/+page.svelte`):**

- ✅ Added **Elevator Alerts section** - shows elevator/escalator alerts for stations on the current subway line
- ✅ Added **Scheduled Closures section** - shows active scheduled maintenance for the route
- ✅ Added **section headings with icons** (AlertTriangle, Calendar, Accessibility, Gauge)
- ✅ **Section order**: Active Service Alerts → Scheduled Closures → Elevator Alerts → Slow Zones

**New Data File:**

- ✅ `src/lib/data/subway-stations.ts` - Maps 69 subway stations to their line(s) for elevator alert filtering

**Label Consistency (i18n):**

- ✅ "Scheduled Maintenance" → **"Scheduled Closures"** (EN) / "Fermetures prévues" (FR)
- ✅ "Route Changes" → **"Planned Route Changes"** (EN) / "Changements d'itinéraires prévus" (FR)

**Blue Night Streetcar Routes:**

- ✅ Added missing routes 301, 304, 305, 306, 310, 312 to `RouteSearch.svelte`

**Section Icons:**
| Section | Icon | Color |
|---------|------|-------|
| Active Service Alerts | AlertTriangle | text-destructive |
| Scheduled Closures | Calendar | text-muted-foreground |
| Planned Route Changes | GitBranch | text-muted-foreground |
| Elevator Alerts | Accessibility | text-muted-foreground |
| Slow Zones | Gauge | text-muted-foreground |

**Files Changed:**

- `src/lib/components/alerts/MyRouteAlerts.svelte` - Elevator alerts, section headings, dividers, reordering
- `src/routes/routes/[route]/+page.svelte` - Elevator alerts, scheduled closures, section organization
- `src/lib/components/alerts/RouteSearch.svelte` - Added Blue Night Streetcar routes
- `src/lib/data/subway-stations.ts` - **NEW** Station-to-line mapping
- `src/lib/i18n/en.json` - Updated labels for consistency
- `src/lib/i18n/fr.json` - French translations updated

---

### Jan 18, 2025 - URL Parameter Sync for Alert Filters

**Purpose:** Filter tabs and categories on the alerts page now sync with URL query parameters, enabling shareable links and browser history navigation.

**URL Structure:**

| Tab       | Filter/Subtab | URL                                         |
| --------- | ------------- | ------------------------------------------- |
| Now       | Disruptions   | `/alerts` (default)                         |
| Now       | Slow Zones    | `/alerts?category=slowzones`                |
| Now       | Elevators     | `/alerts?category=elevators`                |
| Scheduled | Closures      | `/alerts?tab=scheduled`                     |
| Scheduled | Route Changes | `/alerts?tab=scheduled&subtab=routechanges` |

**Features:**

- Tab selections update URL (`?tab=scheduled` for Scheduled tab)
- Category selections update URL for Now tab (`?category=slowzones` or `?category=elevators`)
- Subtab selections update URL for Scheduled tab (`?subtab=routechanges`)
- Page load reads URL params to restore filter state
- Uses `replaceState` to avoid polluting browser history
- Browser back/forward navigation works correctly

**Technical Details:**

- Uses SvelteKit's `goto()` with `replaceState: true, noScroll: true, keepFocus: true`
- Browser-safe initialization with `$app/environment` (`browser` guard)
- URL param mappings: `delays` internal → `slowzones` URL, `changes` internal → `routechanges` URL
- Default values omitted from URL: tab=`now`, category=`disruptions`, subtab=`closures`
- Category param only appears for Now tab; subtab param only appears for Scheduled tab

**Files Changed:**

- `src/routes/alerts/+page.svelte` - URL param sync logic with mappings
- `src/routes/alerts/PlannedContent.svelte` - Controlled component with subtab props

---

### Jan 21, 2025 - Collapsible Accordions & State Persistence

**Purpose:** Added collapsible accordion sections for better scannability and persisted accordion states to localStorage.

**Accordion Sections Added:**

| Page/Component | Sections                                                               |
| -------------- | ---------------------------------------------------------------------- |
| Route Page     | Scheduled Closures, Elevator Alerts, Slow Zones, Planned Route Changes |
| My Routes      | Scheduled Closures, Elevator Alerts, Slow Zones, Planned Route Changes |
| My Stops       | Each stop's ETA card (collapsible header with live arrivals)           |

**State Persistence (localStorage):**

| Key                               | Data                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `ttc-alerts-expanded-stops`       | Set of expanded stop IDs (My Stops tab)                            |
| `ttc-alerts-my-routes-accordions` | Object: closures, routeChanges, elevatorAlerts, slowZones booleans |
| `ttc-alerts-route-accordions`     | Object: closures, routeChanges, elevatorAlerts, slowZones booleans |

**Accordion UI Pattern:**

- Header: Icon + Title + Count badge + ChevronDown
- Collapsed by default for easy scanning
- ChevronDown rotates 180° when expanded
- Persists open/close state across refreshes

**Tab Styling Fix:**

- Updated Now/Scheduled tabs to include bottom accent line (2px primary color)
- Tabs now have pill-style background fill + bottom accent indicator
- Matches My Stops/My Routes tab design

**Files Updated:**

- `src/lib/components/stops/MyStops.svelte` - Collapsible ETA cards, localStorage persistence
- `src/lib/components/eta/ETACard.svelte` - Added `collapsed` and `onToggleCollapse` props
- `src/lib/components/alerts/MyRouteAlerts.svelte` - Accordion sections with persistence
- `src/routes/routes/[route]/+page.svelte` - Accordion sections with persistence
- `src/routes/alerts/+page.svelte` - Added bottom accent line to active tab
- `DESIGN_SYSTEM.md` - Updated tab indicator CSS pattern

**Design Pattern (from DESIGN_SYSTEM.md):**

```css
.tab.active::after {
  content: "";
  position: absolute;
  bottom: -0.125rem;
  left: 50%;
  transform: translateX(-50%);
  width: 2rem;
  height: 2px;
  background: hsl(var(--primary));
  border-radius: 1px;
}
```

---

### Jan 18, 2025 - Alerts V3: Now Live at /alerts

**Purpose:** The redesigned alerts page is now live at `/alerts` (previously at `/alerts-v3`). The old design has been moved to `/alerts-v3` for reference.

**Key Changes:**

| Feature                | Before (old /alerts)             | After (new /alerts)                   |
| ---------------------- | -------------------------------- | ------------------------------------- |
| Primary Navigation     | All/My Routes/Scheduled tabs     | Now/Planned tabs                      |
| Subway Status          | Grid at top of content           | Same compact grid (production CSS)    |
| Active Alert Filtering | Severity accordion (Major/Minor) | Pill-based filters (Disruptions/etc.) |
| Planned Content        | Scheduled tab with all closures  | Sub-tabs: Closures / Route Changes    |
| Recently Resolved      | Hidden in accordion              | Always visible section at bottom      |
| Layout                 | Full width                       | Centered 600px max-width              |

**Components (now at `src/routes/alerts/`):**

- `SubwayStatusBar.svelte` - 4-col desktop / 2x2 mobile, no slowzone status, minmax(0, 1fr) grid
- `CategoryFilterV3.svelte` - Color-coded pill filters with counts
- `PlannedContent.svelte` - Closures vs Route Changes sub-tabs, TTC attribution link
- `ResolvedSection.svelte` - Always-visible recently resolved section

**Design Decisions:**

1. **Now/Planned split** - Clearer mental model (what's happening vs what's coming)
2. **Pill-based filters** - More compact than accordion, shows counts at a glance
3. **Recently Resolved always visible** - Users can see what just cleared
4. **Centered narrow layout** - Better readability, matches design system
5. **TTC attribution link** - Dynamic link to TTC.ca based on current view (Slow Zones, Closures, Route Changes)

### Jan 15, 2025 - NextBus Tag → GTFS StopId Conversion (Critical Fix)

**Issue:** Route pages showing "No stops found for route X" and branch switching not updating stops.

**Root Cause:** The NextBus API uses two different ID systems:

- `tag` - Internal NextBus identifier used in direction/branch stop references
- `stopId` - GTFS standard identifier used in our stops database

Original data scripts saved NextBus `tag` values, but `stops-db.ts` lookups expected GTFS `stopId` values.

**Fix Scripts Created:**
| Script | Purpose | Routes Fixed |
|--------|---------|--------------|
| `fix-route-stop-orders.cjs` | Convert route stop orders from tags → stopIds | 211 |
| `fix-route-branches.cjs` | Convert branch stops from tags → stopIds | 211 |

**Additional Fix:** Added `_ar` suffix (arrival markers) stripping in `stops-db.ts`:

```typescript
const cleanStopId = stopId.replace(/_ar$/, "");
```

**Files Updated:**

- `src/lib/data/ttc-route-stop-orders.json` - All 211 routes converted
- `static/data/ttc-route-stop-orders.json` - Static copy
- `src/lib/data/ttc-route-branches.json` - All branch stops converted
- `static/data/ttc-route-branches.json` - Static copy
- `src/lib/data/stops-db.ts` - Added `_ar` suffix cleanup

**Verification:**

- Route 116: Now shows 57 Eastbound + 50 Westbound = 107 stops
- Route 32: Branch switching works (32: 45 stops, 32D: 25 stops)

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

### Jun 19, 2025 - Hidden Stale Alerts (poll-alerts v56)

**Problem:** Alerts cleared from TTC API without SERVICE_RESUMED from Bluesky incorrectly showed in Resolved tab, or cluttered Active tab while waiting for SERVICE_RESUMED.

**Solution:** Added `is_hidden` flag to hide stale alerts immediately while giving Bluesky 6 hours to post SERVICE_RESUMED.

**Behavior:**

1. Alert appears in TTC API → shows in **Active** tab
2. TTC clears alert without SERVICE_RESUMED → **hidden immediately** (not in Active or Resolved)
3. Within 6 hours:
   - If Bluesky posts SERVICE_RESUMED → **unhidden, appears in Resolved tab** ✅
   - If no SERVICE_RESUMED after 6h → **deleted permanently**

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - v56: is_hidden flag, 6h delete
- `src/routes/alerts/+page.svelte` - Filter `is_hidden` threads from display
- `src/lib/stores/alerts.ts` - Add `is_hidden` to SELECT query
- `src/lib/types/database.ts` - Add `is_hidden` to Thread type
- Database migration: `add_is_hidden_to_incident_threads`

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
