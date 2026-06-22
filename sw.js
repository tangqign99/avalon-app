/* ==================== Service Worker v114 ==================== */
// sw.js / service-worker.js - v114
var CACHE_NAME = 'avalon-pwa-v114';
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
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
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
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
  var url = new URL(e.request.url);
  var isAsset = ASSETS.some(function(a) {
    var clean = a.replace('./', '/').split('?')[0];
    return url.pathname.endsWith(clean) || url.pathname === (clean);
  });
  if (!isAsset) return; // skip Supabase API and other dynamic requests

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      });
      return cached || fetchPromise;
    })
  );
});
