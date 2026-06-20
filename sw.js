/* ==================== Service Worker v58 ==================== */
// sw.js - v58
var CACHE_NAME = 'avalon-pwa-v58';
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Network-First 策略：确保始终获取最新文件，网络不可用时才回退缓存
self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).then(function(networkResponse) {
      if (networkResponse && networkResponse.status === 200) {
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
