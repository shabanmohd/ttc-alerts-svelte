# TTC PWA Implementation Plan: Svelte + Tailwind + shadcn-svelte + Supabase

## Overview

Building a new TTC Service Alerts PWA from scratch using a modern, cost-free, serverless architecture.

| Technology         | Choice                                                   |
| ------------------ | -------------------------------------------------------- |
| Frontend Framework | Svelte 5 + TypeScript                                    |
| UI Library         | Tailwind + shadcn-svelte                                 |
| Backend            | Supabase (existing)                                      |
| Edge Functions     | Supabase Edge Functions                                  |
| Realtime           | Supabase Realtime                                        |
| Auth               | Custom WebAuthn (Username + Biometrics + Recovery Codes) |
| Hosting            | Cloudflare Pages (free, no sleep)                        |

**Goals:**

- ✅ $0/month running cost
- ✅ No server to maintain
- ✅ Instant updates (Realtime vs polling)
- ✅ PWA with offline support
- ✅ Type-safe codebase
- ✅ Easy to maintain

---

## Implementation Status Summary

| Phase                      | Status         | Completion |
| -------------------------- | -------------- | ---------- |
| Phase 1: Supabase Backend  | 🔄 In Progress | 70%        |
| Phase 2: Frontend (Svelte) | ✅ Complete    | 95%        |
| Phase 3: PWA Features      | 🔄 In Progress | 60%        |
| Phase 4: Deployment        | ❌ Not Started | 0%         |
| Phase 5: Testing & QA      | ❌ Not Started | 0%         |

---

## Phase 1: Supabase Backend (Using Existing)

We are using the **existing Supabase backend** - no migration needed.

### 1.1 Database Schema Updates

- [ ] **Review current schema** - Export from Supabase dashboard
- [ ] **Add missing indexes** for performance
  ```sql
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
  CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON incident_threads(updated_at DESC);
  ```
- [ ] **Enable Row Level Security (RLS)** on all tables
- [ ] **Create database functions** for complex queries (threading logic)

### 1.2 Supabase Edge Functions

- [x] **`poll-alerts` function exists** - Fetch from Bluesky API
- [x] **`scrape-maintenance` function exists** - Maintenance scraping
- [ ] **Deploy and test functions**
- [ ] **Set up pg_cron schedules**

### 1.3 Custom WebAuthn Auth System

**NOT using Supabase Auth** - Custom implementation with WebAuthn biometrics.

#### Database Tables Required:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WebAuthn credentials (passkeys/biometrics)
CREATE TABLE webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recovery codes (hashed)
CREATE TABLE recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device sessions (persistent)
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_routes TEXT[] DEFAULT '{}',
  transport_modes TEXT[] DEFAULT ARRAY['subway', 'bus', 'streetcar'],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_days INTEGER[] DEFAULT '{}',
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Edge Functions Required:

- [x] **`auth-register`** ✅ - Create user with WebAuthn credential + recovery codes
- [x] **`auth-challenge`** ✅ - Generate WebAuthn challenge for sign-in
- [x] **`auth-verify`** ✅ - Verify WebAuthn assertion and create session
- [x] **`auth-session`** ✅ - Validate existing session
- [x] **`auth-recover`** ✅ - Sign in with recovery code
- [ ] **`auth-add-credential`** - Add new device to existing account (future)

#### Auth Flow:

1. **Sign Up**: Username → WebAuthn biometrics → Recovery codes generated
2. **Sign In**: Username → WebAuthn biometrics → Session created
3. **Recovery**: Username → Recovery code → Session created (then add new device)
4. **Sessions**: Persistent, never auto-expire

### 1.4 Supabase Realtime Setup

- [ ] **Enable Realtime** on `alerts` table
- [ ] **Enable Realtime** on `incident_threads` table
- [ ] **Test WebSocket subscriptions**

---

## Phase 2: Frontend - Svelte + shadcn-svelte ✅ COMPLETE

### 2.1 Project Setup ✅

- [x] **Svelte 5 + TypeScript project created**
- [x] **Tailwind CSS configured**
- [x] **shadcn-svelte installed and configured**
- [x] **Supabase client configured** (`src/lib/supabase.ts`)
- [x] **TypeScript types generated** (`src/lib/types/database.ts`)
- [x] **Environment variables set up**

### 2.2 shadcn-svelte Components ✅

All required components installed:

- [x] Button, Card, Badge, Tabs, Alert
- [x] Accordion, Dropdown Menu, Sonner (toasts)
- [x] Switch, Checkbox, Input, Label, Select
- [x] Skeleton, Separator, Scroll Area, Dialog

### 2.3 TTC Theme ✅

- [x] **TTC colors configured** in Tailwind
- [x] **Dark theme** with proper contrast
- [x] **Custom CSS variables** (`src/lib/styles/ttc-theme.css`)

### 2.4 Svelte Stores ✅

- [x] **`src/lib/stores/alerts.ts`** - Alerts state management
- [x] **`src/lib/stores/auth.ts`** - Auth state with Supabase Auth
- [x] **`src/lib/stores/preferences.ts`** - User preferences

### 2.5 Core Components ✅

- [x] **`Header.svelte`** - App header with auth controls
- [x] **`Sidebar.svelte`** - Desktop navigation
- [x] **`MobileBottomNav.svelte`** - Mobile navigation
- [x] **`FilterChips.svelte`** - Category filter buttons
- [x] **`AlertCard.svelte`** - Alert display card
- [x] **`RouteBadge.svelte`** - TTC route badges with colors
- [x] **`StatusBadge.svelte`** - Alert status indicators
- [x] **`MaintenanceWidget.svelte`** - Scheduled maintenance display
- [x] **`TabNavigation.svelte`** - All/My Alerts/Scheduled tabs

### 2.6 Dialog Components ✅ COMPLETE

- [x] **`SignInDialog.svelte`** ✅ - WebAuthn biometric sign-in with recovery code fallback
- [x] **`CreateAccountDialog.svelte`** ✅ - WebAuthn registration + recovery codes display
- [x] **`AuthRequiredDialog.svelte`** - Prompt for features requiring auth ✅
- [x] **`HowToUseDialog.svelte`** - User guide ✅
- [x] **`InstallPWADialog.svelte`** - PWA install prompt ✅

### 2.7 Pages ✅

- [x] **Homepage** (`src/routes/+page.svelte`)
  - [x] Tab navigation (All Alerts / My Alerts / Scheduled)
  - [x] Filter chips
  - [x] Alert list
  - [x] Maintenance widget
- [x] **Layout** (`src/routes/+layout.svelte`)
  - [x] Header, Sidebar, Mobile nav
  - [x] Toaster for notifications
  - [x] Auth state listener
- [x] **Preferences** (`src/routes/preferences/+page.svelte`)
  - [x] Transport mode selection
  - [x] Route selection (searchable)
  - [x] Schedule configuration
  - [x] Alert type selection
  - [x] Auth required to save (prompts sign up/sign in)
- [x] **Auth Callback** (`src/routes/auth/callback/+page.svelte`)

### 2.8 Auth Flow ✅ COMPLETE

Custom WebAuthn authentication system implemented:

1. **Preferences visible to everyone** - Users can configure without signing in ✅
2. **Save requires account** - Clicking "Save" prompts AuthRequiredDialog ✅
3. **"My Alerts" requires account** - Clicking tab prompts AuthRequiredDialog ✅
4. **Sign Up flow:** ✅
   - Enter username (availability check)
   - Register WebAuthn credential (Face ID/Touch ID/fingerprint)
   - Display 8 recovery codes (user must acknowledge)
   - Create persistent session
5. **Sign In flow:** ✅
   - Enter username
   - Authenticate with WebAuthn biometrics
   - Recovery code fallback option
   - Create/update persistent session
6. **Recovery flow:** ✅
   - Enter username + recovery code
   - Create session
   - Shows remaining codes warning
7. **Sessions never auto-expire** - Users stay logged in ✅

#### Files Created/Updated:

- [x] `src/lib/types/auth.ts` ✅ - Auth type definitions
- [x] `src/lib/services/webauthn.ts` ✅ - WebAuthn utilities and API calls
- [x] `src/lib/stores/auth.ts` ✅ - Custom auth store (replaced Supabase Auth)
- [x] `src/lib/components/dialogs/SignInDialog.svelte` ✅ - WebAuthn sign in with steps
- [x] `src/lib/components/dialogs/CreateAccountDialog.svelte` ✅ - Registration + recovery codes
- [x] `supabase/functions/auth-register/index.ts` ✅
- [x] `supabase/functions/auth-challenge/index.ts` ✅
- [x] `supabase/functions/auth-verify/index.ts` ✅
- [x] `supabase/functions/auth-session/index.ts` ✅
- [x] `supabase/functions/auth-recover/index.ts` ✅
- [x] `supabase/migrations/20241204_auth_tables.sql` ✅ - Database schema

### 2.9 Remaining Frontend Tasks

- [ ] **Connect to real Supabase data** (currently using mock data)
- [ ] **Implement Realtime subscriptions**
- [ ] **Fix accessibility warnings** (label associations)

---

## Phase 3: PWA Features 🔄 IN PROGRESS

### 3.1 Web App Manifest ✅

- [x] **`static/manifest.json`** created with TTC branding
- [x] **Manifest linked** in `app.html`
- [ ] **Create proper PWA icons** (192x192, 512x512, maskable)
  - Currently only have tab icons, need full icon set

### 3.2 Service Worker ✅

- [x] **`static/sw.js`** created with:
  - [x] Cache-first for static assets
  - [x] Network-first for API/Supabase calls
  - [x] Offline fallback
  - [x] Push notification handlers
  - [x] Background sync stub

### 3.3 Remaining PWA Tasks

- [ ] **Create PWA icons** (all required sizes)
- [ ] **Implement IndexedDB caching** for offline alerts
- [ ] **Test offline functionality**
- [ ] **Test PWA installation** on mobile/desktop

### 3.4 Push Notifications (Future)

- [ ] Request notification permission
- [ ] Store push subscription in database
- [ ] Create Edge Function to send push on new alerts

---

## Phase 4: Deployment ❌ NOT STARTED

### 4.1 Cloudflare Pages Setup

- [ ] Create Cloudflare account
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Configure custom domain (optional)

### 4.2 Supabase Production Config

- [ ] Review RLS policies for security
- [ ] Configure CORS for production domain
- [ ] Test Edge Functions in production
- [ ] Enable Realtime in production

---

## Phase 5: Testing & QA ❌ NOT STARTED

### 5.1 Manual Testing

- [ ] Test all auth flows
- [ ] Test preferences save/load
- [ ] Test "My Alerts" filtering
- [ ] Test responsive design
- [ ] Test PWA installation

### 5.2 Automated Testing (Optional)

- [ ] Set up Vitest for unit tests
- [ ] Set up Playwright for E2E tests

### 5.3 Performance

- [ ] Lighthouse audit (target: 90+ all categories)
- [ ] Bundle size analysis

---

## Key Design Decisions

### Authentication Strategy

**Custom WebAuthn System** (NOT Supabase Auth):

| Feature            | Implementation                       |
| ------------------ | ------------------------------------ |
| Account creation   | Username + WebAuthn biometrics       |
| Sign in            | Username + WebAuthn biometrics       |
| Account recovery   | Username + one-time recovery code    |
| Session management | Custom device sessions, never expire |
| Multi-device       | Add new devices via recovery code    |

| Feature             | Behavior                        |
| ------------------- | ------------------------------- |
| View All Alerts     | No auth required                |
| View Preferences    | No auth required                |
| Save Preferences    | Auth required (prompts sign up) |
| My Alerts tab       | Auth required (prompts sign up) |
| Session persistence | Never auto-logout               |

### Why Custom WebAuthn?

- **Supabase does NOT support WebAuthn** natively
- Passwordless experience with biometrics
- No email required (privacy-friendly)
- Recovery codes for device loss scenarios
- Persistent sessions that survive cache clears (via device_id + session table)

### Data Flow

1. **Alerts** - Fetched from Supabase, updated via Realtime
2. **Preferences** - Stored in `user_preferences` table, linked to `users.id`
3. **Sessions** - Custom `device_sessions` table, validated via Edge Functions
4. **Auth state** - Stored in localStorage (session_id + device_id)

---

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── alerts/
│   │   │   ├── AlertCard.svelte ✅
│   │   │   ├── FilterChips.svelte ✅
│   │   │   ├── MaintenanceWidget.svelte ✅
│   │   │   ├── RouteBadge.svelte ✅
│   │   │   ├── StatusBadge.svelte ✅
│   │   │   └── TabNavigation.svelte ✅
│   │   ├── dialogs/
│   │   │   ├── AuthRequiredDialog.svelte ✅
│   │   │   ├── CreateAccountDialog.svelte ✅ (WebAuthn + recovery codes)
│   │   │   ├── HowToUseDialog.svelte ✅
│   │   │   ├── InstallPWADialog.svelte ✅
│   │   │   ├── SignInDialog.svelte ✅ (WebAuthn + recovery)
│   │   │   └── index.ts ✅
│   │   ├── layout/
│   │   │   ├── Header.svelte ✅
│   │   │   ├── MobileBottomNav.svelte ✅
│   │   │   └── Sidebar.svelte ✅
│   │   └── ui/ (shadcn-svelte components) ✅
│   ├── services/
│   │   └── webauthn.ts ✅ (WebAuthn API wrapper)
│   ├── stores/
│   │   ├── alerts.ts ✅
│   │   ├── auth.ts ✅ (custom WebAuthn auth)
│   │   └── preferences.ts ✅
│   ├── types/
│   │   ├── auth.ts ✅ (auth type definitions)
│   │   └── database.ts ✅
│   ├── supabase.ts ✅
│   └── utils.ts ✅
├── routes/
│   ├── +layout.svelte ✅
│   ├── +page.svelte ✅
│   ├── auth/callback/+page.svelte ✅
│   └── preferences/+page.svelte ✅
└── static/
    ├── manifest.json ✅
    ├── sw.js ✅
    └── icons/ ⚠️ (needs proper PWA icons)

supabase/
├── migrations/
│   └── 20241204_auth_tables.sql ✅ (auth schema)
└── functions/
    ├── _shared/
    │   └── auth-utils.ts ✅
    ├── poll-alerts/ ✅ (exists)
    ├── scrape-maintenance/ ✅ (exists)
    ├── auth-register/ ✅
    ├── auth-challenge/ ✅
    ├── auth-verify/ ✅
    ├── auth-session/ ✅
    └── auth-recover/ ✅
```

---

## Next Steps (Priority Order)

1. ✅ ~~**Create auth database tables**~~ - SQL migration created
2. ✅ ~~**Implement auth Edge Functions**~~ - All 5 functions created
3. ✅ ~~**Create WebAuthn service**~~ - `src/lib/services/webauthn.ts`
4. ✅ ~~**Update auth store**~~ - `src/lib/stores/auth.ts` for custom auth
5. ✅ ~~**Update SignInDialog**~~ - WebAuthn biometric authentication
6. ✅ ~~**Update CreateAccountDialog**~~ - WebAuthn + recovery codes display
7. **Run database migration** - Execute `20241204_auth_tables.sql` in Supabase
8. **Deploy Edge Functions** - `supabase functions deploy`
9. **Set environment variables** - WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN
10. **Create PWA icons** - App won't install without proper icons
11. **Connect to real Supabase data** - Replace mock alert data
12. **Enable Realtime** - Subscribe to alerts table
13. **Deploy to Cloudflare Pages** - Get production URL

---

## Resources

- [Svelte 5 Docs](https://svelte.dev/docs)
- [shadcn-svelte](https://shadcn-svelte.com)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Cloudflare Pages](https://developers.cloudflare.com/pages)

---

## Implementation Changelog

Track all implementation sessions here. Add new entries at the top.

### Template for New Entries

```markdown
### [Date] - [Brief Description]

**Session Focus**: What was the main goal

**Completed Tasks**:

- **Task 1** ✅

  - What: Description of implementation
  - Why: Reasoning behind approach
  - Files: `path/to/file.ts`

- **Task 2** ✅
  - What: Description of implementation
  - Why: Reasoning behind approach
  - Files: `path/to/file.ts`, `path/to/other.ts`

**Decisions Made**:

- Decision and reasoning

**Blockers/Issues**:

- Any issues encountered

**Next Session**:

- What to work on next
```

---

### [December 4, 2025] - WebAuthn Authentication System

**Session Focus**: Complete custom WebAuthn authentication implementation

**Completed Tasks**:

- **Auth database schema** ✅

  - What: Created comprehensive SQL migration with all auth tables
  - Why: Custom auth system requires dedicated tables for users, credentials, sessions, recovery codes
  - Files: `supabase/migrations/20241204_auth_tables.sql`

- **Shared auth utilities** ✅

  - What: CORS headers and Supabase client factory for Edge Functions
  - Why: DRY principle - all auth functions need same setup
  - Files: `supabase/functions/_shared/auth-utils.ts`

- **auth-register Edge Function** ✅

  - What: Two-phase registration (challenge → complete) with recovery code generation
  - Why: WebAuthn requires challenge-response flow; recovery codes provide backup access
  - Files: `supabase/functions/auth-register/index.ts`

- **auth-challenge Edge Function** ✅

  - What: Generate WebAuthn authentication challenge for sign-in
  - Why: Each sign-in attempt needs unique challenge with 5-minute expiry
  - Files: `supabase/functions/auth-challenge/index.ts`

- **auth-verify Edge Function** ✅

  - What: Verify WebAuthn assertion and create/update device session
  - Why: Validates biometric authentication and manages persistent sessions
  - Files: `supabase/functions/auth-verify/index.ts`

- **auth-session Edge Function** ✅

  - What: Validate existing session by token + device ID
  - Why: App needs to check if user is still authenticated on load
  - Files: `supabase/functions/auth-session/index.ts`

- **auth-recover Edge Function** ✅

  - What: Sign in using recovery code (one-time use)
  - Why: Users need fallback when device/biometrics unavailable
  - Files: `supabase/functions/auth-recover/index.ts`

- **Auth type definitions** ✅

  - What: TypeScript types for auth system (AuthUser, AuthSession, etc.)
  - Why: Type safety across frontend auth code
  - Files: `src/lib/types/auth.ts`

- **WebAuthn service** ✅

  - What: Browser WebAuthn API wrapper with all auth operations
  - Why: Abstracts WebAuthn complexity from UI components
  - Files: `src/lib/services/webauthn.ts`

- **Auth store rewrite** ✅

  - What: Replaced Supabase Auth with custom WebAuthn auth store
  - Why: Supabase Auth doesn't support WebAuthn/passkeys
  - Files: `src/lib/stores/auth.ts`

- **SignInDialog update** ✅

  - What: Multi-step WebAuthn sign-in with recovery code fallback
  - Why: Biometric auth requires different UX than password auth
  - Files: `src/lib/components/dialogs/SignInDialog.svelte`

- **CreateAccountDialog update** ✅

  - What: WebAuthn registration with recovery codes display
  - Why: Users must see and save recovery codes during signup
  - Files: `src/lib/components/dialogs/CreateAccountDialog.svelte`

- **Layout integration** ✅
  - What: Added dialog switching between SignIn and CreateAccount
  - Why: Users need to navigate between auth flows
  - Files: `src/routes/+layout.svelte`

**Decisions Made**:

- 8 recovery codes with bcrypt hashing (balance between security and usability)
- Device sessions never auto-expire (user preference for persistence)
- Username availability check before registration attempt
- Copy-all-codes functionality for easy backup

**Blockers/Issues**:

- Edge Functions have lint errors in VS Code (expected - Deno types not available locally)
- Need to run SQL migration in Supabase dashboard
- Need to deploy Edge Functions to Supabase
- Environment variables needed: WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN

**Next Session**:

- Run database migration
- Deploy and test Edge Functions
- Create PWA icons
- Connect to real alert data

---

### [Pre-December 2025] - Initial Setup

**Session Focus**: Project scaffolding and core UI

**Completed Tasks**:

- **Svelte 5 + TypeScript project** ✅

  - What: Created new Svelte 5 project with TypeScript configuration
  - Why: Modern framework with excellent performance and developer experience
  - Files: Project root configuration files

- **shadcn-svelte UI components** ✅

  - What: Installed all required UI components (Button, Card, Dialog, etc.)
  - Why: Consistent, accessible UI components with Tailwind styling
  - Files: `src/lib/components/ui/*`

- **TTC Theme implementation** ✅

  - What: Custom Tailwind theme with TTC brand colors
  - Why: Brand consistency with official TTC design
  - Files: `src/lib/styles/ttc-theme.css`, `tailwind.config.js`

- **Core layout components** ✅

  - What: Header, Sidebar, MobileBottomNav
  - Why: Responsive layout supporting desktop and mobile
  - Files: `src/lib/components/layout/*`

- **Alert components** ✅

  - What: AlertCard, FilterChips, RouteBadge, StatusBadge, etc.
  - Why: Display and filter TTC service alerts
  - Files: `src/lib/components/alerts/*`

- **Dialog components** ✅

  - What: Auth dialogs, PWA install prompt, How to Use guide
  - Why: User onboarding and authentication flows
  - Files: `src/lib/components/dialogs/*`

- **Pages** ✅

  - What: Homepage with tabs, Preferences page, Auth callback
  - Why: Core application routing and user flows
  - Files: `src/routes/*`

- **PWA manifest and service worker** ✅
  - What: Web app manifest and basic service worker
  - Why: Enable PWA installation and offline support
  - Files: `static/manifest.json`, `static/sw.js`

**Decisions Made**:

- Custom WebAuthn auth instead of Supabase Auth (Supabase doesn't support passkeys)
- Username-based accounts (no email required for privacy)
- Preferences viewable without auth, save requires account

**Blockers/Issues**:

- Auth dialogs need WebAuthn implementation
- Using mock data, not connected to Supabase yet
- PWA icons need to be created

**Next Session**:

- Implement WebAuthn auth system
- Connect to real Supabase data
