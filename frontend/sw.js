// ── PrintFlow Service Worker v1.7.0 ──────────────────────
const CACHE_NAME    = 'printflow-v2.9.8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/api.js',
  '/js/app.js',
  '/js/nfc.js',
  '/js/components.js',
  '/js/tabs/dashboard.js',
  '/js/tabs/filaments.js',
  '/js/tabs/prints.js',
  '/js/tabs/printers.js',
  '/js/tabs/projects.js',
  '/js/tabs/maintenance.js',
  '/js/tabs/stats.js',
  '/js/tabs/library.js',
  '/js/tabs/settings.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
];

// ── Installation ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activation — nettoyage ancien cache ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — stratégie Network First pour API, Cache First pour assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API — toujours réseau (pas de cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Hors ligne' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        })
      )
    );
    return;
  }

  // Assets statiques — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Notifications push désactivées
