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

### Dialogs (Confirmation Modals)

Dialogs are used for confirmation prompts (delete, clear data) and informational modals. Built with shadcn-svelte `Dialog` component.

#### Basic Structure

```svelte
<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Trash2 } from "lucide-svelte";
</script>

<Dialog.Root open={showDialog} onOpenChange={(open) => { if (!open) showDialog = false; }}>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <!-- Icon Circle -->
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <Trash2 class="h-7 w-7 text-destructive" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold">Confirm Action?</Dialog.Title>
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        Are you sure you want to proceed? This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center">
      <Button variant="outline" class="w-full sm:w-auto" onclick={() => showDialog = false}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={handleConfirm}
      >
        Confirm
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

#### Dialog Styling Rules

| Element            | Classes/Styles                                                                      |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Content**        | `class="sm:max-w-md"` + inline `background-color` and `border` for reliability      |
| **Icon Container** | `mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-{type}/10` |
| **Icon**           | `h-7 w-7 text-{type}` (e.g., `text-destructive` for delete dialogs)                 |
| **Title**          | `text-center text-lg font-semibold`                                                 |
| **Description**    | `text-center text-sm text-muted-foreground`                                         |
| **Footer**         | `flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center`                    |
| **Buttons**        | `w-full sm:w-auto` for responsive sizing                                            |

#### Button Order (Mobile-First)

- Mobile: Buttons stack vertically with **destructive action on top** (more accessible)
- Desktop: Buttons in row with Cancel on left, Action on right

#### Destructive Button Styling

Due to Tailwind CSS variable processing, always add explicit inline styles for destructive buttons:

```svelte
<Button
  variant="destructive"
  style="background-color: hsl(var(--destructive)); color: white;"
>
  Delete
</Button>
```

#### Dialog Types by Icon Color

| Type        | Icon Container      | Icon Color         | Example Use          |
| ----------- | ------------------- | ------------------ | -------------------- |
| **Danger**  | `bg-destructive/10` | `text-destructive` | Delete, Clear data   |
| **Info**    | `bg-blue-500/10`    | `text-blue-500`    | How to use, About    |
| **Warning** | `bg-amber-500/10`   | `text-amber-500`   | Unsaved changes      |
| **Success** | `bg-green-500/10`   | `text-green-500`   | Confirmation success |

### Tab Indicators

Active tabs use a 2px bottom line indicator to show the current selection. This pattern is used across all tabbed navigation in the app.

#### Usage Locations

| Component                  | Tabs                                     | Implementation          |
| -------------------------- | ---------------------------------------- | ----------------------- |
| `HomeSubTabs.svelte`       | My Stops / My Routes                     | `:after` pseudo-element |
| `alerts/+page.svelte`      | Active / Resolved / Scheduled            | `:after` pseudo-element |
| `MaintenanceWidget.svelte` | Starting Soon / This Weekend / Coming Up | `border-bottom`         |
| `ClosuresView.svelte`      | Starting Soon / This Weekend / Coming Up | `:after` pseudo-element |

#### CSS Pattern (Pseudo-Element)

```css
.tab {
  position: relative;
  /* ... other tab styles */
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

#### CSS Pattern (Border-Bottom)

```css
.tab {
  border-bottom: 2px solid transparent;
  /* ... other tab styles */
}

.tab.active {
  border-bottom-color: hsl(var(--primary));
  /* or specific color: rgb(139 92 246) for purple */
}
```

#### Guidelines

- **Width**: 2rem (32px) centered under the tab text
- **Height**: 2px
- **Color**: Primary color `hsl(var(--primary))` or theme-specific (e.g., purple for maintenance tabs)
- **Position**: Absolute positioned at `bottom: 0`, centered with `left: 50%` + `transform: translateX(-50%)`
- **Transition**: Inherits tab transition for smooth state changes

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

### Direction Badges

Direction badges indicate the travel direction of a stop (extracted from GTFS trip headsigns). Used in StopSearch dropdown, ETACard headers, route page direction tabs, and subway platform badges.

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

**Subway Terminal Direction Labels:**

| Line   | Direction 0 (GTFS) | Direction 1 (GTFS)     | Color (0/1)     |
| ------ | ------------------ | ---------------------- | --------------- |
| Line 1 | Towards VMC        | Towards Finch          | amber / emerald |
| Line 2 | Towards Kennedy    | Towards Kipling        | sky / amber     |
| Line 4 | Towards Don Mills  | Towards Sheppard-Yonge | sky / amber     |
| Line 6 | Towards Finch West | Towards Humber College | sky / amber     |

> **Note**: Subway direction tabs use terminal station names instead of cardinal directions for clarity. Platform badges on stops still show Eastbound/Westbound/Northbound/Southbound.

**Mobile Short Labels:**

| Full Label             | Mobile Label |
| ---------------------- | ------------ |
| Towards VMC            | VMC          |
| Towards Finch          | Finch        |
| Towards Kennedy        | Kennedy      |
| Towards Kipling        | Kipling      |
| Towards Don Mills      | Don Mills    |
| Towards Sheppard-Yonge | Shep-Yonge   |
| Towards Finch West     | Finch W      |
| Towards Humber College | Humber       |

**Usage Locations:**

- `StopSearch.svelte` - Search dropdown results
- `ETACard.svelte` - Saved stop card headers
- `RouteDirectionTabs.svelte` - Route page direction tabs (mobile: short labels)
- `RouteStopItem.svelte` - Subway platform badges (uppercase)

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
.subway-status-card          /* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
/* Card container */
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
.closure-type-badge.nightly  /* Blue nightly closure */
.closure-type-badge.weekend; /* Amber weekend closure */
```

#### WCAG Compliance

Both badge types meet **WCAG AA** contrast requirements (4.5:1 minimum):

- Nightly (light mode): ~7:1 contrast ratio
- Weekend (light mode): ~8:1 contrast ratio

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

| Animation      | Duration | Easing   | Use Case                                                 |
| -------------- | -------- | -------- | -------------------------------------------------------- |
| `fadeIn`       | 0.2s     | ease-out | General appearance, modal backdrops, hamburger menu      |
| `fadeInUp`     | 0.25s    | ease-out | List items, cards entering                               |
| `fadeInDown`   | 0.25s    | ease-out | Dropdowns, expandable content, hamburger menu panel      |
| `fadeOut`      | 0.15s    | ease-in  | Elements disappearing                                    |
| `scaleIn`      | 0.2s     | ease-out | Checkmarks, success feedback                             |
| `slideInRight` | 0.25s    | ease-out | Side panels, drawer content                              |
| `slideOutLeft` | 0.2s     | ease-in  | Page exits                                               |
| `focusPulse`   | 0.6s     | ease-out | Input autofocus highlight                                |
| `successFlash` | 0.4s     | ease-out | Add/bookmark feedback                                    |
| `ping`         | 1s       | cubic    | Connection status indicator (pulsing dot when connected) |

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

### Header/Navigation Patterns

#### Language Toggle

The language toggle appears in both the header and settings page, using the same `localPreferences` store for synchronization.

**Header Implementation:**

```svelte
<div class="flex items-center gap-0.5 border border-border rounded-md p-0.5">
  {#each getSupportedLanguages() as lang}
    <button
      onclick={() => localPreferences.updatePreference('language', lang.code)}
      class="min-w-[2.25rem] px-2 py-1 text-xs font-semibold rounded transition-all duration-150"
      style={$language === lang.code
        ? 'background-color: hsl(var(--foreground)); color: hsl(var(--background));'
        : 'background-color: transparent; color: hsl(var(--muted-foreground));'}
    >
      {lang.code.toUpperCase()}
    </button>
  {/each}
</div>
```

**Design Rules:**

- **Selected state**: Inverted colors (`foreground` bg / `background` text) for maximum contrast
- **Unselected state**: Transparent bg / `muted-foreground` text
- **Explicit inline styles**: Use HSL variables instead of Tailwind classes for reliable rendering across themes
- **Synchronization**: Always use `localPreferences.updatePreference('language', code)` to keep header and settings in sync

#### Connection Status Indicator

The connection status indicator shows real-time connection state with accessible visual cues.

**Implementation:**

```svelte
{#if $isConnected}
  <!-- Connected: pulsing green dot -->
  <span class="relative flex h-2 w-2">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
  </span>
{:else}
  <!-- Disconnected: hollow gray circle -->
  <span class="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500"></span>
{/if}
```

**Accessibility:**

- **Shape differentiation**: Filled circle (connected) vs hollow circle (disconnected)
- **Animation**: Pulsing animation provides motion-based feedback
- **ARIA attributes**: Add `role="status"` and `aria-live="polite"` to container
- **Not color-only**: Relies on shape + animation, not just color contrast

#### Mobile Hamburger Menu

The mobile hamburger menu uses animations and explicit styling for consistent appearance.

**Animations:**

- **Backdrop**: `animate-fade-in` (0.2s fade in)
- **Header bar**: `animate-fade-in` (0.2s fade in)
- **Menu panel**: `animate-fade-in-down` (0.25s slide down from top)

**Styling Pattern:**

```svelte
<!-- Backdrop -->
<button class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" />

<!-- Header bar -->
<div
  class="fixed left-0 right-0 top-0 z-[102] animate-fade-in"
  style="background-color: hsl(var(--background)); border-color: hsl(var(--border));"
>
  <!-- Logo + Close button -->
</div>

<!-- Menu content -->
<div
  class="fixed left-0 right-0 top-[57px] z-[101] animate-fade-in-down"
  style="background-color: hsl(var(--background));"
>
  <!-- Menu items with explicit text colors -->
  <button style="color: hsl(var(--foreground));">
    <!-- Icon + Text -->
  </button>
</div>
```

**Menu Item Styling:**

- Use explicit inline styles: `style="color: hsl(var(--foreground));"`
- Hover states: `onmouseenter/onmouseleave` handlers for `backgroundColor`
- Section headers: `style="color: hsl(var(--muted-foreground));"`
- Theme toggle button: Dynamic background based on `isDark` variable

```svelte
<button
  style="background-color: {isDark ? 'hsl(240 3.7% 20%)' : 'hsl(240 5.9% 88%)'}; color: hsl(var(--foreground));"
>
  {isDark ? 'Dark Mode' : 'Light Mode'}
</button>
```

#### Desktop Refresh + Status Group

On desktop, the refresh button and status indicator are grouped together to show their relationship.

**Implementation:**

```svelte
<div class="hidden sm:flex items-center gap-0 bg-muted/50 rounded-md px-0">
  <button class="flex p-1.5 rounded-l-md hover:bg-accent">
    <RefreshCw class="w-4 h-4" />
  </button>
  <div class="w-px h-4 bg-border"></div>
  <div class="flex items-center gap-1.5 px-2 py-1.5">
    <!-- Status indicator + time -->
  </div>
</div>
```

**Design Rules:**

- **Visual grouping**: Shared `bg-muted/50` background container
- **Divider**: 1px vertical line (`w-px h-4 bg-border`) between button and status
- **No gap**: `gap-0` to make them flush together
- **Rounded edges**: Only left side of refresh button is rounded (`rounded-l-md`)

#### Mobile Bottom Navigation Compact Mode

The mobile bottom navigation features an automatic compact mode that activates during scrolling, providing more screen space while maintaining accessibility.

**Behavior:**

- **Scroll down** past 100px → compacts (labels fade out, height reduces)
- **Scroll up** → expands (labels fade in, full height restored)
- **At page top** (< 10px) → always expanded
- **Scroll buffer**: Requires 5px scroll delta to prevent jittery state changes

**Implementation:**

```typescript
let isCompact = $state(false);
let lastScrollY = 0;
let scrollThreshold = 100;
let scrollDelta = 0;

function handleScroll() {
  const currentScrollY = document.body.scrollTop || window.scrollY;
  scrollDelta = currentScrollY - lastScrollY;

  // Always expand at top
  if (currentScrollY < 10) {
    isCompact = false;
    lastScrollY = currentScrollY;
    return;
  }

  // Compact on sustained downward scroll
  if (scrollDelta > 0 && currentScrollY > scrollThreshold) {
    if (scrollDelta > 5 || isCompact) isCompact = true;
  }
  // Expand on upward scroll
  else if (scrollDelta < 0) {
    if (Math.abs(scrollDelta) > 5 || !isCompact) isCompact = false;
  }

  lastScrollY = currentScrollY;
}
```

**CSS Transitions:**

```css
.mobile-bottom-nav {
  transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-bottom-nav.compact {
  padding-top: 0.25rem; /* Reduced from 0.5rem */
  padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
  background: hsl(var(--background) / 0.95); /* Slight transparency */
}

.mobile-bottom-nav .nav-item span {
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    margin-top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1.2rem;
  opacity: 1;
}

.mobile-bottom-nav.compact .nav-item span {
  max-height: 0; /* Collapse labels */
  opacity: 0; /* Fade out */
  margin-top: 0;
}
```

**Design Rules:**

- **Smooth easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural acceleration/deceleration
- **400ms duration**: Balanced between responsiveness and smoothness
- **Independent transitions**: max-height, opacity, margin-top animate separately for labels
- **Active indicator persists**: Top blue bar remains visible in compact mode (adjusted position)
- **Icon size unchanged**: 22px icons stay full size for tap targets
- **GPU acceleration**: Uses `transform: translateZ(0)` for smooth animations

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

Collapsible card sections for grouping subway line alerts on the alerts page.

#### Layout Structure

```
┌──────────────────────────────────────────────────┐
│  ████ 4px colored top border (line color)        │
├──────────────────────────────────────────────────┤
│  [1] Line 1            ▼ chevron (rotates -180°)│
│  Clickable header                                │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ Alert Card 1 (no left border)              │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ Alert Card 2 (no left border)              │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### CSS Classes & Styling

| Class                    | Purpose                    | Key Properties                                           |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `.accordion-card`        | Outer card container       | Card styling, border radius, shadow                      |
| `.accordion-header`      | Clickable header button    | Full width, no intrinsic padding, cursor pointer         |
| `.accordion-top-border`  | Colored top stripe         | `height: 4px; background: var(--line-color)`             |
| `.accordion-header-body` | Header content wrapper     | Flex row, justify between, padding: `0.875rem 1rem`      |
| `.accordion-header-left` | Badge + name container     | Flex row, gap: `0.625rem`, align center                  |
| `.accordion-chevron`     | Expand/collapse icon       | `1.25rem × 1.25rem`, rotates -180° when expanded         |
| `.accordion-content`     | Expandable content wrapper | `max-height: 0` collapsed, `max-height: 5000px` expanded |
| `.accordion-body`        | Inner alert cards wrapper  | Padding: `0.75rem 1rem 1rem`, border-top when expanded   |

#### State Management

```typescript
// State: Set of expanded line IDs
let expandedSections = $state<Set<string>>(new Set());

// Toggle function
function toggleAccordion(lineId: string) {
  const newExpanded = new Set(expandedSections);
  if (newExpanded.has(lineId)) {
    newExpanded.delete(lineId);
  } else {
    newExpanded.add(lineId);
  }
  expandedSections = newExpanded;
}

// Auto-expand all sections on mount
$effect(() => {
  const linesWithAlerts = /* derive from alerts */;
  const newExpanded = new Set(expandedSections);
  linesWithAlerts.forEach(lineId => newExpanded.add(lineId));
  expandedSections = newExpanded;
});
```

#### Component Structure (Svelte)

```svelte
{#if subwayLine && isFirstForLine}
  {@const isExpanded = expandedSections.has(subwayLine)}

  <div class="accordion-card" class:highlighted={isHighlighted}>
    <button
      class="accordion-header"
      style="--line-color: {lineInfo?.color}"
      onclick={() => toggleAccordion(subwayLine)}
    >
      <div class="accordion-top-border"></div>
      <div class="accordion-header-body">
        <div class="accordion-header-left">
          <span class="section-line-badge" style="background-color: {lineInfo?.color}; color: {lineInfo?.textColor}">
            {subwayLine.replace("Line ", "")}
          </span>
          <span class="section-line-name">{subwayLine}</span>
        </div>
        <svg class="accordion-chevron" class:rotated={isExpanded} viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </button>
    <div class="accordion-content" class:expanded={isExpanded}>
      <div class="accordion-body">
        <!-- Alert cards here -->
      </div>
    </div>
  </div>
{/if}
```

#### Transitions

| Element          | Transition         | Duration | Easing   |
| ---------------- | ------------------ | -------- | -------- |
| Chevron rotation | `transform`        | 0.2s     | ease     |
| Header hover     | `background-color` | 0.2s     | ease     |
| Content expand   | `max-height`       | 0.5s     | ease-in  |
| Content collapse | `max-height`       | 0.3s     | ease-out |

#### Integration with Status Grid

When clicking a subway status card in the grid:

1. Auto-expands the accordion section if collapsed
2. Scrolls to the section smoothly
3. Highlights the accordion card for 2.5 seconds

```typescript
function handleStatusCardClick(lineId: string) {
  // Expand section if collapsed
  if (!expandedSections.has(lineId)) {
    expandedSections = new Set([...expandedSections, lineId]);
  }

  // Scroll to section
  const sectionElement = document.getElementById(
    `subway-section-${lineId.toLowerCase()}`
  );
  sectionElement?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Highlight for 2.5s
  highlightedLineId = lineId;
  setTimeout(() => {
    highlightedLineId = null;
  }, 2500);
}
```

#### ⚠️ Critical: Do NOT Change

1. **4px top border** - Provides line color context, removed from inner alert cards
2. **Max-height transitions** - Enables smooth expand/collapse animation
3. **Default expanded state** - All sections start expanded for immediate visibility
4. **Chevron rotation** - `-180deg` matches native accordion patterns
5. **Highlight shadow** - Uses `var(--line-color)` for visual linking with status cards

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

_Last updated: December 5, 2025_
