# GitHub Copilot Instructions for TTC Alerts PWA

## Project Overview

TTC Service Alerts PWA - Real-time Toronto transit alerts with biometric authentication.

**Stack**: Svelte 5 + TypeScript + Tailwind + shadcn-svelte | Supabase (DB, Edge Functions, Realtime) | Cloudflare Pages

**Auth**: Custom WebAuthn (username + biometrics + recovery codes) - NOT Supabase Auth

## ⚠️ CRITICAL: Update APP_IMPLEMENTATION.md After EVERY Change

After ANY code change, you MUST update `APP_IMPLEMENTATION.md`:

1. **Update file list** - Add new files, mark status (✅/⚠️/❌)
2. **Update status summary** - Recalculate completion %
3. **Keep it concise** - Brief descriptions, no verbose explanations
4. **Maintain context** - Enough detail for any developer to understand the project

### Documentation Standards

- **Be brief**: One-line descriptions per file
- **Be current**: Remove outdated info, update statuses immediately
- **Be complete**: Every file must be listed with its purpose
- **Be clear**: Use status icons consistently (✅ done, ⚠️ needs work, ❌ not started)

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
