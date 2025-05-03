const CACHE_NAME = 'cache-v3'; // match the version

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js?v=2',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('📦 Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', event => {
  console.log('🔄 Activating new service worker...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑 Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(response =>
      response || fetch(event.request)
    )
  );
});
