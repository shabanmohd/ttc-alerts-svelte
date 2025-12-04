# GitHub Copilot Instructions for TTC Alerts PWA

## Project Overview

TTC Service Alerts PWA - Real-time Toronto transit alerts with biometric authentication.

**Stack**: Svelte 5 + TypeScript + Tailwind + shadcn-svelte | Supabase (DB, Edge Functions, Realtime) | Cloudflare Pages

**Auth**: Custom WebAuthn (username + biometrics + recovery codes) - NOT Supabase Auth

---

## ⚠️ CRITICAL: Documentation System

### 📚 Documentation Files (Single Source of Truth)

| File                                    | Purpose                                          | When to Update                                               |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `APP_IMPLEMENTATION.md`                 | File inventory, completion status, architecture  | New files, status changes, feature completion                |
| `DESIGN_SYSTEM.md`                      | Colors, typography, spacing, components          | Colors, typography, spacing, components, layout changes      |
| `alert-categorization-and-threading.md` | Edge Function logic, threading algorithm         | Categorization logic, threading algorithm, filtering changes |
| `TTC-ROUTE-CONFLICTS.md`                | Route number conflicts (39/939, 46/996, etc.)    | Route matching bugs, new conflict patterns                   |
| `TTC-BUS-ROUTES.md`                     | Complete TTC bus route reference                 | Route additions/removals                                     |
| `TTC-STREETCAR-ROUTES.md`               | Complete TTC streetcar route reference           | Route additions/removals                                     |

### 🔄 Update Rules

1. **Update IMMEDIATELY after changes** - Don't batch updates
2. **Cross-reference related docs** - Changes often affect multiple files
3. **Update before ending session** - Ensure all changes are documented

### 🆘 WHEN STUCK OR LOST CONTEXT

**READ THESE FILES FIRST:**

1. `APP_IMPLEMENTATION.md` - Understand current project state and file locations
2. `DESIGN_SYSTEM.md` - Understand UI patterns and styling conventions
3. `alert-categorization-and-threading.md` - Understand Edge Function and threading logic
4. `TTC-ROUTE-CONFLICTS.md` - Understand route matching edge cases

**These docs are your context restoration system. Use them before asking questions or making assumptions.**

### 📝 Documentation Update Checklist

#### APP_IMPLEMENTATION.md
- Add new files with status (✅/⚠️/❌)
- Update completion percentages
- Keep descriptions to one line per file

#### DESIGN_SYSTEM.md
- Update color tokens if colors change
- Update typography if fonts/weights/sizes change
- Update component patterns if UI components change
- Update spacing if padding/margins change

#### alert-categorization-and-threading.md
- Update if `poll-alerts/index.ts` changes (categorization, threading)
- Update if `stores/alerts.ts` changes (filtering logic)
- Update if category keywords or thresholds change
- Update threading algorithm when route matching logic changes

#### TTC-ROUTE-CONFLICTS.md
- Update when fixing route threading bugs
- Add new test cases for discovered edge cases
- Update code examples to match actual implementation

---

## Architecture

### Auth System (Custom WebAuthn)

- Username-based (no email) → WebAuthn biometrics → 8 recovery codes
- Tables: `users`, `webauthn_credentials`, `recovery_codes`, `device_sessions`

### Feature Access

| Feature          | Auth Required |
| ---------------- | ------------- |
| View alerts      | No            |
| Save preferences | Yes           |
| "My Alerts" tab  | Yes           |

## Code Patterns

### Svelte 5 Runes

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => { /* reactive side effect */ });
</script>
```

### Props

```svelte
<script lang="ts">
  let { title, onAction }: { title: string; onAction?: () => void } = $props();
</script>
```

### Stores

```typescript
import { isAuthenticated, user } from "$lib/stores/auth";
```

## File Structure

```
src/lib/
├── components/     # alerts/, dialogs/, layout/, ui/
├── services/       # webauthn.ts
├── stores/         # alerts.ts, auth.ts, preferences.ts
├── types/          # auth.ts, database.ts
├── supabase.ts
└── utils.ts

supabase/functions/ # auth-register, auth-challenge, auth-verify, auth-session, auth-recover
```

## Commands

```bash
npm run dev      # Dev server
npm run build    # Production build
```

## Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```
