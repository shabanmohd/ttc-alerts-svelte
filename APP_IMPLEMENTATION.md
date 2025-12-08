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

| File                                         | Status | Purpose                                          |
| -------------------------------------------- | ------ | ------------------------------------------------ |
| `components/alerts/AlertCard.svelte`         | ✅     | Alert cards w/ route extraction from header_text |
| `components/alerts/FilterChips.svelte`       | ✅     | Category filter buttons                          |
| `components/alerts/MaintenanceWidget.svelte` | ✅     | Scheduled maintenance display                    |
| `components/alerts/MyRouteAlerts.svelte`     | ✅     | My Routes tab with responsive route badge tabs   |
| `components/alerts/RouteBadge.svelte`        | ✅     | TTC-branded route badges (full names, colors)    |
| `components/alerts/StatusBadge.svelte`       | ✅     | Status indicators (Delay, Detour, Resumed, etc.) |
| `components/dialogs/HowToUseDialog.svelte`   | ✅     | User guide                                       |
| `components/dialogs/InstallPWADialog.svelte` | ✅     | PWA install prompt                               |
| `components/layout/Header.svelte`            | ✅     | App header with hamburger menu (mobile)          |
| `components/layout/Sidebar.svelte`           | ✅     | Desktop navigation                               |
| `components/layout/MobileBottomNav.svelte`   | ✅     | Mobile navigation                                |
| `components/ui/*`                            | ✅     | shadcn-svelte base components                    |
| `services/webauthn.ts`                       | ✅     | WebAuthn browser API wrapper                     |
| `stores/alerts.ts`                           | ✅     | Alerts state + date validation filter            |
| `stores/auth.ts`                             | ✅     | Custom WebAuthn auth store                       |
| `stores/preferences.ts`                      | ✅     | User preferences state                           |
| `types/auth.ts`                              | ✅     | Auth TypeScript types                            |
| `types/database.ts`                          | ✅     | Database types (JSONB fields)                    |
| `supabase.ts`                                | ✅     | Supabase client config                           |
| `utils.ts`                                   | ✅     | Utility functions                                |

### Pages (`src/routes/`)

| File                         | Status | Purpose                                               |
| ---------------------------- | ------ | ----------------------------------------------------- |
| `+layout.svelte`             | ✅     | App layout, auth init, dialogs                        |
| `+page.svelte`               | ✅     | Homepage with alert tabs + ETA                        |
| `preferences/+page.svelte`   | ✅     | Route/mode preferences                                |
| `settings/+page.svelte`      | ✅     | Settings with stops, routes, prefs, location 🆕 **B** |
| `routes/+page.svelte`        | ✅     | Route browser by category 🆕 **B**                    |
| `auth/callback/+page.svelte` | ✅     | Auth callback handler                                 |

### Backend (`supabase/`)

| File                                    | Status | Purpose                                                 |
| --------------------------------------- | ------ | ------------------------------------------------------- |
| `functions/_shared/auth-utils.ts`       | ✅     | CORS + Supabase client factory                          |
| `functions/auth-register/index.ts`      | ✅     | User registration + recovery codes (uses Supabase Auth) |
| `functions/auth-challenge/index.ts`     | ✅     | Generate WebAuthn challenge                             |
| `functions/auth-verify/index.ts`        | ✅     | Verify biometrics, create session                       |
| `functions/auth-session/index.ts`       | ✅     | Validate existing session                               |
| `functions/auth-recover/index.ts`       | ✅     | Sign in with recovery code                              |
| `functions/poll-alerts/index.ts`        | ✅     | Fetch/parse/thread alerts (v5: fixed schema)            |
| `functions/scrape-maintenance/index.ts` | ✅     | Scrape maintenance schedule                             |
| `functions/get-eta/index.ts`            | ✅     | Fetch TTC NextBus predictions 🆕 **B**                  |

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

| File                  | Status | Purpose                                                             |
| --------------------- | ------ | ------------------------------------------------------------------- |
| `manifest.json`       | ✅     | PWA manifest (Version B: "TTC Alerts Beta")                         |
| `sw.js`               | ✅     | Service worker (Version B: beta cache prefix)                       |
| `icons/*`             | ✅     | All PWA icons (72-512px)                                            |
| `data/ttc-stops.json` | ✅     | TTC stops database (9,346 stops, 184 subway w/ sequence) 🆕 **V-B** |

### Data (`src/lib/data/`) 🆕 **Version B Only**

| File          | Status | Purpose                                                           |
| ------------- | ------ | ----------------------------------------------------------------- |
| `stops-db.ts` | ✅     | IndexedDB layer with Dexie.js, GTFS direction/sequence for subway |

### Stops Components (`src/lib/components/stops/`) 🆕 **Version B Only**

| File                        | Status | Purpose                                                        |
| --------------------------- | ------ | -------------------------------------------------------------- |
| `StopSearch.svelte`         | ✅     | Stop search with autocomplete, direction badges, ID search     |
| `BookmarkStopButton.svelte` | ✅     | Bookmark toggle button for stops                               |
| `MyStops.svelte`            | ✅     | Full-page My Stops list                                        |
| `MyStopsEmpty.svelte`       | ✅     | Empty state for My Stops                                       |
| `MyStopsWidget.svelte`      | ✅     | Display bookmarked stops on homepage                           |
| `RouteDirectionTabs.svelte` | ✅     | Direction tabs for route pages (terminal names for subway)     |
| `RouteMapPreview.svelte`    | ✅     | Map preview for route stops                                    |
| `RouteStopItem.svelte`      | ✅     | Stop item with ETA, platform badges, hidden stop ID for subway |
| `RouteStopsList.svelte`     | ✅     | List of stops with ETA expand/collapse                         |
| `index.ts`                  | ✅     | Component exports                                              |

### ETA Components (`src/lib/components/eta/`) 🆕 **Version B Only**

| File               | Status | Purpose                                                      |
| ------------------ | ------ | ------------------------------------------------------------ |
| `ETABadge.svelte`  | ✅     | Individual arrival time badge with urgency                   |
| `ETACard.svelte`   | ✅     | Route-grouped ETA card with direction badge + stop ID header |
| `ETAWidget.svelte` | ✅     | Homepage widget showing bookmarked stop ETAs                 |

### Weather Components (`src/lib/components/weather/`) 🆕 **Version B Only**

| File                          | Status | Purpose                                                 |
| ----------------------------- | ------ | ------------------------------------------------------- |
| `WeatherWarningBanner.svelte` | ✅     | Transit-relevant weather alerts from Environment Canada |

### i18n (`src/lib/i18n/`) 🆕 **Version B Only**

| File       | Status | Purpose                                 |
| ---------- | ------ | --------------------------------------- |
| `index.ts` | ✅     | svelte-i18n setup with locale detection |
| `en.json`  | ✅     | English translations                    |
| `fr.json`  | ✅     | French translations                     |

### Stores (`src/lib/stores/`) 🆕 **Version B additions**

| File                  | Status | Purpose                                                   | Version |
| --------------------- | ------ | --------------------------------------------------------- | ------- |
| `alerts.ts`           | ✅     | Alerts state + date validation filter                     | A & B   |
| `auth.ts`             | ✅     | Custom WebAuthn auth store                                | A & B   |
| `preferences.ts`      | ✅     | User preferences state (cloud sync)                       | A & B   |
| `localPreferences.ts` | ✅     | Local preferences (theme, text size, reduce motion, i18n) | **B**   |
| `visibility.ts`       | ✅     | Track document visibility for polling control             | **B**   |
| `accessibility.ts`    | ✅     | Text scaling and reduce motion settings                   | **B**   |
| `bookmarks.ts`        | ✅     | Bookmarked stops (localStorage + Supabase sync)           | **B**   |
| `savedStops.ts`       | ✅     | Saved stops (IndexedDB storage)                           | **B**   |
| `savedRoutes.ts`      | ✅     | Saved routes (IndexedDB storage)                          | **B**   |
| `eta.ts`              | ✅     | ETA state with auto-refresh & caching                     | **B**   |

### Services (`src/lib/services/`)

| File          | Status | Purpose                                          | Version |
| ------------- | ------ | ------------------------------------------------ | ------- |
| `webauthn.ts` | ✅     | WebAuthn browser API wrapper                     | A & B   |
| `storage.ts`  | ✅     | IndexedDB storage for stops, routes, preferences | **B**   |

### Configuration (`src/`)

| File       | Status | Purpose                                           |
| ---------- | ------ | ------------------------------------------------- |
| `app.html` | ✅     | HTML template, Lexend font, blocking theme script |
| `app.d.ts` | ✅     | SvelteKit app type declarations                   |

### Scripts (`scripts/`) 🆕 **Version B Only**

| File                | Status | Purpose                                                         |
| ------------------- | ------ | --------------------------------------------------------------- |
| `transform-gtfs.js` | ✅     | Transform GTFS data, extract direction, sequence for subway/LRT |
| `generate-icons.js` | ✅     | Generate PWA icons from source                                  |

### Migrations (`supabase/migrations/`)

| File                            | Status | Purpose                                    | Version |
| ------------------------------- | ------ | ------------------------------------------ | ------- |
| `20241204_auth_tables.sql`      | ✅     | WebAuthn auth tables                       | A & B   |
| `20251204_bookmarked_stops.sql` | ✅     | Add bookmarked_stops column to preferences | **B**   |

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

| Function       | Status | URL                                                                    |
| -------------- | ------ | ---------------------------------------------------------------------- |
| auth-register  | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-register`  |
| auth-challenge | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-challenge` |
| auth-verify    | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-verify`    |
| auth-session   | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-session`   |
| auth-recover   | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-recover`   |
| poll-alerts    | ✅     | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/poll-alerts`    |

---

## Changelog

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
