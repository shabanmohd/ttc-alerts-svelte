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
| Phase 1: Supabase Backend  | 🔄 In Progress | 30%        |
| Phase 2: Frontend (Svelte) | 🔄 In Progress | 85%        |
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

- [ ] **`auth-register`** - Create user with WebAuthn credential + recovery codes
- [ ] **`auth-challenge`** - Generate WebAuthn challenge for sign-in
- [ ] **`auth-verify`** - Verify WebAuthn assertion and create session
- [ ] **`auth-session`** - Validate existing session
- [ ] **`auth-recover`** - Sign in with recovery code
- [ ] **`auth-add-credential`** - Add new device to existing account

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

### 2.6 Dialog Components ⚠️ NEEDS UPDATE

- [x] **`SignInDialog.svelte`** - ⚠️ Needs update for WebAuthn
- [x] **`CreateAccountDialog.svelte`** - ⚠️ Needs update for WebAuthn + recovery codes
- [x] **`AuthRequiredDialog.svelte`** - Prompt for features requiring auth ✅
- [x] **`HowToUseDialog.svelte`** - User guide ✅
- [x] **`InstallPWADialog.svelte`** - PWA install prompt ✅

**Auth dialogs need to be updated to implement:**

- Username input
- WebAuthn biometric registration/authentication
- Recovery code display (on sign up)
- Recovery code input (for account recovery)

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

### 2.8 Auth Flow ⚠️ NEEDS IMPLEMENTATION

Custom WebAuthn authentication system:

1. **Preferences visible to everyone** - Users can configure without signing in
2. **Save requires account** - Clicking "Save" prompts AuthRequiredDialog
3. **"My Alerts" requires account** - Clicking tab prompts AuthRequiredDialog
4. **Sign Up flow:**
   - Enter username
   - Register WebAuthn credential (Face ID/Touch ID/fingerprint)
   - Display 8 recovery codes (user must save)
   - Create persistent session
5. **Sign In flow:**
   - Enter username
   - Authenticate with WebAuthn biometrics
   - Create/update persistent session
6. **Recovery flow:**
   - Enter username + recovery code
   - Create session
   - Prompt to add new device credential
7. **Sessions never auto-expire** - Users stay logged in

#### Files to Create/Update:

- [ ] `src/lib/services/webauthn.ts` - WebAuthn utilities
- [ ] `src/lib/stores/auth.ts` - Update for custom auth
- [ ] `src/lib/components/dialogs/SignInDialog.svelte` - WebAuthn sign in
- [ ] `src/lib/components/dialogs/CreateAccountDialog.svelte` - WebAuthn + recovery codes
- [ ] `supabase/functions/auth-register/index.ts`
- [ ] `supabase/functions/auth-challenge/index.ts`
- [ ] `supabase/functions/auth-verify/index.ts`
- [ ] `supabase/functions/auth-session/index.ts`
- [ ] `supabase/functions/auth-recover/index.ts`

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
│   │   │   ├── CreateAccountDialog.svelte ⚠️ (needs WebAuthn update)
│   │   │   ├── HowToUseDialog.svelte ✅
│   │   │   ├── InstallPWADialog.svelte ✅
│   │   │   ├── SignInDialog.svelte ⚠️ (needs WebAuthn update)
│   │   │   └── index.ts ✅
│   │   ├── layout/
│   │   │   ├── Header.svelte ✅
│   │   │   ├── MobileBottomNav.svelte ✅
│   │   │   └── Sidebar.svelte ✅
│   │   └── ui/ (shadcn-svelte components) ✅
│   ├── services/
│   │   └── webauthn.ts ❌ (to be created)
│   ├── stores/
│   │   ├── alerts.ts ✅
│   │   ├── auth.ts ⚠️ (needs update for custom auth)
│   │   └── preferences.ts ✅
│   ├── types/
│   │   ├── auth.ts ❌ (to be created)
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
└── functions/
    ├── poll-alerts/ ✅ (exists)
    ├── scrape-maintenance/ ✅ (exists)
    ├── auth-register/ ❌ (to be created)
    ├── auth-challenge/ ❌ (to be created)
    ├── auth-verify/ ❌ (to be created)
    ├── auth-session/ ❌ (to be created)
    └── auth-recover/ ❌ (to be created)
```

---

## Next Steps (Priority Order)

1. **Create auth database tables** - users, webauthn_credentials, recovery_codes, device_sessions, user_preferences
2. **Implement auth Edge Functions** - auth-register, auth-challenge, auth-verify, auth-session, auth-recover
3. **Create WebAuthn service** - `src/lib/services/webauthn.ts`
4. **Update auth store** - `src/lib/stores/auth.ts` for custom auth
5. **Update SignInDialog** - WebAuthn biometric authentication
6. **Update CreateAccountDialog** - WebAuthn + recovery codes display
7. **Create PWA icons** - App won't install without proper icons
8. **Connect to real Supabase data** - Replace mock alert data
9. **Enable Realtime** - Subscribe to alerts table
10. **Deploy to Cloudflare Pages** - Get production URL

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
