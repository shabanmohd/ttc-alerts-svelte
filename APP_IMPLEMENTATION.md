# TTC Alerts PWA - Implementation Status

## Overview

Real-time Toronto Transit alerts with biometric authentication.

| Stack    | Details                                                     |
| -------- | ----------------------------------------------------------- |
| Frontend | Svelte 5 + TypeScript + Tailwind + shadcn-svelte            |
| Backend  | Supabase (DB, Edge Functions, Realtime)                     |
| Auth     | Custom WebAuthn (displayName + biometrics + recovery codes) |
| Hosting  | Cloudflare Pages                                            |

---

## Status Summary

| Phase              | Status         | %    |
| ------------------ | -------------- | ---- |
| Backend (Supabase) | ✅ Complete    | 100% |
| Frontend (Svelte)  | ✅ Complete    | 100% |
| PWA Features       | ✅ Complete    | 100% |
| Deployment         | 🔄 Ready       | 80%  |

---

## File Structure

### Frontend (`src/lib/`)

| File                                            | Status | Purpose                              |
| ----------------------------------------------- | ------ | ------------------------------------ |
| `components/alerts/AlertCard.svelte`            | ✅     | Alert display card (JSONB ready)     |
| `components/alerts/FilterChips.svelte`          | ✅     | Category filter buttons              |
| `components/alerts/MaintenanceWidget.svelte`    | ✅     | Scheduled maintenance display        |
| `components/alerts/RouteBadge.svelte`           | ✅     | TTC route badges with colors         |
| `components/alerts/StatusBadge.svelte`          | ✅     | Alert status indicators              |
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
| `stores/alerts.ts`                              | ✅     | Alerts state (real Supabase data)    |
| `stores/auth.ts`                                | ✅     | Custom WebAuthn auth store           |
| `stores/preferences.ts`                         | ✅     | User preferences state               |
| `types/auth.ts`                                 | ✅     | Auth TypeScript types                |
| `types/database.ts`                             | ✅     | Database types (JSONB fields)        |
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

| File                                    | Status | Purpose                                                 |
| --------------------------------------- | ------ | ------------------------------------------------------- |
| `functions/_shared/auth-utils.ts`       | ✅     | CORS + Supabase client factory                          |
| `functions/auth-register/index.ts`      | ✅     | User registration + recovery codes (uses Supabase Auth) |
| `functions/auth-challenge/index.ts`     | ✅     | Generate WebAuthn challenge                             |
| `functions/auth-verify/index.ts`        | ✅     | Verify biometrics, create session                       |
| `functions/auth-session/index.ts`       | ✅     | Validate existing session                               |
| `functions/auth-recover/index.ts`       | ✅     | Sign in with recovery code                              |
| `functions/poll-alerts/index.ts`        | ✅     | Fetch alerts from Bluesky API                           |
| `functions/scrape-maintenance/index.ts` | ✅     | Scrape maintenance schedule                             |

### Database (EXISTING in Supabase)

| Table                  | Rows   | Purpose                                      |
| ---------------------- | ------ | -------------------------------------------- |
| `alert_cache`          | 592    | Alerts from Bluesky (affected_routes JSONB)  |
| `incident_threads`     | 248K   | Grouped alert threads                        |
| `planned_maintenance`  | 9      | Scheduled maintenance                        |
| `user_profiles`        | -      | User display_name, linked to auth.users      |
| `webauthn_credentials` | -      | Public keys (credential_id as PK)            |
| `recovery_codes`       | -      | Bcrypt-hashed one-time codes                 |
| `user_preferences`     | -      | Routes, modes, notification settings         |

### Static (`static/`)

| File            | Status | Purpose                         |
| --------------- | ------ | ------------------------------- |
| `manifest.json` | ✅     | PWA manifest                    |
| `sw.js`         | ✅     | Service worker                  |
| `icons/*`       | ✅     | All PWA icons (72-512px)        |

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

| Priority | Task                              | Status |
| -------- | --------------------------------- | ------ |
| 1        | Set WebAuthn env vars (see below) | ⚠️     |
| 2        | Deploy to Cloudflare Pages        | ⚠️     |
| 3        | Test full auth flow end-to-end    | ❌     |

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

- Deployed 6 Edge Functions via MCP
- auth-register, auth-challenge, auth-verify, auth-session, auth-recover, poll-alerts

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
