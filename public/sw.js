const CACHE_VERSION = 'v5';
const CACHE_NAME = `scrolly-offline-${CACHE_VERSION}`;
const MAX_RUNTIME_ENTRIES = 60;

// Keep initial install precache minimal (essential PWA shell only)
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png?v=3',
  '/icon.svg?v=3',
];

const AD_AND_TRACKING_PATTERNS = [
  'googlesyndication.com',
  'doubleclick.net',
  'googleadservices.com',
  'adservice.google.',
  'googletagmanager.com',
  'google-analytics.com',
];

function isAdOrTrackingRequest(url) {
  return (
    AD_AND_TRACKING_PATTERNS.some((domain) => url.hostname.includes(domain)) ||
    url.pathname.startsWith('/ads/')
  );
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.length - maxEntries;
      await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)));
    }
  } catch {
    // Ignore storage trim errors
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept Next.js RSC flight requests, live APIs, HMR, or external telemetry
  if (
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return;
  }

  const SEO_AND_BOT_PATHS = new Set([
    '/ads.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
  ]);
  if (SEO_AND_BOT_PATHS.has(url.pathname)) {
    return;
  }

  if (isAdOrTrackingRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(null, { status: 204 }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.pathname.startsWith('/_next/static/') && isLocalDev) {
    return;
  }

  // Bounded StaleWhileRevalidate for offline PWA fact shards
  if (url.pathname.startsWith('/data/facts/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkPromise = fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone()).then(() => {
                  void trimCache(CACHE_NAME, MAX_RUNTIME_ENTRIES);
                });
              }
              return response;
            })
            .catch(() => cached);

          return cached || networkPromise;
        })
      )
    );
    return;
  }

  // CacheFirst for immutable static icons, illustrations, and hashed Next.js assets
  if (
    url.pathname.startsWith('/assets/icons8/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, cloned).then(() => {
                void trimCache(CACHE_NAME, MAX_RUNTIME_ENTRIES);
              })
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // NetworkFirst for explicit HTML navigations with root shell fallback when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, cloned).then(() => {
                void trimCache(CACHE_NAME, MAX_RUNTIME_ENTRIES);
              })
            );
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?openQuiz=daily';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
