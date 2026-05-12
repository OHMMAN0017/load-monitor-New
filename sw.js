const CACHE = 'load-monitor-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/utils.js',
  './js/cache.js',
  './js/charts.js',
  './js/weather.js',
  './js/ui.js',
  './js/data.js',
  './js/app.js',
  './icons/icon.svg',
];

// Install — cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch — network-first for dynamic data, cache-first for app shell
self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Dynamic data (CSV + weather API) — network first, no cache fallback needed here
  // (app has its own localStorage cache for CSV)
  if (url.includes('docs.google.com') || url.includes('open-meteo.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // CDN scripts — cache first, cache on first network hit
  if (url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  // App shell — cache first, network fallback, 503 if both fail
  e.respondWith(
    caches.match(e.request).then(
      (cached) => cached || fetch(e.request).catch(() => new Response('Offline', { status: 503 })),
    ),
  );
});
