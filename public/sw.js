const CACHE_NAME = 'ecotrace-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  const installEvent = event as ExtendableEvent;
  installEvent.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  fetchEvent.respondWith(
    caches.match(fetchEvent.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(fetchEvent.request);
      })
  );
});
