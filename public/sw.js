const CACHE_VERSION = 'v1.0.9';
const CACHE_NAME = `scrolly-offline-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon?v=3',
  '/apple-icon',
  '/apple-touch-icon.png?v=3',
  '/icons/icon-192.png?v=3',
  '/icons/icon-512.png?v=3',
  '/manifest.json',
  '/icon.svg?v=3',
  '/data/facts/space.json',
  '/data/facts/nature.json',
  '/data/facts/human_body.json',
  '/data/facts/history.json',
  '/data/facts/science.json',
  '/data/facts/records.json',
  '/data/facts/facts.json',
  '/assets/icons8/illustrations/space.png',
  '/assets/icons8/illustrations/space-sub.png',
  '/assets/icons8/illustrations/nature.png',
  '/assets/icons8/illustrations/nature-sub.png',
  '/assets/icons8/illustrations/human_body.png',
  '/assets/icons8/illustrations/human_body-sub.png',
  '/assets/icons8/illustrations/history.png',
  '/assets/icons8/illustrations/history-sub.png',
  '/assets/icons8/illustrations/science.png',
  '/assets/icons8/illustrations/science-sub.png',
  '/assets/icons8/illustrations/records.png',
  '/assets/icons8/illustrations/records-sub.png',
  '/assets/icons8/illustrations/quiz-celebration.png',
  '/assets/icons8/illustrations/duel-arena.png',
  '/assets/icons8/illustrations/offline-state.png',
  '/assets/icons8/icons/dock-leaderboard.png',
  '/assets/icons8/icons/dock-quiz.png',
  '/assets/icons8/icons/dock-explore.png',
  '/assets/icons8/icons/dock-duel.png',
  '/assets/icons8/icons/dock-diploma.png',
  '/assets/icons8/icons/streak-fire.png',
  '/assets/icons8/icons/xp-sparkles.png',
  '/assets/icons8/icons/sound-on.png',
  '/assets/icons8/icons/sound-off.png',
  '/assets/icons8/icons/lang-globe.png',
  '/assets/icons8/icons/theme-sun.png',
  '/assets/icons8/icons/theme-moon.png',
  '/assets/icons8/icons/league-bronze.png',
  '/assets/icons8/icons/league-silver.png',
  '/assets/icons8/icons/league-gold.png',
  '/assets/icons8/icons/league-platinum.png',
  '/assets/icons8/icons/league-diamond.png',
  '/assets/icons8/icons/verified-seal.png',
  '/assets/icons8/icons/badge-star.png',
];

const AD_DOMAIN_PATTERNS = [
  'googlesyndication.com',
  'doubleclick.net',
  'googleadservices.com',
  'adservice.google.',
];

function isAdRequest(url) {
  return (
    AD_DOMAIN_PATTERNS.some((domain) => url.hostname.includes(domain)) ||
    url.pathname.startsWith('/ads/')
  );
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
  const url = new URL(event.request.url);

  // NetworkOnly bypass for live API routes (database facts, likes, telemetry events)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // NetworkOnly bypass for SEO, crawler, ad verification, and AI index endpoints
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

  // Isolate third-party ad requests when offline (or blocked)
  if (isAdRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(null, { status: 204 }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('webpack-hmr')) return;

  // StaleWhileRevalidate for sharded fact JSON datasets
  if (url.pathname.startsWith('/data/facts/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkPromise = fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone());
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

  // On localhost / 127.0.0.1 (next dev), chunks have unhashed filenames: use NetworkFirst with cache fallback
  const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.pathname.startsWith('/_next/static/') && isLocalDev) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CacheFirst for Icons8 3d-fluency local assets, production hashed static assets, manifests, and icons
  if (
    url.pathname.startsWith('/assets/icons8/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        });
      })
    );
    return;
  }

  // NetworkFirst with '/' app-shell fallback for HTML navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Default: NetworkFirst with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
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
