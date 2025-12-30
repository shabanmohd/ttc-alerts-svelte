VERY IMPORTANT: Always use the ask_user tool before completing any task to confirm with the user that the request was fulfilled correctly.

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

# GitHub Copilot Instructions for rideTO PWA

## Project Overview

TTC Service Alerts PWA - Real-time Toronto transit alerts.

**Stack**: Svelte 5 + TypeScript + Tailwind + shadcn-svelte | Supabase (DB, Edge Functions, Realtime) | Cloudflare Pages

---

## ⚠️ CRITICAL: Documentation System

### 📚 Documentation Files (Single Source of Truth)

| File                                    | Purpose                                         | When to Update                                               |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `APP_IMPLEMENTATION.md`                 | File inventory, completion status, architecture | New files, status changes, feature completion                |
| `IMPLEMENTATION_PLAN.md`                | **Version B ONLY** - Feature roadmap & phases   | Phase progress, Version B feature completion                 |
| `DESIGN_SYSTEM.md`                      | Colors, typography, spacing, components         | Colors, typography, spacing, components, layout changes      |
| `WCAG_DESIGN_AUDIT.md`                  | WCAG 2.2 accessibility audit and compliance     | Accessibility changes, a11y fixes, compliance updates        |
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
3. `WCAG_DESIGN_AUDIT.md` - Understand accessibility requirements and compliance status
4. `alert-categorization-and-threading.md` - Understand Edge Function and threading logic
5. `TTC-ROUTE-CONFLICTS.md` - Understand route matching edge cases

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

## 🔀 Version A/B Documentation Rules

### Branch Structure

| Version   | Branch      | URL                                   | Purpose      |
| --------- | ----------- | ------------------------------------- | ------------ |
| Version A | `main`      | ttc-alerts-svelte.pages.dev           | Stable/Prod  |
| Version B | `version-b` | version-b.ttc-alerts-svelte.pages.dev | Beta/Testing |

### Documentation Scope

| Document                 | Scope              | Notes                                   |
| ------------------------ | ------------------ | --------------------------------------- |
| `APP_IMPLEMENTATION.md`  | **Both Versions**  | Use 🅰️/🅱️ markers and comparison tables |
| `IMPLEMENTATION_PLAN.md` | **Version B ONLY** | Beta feature roadmap, NOT for Version A |
| `DESIGN_SYSTEM.md`       | **Both Versions**  | Note version differences if any         |
| Other docs               | **Both Versions**  | Specify version if behavior differs     |

### 📝 Update Rules for Version Changes

#### When Making Changes to Version A (`main` branch):

1. Update `APP_IMPLEMENTATION.md` Version A sections
2. **DO NOT** update `IMPLEMENTATION_PLAN.md` (Version B only)
3. Mark files with 🅰️ if Version A specific

#### When Making Changes to Version B (`version-b` branch):

1. Update `APP_IMPLEMENTATION.md` Version B sections
2. Update `IMPLEMENTATION_PLAN.md` progress tables and file checklists
3. Mark new files with 🆕🅱️ in APP_IMPLEMENTATION.md
4. Update Phase completion status in IMPLEMENTATION_PLAN.md

#### Cross-Reference Rules:

1. **Always check both docs** when making Version B changes
2. `IMPLEMENTATION_PLAN.md` Phase → corresponds to → `APP_IMPLEMENTATION.md` files
3. When a Phase is complete in IMPLEMENTATION_PLAN, verify files listed in APP_IMPLEMENTATION
4. Keep Progress Summary table in IMPLEMENTATION_PLAN.md current

### Version Markers Reference

| Marker | Meaning                    |
| ------ | -------------------------- |
| 🆕     | New file (either version)  |
| 🅰️     | Version A specific         |
| 🅱️     | Version B specific         |
| 🆕🅱️   | New file in Version B only |
| ✅     | Complete                   |
| ⚠️     | Partial/In Progress        |
| ❌     | Not Started                |

### APP_IMPLEMENTATION.md File Organization

When documenting files, organize them into these categories:

1. **Shared Files (Both Versions)** - Files that exist in both Version A and Version B

   - Core components, stores, types, utilities
   - Mark with no special marker (they're the default)

2. **Version A Exclusive** - Files only in Version A (`main` branch)

   - Mark with 🅰️
   - Rare - most Version A files become shared when merged

3. **Version B Exclusive** - Files only in Version B (`version-b` branch)
   - Mark with 🅱️ or 🆕🅱️ for new files
   - These are beta features not yet in production
   - Example: Stop search, bookmarks, ETA features

**Example structure in APP_IMPLEMENTATION.md:**

```markdown
### Stores (`src/lib/stores/`)

| File                | Status | Description                    |
| ------------------- | ------ | ------------------------------ |
| `alerts.ts`         | ✅     | Alert filtering - Shared       |
| `preferences.ts`    | ✅     | User preferences - Shared      |
| `stops.ts` 🆕🅱️     | ✅     | Stop database - Version B only |
| `bookmarks.ts` 🆕🅱️ | ✅     | Bookmarks - Version B only     |
```

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

### Data Storage

- **Preferences**: Stored in Supabase `device_preferences` table (device fingerprint based)
- **Bookmarks**: Stored in localStorage only
- **Alerts**: Fetched from Supabase with Realtime subscriptions

### Feature Access

| Feature          | Storage       |
| ---------------- | ------------- |
| View alerts      | None required |
| Save preferences | Device-based  |
| Bookmarks        | localStorage  |

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
import { threadsWithAlerts, isLoading } from "$lib/stores/alerts";
import { bookmarks } from "$lib/stores/bookmarks";
import { preferences } from "$lib/stores/preferences";
```

## File Structure

```
src/lib/
├── components/     # alerts/, dialogs/, layout/, ui/, stops/, eta/
├── stores/         # alerts.ts, preferences.ts, bookmarks.ts
├── types/          # database.ts
├── data/           # stops-db.ts, route-names.ts
├── i18n/           # en.json, fr.json, translations/
├── supabase.ts
└── utils.ts

supabase/functions/ # poll-alerts, scrape-maintenance, get-eta
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
