/* ==================== Service Worker v215 ==================== */
// v215：个人主页能力指标区新增第三张卡「梅林 · 被刺率」（分母＝本人拿到梅林且该局进入刺杀环节的局数，不限胜负；
//       分子＝其中刺客选中本人且刺杀成功的次数；不足 2 局显示「—」并标注样本不足）；能力指标区改为 2 列等宽网格，
//       390px 及以上两列（第三张自动换行）、低于 390px 单列，页面与弹窗均无横向溢出；
//       保留 v214 全部内容与数据块，未恢复评分与海报，不泄露具体身份角色名
// v214：个人主页改版 —— 新增「好人非梅林被刺率」（分母＝当场为好人角色且非梅林且该局有刺杀环节的局数，不限胜负；
//       分子＝其中好人获胜且刺客选中本人的次数；兰斯洛特红/蓝均按好人角色计，混子按跟随目标解析阵营；
//       不足 4 局显示「—」并标注样本不足）；顶部 hero 卡合并头像+名字+总胜率+场次/连胜，蓝红方胜率改为横向进度条，
//       「掩护梅林」与「关键票」统一为等宽能力指标卡（口径说明默认收起、点击展开），320~414px 窄屏能力卡单列；
//       纯读取侧统计与展示层改造，不改历史录入与存储结构，未恢复评分与海报
// v213：设置页玩家名称下拉默认显示名池第一个（原先占位名「玩家N」被追加到末尾，导致下拉显示最后一项）；
//       删除计时条「-30s」「+30s」按钮，保留「本轮」秒数输入框（计时中仍可直接改本轮时长）；
//       彻底删除「大屏模式」（游戏页入口按钮、全屏浮层、nvBig* / nvRenderBig 全部函数与样式），保留局内实时票型看板；
//       再次修复游戏内截图：截图内身份解析不再依赖缺失的 state.identities，像素上限降到 800 万、重试 3 次、
//       toBlob 返回 null 时用 toDataURL 兜底，微信内改用 dataURL 预览以便长按保存/转发，并修正可选规则区标题误写；
//       全局 UI 精修：卡片/按钮/输入框/计时条/浮动按钮视觉与触感统一，弹窗入场动画与安全区适配
// v212：移除数据管理页「清理删除标记」按钮及其说明文本（该入口用于清空 avalon_deleted_keys 本地删除黑名单）；
//       底层黑名单机制完整保留——loadDeletedKeys/saveDeletedKeys 与 avalon_deleted_keys 的写入、云端同步过滤逻辑均不变，
//       已删除的对局记录仍不会被云端同步重新拉回；顺带修正换座按钮二次点击误显示「已清理删除标记」提示的文案。
// v211：发言计时（全体发言 / 轮流发言）支持游戏内调整本轮时长并沿用至本局后续轮次与后续发言人（仅本局，不改设置页默认值），
//       新增暂停 / 继续（沿用剩余秒数，避免 30 秒与最后 10 秒语音提示重复播放）；
//       倒计时数字放大并适配 320~414px 窄屏；
//       修复游戏进行中截图失败（canvas 面积超 1200 万像素上限导致 toBlob 返回 null）：改按内容高度动态缩放、失败降缩放重试，
//       游戏内截图与历史截图统一走「预览 + 分享到微信」，微信内不支持系统分享时引导用浏览器打开
// v210：新增「关键票」能力统计（个人主页）——每局第 3 轮及以后各轮「最后成队」提案的那次投票，
//       按本人当场最终阵营判断是否与任务结果一致，输出参与票数 / 命中票数 / 命中率 / 赞成反对张数；
//       纯读取侧统计，不改历史录入与存储结构，未恢复评分与海报
// v209：彻底删除赛后评分系统（rv 全模块、结束页「本局评分」、历史详情评分区块、胜率清单平均评分列）；
//       删除「生成海报」全部入口与海报模块（与截图功能重叠）；截图改为统一「预览 + 分享到微信」（系统分享面板/保存图片），
//       游戏中浮动截图与历史对局截图均可在手机端直接分享到微信
// v207：删除右下角固定版本号；页脚/设置页版本号一律由 JS 按 SW_VERSION 动态写入（不再写死文本）；
//       导航请求改 no-store，绕过 GitHub Pages 的 HTTP 缓存，避免旧 index.html 被长期缓存导致版本号停在老版本
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
var CACHE_NAME = 'avalon-pwa-v215';
var CACHE_PREFIX = 'avalon-pwa-';
var VOICE_SEG = '/voice/';
// 核心壳：首屏必显资源。音频一律不进这里（按需下载）
var ASSETS = [
  './',
  './index.html',
  './style.css?v=v215',
  './app-v215.min.js',
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
    // no-store：绕过 GitHub Pages 的 HTTP 缓存，导航一律以线上最新 HTML 为准
    fetch(request, { cache: 'no-store' }).then(function (resp) {
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
      return networkFirst(cache, e.request, 3000);
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
