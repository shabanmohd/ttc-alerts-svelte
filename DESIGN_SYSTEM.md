# TTC Alerts Design System

> **Single Source of Truth** for UI consistency, scalability, and efficiency.  
> Built on **shadcn-svelte** + **Tailwind CSS** + **Lexend** typography.

---

## Quick Reference

| Category | File | Purpose |
|----------|------|---------|
| **Design Tokens** | `src/routes/layout.css` | CSS custom properties (colors, spacing, radius) |
| **TTC Theme** | `src/lib/styles/ttc-theme.css` | Route colors, status badges, brand overrides |
| **Components** | `src/lib/components/ui/` | shadcn-svelte components |
| **Config** | `components.json` | shadcn-svelte paths and aliases |

---

## 1. Colors

### Core Palette (CSS Custom Properties)

```css
/* Light Mode */
:root {
  --background: 0 0% 100%;           /* White */
  --foreground: 240 10% 3.9%;        /* Near black */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;           /* Dark slate */
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;       /* Light gray */
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 40%;  /* WCAG AA: 4.5:1 */
  --accent: 240 4.8% 95.9%;
  --destructive: 0 72% 45%;          /* Red */
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

| Status | Light BG | Light Text | Dark Text |
|--------|----------|------------|-----------|
| **Error/Disruption** | `0 70% 96%` | `0 72% 30%` | `0 91% 75%` |
| **Warning/Delay** | `38 80% 94%` | `28 90% 25%` | `43 96% 70%` |
| **Info/Planned** | `214 80% 96%` | `224 76% 30%` | `213 94% 75%` |
| **Success** | `142 60% 94%` | `142 72% 22%` | `142 69% 68%` |
| **Teal/Resumed** | `168 76% 90%` | `172 66% 22%` | `168 71% 70%` |
| **Orange/Detour** | `24 80% 94%` | `24 90% 28%` | `30 95% 70%` |

### TTC Brand Colors

```css
/* Subway Lines */
--ttc-line-1: #FFC524;     /* Yellow - Yonge-University */
--ttc-line-2: #00853F;     /* Green - Bloor-Danforth */
--ttc-line-4: #A12F7D;     /* Purple - Sheppard */

/* Bus & Streetcar */
--ttc-red: #C8102E;        /* Regular routes */
--ttc-express: #00853F;    /* 900-series */
--ttc-night: #003DA5;      /* 300-series border */
--ttc-community: #6B7280;  /* 400-series border */
```

---

## 2. Typography

### Font Stack

```css
font-family: "Lexend", system-ui, -apple-system, sans-serif;
```

**Lexend** is a dyslexic-friendly variable font optimized for reading.

### Weight Hierarchy

| Weight | Value | Usage |
|--------|-------|-------|
| **Bold** | 700 | Route numbers, brand name, count badges |
| **Semibold** | 600 | Section headings, dates, card titles, badges |
| **Medium** | 500 | Nav items, tabs, buttons, links, station names |
| **Regular** | 400 | Body text, descriptions, timestamps |
| **Light** | 300 | Reserved (not currently used) |

### Size Scale

| Size | Pixels | Usage |
|------|--------|-------|
| `text-xs` | 10-11px | Tab counts, closure badges, smallest labels |
| `text-sm` | 12-13px | Timestamps, status badges, secondary text |
| `text-base` | 15px | Body text, alert descriptions |
| `text-lg` | 17px | Card titles, section headings |
| `text-xl` | 18-19px | Page headings (rare in mobile-first UI) |

### Letter Spacing

| Spacing | Value | Usage |
|---------|-------|-------|
| Tight | `-0.02em` | Headings, brand |
| Normal | `-0.01em` | Body, nav, buttons |
| Wide | `0.02-0.04em` | Uppercase badges, labels |

---

## 3. Spacing

### Tailwind Scale (Default)

| Class | Size | Usage |
|-------|------|-------|
| `gap-0.5` | 2px | Icon-text gap in compact badges |
| `gap-1` | 4px | Tight groupings |
| `gap-2` | 8px | Badge groups, inline elements |
| `gap-3` | 12px | Card internal sections |
| `gap-4` | 16px | Between cards, major sections |
| `gap-6` | 24px | Page sections |

### Padding Patterns

| Pattern | Value | Usage |
|---------|-------|-------|
| Card padding | `1rem / 1.25rem` | Mobile / Desktop |
| Button padding | `0.5rem 1rem` | Standard buttons |
| Badge padding | `0.125rem 0.5rem` | Status badges |
| Route badge | `6px 12px` | Route number badges |
| Content area | `0.875rem` mobile, `1.5rem` desktop | Main content |

### Layout Breakpoints

| Breakpoint | Width | Changes |
|------------|-------|---------|
| Mobile | `< 640px` | Bottom nav, compact padding |
| Tablet | `640px - 1023px` | Increased padding |
| Desktop | `≥ 1024px` | Sidebar visible, no bottom nav |

---

## 4. Border Radius

```css
--radius: 0.5rem;  /* 8px base */
--radius-sm: calc(var(--radius) - 4px);  /* 4px */
--radius-md: calc(var(--radius) - 2px);  /* 6px */
--radius-lg: var(--radius);              /* 8px */
--radius-xl: calc(var(--radius) + 4px);  /* 12px */
```

| Element | Radius |
|---------|--------|
| Cards | `var(--radius)` (8px) |
| Buttons | `var(--radius-md)` (6px) |
| Inputs | `var(--radius-md)` (6px) |
| Badges | `9999px` (pill) |
| Route badges | `6px` |

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

### Filter Chips

```svelte
<button class="filter-chip" class:active={isActive}>
  Category Name
</button>
```

### Cards

```svelte
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>
    Content here
  </Card.Content>
</Card>
```

### Mode Cards (Transport Selection)

```svelte
<button class="mode-card" class:selected={isSelected}>
  <span>🚌</span>
  <span>Buses</span>
</button>
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
  padding: 0.875rem;        /* Mobile */
  padding: 1.5rem 2rem;     /* Desktop */
}
```

### Safe Areas (iOS)

```css
padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
```

---

## 8. Animations

### Transitions

```css
/* Standard transition */
transition: all 0.15s ease;

/* Slower for visibility */
transition: all 0.2s ease;
```

### Keyframes

```css
/* Refresh pulse */
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 hsl(217 91% 60% / 0.4); }
  70% { box-shadow: 0 0 0 10px hsl(217 91% 60% / 0); }
  100% { box-shadow: 0 0 0 0 hsl(217 91% 60% / 0); }
}

/* Loading shimmer */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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

---

## 10. Dark Mode

Toggle with class on `<html>`:

```javascript
document.documentElement.classList.toggle('dark');
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

| File | Description |
|------|-------------|
| `src/routes/layout.css` | All CSS custom properties and base styles |
| `src/lib/styles/ttc-theme.css` | TTC-specific overrides (imported in layout.css or app.html) |
| `src/app.html` | Google Fonts Lexend link |
| `components.json` | shadcn-svelte configuration |
| `tailwind.config.ts` | Tailwind configuration (if customized) |

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

*Last updated: December 4, 2025*
