/* ==================== Service Worker v82 ==================== */
// sw.js - v82
var CACHE_NAME = 'avalon-pwa-v82';
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
  // 不在 install 里自动 skipWaiting，由页面检测到新版本时主动触发
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
  // clients.claim() 在每次 skipWaiting 后立即接管所有页面，
  // 移动端可能导致 controllerchange 反复触发。改为由下一次刷新自然接管。
});

// 允许页面主动触发 skipWaiting，新 SW 激活后立即接管
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
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
