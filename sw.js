/* ==================== Service Worker v201 ==================== */
// v201 策略（v201 新增：播报音色收敛为晓晓 + 云扬两色并全部进预缓存（各 129 段，合计约 8.1MB，断网即可播）；
//   v201 面板：顶部进度、音色行上移、当前句强调与自动居中；音色切换即时生效（播放中从当前句重播）；
//   v199 起：夜间语音播报改用预渲染神经音色音频 voice/<音色>/*.mp3，离线预缓存 + 缺文件自动回退系统 TTS）：
// v198 策略（v198 新增：关闭按钮统一放大、iOS 语音拟真自动回退系统中文音色、各人数局默认角色调整、首屏不得抢带宽加载云端 SDK；v192 起：失败票归属；v193 修正派西维尔台词；v194 保护轮成功也可记录失败票出票者；v195 失败票候选仅限该轮执行队伍；v196 历史全字段可改、点击历史记录改按唯一标识定位；v197 删除历史密码改为 123 并在提示中直接显示）：
//  - 导航请求(HTML)：network-first（1.2s 超时回落缓存），保证新版本立即生效且弱网可用
//  - 其它同源静态资源：cache-first（有缓存直取，不再回源，最大程度省流量）
//  - 跨域接口（Supabase REST / Realtime）：完全不接管，避免读到陈旧数据
var CACHE_NAME = 'avalon-pwa-v201';
var ASSETS = [
  './',
  './index.html',
  './style.css?v=v201',
  './app-v201.min.js',
  './images/parchment-texture.webp',
  './manifest.json',
  './voice/manifest.json',
  // v201：预缓存晓晓（默认音色） 129 段
  './voice/xiaoxiao/10dh0rc.mp3',
  './voice/xiaoxiao/11gazc2.mp3',
  './voice/xiaoxiao/11pa6xz.mp3',
  './voice/xiaoxiao/11tii4l.mp3',
  './voice/xiaoxiao/12srjhd.mp3',
  './voice/xiaoxiao/13b25ti.mp3',
  './voice/xiaoxiao/13uyv4r.mp3',
  './voice/xiaoxiao/14a3a6x.mp3',
  './voice/xiaoxiao/14tva51.mp3',
  './voice/xiaoxiao/176ebdo.mp3',
  './voice/xiaoxiao/17pkwjn.mp3',
  './voice/xiaoxiao/17rm8zx.mp3',
  './voice/xiaoxiao/17uzuq2.mp3',
  './voice/xiaoxiao/17v1plx.mp3',
  './voice/xiaoxiao/18pk8xy.mp3',
  './voice/xiaoxiao/18wn76h.mp3',
  './voice/xiaoxiao/18ynvrl.mp3',
  './voice/xiaoxiao/19wgy1q.mp3',
  './voice/xiaoxiao/1a3s1bv.mp3',
  './voice/xiaoxiao/1a63fod.mp3',
  './voice/xiaoxiao/1blas32.mp3',
  './voice/xiaoxiao/1c5uyo5.mp3',
  './voice/xiaoxiao/1cg21s4.mp3',
  './voice/xiaoxiao/1chfe00.mp3',
  './voice/xiaoxiao/1chfe01.mp3',
  './voice/xiaoxiao/1daos15.mp3',
  './voice/xiaoxiao/1dcj0sf.mp3',
  './voice/xiaoxiao/1dz5jmv.mp3',
  './voice/xiaoxiao/1hkrhdb.mp3',
  './voice/xiaoxiao/1i2vo95.mp3',
  './voice/xiaoxiao/1it72eh.mp3',
  './voice/xiaoxiao/1izpia.mp3',
  './voice/xiaoxiao/1j034np.mp3',
  './voice/xiaoxiao/1j3bldx.mp3',
  './voice/xiaoxiao/1j3bldy.mp3',
  './voice/xiaoxiao/1kek7mx.mp3',
  './voice/xiaoxiao/1lm5e47.mp3',
  './voice/xiaoxiao/1lmhoar.mp3',
  './voice/xiaoxiao/1m4mpbj.mp3',
  './voice/xiaoxiao/1mg8wrw.mp3',
  './voice/xiaoxiao/1mr9ziz.mp3',
  './voice/xiaoxiao/1mvng4.mp3',
  './voice/xiaoxiao/1navi1q.mp3',
  './voice/xiaoxiao/1ng0bu7.mp3',
  './voice/xiaoxiao/1ntvmn5.mp3',
  './voice/xiaoxiao/1oar9ck.mp3',
  './voice/xiaoxiao/1obr41y.mp3',
  './voice/xiaoxiao/1p2bsdp.mp3',
  './voice/xiaoxiao/1p3q7kh.mp3',
  './voice/xiaoxiao/1p5kayz.mp3',
  './voice/xiaoxiao/1p8u2oe.mp3',
  './voice/xiaoxiao/1p9eqm8.mp3',
  './voice/xiaoxiao/1pbkux7.mp3',
  './voice/xiaoxiao/1pw6a98.mp3',
  './voice/xiaoxiao/1rb5klx.mp3',
  './voice/xiaoxiao/1reyble.mp3',
  './voice/xiaoxiao/1rkyvjm.mp3',
  './voice/xiaoxiao/1s87ntj.mp3',
  './voice/xiaoxiao/1szzen9.mp3',
  './voice/xiaoxiao/1tlcy24.mp3',
  './voice/xiaoxiao/1uw84gp.mp3',
  './voice/xiaoxiao/1vs2nly.mp3',
  './voice/xiaoxiao/1x185nh.mp3',
  './voice/xiaoxiao/2imhif.mp3',
  './voice/xiaoxiao/2wgb0s.mp3',
  './voice/xiaoxiao/2zftm0.mp3',
  './voice/xiaoxiao/3l8xaa.mp3',
  './voice/xiaoxiao/3l8xab.mp3',
  './voice/xiaoxiao/3qnvgp.mp3',
  './voice/xiaoxiao/3qnvgq.mp3',
  './voice/xiaoxiao/3tl6ys.mp3',
  './voice/xiaoxiao/3vhne2.mp3',
  './voice/xiaoxiao/3wzmp.mp3',
  './voice/xiaoxiao/42waw.mp3',
  './voice/xiaoxiao/43knbl.mp3',
  './voice/xiaoxiao/47rls.mp3',
  './voice/xiaoxiao/4hsmuv.mp3',
  './voice/xiaoxiao/58cn5v.mp3',
  './voice/xiaoxiao/5nelil.mp3',
  './voice/xiaoxiao/67g788.mp3',
  './voice/xiaoxiao/7j4vk2.mp3',
  './voice/xiaoxiao/7jb1k8.mp3',
  './voice/xiaoxiao/7p5fia.mp3',
  './voice/xiaoxiao/85ybro.mp3',
  './voice/xiaoxiao/8wa48a.mp3',
  './voice/xiaoxiao/a60pjs.mp3',
  './voice/xiaoxiao/atsto5.mp3',
  './voice/xiaoxiao/b24tpq.mp3',
  './voice/xiaoxiao/bj6422.mp3',
  './voice/xiaoxiao/bl5c66.mp3',
  './voice/xiaoxiao/blaohl.mp3',
  './voice/xiaoxiao/bn39ng.mp3',
  './voice/xiaoxiao/br1j06.mp3',
  './voice/xiaoxiao/bwgh6l.mp3',
  './voice/xiaoxiao/c7vlxc.mp3',
  './voice/xiaoxiao/c8rw8q.mp3',
  './voice/xiaoxiao/esemfw.mp3',
  './voice/xiaoxiao/f32inq.mp3',
  './voice/xiaoxiao/f8hgu5.mp3',
  './voice/xiaoxiao/fp881e.mp3',
  './voice/xiaoxiao/gvnzqz.mp3',
  './voice/xiaoxiao/i4w3ku.mp3',
  './voice/xiaoxiao/i9ay54.mp3',
  './voice/xiaoxiao/iokyxt.mp3',
  './voice/xiaoxiao/iyse75.mp3',
  './voice/xiaoxiao/j14vh0.mp3',
  './voice/xiaoxiao/ju215j.mp3',
  './voice/xiaoxiao/lgimdn.mp3',
  './voice/xiaoxiao/mv9o0x.mp3',
  './voice/xiaoxiao/n5rrfu.mp3',
  './voice/xiaoxiao/nf6nku.mp3',
  './voice/xiaoxiao/nx4j96.mp3',
  './voice/xiaoxiao/pah6bq.mp3',
  './voice/xiaoxiao/paqvc7.mp3',
  './voice/xiaoxiao/poko79.mp3',
  './voice/xiaoxiao/pscpzu.mp3',
  './voice/xiaoxiao/qd3web.mp3',
  './voice/xiaoxiao/qgd31q.mp3',
  './voice/xiaoxiao/qiiukq.mp3',
  './voice/xiaoxiao/qond9r.mp3',
  './voice/xiaoxiao/s4tekn.mp3',
  './voice/xiaoxiao/tbwaqr.mp3',
  './voice/xiaoxiao/u654wa.mp3',
  './voice/xiaoxiao/uycouj.mp3',
  './voice/xiaoxiao/viimcq.mp3',
  './voice/xiaoxiao/vrxkzw.mp3',
  './voice/xiaoxiao/wq317i.mp3',
  './voice/xiaoxiao/xo72t0.mp3',
  './voice/xiaoxiao/yd30bb.mp3',
  // v201：预缓存云扬 129 段
  './voice/yunyang/10dh0rc.mp3',
  './voice/yunyang/11gazc2.mp3',
  './voice/yunyang/11pa6xz.mp3',
  './voice/yunyang/11tii4l.mp3',
  './voice/yunyang/12srjhd.mp3',
  './voice/yunyang/13b25ti.mp3',
  './voice/yunyang/13uyv4r.mp3',
  './voice/yunyang/14a3a6x.mp3',
  './voice/yunyang/14tva51.mp3',
  './voice/yunyang/176ebdo.mp3',
  './voice/yunyang/17pkwjn.mp3',
  './voice/yunyang/17rm8zx.mp3',
  './voice/yunyang/17uzuq2.mp3',
  './voice/yunyang/17v1plx.mp3',
  './voice/yunyang/18pk8xy.mp3',
  './voice/yunyang/18wn76h.mp3',
  './voice/yunyang/18ynvrl.mp3',
  './voice/yunyang/19wgy1q.mp3',
  './voice/yunyang/1a3s1bv.mp3',
  './voice/yunyang/1a63fod.mp3',
  './voice/yunyang/1blas32.mp3',
  './voice/yunyang/1c5uyo5.mp3',
  './voice/yunyang/1cg21s4.mp3',
  './voice/yunyang/1chfe00.mp3',
  './voice/yunyang/1chfe01.mp3',
  './voice/yunyang/1daos15.mp3',
  './voice/yunyang/1dcj0sf.mp3',
  './voice/yunyang/1dz5jmv.mp3',
  './voice/yunyang/1hkrhdb.mp3',
  './voice/yunyang/1i2vo95.mp3',
  './voice/yunyang/1it72eh.mp3',
  './voice/yunyang/1izpia.mp3',
  './voice/yunyang/1j034np.mp3',
  './voice/yunyang/1j3bldx.mp3',
  './voice/yunyang/1j3bldy.mp3',
  './voice/yunyang/1kek7mx.mp3',
  './voice/yunyang/1lm5e47.mp3',
  './voice/yunyang/1lmhoar.mp3',
  './voice/yunyang/1m4mpbj.mp3',
  './voice/yunyang/1mg8wrw.mp3',
  './voice/yunyang/1mr9ziz.mp3',
  './voice/yunyang/1mvng4.mp3',
  './voice/yunyang/1navi1q.mp3',
  './voice/yunyang/1ng0bu7.mp3',
  './voice/yunyang/1ntvmn5.mp3',
  './voice/yunyang/1oar9ck.mp3',
  './voice/yunyang/1obr41y.mp3',
  './voice/yunyang/1p2bsdp.mp3',
  './voice/yunyang/1p3q7kh.mp3',
  './voice/yunyang/1p5kayz.mp3',
  './voice/yunyang/1p8u2oe.mp3',
  './voice/yunyang/1p9eqm8.mp3',
  './voice/yunyang/1pbkux7.mp3',
  './voice/yunyang/1pw6a98.mp3',
  './voice/yunyang/1rb5klx.mp3',
  './voice/yunyang/1reyble.mp3',
  './voice/yunyang/1rkyvjm.mp3',
  './voice/yunyang/1s87ntj.mp3',
  './voice/yunyang/1szzen9.mp3',
  './voice/yunyang/1tlcy24.mp3',
  './voice/yunyang/1uw84gp.mp3',
  './voice/yunyang/1vs2nly.mp3',
  './voice/yunyang/1x185nh.mp3',
  './voice/yunyang/2imhif.mp3',
  './voice/yunyang/2wgb0s.mp3',
  './voice/yunyang/2zftm0.mp3',
  './voice/yunyang/3l8xaa.mp3',
  './voice/yunyang/3l8xab.mp3',
  './voice/yunyang/3qnvgp.mp3',
  './voice/yunyang/3qnvgq.mp3',
  './voice/yunyang/3tl6ys.mp3',
  './voice/yunyang/3vhne2.mp3',
  './voice/yunyang/3wzmp.mp3',
  './voice/yunyang/42waw.mp3',
  './voice/yunyang/43knbl.mp3',
  './voice/yunyang/47rls.mp3',
  './voice/yunyang/4hsmuv.mp3',
  './voice/yunyang/58cn5v.mp3',
  './voice/yunyang/5nelil.mp3',
  './voice/yunyang/67g788.mp3',
  './voice/yunyang/7j4vk2.mp3',
  './voice/yunyang/7jb1k8.mp3',
  './voice/yunyang/7p5fia.mp3',
  './voice/yunyang/85ybro.mp3',
  './voice/yunyang/8wa48a.mp3',
  './voice/yunyang/a60pjs.mp3',
  './voice/yunyang/atsto5.mp3',
  './voice/yunyang/b24tpq.mp3',
  './voice/yunyang/bj6422.mp3',
  './voice/yunyang/bl5c66.mp3',
  './voice/yunyang/blaohl.mp3',
  './voice/yunyang/bn39ng.mp3',
  './voice/yunyang/br1j06.mp3',
  './voice/yunyang/bwgh6l.mp3',
  './voice/yunyang/c7vlxc.mp3',
  './voice/yunyang/c8rw8q.mp3',
  './voice/yunyang/esemfw.mp3',
  './voice/yunyang/f32inq.mp3',
  './voice/yunyang/f8hgu5.mp3',
  './voice/yunyang/fp881e.mp3',
  './voice/yunyang/gvnzqz.mp3',
  './voice/yunyang/i4w3ku.mp3',
  './voice/yunyang/i9ay54.mp3',
  './voice/yunyang/iokyxt.mp3',
  './voice/yunyang/iyse75.mp3',
  './voice/yunyang/j14vh0.mp3',
  './voice/yunyang/ju215j.mp3',
  './voice/yunyang/lgimdn.mp3',
  './voice/yunyang/mv9o0x.mp3',
  './voice/yunyang/n5rrfu.mp3',
  './voice/yunyang/nf6nku.mp3',
  './voice/yunyang/nx4j96.mp3',
  './voice/yunyang/pah6bq.mp3',
  './voice/yunyang/paqvc7.mp3',
  './voice/yunyang/poko79.mp3',
  './voice/yunyang/pscpzu.mp3',
  './voice/yunyang/qd3web.mp3',
  './voice/yunyang/qgd31q.mp3',
  './voice/yunyang/qiiukq.mp3',
  './voice/yunyang/qond9r.mp3',
  './voice/yunyang/s4tekn.mp3',
  './voice/yunyang/tbwaqr.mp3',
  './voice/yunyang/u654wa.mp3',
  './voice/yunyang/uycouj.mp3',
  './voice/yunyang/viimcq.mp3',
  './voice/yunyang/vrxkzw.mp3',
  './voice/yunyang/wq317i.mp3',
  './voice/yunyang/xo72t0.mp3',
  './voice/yunyang/yd30bb.mp3',
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
  // v199：音频按路径忽略 Range 头命中预缓存（Safari 的 audio 请求带 Range，默认 cache.match 会 miss 而回落网络）
  // v201：晓晓/云扬均进预缓存；万一某段缺失（版本升级中缓存被清），仍回源并写入缓存
  if (url.pathname.indexOf('/voice/') !== -1) {
    e.respondWith(caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(url.pathname, { ignoreSearch: true }).then(function(hit) {
        if (hit) return hit;
        return fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200 && resp.type === 'basic') cache.put(url.pathname, resp.clone());
          return resp;
        }).catch(function() { return Response.error(); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE_NAME).then(function(cache) {
    return cacheFirst(cache, e.request);
  }));
});
