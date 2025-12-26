# Security Audit Report - TTC Alerts PWA

**Audit Date:** $(date +%Y-%m-%d)  
**Branch:** version-b  
**Auditor:** GitHub Copilot

---

## Executive Summary

| Category | Status | Risk Level |
|----------|--------|------------|
| Authentication | ✅ Minimal (device-based) | Low |
| XSS Protection | ✅ Good | Low |
| Data Handling | ✅ Good | Low |
| Dependencies | ⚠️ Vulnerabilities Found | Medium |
| Edge Functions | ⚠️ Some Improvements Needed | Medium |
| CORS | ⚠️ Permissive | Low-Medium |
| RLS (Row Level Security) | ⚠️ Not Configured | Medium |

**Overall Risk Assessment:** LOW-MEDIUM

---

## 1. Authentication & Authorization

### Current State
- **No user authentication** - App uses device-based preferences
- Device fingerprinting for preferences (stored in Supabase `device_preferences`)
- Local storage for bookmarks and UI preferences
- Cloudflare Turnstile for feedback form CAPTCHA protection

### Findings
| Finding | Risk | Status |
|---------|------|--------|
| No user accounts/passwords | N/A | By Design ✅ |
| Device preferences use fingerprint | Low | Acceptable |
| Turnstile CAPTCHA on feedback | Low | Implemented ✅ |

### Recommendations
- ✅ Current design is appropriate for a public transit info app
- No sensitive user data is collected

---

## 2. XSS (Cross-Site Scripting) Protection

### Findings
| Finding | Risk | Status |
|---------|------|--------|
| No `@html` directive usage | N/A | Safe ✅ |
| No `innerHTML` usage | N/A | Safe ✅ |
| No `dangerouslySetInnerHTML` | N/A | Safe ✅ |
| No `eval()` or `Function()` calls | N/A | Safe ✅ |
| Svelte auto-escapes template expressions | N/A | Safe ✅ |

### Summary
**✅ PASS** - No XSS vulnerabilities detected. Svelte's default escaping provides strong protection.

---

## 3. Data Handling & Storage

### Client-Side Storage
| Data | Storage | Sensitivity | Risk |
|------|---------|-------------|------|
| Language preference | localStorage | None | ✅ Low |
| Theme preference | localStorage | None | ✅ Low |
| Text size preference | localStorage | None | ✅ Low |
| Bookmarked stops | IndexedDB | None | ✅ Low |
| Route preferences | IndexedDB | None | ✅ Low |

### Server-Side Storage (Supabase)
| Table | Data Type | Access | Risk |
|-------|-----------|--------|------|
| `alert_cache` | Public transit alerts | Public read | ✅ Low |
| `incident_threads` | Alert threads | Public read | ✅ Low |
| `planned_maintenance` | Scheduled work | Public read | ✅ Low |
| `device_preferences` | User settings | Device-based | ✅ Low |

### Findings
- No PII (Personally Identifiable Information) stored
- No payment data
- No passwords or tokens stored client-side
- Supabase anon key is public (by design)

### Summary
**✅ PASS** - Data handling is appropriate for a public transit app.

---

## 4. Dependencies - Vulnerabilities (CVEs)

### NPM Audit Results

```
npm audit report

cookie  <0.7.0 - GHSA-pxg6-pf52-xh8x (Low)
  Via: @sveltejs/kit

esbuild  <=0.24.2 - GHSA-67mh-4wv8-2f99 (Moderate)
  Via: svelte-i18n

Total: 9 vulnerabilities (7 low, 2 moderate)
```

### Detailed Analysis

| Package | Vulnerability | Severity | Impact | Recommendation |
|---------|--------------|----------|--------|----------------|
| `cookie` (via @sveltejs/kit) | GHSA-pxg6-pf52-xh8x | Low | Cookie parsing OOB chars | Wait for upstream fix |
| `esbuild` (via svelte-i18n) | GHSA-67mh-4wv8-2f99 | Moderate | Dev server request exposure | Dev only, no prod impact |

### Risk Assessment
- **cookie vulnerability**: Only affects server-side cookie parsing. This app is a **static PWA** - no server-side cookie handling. **No risk in production.**
- **esbuild vulnerability**: Only affects development server. **No risk in production.**

### Recommendations
```bash
# These cannot be fixed without breaking changes
# Monitor for upstream fixes:
# - @sveltejs/kit: https://github.com/sveltejs/kit/releases
# - svelte-i18n: https://github.com/kaisermann/svelte-i18n/releases

# Current workaround: None needed (no production impact)
```

---

## 5. Edge Functions Security

### 5.1 submit-feedback/index.ts

| Check | Status | Notes |
|-------|--------|-------|
| CORS headers | ✅ | Properly configured |
| Turnstile verification | ✅ | Required before submission |
| Input validation | ✅ | Type, title, description validated |
| Email regex validation | ✅ | Basic format check |
| Rate limiting | ⚠️ | Relies on Turnstile only |
| Secrets in env vars | ✅ | TURNSTILE_SECRET_KEY, RESEND_API_KEY |

**Issues Found:**
1. ⚠️ **Email in HTML template** - User-provided email is inserted into HTML without encoding
2. ⚠️ **No rate limiting** beyond Turnstile (bot protection only)

**Recommendations:**
```typescript
// In submit-feedback/index.ts, encode email for HTML safety:
const safeEmail = email?.replace(/[<>&"']/g, c => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
}[c] || c));
```

### 5.2 get-eta/index.ts

| Check | Status | Notes |
|-------|--------|-------|
| CORS headers | ✅ | Properly configured |
| Method restriction | ✅ | POST only |
| Input validation | ✅ | stopId required |
| External API calls | ✅ | TTC NextBus, TTC NTAS |
| Error handling | ✅ | Graceful error responses |
| Cache headers | ✅ | 30-second cache |

**No security issues found.**

### 5.3 poll-alerts/index.ts

| Check | Status | Notes |
|-------|--------|-------|
| CORS headers | ✅ | Properly configured |
| Service role key | ✅ | From env var |
| External API calls | ✅ | BlueSky, TTC API |
| Database operations | ✅ | Uses Supabase client |

**No security issues found.**

### 5.4 scrape-maintenance/index.ts

| Check | Status | Notes |
|-------|--------|-------|
| CORS headers | ✅ | Properly configured |
| Service role key | ✅ | From env var |
| External API calls | ✅ | TTC Sitecore API |
| Database operations | ✅ | Uses Supabase client |

**No security issues found.**

---

## 6. CORS Configuration

### Current State
All Edge Functions use:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Assessment
| Finding | Risk | Notes |
|---------|------|-------|
| `Allow-Origin: *` | Low | Acceptable for public read-only APIs |
| No credentials mode | Low | No cookies/auth passed |

### Recommendations
For the `submit-feedback` function (the only write operation), consider restricting CORS:
```typescript
// Optional: Restrict feedback submissions to your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ttc-alerts-svelte.pages.dev',
  // ...
};
```

**Note:** This is optional since Turnstile already provides bot protection.

---

## 7. Row Level Security (RLS)

### Current State
**⚠️ No RLS policies detected** in migration files.

### Assessment
For a public transit app with no user authentication:
- Alert data is intentionally public
- No user-specific data needs protection
- Device preferences use fingerprint-based access (not RLS)

### Recommendations
If you add user authentication in the future, implement RLS:
```sql
-- Example: Protect device_preferences
ALTER TABLE device_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own preferences"
ON device_preferences
FOR ALL
USING (device_fingerprint = current_setting('app.device_fingerprint', true));
```

**Current Status:** Not required for current architecture.

---

## 8. Other Security Considerations

### 8.1 Service Worker
- **sw.js** is a basic caching service worker
- No sensitive data caching
- ✅ Safe

### 8.2 Environment Variables
| Variable | Location | Exposure Risk |
|----------|----------|---------------|
| `VITE_SUPABASE_URL` | Client | ✅ Public by design |
| `VITE_SUPABASE_ANON_KEY` | Client | ✅ Public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ✅ Protected |
| `TURNSTILE_SECRET_KEY` | Server only | ✅ Protected |
| `RESEND_API_KEY` | Server only | ✅ Protected |

### 8.3 API Keys in Code
**✅ PASS** - No hardcoded API keys found in source code.

---

## 9. Action Items

### High Priority
None

### Medium Priority
| # | Item | File | Effort |
|---|------|------|--------|
| 1 | HTML-encode email in feedback template | `submit-feedback/index.ts` | 5 min |
| 2 | Monitor dependency updates | `package.json` | Ongoing |

### Low Priority (Optional)
| # | Item | Notes |
|---|------|-------|
| 3 | Restrict CORS on feedback endpoint | Only if spam becomes an issue |
| 4 | Add rate limiting to feedback | Only if abuse detected |

---

## 10. Compliance Considerations

### GDPR / Privacy
- ✅ No PII collected
- ✅ No user accounts
- ✅ Device preferences are anonymous
- ✅ Optional email in feedback (clearly labeled)

### Accessibility
- Not a security issue but noted: App uses accessible fonts (Lexend)
- Text sizing options available

---

## Summary

The TTC Alerts PWA has a **LOW-MEDIUM security risk profile**, which is appropriate for its purpose as a public transit information app.

**Key Strengths:**
- No user authentication = minimal attack surface
- Svelte's auto-escaping prevents XSS
- Turnstile protects the only user-input endpoint
- Secrets properly stored in environment variables

**Areas for Improvement:**
- HTML-encode user input in feedback email template
- Keep dependencies updated for security patches

**No Critical Vulnerabilities Found.**

---

*This report covers the `version-b` branch as of the audit date. Security should be re-evaluated when adding user authentication or storing sensitive data.*
