/* ==================== Service Worker v192 ==================== */
// v192 策略：
//  - 导航请求(HTML)：network-first（1.2s 超时回落缓存），保证新版本立即生效且弱网可用
//  - 其它同源静态资源：cache-first（有缓存直取，不再回源，最大程度省流量）
//  - 跨域接口（Supabase REST / Realtime）：完全不接管，避免读到陈旧数据
var CACHE_NAME = 'avalon-pwa-v192';
var ASSETS = [
  './',
  './index.html',
  './style.css?v=v192',
  './app-v192.js',
  './images/parchment-texture.webp',
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
    }).then(function() {
      // 立即激活新 SW，避免等待旧 SW 释放造成更新循环
      return self.skipWaiting();
    })
  );
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
// 静态资源：cache-first（发版时 CACHE_NAME 变更会整体重建，故不会读到陈旧资源）
function cacheFirst(cache, request) {
  return cache.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(resp) {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(request, resp.clone());
      }
      return resp;
    });
  });
}
function networkFirst(cache, request, timeoutMs) {
  return new Promise(function(resolve) {
    var settled = false;
    var done = function(resp) {
      if (settled) return;
      settled = true;
      resolve(resp);
    };
    var timer = setTimeout(function() {
      if (settled) return;
      cache.match(request).then(function(cached) {
        if (cached) done(cached);
      }).catch(function() {});
    }, timeoutMs);
    fetch(request).then(function(resp) {
      clearTimeout(timer);
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(request, resp.clone());
      }
      done(resp);
    }).catch(function() {
      clearTimeout(timer);
      cache.match(request).then(function(cached) {
        if (cached) done(cached);
        else done(Response.error());
      }).catch(function() { done(Response.error()); });
    });
  });
}
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  // 跨域（Supabase REST / Realtime 等）一律直连，不写缓存
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE_NAME).then(function(cache) {
      return networkFirst(cache, e.request, 1200);
    }));
    return;
  }
  e.respondWith(caches.open(CACHE_NAME).then(function(cache) {
    return cacheFirst(cache, e.request);
  }));
});
