const CACHE_NAME = 'ttc-alerts-beta-v4';
const STATIC_CACHE = 'ttc-static-beta-v4';
const DYNAMIC_CACHE = 'ttc-dynamic-beta-v4';
const ALERTS_CACHE = 'ttc-alerts-cache-v1';
const ETA_CACHE = 'ttc-eta-cache-v1';
// Separate cache for SvelteKit immutable assets (hashed, never change)
const IMMUTABLE_CACHE = 'ttc-immutable-v1';

// SW Version for logging and debugging
const SW_VERSION = '4.0.1';

const STATIC_ASSETS = [
  '/',
  '/settings',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Cache size limits
const DYNAMIC_CACHE_LIMIT = 50;
const ALERTS_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour
const MAINTENANCE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const ETA_CACHE_MAX_AGE = 30 * 1000; // 30 seconds (ETAs are time-sensitive)

// Trim cache to limit
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Network first with timed cache fallback (for API requests)
async function networkFirstWithTimeout(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Store with timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-at', Date.now().toString());
      const newResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      cache.put(request, newResponse);
    }
    return response;
  } catch (err) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
      const age = Date.now() - cachedAt;
      // Return cache if within max age, otherwise throw
      if (age < maxAge) {
        console.log('[SW] Serving from cache (age:', Math.round(age / 1000), 's)');
        return cached;
      }
    }
    throw err;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + SW_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // DON'T call skipWaiting() here - let the user choose when to update via toast
  // The message handler below will call skipWaiting when user taps "Refresh"
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + SW_VERSION);
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, CACHE_NAME, ALERTS_CACHE, ETA_CACHE, IMMUTABLE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Taking control of all clients');
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - different strategies based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Vite/SvelteKit dev server requests
  if (url.pathname.startsWith('/.svelte-kit/') || 
      url.pathname.startsWith('/@vite/') ||
      url.pathname.startsWith('/@fs/') ||
      url.pathname.startsWith('/__vite') ||
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.startsWith('/src/')) {
    return;
  }

  // API and Supabase requests - Network first with cache fallback
  if (url.hostname.includes('supabase')) {
    // Alerts cache - 1 hour max age
    if (url.pathname.includes('/rest/v1/alert_cache') || 
        url.pathname.includes('/rest/v1/incident_threads')) {
      event.respondWith(
        networkFirstWithTimeout(request, ALERTS_CACHE, ALERTS_CACHE_MAX_AGE)
          .catch(() => {
            return new Response(
              JSON.stringify({ error: 'You are offline', offline: true }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
      return;
    }
    
    // Maintenance cache - 24 hour max age
    if (url.pathname.includes('/rest/v1/planned_maintenance')) {
      event.respondWith(
        networkFirstWithTimeout(request, ALERTS_CACHE, MAINTENANCE_CACHE_MAX_AGE)
          .catch(() => {
            return new Response(
              JSON.stringify({ error: 'You are offline', offline: true }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
      return;
    }

    // ETA cache - 30 second max age (very time-sensitive)
    if (url.pathname.includes('/functions/v1/get-eta')) {
      event.respondWith(
        networkFirstWithTimeout(request, ETA_CACHE, ETA_CACHE_MAX_AGE)
          .catch(() => {
            return new Response(
              JSON.stringify({ error: 'You are offline', offline: true }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
      return;
    }

    // Other Supabase requests - network only
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are offline', offline: true }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // Non-Supabase API requests - Network only
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline response for API failures
        return new Response(
          JSON.stringify({ error: 'You are offline', offline: true }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // SvelteKit immutable assets (content-hashed, safe to cache forever)
  // These are in /_app/immutable/ and have unique hashes in filenames
  if (url.pathname.startsWith('/_app/immutable/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        // Not in cache, fetch and cache forever (immutable)
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMMUTABLE_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => {
          // If fetch fails for an immutable asset, there's nothing we can do
          // This typically means the asset no longer exists (old deployment)
          // Return a minimal error response instead of failing silently
          console.log('[SW] Failed to fetch immutable asset:', url.pathname);
          return new Response('Asset not found', { status: 404 });
        });
      })
    );
    return;
  }

  // Static assets (icons, manifest) - Cache first with background update
  // Note: Regular CSS/JS NOT in /_app/immutable/ are network-first to avoid stale issues
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cached and update in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        // Not in cache, fetch and cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Non-immutable CSS/JS - Network first to avoid stale asset issues
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // HTML pages - Network first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Other requests - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
            trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline preference changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-preferences') {
    event.waitUntil(syncPreferences());
  }
});

async function syncPreferences() {
  // Get queued preference updates from IndexedDB and sync
  console.log('[SW] Syncing preferences...');
  // Implementation depends on IndexedDB setup
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'TTC Alerts', body: event.data.text() };
  }

  const options = {
    body: data.body || 'New TTC service alert',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'ttc-alert',
    renotify: true,
    requireInteraction: data.severity === 'SEVERE',
    data: {
      url: data.url || '/',
      alertId: data.alertId
    },
    actions: [
      { action: 'view', title: 'View Alert' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TTC Service Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
