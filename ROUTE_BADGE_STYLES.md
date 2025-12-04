# TTC Route Badge Styles - Implementation Reference

**Last Updated:** January 2025
**Reference:** TTC Official Website + Brand Guidelines
**Status:** Single Source of Truth for Route Badge Styling

This document defines the visual styling for route badges in the TTC Service Alerts application.

## Related Documentation

This file is part of the route badge documentation system. For complete route information:

- **[TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)** - Complete bus route reference with all route numbers, names, and badge styles
- **[TTC-STREETCAR-ROUTES.md](TTC-STREETCAR-ROUTES.md)** - Complete streetcar route reference with all route numbers, names, and badge styles
- **[route-badges-test.html](client/route-badges-test.html)** - Visual testing page showing all badge styles in action
- **[app.js](client/src/js/app.js)** - Implementation of `getRouteColor()` function

**⚠️ Important:** When adding new routes or modifying badge styles, update ALL related documentation files to maintain consistency.

---

## Color Palette

### Official TTC Brand Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **TTC Red** | `#C8102E` | Regular buses, streetcars, community routes |
| **TTC Blue Night** | `#003DA5` | Night service buses (300-series) |
| **TTC Express Green** | `#00853F` | Express buses (900-series), Line 2 |
| **Line 1 Yellow** | `#FFC524` | Line 1 Yonge-University subway |
| **Line 4 Purple** | `#A12F7D` | Line 4 Sheppard subway |

---

## Badge Style Matrix

### Subway Lines

| Route | Name | Background | Text | CSS Classes |
|-------|------|------------|------|-------------|
| Line 1 | Yonge-University | `#FFC524` | Black | `bg-[#FFC524] text-black` |
| Line 2 | Bloor-Danforth | `#00853F` | White | `bg-[#00853F] text-white` |
| Line 4 | Sheppard | `#A12F7D` | White | `bg-[#A12F7D] text-white` |

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 bg-[#FFC524] text-black font-bold text-sm rounded-md">
  Line 1 Yonge-University
</span>
```

---

### Bus Routes

#### Limited Service Routes
**Routes:** 10, 99, 115, 119, 160, 162, 166, 167, 169

| Route | Name | Style |
|-------|------|-------|
| 10 | Van Horne | White with Red Border |
| 99 | Arrow Rd | White with Red Border |
| 115 | Silver Hills | White with Red Border |
| 119 | Torbarrie | White with Red Border |
| 160 | Bathurst North | White with Red Border |
| 162 | Lawrence-Donway | White with Red Border |
| 166 | Toryork | White with Red Border |
| 167 | Pharmacy North | White with Red Border |
| 169 | Huntingwood | White with Red Border |

**Background:** White
**Border:** 2px solid #C8102E (TTC Red)
**Text Color:** #C8102E (TTC Red)
**CSS Classes:** `border-2 border-[#C8102E] text-[#C8102E] bg-white`

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 border-2 border-[#C8102E] text-[#C8102E] bg-white font-bold text-sm rounded-md">115 Silver Hills</span>
```

**Design Rationale:** White background with red border provides same size and shape as regular routes, distinguishing limited service through color treatment while maintaining visual consistency.

---

#### Night Service Routes (Blue Night Network)
**Routes:** 300-399 series

| Examples | Background | Border | Text | CSS Classes |
|----------|------------|--------|------|-------------|
| 300 Bloor-Danforth | White | `#003DA5` | `#003DA5` | `border-2 border-[#003DA5] text-[#003DA5] bg-white` |
| 307 Bathurst | White | `#003DA5` | `#003DA5` | `border-2 border-[#003DA5] text-[#003DA5] bg-white` |
| 320 Yonge | White | `#003DA5` | `#003DA5` | `border-2 border-[#003DA5] text-[#003DA5] bg-white` |
| 329 Dufferin | White | `#003DA5` | `#003DA5` | `border-2 border-[#003DA5] text-[#003DA5] bg-white` |

**Reference:** TTC website states "Blue Night Network routes have white and blue route lozenges and 300-series route numbers"

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 border-2 border-[#003DA5] text-[#003DA5] bg-white font-bold text-sm rounded-md">
  300 Bloor-Danforth
</span>
```

**TTC Website HTML Reference:**
```html
<span class="RouteNameIcon_RouteNameIcon__0vFeB RouteNameIcon_RouteNameIconLarge__ZylH-
             RouteNameIcon_RouteNameIconNight__24TF- RouteNameIcon_RouteNameIconBus__ETiGX
             RouteNameIcon_RouteNameIconBlue__LtEHE"
      role="img"
      aria-label="300 Bloor-Danforth, Night service, Bus">
  300
</span>
```

---

#### Express Routes
**Routes:** 900-999 series

| Examples | Background | Text | CSS Classes |
|----------|------------|------|-------------|
| 900 Airport Express | `#00853F` | White | `bg-[#00853F] text-white` |
| 925 Don Mills Express | `#00853F` | White | `bg-[#00853F] text-white` |
| 952 Lawrence West Express | `#00853F` | White | `bg-[#00853F] text-white` |

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 bg-[#00853F] text-white font-bold text-sm rounded-md">
  925 Don Mills Express
</span>
```

---

#### Regular Service Routes
**Routes:** 1-191 (excluding limited service routes)

| Examples | Background | Text | CSS Classes |
|----------|------------|------|-------------|
| 7 Bathurst | `#C8102E` | White | `bg-[#C8102E] text-white` |
| 29 Dufferin | `#C8102E` | White | `bg-[#C8102E] text-white` |
| 72 Pape | `#C8102E` | White | `bg-[#C8102E] text-white` |

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 bg-[#C8102E] text-white font-bold text-sm rounded-md">
  72 Pape
</span>
```

---

#### Community Routes
**Routes:** 400, 402, 403, 404, 405, 406

| Route | Name | Background | Border | Text | CSS Classes |
|-------|------|------------|--------|------|-------------|
| 400 | Lawrence Manor | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |
| 402 | Parkdale | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |
| 403 | South Don Mills | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |
| 404 | East York | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |
| 405 | Etobicoke | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |
| 406 | Scarborough-Guildwood | White | `#6B7280` | `#6B7280` | `border-2 border-[#6B7280] text-[#6B7280] bg-white` |

**Background:** White
**Border:** 2px solid #6B7280 (Gray)
**Text Color:** #6B7280 (Gray)
**CSS Classes:** `border-2 border-[#6B7280] text-[#6B7280] bg-white`

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 border-2 border-[#6B7280] text-[#6B7280] bg-white font-bold text-sm rounded-md">
  402 Parkdale
</span>
```

**Design Rationale:** White background with gray border provides same size and shape as regular routes, distinguishing community service through subtle color treatment while maintaining visual consistency.

---

### Streetcar Routes

**Routes:** 501-512

| Route | Name | Background | Text | CSS Classes |
|-------|------|------------|------|-------------|
| 501 | Queen | `#C8102E` | White | `bg-[#C8102E] text-white` |
| 504 | King | `#C8102E` | White | `bg-[#C8102E] text-white` |
| 510 | Spadina | `#C8102E` | White | `bg-[#C8102E] text-white` |

**Visual Example:**
```html
<span class="inline-flex items-center px-3 py-1 bg-[#C8102E] text-white font-bold text-sm rounded-md">
  504 King
</span>
```

---

## Implementation

### JavaScript Function: `getRouteColor()`

**Location:** `client/src/js/app.js:682-716`

```javascript
/**
 * Get TTC route badge color based on route number/type
 */
function getRouteColor(routeText) {
  // Extract numeric part
  const routeNum = parseInt(routeText);

  // Limited service routes - white background with red border and text
  // Buses: 10, 99, 115, 119, 160, 162, 166, 167, 169
  // Streetcars: 507, 508
  const limitedServiceRoutes = [10, 99, 115, 119, 160, 162, 166, 167, 169, 507, 508];
  if (limitedServiceRoutes.includes(routeNum)) {
    return 'border-2 border-[#C8102E] text-[#C8102E] bg-white'; // Red outline with white background
  }

  // Community routes - white background with gray border and text
  // Routes: 400, 402, 403, 404, 405, 406
  const communityRoutes = [400, 402, 403, 404, 405, 406];
  if (communityRoutes.includes(routeNum)) {
    return 'border-2 border-[#6B7280] text-[#6B7280] bg-white'; // Gray outline with white background
  }

  if (!isNaN(routeNum)) {
    // 900-series = Express (Green)
    if (routeNum >= 900 && routeNum < 1000) {
      return 'bg-[#00853F] text-white'; // TTC Express Green
    }
    // 300-series = Blue Night (white background with blue border)
    if (routeNum >= 300 && routeNum < 400) {
      return 'border-2 border-[#003DA5] text-[#003DA5] bg-white'; // TTC Blue Night
    }
  }

  // Subway lines
  if (routeText.toLowerCase().includes('line 1') || routeText.toLowerCase().includes('yonge')) {
    return 'bg-[#FFC524] text-black'; // Line 1 Yellow
  }
  if (routeText.toLowerCase().includes('line 2') || routeText.toLowerCase().includes('bloor')) {
    return 'bg-[#00853F] text-white'; // Line 2 Green
  }
  if (routeText.toLowerCase().includes('line 4') || routeText.toLowerCase().includes('sheppard')) {
    return 'bg-[#A12F7D] text-white'; // Line 4 Purple
  }

  // Default: Regular bus/streetcar (Red)
  return 'bg-[#C8102E] text-white'; // TTC Red
}
```

---

## HTML Usage

### Standard Route Badge
```html
<span class="inline-flex items-center px-3 py-1 ${getRouteColor(route)} font-bold text-sm rounded-md">
  ${escapeHtml(route)}
</span>
```

### Limited Service Badge (White with Red Border)
```html
<span class="inline-flex items-center px-3 py-1 border-2 border-[#C8102E] text-[#C8102E] bg-white font-bold text-sm rounded-md">
  ${escapeHtml(route)}
</span>
```

---

## Accessibility

All route badges include:
- **Sufficient color contrast** (WCAG AA compliant)
- **Font weight: bold** for improved readability
- **Font size: text-sm (0.875rem)** for legibility
- **Padding: px-3 py-1** for touch targets
- **Border radius: rounded-md** for visual consistency

---

## Testing

**Test File:** `route-badges-test.html`

Open `http://localhost:5173/route-badges-test.html` to view all badge styles with:
- Visual examples of all route types
- Color reference table
- Implementation notes
- Side-by-side comparison

---

## Design Decisions

### Why Different Styles?

1. **Limited Service (Outline):** Minimal visual weight distinguishes limited service from regular routes without adding color complexity

2. **Night Routes (Blue):** Official TTC Blue Night Network branding, matches TTC website "white and blue route lozenges"

3. **Express Routes (Green):** Distinctive green indicates premium/express service

4. **Regular Routes (Red):** Classic TTC red maintains brand consistency

5. **Subway Lines (Brand Colors):** Official line colors aid rapid recognition

---

## References

- **TTC Official Website:** https://www.ttc.ca/routes-and-schedules
- **Night Route Example:** https://www.ttc.ca/routes-and-schedules/300/0
- **TTC Brand Guidelines:** Standard TTC color palette
- **DaisyUI Documentation:** https://daisyui.com/components/badge/

---

**Version:** 1.1
**Author:** Claude
**Status:** Implemented
