// Praetoria Group Service Worker — minimal for TWA/PWA installability
const CACHE_NAME = 'praetoria-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy — no aggressive caching to avoid stale content
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});