# GitHub Copilot Instructions for TTC Alerts PWA

## Project Overview

This is a TTC (Toronto Transit Commission) Service Alerts PWA built with:

- **Frontend**: Svelte 5 + TypeScript + Tailwind CSS + shadcn-svelte
- **Backend**: Supabase (existing database, Edge Functions, Realtime)
- **Auth**: Custom WebAuthn (Username + Biometrics + Recovery Codes)
- **Hosting**: Cloudflare Pages (planned)

## Key Files

- `MIGRATION_PLAN.md` - Implementation tracking document (keep updated!)
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/stores/` - Svelte stores for state management
- `src/lib/components/` - UI components
- `supabase/functions/` - Edge Functions

## Implementation Tracking Rules

### CRITICAL: After Every Implementation Session

**You MUST update `MIGRATION_PLAN.md`** after completing any implementation work. This is non-negotiable.

### Update Template

For each change made, add an entry to the relevant section with:

```markdown
- [x] **Task name** ✅
  - **What**: Brief description of what was implemented
  - **Why**: Reason for the implementation approach taken
  - **Files**: List of files created/modified
```

### What to Update

1. **Mark completed items** - Change `[ ]` to `[x]` and add ✅
2. **Add implementation notes** - What was done and why
3. **Update completion percentages** - Recalculate phase progress in the summary table
4. **Document decisions** - Add to "Key Design Decisions" if approach differs from plan
5. **Update "Next Steps"** - Reorder priorities based on what's done
6. **Update "File Structure"** - Mark new files with ✅, remove ❌ from created files

### Completion Percentage Calculation

```
Phase Completion = (Completed Tasks / Total Tasks) × 100
```

Round to nearest 5%. Update the "Implementation Status Summary" table.

### Status Indicators

| Symbol | Meaning                | When to Use                          |
| ------ | ---------------------- | ------------------------------------ |
| ✅     | Complete               | Task fully implemented and tested    |
| ⚠️     | Needs attention/update | Partial implementation or has issues |
| ❌     | Not started            | No work done yet                     |
| 🔄     | In progress            | Currently being worked on            |

### Example Update Entry

```markdown
### 2.8 Auth Flow ⚠️ → ✅ COMPLETE

- [x] **WebAuthn service created** ✅

  - **What**: Implemented `src/lib/services/webauthn.ts` with registration and authentication functions
  - **Why**: Needed browser-side WebAuthn API abstraction for passkey support
  - **Files**: `src/lib/services/webauthn.ts`

- [x] **SignInDialog updated for WebAuthn** ✅
  - **What**: Replaced email/password form with username + biometric authentication
  - **Why**: Custom WebAuthn auth requires different UX than Supabase Auth
  - **Files**: `src/lib/components/dialogs/SignInDialog.svelte`
```

### When to Skip Updates

Only skip updating `MIGRATION_PLAN.md` if:

- Making trivial fixes (typos, formatting)
- Answering questions without code changes
- The change is completely outside the project scope

### Quick Checklist After Implementation

Before ending any implementation session, verify:

- [ ] Relevant tasks marked `[x]` with ✅ in `MIGRATION_PLAN.md`
- [ ] Implementation notes added (What/Why/Files)
- [ ] Phase completion percentage updated in summary table
- [ ] File Structure section updated if new files created
- [ ] Next Steps reordered if priorities changed
- [ ] Any new design decisions documented

## Architecture Decisions

### Authentication System

**Decision**: Custom WebAuthn instead of Supabase Auth

**Why**:

- Supabase does NOT support WebAuthn/Passkeys natively
- User requested passwordless biometric authentication
- Recovery codes provide fallback for lost devices
- Persistent sessions that survive cache clears

**Implementation**:

- Username-based accounts (no email required)
- WebAuthn for biometric sign-in (Face ID, Touch ID, fingerprint)
- 8 one-time recovery codes generated at sign-up
- Custom session management via `device_sessions` table

### Feature Access Control

| Feature                    | Auth Required? |
| -------------------------- | -------------- |
| View All Alerts            | ❌ No          |
| View Scheduled Maintenance | ❌ No          |
| View Preferences Page      | ❌ No          |
| Save Preferences           | ✅ Yes         |
| Access "My Alerts" tab     | ✅ Yes         |

**Why**: Low friction for casual users, account only needed for personalization.

### Data Storage

| Data                 | Storage Location                         |
| -------------------- | ---------------------------------------- |
| Alerts               | Supabase `alerts` table                  |
| User accounts        | Supabase `users` table                   |
| Preferences          | Supabase `user_preferences` table        |
| Sessions             | Supabase `device_sessions` table         |
| WebAuthn credentials | Supabase `webauthn_credentials` table    |
| Recovery codes       | Supabase `recovery_codes` table (hashed) |

## Code Patterns

### Svelte 5 Runes

This project uses Svelte 5 with runes. Use:

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

### Component Props

```svelte
<script lang="ts">
  interface Props {
    title: string;
    onAction?: () => void;
  }

  let { title, onAction }: Props = $props();
</script>
```

### Store Usage

```typescript
import { alerts, fetchAlerts } from "$lib/stores/alerts";
import { isAuthenticated, user } from "$lib/stores/auth";

// In component
$effect(() => {
  if ($isAuthenticated) {
    // do something
  }
});
```

### Dialog Pattern

Dialogs use shadcn-svelte Dialog component with controlled open state:

```svelte
<script lang="ts">
  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
  <!-- content -->
</Dialog.Root>
```

## File Organization

```
src/lib/
├── components/
│   ├── alerts/      # Alert-related components
│   ├── dialogs/     # Modal dialogs
│   ├── layout/      # Header, Sidebar, Navigation
│   └── ui/          # shadcn-svelte base components
├── services/        # External service integrations (WebAuthn, etc.)
├── stores/          # Svelte stores
├── styles/          # Custom CSS
├── types/           # TypeScript types
├── supabase.ts      # Supabase client
└── utils.ts         # Utility functions
```

## Testing Checklist

Before marking a feature complete, verify:

- [ ] Works on desktop (Chrome, Firefox, Safari)
- [ ] Works on mobile (iOS Safari, Android Chrome)
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Accessible (keyboard navigation, screen reader)
- [ ] No TypeScript errors
- [ ] No console errors

## Common Tasks

### Adding a New Component

1. Create component in appropriate folder under `src/lib/components/`
2. Export from folder's `index.ts` if applicable
3. Update `MIGRATION_PLAN.md` file structure section

### Adding a New Edge Function

1. Create folder under `supabase/functions/`
2. Add `index.ts` with Deno imports
3. Deploy with `supabase functions deploy <function-name>`
4. Update `MIGRATION_PLAN.md` Edge Functions section

### Updating the Implementation Plan

After any session of work:

1. Open `MIGRATION_PLAN.md`
2. Update relevant checkboxes ([ ] → [x])
3. Update status percentages in summary table
4. Add any new decisions to "Key Design Decisions" section
5. Update "Next Steps" if priorities changed

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Build Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Deployment

Target: Cloudflare Pages

- Build command: `npm run build`
- Output directory: `build`
- Environment variables must be set in Cloudflare dashboard
