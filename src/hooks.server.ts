import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

/**
 * Server-side request hook - protects admin routes
 * 
 * Admin routes (/admin/*) are restricted to:
 * - localhost requests during development
 * - NOT accessible in production (Cloudflare Pages)
 */
export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  
  // Block all /admin routes in production
  if (pathname.startsWith('/admin')) {
    // Check if running locally (development mode)
    const host = event.request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    
    // Also check X-Forwarded-Host for proxied requests
    const forwardedHost = event.request.headers.get('x-forwarded-host') || '';
    const isForwardedLocalhost = forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1');
    
    if (!isLocalhost && !isForwardedLocalhost) {
      // Return 404 to avoid revealing admin routes exist
      throw error(404, 'Not found');
    }
  }
  
  return resolve(event);
};
