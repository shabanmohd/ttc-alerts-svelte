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

## 🆕 Recent Updates (Jan 11, 2026)

| Component            | Change                                                             | Status       |
| -------------------- | ------------------------------------------------------------------ | ------------ |
| **verify-elevators** | New Edge Function: validates elevator data against TTC API         | ✅ Deployed  |
| **verify-rsz**       | New Edge Function: validates RSZ data against TTC website          | ✅ Deployed  |
| **poll-alerts v115** | STEP 6b-repair: unhide elevator threads that reappear in TTC API   | ✅ Deployed  |
| **alerts.ts**        | Bidirectional realtime sync: fetch alerts for threads & vice versa | ✅ Committed |
| **pg_cron**          | Auto-verification jobs every 15 minutes                            | ✅ Deployed  |

### Previous Updates (Jan 9, 2026)

| Component                 | Change                                                               | Status       |
| ------------------------- | -------------------------------------------------------------------- | ------------ |
| **poll-alerts v110**      | Strip "-TTC" suffix and technical metadata from elevator alerts      | ✅ Deployed  |
| **find_or_create_thread** | DB function now excludes RSZ/ACCESSIBILITY from route-based matching | ✅ Deployed  |
| **AlertCard.svelte**      | Clean up elevator alert descriptions (hide technical metadata)       | ✅ Committed |
| **CategoryFilterV3**      | Improved count badge visibility (20% opacity bg)                     | ✅ Committed |
| **ClosuresView**          | Added CSS classes for count badges                                   | ✅ Committed |
| **PlannedContent**        | Added dark mode support for sub-tab counts                           | ✅ Committed |
| **alerts-v3**             | Fixed tab count badge inactive state                                 | ✅ Committed |
| **getAllAlertsForLine()** | Exclude RSZ/ACCESSIBILITY from subway status calculation             | ✅ Committed |

---

## ⚠️ Production Domains (IMPORTANT)

**Only deploy to these Cloudflare Pages domains:**

| Domain                        | Type    | Notes           |
| ----------------------------- | ------- | --------------- |
| `ttc-alerts-svelte.pages.dev` | Primary | Cloudflare CDN  |
| `rideto.ca`                   | Custom  | Production site |

> **DO NOT deploy to any other domains without explicit approval.**

---

## Status Summary

| Phase              | Status      | %    |
| ------------------ | ----------- | ---- |
| Backend (Supabase) | ✅ Complete | 100% |
| Frontend (Svelte)  | ✅ Complete | 100% |
| PWA Features       | ✅ Complete | 100% |
| Deployment         | ✅ Live     | 100% |

**Production URLs**:

- https://ttc-alerts-svelte.pages.dev
- https://rideto.ca

---

## File Structure

### Frontend (`src/lib/`)

| File                                            | Status | Purpose                                                    |
| ----------------------------------------------- | ------ | ---------------------------------------------------------- |
| `components/alerts/AlertCard.svelte`            | ✅     | Alert cards w/ route extraction from header_text           |
| `components/alerts/ClosuresView.svelte`         | ✅     | Scheduled closures display (detects nightly/weekend types) |
| `components/alerts/FilterChips.svelte`          | ✅     | Category filter buttons                                    |
| `components/alerts/MaintenanceWidget.svelte`    | ✅     | Scheduled maintenance display                              |
| `components/alerts/RouteBadge.svelte`           | ✅     | TTC-branded route badges (full names, colors)              |
| `components/alerts/StatusBadge.svelte`          | ✅     | Status badges (Nightly/Weekend Closure, Delay, etc.)       |
| `components/dialogs/SignInDialog.svelte`        | ✅     | WebAuthn sign-in + recovery fallback                       |
| `components/dialogs/CreateAccountDialog.svelte` | ✅     | Registration + recovery codes                              |
| `components/dialogs/AuthRequiredDialog.svelte`  | ✅     | Auth prompt for protected features                         |
| `components/dialogs/HowToUseDialog.svelte`      | ✅     | User guide                                                 |
| `components/dialogs/InstallPWADialog.svelte`    | ✅     | PWA install prompt                                         |
| `components/layout/Header.svelte`               | ✅     | App header with auth controls                              |
| `components/layout/Sidebar.svelte`              | ✅     | Desktop navigation                                         |
| `components/layout/MobileBottomNav.svelte`      | ✅     | Mobile navigation                                          |
| `components/ui/*`                               | ✅     | shadcn-svelte base components                              |
| `services/webauthn.ts`                          | ✅     | WebAuthn browser API wrapper                               |
| `stores/alerts.ts`                              | ✅     | Alerts state + realtime sync with bidirectional fetch      |
| `stores/auth.ts`                                | ✅     | Custom WebAuthn auth store                                 |
| `stores/preferences.ts`                         | ✅     | User preferences state                                     |
| `types/auth.ts`                                 | ✅     | Auth TypeScript types                                      |
| `types/database.ts`                             | ✅     | Database types (JSONB fields)                              |
| `supabase.ts`                                   | ✅     | Supabase client config                                     |
| `utils.ts`                                      | ✅     | Utility functions                                          |

### Pages (`src/routes/`)

| File                          | Status | Purpose                        |
| ----------------------------- | ------ | ------------------------------ |
| `+layout.svelte`              | ✅     | App layout, auth init, dialogs |
| `+page.svelte`                | ✅     | Homepage with alert tabs       |
| `preferences/+page.svelte`    | ✅     | Route/mode preferences         |
| `auth/callback/+page.svelte`  | ✅     | Auth callback handler          |
| `admin/accuracy/+page.svelte` | ✅     | Alert accuracy monitoring      |

### Backend (`supabase/`)

| File                                        | Status | Purpose                                                                    |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `functions/_shared/auth-utils.ts`           | ✅     | CORS + Supabase client factory                                             |
| `functions/auth-register/index.ts`          | ✅     | User registration + recovery codes (uses Supabase Auth)                    |
| `functions/auth-challenge/index.ts`         | ✅     | Generate WebAuthn challenge                                                |
| `functions/auth-verify/index.ts`            | ✅     | Verify biometrics, create session                                          |
| `functions/auth-session/index.ts`           | ✅     | Validate existing session                                                  |
| `functions/auth-recover/index.ts`           | ✅     | Sign in with recovery code                                                 |
| `functions/poll-alerts/index.ts`            | ✅     | Fetch/parse/thread alerts (v107: self-healing RSZ/elevator protection)     |
| `functions/monitor-alert-accuracy/index.ts` | ✅     | Compare TTC API vs Supabase (scheduled every 5min)                         |
| `functions/scrape-maintenance/index.ts`     | ✅     | Scrape subway closures from TTC (v3: single-day closure support, Sitecore) |

### Database (EXISTING in Supabase)

| Table                    | Rows | Purpose                                                  |
| ------------------------ | ---- | -------------------------------------------------------- |
| `alert_cache`            | 600+ | Alerts from Bluesky (header_text, categories, is_latest) |
| `incident_threads`       | 255K | Grouped alert threads (title, is_resolved)               |
| `planned_maintenance`    | 9    | Scheduled maintenance                                    |
| `alert_accuracy_logs`    | -    | Alert accuracy checks (every 5min)                       |
| `alert_accuracy_reports` | -    | Daily accuracy summaries                                 |
| `user_profiles`          | -    | User display_name, linked to auth.users                  |
| `webauthn_credentials`   | -    | Public keys (credential_id as PK)                        |
| `recovery_codes`         | -    | Bcrypt-hashed one-time codes                             |
| `user_preferences`       | -    | Routes, modes, notification settings                     |

### Static (`static/`)

| File            | Status | Purpose                  |
| --------------- | ------ | ------------------------ |
| `manifest.json` | ✅     | PWA manifest             |
| `sw.js`         | ✅     | Service worker           |
| `icons/*`       | ✅     | All PWA icons (72-512px) |

### Configuration (`src/`)

| File       | Status | Purpose                                     |
| ---------- | ------ | ------------------------------------------- |
| `app.html` | ✅     | HTML template, Lexend font via Google Fonts |
| `app.d.ts` | ✅     | SvelteKit app type declarations             |

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
   - **Environment variables**:
     - `VITE_SUPABASE_URL` = `https://wmchvmegxcpyfjcuzqzk.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key)
4. Deploy!

### Environment Variables (Set in Supabase Dashboard)

Go to: **Project Settings → Edge Functions → Secrets**

```
WEBAUTHN_RP_ID=ttc-alerts.pages.dev
WEBAUTHN_RP_NAME=TTC Alerts
WEBAUTHN_ORIGIN=https://ttc-alerts.pages.dev
```

For local development, use `localhost` and `http://localhost:5173`.

---

## Deployed Edge Functions

### Authentication Functions

| Function       | Status | Purpose               | URL                                                                    |
| -------------- | ------ | --------------------- | ---------------------------------------------------------------------- |
| auth-register  | ✅     | WebAuthn registration | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-register`  |
| auth-challenge | ✅     | WebAuthn challenge    | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-challenge` |
| auth-verify    | ✅     | WebAuthn verification | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-verify`    |
| auth-session   | ✅     | Session management    | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-session`   |
| auth-recover   | ✅     | Recovery codes        | `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/auth-recover`   |

### Alert Processing Functions

| Function               | Version | Status | Purpose                                      |
| ---------------------- | ------- | ------ | -------------------------------------------- |
| poll-alerts            | v115    | ✅     | Main alert fetcher from TTC API + Bluesky    |
| verify-elevators       | v1      | ✅     | Validates elevator data against TTC API      |
| verify-rsz             | v1      | ✅     | Validates RSZ data against TTC website       |
| scrape-rsz             | v4      | ✅     | Alternative RSZ source from TTC website      |
| scrape-maintenance     | v3      | ✅     | Fetches planned maintenance from TTC website |
| monitor-alert-accuracy | v5      | ✅     | Compares TTC API vs database (metrics)       |

### Cron Jobs (pg_cron)

| Job Name               | Schedule           | Function               |
| ---------------------- | ------------------ | ---------------------- |
| poll-alerts-2min       | `*/2 * * * *`      | poll-alerts            |
| verify-elevators-15min | `*/15 * * * *`     | verify-elevators       |
| verify-rsz-15min       | `7,22,37,52 * * *` | verify-rsz             |
| scrape-rsz-30min       | `*/30 * * * *`     | scrape-rsz             |
| scrape-maintenance-6hr | `0 */6 * * *`      | scrape-maintenance     |
| monitor-accuracy-5min  | `*/5 * * * *`      | monitor-alert-accuracy |

---

## Changelog

### Jan 8, 2026 - SERVICE_RESUMED Thread Handling Fix

**Bug Fixed:**
SERVICE_RESUMED alerts from Bluesky weren't properly showing in "Recently Resolved" section.

**Root Causes:**

1. **poll-alerts missing metadata**: When SERVICE_RESUMED matched an existing thread, the Edge Function wasn't setting `resolved_at` timestamp or adding `SERVICE_RESUMED` to thread categories.

2. **Wrong cutoff source**: Frontend used `thread.resolved_at` for the cutoff, but displayed `latestAlert.created_at` to users - causing inconsistency.

3. **Orphaned filter too strict**: Previously filtered out standalone SERVICE_RESUMED threads, but these are valid (Bluesky posts them when service genuinely resumes).

**Fixes Applied:**

- `supabase/functions/poll-alerts/index.ts` (v98):
  - Now sets `resolved_at` timestamp when SERVICE_RESUMED matches thread
  - Now adds `SERVICE_RESUMED` to thread categories array
- `src/routes/alerts/+page.svelte`:
  - Extended cutoff from 6 hours to **12 hours**
  - Changed cutoff to use `latestAlert.created_at` instead of `thread.resolved_at`
  - Removed orphaned SERVICE_RESUMED filter

**Result:** 25+ SERVICE_RESUMED alerts now visible in Recently Resolved section.

**Files Updated:**

- `supabase/functions/poll-alerts/index.ts` - Thread update logic for SERVICE_RESUMED
- `src/routes/alerts/+page.svelte` - Recently Resolved filter logic

### Jan 8, 2026 - Alert Accuracy Monitoring System

**New Feature:**

- ✅ `monitor-alert-accuracy` Edge Function compares TTC API vs Supabase data
- ✅ pg_cron scheduler runs every 5 minutes
- ✅ Database tables: `alert_accuracy_logs`, `alert_accuracy_reports`
- ✅ Admin dashboard at `/admin/accuracy` with:
  - Live accuracy metrics (completeness, precision)
  - 24-hour trend chart
  - Recent checks table
  - Missing/extra alerts breakdown
- ✅ Jaccard similarity algorithm for fuzzy alert matching

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

### Jan 8, 2026 - Recently Resolved Section Fix

**Bug Fixed:**
The "Recently Resolved" section was always showing "None in last 6 hours" even when resolved threads existed in the database.

**Root Causes:**

1. **Store filtering bug**: `threadsWithAlerts` derived store was filtering out ALL resolved threads with `!thread.is_resolved`, so `recentlyResolved` filter could never find any matches.

2. **Missing column**: The threads SQL query wasn't selecting `resolved_at` column, so even if threads made it through, `resolved_at` was always `undefined`.

**Fixes Applied:**

- `src/lib/stores/alerts.ts`:
  - Removed `!thread.is_resolved` filter from `threadsWithAlerts` - now only filters hidden threads
  - Added `resolved_at` to the threads SELECT query columns
- Active alerts (`activeAlerts`, `rszAlerts`, `categoryCounts`) still correctly filter `!t.is_resolved` at the page level

**Result:** 7 recently resolved alerts now visible in "Recently Resolved" section, including SERVICE_RESUMED confirmations from Bluesky.

**Files Updated:**

- `src/lib/stores/alerts.ts` - Store filtering and SQL query fix

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
- ✅ Non-mobile (≥ 640px): Last updated + refresh + How to Use + Theme toggle + Sign In
- ✅ Fixed responsive class inconsistencies (`hidden sm:flex` pattern)

**Sidebar Cleanup:**

- ✅ Removed Sign In button from sidebar (now in header for non-mobile)
- ✅ Removed Dark Mode toggle from sidebar (now in header for non-mobile)
- ✅ Sidebar now shows: Navigation + Help links (+ User info when authenticated)

**Files Updated:**

- `src/lib/components/layout/Header.svelte` - Fixed responsive visibility classes
- `src/lib/components/layout/Sidebar.svelte` - Removed redundant Sign In and theme toggle

### Dec 4, 2025 - Planned Alerts & Filter UX Improvements

**Planned Alerts Widget:**

- ✅ Renamed "Planned Maintenance" to "Planned Subway Closures"
- ✅ Moved closure badges (Full Weekend / Nightly Early) below station text
- ✅ Added footer row with badge on left, Details link on right
- ✅ Neutral gray outline style for closure badges (zinc-400)
- ✅ Fixed time parsing to handle HH:MM:SS format → displays as "11:59 PM"
- ✅ Consistent vertical alignment for dates across all cards
- ✅ Background polling every 5 minutes (data updates without page refresh)

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
