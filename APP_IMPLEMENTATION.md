# TTC Alerts PWA - Implementation Status

## Overview

Real-time Toronto Transit alerts with biometric authentication.

| Stack    | Details                                                      |
| -------- | ------------------------------------------------------------ |
| Frontend | Svelte 5 + TypeScript + Tailwind + shadcn-svelte             |
| Backend  | Supabase (DB, Edge Functions, Realtime)                      |
| Auth     | Custom WebAuthn (displayName + biometrics + recovery codes)  |
| Hosting  | Cloudflare Pages                                             |

---

## Status Summary

| Phase              | Status         | %   |
| ------------------ | -------------- | --- |
| Backend (Supabase) | ✅ Complete    | 95% |
| Frontend (Svelte)  | ✅ Complete    | 95% |
| PWA Features       | 🔄 In Progress | 60% |
| Deployment         | ❌ Not Started | 0%  |

---

## File Structure

### Frontend (`src/lib/`)

| File                                            | Status | Purpose                              |
| ----------------------------------------------- | ------ | ------------------------------------ |
| `components/alerts/AlertCard.svelte`            | ✅     | Alert display card                   |
| `components/alerts/FilterChips.svelte`          | ✅     | Category filter buttons              |
| `components/alerts/MaintenanceWidget.svelte`    | ✅     | Scheduled maintenance display        |
| `components/alerts/RouteBadge.svelte`           | ✅     | TTC route badges with colors         |
| `components/alerts/StatusBadge.svelte`          | ✅     | Alert status indicators              |
| `components/alerts/TabNavigation.svelte`        | ✅     | All/My Alerts/Scheduled tabs         |
| `components/dialogs/SignInDialog.svelte`        | ✅     | WebAuthn sign-in + recovery fallback |
| `components/dialogs/CreateAccountDialog.svelte` | ✅     | Registration + recovery codes        |
| `components/dialogs/AuthRequiredDialog.svelte`  | ✅     | Auth prompt for protected features   |
| `components/dialogs/HowToUseDialog.svelte`      | ✅     | User guide                           |
| `components/dialogs/InstallPWADialog.svelte`    | ✅     | PWA install prompt                   |
| `components/layout/Header.svelte`               | ✅     | App header with auth controls        |
| `components/layout/Sidebar.svelte`              | ✅     | Desktop navigation                   |
| `components/layout/MobileBottomNav.svelte`      | ✅     | Mobile navigation                    |
| `components/ui/*`                               | ✅     | shadcn-svelte base components        |
| `services/webauthn.ts`                          | ✅     | WebAuthn browser API wrapper         |
| `stores/alerts.ts`                              | ✅     | Alerts state management              |
| `stores/auth.ts`                                | ✅     | Custom WebAuthn auth store           |
| `stores/preferences.ts`                         | ✅     | User preferences state               |
| `types/auth.ts`                                 | ✅     | Auth TypeScript types                |
| `types/database.ts`                             | ✅     | Database TypeScript types            |
| `supabase.ts`                                   | ✅     | Supabase client config               |
| `utils.ts`                                      | ✅     | Utility functions                    |

### Pages (`src/routes/`)

| File                         | Status | Purpose                        |
| ---------------------------- | ------ | ------------------------------ |
| `+layout.svelte`             | ✅     | App layout, auth init, dialogs |
| `+page.svelte`               | ✅     | Homepage with alert tabs       |
| `preferences/+page.svelte`   | ✅     | Route/mode preferences         |
| `auth/callback/+page.svelte` | ✅     | Auth callback handler          |

### Backend (`supabase/`)

| File                                    | Status | Purpose                                              |
| --------------------------------------- | ------ | ---------------------------------------------------- |
| `functions/_shared/auth-utils.ts`       | ✅     | CORS + Supabase client factory                       |
| `functions/auth-register/index.ts`      | ✅     | User registration + recovery codes (uses Supabase Auth) |
| `functions/auth-challenge/index.ts`     | ✅     | Generate WebAuthn challenge                          |
| `functions/auth-verify/index.ts`        | ✅     | Verify biometrics, create session                    |
| `functions/auth-session/index.ts`       | ✅     | Validate existing session                            |
| `functions/auth-recover/index.ts`       | ✅     | Sign in with recovery code                           |
| `functions/poll-alerts/index.ts`        | ✅     | Fetch alerts from Bluesky API                        |
| `functions/scrape-maintenance/index.ts` | ✅     | Scrape maintenance schedule                          |

### Database (EXISTING in Supabase)

| Table                  | Status | Purpose                                      |
| ---------------------- | ------ | -------------------------------------------- |
| `user_profiles`        | ✅     | User display_name, linked to auth.users      |
| `webauthn_credentials` | ✅     | Public keys (credential_id as PK), counters  |
| `recovery_codes`       | ✅     | Bcrypt-hashed one-time codes, `used` boolean |
| `user_preferences`     | ✅     | Routes, modes, push_subscription (sessions)  |
| `service_alerts`       | ✅     | Alert storage                                |

### Static (`static/`)

| File            | Status | Purpose                                   |
| --------------- | ------ | ----------------------------------------- |
| `manifest.json` | ✅     | PWA manifest                              |
| `sw.js`         | ✅     | Service worker (caching, offline)         |
| `icons/`        | ⚠️     | Needs proper PWA icons (192x192, 512x512) |

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

| Priority | Task                                                            | Status |
| -------- | --------------------------------------------------------------- | ------ |
| 1        | Deploy Edge Functions (`supabase functions deploy`)             | ❌     |
| 2        | Set env vars: WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN | ❌     |
| 3        | Create PWA icons (192x192, 512x512, maskable)                   | ❌     |
| 4        | Connect to real Supabase data (replace mock)                    | ❌     |
| 5        | Enable Realtime subscriptions                                   | ❌     |
| 6        | Deploy to Cloudflare Pages                                      | ❌     |

---

## Changelog

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
