# SEO Pages Summary

Generated: January 13, 2026

This document lists all indexable pages in the rideTO app with their SEO metadata.

---

## Indexable Pages (6)

### 1. Home (`/`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/+page.svelte` |
| **Title** | `rideTO - Live TTC Alerts & Transit Tracker` |
| **Title Source** | i18n: `pages.home.title` |
| **Description** | Track TTC service alerts, subway closures, elevator outages and delays in real-time. Free, accessible transit tracker for Toronto subway, bus and streetcar routes. |
| **Indexable** | ✅ Yes |

---

### 2. About (`/about`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/about/+page.svelte` |
| **Title** | `About - rideTO` |
| **Title Source** | i18n: `about.pageTitle` |
| **Description** | Learn about rideTO, a free transit companion built for Toronto commuters. Discover our data sources, accessibility commitment, and privacy practices. |
| **Indexable** | ✅ Yes |

---

### 3. Help (`/help`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/help/+page.svelte` |
| **Title** | `How to Use - rideTO` |
| **Title Source** | i18n: `help.pageTitle` |
| **Description** | Get started with rideTO. Learn how to save favorite stops, track routes, understand alert types, and make the most of your Toronto transit experience. |
| **Indexable** | ✅ Yes |

---

### 4. Routes (`/routes`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/routes/+page.svelte` |
| **Title** | `Routes - rideTO` |
| **Title Source** | i18n: `pages.routes.title` |
| **Description** | Browse all TTC routes including subway lines, streetcars, express buses, and Blue Night service. Save your favorites for quick, easy access. |
| **Indexable** | ✅ Yes |

---

### 5. Route Detail (`/routes/[route]`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/routes/[route]/+page.svelte` |
| **Title** | `{routeId} {routeName} - rideTO` (dynamic) |
| **Title Source** | Inline template |
| **Description** | Real-time service alerts, stop schedules, and live updates for TTC {routeId} {routeName}. Stay informed about delays and disruptions on your route. |
| **Indexable** | ✅ Yes |

**Example for route 504 King:**
- Title: `504 King - rideTO`
- Description: `Real-time service alerts, stop schedules, and live updates for TTC 504 King. Stay informed about delays and disruptions on your route.`

---

### 6. Alerts (`/alerts`)

| Property | Value |
|----------|-------|
| **File** | `src/routes/alerts/+page.svelte` |
| **Title** | `Service Alerts - rideTO` |
| **Title Source** | i18n: `pages.alerts.title` |
| **Description** | Live TTC service alerts for subway delays, bus detours, streetcar disruptions, and elevator outages. Real-time updates to keep Toronto commuters informed. |
| **Indexable** | ✅ Yes |

---

## Non-Indexable Pages (2)

### 7. Alerts V3 (`/alerts-v3`) — `noindex`

| Property | Value |
|----------|-------|
| **File** | `src/routes/alerts-v3/+page.svelte` |
| **Title** | `Service Alerts - rideTO` |
| **Title Source** | i18n: `pages.alerts.title` |
| **Description** | Real-time TTC transit service alerts for Toronto |
| **Indexable** | ❌ No (`noindex={true}`) |
| **Reason** | Legacy/testing version |

---

### 8. Settings (`/settings`) — `noindex`

| Property | Value |
|----------|-------|
| **File** | `src/routes/settings/+page.svelte` |
| **Title** | `Settings - rideTO` |
| **Title Source** | i18n: `pages.settings.title` |
| **Description** | Customize your rideTO experience - manage saved stops and routes, change language, theme settings, and clear app data. |
| **Indexable** | ❌ No (`noindex={true}`) |
| **Reason** | User-specific settings page |

---

## Quick Reference Table

| Page | URL | Title | Indexable |
|------|-----|-------|-----------|
| Home | `/` | rideTO - Live TTC Alerts & Transit Tracker | ✅ |
| About | `/about` | About - rideTO | ✅ |
| Help | `/help` | How to Use - rideTO | ✅ |
| Routes | `/routes` | Routes - rideTO | ✅ |
| Route Detail | `/routes/[route]` | {route} - rideTO | ✅ |
| Alerts | `/alerts` | Service Alerts - rideTO | ✅ |
| Alerts V3 | `/alerts-v3` | Service Alerts - rideTO | ❌ |
| Settings | `/settings` | Settings - rideTO | ❌ |

---

## Notes

- All titles use i18n translation keys except `/routes/[route]` which builds dynamically
- All descriptions are hardcoded in Svelte component props (not in i18n)
- The SEO component is located at `src/lib/components/SEO.svelte`
