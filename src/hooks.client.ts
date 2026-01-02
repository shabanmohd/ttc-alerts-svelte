import * as Sentry from "@sentry/sveltekit";
import { PUBLIC_SENTRY_DSN } from "$env/static/public";

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  
  // Environment - set based on URL
  environment: typeof window !== 'undefined' && window.location.hostname.includes('version-b')
    ? 'beta'
    : typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'development'
      : 'production',

  // Performance Monitoring - sample 10% of transactions (free tier friendly)
  tracesSampleRate: 0.1,

  // Session Replay - 100% of errors, 1% of sessions (free tier: 50 replays/month)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text for privacy
      maskAllText: false,
      // Block all media (images, videos)
      blockAllMedia: false,
    }),
  ],

  // Filter out common noise
  beforeSend(event) {
    // Ignore errors from extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      frame => frame.filename?.includes('chrome-extension') ||
               frame.filename?.includes('moz-extension')
    )) {
      return null;
    }

    // Ignore network errors that are expected (e.g., offline)
    if (event.exception?.values?.[0]?.value?.includes('Failed to fetch') &&
        typeof navigator !== 'undefined' && !navigator.onLine) {
      return null;
    }

    return event;
  },

  // Ignore these common errors that aren't actionable
  ignoreErrors: [
    // Browser extensions
    /chrome-extension/,
    /moz-extension/,
    // Network errors when offline
    'Network request failed',
    'NetworkError',
    // AbortController cancellations
    'AbortError',
    // Cancelled navigation
    'cancelled',
    // Safari private browsing
    'QuotaExceededError',
    // SvelteKit CSS preload errors (happens when user has stale cache after deployment)
    /Unable to preload CSS/,
    // Dynamic module load failures (stale cache after deployment)
    /Failed to fetch dynamically imported module/,
  ],

  // Add breadcrumbs for debugging
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy console logs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },
});

// Custom error handler
const myErrorHandler = ({ error, event }: { error: unknown; event: unknown }) => {
  console.error("An error occurred:", error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);
