const CACHE_NAME = 'cache-v2'; // ← update this version each deployment

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js?v=2',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: cache new files
self.addEventListener('install', event => {
  console.log('📦 Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // Force activate immediately
});

// Activate: delete old caches
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
  self.clients.claim(); // Control all pages
});

// Fetch: respond from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(response =>
      response || fetch(event.request)
    )
  );
});
