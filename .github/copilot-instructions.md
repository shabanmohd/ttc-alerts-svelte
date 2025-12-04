# GitHub Copilot Instructions for TTC Alerts PWA

## Project Overview

TTC Service Alerts PWA - Real-time Toronto transit alerts with biometric authentication.

**Stack**: Svelte 5 + TypeScript + Tailwind + shadcn-svelte | Supabase (DB, Edge Functions, Realtime) | Cloudflare Pages

**Auth**: Custom WebAuthn (username + biometrics + recovery codes) - NOT Supabase Auth

---

## ⚠️ CRITICAL: Documentation Updates

### After ANY Code Change, Update These Files:

| File                                    | When to Update                                               |
| --------------------------------------- | ------------------------------------------------------------ |
| `APP_IMPLEMENTATION.md`                 | New files, status changes, feature completion                |
| `DESIGN_SYSTEM.md`                      | Colors, typography, spacing, components, layout changes      |
| `alert-categorization-and-threading.md` | Categorization logic, threading algorithm, filtering changes |

### Update Rules:

1. **Update IMMEDIATELY after changes** - Don't batch updates
2. **Update when losing context** - Read these files to restore understanding
3. **Update before ending session** - Ensure all changes are documented

### APP_IMPLEMENTATION.md

- Add new files with status (✅/⚠️/❌)
- Update completion percentages
- Keep descriptions to one line per file

### DESIGN_SYSTEM.md

- Update color tokens if colors change
- Update typography if fonts/weights/sizes change
- Update component patterns if UI components change
- Update spacing if padding/margins change

### alert-categorization-and-threading.md

- Update if `poll-alerts/index.ts` changes (categorization, threading)
- Update if `stores/alerts.ts` changes (filtering logic)
- Update if category keywords or thresholds change

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
