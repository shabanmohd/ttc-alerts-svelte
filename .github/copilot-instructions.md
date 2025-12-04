# GitHub Copilot Instructions for TTC Alerts PWA

## Project Overview

TTC Service Alerts PWA - Real-time Toronto transit alerts with biometric authentication.

**Stack**: Svelte 5 + TypeScript + Tailwind + shadcn-svelte | Supabase (DB, Edge Functions, Realtime) | Cloudflare Pages

**Auth**: Custom WebAuthn (username + biometrics + recovery codes) - NOT Supabase Auth

---

## ⚠️ CRITICAL: Documentation System

### 📚 Documentation Files (Single Source of Truth)

| File                                    | Purpose                                         | When to Update                                               |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `APP_IMPLEMENTATION.md`                 | File inventory, completion status, architecture | New files, status changes, feature completion                |
| `DESIGN_SYSTEM.md`                      | Colors, typography, spacing, components         | Colors, typography, spacing, components, layout changes      |
| `alert-categorization-and-threading.md` | Edge Function logic, threading algorithm        | Categorization logic, threading algorithm, filtering changes |
| `TTC-ROUTE-CONFLICTS.md`                | Route number conflicts (39/939, 46/996, etc.)   | Route matching bugs, new conflict patterns                   |
| `TTC-BUS-ROUTES.md`                     | Complete TTC bus route reference                | Route additions/removals                                     |
| `TTC-STREETCAR-ROUTES.md`               | Complete TTC streetcar route reference          | Route additions/removals                                     |

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

## 🔧 MCP Tools (Model Context Protocol)

### Available MCPs - USE THESE!

| MCP            | Purpose                                    | When to Use                                        |
| -------------- | ------------------------------------------ | -------------------------------------------------- |
| **Supabase**   | Database queries, Edge Function deployment | Deploy functions, run SQL, manage branches         |
| **Cloudflare** | Workers, D1, KV, R2 management             | Check worker logs, manage KV storage               |
| **Playwright** | Browser automation, testing                | UI testing, screenshots, form automation           |
| **GitKraken**  | Git operations, PR management              | Commits, branches, pull requests, issue management |
| **Fetch**      | HTTP requests, web page content retrieval  | Fetch docs, API responses, external resources      |

### When to Use MCPs

1. **Supabase MCP** - Prefer over `supabase` CLI commands:

   - `mcp_supabase_deploy_edge_function` - Deploy Edge Functions
   - `mcp_supabase_execute_sql` - Run database queries
   - `mcp_supabase_list_tables` - Inspect database schema
   - `mcp_supabase_get_logs` - Debug Edge Function issues

2. **Cloudflare MCP** - For production infrastructure:

   - Check worker observability/logs
   - Manage KV namespaces
   - Deploy and monitor workers

3. **Playwright MCP** - For browser-based tasks:

   - Take screenshots for verification
   - Test UI interactions
   - Automate form submissions

4. **GitKraken MCP** - For Git operations:

   - `mcp_gitkraken_git_add_or_commit` - Stage and commit
   - `mcp_gitkraken_git_push` - Push changes
   - Create/manage pull requests

5. **Fetch MCP** - For external web requests:
   - `mcp_fetch_fetch` - Fetch URL content as markdown
   - Retrieve external documentation (Svelte, Supabase, Tailwind docs)
   - Check API responses or external resources
   - Verify external links or references

### ⚠️ Fetch MCP Usage Guidelines

**✅ APPROPRIATE Uses:**

- Fetching official documentation (Svelte, Supabase, Tailwind, shadcn)
- Checking TTC service pages or transit APIs
- Retrieving specific technical references when needed
- Verifying external URLs mentioned in code/docs

**❌ DO NOT Use For:**

- General web browsing or research that isn't task-specific
- Fetching large pages repeatedly (cache mentally, don't re-fetch)
- Scraping content that could be found in project docs first
- Fetching user-provided URLs without clear purpose
- Downloading files or binary content

**Best Practices:**

1. **Check project docs first** - Most answers are in `APP_IMPLEMENTATION.md`, `DESIGN_SYSTEM.md`, etc.
2. **Be specific** - Fetch only when you need exact syntax/API details not in context
3. **Fetch once** - Don't repeatedly fetch the same documentation
4. **Prefer official sources** - Use official docs over random blogs/tutorials
5. **Keep requests minimal** - Use `max_length` parameter to limit response size when possible

### MCP vs Terminal

| Task                  | Use MCP                                | Use Terminal                   |
| --------------------- | -------------------------------------- | ------------------------------ |
| Deploy Edge Function  | ✅ `mcp_supabase_deploy_edge_function` | ❌ `supabase functions deploy` |
| Run SQL query         | ✅ `mcp_supabase_execute_sql`          | ❌ `psql` commands             |
| Git commit/push       | Either works                           | Either works                   |
| npm install/build     | ❌                                     | ✅ `run_in_terminal`           |
| Check Cloudflare logs | ✅ Cloudflare observability MCP        | ❌                             |
| Fetch external docs   | ✅ `mcp_fetch_fetch`                   | ❌ `curl` commands             |

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
