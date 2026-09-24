// ==========================================
// SKINOVA - Progressive Web App Service Worker (v3)
// 100% Offline Loading • Instant Cache Eviction • Zero CDN Reliance
// ==========================================

const CACHE_NAME = 'skinova-pwa-v4';

// Essential assets to cache immediately upon installation for 100% offline usage
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/data/clinicalKnowledge.json',
  '/models/skinova_efficientnetb0_int8.onnx',
  '/wasm/ort-wasm-simd-threaded.wasm',
  '/wasm/ort-wasm-simd-threaded.mjs'
];


// 1. Install Event: Cache assets and immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SKINOVA SW v3] Precache skipped for ${url}:`, err);
          })
        )
      );
    })
  );
});

// 2. Activate Event: Immediately purge ALL older caches (v1, v2) and take control of all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SKINOVA SW v3] Evicting stale cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests and non-http(s) schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Navigation / HTML Document requests: NETWORK-FIRST
  // When online, always fetch the latest index.html so script hash updates load immediately.
  // When offline, fall back to cached index.html.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // B. Backend API endpoints (/api/): NETWORK-FIRST with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Offline Mode Active',
            is_offline: true,
            message: 'Device is offline. Running in-browser local processing engine.'
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }

  // C. Static Assets (WASM, Models, JS/CSS, Images): CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          return new Response('Resource unavailable offline', {
            status: 404,
            statusText: 'Not Found',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
