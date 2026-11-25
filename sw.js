/* ==================== Service Worker v206 ==================== */
// v206：生成海报入口从赛后结束页迁移到历史对局——历史列表条目可直接出海报，详情弹窗新增「生成海报」按钮；
//       海报数据改由历史记录读取，默认仍不显示身份
// v205：赛后战绩海报（Canvas 生成 PNG）、全量逐局/逐轮/逐身份 CSV 与全量 JSON 导出、角色战绩榜
// v204：下架发牌模式（删除发牌向导、断点续发、看我的牌及其全部状态与样式），缓存名升级以整体重建
// v203 策略（根因修复：iOS/Android 卡顿白屏）
//  ① install 只预缓存核心壳（HTML / JS / CSS / manifest），不再预缓存 voice 目录下的 mp3
//     —— v201 在 install 阶段硬编码 258 段音频（约 8MB），github.io 实测 39KB/s，等于每次访问先等十几分钟才出首屏
//  ② 音频改为运行时 cache-first：本局念到哪段下哪段，下过的段永久复用（毫秒命中），不再整包下载
//  ③ 升级到本版本时，把旧缓存里已下载的 /voice/ 音频迁移进新缓存，用户不必为换版本重下
//  ④ 沿用 v198 的导航 network-first(1.2s 回退)、静态 cache-first、跨域接口完全不接管
// v201（历史）：音色收敛为晓晓 + 云扬；v199：音频按 pathname 忽略 Range 命中缓存
var CACHE_NAME = 'avalon-pwa-v206';
var CACHE_PREFIX = 'avalon-pwa-';
var VOICE_SEG = '/voice/';
// 核心壳：首屏必显资源。音频一律不进这里（按需下载）
var ASSETS = [
  './',
  './index.html',
  './style.css?v=v206',
  './app-v206.min.js',
  './images/parchment-texture.webp',
  './manifest.json',
  './voice/manifest.json'
];

function isVoiceRequest(req) {
  try { return new URL(req.url).pathname.indexOf(VOICE_SEG) !== -1; } catch (e) { return false; }
}
// 旧缓存里的音频段迁移进新缓存（音频按文本 hash 命名、内容永久有效，迁移可省下数 MB 重下）
function migrateVoiceSegments(oldKeys, cache) {
  if (!oldKeys.length) return Promise.resolve(0);
  var copied = 0;
  return Promise.all(oldKeys.map(function (key) {
    return caches.open(key).then(function (old) {
      return old.keys().then(function (reqs) {
        var list = reqs.filter(isVoiceRequest);
        var chain = Promise.resolve();
        list.forEach(function (req) {
          chain = chain.then(function () {
            return cache.match(req, { ignoreSearch: true }).then(function (hit) {
              if (hit) return;
              return old.match(req, { ignoreSearch: true }).then(function (resp) {
                if (!resp || resp.status !== 200) return;
                return cache.put(new URL(req.url).pathname, resp).then(function () { copied++; });
              });
            });
          }).catch(function () {});
        });
        return chain;
      });
    }).catch(function () { return 0; });
  })).then(function () { return copied; });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // v202：只预缓存核心壳（7 项，约 0.5MB），install 秒级完成，不再与首屏抢带宽
      return Promise.allSettled(ASSETS.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[SW] Failed to cache:', url, err && (err.message || err));
        });
      }));
    }).then(function () {
      // 立即激活新 SW，避免等待旧 SW 释放造成更新循环
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      var oldKeys = keys.filter(function (k) { return k !== CACHE_NAME; });
      var prefixed = oldKeys.filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0; });
      return caches.open(CACHE_NAME).then(function (cache) {
        return migrateVoiceSegments(prefixed, cache).then(function (copied) {
          if (copied) console.log('[SW] v202 已迁移旧缓存音频段：' + copied);
          // 只删本项目前缀的旧缓存，避免同源下其他 PWA（如 ms-exp-calc）的缓存被误删
          return Promise.all(prefixed.map(function (k) { return caches.delete(k); }));
        });
      });
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 静态资源：cache-first（发版时 CACHE_NAME 变更会整体重建，故不会读到陈旧资源）
function cacheFirst(cache, request) {
  return cache.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (resp) {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(request, resp.clone());
      }
      return resp;
    });
  });
}
function networkFirst(cache, request, timeoutMs) {
  return new Promise(function (resolve) {
    var settled = false;
    var done = function (resp) {
      if (settled) return;
      settled = true;
      resolve(resp);
    };
    var timer = setTimeout(function () {
      if (settled) return;
      cache.match(request).then(function (cached) {
        if (cached) done(cached);
      }).catch(function () {});
    }, timeoutMs);
    fetch(request).then(function (resp) {
      clearTimeout(timer);
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(request, resp.clone());
      }
      done(resp);
    }).catch(function () {
      clearTimeout(timer);
      cache.match(request).then(function (cached) {
        if (cached) done(cached);
        else done(Response.error());
      }).catch(function () { done(Response.error()); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  // 跨域（Supabase REST / Realtime 等）一律直连，不写缓存
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE_NAME).then(function (cache) {
      return networkFirst(cache, e.request, 1200);
    }));
    return;
  }
  // 音频：运行时 cache-first —— 命中直接返回（忽略 Search，兼容 Safari 的 Range 请求），
  // 未命中才回源并写入缓存；下载过的段落永久复用，换版本也会在 activate 里被迁移过来
  if (url.pathname.indexOf(VOICE_SEG) !== -1) {
    e.respondWith(caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(url.pathname, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (resp) {
          if (resp && resp.status === 200 && resp.type === 'basic') cache.put(url.pathname, resp.clone());
          return resp;
        }).catch(function () { return Response.error(); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE_NAME).then(function (cache) {
    return cacheFirst(cache, e.request);
  }));
});
