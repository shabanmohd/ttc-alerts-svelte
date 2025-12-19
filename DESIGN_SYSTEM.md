# TTC Alerts Design System

> **Single Source of Truth** for UI consistency, scalability, and efficiency.  
> Built on **shadcn-svelte** + **Tailwind CSS** + **Lexend** typography.

---

## Quick Reference

| Category          | File                           | Purpose                                         |
| ----------------- | ------------------------------ | ----------------------------------------------- |
| **Design Tokens** | `src/routes/layout.css`        | CSS custom properties (colors, spacing, radius) |
| **TTC Theme**     | `src/lib/styles/ttc-theme.css` | Route colors, status badges, brand overrides    |
| **Components**    | `src/lib/components/ui/`       | shadcn-svelte components                        |
| **Config**        | `components.json`              | shadcn-svelte paths and aliases                 |

---

## 1. Colors

### Core Palette (CSS Custom Properties)

```css
/* Light Mode */
:root {
  --background: 0 0% 100%; /* White */
  --foreground: 240 10% 3.9%; /* Near black */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%; /* Dark slate */
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%; /* Light gray */
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 40%; /* WCAG AA: 4.5:1 */
  --accent: 240 4.8% 95.9%;
  --destructive: 0 72% 45%; /* Red */
  --border: 240 5.9% 85%;
  --input: 240 5.9% 85%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

/* Dark Mode */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --secondary: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 71%;
  --border: 240 3.7% 20%;
}
```

### Status Colors (WCAG 2.2 AA Compliant)

| Status               | Light BG      | Light Text    | Dark Text     |
| -------------------- | ------------- | ------------- | ------------- |
| **Error/Disruption** | `0 70% 96%`   | `0 72% 30%`   | `0 91% 75%`   |
| **Warning/Delay**    | `38 80% 94%`  | `28 90% 25%`  | `43 96% 70%`  |
| **Info/Planned**     | `214 80% 96%` | `224 76% 30%` | `213 94% 75%` |
| **Success**          | `142 60% 94%` | `142 72% 22%` | `142 69% 68%` |
| **Teal/Resumed**     | `168 76% 90%` | `172 66% 22%` | `168 71% 70%` |
| **Orange/Detour**    | `24 80% 94%`  | `24 90% 28%`  | `30 95% 70%`  |

### TTC Brand Colors

```css
/* Subway Lines */
--ttc-line-1: #ffc524; /* Yellow - Yonge-University */
--ttc-line-2: #00853f; /* Green - Bloor-Danforth */
--ttc-line-4: #a12f7d; /* Purple - Sheppard */

/* Bus & Streetcar */
--ttc-red: #c8102e; /* Regular routes */
--ttc-express: #00853f; /* 900-series */
--ttc-night: #003da5; /* 300-series border */
--ttc-community: #6b7280; /* 400-series border */
```

---

## 2. Typography

### Font Stack

```css
font-family: "Lexend", system-ui, -apple-system, sans-serif;
```

**Lexend** is a dyslexic-friendly variable font optimized for reading.

### Weight Hierarchy

| Weight       | Value | Usage                                          |
| ------------ | ----- | ---------------------------------------------- |
| **Bold**     | 700   | Route numbers, brand name, count badges        |
| **Semibold** | 600   | Section headings, dates, card titles, badges   |
| **Medium**   | 500   | Nav items, tabs, buttons, links, station names |
| **Regular**  | 400   | Body text, descriptions, timestamps            |
| **Light**    | 300   | Reserved (not currently used)                  |

### Size Scale

| Size        | Pixels  | Usage                                       |
| ----------- | ------- | ------------------------------------------- |
| `text-xs`   | 10-11px | Tab counts, closure badges, smallest labels |
| `text-sm`   | 12-13px | Timestamps, status badges, secondary text   |
| `text-base` | 15px    | Body text, alert descriptions               |
| `text-lg`   | 17px    | Card titles, section headings               |
| `text-xl`   | 18-19px | Page headings (rare in mobile-first UI)     |

### Letter Spacing

| Spacing | Value         | Usage                    |
| ------- | ------------- | ------------------------ |
| Tight   | `-0.02em`     | Headings, brand          |
| Normal  | `-0.01em`     | Body, nav, buttons       |
| Wide    | `0.02-0.04em` | Uppercase badges, labels |

---

## 3. Spacing

### Tailwind Scale (Default)

| Class     | Size | Usage                           |
| --------- | ---- | ------------------------------- |
| `gap-0.5` | 2px  | Icon-text gap in compact badges |
| `gap-1`   | 4px  | Tight groupings                 |
| `gap-2`   | 8px  | Badge groups, inline elements   |
| `gap-3`   | 12px | Card internal sections          |
| `gap-4`   | 16px | Between cards, major sections   |
| `gap-6`   | 24px | Page sections                   |

### Padding Patterns

| Pattern        | Value                               | Usage               |
| -------------- | ----------------------------------- | ------------------- |
| Card padding   | `1rem / 1.25rem`                    | Mobile / Desktop    |
| Button padding | `0.5rem 1rem`                       | Standard buttons    |
| Badge padding  | `0.125rem 0.5rem`                   | Status badges       |
| Route badge    | `6px 12px`                          | Route number badges |
| Content area   | `0.875rem` mobile, `1.5rem` desktop | Main content        |

### Layout Breakpoints

| Breakpoint | Width            | Changes                        |
| ---------- | ---------------- | ------------------------------ |
| Mobile     | `< 640px`        | Bottom nav, compact padding    |
| Tablet     | `640px - 1023px` | Increased padding              |
| Desktop    | `≥ 1024px`       | Sidebar visible, no bottom nav |

---

## 4. Border Radius

```css
--radius: 0.5rem; /* 8px base */
--radius-sm: calc(var(--radius) - 4px); /* 4px */
--radius-md: calc(var(--radius) - 2px); /* 6px */
--radius-lg: var(--radius); /* 8px */
--radius-xl: calc(var(--radius) + 4px); /* 12px */
```

| Element      | Radius                   |
| ------------ | ------------------------ |
| Cards        | `var(--radius)` (8px)    |
| Buttons      | `var(--radius-md)` (6px) |
| Inputs       | `var(--radius-md)` (6px) |
| Badges       | `9999px` (pill)          |
| Route badges | `6px`                    |

---

## 5. Shadows

```css
/* Card hover */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Focus ring */
box-shadow: 0 0 0 3px hsl(var(--ring) / 0.15);

/* Selection ring (route badges) */
box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px [color];
```

---

## 6. Components

### Buttons

```svelte
<!-- Primary -->
<Button>Primary Action</Button>

<!-- Secondary -->
<Button variant="secondary">Secondary</Button>

<!-- Ghost (icon buttons) -->
<Button variant="ghost" size="icon">
  <Icon />
</Button>

<!-- Destructive -->
<Button variant="destructive">Delete</Button>
```

**Sizes:**

- Default: `h-10 px-4`
- Small: `h-9 px-3`
- Icon: `h-10 w-10`

### Dialogs

Dialogs are used for confirmation prompts, forms, and informational modals. Built with shadcn-svelte `Dialog` component.

#### Mobile Bottom Sheet Pattern

Form dialogs use a bottom sheet on mobile for better UX, transforming to centered modals on desktop.

```svelte
<Dialog.Content
  class="max-w-md bg-white dark:bg-zinc-900
         !fixed !inset-x-0 !bottom-0 !top-auto !start-0 !translate-x-0 !translate-y-0
         !rounded-t-2xl !rounded-b-none !max-h-[85vh] overflow-y-auto !max-w-full
         sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!start-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2
         sm:!rounded-lg sm:!max-w-md
         [&_[data-dialog-close]]:size-6 [&_[data-dialog-close]_svg]:size-5"
>
```

| Property   | Light Mode     | Dark Mode       |
| ---------- | -------------- | --------------- |
| Background | `bg-white`     | `bg-zinc-900`   |
| Text       | Default (dark) | Default (light) |

| Breakpoint | Behavior                                         |
| ---------- | ------------------------------------------------ |
| Mobile     | Fixed bottom, full width, rounded top corners    |
| Desktop    | Centered modal, max-width 28rem, rounded corners |

#### Form Dialog Header Pattern

Headers use left-aligned layout with icon top-aligned to text.

```svelte
<Dialog.Header class="text-left">
  <div class="flex items-start gap-3">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
      <Flag class="h-5 w-5 text-destructive" />
    </div>
    <div>
      <Dialog.Title class="text-lg font-semibold">Title</Dialog.Title>
      <Dialog.Description class="text-sm text-left opacity-50">
        Description text with reduced opacity.
      </Dialog.Description>
    </div>
  </div>
</Dialog.Header>
```

| Element     | Style                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Container   | `flex items-start gap-3` (icon top-aligned)                           |
| Icon circle | `h-10 w-10 rounded-full bg-{color}/10 mt-0.5`                         |
| Icon        | `h-5 w-5 text-{color}`                                                |
| Title       | `text-lg font-semibold`                                               |
| Description | `text-sm text-left opacity-50` (50% opacity for visual hierarchy)     |
| Close btn   | `size-6` container with `size-5` icon (via `[&_[data-dialog-close]]`) |

#### Text Hierarchy in Dialogs

Use opacity classes to establish visual hierarchy:

| Element        | Style                      | Example Use                       |
| -------------- | -------------------------- | --------------------------------- |
| Primary text   | No opacity class (100%)    | Labels, titles                    |
| Secondary text | `opacity-50`               | Descriptions, hints, "(optional)" |
| Tertiary text  | `text-muted-foreground/60` | Character counts                  |
| Error text     | `text-destructive`         | Validation errors                 |

```svelte
<!-- Label with optional badge -->
<Label>
  Email
  <span class="opacity-50 text-xs">(optional)</span>
</Label>

<!-- Helper text below input -->
<p class="text-xs opacity-50">We'll only use this to respond to your feedback.</p>

<!-- Character count -->
<p class="text-xs text-muted-foreground/60 text-right">{title.length}/100</p>
```

#### Confirmation Dialog (Centered)

Simple confirmation dialogs use centered layout.

```svelte
<Dialog.Content class="sm:max-w-md">
  <Dialog.Header>
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
      <Trash2 class="h-7 w-7 text-destructive" />
    </div>
    <Dialog.Title class="text-center text-lg font-semibold">Confirm Action?</Dialog.Title>
    <Dialog.Description class="text-center text-sm text-muted-foreground">
      Are you sure? This cannot be undone.
    </Dialog.Description>
  </Dialog.Header>
  <Dialog.Footer class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center">
    <Button variant="outline" class="w-full sm:w-auto">Cancel</Button>
    <Button variant="destructive" class="w-full sm:w-auto">Confirm</Button>
  </Dialog.Footer>
</Dialog.Content>
```

#### Dialog Types by Icon Color

| Type        | Icon Container      | Icon Color         | Example Use          |
| ----------- | ------------------- | ------------------ | -------------------- |
| **Danger**  | `bg-destructive/10` | `text-destructive` | Delete, Report Issue |
| **Info**    | `bg-blue-500/10`    | `text-blue-500`    | How to use, About    |
| **Warning** | `bg-amber-500/10`   | `text-amber-500`   | Feature Request      |
| **Success** | `bg-green-500/10`   | `text-green-500`   | Confirmation success |

#### Form Dialog Footer

```svelte
<Dialog.Footer class="flex flex-col gap-3 sm:flex-row">
  <Button variant="outline" class="w-full sm:w-auto" disabled={isLoading}>
    Cancel
  </Button>
  <Button
    class="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
    disabled={!isValid || isLoading}
  >
    {#if isLoading}<Loader2 class="h-4 w-4 mr-2 animate-spin" />{/if}
    Submit
  </Button>
</Dialog.Footer>
```

| Property         | Light Mode                                       | Dark Mode                                        |
| ---------------- | ------------------------------------------------ | ------------------------------------------------ |
| Cancel Button    | `variant="outline"` - border with transparent bg | `variant="outline"` - border with transparent bg |
| Submit Button BG | `bg-zinc-900` (dark)                             | `bg-white` (light)                               |
| Submit Text      | `text-white`                                     | `text-zinc-900`                                  |
| Hover State      | `hover:bg-zinc-800`                              | `dark:hover:bg-zinc-100`                         |

**Important**: The high-contrast Submit button styling ensures the primary action is visually distinct from the Cancel button in both light and dark modes. This inverted color scheme provides maximum contrast and clear visual hierarchy.

| Breakpoint | Button Layout                |
| ---------- | ---------------------------- |
| Mobile     | Stack vertically, full width |
| Desktop    | Horizontal row, auto width   |

### Tab Indicators

Active tabs use a 2px bottom line indicator to show the current selection.

#### Usage Locations

| Component                  | Tabs                                     |
| -------------------------- | ---------------------------------------- |
| `HomeSubTabs.svelte`       | My Stops / My Routes                     |
| `alerts/+page.svelte`      | Active / Resolved / Scheduled            |
| `MaintenanceWidget.svelte` | Starting Soon / This Weekend / Coming Up |
| `ClosuresView.svelte`      | Starting Soon / This Weekend / Coming Up |

#### CSS Pattern

```css
.tab {
  position: relative;
}

.tab.active:after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2rem;
  height: 2px;
  background: hsl(var(--primary));
  border-radius: 1px;
}
```

### Input Fields

All input fields use a muted gray background for better contrast and consistency.

```svelte
<Input
  type="text"
  placeholder="Search..."
  class="pl-9" <!-- If using search icon -->
/>
```

**Styling (via inline styles for Tailwind 4 compatibility):**

```css
background-color: hsl(var(--muted));
border-color: hsl(var(--border));
```

**Note:** Due to Tailwind 4 color handling differences, the Input component uses inline `style` attributes rather than utility classes for background and border colors.

#### Placeholder Text Styling

Placeholders use a consistent mid-gray color (`zinc-500` / `#71717a`) across all inputs and textareas:

```css
/* Global placeholder styling in ttc-theme.css and layout.css */
input::placeholder,
textarea::placeholder {
  color: #71717a; /* zinc-500 */
  opacity: 1;
}
```

```svelte
<!-- Input and Textarea components include these Tailwind classes -->
<Input class="placeholder:text-zinc-500 dark:placeholder:text-zinc-500" />
<Textarea class="placeholder:text-zinc-500 dark:placeholder:text-zinc-500" />
```

#### Input Validation States

```svelte
<!-- Error state with red border -->
<Input
  class={email.trim() && !isEmailValid
    ? "border-destructive focus-visible:ring-destructive"
    : ""}
/>

<!-- Error message below input -->
{#if email.trim() && !isEmailValid}
  <p class="text-xs text-destructive">Invalid email format</p>
{/if}
```

### Route Badges

```svelte
<RouteBadge route="Line 1" />      <!-- Yellow -->
<RouteBadge route="501" />          <!-- Red (streetcar) -->
<RouteBadge route="52" />           <!-- Red (bus) -->
<RouteBadge route="952" />          <!-- Green (express) -->
<RouteBadge route="352" />          <!-- White/blue border (night) -->
```

**CSS Classes:**

- `.route-line-1` - Yellow subway
- `.route-line-2` - Green subway
- `.route-line-4` - Purple subway
- `.route-bus`, `.route-streetcar` - TTC Red
- `.route-express` - TTC Green
- `.route-night` - White + blue border
- `.route-limited` - White + red border
- `.route-community` - White + gray border

### Accessibility Badge

Used for elevator/escalator outage alerts. Displays a wheelchair icon instead of a route number.

```svelte
<AccessibilityBadge size="lg" />
```

**Styling:**

- Background: `hsl(217 91% 50%)` - TTC accessibility blue
- Icon: White wheelchair symbol
- Size variants: `sm`, `default`, `lg`

### Station Badge

Used alongside AccessibilityBadge to show the station name (e.g., "DUPONT", "DAVISVILLE").

```svelte
<span class="station-badge">Dupont</span>
```

**CSS:**

```css
.station-badge {
  background-color: hsl(217 91% 95%); /* Light blue bg */
  color: hsl(217 91% 40%); /* Dark blue text */
}

.dark .station-badge {
  background-color: hsl(217 50% 25% / 0.5);
  color: hsl(217 91% 75%);
}
```

### Status Badges

```svelte
<StatusBadge category="SERVICE_RESUMED" />
<StatusBadge category="SERVICE_DISRUPTION" />
<StatusBadge category="DELAY" />
<StatusBadge category="DIVERSION" />
<StatusBadge category="PLANNED_CLOSURE" />
```

**CSS Classes:**

- `.status-badge-resumed` - Teal
- `.status-badge-disruption` - Red
- `.status-badge-delay` - Amber
- `.status-badge-detour` - Orange
- `.status-badge-planned` - Blue

### Category Filter Tabs

Three-tab severity filter (ALL tab removed). WCAG AA compliant colors.

```svelte
<CategoryFilter selected="MAJOR" onSelect={handleSelect} counts={counts} />
```

**Color Tokens (Light/Dark Mode):**

| Category          | Light Mode (4.5:1+ contrast) | Dark Mode          |
| ----------------- | ---------------------------- | ------------------ |
| **Major**         | `hsl(0 72% 45%)`             | `hsl(0 85% 65%)`   |
| **Minor**         | `hsl(38 85% 35%)`            | `hsl(38 95% 60%)`  |
| **Accessibility** | `hsl(217 85% 42%)`           | `hsl(217 95% 70%)` |

**Icons:**

- Major: `AlertOctagon` (stop sign shape)
- Minor: `Clock`
- Accessibility: `Accessibility` (wheelchair)

### Toast Notifications (Sonner)

Toast notifications use svelte-sonner with dark solid backgrounds for high contrast.

**Configuration** (`src/lib/components/ui/sonner/sonner.svelte`):

```svelte
<Sonner
  position="bottom-center"
  duration={3000}
  richColors={false}
  closeButton={false}
/>
```

**Color Scheme (WCAG AA Compliant - High contrast text on colored backgrounds):**

| Toast Type  | Light Mode BG      | Dark Mode BG       | Text Color  |
| ----------- | ------------------ | ------------------ | ----------- |
| **Success** | `hsl(142 72% 29%)` | `hsl(142 55% 22%)` | White       |
| **Info**    | `hsl(217 70% 35%)` | `hsl(217 60% 25%)` | White       |
| **Warning** | `hsl(38 92% 40%)`  | `hsl(38 75% 32%)`  | Black/White |
| **Error**   | `hsl(0 72% 40%)`   | `hsl(0 65% 30%)`   | White       |

**Key Classes:**

- Title: `text-foreground font-medium`
- Description: `text-foreground/90 text-sm` (90% opacity for slight hierarchy)

**Usage Guidelines:**

| Action             | Toast Type | Example                                     |
| ------------------ | ---------- | ------------------------------------------- |
| Item added/saved   | `success`  | "Stop added" with stop name as description  |
| Item removed       | `success`  | "Route removed" with route as description   |
| Already exists     | `info`     | "Stop already saved"                        |
| Max limit reached  | `error`    | "Maximum 20 stops reached"                  |
| Permission granted | `success`  | "Location access enabled"                   |
| Permission denied  | `error`    | "Location access denied"                    |
| User guidance      | `info`     | "To change location access..." (5s timeout) |
| Copy success       | `success`  | "All recovery codes copied!"                |
| Copy failed        | `error`    | "Failed to copy codes"                      |

**Pattern:**

```typescript
// Success with description
toast.success($_("toasts.stopAdded"), {
  description: stop.name,
});

// Info with longer duration for instructions
toast.info($_("toasts.locationChangeInBrowser"), {
  description: $_("toasts.locationChangeInBrowserDesc"),
  duration: 5000,
});

// Error (no description needed)
toast.error($_("toasts.locationDenied"));
```

**i18n:** All toast titles and descriptions should use translation keys from `toasts.*` namespace.

**Mobile Positioning:**
Toasts appear above the mobile bottom nav:

```css
@media (max-width: 767px) {
  [data-sonner-toaster] {
    bottom: calc(64px + 16px + env(safe-area-inset-bottom)) !important;
  }
}
```

### Direction Badges

Direction badges indicate the travel direction of a stop (extracted from GTFS trip headsigns). Used in StopSearch dropdown and ETACard headers.

```svelte
<!-- Tailwind classes for direction colors -->
{@const dirColor = direction === 'Eastbound' ? 'bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40'
  : direction === 'Westbound' ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40'
  : direction === 'Northbound' ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40'
  : 'bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40'}

<span class="text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase {dirColor}">
  {direction}
</span>
```

**Color Mapping (WCAG AA Compliant):**

| Direction      | Background       | Light Text    | Dark Text     | Border           |
| -------------- | ---------------- | ------------- | ------------- | ---------------- |
| **Eastbound**  | `sky-600/20`     | `sky-700`     | `sky-400`     | `sky-600/40`     |
| **Westbound**  | `amber-600/20`   | `amber-700`   | `amber-400`   | `amber-600/40`   |
| **Northbound** | `emerald-600/20` | `emerald-700` | `emerald-400` | `emerald-600/40` |
| **Southbound** | `rose-600/20`    | `rose-700`    | `rose-400`    | `rose-600/40`    |

**Usage Locations:**

- `StopSearch.svelte` - Search dropdown results
- `ETACard.svelte` - Saved stop card headers

### Alert Cards

```svelte
<div class="alert-card alert-border-high">
  <div class="alert-card-content">
    <div class="alert-card-header">
      <div class="alert-card-badges">
        <RouteBadge />
        <StatusBadge />
      </div>
      <span class="alert-card-timestamp">5m ago</span>
    </div>
    <p class="alert-card-description">Alert text...</p>
  </div>
</div>
```

**Border Classes:**

- `.alert-border-high` - Red (disruption)
- `.alert-border-medium` - Amber (delay)
- `.alert-border-info` - Blue (planned)
- `.alert-border-resumed` - Teal (resolved)

### RSZ (Reduced Speed Zone) Alert Cards

**Component:** `RSZAlertCard.svelte`

Displays TTC API Reduced Speed Zone alerts grouped by subway line in an accordion layout.

#### Layout Structure

```
┌────────────────────────────────────────────────────────┐
│ [4px colored top border - line color]                  │
│  ┌──────┐  Line 1                     2 zones    ▼    │
│  │  1   │  REDUCED SPEED ZONE                          │
│  └──────┘                                              │
├────────────────────────────────────────────────────────┤
│  Direction          Stations                           │
│  ┌───────────────┐                                     │
│  │  NORTHBOUND   │  St Andrew → Union                  │
│  └───────────────┘                                     │
│  ┌───────────────┐                                     │
│  │  SOUTHBOUND   │  Queen → King                       │
│  └───────────────┘                                     │
└────────────────────────────────────────────────────────┘
```

#### Key Styles

| Class                 | Purpose                 | Key Properties                                    |
| --------------------- | ----------------------- | ------------------------------------------------- |
| `.rsz-accordion-card` | Card container          | `border-radius: var(--radius); border: 2px solid` |
| `.rsz-top-border`     | Colored line indicator  | `height: 4px; background: line-color`             |
| `.rsz-line-badge`     | Line number badge       | `min-width: 2rem; height: 2rem; font-weight: 700` |
| `.rsz-line-info`      | Line name + label stack | `flex-direction: column; gap: 0.125rem`           |
| `.rsz-label`          | "REDUCED SPEED ZONE"    | `font-size: 0.6875rem; color: hsl(45 93% 40%)`    |
| `.rsz-zone-count`     | "2 zones" count         | `font-size: 0.75rem; text-transform: uppercase`   |

#### Direction Badge Colors

| Direction  | Background       | Text Color    |
| ---------- | ---------------- | ------------- |
| Northbound | `emerald-600/20` | `emerald-700` |
| Southbound | `rose-600/20`    | `rose-700`    |
| Eastbound  | `sky-600/20`     | `sky-700`     |
| Westbound  | `amber-600/20`   | `amber-700`   |

#### i18n Keys

| Key                            | EN                                                                         |
| ------------------------------ | -------------------------------------------------------------------------- |
| `alerts.reducedSpeedZone`      | "Reduced Speed Zone"                                                       |
| `alerts.reducedSpeedZones`     | "Reduced Speed Zones"                                                      |
| `alerts.reducedSpeedZonesDesc` | "Trains are running slower than usual in these sections due to track work" |

### Maintenance Widget Cards

The Maintenance Widget displays planned subway closures. Each maintenance item uses a **specific grid layout** that must be preserved.

#### Header (Responsive)

**Mobile (< 640px):**

- Title: "Subway Closures"
- Tab labels: "Soon", "Weekend", "Coming"

**Desktop (≥ 640px):**

- Title: "Planned Subway Closures"
- Tab labels: "Starting Soon", "This Weekend", "Coming Up"

#### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │ Stations Text           │  │ Date (top-right) │  │
│  │ (font-size: 1rem, 600)  │  │ Time (below)     │  │
│  ├─────────────────────────┤  └──────────────────┘  │
│  │ [8px gap]               │                        │
│  ├─────────────────────────┤                        │
│  │ [Line Badge] [Badge]... │                        │
│  └─────────────────────────┘                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ [Closure Badge]              [Details Link]  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### CSS Classes & Spacing

| Class                          | Purpose               | Key Properties                           |
| ------------------------------ | --------------------- | ---------------------------------------- |
| `.maintenance-item`            | Card container        | `padding: 0.75rem (12px)`                |
| `.maintenance-item-grid`       | 2-column grid         | `grid-template-columns: 1fr auto`        |
| `.maintenance-item-left`       | Left column (stacked) | `flex-direction: column; gap: 8px`       |
| `.maintenance-item-stations`   | Station names         | `font-size: 1rem; font-weight: 600`      |
| `.maintenance-item-badges`     | Route badges row      | `display: flex; gap: 0.25rem`            |
| `.maintenance-item-datetime`   | Right column          | `align-items: flex-end`                  |
| `.maintenance-item-date`       | Date text             | `font-size: 1rem; font-weight: 600`      |
| `.maintenance-item-start-time` | Time text             | `font-size: 0.8125rem; font-weight: 500` |
| `.maintenance-item-footer`     | Bottom row            | `margin-top: 0.5rem (8px)`               |

#### Component Structure (Svelte)

```svelte
<article class="maintenance-item">
  <div class="maintenance-item-grid">
    <!-- Left column: Stations + Badges stacked vertically -->
    <div class="maintenance-item-left">
      <p class="maintenance-item-stations">{item.affected_stations}</p>
      <div class="maintenance-item-badges">
        {#each item.routes as route}
          <RouteBadge {route} />
        {/each}
      </div>
    </div>
    <!-- Right column: Date/Time -->
    <div class="maintenance-item-datetime">
      <time class="maintenance-item-date">{formatDateRange(...)}</time>
      <span class="maintenance-item-start-time">from {startTime}</span>
    </div>
  </div>
  <!-- Footer: Closure badge + Details link -->
  <div class="maintenance-item-footer">
    <span class="maintenance-item-closure-badge">{closureBadge.label}</span>
    <a class="maintenance-item-link">Details</a>
  </div>
</article>
```

#### ⚠️ Critical: Do NOT Change

1. **8px gap** between stations text and line badges (`.maintenance-item-left { gap: 8px }`)
2. **Vertical stacking** of stations + badges in left column
3. **Date/time alignment** to top-right corner
4. **12px padding** on `.maintenance-item` container

### Filter Chips

```svelte
<button class="filter-chip" class:active={isActive}>
  Category Name
</button>
```

### Cards

**Global Card Border Standard**: All cards use `2px` borders for better visual separation when stacked vertically.

| Card Type          | Border Style                    | Location                 |
| ------------------ | ------------------------------- | ------------------------ |
| ETACard            | `border-2` (Tailwind)           | ETACard.svelte           |
| Alert Card         | `border: 2px solid`             | layout.css `.alert-card` |
| RSZ Alert Card     | `border: 2px solid`             | RSZAlertCard.svelte      |
| Maintenance Widget | `border: 2px solid`             | MaintenanceWidget.svelte |
| Subway Status Card | `border: 2px solid`             | alerts/+page.svelte      |
| shadcn Card.Root   | Default (uses component styles) | From shadcn-svelte       |

```svelte
<Card.Root>
  <Card.Header>
    <Card.Title class="text-lg flex items-center gap-2">
      <Icon class="h-5 w-5 text-primary" />
      Card Title
    </Card.Title>
    <Card.Description>
      Brief description of the card's purpose.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    Content here
  </Card.Content>
</Card.Root>
```

**Card Header Pattern (Settings Page):**

All settings cards follow a consistent header structure:

1. **Icon** - Primary color, `h-5 w-5`
2. **Title** - `text-lg`, inline with icon via `flex items-center gap-2`
3. **Description** - Gray text below title

**Card Content Buttons:**

- Use `variant="outline"` for consistent button styling
- Full width with `class="w-full gap-2"`
- Icon + text layout with `h-4 w-4` icons

### Mode Cards (Transport Selection)

```svelte
<button class="mode-card" class:selected={isSelected}>
  <span>🚌</span>
  <span>Buses</span>
</button>
```

### Empty States

Empty states are displayed when content is not available or when filters produce no results. They follow a consistent pattern across the app.

#### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│        ┌─────────┐                                  │
│        │  Icon   │    (4rem circle, centered)       │
│        └─────────┘                                  │
│                                                     │
│           Title                                     │
│        Description text                             │
│        (max-width: 280px)                           │
│                                                     │
│         [Action Button] (optional)                  │
└─────────────────────────────────────────────────────┘
```

#### CSS Classes & Styling

| Class                       | Purpose         | Key Properties                                       |
| --------------------------- | --------------- | ---------------------------------------------------- |
| `.empty-state`              | Container       | `flex flex-col; padding: 3rem 1.5rem; dashed border` |
| `.empty-state.success`      | Success variant | `solid border; green tint background`                |
| `.empty-state-icon`         | Icon circle     | `4rem circle; muted background; centered`            |
| `.empty-state-icon.success` | Success icon    | `green/10 background; green color`                   |
| `.empty-state-title`        | Title text      | `1.125rem; font-weight: 600`                         |
| `.empty-state-description`  | Description     | `0.875rem; muted color; max-width: 280px`            |

#### Component Structure (Svelte)

```svelte
<!-- Standard empty state -->
<div class="empty-state">
  <div class="empty-state-icon">
    <Icon class="h-8 w-8" />
  </div>
  <h3 class="empty-state-title">Title</h3>
  <p class="empty-state-description">
    Description text here.
  </p>
  <Button variant="outline" class="mt-4">
    Action
  </Button>
</div>

<!-- Success empty state (e.g., "All clear") -->
<div class="empty-state success">
  <div class="empty-state-icon success">
    <CheckCircle class="h-8 w-8" />
  </div>
  <h3 class="empty-state-title">All Clear!</h3>
  <p class="empty-state-description">
    No active disruptions on your saved routes.
  </p>
</div>
```

#### Usage Examples

| Context                             | Icon            | Title                      | Variant |
| ----------------------------------- | --------------- | -------------------------- | ------- |
| Scheduled closures - none           | `CheckCircle`   | "No planned closures"      | Success |
| Scheduled closures - weekend filter | `CalendarDays`  | "No closures this weekend" | Default |
| Active alerts - all clear           | `CheckCircle`   | "All Clear!"               | Success |
| Active alerts - no major            | `AlertTriangle` | "No major alerts"          | Default |
| Active alerts - no minor            | `Clock`         | "No minor alerts"          | Default |
| Active alerts - no accessibility    | `Accessibility` | "No accessibility alerts"  | Default |
| Resolved alerts - none              | `SearchX`       | "No resolved alerts"       | Default |
| My Routes - no routes saved         | `Route`         | "No routes saved"          | Default |
| My Routes - routes saved, all clear | `CheckCircle`   | "All clear!"               | Success |
| My Stops - no stops saved           | `MapPin`        | "No stops saved"           | Default |
| Search - no results                 | `SearchX`       | "No results found"         | Default |

> **Icon Consistency Rule:** All "All clear" / success states use `CheckCircle` icon for consistency.

#### Test File

See `static/test-empty-states.html` for a visual reference of all empty state patterns with dark mode toggle.

### ETA Cards (Swipeable Direction Carousel)

The ETA Cards display real-time arrival predictions for bookmarked stops. Each card features a **horizontal swipeable carousel** of direction slides with pagination dots.

#### Layout Structure (Horizontal)

```
┌─────────────────────────────────────────────────────┐
│  Stop Name                                    [✕]   │
│  ⏱ 30s ago                                          │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │ ┌────┐  Queen East         3, 8, 12 min    │    │
│  │ │501 │  📡 Live           ←─────────────→  │    │
│  │ └────┘  (pulsing yellow)    (large red)    │    │
│  │  Badge   Direction          Arrival Times  │    │
│  └─────────────────────────────────────────────┘    │
│                    ● ○ ○      ← Pagination Dots     │
└─────────────────────────────────────────────────────┘
```

#### CSS Classes & Styling

| Class                      | Purpose              | Key Properties                                          |
| -------------------------- | -------------------- | ------------------------------------------------------- |
| `.eta-carousel`            | Scroll container     | `scroll-snap-type: x mandatory; overflow-x: auto`       |
| `.eta-slide`               | Individual slide     | `min-width: 100%; scroll-snap-align: start; padding: 0` |
| `.eta-dots`                | Pagination container | `display: flex; gap: 0.5rem; justify-content: center`   |
| `.eta-dot`                 | Inactive dot         | `8px circle, muted-foreground/30`                       |
| `.eta-dot.active`          | Active dot           | `primary color, scale(1.25)`                            |
| `.eta-live-indicator`      | Live signal          | `color: #EAB308 (yellow); pulsing Radio icon`           |
| `.eta-scheduled-indicator` | Scheduled label      | `color: muted-foreground`                               |
| `.eta-primary-time`        | Main arrival time    | `font-size: 3rem; font-weight: 700; color: destructive` |
| `.eta-secondary-times`     | Additional times     | `font-size: 1.125rem; color: muted-foreground; inline`  |
| `.eta-no-data`             | Dash for no data     | `font-size: 3rem; color: muted-foreground/50`           |
| `.eta-direction`           | Direction label      | `font-size: 0.9375rem; font-weight: 500`                |
| `.route-badge-lg`          | Large route badge    | `padding: 8px 16px; font-size: 1.25rem`                 |

#### Live vs Scheduled Indicators

| State         | Icon             | Color            | Animation                 | Text Format         |
| ------------- | ---------------- | ---------------- | ------------------------- | ------------------- |
| **Live**      | `Radio` (lucide) | `#EAB308` yellow | Pulsing (opacity 0.7→1.0) | "Live"              |
| **Scheduled** | `Clock` (lucide) | muted-foreground | None                      | "Scheduled 8:15 PM" |

#### Scheduled Section (GTFS First Bus Times)

When routes don't have real-time ETA data, ETACard shows their scheduled first bus times from GTFS data. This section is **visually distinct** using a blue tint to differentiate from live ETA predictions above.

| Element            | Light Mode           | Dark Mode            |
| ------------------ | -------------------- | -------------------- |
| Section background | `bg-blue-500/10`     | `bg-blue-950/30`     |
| Header background  | `bg-blue-500/20`     | `bg-blue-900/40`     |
| Header text        | `text-blue-700`      | `text-blue-300/80`   |
| Border             | `border-blue-500/20` | `border-blue-500/20` |

**Header Format**: "Scheduled Next Bus · Weekday (Friday)" with Calendar icon

**Special States**:

- **No Service**: Routes that don't run on current day (e.g., 939 Express on weekends) show "No Service" in `text-muted-foreground/60`
- **Tomorrow**: If next bus is tomorrow, shows "(tmrw)" suffix

#### Component Structure (Svelte)

```svelte
<!-- ETACard.svelte -->
<div class="eta-carousel" bind:this={carouselRef} onscroll={handleScroll}>
  {#each flatPredictions as prediction}
    <ETADirectionSlide {prediction} />
  {/each}
</div>

{#if showDots}
  <div class="eta-dots">
    {#each flatPredictions as _, i}
      <button
        class="eta-dot {activeSlideIndex === i ? 'active' : ''}"
        onclick={() => scrollToSlide(i)}
      />
    {/each}
  </div>
{/if}
```

```svelte
<!-- ETADirectionSlide.svelte -->
<div class="eta-slide">
  <RouteBadge route={prediction.route} size="lg" />
  <p class="eta-direction">{formatDirection(prediction.direction)}</p>

  {#if hasData}
    <span class="eta-primary-time">{primaryTime}</span> min
    <p class="eta-secondary-times">then {secondaryTimes.join(', ')} min</p>

    {#if prediction.isLive}
      <span class="eta-live-indicator"><Radio /> Live</span>
    {:else}
      <span class="eta-scheduled-indicator"><Clock /> Scheduled {prediction.scheduledTime}</span>
    {/if}
  {:else}
    <span class="eta-no-data">–</span>
  {/if}
</div>
```

#### ⚠️ Critical: Do NOT Change

1. **CSS scroll-snap** on `.eta-carousel` - enables native swipe behavior
2. **100% min-width** on `.eta-slide` - ensures single slide per view
3. **Yellow color (#EAB308)** for live indicator - matches reference design
4. **Pagination dots** visible only when 2+ directions exist
5. **Large route badge (size="lg")** maintains TTC brand styling at larger size

### Subway Status Cards

The Subway Status Cards display the current service status for each subway line at the top of the Alerts page.

#### Typography

| Element           | Class                | Size              | Weight |
| ----------------- | -------------------- | ----------------- | ------ |
| Line number badge | `.subway-line-badge` | `0.875rem` (14px) | 700    |
| Line name text    | `.subway-line-name`  | `1rem` (16px)     | 600    |
| Status text       | `.status-text`       | `0.75rem` (12px)  | 500    |

#### Status States

| Status         | Background Color | Icon Color | Text                |
| -------------- | ---------------- | ---------- | ------------------- |
| **ok**         | Card default     | Green      | "Normal Service"    |
| **delay**      | Amber tint       | Amber      | Alert status text   |
| **disruption** | Red tint         | Red        | Alert status text   |
| **scheduled**  | Blue tint        | Blue       | "Scheduled Closure" |

#### CSS Classes

```css
.subway-status-card                    /* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
.subway-status-card.status-ok          /* Normal service */
.subway-status-card.status-delay       /* Delay */
.subway-status-card.status-disruption  /* Disruption */
.subway-status-card.status-scheduled; /* Scheduled closure */
```

### Closure Type Badges

The Closure Type Badges indicate the type of planned maintenance closure in the Scheduled tab (`ClosuresView.svelte`).

#### Badge Types

| Type        | Light Mode BG              | Light Mode Text     | Dark Mode Text      |
| ----------- | -------------------------- | ------------------- | ------------------- |
| **Nightly** | `hsl(210 100% 50% / 0.15)` | `hsl(210 100% 35%)` | `hsl(210 100% 70%)` |
| **Weekend** | `hsl(38 92% 50% / 0.15)`   | `hsl(30 90% 30%)`   | `hsl(38 92% 65%)`   |

#### Typography

- Font size: `0.6875rem` (11px)
- Font weight: 500
- Text transform: uppercase
- Letter spacing: `0.025em`

#### CSS Classes

```css
.closure-type-badge          /* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
/* Base badge styles */
.closure-type-badge.nightly  /* Blue nightly closure */
.closure-type-badge.weekend; /* Amber weekend closure */
```

---

## 7. Layout

### App Structure

```
┌─────────────────────────────────────────────────┐
│ [Sidebar - Desktop only, 16rem/256px]           │
│  ├── Logo + Title                               │
│  ├── Navigation items                           │
│  └── Footer links                               │
├─────────────────────────────────────────────────┤
│ [Header - 3.5rem/56px height]                   │
│  Mobile: Logo + Refresh + Menu                  │
│  Desktop: Last Updated + Actions                │
├─────────────────────────────────────────────────┤
│ [Content Area - max-width: 40rem/640px]         │
│  ├── Filter chips                               │
│  ├── Maintenance widget                         │
│  └── Alert cards                                │
├─────────────────────────────────────────────────┤
│ [Bottom Nav - Mobile only, fixed]               │
│  Alerts | My Alerts | Planned | Preferences     │
└─────────────────────────────────────────────────┘
```

### Content Width

```css
.content-area {
  max-width: 40rem; /* 640px - optimal reading width */
  margin: 0 auto;
  padding: 0.875rem; /* Mobile */
  padding: 1.5rem 2rem; /* Desktop */
}
```

### Safe Areas (iOS)

```css
padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
```

### Sticky Header & Pull-to-Refresh

The header uses `position: sticky` for smooth scrolling with the page. The `PullToRefresh` component wraps page content and must preserve sticky positioning.

**Critical Implementation Detail:**

CSS `transform` property creates a new stacking context which breaks `position: sticky`. The PullToRefresh component only applies `transform: translateY()` when actively pulling (pullDistance > 0), removing it when idle to preserve sticky header behavior.

```svelte
<!-- Only apply transform when actively pulling -->
<div
  class="pull-content"
  style={pullDistance > 0 ? `transform: translateY(${pullDistance}px);` : ''}
>
  {@render children()}
</div>
```

**Z-Index Hierarchy:**

| Element            | Z-Index | Notes                       |
| ------------------ | ------- | --------------------------- |
| Header             | 1000    | Sticky at top               |
| Menu Backdrop      | 1001    | Above header                |
| Menu Content Panel | 1002    | Above backdrop              |
| Menu Header Bar    | 1003    | Above content panel         |
| Mobile Bottom Nav  | 50      | Fixed at bottom             |
| Pull Indicator     | 10      | During pull-to-refresh only |

---

## 8. Animations

### Design Principles

- **Subtle**: Animations should enhance, not distract
- **Fast**: 150-300ms for most interactions
- **Consistent**: Same easing curves throughout
- **Purposeful**: Every animation has a UX reason

### Transitions

```css
/* Standard transition (buttons, hovers) */
transition: all 0.15s ease;

/* Slower for visibility changes */
transition: all 0.2s ease;

/* Utility classes */
.transition-default {
  transition: all 0.15s ease;
}
.transition-colors {
  transition: color 0.15s ease, background-color 0.15s ease,
    border-color 0.15s ease;
}
.transition-transform {
  transition: transform 0.15s ease;
}
.transition-opacity {
  transition: opacity 0.15s ease;
}
```

### Micro-Animations (layout.css)

| Animation      | Duration | Easing   | Use Case                      |
| -------------- | -------- | -------- | ----------------------------- |
| `fadeIn`       | 0.2s     | ease-out | General appearance            |
| `fadeInUp`     | 0.25s    | ease-out | List items, cards entering    |
| `fadeInDown`   | 0.25s    | ease-out | Dropdowns, expandable content |
| `fadeOut`      | 0.15s    | ease-in  | Elements disappearing         |
| `scaleIn`      | 0.2s     | ease-out | Checkmarks, success feedback  |
| `slideInRight` | 0.25s    | ease-out | Side panels, drawer content   |
| `slideOutLeft` | 0.2s     | ease-in  | Page exits                    |
| `focusPulse`   | 0.6s     | ease-out | Input autofocus highlight     |
| `successFlash` | 0.4s     | ease-out | Add/bookmark feedback         |

### Utility Classes

```css
/* Animation classes */
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.animate-fade-in-up {
  animation: fadeInUp 0.25s ease-out forwards;
}
.animate-fade-in-down {
  animation: fadeInDown 0.25s ease-out forwards;
}
.animate-fade-out {
  animation: fadeOut 0.15s ease-in forwards;
}
.animate-scale-in {
  animation: scaleIn 0.2s ease-out forwards;
}
.animate-slide-in-right {
  animation: slideInRight 0.25s ease-out forwards;
}

/* Staggered list animations */
.stagger-1 {
  animation-delay: 0.05s;
}
.stagger-2 {
  animation-delay: 0.1s;
}
.stagger-3 {
  animation-delay: 0.15s;
}
.stagger-4 {
  animation-delay: 0.2s;
}
.stagger-5 {
  animation-delay: 0.25s;
}

/* Focus highlight for input autofocus */
.focus-highlight {
  animation: focusPulse 0.6s ease-out forwards;
}

/* Success flash for add/remove actions */
.animate-success-flash {
  animation: successFlash 0.4s ease-out;
}
```

### Staggered List Pattern

Use dynamic delay for list items (capped at 200-300ms max):

```svelte
{#each items as item, i (item.id)}
  <div
    class="animate-fade-in-up"
    style="animation-delay: {Math.min(i * 50, 300)}ms"
  >
    <!-- content -->
  </div>
{/each}
```

### Loading Skeletons

```svelte
<!-- Alert card skeleton -->
<div class="alert-card animate-fade-in stagger-{i + 1}">
  <Skeleton class="h-6 w-16 rounded-md" />
  <Skeleton class="h-4 w-full mt-3" />
  <Skeleton class="h-4 w-3/4 mt-2" />
</div>
```

### Focus Highlight Animation

Triggered when clicking empty state cards to autofocus search input:

```css
@keyframes focusPulse {
  0% {
    border-color: hsl(var(--border));
    box-shadow: 0 0 0 0px hsl(var(--primary) / 0);
    transform: scale(1);
  }
  30% {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
    transform: scale(1.01);
  }
  100% {
    border-color: hsl(var(--primary) / 0.5);
    box-shadow: 0 0 0 0px hsl(var(--primary) / 0);
    transform: scale(1);
  }
}
```

### Action Feedback

```css
/* Success flash for bookmark add/remove */
@keyframes successFlash {
  0% {
    background-color: hsl(142 76% 36% / 0.15);
  }
  100% {
    background-color: transparent;
  }
}
```

### Legacy Keyframes (still used)

```css
/* Refresh pulse */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 hsl(217 91% 60% / 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px hsl(217 91% 60% / 0);
  }
  100% {
    box-shadow: 0 0 0 0 hsl(217 91% 60% / 0);
  }
}

/* Spinner rotation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

---

## 9. Accessibility

### Contrast Requirements (WCAG 2.2 AA)

- **Body text:** 4.5:1 minimum
- **Large text (18px+):** 3:1 minimum
- **UI components:** 3:1 minimum

### Focus States

```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Or ring shadow for buttons */
box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring));
```

### Touch Targets

- Minimum: 44px × 44px for interactive elements
- Bottom nav items: Full flex width
- Buttons: `h-10` (40px) minimum

### Mobile Bottom Navigation

```svelte
<nav class="mobile-bottom-nav">
  <a class="nav-item" href="/">
    <Home class="h-5 w-5" />
    <span>Home</span>
  </a>
  <!-- ... more items -->
</nav>
```

**Guidelines:**

- Labels should be **single words** for consistent alignment (e.g., "Alerts" not "Service Alerts")
- Text centered under icons via `text-align: center`
- Active state uses primary color
- 4 tabs max for mobile usability

---

## 10. Dark Mode

### Theme System

The app supports three theme modes: **Light**, **Dark**, and **System** (default).

**Architecture:**

1. **Blocking script** in `app.html` prevents flash of wrong theme on page load
2. **localStorage** (`ttc-theme`) stores the user's preference for fast sync access
3. **IndexedDB** (`localPreferences` store) is the source of truth for all preferences
4. **System preference** is detected via `window.matchMedia('(prefers-color-scheme: dark)')`

**Theme Toggle Flow:**

```javascript
// In localPreferences store
function applyTheme(theme: "light" | "dark" | "system") {
  localStorage.setItem("ttc-theme", theme); // Sync for blocking script

  if (theme === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  } else {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
}
```

**Blocking Script (app.html):**

```html
<script>
  (function () {
    const stored = localStorage.getItem("ttc-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (
      stored === "dark" ||
      (stored === "system" && prefersDark) ||
      (!stored && prefersDark)
    ) {
      document.documentElement.classList.add("dark");
    }
  })();
</script>
```

All colors use CSS custom properties that update in `.dark` context.

---

## 11. Adding Components

### From shadcn-svelte

```bash
npx shadcn-svelte@next add [component]
```

Components install to `src/lib/components/ui/`.

### Custom Components

1. Create in `src/lib/components/[category]/`
2. Use design tokens from `layout.css`
3. Follow naming: `PascalCase.svelte`
4. Export from `index.ts` if multiple related components

---

## 12. File Reference

| File                           | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `src/routes/layout.css`        | All CSS custom properties and base styles                   |
| `src/lib/styles/ttc-theme.css` | TTC-specific overrides (imported in layout.css or app.html) |
| `src/app.html`                 | Google Fonts Lexend link                                    |
| `components.json`              | shadcn-svelte configuration                                 |
| `tailwind.config.ts`           | Tailwind configuration (if customized)                      |

---

## 13. Design Decisions

### Why Lexend?

- Designed for reading efficiency and dyslexia-friendliness
- Variable font (single file, all weights)
- Excellent x-height for mobile readability

### Why TTC Brand Colors?

- Instant recognition for Toronto transit users
- Official colors ensure consistency with real-world signage
- High contrast pairs verified for accessibility

### Why shadcn-svelte?

- Unstyled primitives = full design control
- Copy-paste components = no version lock-in
- Tailwind integration = consistent utility classes

---

## 14. Version B Components 🅱️

### ETA Widget & Card

Live arrival times for bookmarked stops.

```svelte
<!-- Widget with empty state -->
<ETAWidget onAddStop={() => showSearch = true} />

<!-- Individual ETA card -->
<ETACard eta={etaData} />
```

**ETA Card Layout (Responsive):**

**Mobile (< 640px):**

- Stop header: cross-streets format + direction badge + stop ID
- Route card Row 1: Route badge + direction + destination (wraps naturally)
- Route card Row 2: ETA times right-aligned (primary large, secondary smaller)

**Desktop (≥ 640px):**

- Stop header: cross-streets format + direction badge + stop ID
- Route card: Single row with badge + direction left, times right

**Cross-streets Formatting:**

- "Morningside Ave At Sheppard Ave" → "Morningside Ave / Sheppard Ave"
- Also handles: "Opp", "Near", "North Side", "South Side", etc.

**ETA Times Display:**

- Primary time: `text-5xl` bold (mobile) / `text-4xl` bold (desktop)
- Secondary times: `text-3xl` semibold (mobile) / `text-base` (desktop)
- Live signal icon next to each time
- Shared "min" label at end

**CSS Classes:**

- `.eta-card` - Card container with hover state
- `.eta-time` - Countdown display (green < 5min, amber < 2min, red approaching)

### Stop Search

Autocomplete search for 9,346 TTC stops using Dexie.js (IndexedDB).

```svelte
<StopSearch
  onSelect={(stop) => bookmarks.add(stop)}
  onClose={() => showSearch = false}
/>
```

**Features:**

- Fuzzy search by stop name
- Debounced input (150ms)
- Keyboard navigation (↑/↓/Enter/Escape)
- Shows route badges for each stop
- Accessible listbox pattern

### Weather Warning Banner

Collapsible banner for transit-relevant weather alerts from Environment Canada.

```svelte
<WeatherWarningBanner />
```

**Alert Types:**

- `warning` - Red border (severe weather)
- `watch` - Amber border (potential impact)
- `advisory` - Blue border (informational)
- `forecast` - Default (current conditions)

**Features:**

- Fetches RSS from weather.gc.ca
- Filters for Toronto (on-143)
- Dismissible with localStorage persistence
- Expand/collapse for full text
- 15-minute cache TTL

### Route Browser Page

Browse all TTC routes organized by category.

```svelte
<!-- Category buttons -->
<Button onclick={() => scrollTo('subway')}>Subway</Button>

<!-- Route grid -->
{#each routes as route}
  <button onclick={() => filterByRoute(route)}>
    <RouteBadge route={route.number} />
    {route.name}
  </button>
{/each}
```

**Categories:**
| Category | Routes | Color |
|----------|--------|-------|
| Subway | Lines 1, 2, 4 | Yellow/Green/Purple |
| Streetcar | 501-512 | TTC Red |
| Express | 900-996 | TTC Green |
| Night | 300-385 | White + Blue border |
| Community | 400-405 | White + Gray border |
| Popular Bus | 7, 25, 29, etc. | TTC Red |

**Features:**

- Bookmarked routes appear first in each category
- Uses `savedRoutes` store for bookmark state

### My Routes Tab (Responsive Route Badge Tabs)

Horizontal scrollable tabs on mobile, wrapping rows on desktop.

```svelte
<!-- Container with responsive behavior -->
<div class="route-tabs-container relative">
  <div class="route-tabs flex gap-2 overflow-x-auto md:overflow-x-visible md:flex-wrap">
    {#each routes as route}
      <button class="route-tab flex-shrink-0 whitespace-nowrap">
        <RouteBadge route={route} />
      </button>
    {/each}
  </div>
  <!-- Fade gradient for mobile scroll indicator -->
  <div class="route-tabs-fade absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
</div>
```

**Responsive Behavior:**

| Viewport         | Behavior             | Visual Cue               |
| ---------------- | -------------------- | ------------------------ |
| Mobile (<768px)  | Horizontal scroll    | Right fade gradient      |
| Desktop (≥768px) | Flex wrap, multi-row | No gradient, all visible |

**CSS Pattern:**

```css
.route-tabs {
  overflow-x: auto;
  scrollbar-width: none; /* Hide scrollbar */
  -webkit-overflow-scrolling: touch; /* Smooth iOS scroll */
}
.route-tabs::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .route-tabs {
    overflow-x: visible;
    flex-wrap: wrap;
  }
  .route-tabs-fade {
    display: none;
  }
}
```

### Selection Buttons (Option Groups)

For mutually exclusive options like Language, Theme, Text Size.

**Selected State:**

- Border: `border-2` with `hsl(var(--foreground))` (thick, dark border)
- Circle indicator: Filled circle with foreground color + white checkmark inside
- Text: After the circle indicator

**Unselected State:**

- Border: `border border-input` (thin, light border)
- Circle indicator: Empty circle with `border-2 border-muted-foreground/30`
- Hover: `hover:bg-accent/50`

```svelte
<!-- Selection Button Pattern -->
{@const isSelected = currentValue === option.value}
<button
  class="h-10 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 {isSelected ? 'border-2' : 'border border-input hover:bg-accent/50'}"
  style={isSelected ? 'border-color: hsl(var(--foreground));' : ''}
  onclick={() => handleSelect(option.value)}
>
  {#if isSelected}
    <span class="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: hsl(var(--foreground));">
      <Check class="h-3 w-3" style="color: hsl(var(--background));" />
    </span>
  {:else}
    <span class="h-5 w-5 rounded-full flex-shrink-0 border-2 border-muted-foreground/30"></span>
  {/if}
  <span>{option.label}</span>
</button>
```

**Key Features:**

- `rounded-xl` matches other buttons (Export/Import Data buttons)
- Circle placeholder on unselected prevents layout shift
- Inline styles for border/fill colors (Tailwind v4 workaround)
- Works in both light and dark mode

**Usage Locations:**

- `settings/+page.svelte` - Language, Theme, Text Size
- `preferences/+page.svelte` - Transport Modes, Days, Alert Types (uses `.mode-card` CSS class)

### Switch Component (Toggles)

Custom styled toggle switch with checkmark/X icons inside the thumb.

```svelte
import { Switch } from '$lib/components/ui/switch';

<Switch
  checked={value}
  onCheckedChange={(checked) => setValue(checked)}
  aria-labelledby="label-id"
  aria-describedby="desc-id"
/>
```

**Visual Design:**

The switch has distinct on/off states with icons inside the thumb:

| State                | Track Color                | Thumb Color           | Icon                       |
| -------------------- | -------------------------- | --------------------- | -------------------------- |
| **Light Mode - Off** | Light gray (`#e5e5e5`)     | Dark gray (`#737373`) | White X                    |
| **Light Mode - On**  | Black (foreground)         | White                 | Black checkmark            |
| **Dark Mode - Off**  | Muted gray (30% opacity)   | Gray (70% opacity)    | Dark X                     |
| **Dark Mode - On**   | Light border (15% opacity) | White                 | Dark checkmark (`#171717`) |

**Size:** `h-7 w-12` (larger than default for better touch targets)

**Implementation Notes:**

- Uses `bits-ui` Switch primitive with custom styling
- Icons from `lucide-svelte` (Check, X)
- Scoped CSS with `:global()` selectors for theme support
- Hardcoded colors used where CSS variables don't work in Tailwind v4

**Usage Locations:**

- `settings/+page.svelte` - Reduce Motion
- `preferences/+page.svelte` - Reduce Motion, Weather Warnings

### Subway Alerts Accordion Sections

The Alerts page uses collapsible accordion sections to organize subway alerts by line. Each section shows:

- Subway line badge with line number and name
- Current status (Normal Service / Delay / Disruption)
- Alert count badge when expanded alerts exist
- Smooth expand/collapse animation

#### Accordion Structure

```svelte
<div class="subway-alerts-accordion">
  <button class="accordion-header" onclick={toggleExpanded}>
    <div class="line-info">
      <span class="line-badge line-{lineNumber}">{lineNumber}</span>
      <span class="line-name">{lineName}</span>
    </div>
    <div class="status-indicator status-{status}">
      <StatusIcon />
      <span>{statusText}</span>
    </div>
    <ChevronDown class="expand-icon" />
  </button>
  {#if expanded}
    <div class="accordion-content">
      <!-- Alert cards -->
    </div>
  {/if}
</div>
```

#### Line Badge Colors

| Line   | Background | Text  |
| ------ | ---------- | ----- |
| Line 1 | `#FFC524`  | Black |
| Line 2 | `#00853F`  | White |
| Line 4 | `#A12F7D`  | White |
| Line 6 | `#8B5A2B`  | White |

### Step Indicators (Accordion Headers)

For multi-step wizards/accordions showing completion status. Uses **primary color** to indicate completed steps.

**Pattern:**

```svelte
<div class="flex h-7 w-7 items-center justify-center rounded-full {stepComplete ? 'bg-primary' : 'bg-muted'} text-xs font-semibold">
  {#if stepComplete}
    <Check class="h-4 w-4 text-primary-foreground" />
  {:else}
    <span class="text-muted-foreground">{stepNumber}</span>
  {/if}
</div>
```

**Note:** Step indicators use `bg-primary` and `text-primary-foreground` intentionally - this is different from selection buttons which use `foreground` color.

**Usage Locations:**

- `preferences/+page.svelte` - Steps 1-4 accordion headers

### Accessibility Settings

Text scaling and reduced motion controls in Preferences/Settings.

The Text Size selector follows the **Selection Buttons** pattern (see above).

**CSS Variables:**

```css
/* Text scaling */
:root {
  --text-scale: 1; /* small */
  --text-scale: 1.125; /* medium */
  --text-scale: 1.25; /* large */
}

html {
  font-size: calc(16px * var(--text-scale));
}

/* Reduce motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

---

_Last updated: December 15, 2025_
