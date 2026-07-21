/* ==================== Service Worker v156 ==================== */
// SW strategy: stale-while-revalidate
var CACHE_NAME = 'avalon-pwa-v156';
var ASSETS = [
  './',
  './index.html',
  './style.css?v=v156',
  './app.js?v=v156',
  './vendor/supabase.min.js',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.warn('[SW] Failed to cache:', url, err && (err.message || err));
        });
      }));
    })
  );
  // 不在此处 skipWaiting，等用户点击横幅后由 postMessage 触发
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        // 只删除旧版本的缓存，保留当前版本
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var fetched = fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) {
            cache.put(e.request, resp.clone());
          }
          return resp;
        });
        return cached || fetched;
      });
    })
  );
});
