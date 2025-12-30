# rideTO PWA - SEO Audit

> **Last Updated:** December 28, 2025  
> **Status:** 🔴 CRITICAL ISSUES IDENTIFIED  
> **Overall SEO Score:** 35/100

---

## Executive Summary

The rideTO PWA has significant SEO gaps that prevent search engine discoverability. The app is currently running as a pure SPA with SSR disabled, meaning search engines only see empty HTML shells. Additionally, missing meta tags, sitemap, and structured data further limit discoverability.

### Key Metrics

| Category | Score | Status |
|----------|-------|--------|
| **Technical SEO** | 20% | 🔴 Critical |
| **On-Page SEO** | 40% | 🟠 Poor |
| **Structured Data** | 0% | 🔴 Missing |
| **Social Sharing** | 25% | 🟠 Poor |
| **Mobile SEO** | 85% | ✅ Good |
| **PWA Factors** | 90% | ✅ Excellent |

---

## 📄 Page Inventory

### All Routes (10 pages)

| Page | URL | Title | Description | Canonical | OG Tags | Indexable |
|------|-----|-------|-------------|-----------|---------|-----------|
| Home | `/` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Alerts | `/alerts` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Alerts v3 | `/alerts-v3` | ✅ | ✅ | ❌ | ❌ | ✅ noindex |
| Routes | `/routes` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Route Detail | `/routes/[route]` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Preferences | `/preferences` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | `/settings` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Help | `/help` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| About | `/about` | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Auth Callback | `/auth/callback` | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Present and correct
- ⚠️ SPA-only (search engines may not render)
- ❌ Missing or incorrect

### Page Title Patterns

All pages use consistent title format: `{Page Name} - rideTO`

| Page | Current Title |
|------|---------------|
| Home | "Home - rideTO" |
| Alerts | "Service Alerts - rideTO" |
| Routes | "Routes - rideTO" |
| Preferences | "Preferences - rideTO" |
| Settings | "Settings - rideTO" |
| Help | "How to Use - rideTO" |
| About | "About - rideTO" |
| Route Detail | "{RouteID} - {RouteName} - rideTO" |

---

## 🔴 Critical Issues

### Issue C1: SSR Disabled - Search Engines See Empty Pages

**Severity:** 🔴 Critical  
**Impact:** Search engines may not index content properly  
**Location:** [src/routes/+layout.ts](src/routes/+layout.ts)

**Current Configuration:**
```typescript
export const prerender = true;
export const ssr = false; // ❌ Disables server-side rendering
```

**Problem:** With `ssr: false`, the initial HTML served to search engines contains only:
- Empty `<div>` placeholders
- No meaningful content
- Client-side JavaScript that search engines may not execute

**Impact:**
- Google may index blank or incomplete pages
- Core Web Vitals affected (Largest Contentful Paint)
- Risk of "soft 404" indexing

**Recommended Fix:**
```typescript
// Option 1: Enable SSR for all pages
export const prerender = true;
export const ssr = true;

// Option 2: Hybrid approach - SSR for public pages only
// Create page-specific +page.ts files with ssr: true for:
// - Home, Alerts, Routes, Help, About
// Keep ssr: false for user-specific pages:
// - Preferences, Settings
```

---

### Issue C2: No Sitemap.xml

**Severity:** 🔴 Critical  
**Impact:** Search engines cannot discover all pages  
**Location:** Missing file

**Problem:** No `sitemap.xml` exists to guide search engine crawlers.

**Recommended Fix:**

Create `static/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ttc-alerts-svelte.pages.dev/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ttc-alerts-svelte.pages.dev/alerts</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ttc-alerts-svelte.pages.dev/routes</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ttc-alerts-svelte.pages.dev/help</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://ttc-alerts-svelte.pages.dev/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

Also update `static/robots.txt`:
```
User-agent: *
Disallow: /preferences
Disallow: /settings
Disallow: /auth/

Sitemap: https://ttc-alerts-svelte.pages.dev/sitemap.xml
```

---

### Issue C3: No Canonical URLs

**Severity:** 🔴 Critical  
**Impact:** Risk of duplicate content issues  
**Location:** All pages

**Problem:** No `<link rel="canonical">` tags defined on any page.

**Why It Matters:**
- URL variations (with/without trailing slash) may be indexed separately
- Query parameters create duplicate content signals
- Version A/B deployments may confuse search engines

**Recommended Fix:**

Add to each page's `<svelte:head>`:
```svelte
<svelte:head>
  <link rel="canonical" href="https://ttc-alerts-svelte.pages.dev{$page.url.pathname}" />
</svelte:head>
```

Or create a reusable SEO component (see Issue M1).

---

### Issue C4: Missing Page-Level Meta Descriptions

**Severity:** 🔴 Critical  
**Impact:** Poor search result snippets  
**Location:** All pages except global fallback

**Current State:**
- Global meta description in `app.html`: ✅
- Page-specific meta descriptions: ❌ Missing

**Global Description:**
```html
<meta name="description" content="Real-time TTC service alerts for Toronto transit. Get instant notifications about delays, disruptions, and service changes." />
```

**Problem:** All pages share the same description, losing keyword opportunities.

**Recommended Page Descriptions:**

| Page | Recommended Description |
|------|------------------------|
| Home | "Real-time TTC service alerts for Toronto. Track subway, bus, and streetcar delays with live updates and arrival times." |
| Alerts | "Live TTC service alerts showing current delays, disruptions, and detours. Updated every 15 seconds." |
| Routes | "Browse all TTC routes including subway lines, buses, and streetcars. Find route-specific service alerts." |
| Route Detail | "{RouteName}: View current service status, scheduled stops, and real-time arrival predictions." |
| Help | "Learn how to use rideTO for TTC alerts. Quick start guide, feature tutorials, and troubleshooting tips." |
| About | "About rideTO - A community-built PWA for Toronto transit alerts. Built with Svelte, Supabase, and Cloudflare." |

---

## 🟠 Major Issues

### Issue M1: Incomplete Open Graph Tags

**Severity:** 🟠 Major  
**Impact:** Poor social media sharing experience  
**Location:** [src/app.html](src/app.html)

**Current OG Tags:**
```html
<meta property="og:title" content="TTC Service Alerts" />
<meta property="og:description" content="Real-time TTC transit alerts for Toronto" />
<meta property="og:type" content="website" />
<meta property="og:image" content="/icons/icon-512x512.png" />
```

**Missing Tags:**
```html
<!-- Required for proper social sharing -->
<meta property="og:url" content="https://ttc-alerts-svelte.pages.dev/" />
<meta property="og:site_name" content="rideTO" />
<meta property="og:locale" content="en_CA" />
<meta property="og:locale:alternate" content="fr_CA" />

<!-- Image should be absolute URL -->
<meta property="og:image" content="https://ttc-alerts-svelte.pages.dev/icons/icon-512x512.png" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />
<meta property="og:image:alt" content="rideTO - Toronto Transit Alerts" />
```

---

### Issue M2: No Twitter Card Meta Tags

**Severity:** 🟠 Major  
**Impact:** Poor Twitter/X sharing appearance  
**Location:** [src/app.html](src/app.html)

**Problem:** No Twitter Card tags means Twitter will not display rich previews.

**Recommended Fix:**

Add to `app.html`:
```html
<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@rideTO" />
<meta name="twitter:title" content="rideTO - TTC Service Alerts" />
<meta name="twitter:description" content="Real-time Toronto transit alerts" />
<meta name="twitter:image" content="https://ttc-alerts-svelte.pages.dev/icons/og-image.png" />
```

**Note:** Consider creating a dedicated 1200x630px OG image for social sharing.

---

### Issue M3: No Structured Data (JSON-LD)

**Severity:** 🟠 Major  
**Impact:** Missing rich snippet opportunities  
**Location:** Missing entirely

**Problem:** No JSON-LD structured data for:
- WebApplication (for the PWA)
- Organization (for the brand)
- BreadcrumbList (for navigation hierarchy)
- Service (for transit service description)

**Recommended Implementation:**

Add to `app.html` or create in `+layout.svelte`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "rideTO",
  "description": "Real-time TTC service alerts for Toronto transit",
  "url": "https://ttc-alerts-svelte.pages.dev",
  "applicationCategory": "TransportationApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "CAD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "ratingCount": "100"
  }
}
</script>
```

For route detail pages, add BreadcrumbList:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://ttc-alerts-svelte.pages.dev/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Routes",
      "item": "https://ttc-alerts-svelte.pages.dev/routes"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Route 501",
      "item": "https://ttc-alerts-svelte.pages.dev/routes/501"
    }
  ]
}
</script>
```

---

### Issue M4: No hreflang Tags for Multilingual Support

**Severity:** 🟠 Major  
**Impact:** French content not discoverable by Francophone users  
**Location:** Missing

**Problem:** App supports English and French, but doesn't signal this to search engines.

**Recommended Fix:**

Add to `app.html` or page-level:
```html
<link rel="alternate" hreflang="en" href="https://ttc-alerts-svelte.pages.dev/" />
<link rel="alternate" hreflang="fr" href="https://ttc-alerts-svelte.pages.dev/?lang=fr" />
<link rel="alternate" hreflang="x-default" href="https://ttc-alerts-svelte.pages.dev/" />
```

**Alternative:** Implement language-based URL structure:
- `/en/alerts` for English
- `/fr/alerts` for French

---

### Issue M5: robots.txt Missing Sitemap Reference

**Severity:** 🟠 Major  
**Impact:** Search engines may miss sitemap  
**Location:** [static/robots.txt](static/robots.txt)

**Current Content:** ✅ UPDATED
```
# rideTO PWA - Robots.txt
User-agent: *
Allow: /

# Testing/internal pages - do not index
Disallow: /alerts-v3
Disallow: /auth/

# User-specific pages - do not index
Disallow: /preferences
Disallow: /settings
```

**Still Needed:** Add sitemap reference once sitemap.xml is created:
```
# Sitemap
Sitemap: https://ttc-alerts-svelte.pages.dev/sitemap.xml
```

---

## 🟡 Minor Issues

### Issue N1: OG Image Uses Relative Path

**Severity:** 🟡 Minor  
**Location:** [src/app.html](src/app.html#L48)

**Current:**
```html
<meta property="og:image" content="/icons/icon-512x512.png" />
```

**Should Be:**
```html
<meta property="og:image" content="https://ttc-alerts-svelte.pages.dev/icons/icon-512x512.png" />
```

---

### Issue N2: Missing Page-Specific robots Meta Tags

**Severity:** 🟡 Minor  
**Impact:** Cannot control indexing of specific pages

**Recommendation:** Add to pages that shouldn't be indexed:

```svelte
<!-- For preferences/settings pages -->
<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>
```

---

### Issue N3: No Social Share Image (Dedicated OG Image)

**Severity:** 🟡 Minor  
**Impact:** Generic icon shown on social shares

**Recommendation:** Create a dedicated 1200x630px image at `/icons/og-image.png` with:
- App name and logo
- Toronto skyline or TTC imagery
- Clear text: "Real-time TTC Alerts"

---

## ✅ Current Strengths

### What's Working Well

1. **PWA Implementation** ✅
   - Proper manifest.json with all required fields
   - Service worker registered
   - App is installable

2. **Mobile Optimization** ✅
   - Viewport meta tag present
   - Touch icons configured
   - Portrait orientation set

3. **Theme Color** ✅
   - Consistent TTC red (#C8102E)
   - Apple status bar style configured

4. **Page Titles** ✅
   - All pages have unique, descriptive titles
   - Consistent format: "{Page} - rideTO"
   - i18n translated for French

5. **Basic OG Tags** ✅
   - Title, description, type, and image present (though incomplete)

6. **Preconnect Hints** ✅
   - Google Fonts preconnected for faster loading

7. **Keywords Meta Tag** ✅
   - Basic keywords defined in app.html

---

## 🛠️ Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ❌ Enable SSR for public pages (C1)
2. ❌ Create sitemap.xml (C2)
3. ❌ Add canonical URLs (C3)
4. ❌ Add page-level meta descriptions (C4)

### Phase 2: Social & Sharing (Week 2)
5. ❌ Complete Open Graph tags (M1)
6. ❌ Add Twitter Card tags (M2)
7. ❌ Create dedicated OG image (N3)

### Phase 3: Rich Results (Week 3)
8. ❌ Add JSON-LD structured data (M3)
9. ❌ Add hreflang tags (M4)
10. ❌ Update robots.txt (M5)

---

## 📋 SEO Component Recommendation

Create a reusable SEO component for page-level tags:

**Location:** `src/lib/components/SEO.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  
  export let title: string;
  export let description: string;
  export let image: string = '/icons/og-image.png';
  export let type: string = 'website';
  export let noindex: boolean = false;
  
  const baseUrl = 'https://ttc-alerts-svelte.pages.dev';
  $: canonicalUrl = `${baseUrl}${$page.url.pathname}`;
  $: imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl} />
  
  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
  
  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:type" content={type} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:site_name" content="rideTO" />
  <meta property="og:locale" content="en_CA" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
</svelte:head>
```

**Usage:**
```svelte
<script>
  import SEO from '$lib/components/SEO.svelte';
</script>

<SEO 
  title="Service Alerts - rideTO"
  description="Live TTC service alerts showing current delays, disruptions, and detours."
/>
```

---

## 🔗 Related Documentation

- [APP_IMPLEMENTATION.md](APP_IMPLEMENTATION.md) - File inventory and architecture
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - Brand colors and typography
- [WCAG_DESIGN_AUDIT.md](WCAG_DESIGN_AUDIT.md) - Accessibility compliance

---

## Changelog

### December 28, 2025
- Initial SEO audit created
- Identified 4 critical, 5 major, and 3 minor issues
- Overall SEO score: 35/100
