/* ==================== DATA ==================== */
var MISSION_COUNTS = {5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]};
var DEFAULT_NAME_POOL = ['振宁','鹭文','小小','菜头','阿弟','齐齐','延平','小吴','涛','小黄','淏文','宝强','小洪'];
var ALL_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(蓝)','兰斯洛特(红)','混子'];
var UNIQUE_ROLES = ['梅林','派西维尔','莫甘娜','刺客','莫德雷德','奥伯伦','兰斯洛特(蓝)','兰斯洛特(红)','混子'];
var GOOD_ROLES = ['梅林','派西维尔','忠臣','兰斯洛特(蓝)'];
var EVIL_ROLES = ['莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(红)'];
var NEUTRAL_ROLES = ['混子'];
var DEFAULT_ACTIVE_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客'];

/* ============ BEIJING TIME HELPERS (UTC+8) ============ */
function _bjNow() {
  var d = new Date();
  return new Date(d.getTime() + d.getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000);
}
function _bjTimestamp() {
  var b = _bjNow();
  return b.getUTCFullYear() + '-' + String(b.getUTCMonth() + 1).padStart(2, '0') + '-' + String(b.getUTCDate()).padStart(2, '0') + ' ' + String(b.getUTCHours()).padStart(2, '0') + ':' + String(b.getUTCMinutes()).padStart(2, '0') + ':' + String(b.getUTCSeconds()).padStart(2, '0');
}
function _bjDate() {
  var b = _bjNow();
  return b.getUTCFullYear() + '-' + String(b.getUTCMonth() + 1).padStart(2, '0') + '-' + String(b.getUTCDate()).padStart(2, '0');
}
function _bjFileStamp() {
  var b = _bjNow();
  return b.getUTCFullYear() + '-' + String(b.getUTCMonth() + 1).padStart(2, '0') + '-' + String(b.getUTCDate()).padStart(2, '0') + '-' + String(b.getUTCHours()).padStart(2, '0') + '-' + String(b.getUTCMinutes()).padStart(2, '0') + '-' + String(b.getUTCSeconds()).padStart(2, '0');
}

/* ==================== SUPABASE ==================== */
var SUPABASE_URL = 'https://nzbpopxrxniixnhnqktw.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YnBvcHhyeG5paXhuaG5xa3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODQ2MzQsImV4cCI6MjA5NzQ2MDYzNH0.wLk-FdQlKha8YObTvgINW2M_9QVSpJk8c91bKJeQO7Q';
var _supabase = null;
var _supabaseConnected = false;
var _supabaseChannel = null;
function getSupabase() {
  if (_supabase) return _supabase;

  var sdkGlobal = typeof supabase !== 'undefined' ? supabase : (typeof window.supabase !== 'undefined' ? window.supabase : null);
  if (sdkGlobal) {
    try {
      _supabase = sdkGlobal.createClient(SUPABASE_URL, SUPABASE_KEY);
      if (_supabase) {
        _supabaseConnected = true;
        console.log('[Supabase] client created successfully, URL:', SUPABASE_URL, ', keys:', Object.keys(_supabase).length);
        return _supabase;
      }
    } catch(e) {
      console.error('[Supabase] createClient failed:', e.message, '| sdkGlobal keys:', Object.keys(sdkGlobal).slice(0, 5));
    }
  }

  // Supabase SDK 不可用 → 使用 REST API 降级方案（直接 XHR/fetch 调用）
  console.warn('[Supabase] SDK not loaded (typeof supabase=' + typeof supabase + '), using REST API fallback');
  _supabase = createRestFallbackClient();
  _supabaseConnected = true;
  return _supabase;
}

/* ---- REST API Fallback (Supabase SDK 不可用时直接用 fetch 调用 REST API) ---- */
function createRestFallbackClient() {
  function restFetch(method, table, opts) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    var headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': ''
    };
    if (opts.single) headers['Prefer'] = 'return=representation';
    if (opts.upsert) {
      headers['Prefer'] = (headers['Prefer'] ? headers['Prefer'] + ',' : '') + 'resolution=merge-duplicates';
    }
    if (opts.onConflict) {
      // v185：Supabase REST 的冲突列参数名是 on_conflict（写成 onConflict 会被 PostgREST 拒绝 PGRST100）
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'on_conflict=' + encodeURIComponent(opts.onConflict);
    }
    if (opts.select) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'select=' + encodeURIComponent(opts.select);
    }
    if (opts.filter) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + encodeURIComponent(opts.filter.col) + '=eq.' + encodeURIComponent(String(opts.filter.val));
    }
    if (opts.order && opts.order.col) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'order=' + encodeURIComponent(opts.order.col + (opts.order.asc === false ? '.desc' : '.asc'));
    }

    return {
      then: function(fn) {
        fetch(url, {
          method: method,
          headers: headers,
          body: opts.body ? JSON.stringify(opts.body) : undefined
        }).then(function(resp) {
          if (method === 'DELETE') {
            if (!resp.ok) return resp.text().then(function(t) { fn({ data: null, error: { message: resp.status + ': ' + t } }); });
            return resp.json().then(function(d) { fn({ data: d, error: null }); }).catch(function() { fn({ data: null, error: null }); });
          }
          if (!resp.ok) return resp.text().then(function(t) { fn({ data: null, error: { message: resp.status + ': ' + t } }); });
          return resp.json().then(function(d) {
            if (opts.single && Array.isArray(d)) {
              fn({ data: d.length > 0 ? d[0] : null, error: null });
            } else {
              fn({ data: d, error: null });
            }
          });
        }).catch(function(err) {
          fn({ data: null, error: { message: err.message || 'Network error' } });
        });
      }
    };
  }

  function queryBuilder(table) {
    var _select = null, _single = false, _filter = null, _order = null, _body = null, _onConflict = null, _upsert = false, _method = 'GET';
    var q = {
      insert: function(body) { _body = body; _method = 'POST'; return q; },
      delete: function() { _method = 'DELETE'; return q; },
      upsert: function(body, opts) {
        _body = body; _method = 'POST'; _upsert = true;
        if (opts && opts.onConflict) _onConflict = opts.onConflict;
        return q;
      },
      select: function(cols) { _select = cols || '*'; return q; },
      eq: function(col, val) { _filter = { col: col, val: val }; return q; },
      single: function() { _single = true; return q; },
      order: function(col, dir) { _order = { col: col, asc: !dir || !dir.ascending !== false }; return q; },
      then: function(fn) {
        return restFetch(_method, table, { select: _select, single: _single, body: _body, filter: _filter, order: _order, upsert: _upsert, onConflict: _onConflict }).then(fn);
      }
    };
    return q;
  }

  return {
    from: function(table) { return queryBuilder(table); },
    channel: function() { return { on: function() { return this; }, subscribe: function() {} }; },
    removeChannel: function() {}
  };
}
/* ---- v185：Supabase SDK 延后加载（首屏不再下载 200KB SDK，空闲后再注入）---- */
var _sdkState = 'idle'; // idle | loading | loaded | failed
var _sdkWaiters = [];
function loadSupabaseSDK(cb) {
  if (typeof window.supabase !== 'undefined') {
    _sdkState = 'loaded';
    if (typeof cb === 'function') { try { cb(true); } catch(e) {} }
    return;
  }
  if (typeof cb === 'function') _sdkWaiters.push(cb);
  if (_sdkState === 'loading') return;
  _sdkState = 'loading';
  var s = document.createElement('script');
  s.src = './vendor/supabase.min.js?v=2.108.2';
  s.async = true;
  var finish = function(ok) {
    _sdkState = ok ? 'loaded' : 'failed';
    if (ok) {
      // SDK 到位后丢弃降级客户端，后续调用走真实 SDK（realtime 需要）
      _supabase = null;
      _supabaseConnected = false;
    }
    var ws = _sdkWaiters.slice();
    _sdkWaiters.length = 0;
    for (var i = 0; i < ws.length; i++) { try { ws[i](ok); } catch(e) {} }
  };
  s.onload = function() { finish(true); };
  s.onerror = function() { console.warn('[Supabase] SDK load failed, keep REST fallback'); finish(false); };
  document.head.appendChild(s);
}

var SW_VERSION = 'v196';
/* ---- v186：云端历史同步结果短期缓存（避免同一会话内重复发起同步 XHR） ---- */
var _cloudHistCache = null;
var _cloudHistCacheRaw = null;
var _cloudHistCacheAt = 0;
var CLOUD_HIST_TTL = 60000;
/* ---- v186：云端历史异步预取（不再使用同步 XHR，避免切页阻塞） ---- */
var _cloudRowsPrefetched = null;   // 已异步拉到的云端原始行（待合并一次）
var _cloudRowsPrefetching = false; // 是否正在预取
var _cloudLastPrefetchAt = 0;      // 上次预取时间（用于 TTL 节流）
var _migratedCount = 0; // \u8ddf\u8e2a UTC\u8f6c\u5316\u4e3a\u5317\u4eac\u65f6\u95f4\u7684\u8bb0\u5f55\u6570

/* ---- UUID utility ---- */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: crypto.getRandomValues + hex
  var arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (var i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  function hex(v) { return (v < 16 ? '0' : '') + v.toString(16); }
  return hex(arr[0]) + hex(arr[1]) + hex(arr[2]) + hex(arr[3]) + '-' +
    hex(arr[4]) + hex(arr[5]) + '-' + hex(arr[6]) + hex(arr[7]) + '-' +
    hex(arr[8]) + hex(arr[9]) + '-' + hex(arr[10]) + hex(arr[11]) + hex(arr[12]) + hex(arr[13]) + hex(arr[14]) + hex(arr[15]);
}

// ====== Pending Queue (离线重推) ======
function getPendingQueue() {
  try { return JSON.parse(localStorage.getItem('avalon_pending_queue') || '[]'); } catch(e) { return []; }
}
function savePendingQueue(queue) {
  localStorage.setItem('avalon_pending_queue', JSON.stringify(queue));
}
function processOfflineQueues() {
  var sb = getSupabase();
  if (!sb) return;
  var queue = getPendingQueue();
  if (queue.length === 0) return;
  var remaining = [];
  var processed = 0;
  for (var i = 0; i < queue.length; i++) {
    (function(item) {
      sb.from('game_records').insert({ game_data: item.record, game_data_v2: item.recordV2 }).select('id').single().then(function(res) {
        if (res.error) {
          console.warn('[PendingQueue] push failed:', res.error);
          remaining.push(item);
        } else {
          processed++;
        }
        if (i === queue.length - 1) {
          savePendingQueue(remaining);
          if (processed > 0) console.log('[PendingQueue] pushed ' + processed + ' items');
        }
      });
    })(queue[i]);
  }
}
// ====== End Pending Queue ======

var namePool = DEFAULT_NAME_POOL.slice();
var _historyRawCache = null;
var _historyCache = null;
var _normalizedHistoryRawCache = null;
var _normalizedHistoryCache = null;
var _tendScoreCacheKey = '';
var _tendScoreCacheValue = null;
var _statsRenderScheduled = false;

var state = {
  playerCount: 7,
  playerNames: [],
  selfIndex: -1,
  myRole: null,
  activeRoles: DEFAULT_ACTIVE_ROLES.slice(),
  missions: [],
  currentRound: 0,
  tendencies: {},
  winner: null,
  consecutiveRejects: {},
  _firstLeaderPicked: false,
  _lastLeaderIdx: -1,
  assassinTarget: null,
  assassinFromMission: false,
  assassinMode: false,
  _assassinPickTarget: null,
  _historyPage: 0,
  _historyPageSize: 5,
  _assassinTimerRemaining: 0,
  _assassinTimerEnd: 0,
  _assassinTimerInterval: null,
  _huntFollowTarget: undefined,
  ladyOfLakeEnabled: true,
  excaliburEnabled: false,
  excaliburHistory: [],
  ladyLakeHolder: -1,
  ladyLakeChecks: [],
  timerMode: 'all',
  timerSeconds: 300,
  timerInterval: null,
  timerRemaining: 0,
  _timerEnd: 0,
  _undoStack: [],
  lancelotFlipped: false,
  lancelotDeck: null,
  lancelotDrawResults: [],
  roundTendencies: [],
  identityMarks: [],
  ladyCheckHistory: [],
  knownIdentities: {}
};

function initState(n) {
  n = n || 7;
  state.playerCount = n;
  state.playerNames = [];
  for (var i = 0; i < n; i++) state.playerNames[i] = '玩家' + (i + 1);
  state.selfIndex = -1;
  state.myRole = null;
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘娜','刺客'] : DEFAULT_ACTIVE_ROLES.slice();
  state.missions = [];
  state.currentRound = 0;
  state.tendencies = {};
  state.winner = null;
  state.consecutiveRejects = {};
  state._firstLeaderPicked = false;
  state._lastLeaderIdx = -1;
  state.assassinTarget = null;
  state.assassinFromMission = false;
  state.assassinMode = false;
  state.gameStartTime = _bjTimestamp();
  state._assassinPickTarget = null;
  state._assassinAfterRound = null;
  state.lancelotFlipped = false;
  state.lancelotDeck = null;
  state.lancelotDrawResults = [];
  state._historyPage = 0;
  state._assassinTimerRemaining = 0;
  state._assassinTimerEnd = 0;
  state._assassinTimerInterval = null;
  state._huntFollowTarget = undefined;
  state.ladyOfLakeEnabled = true;
  state.excaliburEnabled = false;
  state.excaliburHistory = [];
  state.playerRoles = [];
  state.ladyLakeHolder = -1;
  state.ladyLakeChecks = [];
  state.ladyCheckHistory = [];
  state.knownIdentities = {};
  state.timerMode = 'all';
  state.timerSeconds = 300;
  state.timerInterval = null;
  state.timerRemaining = 0;
  state.roundTendencies = [];
  state.identityMarks = [];
  state.playerPredictions = {};
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  state.speakTimes = {};
  state._teamConfirmedPending = false;
  for (var i = 0; i < n; i++) {
    state.tendencies[i] = 50;
    state.consecutiveRejects[i] = 0;
  }
}

/* ==================== PLAYER LABEL ==================== */
function playerLabel(idx) {
  return (idx + 1) + '号 ' + state.playerNames[idx];
}

// 从 "N号 Name" 或数字格式解析出索引（0-based），兜底返回 0
function parseLeaderIndex(leader) {
  if (typeof leader === 'number') return leader;
  if (typeof leader === 'string' && leader) {
    var m = leader.match(/^(\d+)/);
    if (m) { var idx = parseInt(m[1]) - 1; if (idx >= 0) return idx; }
  }
  return 0;
}

// 通用玩家标识解析：数字/数字字符串按 0-based 下标（带边界校验）；
// "N号 名字" 优先按名字匹配 identities，否则取 N-1 作下标；
// 纯名字按名字匹配；解析不到返回 -1。
function resolvePlayerIdx(tag, identities) {
  if (typeof tag === 'number') return (tag >= 0 && tag < identities.length) ? tag : -1;
  if (typeof tag !== 'string' || !identities) return -1;
  var s = tag.trim();
  var m = s.match(/^(\d+)号(?:\s+(.*))?$/);
  if (m) {
    var n = parseInt(m[1], 10);
    var name = (m[2] || '').trim();
    if (name) {
      for (var i = 0; i < identities.length; i++) {
        if (identities[i].name === name) return i;
      }
    }
    return (n - 1 >= 0 && n - 1 < identities.length) ? n - 1 : -1;
  }
  if (/^\d+$/.test(s)) {
    var idx = parseInt(s, 10);
    return (idx >= 0 && idx < identities.length) ? idx : -1;
  }
  for (var j = 0; j < identities.length; j++) {
    if (identities[j].name === s) return j;
  }
  return -1;
}

/* ==================== STORAGE ==================== */
function loadNamePool() {
  try { var d = localStorage.getItem('avalon_name_pool'); if (d) namePool = JSON.parse(d); } catch(e) {}
}
function saveNamePool() {
  localStorage.setItem('avalon_name_pool', JSON.stringify(namePool));
}
function invalidateHistoryCache() {
  _historyRawCache = null;
  _historyCache = null;
  _normalizedHistoryRawCache = null;
  _normalizedHistoryCache = null;
  _cloudHistCache = null;
  _cloudHistCacheRaw = null;
  _cloudHistCacheAt = 0;
}
// 将旧格式 roundTendencies（纯数值对象数组）迁移为新格式（带 r/a 元数据）
function migrateRoundTendenciesV2(v2) {
  var rt = v2.rt;
  if (!rt || !rt.length) return false;
  // 已经是新格式：{ v: snap, r: round, a: attempt }
  if (rt[0] && typeof rt[0].v === 'object') return false;

  var missions = v2.ms || [];
  var newRT = [];
  var entryIdx = 0;

  for (var ri = 0; ri < missions.length; ri++) {
    var m = missions[ri];
    var failedCount = 0;
    if (m.la && m.la.length > 0) {
      // 有 launchAttempts：最后一组投票通过则为 failedCount = attempts-1
      if (m.res) {
        failedCount = m.la.length - 1;
      } else {
        failedCount = m.la.length;
      }
    } else {
      // 传统格式：直接取 launchFailures 计数
      failedCount = m.lf2 || 0;
    }

    // 失败的组队投票快照（a 从 1 开始）
    for (var a = 1; a <= failedCount; a++) {
      if (entryIdx < rt.length) {
        newRT.push({ v: rt[entryIdx], r: ri, a: a });
        entryIdx++;
      }
    }

    // 任务执行完成快照（a=0）
    if (m.res) {
      if (entryIdx < rt.length) {
        newRT.push({ v: rt[entryIdx], r: ri, a: 0 });
        entryIdx++;
      }
    }
  }

  // 兜底：剩余未匹配的条目按最后一轮处理
  while (entryIdx < rt.length) {
    newRT.push({ v: rt[entryIdx], r: missions.length, a: 0 });
    entryIdx++;
  }

  v2.rt = newRT;
  return true;
}

function loadHistory() {
  // v186：本次会话已同步且本地存储未变时直接用缓存，不再发起同步 XHR
  var rawNow = null;
  try { rawNow = localStorage.getItem('avalon_history_v2') || '[]'; } catch(e0) { rawNow = '[]'; }
  if (_cloudHistCache && _cloudHistCacheRaw === rawNow && (Date.now() - _cloudHistCacheAt) < CLOUD_HIST_TTL) {
    return _cloudHistCache.slice();
  }
  // v186：本地优先 + 后台异步预取 —— 有预取结果时在本地合并，否则先返回本地并异步拉云端
  var sb = getSupabase();
  if (sb && _cloudRowsPrefetched && _cloudRowsPrefetched.length > 0) {
    try {
      var result = _cloudRowsPrefetched;
      if (result && result.length > 0) {
        var cloudHistory = [];
        var deletedKeys = loadDeletedKeys();
        for (var i = 0; i < result.length; i++) {
          var row = result[i];
          var recordV2 = row.game_data_v2 ? row.game_data_v2 : (row.game_data ? toRecordV2(row.game_data) : null);
          if (!recordV2) continue;
          recordV2._sid = row.id;
          // 从 game_data_v2 内读取 _uuid（已由 saveGameRecord 存入 JSONB）
          // 检查删除黑名单
          var dk = makeRecordKey(recordV2);
          if (deletedKeys.indexOf(dk) !== -1) continue;
          // 向后兼容：旧记录没有 _uuid 的，赋予一个
          if (!recordV2._uuid) {
            recordV2._uuid = generateUUID();
          }
          cloudHistory.push(recordV2);
        }
        // 合并本地未同步的记录（按 _sid 去重，避免 refresh 时 UUID 漂移导致无限增长）
        var localRaw = [];
        try { localRaw = JSON.parse(localStorage.getItem('avalon_history_v2') || '[]'); } catch(e) {}
        var cloudBySid = {};
        for (var i = 0; i < cloudHistory.length; i++) {
          cloudBySid[cloudHistory[i]._sid] = true;
        }
        var merged = cloudHistory.slice();
        for (var i = 0; i < localRaw.length; i++) {
          var lr = localRaw[i];
          // v2 格式标准化
          if (!isRecordV2(lr)) { lr = toRecordV2(lr); }
          // 有 _sid 的记录跟随云端状态：云端存在则已含在 cloudHistory 中，
          // 云端不存在该 _sid 说明被其他设备删了，同步从本地移除
          if (lr._sid) continue;
          // 无 _sid 的纯本地记录保留
          merged.push(lr);
        }
        // 按内容指纹去重，只保留一份
        merged = deduplicateHistory(merged);
        // 从本地记录复制 _tzMigrated 标记到云端记录，避免每次加载都重复触发时区迁移
        var localTzMigratedSids = {};
        for (var li = 0; li < localRaw.length; li++) {
          var lr2 = localRaw[li];
          if (!isRecordV2(lr2)) lr2 = toRecordV2(lr2);
          if (lr2._sid && lr2._tzMigrated) localTzMigratedSids[lr2._sid] = true;
        }
        for (var mi = 0; mi < merged.length; mi++) {
          if (merged[mi]._sid && localTzMigratedSids[merged[mi]._sid]) {
            merged[mi]._tzMigrated = true;
          }
        }
        // 迁移旧记录的 UTC 时间到北京时间
        if (merged.length > 0) console.log('[Time] cloud+local before migrate:', merged[0].st);
        var tzMigrated = false;
        for (var ti = 0; ti < merged.length; ti++) {
          if (migrateUtcToBeijingV2(merged[ti])) { tzMigrated = true; _migratedCount++; }
        }
        if (tzMigrated && merged.length > 0) console.log('[Time] cloud+local after migrate:', merged[0].st);
        // 写回 localStorage 作为缓存
        saveHistory(merged);
        // v186：缓存本次云端同步结果
        try {
          _cloudHistCache = merged.slice();
          _cloudHistCacheRaw = localStorage.getItem('avalon_history_v2') || '[]';
          _cloudHistCacheAt = Date.now();
        } catch(eC) {}
        // 时区迁移后，将 _tzMigrated 标记异步写回 Supabase 防止下次加载仍触发迁移
        if (tzMigrated) {
          (function() {
            var sb2 = getSupabase();
            if (!sb2) return;
            for (var tii = 0; tii < merged.length; tii++) {
              var mr = merged[tii];
              if (!mr._sid || !mr._tm) continue;
              try {
                var token2 = SUPABASE_KEY;
                var xhr2 = new XMLHttpRequest();
                xhr2.open('PATCH', SUPABASE_URL + '/rest/v1/game_records?id=eq.' + mr._sid, false);
                xhr2.setRequestHeader('apikey', token2);
                xhr2.setRequestHeader('Authorization', 'Bearer ' + token2);
                xhr2.setRequestHeader('Content-Type', 'application/json');
                xhr2.setRequestHeader('Prefer', 'return=minimal');
                xhr2.send(JSON.stringify({ game_data_v2: mr }));
              } catch(e2) { console.warn('[loadHistory] failed to write _tzMigrated to Supabase:', e2); }
            }
          })();
        }
        console.log('[loadHistory] loaded ' + merged.length + ' records from cloud + local');
        if (_migratedCount > 0) toast('\u5df2\u8f6c\u6362 ' + _migratedCount + ' \u6761 UTC\u65f6\u95f4\u4e3a\u5317\u4eac\u65f6\u95f4\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u4ee5\u5e94\u7528\u4fee\u6539', 'info');
        _cloudRowsPrefetched = null;
        return merged.slice();
      }
    } catch(e) {
      console.warn('[loadHistory] merge prefetched rows failed, falling back to localStorage:', e);
    }
  }

  // 回退到 localStorage（同时后台异步预取云端，调用方不等网络）
  prefetchCloudRows();
  return loadHistoryLocal();
}

// v186：异步预取云端历史行（异步 XHR，不阻塞主线程；完成后按需刷新统计页）
function prefetchCloudRows(cb) {
  if (_cloudRowsPrefetching) return;
  if (_cloudRowsPrefetched && _cloudRowsPrefetched.length > 0) { if (cb) { try { cb(); } catch(e0) {} } return; }
  if (_cloudLastPrefetchAt && (Date.now() - _cloudLastPrefetchAt) < CLOUD_HIST_TTL) { if (cb) { try { cb(); } catch(e1) {} } return; }
  var _sbp = null;
  try { _sbp = getSupabase(); } catch(e2) { _sbp = null; }
  if (!_sbp) return;
  _cloudRowsPrefetching = true;
  _cloudLastPrefetchAt = Date.now();
  try {
    var xhrP = new XMLHttpRequest();
    xhrP.open('GET', SUPABASE_URL + '/rest/v1/game_records?select=id,game_data,game_data_v2,created_at&order=created_at.asc&limit=1000', true);
    xhrP.setRequestHeader('apikey', SUPABASE_KEY);
    xhrP.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
    xhrP.onload = function() {
      _cloudRowsPrefetching = false;
      if (xhrP.status >= 200 && xhrP.status < 300) {
        try { _cloudRowsPrefetched = JSON.parse(xhrP.responseText) || []; } catch(eP) { _cloudRowsPrefetched = []; }
        _cloudHistCache = null; _cloudHistCacheRaw = null; _cloudHistCacheAt = 0;
        if (cb) { try { cb(); } catch(eCb) {} }
        var ap = document.querySelector('.page.active');
        if (ap && ap.id === 'page-stats') { try { renderStats(); } catch(eR) {} }
      }
    };
    xhrP.onerror = function() { _cloudRowsPrefetching = false; };
    xhrP.send();
  } catch(ePF) { _cloudRowsPrefetching = false; }
}

function loadHistoryLocal() {
  try {
    var rawText = localStorage.getItem('avalon_history_v2') || '[]';
    if (_historyRawCache === rawText && _historyCache) return _historyCache.slice();
    var raw = JSON.parse(rawText);
    var migrated = false;
    var rtMigrated = false;
    for (var i = 0; i < raw.length; i++) {
      if (!isRecordV2(raw[i])) {
        raw[i] = toRecordV2(raw[i]);
        migrated = true;
      }
      if (!raw[i]._uuid) {
        raw[i]._uuid = generateUUID();
        migrated = true;
      }
      if (migrateRoundTendenciesV2(raw[i])) rtMigrated = true;
    }
    if (migrated || rtMigrated) {
      rawText = JSON.stringify(raw);
      localStorage.setItem('avalon_history_v2', rawText);
    }
    // 迁移旧记录的 UTC 时间到北京时间
    if (raw.length > 0) console.log('[Time] local-only before migrate:', raw[0].st);
    var tzMigratedLocal = false;
    for (var ti = 0; ti < raw.length; ti++) {
      if (migrateUtcToBeijingV2(raw[ti])) { tzMigratedLocal = true; _migratedCount++; }
    }
    if (tzMigratedLocal) migrated = true;
    if (tzMigratedLocal && raw.length > 0) console.log('[Time] local-only after migrate:', raw[0].st);
    if (migrated) {
      rawText = JSON.stringify(raw);
      localStorage.setItem('avalon_history_v2', rawText);
    }
    _historyRawCache = rawText;
    _historyCache = raw;
    _normalizedHistoryRawCache = null;
    _normalizedHistoryCache = null;
    if (_migratedCount > 0) toast('\u5df2\u8f6c\u6362 ' + _migratedCount + ' \u6761 UTC\u65f6\u95f4\u4e3a\u5317\u4eac\u65f6\u95f4\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u4ee5\u5e94\u7528\u4fee\u6539', 'info');
    return raw.slice();
  } catch(e) { return []; }
}
function loadNormalizedHistory() {
  var rawText = localStorage.getItem('avalon_history_v2') || '[]';
  if (_normalizedHistoryRawCache === rawText && _normalizedHistoryCache) return _normalizedHistoryCache.slice();
  var raw = loadHistory();
  var history = raw.map(function(r) { return normalizeRecord(r); });
  _normalizedHistoryRawCache = localStorage.getItem('avalon_history_v2') || '[]';
  _normalizedHistoryCache = history;
  return history.slice();
}
// 迁移旧记录的 UTC 时间到北京时间（UTC+8），仅对 v2 格式生效
function migrateUtcToBeijingV2(rec) {
  if (!rec || !rec.st) {
    if (rec) console.log('[migrateUtcToBeijing] SKIP: no st field, keys=' + Object.keys(rec).join(','));
    return false;
  }

  // 检测 st 是否为 ISO UTC 格式（如 "2026-07-20T14:30:00.000Z"）
  var isUtc = typeof rec.st === 'string' && rec.st.indexOf('T') !== -1 && rec.st.indexOf('Z') !== -1;

  // 检测空间分隔格式（如 "2026-07-20 13:00:00"），可能来自旧版 UTC 时间存储
  var isSpaceFmt = !isUtc && typeof rec.st === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rec.st);

  console.log('[migrateUtcToBeijing] st=' + rec.st + ' isUtc=' + isUtc + ' isSpaceFmt=' + isSpaceFmt + ' d=' + rec.d + ' _tzMigrated=' + !!rec._tzMigrated);
  if (!isUtc && !isSpaceFmt) return false;

  // 已迁移标记：做交叉验证，检测是否曾被错误标记（旧版代码可能标记了但未实际转换）
  if (rec._tzMigrated) {
    if (isSpaceFmt) {
      var origSt = rec.st;
      var origD = rec.d;
      var testDate = new Date(origSt.replace(' ', 'T') + '.000Z');
      if (!isNaN(testDate.getTime())) {
        var bjMs = testDate.getTime() + 8 * 3600000;
        var bjDate = new Date(bjMs);
        var bjY = bjDate.getUTCFullYear();
        var bjMo = String(bjDate.getUTCMonth() + 1).padStart(2, '0');
        var bjD = String(bjDate.getUTCDate()).padStart(2, '0');
        var bjH = String(bjDate.getUTCHours()).padStart(2, '0');
        var bjMi = String(bjDate.getUTCMinutes()).padStart(2, '0');
        var bjS = String(bjDate.getUTCSeconds()).padStart(2, '0');
        var newSt = bjY + '-' + bjMo + '-' + bjD + ' ' + bjH + ':' + bjMi + ':' + bjS;
        // 如果转换后时间不同且日期与现有 d 一致，说明是 UTC 记录被错误标记
        if (newSt !== origSt && (bjY + '-' + bjMo + '-' + bjD) === origD) {
          console.log('[migrateUtcToBeijing] _tzMigrated but time=' + origSt.slice(11,16) + ' looks like UTC, forcing re-convert');
          delete rec._tzMigrated;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  try {
    // 空间分隔格式构造为 ISO 再解析
    var dateStr = isUtc ? rec.st : rec.st.replace(' ', 'T') + '.000Z';
    var utcDate = new Date(dateStr);
    if (isNaN(utcDate.getTime())) return false;
    var bjMs = utcDate.getTime() + 8 * 3600000;
    var bjDate = new Date(bjMs);
    var y = bjDate.getUTCFullYear();
    var mo = String(bjDate.getUTCMonth() + 1).padStart(2, '0');
    var d = String(bjDate.getUTCDate()).padStart(2, '0');
    var h = String(bjDate.getUTCHours()).padStart(2, '0');
    var mi = String(bjDate.getUTCMinutes()).padStart(2, '0');
    var s = String(bjDate.getUTCSeconds()).padStart(2, '0');
    var newSt = y + '-' + mo + '-' + d + ' ' + h + ':' + mi + ':' + s;
    var newD = y + '-' + mo + '-' + d;

    // 如果转换后与原始一致，说明已是北京时间，仅标记跳过
    if (newSt === rec.st && newD === rec.d) {
      rec._tzMigrated = true;
      rec._tm = true;
      return false;
    }

    // 对于空间格式：检查转换有效性
    // 如果转换后日期与原始日期相同（说明是北京时间当天游戏，UTC时间未跨越日期边界）→ 是旧UTC记录，转换有效
    // 如果转换后日期不同（北京21:00→UTC+8h=次日05:00）→ 原始已是北京时间，需回滚
    if (isSpaceFmt && !isUtc) {
      if (newD !== rec.d) {
        // 转换导致日期变化 → 原已是北京时间，不要转换
        rec._tzMigrated = true;
        rec._tm = true;
        return false;
      }
      // newD === rec.d 且时间不同 → 旧UTC记录，需要转换
    }

    rec.st = newSt;
    rec.d = newD;
    // 转换 endTime
    var parseTimeParam = function(t) {
      if (t && typeof t === 'string') {
        if (t.indexOf('T') !== -1 && t.indexOf('Z') !== -1) return t;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) return t.replace(' ', 'T') + '.000Z';
      }
      return null;
    };
    if (rec.et) {
      var etStr = parseTimeParam(rec.et);
      if (etStr) {
        var utcEt = new Date(etStr);
        if (!isNaN(utcEt.getTime())) {
          var bjEtMs = utcEt.getTime() + 8 * 3600000;
          var bjEt = new Date(bjEtMs);
          var ety = bjEt.getUTCFullYear();
          var etmo = String(bjEt.getUTCMonth() + 1).padStart(2, '0');
          var etd = String(bjEt.getUTCDate()).padStart(2, '0');
          var eth = String(bjEt.getUTCHours()).padStart(2, '0');
          var etmi = String(bjEt.getUTCMinutes()).padStart(2, '0');
          var ets = String(bjEt.getUTCSeconds()).padStart(2, '0');
          rec.et = ety + '-' + etmo + '-' + etd + ' ' + eth + ':' + etmi + ':' + ets;
        }
      }
    }
    rec._tzMigrated = true;
    rec._tm = true;
    console.log('[migrateUtcToBeijing] converted record, st=' + rec.st);
    return true;
  } catch(e) {
    console.warn('[migrateUtcToBeijing] error:', e);
    return false;
  }
}

function saveHistory(data) {
  var rawText = JSON.stringify(data);
  localStorage.setItem('avalon_history_v2', rawText);
  _historyRawCache = rawText;
  _historyCache = data.slice();
  _normalizedHistoryRawCache = null;
  _normalizedHistoryCache = null;
}

// 将旧格式记录转为 v2 短字段格式
function toRecordV2(record) {
  var v2 = {};
  if (record.date !== undefined) v2.d = record.date;
  if (record.startTime !== undefined) v2.st = record.startTime;
  if (record.endTime !== undefined) v2.et = record.endTime;
  if (record.playerCount !== undefined) v2.pc = record.playerCount;
  if (record.winner !== undefined) v2.w = record.winner;
  if (record.identities) v2.ids = record.identities.map(function(id) { return { n: id.name, r: id.role, i: id.index }; });
  if (record.lancelotFlips) v2.lf = record.lancelotFlips;
  if (record.activeRoles) v2.ar = record.activeRoles;
  if (record.roundTendencies) v2.rt = record.roundTendencies;
  if (record.v7Scores) v2.v7s = record.v7Scores;
  if (record.assassinTarget !== undefined) v2.at = record.assassinTarget;
  if (record.assassinSuccess !== undefined) v2.as = record.assassinSuccess;
  if (record.assassinAfterRound != null) v2.aar = record.assassinAfterRound;
  if (record.assassinFromMission) v2.afm = record.assassinFromMission;
  if (record.huntFollow != null) v2.hf = record.huntFollow;
  if (record.currentRound !== undefined) v2.cr = record.currentRound;
  if (record.identityMarks) v2.im = record.identityMarks.map(function(m) { return { t: m.target, tn: m.targetName, l: m.level, ts: m.timestamp }; });
  if (record.missions) v2.ms = record.missions.map(function(m) {
    var vm = { r: m.round, s: m.size, ld: m.leader, t: m.team, res: m.result, fc: m.failCount, sf: m.shieldedFails };
    // v192：失败票归属者（「N号 名字」数组，短键 fv）
    if (m.failVoters && m.failVoters.length) vm.fv = m.failVoters;
    if (m.launchFailures !== undefined) vm.lf2 = m.launchFailures;
    if (m.launchAttempts) vm.la = m.launchAttempts.map(function(att) {
      return { t: att.team, v: att.votes, ld: att.leader };
    });
    if (m.votes) vm.v = m.votes;
    return vm;
  });
  if (record.ladyCheckHistory) v2.lch = record.ladyCheckHistory.map(function(h) {
    return { r: h.round, h: h.holder, hn: h.holderName, t: h.target, tn: h.targetName, res: h.result, n: h.note, rr: h.recordedAtRound, sp: h.recordedAtSpeaker };
  });
  if (record.excaliburEnabled !== undefined) v2.ee = record.excaliburEnabled;
  if (record.excaliburHistory) v2.ex = record.excaliburHistory.map(function(e) {
    return { r: e.round, ld: e.leader, ldn: e.leaderName, tm: e.team, h: e.holder, hn: e.holderName, u: e.used, t: e.target, tn: e.targetName, fr: e.feedbackRecorded, fbr: e.feedbackRound, fs: e.feedbackSpeaker, cd: e.claimedDirection, n: e.note };
  });
  if (record.forceEnded) v2.fe = record.forceEnded;
  if (record.forceEndReason) v2.fer = record.forceEndReason;
  if (record.forceEndTime) v2.fet = record.forceEndTime;
  if (record._supabaseId) v2._sid = record._supabaseId;
  if (record._tzMigrated) v2._tm = true;
  return v2;
}

// 统一标准化函数：输入任意格式（v2短键名 或 长格式），返回统一长格式
function normalizeGameData(gd) {
  if (!gd) return null;
  // JSON 字符串则解析
  if (typeof gd === 'string') { try { gd = JSON.parse(gd); } catch(e) { return null; } }
  // v2 短键名格式
  if (gd.d !== undefined && gd.w !== undefined) return fromRecordV2(gd);
  // 已经是长格式
  if (gd.date !== undefined || gd.playerCount !== undefined) return gd;
  // 兜底：尝试正常化
  return normalizeRecord(gd);
}

// 将 v2 短字段格式转回旧格式（供渲染等消费端使用）
function fromRecordV2(v2) {
  var rec = {};
  rec.date = v2.d || '';
  rec.startTime = v2.st || '';
  rec.endTime = v2.et || '';
  rec.playerCount = v2.pc || 0;
  rec.winner = v2.w || '';
  rec.identities = (v2.ids || []).map(function(id) { return { name: id.n, role: id.r, index: id.i }; });
  rec.lancelotFlips = v2.lf || {};
  rec.activeRoles = v2.ar || [];
  rec.roundTendencies = v2.rt || [];
  rec.v7Scores = v2.v7s || null;
  rec.assassinTarget = v2.at || null;
  rec.assassinSuccess = v2.as || false;
  rec.assassinAfterRound = v2.aar != null ? v2.aar : null;
  rec.assassinFromMission = v2.afm || false;
  rec.huntFollow = v2.hf != null ? v2.hf : null;
  rec.currentRound = v2.cr != null ? v2.cr : 0;
  rec.identityMarks = (v2.im || []).map(function(m) { return { target: m.t, targetName: m.tn, level: m.l, timestamp: m.ts }; });
  rec.missions = (v2.ms || []).map(function(m) {
    var rm = { round: m.r, size: m.s, leader: m.ld, team: m.t || [], result: m.res, failCount: m.fc || 0, shieldedFails: m.sf || 0 };
    // v192：失败票归属者；旧记录无该字段时为空数组，展示层统一兜底「—」
    rm.failVoters = (m.fv && m.fv.length) ? m.fv.slice() : [];
    if (m.lf2 !== undefined) rm.launchFailures = m.lf2;
    if (m.la) rm.launchAttempts = m.la.map(function(att) { return { team: att.t || [], votes: att.v || {}, leader: att.ld }; });
    if (m.v) rm.votes = m.v;
    return rm;
  });
  rec.ladyCheckHistory = (v2.lch || []).map(function(h) { return { round: h.r, holder: h.h, holderName: h.hn, target: h.t, targetName: h.tn, result: h.res, note: h.n || '', recordedAtRound: h.rr, recordedAtSpeaker: h.sp }; });
  rec.excaliburEnabled = !!v2.ee;
  rec.excaliburHistory = (v2.ex || []).map(function(e) { return { round: e.r, leader: e.ld, leaderName: e.ldn, team: e.tm || [], holder: e.h, holderName: e.hn, used: e.u, target: e.t, targetName: e.tn, feedbackRecorded: e.fr, feedbackRound: e.fbr, feedbackSpeaker: e.fs, claimedDirection: e.cd || '', note: e.n || '' }; });
  rec.forceEnded = v2.fe || false;
  rec.forceEndReason = v2.fer || '';
  rec.forceEndTime = v2.fet || '';
  rec._supabaseId = v2._sid || '';
  rec._uuid = v2._uuid || '';
  rec._tzMigrated = v2._tm || false;
  return rec;
}

// 判断记录是否为 v2 格式
function isRecordV2(record) {
  return record && record.d !== undefined && record.w !== undefined;
}

// 将 v2 记录标准化为消费端可用格式（带旧字段名）
function normalizeRecord(record) {
  if (!record) return null;
  if (isRecordV2(record)) return fromRecordV2(record);
  return record; // 兼容未迁移的旧格式
}
function getSortedNamePool() {
  // v186：名池排序只需出现频次，用本地历史即可，首屏不再发起同步 XHR
  var history = loadHistoryLocal().map(function(r) { return normalizeRecord(r); });
  var counts = {};
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!rec.identities) continue;
    for (var j = 0; j < rec.identities.length; j++) {
      var name = rec.identities[j].name;
      if (name) counts[name] = (counts[name] || 0) + 1;
    }
  }
  var sorted = namePool.slice().sort(function(a, b) {
    var ca = counts[a] || 0;
    var cb = counts[b] || 0;
    if (cb !== ca) return cb - ca;
    return a.localeCompare(b);
  });
  return sorted;
}
function loadDeletedKeys() {
  try { return JSON.parse(localStorage.getItem('avalon_deleted_keys') || '[]'); } catch(e) { return []; }
}
function saveDeletedKeys(data) {
  localStorage.setItem('avalon_deleted_keys', JSON.stringify(data));
}
function clearDeletedKeys() {
  localStorage.removeItem('avalon_deleted_keys');
  invalidateHistoryCache();
  if (state._currentPage === 'stats') renderStats();
  toast('已清理删除标记，历史记录已恢复');
}
function saveLastGame() {
  var cfg = {
    date: _bjDate(),
    playerCount: state.playerCount,
    playerNames: state.playerNames.slice(),
    selfIndex: state.selfIndex
  };
  localStorage.setItem('avalon_last_game', JSON.stringify(cfg));
}
function loadLastGame() {
  try {
    var d = localStorage.getItem('avalon_last_game');
    if (!d) return null;
    var cfg = JSON.parse(d);
    var today = _bjDate();
    if (cfg.date !== today) return null;
    return cfg;
  } catch(e) { return null; }
}
loadNamePool();

/* ==================== ASSASSIN COUNTDOWN ==================== */
function startAssassinTimer() {
  stopAssassinTimer();
  ensureAudioContext();
  state._assassinTimerEnd = Date.now() + 3 * 60 * 1000; // wall-clock end time
  state._assassinTimerRemaining = 3 * 60;
  renderAssassinTimer();
  state._assassinTimerInterval = setInterval(function() {
    var remaining = Math.max(0, Math.ceil((state._assassinTimerEnd - Date.now()) / 1000));
    state._assassinTimerRemaining = remaining;
    renderAssassinTimer();
    if (remaining <= 0) {
      stopAssassinTimer();
      playBeepSound();
    }
  }, 250); // more frequent refresh for wall-clock accuracy
}

function stopAssassinTimer() {
  if (state._assassinTimerInterval) {
    clearInterval(state._assassinTimerInterval);
    state._assassinTimerInterval = null;
  }
  state._assassinTimerEnd = 0;
  var el = document.getElementById('assassin-countdown-display');
  if (el) el.innerHTML = '';
}

function renderAssassinTimer() {
  var el = document.getElementById('assassin-countdown-display');
  if (!el) return;
  var min = Math.floor(state._assassinTimerRemaining / 60);
  var sec = state._assassinTimerRemaining % 60;
  var timeStr = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
  var warning = state._assassinTimerRemaining <= 30 && state._assassinTimerRemaining > 0;
  el.innerHTML = '<div class="assassin-countdown' + (warning ? ' warning' : '') + '">'
    + '<div class="ac-value">' + timeStr + '</div>'
    + '<div class="ac-label">刺杀倒计时</div></div>';
  if (state._assassinTimerRemaining <= 0) {
    el.innerHTML = '<div class="assassin-countdown warning">'
      + '<div class="ac-value">00:00</div>'
      + '<div class="ac-label">倒计时结束</div></div>';
  }
}

/* ==================== UTILS ==================== */
function $(id) { return document.getElementById(id); }
function toast(msg, type) {
  type = type || 'info';
  var t = $('toast'); t.textContent = msg; t.className = 'toast ' + type + ' show';
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}
function setActiveNav(page) {
  document.querySelectorAll('.nav-btns button').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('nav-' + page);
  if (btn) btn.classList.add('active');
}
function showPage(page) {
  var prevPage = state._currentPage;
  var pg = document.getElementById('page-' + page);
  // 未知页面直接忽略，避免所有页被隐藏后出现空白页
  if (!pg) { console.warn('[nav] unknown page: ' + page); return; }
  state._currentPage = page;
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  pg.classList.add('active');
  setActiveNav(page);
  if (page === 'game') {
    renderGame();
  }
  if (page === 'setup') { renderSetup(); }
  if (page === 'end') renderEnd();
  if (page === 'stats') {
    if (prevPage !== 'stats') state._historyPage = 0;
    renderStats();
    processOfflineQueues();
  }
  // 更新底部版本号
  var fv = document.getElementById('page-footer-version');
  if (fv) fv.textContent = '版本: ' + SW_VERSION;
}

// 游戏导航入口：未开始游戏则提示先去 setup 配置
function goToGame() {
  if (!state.missions || state.missions.length === 0) {
    toast('请先在设置页面配置游戏参数', 'warn');
    showPage('setup');
    return;
  }
  showPage('game');
}

/* ==================== SETUP RENDER ==================== */

function renderSetup() {
  var h = '';
  for (var i = 6; i <= 10; i++) {
    h += '<div class="count-btn' + (state.playerCount === i ? ' selected' : '') + '" onclick="setPlayerCount(' + i + ')">' + i + '</div>';
  }
  $('count-grid').innerHTML = h;

  h = '';
  for (var i = 0; i < state.playerCount; i++) {
    var curName = state.playerNames[i];

    // Collect names already taken by other players
    var takenNames = {};
    for (var k = 0; k < state.playerCount; k++) {
      if (k === i) continue;
      takenNames[state.playerNames[k]] = true;
    }

    h += '<div class="player-setup-row">';
    h += '<span class="idx">' + (i + 1) + '号</span>';
    h += '<select onchange="setPlayerName(' + i + ',this.value)">';
    var sortedPool = getSortedNamePool();
    for (var j = 0; j < sortedPool.length; j++) {
      var nm = sortedPool[j];
      if (takenNames[nm] && nm !== curName) continue;
      h += '<option value="' + nm + '"' + (nm === curName ? ' selected' : '') + '>' + nm + '</option>';
    }
    if (namePool.indexOf(curName) === -1) {
      h += '<option value="' + curName + '" selected>' + curName + '</option>';
    }
    h += '</select>';
    h += '<button class="btn small swap-seat-btn" id="swap-seat-' + i + '" onclick="toggleSwapSeat(' + i + ')" title="换座">⇄</button>';
    h += '</div>';
  }
  $('player-names').innerHTML = h;

  h = '<div class="role-horizontal">';
  h += '<div class="good-section">';
  h += '<span class="faction-label good">好人方</span>';
  h += '<div class="role-group">';
  for (var i = 0; i < GOOD_ROLES.length; i++) {
    var r = GOOD_ROLES[i];
    var checked = state.activeRoles.indexOf(r) !== -1;
    h += '<label class="' + (checked ? 'checked' : '') + '" onclick="toggleRole(\'' + r + '\')">' + r + '</label>';
  }
  h += '</div></div>';
  h += '<div class="evil-section">';
  h += '<span class="faction-label evil">反方</span>';
  h += '<div class="role-group">';
  for (var i = 0; i < EVIL_ROLES.length; i++) {
    var r = EVIL_ROLES[i];
    var checked = state.activeRoles.indexOf(r) !== -1;
    h += '<label class="' + (checked ? 'checked' : '') + '" onclick="toggleRole(\'' + r + '\')">' + r + '</label>';
  }
  h += '</div></div>';
  h += '<div class="neutral-section">';
  h += '<span class="faction-label neutral">中立方</span>';
  h += '<div class="role-group">';
  for (var i = 0; i < NEUTRAL_ROLES.length; i++) {
    var r = NEUTRAL_ROLES[i];
    var checked = state.activeRoles.indexOf(r) !== -1;
    h += '<label class="' + (checked ? 'checked' : '') + '" onclick="toggleRole(\'' + r + '\')">' + r + '</label>';
  }
  h += '</div></div></div>';
  $('role-checkbox-grid').innerHTML = h;

  var mc = MISSION_COUNTS[state.playerCount];
  $('mission-info').textContent = mc ? mc.join('-') : '请先选择人数';
  // Sync lady toggle button UI
  var ladyRow = document.getElementById('lady-check-row');
  if (ladyRow) {
    if (state.ladyOfLakeEnabled) { ladyRow.classList.add('checked'); }
    else { ladyRow.classList.remove('checked'); }
  }
  var excaliburRow = document.getElementById('excalibur-row');
  if (excaliburRow) {
    if (state.excaliburEnabled) { excaliburRow.classList.add('checked'); }
    else { excaliburRow.classList.remove('checked'); }
  }
  // 设置版本号
  var vi = document.getElementById('version-info');
  if (vi) vi.textContent = '版本: ' + SW_VERSION;
}

function setPlayerCount(n) {
  var oldNames = state.playerNames;
  var oldSelf = state.selfIndex;
  state.playerCount = n;
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘娜','刺客'] : DEFAULT_ACTIVE_ROLES.slice();
  state.playerNames = [];
  for (var i = 0; i < n; i++) {
    state.playerNames[i] = (oldNames[i] && oldNames[i].indexOf('玩家') !== 0) ? oldNames[i] : ('玩家' + (i + 1));
  }
  state.selfIndex = oldSelf < n ? oldSelf : -1;
  _swapSeatFirst = null;
  state.tendencies = {};
  state.consecutiveRejects = {};
  state.roundTendencies = [];
  for (var i = 0; i < n; i++) {
    if (!(i in state.tendencies)) state.tendencies[i] = 50;
    state.consecutiveRejects[i] = 0;
  }
  state.missions = [];
  state.currentRound = 0;
  state.winner = null;
  renderSetup();
}

function setPlayerName(idx, name) {
  state.playerNames[idx] = name;
  renderSetup();
}

function toggleRole(role) {
  var pos = state.activeRoles.indexOf(role);
  if (pos !== -1) {
    state.activeRoles.splice(pos, 1);

  } else {
    state.activeRoles.push(role);
  }
  renderSetup();
}

function _addNameCore(name) {
  if (!name) { toast('请输入名字', 'warn'); return false; }
  if (namePool.indexOf(name) !== -1) { toast('名字已存在', 'warn'); return false; }
  namePool.push(name);
  saveNamePool();
  // Sync to Supabase
  var sb = getSupabase();
  if (sb) {
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }).then(function(res) {
      if (res.error) console.warn('[Supabase] add name_pool failed:', res.error);
    });
  }
  renderSetup();
  renderNamePoolList();
  toast('已添加「' + name + '」');
  return true;
}

var _swapSeatFirst = null;
var _endSwapRoleFirst = null;

function toggleSwapSeat(idx) {
  if (_swapSeatFirst === null) {
    _swapSeatFirst = idx;
    var btn = document.getElementById('swap-seat-' + idx);
    if (btn) { btn.classList.add('swapping'); btn.textContent = '⇄'; }
    toast('已选中 ' + (idx + 1) + ' 号，再点另一位的换座按钮完成互换');
  } else if (_swapSeatFirst === idx) {
    _swapSeatFirst = null;
    var btn = document.getElementById('swap-seat-' + idx);
    if (btn) { btn.classList.remove('swapping'); btn.textContent = '⇄'; }
    toast('已取消');
  } else {
    var a = _swapSeatFirst;
    var b = idx;
    // Swap names
    var tmp = state.playerNames[a];
    state.playerNames[a] = state.playerNames[b];
    state.playerNames[b] = tmp;
    _swapSeatFirst = null;
    renderSetup();
    toast((a + 1) + ' 号与 ' + (b + 1) + ' 号已互换');
  }
}

function statsAddName() {
  var input = document.getElementById('stats-add-name-input');
  if (!input) return;
  var name = input.value.trim();
  if (_addNameCore(name)) input.value = '';
}

function deleteNameFromPool(name) {
  var idx = namePool.indexOf(name);
  if (idx === -1) return;
  namePool.splice(idx, 1);
  saveNamePool();
  // Sync to Supabase
  var sb = getSupabase();
  if (sb) {
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }).then(function(res) {
      if (res.error) console.warn('[Supabase] delete name_pool failed:', res.error);
    });
  }
  // Update player names that reference the deleted name
  for (var i = 0; i < state.playerCount; i++) {
    if (state.playerNames[i] === name) {
      state.playerNames[i] = '玩家' + (i + 1);
    }
  }
  renderSetup();
  renderNamePoolList();
  toast('已删除「' + name + '」');
}

function editNameInPool(oldName) {
  var newName = prompt('修改玩家姓名「' + oldName + '」：', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  newName = newName.trim();
  if (newName.length > 10) { toast('名字不能超过10个字符', 'warn'); return; }
  if (namePool.indexOf(newName) !== -1) { toast('名字已存在', 'warn'); return; }
  var idx = namePool.indexOf(oldName);
  if (idx !== -1) {
    namePool[idx] = newName;
  } else {
    namePool.push(newName);
  }
  saveNamePool();
  // Sync to Supabase
  var sb = getSupabase();
  if (sb) {
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }).then(function(res) {
      if (res.error) console.warn('[Supabase] edit name_pool failed:', res.error);
    });
  }
  // Update player names that reference the old name
  for (var i = 0; i < state.playerCount; i++) {
    if (state.playerNames[i] === oldName) {
      state.playerNames[i] = newName;
    }
  }
  renderSetup();
  renderNamePoolList();
  toast('已修改「' + oldName + '」→「' + newName + '」');
}

function renderNamePoolList() {
  var el = $('name-pool-list');
  if (!el) return;
  if (namePool.length === 0) {
    el.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:10px;font-size:13px">暂无玩家姓名</p>';
    return;
  }
  var h = '';
  for (var i = 0; i < namePool.length; i++) {
    var nm = namePool[i];
    h += '<div class="name-pool-item">';
    h += '<span class="np-name">' + nm + '</span>';
    h += '<button class="btn small np-edit-btn" onclick="editNameInPool(\'' + nm.replace(/'/g, "\\'") + '\')" title="修改">&#9998; 编辑</button>';
    h += '<button class="btn small danger np-del-btn" onclick="deleteNameFromPool(\'' + nm.replace(/'/g, "\\'") + '\')" title="删除">&times; 删除</button>';
    h += '</div>';
  }
  el.innerHTML = h;
}

function showNamePoolModal() {
  renderNamePoolList();
  var overlay = document.getElementById('name-pool-modal-overlay');
  if (overlay) overlay.classList.add('active');
}
function closeNamePoolModal(event) {
  if (event && event.target !== document.getElementById('name-pool-modal-overlay')) return;
  var overlay = document.getElementById('name-pool-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

function toggleLadyOfLake() {
  state.ladyOfLakeEnabled = !state.ladyOfLakeEnabled;
  var row = document.getElementById('lady-check-row');
  if (state.ladyOfLakeEnabled) { row.classList.add('checked'); }
  else { row.classList.remove('checked'); }
}


function toggleExcalibur() {
  state.excaliburEnabled = !state.excaliburEnabled;
  if (!state.excaliburHistory) state.excaliburHistory = [];
  renderSetup();
}

function setTimerMode(mode) {
  state.timerMode = mode;
  var allOptRow = document.getElementById('timer-all-options');
  var perOptRow = document.getElementById('timer-per-options');
  if (allOptRow) allOptRow.style.display = (mode === 'all') ? 'flex' : 'none';
  if (perOptRow) perOptRow.style.display = (mode === 'per') ? 'flex' : 'none';
  ['off','all','per'].forEach(function(m) {
    var btn = document.getElementById('timer-mode-' + m);
    if (btn) btn.className = 'timer-mode-btn' + (m === mode ? ' selected' : '');
  });
  if (mode === 'all') setAllTimerSeconds(300);
  if (mode === 'per') setTimerSeconds(60);
}

function setTimerSecondsInput() {
  var input = document.getElementById('timer-seconds-input');
  if (!input) return;
  var val = parseInt(input.value);
  if (isNaN(val) || val < 10) { val = 10; input.value = 10; }
  if (val > 300) { val = 300; input.value = 300; }
  state.timerSeconds = val;
  [45,60,75,90].forEach(function(s) {
    var btn = document.getElementById('timer-per-opt-' + s);
    if (btn) btn.className = 'timer-opt-btn';
  });
}

function setTimerSeconds(sec) {
  state.timerSeconds = sec;
  var input = document.getElementById('timer-seconds-input');
  if (input) input.value = sec;
  [45,60,75,90].forEach(function(s) {
    var btn = document.getElementById('timer-per-opt-' + s);
    if (btn) btn.className = 'timer-opt-btn' + (s === sec ? ' selected' : '');
  });
}

function setAllTimerSeconds(sec) {
  state.timerSeconds = sec;
  [180,240,300].forEach(function(s) {
    var btn = document.getElementById('timer-all-opt-' + s);
    if (btn) btn.className = 'timer-opt-btn' + (s === sec ? ' selected' : '');
  });
}
/* ==================== GAME START ==================== */
function startGame() {
  ensureAudioContext();
  // v175：在用户点击手势链内解锁语音合成（iOS 首次播报必须由手势触发）
  try { nvUnlockSpeech(); } catch (e) {}
  if (!MISSION_COUNTS[state.playerCount]) { toast('请选择玩家人数', 'warn'); return; }
  if (state.activeRoles.length === 0) { toast('请至少选择一个本局角色', 'warn'); return; }
  for (var i = 0; i < state.playerCount; i++) {
    if (state.playerNames[i] === '阿弟') { state.selfIndex = i; break; }
  }
  // 防御：保证玩家名数组长度=人数
  state.playerNames = (state.playerNames || []).slice(0, state.playerCount);
  for (var pn = 0; pn < state.playerCount; pn++) {
    if (!state.playerNames[pn]) state.playerNames[pn] = '玩家' + (pn + 1);
  }
  doStartGame();
}


function doStartGame() {
  // 防御性修复：确保玩家数组长度与选择人数一致
  state.playerNames = (state.playerNames || []).slice(0, state.playerCount);
  for (var pn = 0; pn < state.playerCount; pn++) {
    if (!state.playerNames[pn]) state.playerNames[pn] = '玩家' + (pn + 1);
  }
  state.missions = MISSION_COUNTS[state.playerCount].map(function(size, i) {
    return { round: i, size: size, leader: null, team: [], votes: {}, result: null, failCount: 0, shieldedFails: 0, failVoters: [], launchFailures: 0, launchAttempts: [] };
  });
  state.currentRound = 0;
  state.winner = null;
  state._firstLeaderPicked = false;
  state._lastLeaderIdx = -1;
  state.assassinTarget = null;
  state.assassinFromMission = false;
  state.assassinMode = false;
  state.gameStartTime = _bjTimestamp();
  state._assassinPickTarget = null;
  state._assassinAfterRound = null;
  state.lancelotFlipped = false;
  state.lancelotFlipCount = 0;
  state.lancelotRoundFlips = [false, false, false, false, false];
  state.lancelotDrawResults = [false]; // index 0 = round 0, no draw before game starts
  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || state.activeRoles.indexOf('兰斯洛特(红)') !== -1;
  state.lancelotDeck = hasLancelot ? shuffleLancelotDeck() : null;
  state.autoRoles = null;
  state.ladyLakeChecks = [];
  state.ladyCheckHistory = [];
  state.ladyLakeHolder = -1;
  state._undoStack = [];
  state._ladyCheckTriggeredThisRound = false;
  _swapSeatFirst = null;
  state.roundTendencies = [];
  state.identityMarks = [];
  state.playerPredictions = {};
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  state.speakTimes = {};
  state._teamConfirmedPending = false;
  state._excaliburPreConfirm = false;
  // v181：开局进入「选择队长」页，不自动掷色子；未确认前一概不写 leader
  NV_PROMPT = 'choose';
  NV_ASKED = false;
  NV_PENDING_ENTER = false;
  state._nvDecided = false;   // v183：是否已决定开局播报（播完 / 跳过 / 关闭面板后置 true）
  ldrResetPick();
  state.playerRoles = state.playerRoles || [];
  stopTimer();
  for (var i = 0; i < state.playerCount; i++) {
    state.tendencies[i] = 50;
    state.consecutiveRejects[i] = 0;
  }
  state.roundTendencies = [];
  saveLastGame();
  showPage('game');
  var msg = '游戏开始！共 ' + state.playerCount + ' 名玩家，5 轮任务';
  if (state.myRole) msg += '（你的身份：' + state.myRole + '）';
  toast(msg);
  // v178：开局流程 —— 先摇骰子随机选出第一轮队长，停在队长页由用户选择「开始语音播报」或「跳过播报」
  try { startNightOpeningSequence(); } catch (e) { console.warn('夜间播报启动失败', e); }
}

/* ==================== GAME RENDER ==================== */

function renderLancelotFlipTracker() {
  var el = $('lancelot-flip-tracker');
  if (!el) return;
  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || state.activeRoles.indexOf('兰斯洛特(红)') !== -1;
  if (!hasLancelot) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  var flipSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18A7 7 0 0 1 17 6"/><polyline points="16 2 18 6 14 6"/><path d="M17 6A7 7 0 0 1 7 18"/><polyline points="8 22 6 18 10 18"/></svg>';
  var flipImg = '<img src="images/兰斯洛特转移.png?v=3" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  var remaining = state.lancelotDeck ? state.lancelotDeck.length : 0;

  var h = '<div class="lancelot-flip-row">';
  for (var i = 0; i < 5; i++) {
    var cls = 'lancelot-flip-dot';
    var inner = flipSVG;
    var drawInfo = '';

    // Draw result sub-label
    if (i === 0) {
      cls += ' blank';
      drawInfo = '<div class="lancelot-draw-label" style="color:var(--text-dim);font-size:10px">第1轮</div>';
    } else if (i < state.lancelotDrawResults.length && state.lancelotDrawResults[i] !== null && state.lancelotDrawResults[i] !== undefined) {
      var drew = state.lancelotDrawResults[i];
      if (drew) {
        drawInfo = '<div class="lancelot-draw-label flip-label"><img src="images/兰斯洛特转移.png?v=3" style="width:16px;height:16px;border-radius:50%;vertical-align:middle"> 反转</div>';
      } else {
        drawInfo = '<div class="lancelot-draw-label blank-label">&#9711; 未反转</div>';
      }
    } else if (i > state.currentRound) {
      cls += ' future';
      drawInfo = '<div class="lancelot-draw-label" style="color:var(--text-dim);font-size:10px">待抽</div>';
    } else {
      // Round happened but draw result not recorded (unlikely)
      drawInfo = '<div class="lancelot-draw-label" style="color:var(--orange);font-size:10px">?</div>';
    }

    // Flip dot styling
    if (i > 0 && i <= state.currentRound && state.lancelotRoundFlips[i]) {
      cls += ' flipped'; inner = flipImg;
    } else if (i > 0 && i <= state.currentRound && !(state.lancelotDrawResults[i] !== undefined && state.lancelotDrawResults[i] !== null)) {
      cls += ' future';
    } else if (i > state.currentRound) {
      cls += ' future';
    } else if (i > 0 && i <= state.currentRound) {
      cls += ' no-flip';
    }

    h += '<div class="lancelot-flip-col"><div class="' + cls + '">' + inner + '</div>' + drawInfo + '</div>';
  }
  h += '</div>';

  // Remaining deck counter
  if (state.lancelotDeck && state.lancelotDeck.length > 0) {
    h += '<div class="lancelot-deck-counter" title="剩余牌堆"><span class="deck-icon">&#127136;</span><span class="deck-num">' + remaining + '</span></div>';
  } else if (state.lancelotDeck) {
    h += '<div class="lancelot-deck-counter empty" title="牌堆已耗尽"><span class="deck-icon">&#127136;</span><span class="deck-num">0</span></div>';
  }

  el.innerHTML = h;
}

function renderGame() {
  renderRoundTracker();
  renderLancelotFlipTracker();
  renderStepPanel();
  renderLadyLakeResults();
  renderLadyLakeHolderInfo();
  renderLadyLakeEntry();
  renderTimerDisplay();
  renderReviewEntry();
  renderAssassinButton();
  renderUndoButton();
  renderScreenshotButton();
  $('launch-fail-area').innerHTML = '';
 ;
}

/* ==================== ASSASSIN MODE (in-game) ==================== */
function renderAssassinButton() {
  var existing = document.getElementById('assassin-float-btn');
  if (state.winner) {
    if (existing) existing.remove();
    return;
  }
  if (!existing) {
    var btn = document.createElement('button');
    btn.id = 'assassin-float-btn';
    btn.className = 'assassin-float-btn';
    btn.textContent = '拍刀';
    btn.title = '反方拍刀：选择一名玩家作为梅林';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      enterAssassinMode();
    });
    var gamePage = document.getElementById('page-game');
    if (gamePage) gamePage.appendChild(btn);
  }
}

/* ==================== UNDO SYSTEM ==================== */

// Replacer for JSON serialization: exclude timer interval references (non-serializable)
function _undoReplacer(key, val) {
  if (key === '_assassinTimerInterval' || key === 'timerInterval' ||
      key === '_assassinTimerRemaining' || key === '_assassinTimerEnd' ||
      key === '_undoStack' || key === '_timerEnd') return undefined;
  return val;
}

function saveUndo() {
  var snap = JSON.parse(JSON.stringify(state, _undoReplacer));
  state._undoStack.push(snap);
  if (state._undoStack.length > 60) state._undoStack.shift();
  renderUndoButton();
}

function performUndo() {
  if (state._undoStack.length === 0) { toast('没有可撤销的操作', 'warn'); return; }
  if (state.winner) { toast('游戏已结束，无法撤销', 'warn'); return; }
  var snap = state._undoStack.pop();
  // Deep restore: copy each key from snapshot
  var keys = Object.keys(snap);
  for (var i = 0; i < keys.length; i++) {
    state[keys[i]] = snap[keys[i]];
  }
  // 必须在清除 state.timerInterval 之前停止正在运行的计时器，否则 stopTimer 看到 null 会跳过 clearInterval
  stopTimer();
  // Fix non-serializable fields
  state._assassinTimerInterval = null;
  state._assassinTimerEnd = 0;
  state._timerEnd = 0;
  state.timerInterval = null;
  state.timerRemaining = 0;
  state.assassinMode = false;
  state._assassinPickTarget = null;
  // Exit any assassin overlay
  var ao = document.getElementById('assassin-overlay');
  if (ao) ao.remove();
  // 取消 AudioContext 中已调度的所有音频（撤销计时时播放的提示音等）
  if (window._audioCtx) {
    try { window._audioCtx.close(); } catch(_) {}
    window._audioCtx = null;
  }
  // 清除计时结束后调度的 speakEnd / transitionToVotes 回调，防止撤销后重启计时
  clearTimeout(window._undoSpeakEndTimeout);
  clearTimeout(window._undoTransitionTimeout);
  // v185：组队阶段撤销 -> 回到「队长已确认 + 播报双按钮」停留界面（不自动重播）
  var backToLeaderStage = false;
  try { backToLeaderStage = restoreLeaderConfirmedStageAfterUndo(); } catch (_) {}
  renderGame();
  renderUndoButton();
  renderTimerDisplay();
  toast(backToLeaderStage ? '已撤销，回到队长确认页（可重选队长或开始播报）' : '已撤销', 'info');
}

/* v185：撤销后若处于首轮、队长已确定且队伍为空，则还原为队长已确认的停留界面
   条件：第一轮 / leader 已写入 / team 为空 / 无投票 / 无结果 / 未进入发言确认
   还原后：队长保持已确认、可点「重选」、可点「开始语音播报」或「跳过播报」，但不自动播放语音 */
function restoreLeaderConfirmedStageAfterUndo() {
  if (!state.missions || !state.missions.length) return false;
  if (state.currentRound !== 0) return false;
  var m = state.missions[0];
  if (!m || m.leader === null || m.leader === undefined) return false;
  if (m.team && m.team.length > 0) return false;
  if (m.result) return false;
  if (m.votes && Object.keys(m.votes).length > 0) return false;
  if (state._teamConfirmedPending) return false;
  NV_PROMPT = 'confirmed';     // 播报卡片可按「开始语音播报」
  NV_ASKED = true;             // 已询问过，不重复弹出
  NV_PENDING_ENTER = false;    // 明确不自动重播、不自动跳组队页
  state._nvDecided = false;    // 播报尚未决定 -> 命中停留界面分支
  return true;
}

function renderUndoButton() {
  var existing = document.getElementById('undo-float-btn');
  if (state.winner) {
    if (existing) existing.style.display = 'none';
    return;
  }
  if (!existing) {
    var btn = document.createElement('button');
    btn.id = 'undo-float-btn';
    btn.className = 'undo-float-btn';
    btn.textContent = '撤销';
    btn.title = '撤销上一步操作';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      performUndo();
    });
    var gamePage = document.getElementById('page-game');
    if (gamePage) gamePage.appendChild(btn);
  }
  var btn2 = document.getElementById('undo-float-btn');
  if (btn2) btn2.style.display = state._undoStack.length > 0 ? '' : 'none';
}

/* ==================== SCREENSHOT BUTTON (LIVE) ==================== */
function renderScreenshotButton() {
  var existing = document.getElementById('screenshot-float-btn');
  if (state.winner) {
    if (existing) existing.remove();
    return;
  }
  if (!state.missions || !state.missions.length) return;
  if (!existing) {
    var btn = document.createElement('button');
    btn.id = 'screenshot-float-btn';
    btn.className = 'screenshot-float-btn';
    btn.textContent = '截图';
    btn.title = '生成当前进度截图';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      generateLiveScreenshot();
    });
    var undoBtn = document.getElementById('undo-float-btn');
    if (undoBtn && undoBtn.parentNode) {
      undoBtn.parentNode.insertBefore(btn, undoBtn.nextSibling);
    } else {
      var gamePage = document.getElementById('page-game');
      if (gamePage) gamePage.appendChild(btn);
    }
  }
}

function generateLiveScreenshot() {
  try {
  var W = 750;
  var SCALE = 6;
  var PAD = 28;
  var contentW = W - PAD * 2;

  var canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  var ctx = canvas.getContext('2d');

  var pc = state.playerCount;
  var ids = [];
  for (var i = 0; i < pc; i++) {
    ids.push({ name: state.playerNames[i] || ('玩家' + (i + 1)), role: '' });
  }
  function pn(idx) { var p = ids[idx]; return (idx + 1) + '\u53f7 ' + ((p && p.name) || '\u73a9\u5bb6' + (idx + 1)); }
  function pnShort(idx) { var p = ids[idx]; return (idx + 1) + ((p && p.name) || '\u73a9\u5bb6' + (idx + 1)); }
  function tw(text, size) {
    ctx.font = size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    return ctx.measureText(text).width;
  }
  function dt(text, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.fillStyle = color || TXT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function dtSegments(x, y, segs, sz) {
    ctx.font = sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.textBaseline = 'top';
    var cx = x;
    for (var si = 0; si < segs.length; si++) {
      if (segs[si].bold) ctx.font = 'bold ' + sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
      else ctx.font = sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
      ctx.fillStyle = segs[si].color || TXT;
      ctx.textAlign = 'left';
      ctx.fillText(segs[si].text, cx, y);
      cx += tw(segs[si].text, sz);
    }
    return cx;
  }

  var GOLD = '#c8910a';
  var GREEN = '#1e8e3e';
  var GREEN_BRIGHT = '#16a34a';
  var RED = '#d32f2f';
  var BLUE = '#1976d2';
  var TXT = '#3b2f22';
  var TXT_SEC = '#8a6d4f';
  var TXT_DIM = '#b09a80';

  // Compute stats
  var doneMissions = 0, failMissions = 0;
  for (var mi = 0; mi < state.missions.length; mi++) {
    if (state.missions[mi].result === 'success') doneMissions++;
    else if (state.missions[mi].result === 'fail') failMissions++;
  }

  function calcMissionCardH(m) {
    var attempts = m.launchAttempts || [];
    if (attempts.length === 0) attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
    var h = 10 + 18 + 6;
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      h += 18;
      var voteLine = '投票：';
      for (var vi = 0; vi < pc; vi++) {
        var vv = (att.votes[vi] !== undefined) ? att.votes[vi] : (att.votes[String(vi)] !== undefined) ? att.votes[String(vi)] : (att.votes[pn(vi)] !== undefined) ? att.votes[pn(vi)] : null;
        voteLine += pnShort(vi) + (vv === 'approve' ? '✓' : vv === 'reject' ? '✗' : '?') + ' ';
      }
      var approves = 0, rejects = 0;
      for (var vi2 = 0; vi2 < pc; vi2++) {
        var vv2 = (att.votes[vi2] !== undefined) ? att.votes[vi2] : (att.votes[String(vi2)] !== undefined) ? att.votes[String(vi2)] : (att.votes[pn(vi2)] !== undefined) ? att.votes[pn(vi2)] : null;
        if (vv2 === 'approve') approves++; else if (vv2 === 'reject') rejects++;
      }
      voteLine += ' — ' + approves + ':' + rejects;
      h += (tw(voteLine, 10) > contentW - 28) ? 34 : 16;
      h += 2;
    }
    if (m.result) {
      h += 18 + 10;
      if (m.result === 'success' && m.shieldedFails) h += 18;
    }
    return h;
  }

  // Layout sections: header, divider, players, divider, missions, optional rules, bottom divider, footer
  var secH = [];
  secH.push(28 + 8 + 26 + 4 + 16 + 16); // header
  secH.push(16); // divider 1
  secH.push(20 + Math.ceil(pc / 2) * 28 + 4); // player list
  secH.push(16); // divider 2
  var questH = 20 + 12;
  for (var qi = 0; qi < state.missions.length; qi++) {
    var m = state.missions[qi];
    if (!m.result && qi > state.currentRound) continue;
    questH += calcMissionCardH(m) + 8;
  }
  questH -= 8;
  secH.push(questH + 8);
  var rulesH = 0;
  var hasLady = state.ladyCheckHistory && state.ladyCheckHistory.length > 0;
  var hasExcalibur = state.excaliburHistory && state.excaliburHistory.length > 0;
  var hasAnyRule = hasLady || hasExcalibur;
  if (hasAnyRule) {
    rulesH += 20 + 8;
    if (hasLady) rulesH += 18 * state.ladyCheckHistory.length + 4;
    if (hasExcalibur) rulesH += 18 * state.excaliburHistory.length + 4;
    secH.push(rulesH + 8);
  }
  secH.push(12); // bottom divider
  secH.push(18 + 6 + 18 + 16 + 20); // footer

  var totalH = PAD * 2;
  for (var si = 0; si < secH.length; si++) totalH += secH[si];
  canvas.height = Math.ceil(totalH * SCALE);
  ctx.scale(SCALE, SCALE);

  var grad = ctx.createLinearGradient(0, 0, 0, totalH);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#fff7ec');
  grad.addColorStop(1, '#ffedd8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, totalH);

  var y = PAD;
  var si = 0;

  // === Header ===
  (function() {
    // In-progress badge
    var badgeText = '游戏进行中';
    var badgeW = tw(badgeText, 15) + 36;
    var bx = (W - badgeW) / 2;
    rr(bx, y, badgeW, 28, 14);
    var g = ctx.createLinearGradient(bx, 0, bx + badgeW, 0);
    g.addColorStop(0, '#e65100'); g.addColorStop(1, '#fb8c00');
    ctx.fillStyle = g;
    ctx.fill();
    dt(badgeText, W/2, y + 6, 15, '#fff', 'center');
    var ty = y + 28 + 8;
    dt('阿瓦隆（进行中）', W/2, ty, 20, '#e65100', 'center');
    var iy = ty + 26 + 4;
    dt((state.gameStartTime || _bjTimestamp()) + ' · ' + state.playerCount + '人局', W/2, iy, 11, TXT_DIM, 'center');
  })();
  y += secH[si++];

  // === Divider ===
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Player List (no roles) ===
  (function() {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
    dt('玩家列表', PAD + 12, y + 1, 13, TXT_SEC, 'left');
    var gridY = y + 20;
    var colW = (contentW - 12) / 2;
    for (var pi = 0; pi < pc; pi++) {
      var col = pi % 2, row = Math.floor(pi / 2);
      var px = PAD + col * (colW + 12), py = gridY + row * 28;
      ctx.fillStyle = 'rgba(230,81,0,0.05)';
      rr(px, py, colW, 24, 6); ctx.fill();
      dt('⬢', px + 8, py + 5, 10, TXT_DIM, 'left');
      dt(pn(pi), px + 22, py + 4, 13, TXT, 'left');
    }
  })();
  y += secH[si++];

  // === Divider ===
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Missions ===
  (function() {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
    dt('任务历程', PAD + 12, y + 1, 13, TXT_SEC, 'left');
    var qy = y + 20 + 12;
    for (var qi = 0; qi < state.missions.length; qi++) {
      var m = state.missions[qi];
      // Skip future rounds (no data yet)
      if (!m.result && qi > state.currentRound) continue;
      var isSuc = m.result === 'success';
      var isShielded = m.result === 'success' && m.shieldedFails;
      var isPureSuc = m.result === 'success' && !m.failCount && !m.shieldedFails;
      var attempts = m.launchAttempts || [];
      if (attempts.length === 0) attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
      var cardH = calcMissionCardH(m);
      var cx = PAD + 16;
      ctx.fillStyle = 'rgba(230,81,0,0.05)'; rr(PAD, qy, contentW, cardH, 8); ctx.fill();
      var leftColor = isSuc ? GREEN : (m.result === 'fail' ? RED : '#ff9800');
      ctx.fillStyle = leftColor; rr(PAD, qy + 10, 3, cardH - 20, 1.5); ctx.fill();
      var roundLabel = '任务 ' + (qi + 1) + ' · ' + m.size + '人出战';
      if (!m.result) roundLabel += ' · 进行中';
      dt(roundLabel, cx, qy + 10, 13, TXT_SEC, 'left');
      if (m.result) {
        var tagText = isShielded ? ('✓ 成功（含' + m.shieldedFails + '张失败票）') : isPureSuc ? '✓ 成功（全票通过）' : isSuc ? '✓ 成功' : ('✗ ' + missionFailLabel(m));
        var tagW = tw(tagText, 11) + 16, tagX = PAD + contentW - 16 - tagW;
        ctx.fillStyle = isSuc ? 'rgba(30,142,62,0.14)' : 'rgba(211,47,47,0.14)'; rr(tagX, qy + 9, tagW, 18, 9); ctx.fill();
        dt(tagText, PAD + contentW - 16 - tagW / 2, qy + 11, 11, isSuc ? GREEN_BRIGHT : RED, 'center');
      } else {
        var tagText2 = '⏳ 进行中';
        var tagW2 = tw(tagText2, 11) + 16, tagX2 = PAD + contentW - 16 - tagW2;
        ctx.fillStyle = 'rgba(230,81,0,0.12)'; rr(tagX2, qy + 9, tagW2, 18, 9); ctx.fill();
        dt(tagText2, PAD + contentW - 16 - tagW2 / 2, qy + 11, 11, '#e65100', 'center');
      }
      var ay = qy + 10 + 18 + 8;
      for (var a = 0; a < attempts.length; a++) {
        var att = attempts[a], isLast = (a === attempts.length - 1);
        var approves = 0, rejects = 0;
        for (var vk = 0; vk < pc; vk++) {
          var vv = (att.votes[vk] !== undefined) ? att.votes[vk] : (att.votes[String(vk)] !== undefined) ? att.votes[String(vk)] : (att.votes[pn(vk)] !== undefined) ? att.votes[pn(vk)] : null;
          if (vv === 'approve') approves++; else if (vv === 'reject') rejects++;
        }
        var passed = approves > pc / 2;
        var leader = resolvePlayerIdx(att.leader, state.identities); if (leader < 0) leader = 0;
        var teamIndices = att.team || [];
        teamIndices = teamIndices.map(function(x) { return resolvePlayerIdx(x, state.identities); }).filter(function(x) { return x >= 0; });
        var hSegs = [
          { text: '第' + (a + 1) + '次组队 ', color: TXT_DIM },
          { text: '★' + pnShort(leader), color: GOLD },
          { text: '提议：', color: TXT_DIM }
        ];
        for (var ti = 0; ti < teamIndices.length; ti++) {
          if (ti > 0) hSegs.push({ text: '、', color: TXT_DIM });
          hSegs.push({ text: pnShort(teamIndices[ti]), color: TXT });
        }
        dtSegments(cx, ay, hSegs, 11);
        ay += 18;
        var vSegs = [{ text: '投票：', color: TXT_DIM }];
        for (var vi = 0; vi < pc; vi++) {
          var vvv = (att.votes[vi] !== undefined) ? att.votes[vi] : (att.votes[String(vi)] !== undefined) ? att.votes[String(vi)] : null;
          vSegs.push({ text: pnShort(vi), color: TXT });
          vSegs.push({ text: (vvv === 'approve' ? '✓' : vvv === 'reject' ? '✗' : '?') + ' ', color: vvv === 'approve' ? GREEN_BRIGHT : vvv === 'reject' ? RED : TXT_DIM });
        }
        vSegs.push({ text: ' — ' + approves + ':' + rejects + ' ' + (passed ? '通过' : '否决') + ' ' + (passed ? '✓' : '✗'), color: passed ? GREEN_BRIGHT : RED });
        var voteFull = '';
        for (var vsi = 0; vsi < vSegs.length; vsi++) voteFull += vSegs[vsi].text;
        if (tw(voteFull, 10) > contentW - 28) {
          var v1Segs = [vSegs[0]];
          for (var vi = 0; vi < pc; vi++) { v1Segs.push(vSegs[vi * 2 + 1]); v1Segs.push(vSegs[vi * 2 + 2]); }
          dtSegments(cx, ay, v1Segs, 10); ay += 16;
          dtSegments(cx, ay, [vSegs[vSegs.length - 1]], 10); ay += 18 + 2;
        } else { dtSegments(cx, ay, vSegs, 10); ay += 16 + 2; }
      }
      if (m.result) {
        if (m.result === 'fail') {
          var fs = '任务结果：✗ ' + missionFailLabel(m);
          dt(fs, cx, ay, 12, RED, 'left');
        } else if (isShielded) {
          dt('任务结果：✓ 成功（含' + m.shieldedFails + '张失败票，保护轮抵消）', cx, ay, 12, '#e65100', 'left');
          ay += 18;
          // fail card details
          var lastAtt = m.launchAttempts && m.launchAttempts.length > 0 ? m.launchAttempts[m.launchAttempts.length - 1] : null;
          var evilNames = [];
          if (lastAtt && lastAtt.team && state.identities) {
            var tArr = lastAtt.team.map(function(x) { return resolvePlayerIdx(x, state.identities); }).filter(function(x) { return x >= 0; });
            for (var ei = 0; ei < tArr.length; ei++) {
              if (getPlayerFaction(state.identities[tArr[ei]].role) === 'evil') evilNames.push(pnShort(tArr[ei]));
            }
          }
          if (evilNames.length > 0) {
            dt('失败卡：' + m.shieldedFails + '张（' + evilNames.join('、') + '）', cx, ay, 12, RED, 'left', true);
          }
        }
        else if (isPureSuc) { dt('任务结果：✓ 成功（全票通过）', cx, ay, 12, GREEN_BRIGHT, 'left'); }
        else { dt('任务结果：✓ 成功', cx, ay, 12, GREEN_BRIGHT, 'left'); }
      }
      qy += cardH + 8;
    }
  })();
  y += secH[si++];

  // === Optional Rules ===
  if (hasAnyRule) {
    (function() {
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
      dt('可选规则', PAD + 12, y + 1, 13, TXT_SEC, 'left');
      var ry = y + 20 + 8;
      if (hasLady) {
        for (var li = 0; li < state.ladyCheckHistory.length; li++) {
          var lc = state.ladyCheckHistory[li];
          var hldr = (lc.holder != null) ? lc.holder : 0, tgt = (lc.target != null) ? lc.target : 0;
          var rl = lc.round ? '第' + lc.round + '轮后：' : '';
          var lcLabel = lc.result === 'good' ? '好人' : lc.result === 'evil' ? '反方' : (lc.result === 'skip' ? '不报' : (lc.result || '?'));
          dt(rl + pn(hldr) + ' 查验 ' + pn(tgt) + ' → ', PAD + 12, ry, 12, TXT, 'left');
          dt(lcLabel, PAD + 12 + tw(rl + pn(hldr) + ' 查验 ' + pn(tgt) + ' → ', 12), ry, 12, lcLabel === '反方' ? RED : GREEN_BRIGHT, 'left', true);
          ry += 18;
        }
        ry += 4;
      }
      if (hasExcalibur) {
        for (var exi = 0; exi < state.excaliburHistory.length; exi++) {
          var ex = state.excaliburHistory[exi];
          var desc = '王者之剑：' + (ex.holderName || '') + ' 授予 ' + (ex.targetName || '') + (ex.used ? '（已使用）' : '（未使用）');
          dt(desc, PAD + 12, ry, 12, TXT_SEC, 'left'); ry += 18;
        }
        ry += 4;
      }
    })();
    y += secH[si++];
  }

  // === Bottom Divider ===
  (function() {
    var dy = y + 6;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Footer ===
  (function() {
    dt('任务：' + doneMissions + '✓ ' + failMissions + '✗  当前第' + (state.currentRound + 1) + '轮', PAD, y, 12, TXT_DIM, 'left');
    var namesStr = '';
    for (var pi = 0; pi < pc; pi++) { namesStr += pnShort(pi); if (pi < pc - 1) namesStr += '、'; }
    dt('玩家：' + namesStr, PAD, y + 18, 12, TXT_DIM, 'left');
    ctx.fillStyle = '#8a6d4f'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '10px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.fillText('阿瓦隆 · The Resistance Avalon', W / 2, totalH - PAD);
  })();

  canvas.toBlob(function(blob) {
    if (!blob) {
      console.error('[Screenshot] canvas.toBlob returned null (canvas too large or tainted)');
      toast('截图失败：画布生成异常，请重试', 'error');
      return;
    }
    var dateStr = _bjFileStamp();
    var fileName = '阿瓦隆进行中_' + dateStr + '.png';
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
  }, 'image/png');
  console.log('[Screenshot] Live screenshot generated, canvas=' + canvas.width + 'x' + canvas.height);
} catch(e) {
  console.error('[Screenshot] generateLiveScreenshot error:', e);
  toast('截图失败：' + e.message, 'error');
}
}

function enterAssassinMode() {
  state.assassinMode = true;
  state._assassinPickTarget = null;
  var overlay = document.createElement('div');
  overlay.id = 'assassin-overlay';
  overlay.className = 'assassin-overlay active';
  var h = '<div class="assassin-modal">';
  h += '<h2 style="text-align:center;margin:0 0 4px">反方拍刀</h2>';
  h += '<div id="assassin-countdown-display"></div>';
  h += '<p style="text-align:center;color:var(--text-dim);font-size:13px;margin:0 0 16px">选择一名玩家作为梅林</p>';
  h += '<div class="assassin-player-grid">';
  for (var i = 0; i < state.playerCount; i++) {
    h += '<button class="assassin-player-btn" onclick="pickAssassinTarget(' + i + ')">' + playerLabel(i) + '</button>';
  }
  h += '</div>';
  h += '<div class="assassin-actions">';
  h += '<button class="btn primary" id="assassin-confirm-btn" disabled onclick="confirmAssassinAction()">确认拍刀</button>';
  h += '<button class="btn" onclick="exitAssassinMode()">取消</button>';
  h += '</div></div>';
  overlay.innerHTML = h;
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) exitAssassinMode();
  });
  document.body.appendChild(overlay);
  startAssassinTimer();
}

function exitAssassinMode() {
  stopAssassinTimer();
  state.assassinMode = false;
  state._assassinPickTarget = null;
  var overlay = document.getElementById('assassin-overlay');
  if (overlay) overlay.remove();
}

function pickAssassinTarget(idx) {
  state._assassinPickTarget = idx;
  var btns = document.querySelectorAll('#assassin-overlay .assassin-player-btn');
  btns.forEach(function(b, i) {
    b.className = 'assassin-player-btn' + (i === idx ? ' selected' : '');
  });
  var confirmBtn = document.getElementById('assassin-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

function confirmAssassinAction() {
  saveUndo();
  stopAssassinTimer();
  if (state._assassinPickTarget === null) return;
  var targetIdx = state._assassinPickTarget;
  var targetName = playerLabel(targetIdx);
  exitAssassinMode();

  var h = '<h2>拍刀结果</h2>';
  h += '<p style="text-align:center;font-size:15px;margin:12px 0">拍刀目标：<strong style="color:var(--red-bright)">' + targetName + '</strong></p>';
  h += '<p style="text-align:center;font-size:14px;margin-bottom:16px">目标是否为梅林？</p>';
  h += '<div class="modal-actions" style="justify-content:center;gap:16px">';
  h += '<button class="winner-btn evil" onclick="resolveInGameAssassin(true, ' + targetIdx + ')">是梅林 → 反方胜</button>';
  h += '<button class="winner-btn good" onclick="resolveInGameAssassin(false, ' + targetIdx + ')">不是梅林 → 好人方胜</button>';
  h += '</div>';
  showModal(h);
}

function resolveInGameAssassin(isMerlin, targetIdx) {
  closeModal();
  state._assassinAfterRound = state.currentRound;
  state.assassinTarget = targetIdx;
  state.assassinFromMission = true;
  state.winner = isMerlin ? 'evil' : 'good';
  if (isMerlin) {
    state.autoRoles = state.autoRoles || {};
    state.autoRoles[targetIdx] = '梅林';
  }
  stopTimer();
  var btn = document.getElementById('assassin-float-btn');
  if (btn) btn.remove();
  toast(isMerlin ? '拍刀成功！反方获胜' : '拍刀失败！好人方获胜');
  renderGame();
}

function renderRoundTracker() {
  var mc = MISSION_COUNTS[state.playerCount];
  var h = '';
  for (var i = 0; i < 5; i++) {
    var m = state.missions[i];
    var cls = '';
    var extra = '';
    if (i === state.currentRound && !m.result) cls = 'current';
    else if (m && m.result === 'success') { cls = 'success'; extra = '<span class="badge win">&#10003;</span>'; }
    else if (m && m.result === 'fail') { cls = 'fail'; extra = '<span class="badge lose">&#10007;</span>'; }
    h += '<div class="round-dot ' + cls + '" onclick="switchRound(' + i + ')">' + mc[i] + extra + '</div>';
  }
  $('round-tracker').innerHTML = h;
}

function switchRound(i) {
  state.currentRound = i;
  renderGame();
}

/* v181：开局「选择队长」阶段页面 —— 上方选择模块，下方原播报按钮组 */
function renderLeaderPickStage(c, m, reqSize, pc) {
  var h = '';
  h += '<div class="ldr-pick-module">';
  h += '<div class="step-label" style="margin-bottom:8px">选择队长</div>';
  h += '<div class="ldr-pick-desc">掷色子随机选，或手动指定 1~' + pc + ' 号玩家。号码停住后需点「确认」才生效，确认前可重掷。</div>';
  h += '<div class="ldr-pick-btns">';
  h += '<button class="btn primary" id="ldr-dice-btn" onclick="ldrPickDice()">&#127922; 掷色子选队长</button>';
  h += '<button class="btn" id="ldr-manual-btn" onclick="ldrPickManual()">&#9995; 手动选择队长</button>';
  h += '</div>';
  h += '<div class="ldr-pick-tip">确认队长的页面上会再做开局播报（首轮需 ' + reqSize + ' 人出任务）</div>';
  h += '</div>';
  if (!NV_ASKED) h += nvPromptCardHTML();
  c.innerHTML = h;
}

/* v183：开局播报卡片（结构与样式沿用 v182，供队长选择页 / 已确认队长页 / 步骤A 复用） */
function nvPromptCardHTML() {
  var h = '';
  h += '<div style="text-align:center;padding:18px 12px;border:2px solid var(--gold);border-radius:var(--radius);background:var(--bg-card);margin:12px 0">';
  h += '<div style="font-size:17px;color:var(--gold-light);margin-bottom:6px">开局夜间身份播报</div>';
  h += '<div style="font-size:13px;color:var(--text-dim);margin-bottom:14px">请所有玩家闭上眼睛就位，点「开始语音播报」按顺序念本场身份；也可跳过播报。</div>';
  h += '<div class="ldr-pick-btns">';
  h += '<button class="btn primary" id="nv-prompt-start" onclick="nvPromptStart()">开始语音播报</button>';
  h += '<button class="btn" id="nv-prompt-skip" onclick="nvPromptSkip()">跳过播报</button>';
  h += '</div></div>';
  return h;
}

/* v183：队长已确认、还没决定播报 —— 停在队长页，播报卡片保留原位、可点击 */
function renderLeaderConfirmedStage(c, m, reqSize) {
  var h = '';
  h += '<div class="ldr-pick-module">';
  h += '<div class="step-label" style="margin-bottom:8px">队长已确认</div>';
  h += '<div style="margin-bottom:8px"><span class="leader-badge">&#9812; 已选队长：' + playerLabel(m.leader) + '</span>';
  h += ' <button class="btn small warn" onclick="reSelectLeader()">重选</button></div>';
  h += '<div class="ldr-pick-tip">点「开始语音播报」念完身份后进入组队页；点「跳过播报」直接组队（首轮需 ' + reqSize + ' 人出任务）</div>';
  h += '</div>';
  // v183：播报卡片始终保留为进入组队页的唯一出口，避免“已播报过又确认队长”后无路可走
  h += nvPromptCardHTML();
  c.innerHTML = h;
}

function renderStepPanel() {
  var m = state.missions[state.currentRound];
  console.log('[debug-renderStep] round=' + state.currentRound + ' leader=' + (m ? m.leader : 'MISSING') + ' teamLen=' + (m && m.team ? m.team.length : '?') + ' teamPending=' + state._teamConfirmedPending + ' hasResult=' + (m && m.result ? 'yes' : 'no'));
  if (!m) return;
  // 防御：若 _teamConfirmedPending 为 true 但队伍为空且非投票确认态，说明 flag 是脏数据，强制重置
  if (state._teamConfirmedPending && m.team && m.team.length === 0 && Object.keys(m.votes || {}).length === 0) {
    console.warn('[fix] _teamConfirmedPending stale, resetting');
    state._teamConfirmedPending = false;
  }
  var c = $('step-container');
  var reqSize = m.size;
  var pc = state.playerCount;
  var h = '';

  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<span class="step-label">第' + (state.currentRound + 1) + '轮 · 需要 ' + reqSize + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">' + (m.result ? (m.result === 'success' ? '已完成 ✓' : '已失败 ✕') : '进行中');
  if (m.launchFailures > 0) h += ' · 组队未通过 ' + m.launchFailures + ' 次';
  h += '</span></div>';

  if (m.result) {
    h += '<div style="text-align:center;padding:16px">';
    h += '<div style="font-size:52px;margin-bottom:6px">' + (m.result === 'success' ? '&#128737;' : '&#128481;') + '</div>';
    h += '<div style="font-size:17px;color:' + (m.result === 'success' ? '#99ff99' : '#ff9999') + '">';
    if (m.result === 'success' && m.shieldedFails) {
      h += '任务成功（含' + m.shieldedFails + '张失败票）';
    } else if (m.result === 'success' && !m.failCount) {
      h += '任务成功（全票通过）';
    } else if (m.result === 'success') {
      h += '任务成功';
    } else {
      h += '任务' + missionFailLabel(m);
    }
    h += '</div>';
    if (state.winner) {
      h += '<div style="margin-top:10px;font-size:16px;font-weight:700;color:var(--gold-light)">';
      h += '游戏结束：' + (state.winner === 'good' ? '好人方获胜' : '反方获胜');
      if (state.winner === 'evil' && state.assassinTarget !== null) {
        h += '（刺杀' + playerLabel(state.assassinTarget) + '）';
      }
      h += '</div>';
      h += '<div style="margin-top:8px"><button class="btn primary" onclick="showPage(\'end\')">进入结束面板</button></div>';
    }
    h += '</div>';
    c.innerHTML = h;
    return;
  }

  var votesConfirmed = Object.keys(m.votes).length > 0;

  // v181：开局选队长页 —— 上方「选择队长」模块，下方原「开始语音播报 / 跳过播报」
  if (m.leader === null && (NV_PROMPT === 'choose' || NV_PROMPT === 'confirmed') && state.currentRound === 0) {
    renderLeaderPickStage(c, m, reqSize, pc);
    return;
  }

  // v183：队长已确认但还没决定播报 —— 停在队长页，播报卡片保留可用，不跳组队页
  if (m.leader !== null && !state._nvDecided && state.currentRound === 0 &&
      m.team.length === 0 && !votesConfirmed && !state._teamConfirmedPending) {
    renderLeaderConfirmedStage(c, m, reqSize);
    return;
  }

  if (m.leader === null) {
    if (state._firstLeaderPicked) {
      var nextLeader = (state._lastLeaderIdx + 1) % pc;
      selectLeader(nextLeader);
      return;
    }
    h += '<div style="margin-bottom:10px"><div class="step-label">步骤A：选择队长</div><div class="btn-row captain-row">';
    for (var i = 0; i < pc; i++) {
      h += '<button class="btn" onclick="selectLeader(' + i + ')">' + playerLabel(i) + '</button>';
    }
    h += '<button class="btn random-leader-btn" onclick="randomFirstLeader()" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;font-weight:700">&#127922; 随机</button>';
    h += '</div></div>';
    // v183：此页同样保留播报入口，避免出现没有播报入口的死路
    if (state.currentRound === 0 && !NV_ASKED) h += nvPromptCardHTML();
    c.innerHTML = h;
    return;
  }

  var leaderName = playerLabel(m.leader);

  // v178：开局骰子选出首轮队长后停在此页，由用户选择「开始语音播报」或「跳过播报」
  if (NV_PROMPT === 'pending') {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + leaderName + '</span>';
    h += '<span style="color:var(--text-dim);margin-left:10px">已选 ' + m.team.length + '/' + reqSize + ' 人</span></div>';
    h += '<div style="text-align:center;padding:18px 12px;border:2px solid var(--gold);border-radius:var(--radius);background:var(--bg-card);margin:12px 0">';
    h += '<div style="font-size:17px;color:var(--gold-light);margin-bottom:6px">开局夜间身份播报</div>';
    h += '<div style="font-size:13px;color:var(--text-dim);margin-bottom:14px">请所有玩家闭上眼睛就位，点「开始语音播报」按顺序念本场身份；也可跳过播报，直接开始组队。</div>';
    h += '<div class="ldr-pick-btns">';
    h += '<button class="btn primary" id="nv-prompt-start" onclick="nvPromptStart()">开始语音播报</button>';
    h += '<button class="btn" id="nv-prompt-skip" onclick="nvPromptSkip()">跳过播报</button>';
    h += '</div></div>';
    c.innerHTML = h;
    return;
  }

  if (state._teamConfirmedPending) {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + leaderName + '</span>';
    var pendingTeamHTML = m.team.map(function(i) {
      return '<span style="display:inline-block;padding:3px 10px;margin:2px 3px;border:2px solid var(--gold);border-radius:20px;background:rgba(201,168,76,0.1);color:var(--gold-light);font-size:13px;font-weight:600;box-shadow:0 0 6px rgba(201,168,76,0.2)">' + playerLabel(i) + '</span>';
    }).join('');
    h += '<div style="margin-top:6px">' + pendingTeamHTML + '</div></div>';
    h += '<div style="text-align:center;padding:20px;border:2px solid var(--gold);border-radius:var(--radius);background:var(--bg-card);margin:12px 0">';
    h += '<div style="font-size:18px;color:var(--gold-light);margin-bottom:8px">发言进行中</div>';
    h += '<div style="font-size:13px;color:var(--text-dim)">队长已确认队伍，请按顺序发言。计时结束后将进入投票阶段。</div>';
    h += '</div>';
    h += buildSpeechPhaseInfoPanel();
    if (state.timerMode !== 'off') {
      h += '<div style="text-align:center;margin-top:8px"><button class="btn" onclick="reopenCombinedModal()" style="color:var(--gold-light);border-color:var(--gold);font-size:13px">&#9998; 填写反馈</button></div>';
    }

    c.innerHTML = h;
    return;
  }

  if (votesConfirmed) {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + leaderName + '</span>';
    var teamMembersHTML = m.team.map(function(i) {
      return '<span style="display:inline-block;padding:3px 10px;margin:2px 3px;border:2px solid var(--gold);border-radius:20px;background:rgba(201,168,76,0.1);color:var(--gold-light);font-size:13px;font-weight:600;box-shadow:0 0 6px rgba(201,168,76,0.2)">' + playerLabel(i) + '</span>';
    }).join('');
    h += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:4px"><span style="color:var(--text-dim);font-size:13px">队伍：</span>' + teamMembersHTML + '</div></div>';
  } else {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + leaderName + '</span>';
    h += ' <button class="btn small warn" onclick="reSelectLeader()">重选</button>';
    // v192：开局播报入口只在尚未决定播报的首轮组队前保留；进入第一轮后不再显示
    if (state.currentRound === 0 && m.team.length === 0 && !state._nvDecided) {
      h += ' <button class="btn small" onclick="openNightVoice(false)">&#127769; 开局播报</button>';
    }
    h += '<span style="color:var(--text-dim);margin-left:10px">已选 ' + m.team.length + '/' + reqSize + ' 人</span></div>';

    h += '<div style="margin-bottom:10px"><div class="step-label">步骤B：选择队伍成员</div>';
    h += '<div class="btn-row team-member-row" style="gap:8px;flex-wrap:wrap;justify-content:center">';
    for (var i = 0; i < pc; i++) {
      var inTeam = m.team.indexOf(i) !== -1;
      var cls = 'btn team-member-btn';
      if (inTeam) cls += ' selected team-member-highlight';
      h += '<button class="' + cls + '" onclick="toggleTeamMember(' + i + ')">';
      h += playerLabel(i) + (i === m.leader ? ' ♔' : '');
      h += '</button>';
    }
    h += '</div>';
    h += '</div>';

    h += '<div style="text-align:center;margin-bottom:12px">';
    h += '<button class="btn primary" onclick="confirmTeam()"';
    if (m.team.length !== reqSize) h += ' disabled';
    h += '>确认队伍 (' + m.team.length + '/' + reqSize + ')</button>';
    h += '</div>';
  }

  if (votesConfirmed) {
    h += '<hr style="border-color:var(--border);margin-bottom:10px">';
    h += '<div class="step-label">步骤C：全员投票 <span style="font-size:11px;color:var(--text-dim);font-weight:400">（默认赞成，点击切换反对）</span></div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    for (var i = 0; i < pc; i++) {
      var v = m.votes[i];
      var onTeam = m.team.indexOf(i) !== -1;
      h += '<div class="vote-row" style="width:calc(50% - 4px)">';
      h += '<span class="voter-name">' + playerLabel(i) + '</span>';
      if (onTeam) h += '<span class="on-team">⚔队伍</span>';
      h += '<div class="vote-btns">';
      h += '<span class="vote-num">' + (i + 1) + '</span>';
      h += '<div class="vote-btn approve' + (v === 'approve' ? ' selected' : '') + '" onclick="castVote(' + i + ',\'approve\')">&#128077;</div>';
      h += '<div class="vote-btn reject' + (v !== 'approve' ? ' selected' : '') + '" onclick="castVote(' + i + ',\'reject\')">&#128078;</div>';
      h += '</div></div>';
    }
    h += '</div>';
    h += '<div style="display:flex;justify-content:flex-end;padding-right:8px;margin-top:4px;gap:8px"><button class="btn small success" onclick="allApprove()">全员赞成</button><button class="btn small danger" onclick="allReject()">全员反对</button></div>';
    h += '<div style="text-align:center;margin-top:8px">';
    h += '<button class="btn primary" onclick="confirmVotes()">投票完成</button></div>';
  }

  c.innerHTML = h;
}

/* ==================== LADY OF THE LAKE ==================== */
function renderLadyLakeResults() {
  // 湖中验人记录已合并至女神系谱栏，此处仅保留容器清理
  var el = $('lady-lake-results');
  if (el) el.innerHTML = '';
}

function renderLadyLakeEntry() {
  // 湖中女神改为发言阶段记录，不再保留侧边栏手动入口
  var el = $('lady-lake-entry');
  if (!el) return;
  el.style.display = 'none';
}

function renderLadyLakeHolderInfo() {
  var el = $('lady-lake-holder-info');
  if (!el) return;
  if (!state.ladyOfLakeEnabled) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  var h = '';
  // 显示验人历史
  var history = state.ladyCheckHistory || [];
  if (history.length > 0) {
    var genNum = 1;
    for (var hi = 0; hi < history.length; hi++) {
      var rec = history[hi];
      h += '<div style="font-size:14px;color:var(--text);margin-bottom:5px;line-height:1.5">';
      h += '<strong>第' + genNum + '任女神：</strong>' + (rec.holder + 1) + '号 ' + state.playerNames[rec.holder] + ' <span style="color:var(--gold-light)">→</span> 验 ' + (rec.target + 1) + '号 ' + state.playerNames[rec.target];
      h += ' <span style="font-weight:700;font-size:15px;color:' + (rec.result === 'good' ? '#99bbff' : rec.result === 'skip' ? '#999' : '#ff9999') + '">' + (rec.result === 'good' ? '好人' : rec.result === 'evil' ? '反方' : '不报') + '</span>';
      h += '</div>';
      genNum++;
    }
  }
  // 当前持有者
  if (state.ladyLakeHolder >= 0) {
    h += '<div style="font-size:13px;font-weight:700;color:var(--gold-light);margin-top:4px;border-top:1px solid var(--border);padding-top:4px">';
    h += '当前女神：' + (state.ladyLakeHolder + 1) + '号 ' + state.playerNames[state.ladyLakeHolder];
    h += '</div>';
  }
  el.innerHTML = h || '<span style="color:var(--text-dim)">湖中女神未分配</span>';
}

function showPerSpeakerModals() {
  if (state.timerMode !== 'per' || state.currentSpeakerIdx < 0) return;
  var speaker = state.speakerOrder[state.currentSpeakerIdx];
  var isLadyHolder = (speaker === state.ladyLakeHolder);
  var needLady = state.ladyOfLakeEnabled && state.currentRound >= 2 && state.ladyLakeHolder >= 0 && !hasLadyClaimThisRound() && isLadyHolder;
  if (needLady) {
    stopTimer();
    state._modalPausedTimer = true;
    showLadyCheck();
    return;
  }
}

function resumePerSpeakerTimer() {
  if (state._modalPausedTimer && state.timerMode === 'per') {
    state._modalPausedTimer = false;
    startTimer();
  }
}

function showExcaliburWithLady(round) {
  if (!state.excaliburEnabled || !state.ladyOfLakeEnabled) return;
  if (state.currentRound < 2) return;
  var m = state.missions[round];
  if (!m || !m.team || m.team.length === 0) return;
  var rec = ensureExcaliburRecord(round);
  var h = '';
  // 王者之剑（上半部分）
  h += '<h2>王者之剑</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:10px">队长指定本轮队伍成员持剑。后续若使用，只能对队伍中除持剑者外的玩家使用。</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < m.team.length; i++) {
    var pi = m.team[i];
    if (pi === m.leader) continue;
    h += '<button class="assassin-target-btn" onclick="onExcaliburInCombinedModal(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
  }
  h += '</div>';
  if (rec.holder >= 0) h += '<p style="font-size:12px;color:var(--text-dim);margin-top:10px">当前持剑者：' + playerLabel(rec.holder) + '</p>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeModal()">稍后指定</button></div>';
  // 分隔线
  h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
  // 湖中女神（下半部分）
  h += '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人方/反方）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  var pc = state.playerCount;
  for (var j = 0; j < pc; j++) {
    if (j === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
    h += '<button class="assassin-target-btn" onclick="doLadyCheck(' + j + ')">' + playerLabel(j) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeModal()" style="color:var(--text-dim)">不报（放弃本次验人）</button></div>';
  showModal(h);
}


// Combined modal: after Excalibur pick, transition to Lady check
function onExcaliburInCombinedModal(round, pi) {
  if (state.currentRound < 2) { closeModal(); return; }
  var rec = ensureExcaliburRecord(round);
  rec.holder = pi;
  rec.used = rec.used === undefined ? null : rec.used;
  rec.target = (rec.target === pi) ? null : rec.target;
  toast('王者之剑持剑者：' + playerLabel(pi));
  renderGame();
  // Replace modal content with Lady-only UI
  var modal = document.getElementById('temp-modal');
  if (!modal) return;
  var h = '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人方/反方）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  var pc = state.playerCount;
  for (var j = 0; j < pc; j++) {
    if (j === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
    h += '<button class="assassin-target-btn" onclick="doLadyCheck(' + j + ')">' + playerLabel(j) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeModal()" style="color:var(--text-dim)">不报（放弃本次验人）</button></div>';
  modal.innerHTML = h;
}

// Excalibur feedback modal: shows during sword holder's speech
function showExcaliburFeedbackModal(rec) {
  if (!rec || rec.round < 0) return;
  var h = '<h2>上轮王者之剑使用反馈</h2>';
  h += '<p style="font-size:14px;margin-bottom:6px">第' + (rec.round + 1) + '轮持剑者 <b>' + playerLabel(rec.holder) + '</b> 对 <b>' + playerLabel(rec.target) + '</b> 使用了王者之剑。</p>';
  var targetRole = (state.playerRoles && state.playerRoles[rec.target]) || null;
  if (targetRole === 'merlin' || targetRole === 'percival') {
    h += '<p style="color:var(--good);font-weight:700">该玩家是好人方</p>';
  } else if (targetRole === 'morgana' || targetRole === 'assassin' || targetRole === 'mordred' || targetRole === 'oberon' || targetRole === 'bad') {
    h += '<p style="color:var(--evil);font-weight:700">该玩家是反方</p>';
  }
  h += '<div style="text-align:center;margin-top:12px"><button class="btn primary" onclick="ackExcaliburFeedback(' + rec.round + ')">知道了</button></div>';
  showModal(h);
}

function ackExcaliburFeedback(round) {
  var rec = getExcaliburRecord(round);
  if (rec) rec.feedbackRecorded = true;
  closeModal();
  var btnRow = document.getElementById('timer-btns');
  if (btnRow) btnRow.hidden = false;
  resumePerSpeakerTimer();
}

// Combined modal: Excalibur feedback + Lady check
function showExcaliburFeedbackWithLady(rec) {
  if (!rec || rec.round < 0) return;
  if (state.currentRound < 2) return;
  var h = '<h2>上轮王者之剑使用反馈</h2>';
  h += '<p style="font-size:14px;margin-bottom:6px">第' + (rec.round + 1) + '轮持剑者 <b>' + playerLabel(rec.holder) + '</b> 对 <b>' + playerLabel(rec.target) + '</b> 使用了王者之剑。</p>';
  var targetRole = (state.playerRoles && state.playerRoles[rec.target]) || null;
  if (targetRole === 'merlin' || targetRole === 'percival') {
    h += '<p style="color:var(--good);font-weight:700">该玩家是好人方</p>';
  } else if (targetRole === 'morgana' || targetRole === 'assassin' || targetRole === 'mordred' || targetRole === 'oberon' || targetRole === 'bad') {
    h += '<p style="color:var(--evil);font-weight:700">该玩家是反方</p>';
  }
  h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
  h += '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人方/反方）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  var pc = state.playerCount;
  for (var j = 0; j < pc; j++) {
    if (j === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
    h += '<button class="assassin-target-btn" onclick="onLadyCheckWithExcalFeedback(' + j + ',' + rec.round + ')">' + playerLabel(j) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="skipLadyWithExcalFeedback(' + rec.round + ')" style="color:var(--text-dim)">不报（放弃本次验人）</button></div>';
  showModal(h);
}

function onLadyCheckWithExcalFeedback(idx, excalRound) {
  var rec = getExcaliburRecord(excalRound);
  if (rec) rec.feedbackRecorded = true;
  doLadyCheck(idx);
  var btnRow = document.getElementById('timer-btns');
  if (btnRow) btnRow.hidden = false;
  resumePerSpeakerTimer();
}

function skipLadyWithExcalFeedback(excalRound) {
  var rec = getExcaliburRecord(excalRound);
  if (rec) rec.feedbackRecorded = true;
  closeModal();
  var btnRow = document.getElementById('timer-btns');
  if (btnRow) btnRow.hidden = false;
  resumePerSpeakerTimer();
}

// === 合并确认弹窗（持剑者 + 用剑反馈 + 女神验人）===

function showCombinedConfirmModal() {
  var round = state.currentRound;
  var m = state.missions[round];
  var showHolder = state.excaliburEnabled && m && m.team && m.team.length > 0;
  var prevRec = null;
  if (state.excaliburEnabled && round > 0 && state.excaliburHistory) {
    for (var _k = 0; _k < state.excaliburHistory.length; _k++) {
      var _pv = state.excaliburHistory[_k];
      if (_pv.used !== false && _pv.target !== null && !_pv.feedbackRecorded && _pv.round < round && _pv.holder >= 0) {
        prevRec = _pv;
        break;
      }
    }
  }
  var showPrevFeedback = prevRec !== null;
  var showLady = state.ladyOfLakeEnabled && round >= 2 && state.ladyLakeHolder >= 0 && !hasLadyClaimThisRound();
  if (!showHolder && !showPrevFeedback && !showLady) {
    startTimer();
    renderStepPanel();
    return;
  }
  stopTimer();
  if (state.timerMode === 'per') state._modalPausedTimer = true;
  var h = '';
  try {
    // ① 指定持剑者
    if (showHolder) {
      var rec = ensureExcaliburRecord(round);
      h += '<h2>王者之剑 · 指定持剑者</h2>';
      h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:10px">队长指定本轮队伍成员持剑。</p>';
      h += '<div style="display:flex;flex-direction:column;gap:8px">';
      for (var i = 0; i < m.team.length; i++) {
        var pi = m.team[i];
        if (pi === m.leader) continue;
        h += '<button class="assassin-target-btn" onclick="onCombinedSetHolder(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
      }
      h += '</div>';
      h += '<p id="combined-holder-info" style="font-size:12px;color:var(--text-dim);margin-top:10px">' + (rec.holder >= 0 ? '当前持剑者：' + playerLabel(rec.holder) : '') + '</p>';
    }
    // ② 上轮用剑反馈
    if (showPrevFeedback) {
      if (h) h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
      h += '<h2>上轮王者之剑反馈</h2>';
      h += '<p style="font-size:14px;margin-bottom:6px">第' + (prevRec.round + 1) + '轮持剑者 <b>' + playerLabel(prevRec.holder) + '</b> 对 <b>' + playerLabel(prevRec.target) + '</b> 使用了王者之剑。</p>';
      var targetRole = (state.playerRoles && state.playerRoles[prevRec.target]) || null;
      if (targetRole === 'merlin' || targetRole === 'percival') {
        h += '<p style="color:var(--good);font-weight:700">该玩家是好人方</p>';
      } else if (targetRole === 'morgana' || targetRole === 'assassin' || targetRole === 'mordred' || targetRole === 'oberon' || targetRole === 'bad') {
        h += '<p style="color:var(--evil);font-weight:700">该玩家是反方</p>';
      }
      h += '<label style="display:block;font-size:13px;color:var(--text-dim);margin-top:12px;margin-bottom:4px">持剑者口述改变方向</label>';
      h += '<select id="combined-excal-dir-' + prevRec.round + '" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-dim);background:var(--bg-input);color:var(--text);margin-bottom:8px">';
      h += '<option value="fail_to_success">失败 → 成功</option><option value="success_to_fail">成功 → 失败</option><option value="unknown" selected>未说明</option><option value="refused">拒绝说明</option>';
      h += '</select>';
      h += '<input id="combined-excal-note-' + prevRec.round + '" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-dim);background:var(--bg-input);color:var(--text);margin-bottom:8px" placeholder="备注：记录原话或简述">';
    }
    // ③ 湖中女神验人
    if (showLady) {
      if (h) h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
      h += '<h2>湖中女神验人</h2>';
      h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营</p>';
      h += '<div style="display:flex;flex-direction:column;gap:8px">';
      var pc = state.playerCount;
      for (var j = 0; j < pc; j++) {
        if (j === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
        h += '<button class="assassin-target-btn" onclick="onCombinedLadyCheck(' + j + ')">' + playerLabel(j) + '</button>';
      }
      h += '</div>';
    }
    // 完成按钮
    h += '<div style="text-align:center;margin-top:16px"><button class="btn primary" onclick="onCombinedModalClose()">完成</button></div>';
    showModal(h, onCombinedModalCancel);
  } catch (e) {
    console.error('[showCombinedConfirmModal] crash:', e);
    toast('[错误] 合并弹窗生成失败：' + (e.message || e));
    if (state.timerMode === 'per') state._modalPausedTimer = false;
    startTimer();
    renderStepPanel();
  }
}

function onCombinedSetHolder(round, holderIdx) {
  var rec = ensureExcaliburRecord(round);
  rec.holder = holderIdx;
  rec.used = null;
  rec.target = null;
  toast('王者之剑持剑者：' + playerLabel(holderIdx));
  var infoEl = document.getElementById('combined-holder-info');
  if (infoEl) infoEl.textContent = '当前持剑者：' + playerLabel(holderIdx);
}

function _saveCombinedFeedback() {
  if (!state.excaliburHistory) return;
  var round = state.currentRound;
  for (var _k = 0; _k < state.excaliburHistory.length; _k++) {
    var _pv = state.excaliburHistory[_k];
    if (_pv.used !== false && _pv.target !== null && !_pv.feedbackRecorded && _pv.round < round && _pv.holder >= 0) {
      var dirEl = document.getElementById('combined-excal-dir-' + _pv.round);
      var noteEl = document.getElementById('combined-excal-note-' + _pv.round);
      if (dirEl) { _pv.claimedDirection = dirEl.value; _pv.feedbackRecorded = true; _pv.feedbackRound = state.currentRound; _pv.feedbackAt = Date.now(); }
      if (noteEl) _pv.note = noteEl.value;
      break;
    }
  }
}

function onCombinedModalClose() {
  _saveCombinedFeedback();
  closeModal();
  if (state.timerMode === 'per') state._modalPausedTimer = false;
  startTimer();
  renderStepPanel();
}

function onCombinedModalCancel() {
  closeModal();
  if (state.timerMode === 'per') state._modalPausedTimer = false;
  startTimer();
  renderStepPanel();
}

function reopenCombinedModal() {
  var round = state.currentRound;
  var m = state.missions[round];
  var showHolder = state.excaliburEnabled && m && m.team && m.team.length > 0;
  var prevRec = null;
  if (state.excaliburEnabled && round > 0 && state.excaliburHistory) {
    for (var k = 0; k < state.excaliburHistory.length; k++) {
      var pv = state.excaliburHistory[k];
      if (pv.used !== false && pv.target !== null && !pv.feedbackRecorded && pv.round < round && pv.holder >= 0) {
        prevRec = pv;
        break;
      }
    }
  }
  var showPrevFeedback = prevRec !== null;
  var showLady = state.ladyOfLakeEnabled && round >= 2 && state.ladyLakeHolder >= 0 && !hasLadyClaimThisRound();
  if (!showHolder && !showPrevFeedback && !showLady) {
    toast('当前没有待填写的反馈', 'info');
    return;
  }
  showCombinedConfirmModal();
}

function onCombinedLadyCheck(targetIdx) {
  _saveCombinedFeedback();
  closeModal();
  var h = '<h2>湖中女神验人结果</h2>';
  h += '<p style="font-size:15px;margin-bottom:10px">查验目标：<strong style="color:var(--gold-light)">' + playerLabel(targetIdx) + '</strong></p>';
  h += '<p style="font-size:14px;margin-bottom:14px">该玩家的阵营是？</p>';
  h += '<div class="winner-toggle">';
  h += '<button class="winner-btn good" onclick="onCombinedRecordLady(' + targetIdx + ',\'good\')">好人方</button>';
  h += '<button class="winner-btn evil" onclick="onCombinedRecordLady(' + targetIdx + ',\'evil\')">反方</button>';
  h += '</div>';
  h += '<div style="text-align:center;margin-top:10px"><button class="btn" onclick="onCombinedRecordLady(' + targetIdx + ',\'skip\')" style="color:var(--text-dim);font-size:13px">不报</button></div>';
  showModal(h);
}

function onCombinedRecordLady(targetIdx, result) {
  closeModal();
  var holderIdx = state.ladyLakeHolder;
  state.ladyLakeChecks.push({
    round: state.currentRound,
    target: targetIdx,
    result: result,
    holder: holderIdx
  });
  state.ladyCheckHistory.push({
    round: state.currentRound,
    holder: holderIdx,
    target: targetIdx,
    result: result
  });
  state.ladyLakeHolder = targetIdx;
  if (!(targetIdx in state.tendencies)) state.tendencies[targetIdx] = 50;
  if (result === 'good') {
    state.tendencies[targetIdx] = Math.min(100, state.tendencies[targetIdx] + 15);
  } else if (result === 'evil') {
    state.tendencies[targetIdx] = Math.max(0, state.tendencies[targetIdx] - 15);
  }
  var resultLabel = result === 'good' ? '好人' : result === 'evil' ? '坏人' : '不报';
  toast(playerLabel(holderIdx) + '验' + playerLabel(targetIdx) + ' → ' + resultLabel + '，头衔已传递');
  if (state.timerMode === 'per') state._modalPausedTimer = false;
  startTimer();
  renderStepPanel();
}

function showLadyCheck() {
  if (!state.ladyOfLakeEnabled) return;
  if (state.currentRound < 3) return;
  var pc = state.playerCount;
  var h = '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人方/反方）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < pc; i++) {
    if (i === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
    h += '<button class="assassin-target-btn" onclick="doLadyCheck(' + i + ')">' + playerLabel(i) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="skipLadyCheck()" style="color:var(--text-dim)">不报（放弃本次验人）</button></div>';
  showModal(h);
}

function skipLadyCheck() {
  closeModal();
  resumePerSpeakerTimer();
}

function doLadyCheck(targetIdx) {
  closeModal();
  var pc = state.playerCount;
  // Determine faction: we need to simulate - in the assistant context we don't know real roles
  // Show a modal to let the user input the real result
  var h = '<h2>湖中女神验人结果</h2>';
  h += '<p style="font-size:15px;margin-bottom:10px">查验目标：<strong style="color:var(--gold-light)">' + playerLabel(targetIdx) + '</strong></p>';
  h += '<p style="font-size:14px;margin-bottom:14px">该玩家的阵营是？</p>';
  h += '<div class="winner-toggle">';
  h += '<button class="winner-btn good" onclick="recordLadyCheck(' + targetIdx + ',\'good\')">&#128737; 好人方</button>';
  h += '<button class="winner-btn evil" onclick="recordLadyCheck(' + targetIdx + ',\'evil\')">&#128481; 反方</button>';
  h += '</div>';
  h += '<div style="text-align:center;margin-top:10px"><button class="btn" onclick="recordLadyCheck(' + targetIdx + ',\'skip\')" style="color:var(--text-dim);font-size:13px">不报</button></div>';
  showModal(h);
}

function recordLadyCheck(targetIdx, result) {
  saveUndo();
  closeModal();
  var holderIdx = state.ladyLakeHolder;
  var holderLabel = playerLabel(holderIdx);
  state.ladyLakeChecks.push({
    round: state.currentRound,
    target: targetIdx,
    result: result,
    holder: holderIdx
  });
  // 湖中女神头衔传递给被验者
  state.ladyCheckHistory.push({
    round: state.currentRound,
    holder: holderIdx,
    target: targetIdx,
    result: result
  });
  state.ladyLakeHolder = targetIdx;
  // Update tendencies based on lady check
  if (!(targetIdx in state.tendencies)) state.tendencies[targetIdx] = 50;
  if (result === 'good') {
    state.tendencies[targetIdx] = Math.min(100, state.tendencies[targetIdx] + 15);
  } else if (result === 'evil') {
    state.tendencies[targetIdx] = Math.max(0, state.tendencies[targetIdx] - 15);
  }
  // 'uncertain' 不改变倾向值
  var resultLabel = result === 'good' ? '好人' : result === 'evil' ? '坏人' : '不报';
  renderGame();
  toast(holderLabel + '验' + playerLabel(targetIdx) + ' → ' + resultLabel + '，头衔已传递');
  resumePerSpeakerTimer();
}

/* 湖中女神发言环节内联验人界面 */
var _ladySpeechSelected = null; // 发言环节中选中的查验目标

function selectLadySpeechTarget(idx) {
  _ladySpeechSelected = idx;
  renderStepPanel();
}

function doLadyCheckInline(result) {
  if (_ladySpeechSelected === null) return;
  var targetIdx = _ladySpeechSelected;
  _ladySpeechSelected = null;
  recordLadyCheck(targetIdx, result);
}

function undoLadyCheck(round) {
  // 撤销本轮湖中女神查验
  for (var i = state.ladyLakeChecks.length - 1; i >= 0; i--) {
    if (state.ladyLakeChecks[i].round === round) {
      var c = state.ladyLakeChecks[i];
      // 恢复倾向值
      if (c.result === 'good' && (c.target in state.tendencies)) {
        state.tendencies[c.target] = Math.max(0, state.tendencies[c.target] - 15);
      } else if (c.result === 'evil' && (c.target in state.tendencies)) {
        state.tendencies[c.target] = Math.min(100, state.tendencies[c.target] + 15);
      }
      // 恢复湖中女神头衔给原来的持有者
      state.ladyLakeHolder = c.holder;
      state.ladyLakeChecks.splice(i, 1);
      break;
    }
  }
  // 也移除 ladyCheckHistory 中的对应记录
  for (var i = state.ladyCheckHistory.length - 1; i >= 0; i--) {
    if (state.ladyCheckHistory[i].round === round) {
      state.ladyCheckHistory.splice(i, 1);
      break;
    }
  }
  _ladySpeechSelected = null;
  renderGame();
  toast('已撤销本轮湖中女神查验');
}

/* ==================== IDENTITY PREDICTION ==================== */
var PREDICT_ROLES = ['正方','反方','梅林','派西维尔','莫甘娜','刺客','莫德雷德','奥伯伦','忠臣'];

function getTakenPredictions(excludeIdx) {
  var taken = {};
  var loyalCount = 0;
  for (var i = 0; i < state.playerCount; i++) {
    if (i === excludeIdx) continue;
    var pred = state.playerPredictions[i] || '';
    if (pred && pred !== '未标记' && pred !== '正方' && pred !== '反方') {
      taken[pred] = (taken[pred] || 0) + 1;
    }
    if (pred === '忠臣') loyalCount++;
  }
  taken._loyalCount = loyalCount;
  return taken;
}

function setPlayerPrediction(idx, role) {
  if (role === '未标记') {
    delete state.playerPredictions[idx];
  } else {
    state.playerPredictions[idx] = role;
  }
  renderPredictPlayerDropdowns();
}

function renderPredictPlayerDropdowns() {
  renderPredictDropdownsTo('predict-player-dropdowns');
  renderPredictDropdownsTo('predict-player-dropdowns-full');
}

function renderPredictDropdownsTo(elId) {
  var el = document.getElementById(elId);
  if (!el) return;
  var pc = state.playerCount;
  var h = '';
  for (var i = 0; i < pc; i++) {
    var taken = getTakenPredictions(i);
    var curPred = state.playerPredictions[i] || '未标记';
    h += '<div class="predict-player-row">';
    h += '<span class="predict-pname">' + playerLabel(i) + '</span>';
    h += '<select onchange="setPlayerPrediction(' + i + ',this.value)" style="flex:1;min-width:100px;padding:6px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer;min-height:38px;-webkit-appearance:none;appearance:none;background-image:url(\'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 12 12%27%3E%3Cpath d=%27M6 8L1 3h10z%27 fill=%27%23c9a84c%27/%3E%3C/svg%3E\');background-repeat:no-repeat;background-position:right 8px center;padding-right:24px">';
    h += '<option value="未标记"' + (curPred === '未标记' ? ' selected' : '') + '>未标记</option>';
    for (var j = 0; j < PREDICT_ROLES.length; j++) {
      var r = PREDICT_ROLES[j];
      var disabled = false;
      if (r !== '未标记' && r !== '正方' && r !== '反方' && r !== curPred) {
        if (r === '忠臣') {
          if (taken._loyalCount >= 3) disabled = true;
        } else {
          if ((taken[r] || 0) >= 1) disabled = true;
        }
      }
      h += '<option value="' + r + '"' + (curPred === r ? ' selected' : '') + (disabled ? ' disabled' : '') + '>' + r + (disabled ? ' (已选)' : '') + '</option>';
    }
    h += '</select>';
    // Show computed probability
    var prob = computePredictProbability(i);
    if (prob !== null) {
      var pct = prob.good;
      var pcolor = pct >= 60 ? 'var(--green-bright)' : pct >= 40 ? 'var(--gold-light)' : 'var(--red-bright)';
      h += '<span style="font-size:12px;min-width:90px;text-align:right">好人<span style="color:' + pcolor + ';font-weight:700">' + pct + '%</span> / 反方' + prob.evil + '%</span>';
    }
    h += '</div>';
  }
  el.innerHTML = h;
}

function computePredictProbability(idx) {
  var pred = state.playerPredictions[idx];
  if (!pred || pred === '未标记') {
    // No prediction, show tendency-based
    var t = state.tendencies[idx] != null ? state.tendencies[idx] : 50;
    return { good: t, evil: 100 - t };
  }

  var goodScore = 50;
  // Base on tendency
  var t = state.tendencies[idx] != null ? state.tendencies[idx] : 50;
  goodScore = t;

  // Adjust based on prediction
  if (pred === '正方') { goodScore = Math.min(100, goodScore + 20); }
  else if (pred === '反方') { goodScore = Math.max(0, goodScore - 20); }
  else if (pred === '梅林' || pred === '派西维尔') { goodScore = Math.min(100, goodScore + 25); }
  else if (pred === '莫甘娜' || pred === '刺客' || pred === '莫德雷德' || pred === '奥伯伦') { goodScore = Math.max(0, goodScore - 25); }

  // Adjust based on vote history
  var pc = state.playerCount;
  var goodVotes = 0, badVotes = 0;
  for (var r = 0; r < state.missions.length; r++) {
    var m = state.missions[r];
    if (!m || !m.result) continue;
    var attempts = m.launchAttempts || [];
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      var vote = att.votes[idx];
      if (!vote) continue;
      var attApproves = 0;
      for (var k = 0; k < pc; k++) { if (att.votes[k] === 'approve') attApproves++; }
      if (attApproves <= Math.floor(pc / 2)) continue;
      if (m.result === 'success' && vote === 'approve') goodVotes++;
      else if (m.result === 'fail' && vote === 'reject') goodVotes++;
      else badVotes++;
    }
  }
  var totalVotes = goodVotes + badVotes;
  if (totalVotes > 0) {
    var voteAlly = Math.round(goodVotes / totalVotes * 100);
    goodScore = Math.round(goodScore * 0.5 + voteAlly * 0.5);
  }

  // Constraint: if predicted as evil, cap goodScore lower
  if (pred === '莫甘娜' || pred === '刺客' || pred === '莫德雷德' || pred === '奥伯伦' || pred === '反方') {
    goodScore = Math.min(goodScore, 30);
  }
  if (pred === '梅林' || pred === '派西维尔' || pred === '正方') {
    goodScore = Math.max(goodScore, 70);
  }

  goodScore = Math.max(0, Math.min(100, goodScore));
  return { good: goodScore, evil: 100 - goodScore };
}

/* ==================== DEDUCTION PAGE ==================== */
function computePriorGoodProb(i, pc, si, myRole, activeRoles) {
  // Known self
  if (i === si) {
    if (myRole && EVIL_ROLES.indexOf(myRole) !== -1) return 5;
    if (myRole && GOOD_ROLES.indexOf(myRole) !== -1) return 95;
    return 50;
  }
  // Count good/evil from active roles
  var goodCount = 0, evilCount = 0;
  for (var r = 0; r < activeRoles.length; r++) {
    if (GOOD_ROLES.indexOf(activeRoles[r]) !== -1) goodCount++;
    else if (EVIL_ROLES.indexOf(activeRoles[r]) !== -1) evilCount++;
  }
  // Exclude self from pool to compute prior for others
  if (myRole && GOOD_ROLES.indexOf(myRole) !== -1) {
    var remainingGood = goodCount - 1;
    return Math.round(remainingGood / (pc - 1) * 100);
  } else if (myRole && EVIL_ROLES.indexOf(myRole) !== -1) {
    var remainingEvil = evilCount - 1;
    return Math.round((pc - 1 - remainingEvil) / (pc - 1) * 100);
  }
  // Unknown self role: flat prior
  return Math.round(goodCount / pc * 100);
}

/* ==================== 发言阶段信息：湖中女神 / 王者之剑 ==================== */
function excaliburDirectionLabel(dir) {
  if (dir === 'fail_to_success') return '失败 → 成功';
  if (dir === 'success_to_fail') return '成功 → 失败';
  if (dir === 'unknown') return '未说明';
  if (dir === 'refused') return '拒绝说明';
  return '待反馈';
}

function ladyClaimLabel(res) {
  if (res === 'good') return '好人';
  if (res === 'evil') return '反方';
  if (res === 'skip') return '不报';
  if (res === 'unknown') return '未说明';
  if (res === 'refused') return '拒绝说明';
  return '未记录';
}

function getExcaliburRecord(round) {
  var arr = state.excaliburHistory || [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].round === round) return arr[i];
  }
  return null;
}

function clearExcaliburRecord(round) {
  if (!state.excaliburHistory) return;
  state.excaliburHistory = state.excaliburHistory.filter(function(e) { return e.round !== round; });
}

function ensureExcaliburRecord(round) {
  if (!state.excaliburHistory) state.excaliburHistory = [];
  var rec = getExcaliburRecord(round);
  if (rec) return rec;
  var m = state.missions[round];
  rec = {
    round: round,
    leader: m ? m.leader : -1,
    team: m && m.team ? m.team.slice() : [],
    holder: -1,
    used: null,
    target: null,
    feedbackRecorded: false,
    feedbackRound: null,
    feedbackSpeaker: null,
    claimedDirection: '',
    note: '',
    createdAt: Date.now(),
    feedbackAt: null
  };
  state.excaliburHistory.push(rec);
  return rec;
}

function showExcaliburHolderModal(round, ladyTarget) {
  console.log('[holder] called round=' + round + ' excalEnabled=' + state.excaliburEnabled + ' timerMode=' + state.timerMode + ' ladyTarget=' + ladyTarget);
  if (!state.excaliburEnabled) return;
  var m = state.missions[round];
  if (!m || !m.team || m.team.length === 0) { console.log('[holder] no team'); return; }
  var rec = ensureExcaliburRecord(round);
  var h = '<h2>王者之剑</h2>';
  // 检查上轮未反馈的王者之剑使用记录，在本轮持剑者弹窗中一并展示
  console.log('[holder] checking prev excal feedback. round=' + round + ' hist=' + (state.excaliburHistory ? state.excaliburHistory.length : 0));
  if (round > 0 && state.excaliburHistory) {
    for (var _k = 0; _k < state.excaliburHistory.length; _k++) {
      var _pv = state.excaliburHistory[_k];
      var _match = _pv.used !== false && _pv.target !== null && !_pv.feedbackRecorded && _pv.round < round && _pv.holder >= 0;
      console.log('[holder]   rec r=' + _pv.round + ' used=' + _pv.used + ' target=' + _pv.target + ' fbRec=' + _pv.feedbackRecorded + ' holder=' + _pv.holder + ' MATCH=' + _match);
      if (_match) {
        var _pvRole = (state.playerRoles && state.playerRoles[_pv.target]) || null;
        var _pvVerdict = '';
        if (_pvRole === 'merlin' || _pvRole === 'percival') _pvVerdict = '<span style="color:var(--good);font-weight:700">好人方</span>';
        else if (_pvRole === 'morgana' || _pvRole === 'assassin' || _pvRole === 'mordred' || _pvRole === 'oberon' || _pvRole === 'bad') _pvVerdict = '<span style="color:var(--evil);font-weight:700">反方</span>';
        h += '<div style="background:rgba(201,168,76,0.08);border:1px solid var(--gold);border-radius:8px;padding:12px;margin-bottom:12px;text-align:center">';
        h += '<div style="font-size:14px;font-weight:700;color:var(--gold-light);margin-bottom:4px">上轮王者之剑反馈</div>';
        h += '<p style="font-size:13px;margin:0;color:var(--text-dim)">第' + (_pv.round + 1) + '轮持剑者 <b style="color:var(--gold-light)">' + playerLabel(_pv.holder) + '</b> 对 <b style="color:var(--gold-light)">' + playerLabel(_pv.target) + '</b> 使用了王者之剑</p>';
        if (_pvVerdict) h += '<p style="margin:4px 0 0;font-size:13px">结果：' + _pvVerdict + '</p>';
        h += '</div>';
        break; // 只展示最近一条
      }
    }
  }
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:10px">队长指定本轮队伍成员持剑。后续若使用，只能对队伍中除持剑者外的玩家使用。</p>';
  // 全体模式：湖中女神验人并入持剑者弹窗（第3轮起）
  var _ladyCond = state.timerMode === 'all' && state.ladyOfLakeEnabled && round >= 2 && state.ladyLakeHolder >= 0 && !hasLadyClaimThisRound();
  console.log('[holder] lady cond: timerAll=' + (state.timerMode==='all') + ' enabled=' + state.ladyOfLakeEnabled + ' round>=3=' + (round>=3) + ' holder=' + state.ladyLakeHolder + ' !claimed=' + (!hasLadyClaimThisRound()) + ' => ' + _ladyCond);
  if (_ladyCond) {
    h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
    if (ladyTarget !== undefined) {
      // 已选目标，显示验人结果选择（内联，不跳出弹窗）
      h += '<h2 style="color:var(--gold-light);margin-bottom:4px">湖中女神验人</h2>';
      h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">查验目标：<b style="color:var(--gold-light)">' + playerLabel(ladyTarget) + '</b> — 该玩家的阵营是？</p>';
      h += '<div style="display:flex;gap:8px;margin-bottom:12px">';
      h += '<button class="winner-btn good" onclick="recordLadyCheckFromHolder(' + ladyTarget + ',\'good\',' + round + ')" style="flex:1">&#128737; 好人方</button>';
      h += '<button class="winner-btn evil" onclick="recordLadyCheckFromHolder(' + ladyTarget + ',\'evil\',' + round + ')" style="flex:1">&#128481; 反方</button>';
      h += '<button class="btn" onclick="recordLadyCheckFromHolder(' + ladyTarget + ',\'skip\',' + round + ')" style="flex:1;color:var(--text-dim)">不报</button>';
      h += '</div>';
    } else {
      // 未选目标，显示目标选择按钮
      h += '<h2 style="color:var(--gold-light);margin-bottom:4px">湖中女神验人</h2>';
      h += '<p style="font-size:12px;color:var(--text-dim);margin-bottom:8px">选择一名其他玩家查验阵营</p>';
      h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">';
      var _pc = state.playerCount;
      for (var _j = 0; _j < _pc; _j++) {
        if (_j === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
        h += '<button class="assassin-target-btn" onclick="onLadyCheckFromHolder(' + _j + ',' + round + ')" style="font-size:14px">' + playerLabel(_j) + '</button>';
      }
      h += '</div>';
    }
    h += '<hr style="margin:16px 0;border-color:var(--border-dim)">';
  }
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < m.team.length; i++) {
    var pi = m.team[i];
    if (pi === m.leader) continue;
    h += '<button class="assassin-target-btn" onclick="setExcaliburHolder(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
  }
  h += '</div>';
  if (rec.holder >= 0) h += '<p style="font-size:12px;color:var(--text-dim);margin-top:10px">当前持剑者：' + playerLabel(rec.holder) + '</p>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="skipExcaliburHolder()">稍后指定</button></div>';
  showModal(h);
}

function recordLadyCheckFromHolder(targetIdx, result, round) {
  var holderIdx = state.ladyLakeHolder;
  var holderLabel = playerLabel(holderIdx);
  // 记录验人
  state.ladyLakeChecks.push({
    round: state.currentRound,
    target: targetIdx,
    result: result,
    holder: holderIdx
  });
  state.ladyCheckHistory.push({
    round: state.currentRound,
    holder: holderIdx,
    target: targetIdx,
    result: result
  });
  state.ladyLakeHolder = targetIdx;
  // 更新倾向值（skip 不更新）
  if (!(targetIdx in state.tendencies)) state.tendencies[targetIdx] = 50;
  if (result === 'good') {
    state.tendencies[targetIdx] = Math.min(100, state.tendencies[targetIdx] + 15);
  } else if (result === 'evil') {
    state.tendencies[targetIdx] = Math.max(0, state.tendencies[targetIdx] - 15);
  }
  var resultLabel = result === 'good' ? '好人' : result === 'evil' ? '坏人' : '不报';
  toast(holderLabel + '验' + playerLabel(targetIdx) + ' → ' + resultLabel + '，头衔已传递');
  // 重新渲染持剑者弹窗（女神条件已不满足，不会再显示女神段）
  showExcaliburHolderModal(round);
}

function onLadyCheckFromHolder(targetIdx, round) {
  // 在持剑者弹窗内联显示验人结果选择
  showExcaliburHolderModal(round, targetIdx);
}

function skipLadyFromHolder(round) {
  // 记录跳过，头衔仍传递给被验者——但跳过时没有目标，
  // 所以只能先记录到历史再重渲染，实际跳过在 showLadyCheck 的"不报"按钮中处理
  showExcaliburHolderModal(round);
}

function skipExcaliburHolder() {
  closeModal();
  state._excaliburSkipped = true;
  if (state._excaliburPreConfirm) {
    state._excaliburPreConfirm = false;
    confirmTeam();
  }
}

function setExcaliburHolder(round, holderIdx) {
  saveUndo();
  var rec = ensureExcaliburRecord(round);
  rec.holder = holderIdx;
  rec.used = null;
  rec.target = null;
  closeModal();
  toast('王者之剑持剑者：' + playerLabel(holderIdx));
  if (state._excaliburPreConfirm) {
    // 持剑者指定后，弹出目标选择弹窗
    setTimeout(function() { showExcaliburTargetModal(round); }, 100);
  } else {
    renderGame();
  }
}

function showExcaliburTargetModal(round) {
  var rec = getExcaliburRecord(round);
  if (!rec || rec.holder < 0) { confirmTeam(); return; }
  var m = state.missions[round];
  if (!m || !m.team || m.team.length === 0) { confirmTeam(); return; }
  var h = '<h2>王者之剑 · 使用目标</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:10px">持剑者 ' + playerLabel(rec.holder) + ' 选择本轮使用目标（限本队除自己外）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < m.team.length; i++) {
    var pi = m.team[i];
    if (pi === rec.holder) continue;
    h += '<button class="assassin-target-btn" onclick="onExcaliburTargetPicked(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeExcaliburTargetModal(' + round + ')" style="color:var(--text-dim)">不使用</button></div>';
  showModal(h);
}

function onExcaliburTargetPicked(round, targetIdx) {
  saveUndo();
  var rec = getExcaliburRecord(round);
  if (!rec) { closeModal(); confirmTeam(); return; }
  rec.target = targetIdx;
  rec.used = true;
  rec.feedbackRecorded = false;
  closeModal();
  toast('王者之剑目标：' + playerLabel(targetIdx));
  state._excaliburPreConfirm = false;
  confirmTeam();
}

function closeExcaliburTargetModal(round) {
  saveUndo();
  var rec = getExcaliburRecord(round);
  if (rec) { rec.used = false; rec.feedbackRecorded = true; rec.target = null; }
  closeModal();
  state._excaliburPreConfirm = false;
  confirmTeam();
}

function setExcaliburUsed(round, used) {
  saveUndo();
  var rec = ensureExcaliburRecord(round);
  if (rec.holder < 0) { toast('请先指定王者之剑持剑者', 'warn'); return; }
  rec.used = !!used;
  if (!used) {
    rec.target = null;
    rec.feedbackRecorded = true;
    rec.feedbackRound = null;
    rec.feedbackSpeaker = null;
    rec.claimedDirection = '';
    rec.note = '';
  } else {
    rec.feedbackRecorded = false;
  }
  renderStepPanelWithResult();
}

function setExcaliburTarget(round, targetIdx) {
  var rec = ensureExcaliburRecord(round);
  if (rec.holder === targetIdx) { toast('王者之剑不能对持剑者本人使用', 'warn'); return; }
  rec.target = targetIdx;
  renderStepPanelWithResult();
}

function buildExcaliburPreResultPanel(m) {
  if (!state.excaliburEnabled) return '';
  var round = state.currentRound;
  var rec = ensureExcaliburRecord(round);
  var h = '<div class="speech-info-card excalibur-card">';
  h += '<div class="speech-info-title">王者之剑 · 任务结果公布前确认</div>';
  if (rec.holder < 0) {
    h += '<div class="speech-info-sub">队长需要先从本轮队伍成员中指定持剑者。</div>';
    h += '<button class="btn small" onclick="showExcaliburHolderModal(' + round + ')">指定持剑者</button>';
    h += '</div>';
    return h;
  }
  h += '<div class="speech-info-sub">持剑者：<strong>' + playerLabel(rec.holder) + '</strong></div>';
  h += '<div class="btn-row" style="margin:6px 0">';
  h += '<button class="btn small' + (rec.used === false ? ' success' : '') + '" onclick="setExcaliburUsed(' + round + ',false)">不使用</button>';
  h += '<button class="btn small' + (rec.used === true ? ' warn' : '') + '" onclick="setExcaliburUsed(' + round + ',true)">使用</button>';
  h += '</div>';
  if (rec.used === true) {
    h += '<div class="speech-info-sub">使用目标（仅限本轮队伍中除持剑者外）：</div><div class="btn-row" style="gap:6px">';
    for (var i = 0; i < m.team.length; i++) {
      var pi = m.team[i];
      if (pi === rec.holder) continue;
      h += '<button class="btn small' + (rec.target === pi ? ' primary' : '') + '" onclick="setExcaliburTarget(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
    }
    h += '</div><div class="speech-info-sub">下一轮发言阶段只记录持剑者口述的改变方向。</div>';
  } else if (rec.used === false) {
    h += '<div class="speech-info-sub">本轮确认不使用，下一轮不会弹出王者之剑反馈。</div>';
  } else {
    h += '<div class="speech-info-sub">请在公布任务结果前确认是否使用。</div>';
  }
  h += '</div>';
  return h;
}

function hasLadyClaimThisRound() {
  var arr = state.ladyCheckHistory || [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].round === state.currentRound) return true;
  }
  return false;
}

function shouldShowLadySpeechCard() {
  if (!state.ladyOfLakeEnabled || state.currentRound < 2 || state.ladyLakeHolder < 0 || hasLadyClaimThisRound()) return false;
  if (state.timerMode === 'all') return state._teamConfirmedPending;
  if (state.timerMode === 'per' && state.currentSpeakerIdx >= 0) {
    return state.speakerOrder[state.currentSpeakerIdx] === state.ladyLakeHolder;
  }
  return false;
}

function getPendingExcaliburFeedbacks() {
  var arr = state.excaliburHistory || [];
  var list = [];
  for (var i = 0; i < arr.length; i++) {
    var e = arr[i];
    if (e.used === true && e.target !== null && !e.feedbackRecorded && e.round < state.currentRound) {
      if (state.timerMode === 'all') list.push(e);
      else if (state.timerMode === 'per' && state.currentSpeakerIdx >= 0 && state.speakerOrder[state.currentSpeakerIdx] === e.holder) list.push(e);
    }
  }
  return list;
}

function buildLadySpeechCard() {
  var holder = state.ladyLakeHolder;
  var h = '<div class="speech-info-card lady-card">';
  h += '<div class="speech-info-title">湖中女神声明</div>';
  h += '<div class="speech-info-sub">持有人：<strong>' + playerLabel(holder) + '</strong>。请在其发言时记录口述验人结果。</div>';
  h += '<label class="speech-info-label">口述验人对象</label><select id="lady-speech-target" class="speech-info-select">';
  for (var i = 0; i < state.playerCount; i++) {
    if (i === holder) continue;
    h += '<option value="' + i + '">' + playerLabel(i) + '</option>';
  }
  h += '</select>';
  h += '<label class="speech-info-label">口述结果</label><select id="lady-speech-result" class="speech-info-select">';
  h += '<option value="good">好人</option><option value="evil">反方</option><option value="unknown">未说明</option><option value="refused">拒绝说明</option>';
  h += '</select>';
  h += '<input id="lady-speech-note" class="speech-info-input" placeholder="备注：记录原话或简述">';
  h += '<button class="btn small primary" onclick="saveLadySpeechClaim()">保存湖中女神声明</button>';
  h += '</div>';
  return h;
}

function saveLadySpeechClaim() {
  var holder = state.ladyLakeHolder;
  if (holder < 0) return;
  var targetEl = document.getElementById('lady-speech-target');
  var resultEl = document.getElementById('lady-speech-result');
  var noteEl = document.getElementById('lady-speech-note');
  if (!targetEl || !resultEl) return;
  var target = parseInt(targetEl.value);
  var result = resultEl.value;
  var note = noteEl ? noteEl.value : '';
  var speaker = (state.timerMode === 'per' && state.currentSpeakerIdx >= 0) ? state.speakerOrder[state.currentSpeakerIdx] : null;
  var rec = { round: state.currentRound, holder: holder, target: target, result: result, note: note, recordedAtRound: state.currentRound, recordedAtSpeaker: speaker };
  state.ladyLakeChecks.push(rec);
  state.ladyCheckHistory.push(rec);
  state.ladyLakeHolder = target;
  toast('已记录湖中女神声明：' + playerLabel(holder) + ' → ' + playerLabel(target) + '：' + ladyClaimLabel(result));
  renderGame();
}

function buildExcaliburFeedbackCard(rec) {
  var h = '<div class="speech-info-card excalibur-card">';
  h += '<div class="speech-info-title">上一轮王者之剑反馈</div>';
  h += '<div class="speech-info-sub">第' + (rec.round + 1) + '轮持剑者：<strong>' + playerLabel(rec.holder) + '</strong>；使用目标：<strong>' + playerLabel(rec.target) + '</strong></div>';
  h += '<label class="speech-info-label">持剑者口述改变方向</label><select id="excalibur-feedback-dir-' + rec.round + '" class="speech-info-select">';
  h += '<option value="fail_to_success">失败 → 成功</option><option value="success_to_fail">成功 → 失败</option><option value="unknown">未说明</option><option value="refused">拒绝说明</option>';
  h += '</select>';
  h += '<input id="excalibur-feedback-note-' + rec.round + '" class="speech-info-input" placeholder="备注：记录原话或简述">';
  h += '<button class="btn small primary" onclick="saveExcaliburFeedback(' + rec.round + ')">保存王者之剑反馈</button>';
  h += '</div>';
  return h;
}

function saveExcaliburFeedback(round) {
  var rec = getExcaliburRecord(round);
  if (!rec) return;
  var dirEl = document.getElementById('excalibur-feedback-dir-' + round);
  var noteEl = document.getElementById('excalibur-feedback-note-' + round);
  rec.claimedDirection = dirEl ? dirEl.value : 'unknown';
  rec.note = noteEl ? noteEl.value : '';
  rec.feedbackRecorded = true;
  rec.feedbackRound = state.currentRound;
  rec.feedbackSpeaker = (state.timerMode === 'per' && state.currentSpeakerIdx >= 0) ? state.speakerOrder[state.currentSpeakerIdx] : null;
  rec.feedbackAt = Date.now();
  toast('已记录王者之剑反馈：' + excaliburDirectionLabel(rec.claimedDirection));
  renderGame();
}

function buildSpeechPhaseInfoPanel() {
  if (!state._teamConfirmedPending) return '';
  // 计时模式由弹窗处理，不渲染行内卡片
  if (state.timerMode !== 'off') return '';
  var cards = [];
  if (shouldShowLadySpeechCard()) cards.push(buildLadySpeechCard());
  var exs = getPendingExcaliburFeedbacks();
  for (var i = 0; i < exs.length; i++) cards.push(buildExcaliburFeedbackCard(exs[i]));
  if (!cards.length) return '';
  var title = state.timerMode === 'all' ? '发言阶段信息记录' : '当前发言人信息记录';
  return '<div class="speech-info-panel"><div class="speech-info-panel-title">' + title + '（待处理 ' + cards.length + ' 项）</div>' + cards.join('') + '</div>';
}

/* ==================== TIMER ==================== */
function renderTimerDisplay() {
  var el = $('timer-display');
  if (!el) return;
  if (state.timerMode === 'off' || state.timerInterval === null) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  var mins = Math.floor(state.timerRemaining / 60);
  var secs = state.timerRemaining % 60;
  var displayStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  $('timer-value').textContent = displayStr;

  var lbl = (state.timerMode === 'all') ? '全体发言计时' : '当前发言计时';
  $('timer-label').textContent = lbl;

  var spkEl = $('timer-speaker-name');
  if (spkEl) {
    if (state.timerMode === 'per' && state.currentSpeakerIdx >= 0 && state.currentSpeakerIdx < state.speakerOrder.length) {
      var spk = state.speakerOrder[state.currentSpeakerIdx];
      spkEl.textContent = '当前发言：' + playerLabel(spk);
      spkEl.style.display = 'block';
    } else {
      spkEl.style.display = 'none';
    }
  }

  if (state.timerRemaining > 0) {
    el.className = 'timer-display running';
  }
  if (state.timerRemaining <= 10 && state.timerRemaining > 0) {
    el.className = 'timer-display warning';
  }
}

function startTimer() {
  // 弹窗显示期间不启动计时器，由 resumePerSpeakerTimer 接管
  if (state._modalPausedTimer) return;
  stopTimer();
  if (state.timerMode === 'off') return;
  state._timerEnd = Date.now() + state.timerSeconds * 1000; // wall-clock end time
  state.timerRemaining = state.timerSeconds;
  if (state.timerMode === 'per' && state.currentSpeakerIdx >= 0) {
    var btnRow = document.getElementById('timer-btns');
    if (btnRow) btnRow.hidden = false;
  }
  if (state.timerMode === 'all') {
    var btnRowAll = document.getElementById('timer-btns');
    if (btnRowAll) btnRowAll.hidden = false;
  }
  state._timerEndFired = false;
  // Serial guard: increments on each startTimer/stopTimer to invalidate orphan intervals
  // that may have been created if timerInterval was nulled without clearInterval
  state._timerSerial = (state._timerSerial || 0) + 1;
  var mySerial = state._timerSerial;
  state.timerInterval = setInterval(function() {
    // Bail out immediately if this interval has been superseded (e.g. by stopTimer
    // incrementing serial to kill orphan intervals from confirmTeam double-click)
    if (state._timerSerial !== mySerial) return;
    var remaining = Math.max(0, Math.ceil((state._timerEnd - Date.now()) / 1000));
    state.timerRemaining = remaining;
    renderTimerDisplay();
    if (remaining <= 0 && !state._timerEndFired) {
      state._timerEndFired = true;
      stopTimer();
      playBeepSound();
      toast('计时结束！', 'warn');
      if (state.timerMode === 'per' && state.currentSpeakerIdx < state.speakerOrder.length - 1) {
        window._undoSpeakEndTimeout = setTimeout(function() { speakEnd(); }, 800);
      } else if (state._teamConfirmedPending) {
        window._undoTransitionTimeout = setTimeout(function() { transitionToVotes(); }, 800);
      }
      return; // 防止 stopTimer 后代码继续执行
    }
  }, 250);
  renderTimerDisplay();
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  // Bump serial to invalidate any orphan intervals (created when timerInterval
  // was nulled without clearInterval, e.g. confirmTeam double-click).
  // The next tick of an orphan interval will see serial mismatch and bail out.
  state._timerSerial = (state._timerSerial || 0) + 1;
  state._timerEnd = 0;
  var el = $('timer-display');
  if (el) el.style.display = 'none';
  var btnRow = document.getElementById('timer-btns');
  if (btnRow) btnRow.hidden = true;
}

function speakEnd() {
  if (state.timerMode === 'all') {
    endAllSpeak();
    return;
  }
  if (state.currentSpeakerIdx < 0) return;
  var speaker = state.speakerOrder[state.currentSpeakerIdx];
  var elapsed = (state.timerMode === 'all') ? 0 : (state.timerSeconds - state.timerRemaining);
  state.speakTimes[speaker] = (state.speakTimes[speaker] || 0) + elapsed;
  stopTimer();
  if (state.currentSpeakerIdx < state.speakerOrder.length - 1) {
    state.currentSpeakerIdx++;
    state.timerRemaining = state.timerSeconds;
    var el = $('timer-display');
    if (el) el.style.display = 'block';
    var btnRow = document.getElementById('timer-btns');
    if (btnRow) btnRow.hidden = false;
    renderTimerDisplay();
    renderStepPanel();
    showPerSpeakerModals();
    startTimer();
  } else {
    state.currentSpeakerIdx = -1;
    state.speakerOrder = [];
    toast('所有玩家发言结束');
    if (state._teamConfirmedPending) {
      window._undoTransitionTimeout = setTimeout(function() { transitionToVotes(); }, 800);
    }
  }
}

function endAllSpeak() {
  stopTimer();
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  state.speakTimes = {};
  var el = $('timer-display');
  if (el) el.style.display = 'none';
  var btnRow = document.getElementById('timer-btns');
  if (btnRow) btnRow.hidden = true;
  toast('已结束所有玩家发言');
  if (state._teamConfirmedPending) {
    window._undoTransitionTimeout = setTimeout(function() { transitionToVotes(); }, 500);
  }
}

function resetTimer() {
  stopTimer();
  state.timerRemaining = state.timerSeconds;
  startTimer();
}

function ensureAudioContext() {
  if (!window._audioCtx) {
    try {
      window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { return; }
  }
  if (window._audioCtx.state === 'suspended') {
    window._audioCtx.resume();
  }
}

function playBeepSound() {
  try {
    if (!window._audioCtx) return;
    var ctx = window._audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    // Play 3 repetitions of a louder, longer dual-tone beep
    for (var rep = 0; rep < 3; rep++) {
      var t0 = ctx.currentTime + rep * 0.6;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.8, t0);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.35);
      osc.start(t0);
      osc.stop(t0 + 0.35);
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'square';
      osc2.frequency.value = 880;
      gain2.gain.setValueAtTime(0.8, t0 + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, t0 + 0.4);
      osc2.start(t0 + 0.05);
      osc2.stop(t0 + 0.4);
    }
  } catch(e) {}
}

/* ==================== REVIEW / 复盘 ==================== */
function renderReviewEntry() {
  var el = $('review-section');
  if (!el) return;
  el.style.display = 'block';
}

function toggleReview() {
  var panel = $('review-panel');
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  panel.innerHTML = buildReviewHTML();
}


function buildReviewSpecialInfo(round) {
  var parts = [];
  var ladyRecords = (state.ladyCheckHistory || []).filter(function(rec) {
    return rec && rec.round === round;
  });
  if (ladyRecords.length > 0) {
    var ladyHtml = '<div style="margin-top:8px;padding:8px;border:1px solid rgba(90,140,255,0.28);border-radius:8px;background:rgba(90,140,255,0.08)">';
    ladyHtml += '<div style="font-weight:700;color:#99bbff;margin-bottom:4px">湖中女神</div>';
    for (var li = 0; li < ladyRecords.length; li++) {
      var lr = ladyRecords[li];
      ladyHtml += '<div style="font-size:13px;line-height:1.6;color:var(--text)">';
      ladyHtml += playerLabel(lr.holder) + ' 验 ' + playerLabel(lr.target) + '：<strong>' + ladyClaimLabel(lr.result) + '</strong>';
      if (lr.recordedAtRound !== undefined && lr.recordedAtRound !== null && lr.recordedAtRound !== round) {
        ladyHtml += ' <span style="color:var(--text-dim)">（第' + (lr.recordedAtRound + 1) + '轮发言记录）</span>';
      }
      if (lr.recordedAtSpeaker !== undefined && lr.recordedAtSpeaker !== null) {
        ladyHtml += ' <span style="color:var(--text-dim)">发言人：' + playerLabel(lr.recordedAtSpeaker) + '</span>';
      }
      if (lr.note) ladyHtml += '<div style="font-size:12px;color:var(--text-dim)">备注：' + escapeHtml(lr.note) + '</div>';
      ladyHtml += '</div>';
    }
    ladyHtml += '</div>';
    parts.push(ladyHtml);
  }

  var ex = getExcaliburRecord(round);
  if (ex) {
    var exHtml = '<div style="margin-top:8px;padding:8px;border:1px solid rgba(201,168,76,0.32);border-radius:8px;background:rgba(201,168,76,0.08)">';
    exHtml += '<div style="font-weight:700;color:var(--gold-light);margin-bottom:4px">王者之剑</div>';
    exHtml += '<div style="font-size:13px;line-height:1.6;color:var(--text)">';
    exHtml += '持剑者：<strong>' + (ex.holder >= 0 ? playerLabel(ex.holder) : '未指定') + '</strong>';
    if (ex.used === false) {
      exHtml += '；本轮确认<strong>不使用</strong>';
    } else if (ex.used === true) {
      exHtml += '；对 <strong>' + (ex.target !== null && ex.target !== undefined ? playerLabel(ex.target) : '未选择目标') + '</strong> 使用';
      if (ex.feedbackRecorded) {
        exHtml += '；口述改变：<strong>' + excaliburDirectionLabel(ex.claimedDirection) + '</strong>';
        if (ex.feedbackRound !== null && ex.feedbackRound !== undefined) {
          exHtml += ' <span style="color:var(--text-dim)">（第' + (ex.feedbackRound + 1) + '轮发言记录）</span>';
        }
        if (ex.feedbackSpeaker !== null && ex.feedbackSpeaker !== undefined) {
          exHtml += ' <span style="color:var(--text-dim)">发言人：' + playerLabel(ex.feedbackSpeaker) + '</span>';
        }
      } else {
        exHtml += '；<span style="color:var(--orange)">待持剑者反馈改变方向</span>';
      }
      if (ex.note) exHtml += '<div style="font-size:12px;color:var(--text-dim)">备注：' + escapeHtml(ex.note) + '</div>';
    } else {
      exHtml += '；<span style="color:var(--orange)">尚未确认是否使用</span>';
    }
    exHtml += '</div></div>';
    parts.push(exHtml);
  }

  if (!parts.length) return '';
  return '<div style="margin-top:8px"><strong>特殊信息：</strong>' + parts.join('') + '</div>';
}

function buildReviewHTML() {
  var h = '';
  var pc = state.playerCount;

  for (var r = 0; r <= state.currentRound; r++) {
    var m = state.missions[r];
    if (!m) continue;

    h += '<div class="review-card">';
    h += '<div class="rc-header" onclick="toggleReviewCard(this)">';
    h += '<span class="rc-title">第' + (r + 1) + '轮 · ' + (m.result ? (m.result === 'success' ? '任务成功' : '任务' + missionFailLabel(m)) : '进行中') + '</span>';
    h += '<span class="rc-toggle">&#9654;</span>';
    h += '</div>';
    h += '<div class="rc-body">';

    // Show all launch attempts
    var attempts = m.launchAttempts || [];
    if (attempts.length > 0) {
      for (var a = 0; a < attempts.length; a++) {
        var att = attempts[a];
        var attApproves = 0;
        for (var k = 0; k < pc; k++) { if (att.votes[k] === 'approve') attApproves++; }
        var launched = attApproves > Math.floor(pc / 2);

        var firstClass = (a === 0) ? ' launch-first' : '';
        h += '<div class="launch-item' + firstClass + '">';
        h += '<strong>第' + (a + 1) + '次组队</strong> ';
        h += '<span class="launch-leader">' + playerLabel(att.leader) + '</span>';
        h += ' <span style="color:var(--text-dim)">带队：</span>';
        h += att.team.map(function(i) { return '<span class="launch-member">' + playerLabel(i) + '</span>'; }).join(' ');
        h += ' | 赞成 ' + attApproves + ' / 反对 ' + (pc - attApproves);
        h += launched ? ' <span style="color:var(--green-bright)">组队成功</span>' : ' <span style="color:var(--red-bright)">组队未通过</span>';

        // Vote detail - two-column layout
        var approveList = [], rejectList = [];
        for (var k = 0; k < pc; k++) {
          if (att.votes[k] === 'approve') approveList.push(playerLabel(k));
          else rejectList.push(playerLabel(k));
        }
        h += '<div class="vote-result-split">';
        h += '<div class="vote-col-approve"><span class="vote-col-title">赞成 (' + approveList.length + '人)：</span>';
        if (approveList.length > 0) {
          h += approveList.map(function(n) { return '<span class="vote-player-name">' + n + '</span>'; }).join('');
        } else { h += '<span class="vote-col-empty">无</span>'; }
        h += '</div>';
        h += '<div class="vote-col-reject"><span class="vote-col-title">反对 (' + rejectList.length + '人)：</span>';
        if (rejectList.length > 0) {
          h += rejectList.map(function(n) { return '<span class="vote-player-name">' + n + '</span>'; }).join('');
        } else { h += '<span class="vote-col-empty">无</span>'; }
        h += '</div></div>';
        h += '</div>';
      }
    }

    if (m.result) {
      h += '<div style="margin-top:6px"><strong>任务结果：</strong>';
      h += '<span style="color:' + (m.result === 'success' ? 'var(--green-bright)' : 'var(--red-bright)') + '">';
      if (m.result === 'success' && m.shieldedFails) {
        h += '成功（含' + m.shieldedFails + '张失败票）';
      } else if (m.result === 'success' && !m.failCount) {
        h += '成功（全票通过）';
      } else if (m.result === 'success') {
        h += '成功';
      } else {
        h += missionFailLabel(m);
      }
      h += '</span></div>';
      // v192：失败轮展示「谁打的失败」（未录入显示「—」）
      if (m.result === 'fail') {
        h += '<div style="margin-top:4px">失败票：' + escAttr(failVotersText(m)) + '</div>';
      } else if (m.result === 'success' && (parseInt(m.shieldedFails, 10) || 0) > 0) {
        // v194：成功轮里未致失败的失败票单独区分，不与真正失败轮混淆
        h += '<div style="margin-top:4px">' + escAttr(shieldedFailPrefix(r, m)) + '：' + escAttr(failVotersText(m))
          + '<span style="color:var(--text-dim)">（未致失败）</span></div>';
      }
    }

    h += buildReviewSpecialInfo(r);

    if (m.launchFailures > 0) {
      h += '<div style="margin-top:4px;color:var(--orange)">组队未通过 ' + m.launchFailures + ' 次</div>';
    }

    h += '</div></div>';
  }

  h += '<div style="text-align:center;margin-top:8px"><button class="btn small" onclick="document.getElementById(\'review-panel\').style.display=\'none\'">收起</button></div>';
  return h;
}

function toggleReviewCard(header) {
  var body = header.nextElementSibling;
  var toggle = header.querySelector('.rc-toggle');
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    toggle.classList.remove('open');
  } else {
    body.classList.add('open');
    toggle.classList.add('open');
  }
}

/* ==================== GAME ACTIONS ==================== */
function selectLeader(idx) {
  saveUndo();
  var m = state.missions[state.currentRound];
  m.leader = idx;
  m.team = [];
  m.votes = {};
  m.result = null;
  m.failCount = 0;
  m.failVoters = [];   // v192：换队长重开本轮时清空上一轮录入的失败票归属
  // 仅在首次选队长（无发车尝试记录）时重置计数器，避免丢失已记录的发车失败历史
  if (m.launchAttempts.length === 0) {
    m.launchFailures = 0;
    m.launchAttempts = [];
  }
  state._firstLeaderPicked = true;
  state._lastLeaderIdx = idx;
  renderStepPanel();
}

function randomFirstLeader() {
  var pc = state.playerCount;
  var idx = Math.floor(Math.random() * pc);
  showModal(
    '<h2>随机队长</h2>' +
    '<p style="font-size:16px;text-align:center;margin:16px 0">随机选中：<strong>' + (idx + 1) + '号 ' + state.playerNames[idx] + '</strong></p>' +
    '<div class="modal-actions">' +
    '<button class="btn primary" onclick="closeModal();selectLeader(' + idx + ')">确认</button>' +
    '<button class="btn" onclick="closeModal()">手动选号</button>' +
    '</div>'
  );
}

function reSelectLeader() {
  saveUndo();
  var m = state.missions[state.currentRound];
  m.leader = null;
  m.team = [];
  m.votes = {};
  state._firstLeaderPicked = false;
  renderStepPanel();
}

function toggleTeamMember(idx) {
  saveUndo();
  var m = state.missions[state.currentRound];
  var pos = m.team.indexOf(idx);
  if (pos !== -1) m.team.splice(pos, 1);
  else if (m.team.length < m.size) m.team.push(idx);
  renderStepPanel();
}

function confirmTeam() {
  saveUndo();
  var m = state.missions[state.currentRound];
  console.log('[debug-confirmTeam] round=' + state.currentRound + ' teamLen=' + m.team.length + ' size=' + m.size + ' excalEnabled=' + state.excaliburEnabled + ' teamPending=' + state._teamConfirmedPending + ' timerMode=' + state.timerMode);
  if (m.team.length !== m.size) { toast('队伍人数不正确', 'warn'); return; }

  // 湖中女神：第一轮队长确认后自动设定持有者
  if (state.currentRound === 0 && state.ladyOfLakeEnabled && state.ladyLakeHolder === -1) {
    var pc = state.playerCount;
    state.ladyLakeHolder = (m.leader - 1 + pc) % pc;
  }

  // Start speech phase before voting
  state._teamConfirmedPending = true;

  if (state.timerMode === 'per') {
    state.speakerOrder = [];
    state.speakTimes = {};
    var startIdx = m.leader;
    for (var si = 0; si < state.playerCount; si++) {
      state.speakerOrder.push((startIdx + si) % state.playerCount);
    }
    state.currentSpeakerIdx = 0;
    state.timerRemaining = state.timerSeconds;
    stopTimer();
    state.timerInterval = null;
    renderTimerDisplay();
    renderStepPanel();
    showCombinedConfirmModal();
    // 兜底：如果弹窗未出现（被 early return 吞掉），尝试显示调试信息
    if (!document.getElementById('dynamic-modal-overlay') && !state.winner) {
      console.warn('[confirmTeam] modal overlay not found after showCombinedConfirmModal');
    }
  } else if (state.timerMode === 'all') {
    state.timerRemaining = state.timerSeconds;
    stopTimer();
    state.timerInterval = null;
    state.speakerOrder = [];
    state.currentSpeakerIdx = -1;
    renderTimerDisplay();
    renderStepPanel();
    showCombinedConfirmModal();
    if (!document.getElementById('dynamic-modal-overlay') && !state.winner) {
      console.warn('[confirmTeam] modal overlay not found after showCombinedConfirmModal');
    }
  }
}

function showAllModeExcaliburFeedback(list, idx, showLadyAfter) {
  if (idx < list.length) {
    var rec = list[idx];
    showExcaliburFeedbackModal(rec);
    // 覆写 ack 行为：关闭后继续显示下一条
    var origAck = window.ackExcaliburFeedback;
    window.ackExcaliburFeedback = function(r) {
      if (origAck) origAck(r);
      window.ackExcaliburFeedback = origAck;
      setTimeout(function() { showAllModeExcaliburFeedback(list, idx + 1, showLadyAfter); }, 100);
    };
  } else if (showLadyAfter) {
    setTimeout(function() { showLadyCheck(); }, 50);
  }
}

// 轮流模式：组队确认后独立弹窗序列展示所有未反馈的王者之剑使用
function showPerExcalFeedbackSequence(idx) {
  var seq = state._perExcalSeq;
  if (!seq || idx >= seq.length) {
    delete state._perExcalSeq;
    state._modalPausedTimer = false;
    showPerSpeakerModals();
    if (!state._modalPausedTimer) startTimer();
    return;
  }
  var rec = seq[idx];
  stopTimer();
  state._modalPausedTimer = true;
  showExcaliburFeedbackModal(rec);
  // 覆写 ack：关闭后不恢复计时器，继续序列下一项
  var origAck = window.ackExcaliburFeedback;
  window.ackExcaliburFeedback = function(r) {
    var _rec = getExcaliburRecord(r);
    if (_rec) _rec.feedbackRecorded = true;
    closeModal();
    window.ackExcaliburFeedback = origAck;
    setTimeout(function() { showPerExcalFeedbackSequence(idx + 1); }, 100);
  };
}

function transitionToVotes() {
  state._teamConfirmedPending = false;
  var m = state.missions[state.currentRound];
  m.votes = {};
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'approve';
  }
  stopTimer();
  var el = $('timer-display');
  if (el) el.style.display = 'none';
  renderStepPanel();
}

function castVote(idx, type) {
  saveUndo();
  var m = state.missions[state.currentRound];
  m.votes[idx] = type;
  renderStepPanel();
}

function allApprove() {
  saveUndo();
  var m = state.missions[state.currentRound];
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'approve';
  }
  renderStepPanel();
}

function allReject() {
  saveUndo();
  var m = state.missions[state.currentRound];
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'reject';
  }
  renderStepPanel();
}

function confirmVotes() {
  saveUndo();
  var m = state.missions[state.currentRound];
  var pc = state.playerCount;

  var approves = 0;
  var rejects = 0;
  for (var i = 0; i < pc; i++) {
    if (m.votes[i] === 'approve') approves++;
    else rejects++;
  }

  m.launchAttempts.push({
    team: m.team.slice(),
    votes: Object.assign({}, m.votes),
    leader: m.leader
  });

  applyLaunchTendencies();

  if (approves > rejects) {
    renderStepPanelWithResult();
  } else {
    clearExcaliburRecord(state.currentRound);
    m.launchFailures++;

    // Save tendency snapshot for this failed launch attempt
    var snap = {};
    for (var i = 0; i < pc; i++) {
      snap[i] = state.tendencies[i] != null ? state.tendencies[i] : 50;
    }
    state.roundTendencies.push({ v: snap, r: state.currentRound, a: m.launchFailures });

    if (m.launchFailures >= 5) {
      m.result = 'fail';
      m.failCount = 0;
      updateFinalTendencies();
      checkGameEnd();
      renderGame();
      var banner = '<div class="launch-fail-banner">第' + (state.currentRound + 1) + '轮连续 <span class="count">5</span> 次组队未通过，任务自动失败！</div>';
      $('launch-fail-area').innerHTML = banner;
      return;
    }

    m.leader = (m.leader + 1) % pc;
    state._lastLeaderIdx = m.leader;
    m.team = [];
    m.votes = {};

    renderGame();
    var banner = '<div class="launch-fail-banner">第' + (state.currentRound + 1) + '轮第 <span class="count">' + m.launchFailures + '</span> 次组队未通过！赞成 ' + approves + ' / 反对 ' + rejects + '（赞成≤反对）队长轮换至 ' + playerLabel(m.leader) + '</div>';
    $('launch-fail-area').innerHTML = banner;
    toast('组队未通过！队长轮换', 'warn');
  }
}

function applyLaunchTendencies() {
  var m = state.missions[state.currentRound];
  var si = state.selfIndex;
  var lastAttempt = m.launchAttempts[m.launchAttempts.length - 1];
  var myVote = si >= 0 ? lastAttempt.votes[si] : null;

  for (var i = 0; i < state.playerCount; i++) {
    if (!(i in state.tendencies)) state.tendencies[i] = 50;
    var vote = lastAttempt.votes[i];

    // 客观评分：基于投票一致性，不参考本人身份
    if (myVote && i !== si) {
      if (vote === myVote) state.tendencies[i] += 2;
      else state.tendencies[i] -= 2;
    }

    if (state.tendencies[i] < 0) state.tendencies[i] = 0;
    if (state.tendencies[i] > 100) state.tendencies[i] = 100;
  }
}

function renderStepPanelWithResult() {
  var m = state.missions[state.currentRound];
  var c = $('step-container');
  var h = '';

  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<span class="step-label">第' + (state.currentRound + 1) + '轮 · 需要 ' + m.size + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">进行中</span></div>';

  h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + playerLabel(m.leader) + '</span>';
  h += '<span style="font-size:13px;color:var(--text-dim);margin-left:10px">队伍：' + m.team.map(function(i) { return playerLabel(i); }).join('、') + '</span></div>';

  var approves = Object.values(m.votes).filter(function(v) { return v === 'approve'; }).length;
  var rejects = state.playerCount - approves;
  h += '<div style="font-size:14px;color:var(--green-bright);margin-bottom:10px">组队成功！赞成 ' + approves + ' / 反对 ' + rejects + '</div>';

  h += buildExcaliburPreResultPanel(m);
  h += '<hr style="border-color:var(--border);margin-bottom:10px">';
  h += '<div class="step-label">步骤D：任务结果</div>';
  h += '<div class="mission-result-area">';
  h += '<div class="mission-btn success-btn' + (m.result === 'success' ? ' selected' : '') + '" onclick="setMissionResult(\'success\')"><span class="mission-icon">&#128737;</span><span class="mission-label">成功</span></div>';
  h += '<div class="mission-btn fail-btn' + (m.result === 'fail' ? ' selected' : '') + '" onclick="setMissionResult(\'fail\')"><span class="mission-icon">&#128481;</span><span class="mission-label">失败</span></div>';
  h += '</div>';
  h += '<div id="fail-count-row" class="fail-count-row" style="display:none">';
  h += '<div class="step-label">失败票数量</div>';
  h += '<div class="fail-count-btns" id="fail-count-btns"></div></div>';
  h += '<div style="text-align:center;margin-top:10px"><button class="btn primary" id="btn-finalize" style="display:none" onclick="finalizeMission()">确认任务结果，进入下一轮</button></div>';
  c.innerHTML = h;

  if (m.result) {
    document.getElementById('btn-finalize').style.display = 'inline-flex';
    if (m.result === 'fail') showFailCountSelector();
  }
}

function setMissionResult(result) {
  saveUndo();
  var m = state.missions[state.currentRound];
  m.result = result;
  if (result === 'fail') {
    m.failCount = 0;
    m.failVoters = [];   // v192：切换为失败时清空旧的失败票归属
    showFailCountSelector();
  } else {
    m.failCount = 0;
    m.failVoters = [];
    m.shieldedFails = 0;   // v194：改判成功时清掉保护轮「1 张失败票被抵消」标记
    document.getElementById('fail-count-row').style.display = 'none';
  }
  document.getElementById('btn-finalize').style.display = 'inline-flex';
}

function showFailCountSelector() {
  var m = state.missions[state.currentRound];
  document.getElementById('fail-count-row').style.display = 'block';
  var fc = '';
  for (var i = 1; i <= m.team.length; i++) {
    fc += '<div class="fail-count-btn' + (m.failCount === i ? ' selected' : '') + '" onclick="setFailCount(' + i + ')">' + i + '</div>';
  }
  document.getElementById('fail-count-btns').innerHTML = fc;
  document.getElementById('btn-finalize').style.display = 'inline-flex';
}

function setFailCount(n) {
  saveUndo();
  var m = state.missions[state.currentRound];
  m.failCount = n;
  var btns = document.querySelectorAll('#fail-count-btns .fail-count-btn');
  btns.forEach(function(b) {
    b.className = 'fail-count-btn' + (parseInt(b.textContent) === n ? ' selected' : '');
  });
}

function finalizeMission() {
  saveUndo();
  var m = state.missions[state.currentRound];
  if (!m.result) { toast('请选择任务结果', 'warn'); return; }
  if (m.result === 'fail' && !m.failCount) { toast('请选择失败票数量', 'warn'); return; }
  if (state.excaliburEnabled) {
    var exRec = getExcaliburRecord(state.currentRound);
    if (!exRec || exRec.holder < 0) { toast('请先指定王者之剑持剑者', 'warn'); return; }
    if (exRec.used === null || exRec.used === undefined) { toast('请先确认王者之剑是否使用', 'warn'); return; }
    if (exRec.used === true && (exRec.target === null || exRec.target === undefined)) { toast('请选择王者之剑使用目标', 'warn'); return; }
  }

  // 第4轮保护轮：需2张失败票任务才失败，1张失败任务仍成功（6人局例外，无保护）
  if (state.currentRound === 3 && m.result === 'fail' && (m.failCount || 0) === 1 && state.playerCount !== 6) {
    m.result = 'success';
    m.failCount = 1;
    m.shieldedFails = 1;
    toast('第4轮保护轮：1张失败票，任务仍成功');
  }

  stopTimer();
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  updateFinalTendencies();

  // Capture tendency snapshot for this round
  var snap = {};
  for (var i = 0; i < state.playerCount; i++) {
    snap[i] = state.tendencies[i] != null ? state.tendencies[i] : 50;
  }
  state.roundTendencies.push({ v: snap, r: state.currentRound, a: 0 });

  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || state.activeRoles.indexOf('兰斯洛特(红)') !== -1;
  if (hasLancelot && state.currentRound >= 1) {
    var sc = state.missions.filter(function(mm) { return mm.result === 'success'; }).length;
    var fc = state.missions.filter(function(mm) { return mm.result === 'fail'; }).length;
  console.log('[debug-finalizeMission] round=' + state.currentRound + ' hasLancelot=' + hasLancelot + ' sc=' + sc + ' fc=' + fc + ' excalEnabled=' + state.excaliburEnabled + ' timerMode=' + state.timerMode);
    if (sc >= 3 || fc >= 3) {
      console.log('[debug-finalizeMission] game decided, skip Lancelot draw');
      // 已决定胜负，跳过抽卡直接推进游戏结束
      checkGameEnd();
      renderGame();
    } else {
      console.log('[debug-finalizeMission] entering Lancelot auto-draw');
      applyLancelotAutoDraw(state.currentRound);
    }
  } else {
    checkGameEnd();
    renderGame();
  }
}

function updateFinalTendencies() {
  var m = state.missions[state.currentRound];
  var si = state.selfIndex;
  var myVote = si >= 0 ? m.votes[si] : null;
  var result = m.result;

  for (var i = 0; i < state.playerCount; i++) {
    if (!(i in state.tendencies)) state.tendencies[i] = 50;

    var vote = m.votes[i];
    var inTeam = m.team.indexOf(i) !== -1;

    if (result === 'success') {
      if (vote === 'approve') state.tendencies[i] += 5;
      if (vote === 'reject') state.tendencies[i] -= 5;
      if (inTeam) state.tendencies[i] += 3;
    } else {
      if (vote === 'approve') state.tendencies[i] -= 8;
      if (vote === 'reject') state.tendencies[i] += 8;
      if (inTeam && vote === 'approve') state.tendencies[i] -= 10;
      if (!inTeam && vote === 'reject') state.tendencies[i] += 5;
      if (inTeam) state.tendencies[i] -= 3;
    }

    // 客观评分：基于投票一致性，不参考本人身份
    if (myVote && i !== si) {
      if (vote === myVote) state.tendencies[i] += 2;
      else state.tendencies[i] -= 2;
    }

    if (state.tendencies[i] < 0) state.tendencies[i] = 0;
    if (state.tendencies[i] > 100) state.tendencies[i] = 100;
  }
}

function checkGameEnd() {
  var successCount = state.missions.filter(function(mm) { return mm.result === 'success'; }).length;
  var failCount = state.missions.filter(function(mm) { return mm.result === 'fail'; }).length;

  if (failCount >= 3) {
    state.winner = 'evil';
    stopTimer();
    showPage('end');
    return;
  }
  if (successCount >= 3) {
    state.assassinTarget = null;
    state.assassinFromMission = true;
    state._assassinAfterRound = state.currentRound;
    stopTimer();
    showPage('end');
    return;
  }

  state.currentRound++;
  if (state.currentRound >= 5) state.currentRound = 4;
  state._ladyCheckTriggeredThisRound = false;
}

/* ==================== ASSASSIN PHASE (inline on end page) ==================== */
function renderEndAssassinPick() {
  var h = '<div id="assassin-countdown-display"></div>';
  h += '<p class="sub">好人方已完成 3 轮任务，请刺客选择刺杀目标（可参考下方复盘信息）</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">';
  for (var i = 0; i < state.playerCount; i++) {
    h += '<button class="assassin-target-btn' + (state.assassinTarget === i ? ' selected' : '') + '" onclick="pickEndAssassinTarget(' + i + ')">' + playerLabel(i) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:14px">';
  h += '<button class="btn primary" onclick="confirmEndAssassin()"';
  if (state.assassinTarget === null) h += ' disabled';
  h += '>确认刺杀目标</button></div>';
  $('end-assassin-pick-area').innerHTML = h;
  startAssassinTimer();
}

function pickEndAssassinTarget(idx) {
  state.assassinTarget = idx;
  var btns = document.querySelectorAll('#end-assassin-pick-area .assassin-target-btn');
  btns.forEach(function(b, i) {
    b.className = 'assassin-target-btn' + (i === idx ? ' selected' : '');
  });
  var confirmBtn = document.querySelector('#end-assassin-pick-area .btn.primary');
  if (confirmBtn) confirmBtn.disabled = false;
}

function confirmEndAssassin() {
  stopAssassinTimer();
  if (state.assassinTarget === null) return;
  $('end-assassin-pick-area').style.display = 'none';
  $('end-assassin-resolve-area').style.display = 'block';
  $('end-target-name').textContent = playerLabel(state.assassinTarget);
}

/* ==================== END PANEL ==================== */
function getTakenUniqueRoles(exceptIdx) {
  var taken = {};
  for (var i = 0; i < state.playerCount; i++) {
    if (i === exceptIdx) continue;
    var role;
    // 互换身份进行中时，用交换后的值
    if (state._swapEndRole && (i in state._swapEndRole)) {
      role = state._swapEndRole[i];
    } else {
      var sel = document.getElementById('end-role-' + i);
      role = sel ? sel.value : '';
    }
    if (role && UNIQUE_ROLES.indexOf(role) !== -1) {
      taken[role] = true;
    }
  }
  return taken;
}

function renderEndIdentityDropdowns() {
  if (state._renderingIdentities) return;
  state._renderingIdentities = true;
  var grid = $('end-identity-grid');
  var h = '';
  for (var i = 0; i < state.playerCount; i++) {
    var taken = getTakenUniqueRoles(i);
    var curSel = document.getElementById('end-role-' + i);
    var curVal = curSel ? curSel.value : '';
    // 互换身份时使用交换后的值
    var isSwapped = state._swapEndRole && (i in state._swapEndRole);
    if (isSwapped) { curVal = state._swapEndRole[i]; }
    // 自动填入已知身份（如刺杀中确认的梅林），被互换的玩家跳过自动填入
    if (!curVal && !isSwapped && state.autoRoles && state.autoRoles[i]) {
      curVal = state.autoRoles[i];
    }

    h += '<div class="end-player-row">';
    // 临时玩家（"玩家N"）显示为可编辑行内输入框，而非静态文本
    var isTemp = /^玩家\d+$/.test(state.playerNames[i]);
    if (isTemp) {
      h += '<input type="text" id="end-name-' + i + '" value="' + escapeHtml(state.playerNames[i]) + '"';
      h += ' style="width:60px;padding:3px 5px;border-radius:4px;border:1px dashed var(--border);background:transparent;color:var(--text-dim);font-size:12px;outline:none;text-align:center"';
      h += ' title="临时玩家，可修改姓名">';
    } else {
      h += '<span class="ep-name">' + playerLabel(i) + '</span>';
    }
    h += '<select id="end-role-' + i + '" onchange="onEndRoleChange(' + i + ')">';
    h += '<option value="">-- 未选 --</option>';
    for (var j = 0; j < state.activeRoles.length; j++) {
      var r = state.activeRoles[j];
      if (UNIQUE_ROLES.indexOf(r) !== -1 && taken[r] && r !== curVal) continue;
      h += '<option value="' + r + '"' + (r === curVal ? ' selected' : '') + '>' + r + '</option>';
    }
    h += '</select>';
    h += '<button class="btn small swap-seat-btn" id="end-swap-role-' + i + '" onclick="swapEndRole(' + i + ')" title="互换身份">⇄</button>';
    // 混子跟随目标行内下拉（仅当角色为混子且未选择目标时显示）
    if (curVal === '混子' && state._huntFollowTarget === undefined) {
      h += '<select id="end-hunt-target" style="font-size:11px;padding:3px 4px;border-radius:4px;border:1px solid var(--gold-light);background:var(--bg-card);color:var(--gold-light);cursor:pointer;margin-left:4px;min-height:30px">';
      h += '<option value="">混谁？</option>';
      for (var hi = 0; hi < state.playerCount; hi++) {
        if (hi === i) continue;
        h += '<option value="' + hi + '">' + playerLabel(hi) + '</option>';
      }
      h += '</select>';
    }
    h += '</div>';
  }
  grid.innerHTML = h;
  state._renderingIdentities = false;
}

function swapEndRole(idx) {
  if (_endSwapRoleFirst === null) {
    _endSwapRoleFirst = idx;
    var btn = document.getElementById('end-swap-role-' + idx);
    if (btn) { btn.classList.add('swapping'); btn.textContent = '⇄'; }
    toast('已选中 ' + playerLabel(idx) + '，再点另一位的互换按钮完成互换');
  } else if (_endSwapRoleFirst === idx) {
    _endSwapRoleFirst = null;
    var btn = document.getElementById('end-swap-role-' + idx);
    if (btn) { btn.classList.remove('swapping'); btn.textContent = '⇄'; }
    toast('已取消');
  } else {
    var a = _endSwapRoleFirst;
    var b = idx;
    var selA = document.getElementById('end-role-' + a);
    var selB = document.getElementById('end-role-' + b);
    var valA = selA ? selA.value : '';
    var valB = selB ? selB.value : '';
    _endSwapRoleFirst = null;
    // 清除首次点击按钮的高亮
    var prevBtn = document.getElementById('end-swap-role-' + a);
    if (prevBtn) { prevBtn.classList.remove('swapping'); prevBtn.textContent = '⇄'; }
    // 不能直接 sel.value = ...，因为目标值可能不在对方下拉框选项里（被 taken 过滤了）
    // 用临时映射让 renderEndIdentityDropdowns 读取交换后的值来重建
    state._swapEndRole = {};
    state._swapEndRole[a] = valB;
    state._swapEndRole[b] = valA;
    renderEndIdentityDropdowns();
    delete state._swapEndRole;
    toast(playerLabel(a) + ' 与 ' + playerLabel(b) + ' 身份已互换');
  }
}

function renderEnd() {
  _endSwapRoleFirst = null;
  // Assassin phase
  if (state.assassinFromMission && !state.winner) {
    $('end-assassin-card').style.display = 'block';
    if (state.assassinTarget === null) {
      // Phase 1: pick assassin target
      $('end-assassin-pick-area').style.display = 'block';
      $('end-assassin-resolve-area').style.display = 'none';
      renderEndAssassinPick();
    } else {
      // Phase 2: resolve result
      $('end-assassin-pick-area').style.display = 'none';
      $('end-assassin-resolve-area').style.display = 'block';
      $('end-target-name').textContent = playerLabel(state.assassinTarget);
    }
  } else {
    $('end-assassin-card').style.display = 'none';
  }

  // Show review on end page
  $('end-review-content').innerHTML = buildReviewHTML();

  // Add replay button
  var reviewCard = document.getElementById('end-review-card');
  if (reviewCard) {
    var existingBtn = document.getElementById('end-replay-btn');
    if (existingBtn) existingBtn.remove();
    var btnRow = document.createElement('div');
    btnRow.id = 'end-replay-btn';
    btnRow.style.cssText = 'text-align:center;margin-top:12px';
    btnRow.innerHTML = '<button class="btn primary" onclick="showReplay()" style="font-size:16px;padding:12px 32px">复盘回放</button>';
    reviewCard.appendChild(btnRow);
  }

  if (state.assassinFromMission && !state.winner) {
    $('winner-toggle').innerHTML = '';
  } else {
    var h = '<button class="winner-btn good' + (state.winner === 'good' ? ' selected' : '') + '" onclick="setWinner(\'good\')">&#128737; 好人方获胜</button>';
    h += '<button class="winner-btn evil' + (state.winner === 'evil' ? ' selected' : '') + '" onclick="setWinner(\'evil\')">&#128481; 反方获胜</button>';
    $('winner-toggle').innerHTML = h;
  }

  // 兰斯洛特反转状态由游戏中累计的反转记录自动判定
  if (state.lancelotFlipCount > 0) {
    state.lancelotFlipped = (state.lancelotFlipCount % 2 !== 0);
  }

  var sc = state.missions.filter(function(m) { return m.result === 'success'; }).length;
  var fc = state.missions.filter(function(m) { return m.result === 'fail'; }).length;
  // v189：结束页复盘摘要补充失败票总数（缺失时标注未记录轮数）
  var failTickets = 0, unrecRounds = 0;
  for (var fr = 0; fr < state.missions.length; fr++) {
    var frm = state.missions[fr];
    if (!frm || frm.result !== 'fail') continue;
    if (failTicketText(frm) === '票数未记录') unrecRounds++;
    else failTickets += (parseInt(frm.failCount, 10) || 0);
  }
  var endSumText = sc + '轮成功 / ' + fc + '轮失败';
  if (fc > 0) {
    endSumText += '（失败票共 ' + failTickets + ' 张' + (unrecRounds > 0 ? '，' + unrecRounds + ' 轮票数未记录' : '') + '）';
  }
  $('end-round-summary').textContent = endSumText;

  renderEndIdentityDropdowns();
  // v192：失败轮次录入「谁打的失败」（无失败轮时整卡隐藏）
  renderEndFailVoterEntry();
  // 强制结束按钮：始终隐藏（v104：单机模式下不需要）
  var forceEndCard = $('end-force-end-card');
  if (forceEndCard) {
    forceEndCard.style.display = 'none';
  }
}

/* ==================== v192：结束页失败票归属录入（v194 起含保护轮成功；v195 起候选仅限队内） ==================== */
// v194：是否为「保护轮」——第4轮且非 6 人局（6 人局无保护轮规则）
function isProtectRound(roundIdx) {
  return (roundIdx | 0) === 3 && (state.playerCount || 0) !== 6;
}

/* ---------- v195：失败票出票者候选范围＝该轮「最终通过并执行任务」的队伍 ---------- */
// 取该轮最终执行任务的队伍（玩家索引数组，升序去重）
// 取用依据：state.missions[i].team。组队投票通过后该字段保留并在执行任务时被使用；
// 一旦投票被否决，confirmVotes 会立即执行 m.team = []，被否提案只保留在 launchAttempts 快照中。
// 因此轮末仍存在的 team 必然是「最后一次投票通过、实际执行任务」的那支队伍，不会取到被否的提案。
function missionExecutedTeamIdx(m) {
  if (!m) return [];
  var pc = state.playerCount || 0;
  var src = (m.team && m.team.length) ? m.team : [];
  var out = [];
  for (var i = 0; i < src.length; i++) {
    var idx = parseInt(src[i], 10);
    if (isNaN(idx) || idx < 0) continue;
    if (pc > 0 && idx >= pc) continue;
    if (out.indexOf(idx) === -1) out.push(idx);
  }
  out.sort(function(a, b) { return a - b; });
  return out;
}

// 取历史记录中该轮最终执行任务的队伍（玩家索引数组）
// 历史记录的 missions[].team 存的是「N号 名字」标签数组：优先按序号解析（改名后仍可匹配），
// 序号解析失败时再按名字与 identities 比对。
function historyExecutedTeamIdx(rec, roundIdx) {
  if (!rec || !rec.missions || !rec.missions[roundIdx]) return [];
  var m = rec.missions[roundIdx];
  var labels = (m.team && m.team.length) ? m.team : [];
  var ids = rec.identities || [];
  var out = [];
  for (var i = 0; i < labels.length; i++) {
    var s = String(labels[i] == null ? '' : labels[i]).trim();
    if (!s) continue;
    var hit = -1;
    var nm = /^(\d+)\s*号/.exec(s);
    if (nm) {
      var num = parseInt(nm[1], 10) - 1;
      for (var j = 0; j < ids.length; j++) {
        var pid = (ids[j].index != null) ? ids[j].index : j;
        if (pid === num) { hit = pid; break; }
      }
      if (hit === -1 && num >= 0 && num < ids.length) hit = num;
    }
    if (hit === -1) {
      var pure = s.replace(/^\d+\s*号\s*/, '').trim();
      for (var k = 0; k < ids.length; k++) {
        if ((ids[k].name || '') === pure) { hit = (ids[k].index != null) ? ids[k].index : k; break; }
      }
    }
    if (hit !== -1 && out.indexOf(hit) === -1) out.push(hit);
  }
  out.sort(function(a, b) { return a - b; });
  return out;
}

// 候选集合 = 该轮执行队伍成员 ∪ 已存的队外旧数据（旧脏值仍可见、可取消，但不再新增队外候选）
function failVoterCandidateIdx(teamIdx, selectedIdx) {
  var out = [];
  var i;
  for (i = 0; i < (teamIdx || []).length; i++) {
    if (out.indexOf(teamIdx[i]) === -1) out.push(teamIdx[i]);
  }
  for (i = 0; i < (selectedIdx || []).length; i++) {
    if (out.indexOf(selectedIdx[i]) === -1) out.push(selectedIdx[i]);
  }
  out.sort(function(a, b) { return a - b; });
  return out;
}

// v194：该轮是否展示失败票归属录入
//   失败轮 → 始终可录（v192 行为）
//   成功轮 → 保护轮成功（1 张失败票未致失败），或成功但被抵消过失败票（如王者之剑）
function failVoterEntryEnabled(roundIdx, m) {
  if (!m || !m.result) return false;
  if (m.result === 'fail') return true;
  if (m.result === 'success') {
    if ((parseInt(m.shieldedFails, 10) || 0) > 0) return true;
    if (isProtectRound(roundIdx)) return true;
  }
  return false;
}

// v194：该轮允许记录的失败票出票者上限（0 表示不限）
function failVoterMaxCount(roundIdx, m) {
  if (!m) return 0;
  if (m.result === 'fail') {
    var fc = parseInt(m.failCount, 10) || 0;
    if (fc <= 0) return state.playerCount || 0;            // 票数未记录的旧数据：不额外限制（沿用 v192）
    if (isProtectRound(roundIdx)) return Math.min(fc, 2);  // 保护轮判失败即由 2 张失败票造成
    return fc;
  }
  if (m.result === 'success') {
    var sf = parseInt(m.shieldedFails, 10) || 0;
    return Math.max(1, sf);                                // 成功轮最多 = 未致失败的失败票张数
  }
  return 0;
}

// v194：成功轮失败票文案前缀，例「保护轮 1 张失败票」
function shieldedFailPrefix(roundIdx, m) {
  var sf = parseInt(m && m.shieldedFails, 10) || 0;
  return (isProtectRound(roundIdx) ? '保护轮 ' : '成功轮 ') + sf + ' 张失败票';
}

// 为每个「任务失败」的轮次（v194：以及保护轮成功）列出该轮执行队伍的成员（v195：仅队内），点选标记打失败票的玩家
function renderEndFailVoterEntry() {
  var card = document.getElementById('end-fail-voter-card');
  var grid = document.getElementById('end-fail-voter-grid');
  if (!card || !grid) return;
  var ms = state.missions || [];
  var rounds = [];
  for (var r = 0; r < ms.length; r++) {
    if (failVoterEntryEnabled(r, ms[r])) rounds.push(r);
  }
  if (!rounds.length) { card.style.display = 'none'; grid.innerHTML = ''; return; }

  var h = '';
  var renderedCount = 0;
  for (var k = 0; k < rounds.length; k++) {
    var r2 = rounds[k];
    var m = ms[r2];
    if (!Array.isArray(m.failVoters)) m.failVoters = [];
    // v195：候选仅由该轮「最终通过并执行任务」的队伍构成；
    // 队伍缺失（如 5 次组队未通过自动失败、旧记录）时退化为不展示该轮，保持不报错
    var teamIdx = missionExecutedTeamIdx(m);
    var candIdx = failVoterCandidateIdx(teamIdx, m.failVoters);
    if (!candIdx.length) continue;
    renderedCount++;
    var max = failVoterMaxCount(r2, m);
    var isShielded = (m.result === 'success');
    var sf = parseInt(m.shieldedFails, 10) || 0;
    var title;
    if (isShielded) {
      title = '第' + (r2 + 1) + '轮 · ' + (isProtectRound(r2) ? '保护轮 · ' : '') + '成功（'
        + Math.max(sf, 1) + ' 张失败票未致失败）';
    } else {
      title = '第' + (r2 + 1) + '轮 · ' + missionFailLabel(m);
    }
    var cntTxt = '已选 ' + m.failVoters.length + ' 人';
    if (max > 0) cntTxt += '／上限 ' + max + ' 张';
    if (!isShielded && m.failCount) cntTxt += '／失败票 ' + m.failCount + ' 张';
    h += '<div class="end-fv-round">';
    h += '<div class="end-fv-round-title">' + title + ' <span class="end-fv-count">' + cntTxt + '</span></div>';
    h += '<div class="end-fv-btns">';
    for (var ci = 0; ci < candIdx.length; ci++) {
      var i = candIdx[ci];
      var on = m.failVoters.indexOf(i) !== -1;
      var inTeam = teamIdx.indexOf(i) !== -1;
      var mark = inTeam ? '<span class="end-fv-team">队</span>'
        : '<span style="color:var(--orange);margin-left:4px;font-size:11px">非队内</span>';
      h += '<button type="button" class="btn small end-fv-btn' + (on ? ' on' : '') + '" onclick="toggleEndFailVoter(' + r2 + ',' + i + ')">'
        + escAttr(playerLabel(i)) + mark + '</button>';
    }
    h += '</div></div>';
  }
  if (!renderedCount) { card.style.display = 'none'; grid.innerHTML = ''; return; }
  card.style.display = 'block';
  grid.innerHTML = h;
}

function toggleEndFailVoter(round, idx) {
  var m = state.missions[round];
  if (!m) return;
  if (!Array.isArray(m.failVoters)) m.failVoters = [];
  // v195：只允许勾选该轮执行队伍内的玩家（已存的队外旧值仍在候选内，可点击取消）
  var candGuard = failVoterCandidateIdx(missionExecutedTeamIdx(m), m.failVoters);
  if (candGuard.indexOf(idx) === -1) return;
  var pos = m.failVoters.indexOf(idx);
  var max = failVoterMaxCount(round, m);
  if (pos === -1) {
    if (max > 0 && m.failVoters.length >= max) {
      try { toast('第' + (round + 1) + '轮最多记录 ' + max + ' 张失败票的归属', 'warn'); } catch (e) {}
      return;
    }
    m.failVoters.push(idx);
  } else {
    m.failVoters.splice(pos, 1);
  }
  m.failVoters.sort(function(a, b) { return a - b; });
  // v194：成功轮（保护轮 1 张失败票未致失败）选中即视为该轮存在失败票；全部取消则还原为全票通过
  if (m.result === 'success') {
    if (m.failVoters.length > 0) {
      var n = m.failVoters.length;
      m.failCount = n;
      m.shieldedFails = Math.max(parseInt(m.shieldedFails, 10) || 0, n);
    } else {
      m.failCount = 0;
      m.shieldedFails = 0;
    }
  }
  renderEndFailVoterEntry();
  if (m.result === 'fail' && m.failCount && m.failVoters.length > m.failCount) {
    try { toast('已选人数超过该轮失败票数（' + m.failCount + ' 张），仅记录不清空', 'warn'); } catch (e) {}
  }
}

/* ==================== END: TEMP PLAYER RENAME ==================== */
function renderEndTempPlayerRenames() {
  var tempPlayers = [];
  for (var i = 0; i < state.playerCount; i++) {
    var nm = state.playerNames[i];
    // 检测临时玩家：名字以"玩家"开头且后跟纯数字
    if (/^玩家\d+$/.test(nm)) {
      tempPlayers.push({ idx: i, name: nm });
    }
  }
  var card = $('end-rename-temp-card');
  if (tempPlayers.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';
  var h = '';
  for (var j = 0; j < tempPlayers.length; j++) {
    var p = tempPlayers[j];
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">';
    h += '<span style="font-size:14px;min-width:50px;color:var(--text-dim)">' + playerLabel(p.idx) + '</span>';
    h += '<span style="color:var(--text-dim)">→</span>';
    h += '<input type="text" id="rename-temp-' + p.idx + '" value="' + p.name + '"';
    h += ' style="flex:1;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:15px;outline:none;min-width:120px">';
    h += '</div>';
  }
  $('end-rename-temp-grid').innerHTML = h;
}

function saveTempPlayerRenames() {
  for (var i = 0; i < state.playerCount; i++) {
    var input = document.getElementById('rename-temp-' + i);
    if (!input) continue;
    var newName = input.value.trim();
    if (!newName || newName === state.playerNames[i]) continue;
    // 检查是否与其他玩家重名
    var dup = false;
    for (var k = 0; k < state.playerCount; k++) {
      if (k !== i && state.playerNames[k] === newName) { dup = true; break; }
    }
    if (dup) { toast('名字「' + newName + '」已被其他玩家使用', 'warn'); continue; }
    // 更新 playerNames
    state.playerNames[i] = newName;
    // 若 namePool 中尚无此名字，加入
    if (namePool.indexOf(newName) === -1) {
      namePool.push(newName);
    }
  }
  saveNamePool();
  // 同步云端名字库
  if (typeof sb !== 'undefined' && sb) {
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() })
      .then(function(res) {
        if (res.error) console.warn('sync name_pool failed:', res.error);
      });
  }
  // 重新渲染身份下拉和改名列表
  renderEndIdentityDropdowns();
  renderEndTempPlayerRenames();
  renderPlayerNames();
  toast('临时玩家名称已更新');
}

function onEndRoleChange(idx) {
  var sel = document.getElementById('end-role-' + idx);
  var role = sel ? sel.value : '';
  if (role && (UNIQUE_ROLES.indexOf(role) !== -1 || role === '混子')) {
    renderEndIdentityDropdowns();
  }
}

/* ==================== LANCELOT AUTO-DRAW ==================== */
function shuffleLancelotDeck() {
  var deck = [true, true, false, false, false, false, false]; // 2反转+5空白
  for (var i = deck.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

function applyLancelotAutoDraw(round) {
  if (!state.lancelotDeck || state.lancelotDeck.length === 0) {
    showLancelotDrawToast(null, round);
    checkGameEnd();
    renderGame();
    return;
  }

  // Count available cards
  var flipCount = 0, blankCount = 0;
  for (var i = 0; i < state.lancelotDeck.length; i++) {
    if (state.lancelotDeck[i]) flipCount++;
    else blankCount++;
  }
  var remaining = state.lancelotDeck.length;

  // Mode selection modal
  var modeHtml = '<h2>兰斯洛特抽卡 · 第 ' + (round + 1) + ' 轮结束</h2>' +
    '<p style="font-size:14px;text-align:center;color:var(--text-dim);margin:8px 0">剩余牌堆：' + remaining + ' 张（反转 ' + flipCount + ' / 未反转 ' + blankCount + '）</p>' +
    '<div class="modal-actions" style="justify-content:center;gap:20px">' +
    '<button class="btn primary" id="lancelot-auto-draw-btn">自动抽卡</button>' +
    '<button class="btn" id="lancelot-manual-draw-btn">手动录入</button>' +
    '</div>';

  showModal(modeHtml);

  document.getElementById('lancelot-auto-draw-btn').addEventListener('click', function() {
    closeModal();
    lancelotDoAutoDraw(round);
  });

  document.getElementById('lancelot-manual-draw-btn').addEventListener('click', function() {
    closeModal();
    lancelotShowManualModal(round);
  });
}

function lancelotDoAutoDraw(round) {
  var card = state.lancelotDeck.shift();
  if (state.lancelotDrawResults.length <= round) {
    for (var i = state.lancelotDrawResults.length; i <= round; i++) state.lancelotDrawResults.push(null);
  }
  state.lancelotDrawResults[round] = card;
  if (card) {
    state.lancelotFlipCount++;
    state.lancelotFlipped = (state.lancelotFlipCount % 2 !== 0);
    state.lancelotRoundFlips[round] = true;
  }
  showLancelotDrawToast(card, round);
  console.log('[debug-lancelotDraw] lancelot round=' + round + ' card=' + card + ' currentRound before checkGameEnd=' + state.currentRound);
  checkGameEnd();
  console.log('[debug-lancelotDraw] after checkGameEnd: currentRound=' + state.currentRound + ' winner=' + state.winner);
  renderGame();
}

function lancelotShowManualModal(round) {
  // Re-count in case of edge cases
  var flipCount = 0, blankCount = 0;
  for (var i = 0; i < state.lancelotDeck.length; i++) {
    if (state.lancelotDeck[i]) flipCount++;
    else blankCount++;
  }

  var flipDisabled = flipCount === 0 ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '';
  var blankDisabled = blankCount === 0 ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '';

  var flipCard = '<div style="width:72px;height:72px;margin:0 auto 6px;border-radius:50%;overflow:hidden;border:2px solid #ff3030"><img src="images/兰斯洛特转移.png?v=3" style="width:100%;height:100%;object-fit:cover"></div>';
  var blankCard = '<div style="width:72px;height:72px;margin:0 auto 6px;border-radius:50%;background:rgba(150,150,150,0.2);border:2px solid #777;display:flex;align-items:center;justify-content:center;font-size:36px;color:#aaa">&#9675;</div>';

  var html = '<h2>手动录入 · 第 ' + (round + 1) + ' 轮结束</h2>' +
    '<p style="font-size:13px;text-align:center;color:var(--text-dim);margin:6px 0">请选择实际抽到的卡牌</p>' +
    '<div class="modal-actions" style="justify-content:center;gap:20px;flex-wrap:wrap">' +
    '<button class="btn" id="lancelot-manual-flip"' + flipDisabled + '>' + flipCard + '<span style="font-weight:700;color:var(--red-bright)">反转</span>' + (flipCount === 0 ? '<br><span style="font-size:10px;color:var(--text-dim)">已抽完</span>' : '') + '</button>' +
    '<button class="btn" id="lancelot-manual-blank"' + blankDisabled + '>' + blankCard + '<span>未反转</span>' + (blankCount === 0 ? '<br><span style="font-size:10px;color:var(--text-dim)">已抽完</span>' : '') + '</button>' +
    '</div>' +
    '<div class="modal-actions" style="margin-top:6px"><button class="btn" onclick="closeModal();applyLancelotAutoDraw(' + round + ')" style="font-size:12px">← 返回选择模式</button></div>';

  showModal(html);

  if (flipCount > 0) {
    document.getElementById('lancelot-manual-flip').addEventListener('click', function() {
      closeModal();
      lancelotDoManualDraw(round, true);
    });
  }
  if (blankCount > 0) {
    document.getElementById('lancelot-manual-blank').addEventListener('click', function() {
      closeModal();
      lancelotDoManualDraw(round, false);
    });
  }
}

function lancelotDoManualDraw(round, isFlip) {
  var idx = -1;
  for (var i = 0; i < state.lancelotDeck.length; i++) {
    if (state.lancelotDeck[i] === isFlip) { idx = i; break; }
  }
  if (idx === -1) return; // Safety guard
  state.lancelotDeck.splice(idx, 1);

  if (state.lancelotDrawResults.length <= round) {
    for (var i = state.lancelotDrawResults.length; i <= round; i++) state.lancelotDrawResults.push(null);
  }
  state.lancelotDrawResults[round] = isFlip;

  if (isFlip) {
    state.lancelotFlipCount++;
    state.lancelotFlipped = (state.lancelotFlipCount % 2 !== 0);
    state.lancelotRoundFlips[round] = true;
  }

  showLancelotDrawToast(isFlip, round);
  checkGameEnd();
  renderGame();
}

function showLancelotDrawToast(card, round) {
  if (card === null) {
    showModal(
      '<h2>兰斯洛特抽卡</h2>' +
      '<p style="font-size:16px;text-align:center;margin:10px 0">第 ' + (round + 1) + ' 轮结束</p>' +
      '<p style="font-size:14px;text-align:center;color:var(--orange)">牌堆已耗尽，本轮无法抽卡</p>' +
      '<div class="modal-actions"><button class="btn" onclick="closeModal()">确定</button></div>'
    );
    return;
  }
  var isFlip = card === true;
  var cardDisplay = isFlip
    ? '<div style="width:100px;height:100px;margin:12px auto;border-radius:50%;overflow:hidden;border:3px solid #ff3030;box-shadow:0 0 30px rgba(255,48,48,0.7);animation:lancelot-draw-reveal 0.6s ease-out"><img src="images/兰斯洛特转移.png?v=3" style="width:100%;height:100%;object-fit:cover"></div>'
    : '<div style="width:100px;height:100px;margin:12px auto;border-radius:50%;background:rgba(150,150,150,0.2);border:3px solid #777;display:flex;align-items:center;justify-content:center;font-size:42px;color:#aaa;animation:lancelot-draw-reveal 0.6s ease-out">&#9675;</div>';
  var msg = isFlip
    ? '<span style="color:var(--red-bright);font-weight:700">反转卡！阵营反转</span>'
    : '<span style="color:var(--text-dim)">未反转，无变化</span>';
  var statusNote = isFlip
    ? (state.lancelotFlipped ? '（当前状态：已反转）' : '（第2次翻转，恢复原阵营）')
    : '';
  var remaining = state.lancelotDeck ? state.lancelotDeck.length : 0;

  showModal(
    '<h2>兰斯洛特抽卡 · 第 ' + (round + 1) + ' 轮结束</h2>' +
    cardDisplay +
    '<p style="font-size:16px;text-align:center;margin:8px 0">' + msg + ' ' + statusNote + '</p>' +
    '<p style="font-size:12px;text-align:center;color:var(--text-dim)">剩余牌堆：' + remaining + ' 张</p>' +
    '<div class="modal-actions"><button class="btn primary" onclick="closeModal()">确定</button></div>'
  );
}

// Legacy: kept for backward compatibility but no longer called from game flow
function resolveAssassin(isMerlin) {
  state.winner = isMerlin ? 'evil' : 'good';
  state.assassinFromMission = false;
  if (isMerlin && state.assassinTarget !== null) {
    state.autoRoles = state.autoRoles || {};
    state.autoRoles[state.assassinTarget] = '梅林';
  }
  $('end-assassin-card').style.display = 'none';
  renderEnd();
  toast(isMerlin ? '刺杀成功！反方获胜' : '刺杀失败！好人方获胜');
}

function setWinner(w) {
  state.winner = w;
  renderEnd();
}

function saveGameRecord() {
  if (!state.winner) { toast('请确定获胜方', 'warn'); return; }

  // 保存行内修改的临时玩家名称
  for (var i = 0; i < state.playerCount; i++) {
    var nameInput = document.getElementById('end-name-' + i);
    if (!nameInput) continue;
    var newName = nameInput.value.trim();
    if (!newName || newName === state.playerNames[i]) continue;
    var dupName = false;
    for (var k = 0; k < state.playerCount; k++) {
      if (k !== i && state.playerNames[k] === newName) { dupName = true; break; }
    }
    if (dupName) { toast('名字「' + newName + '」已被其他玩家使用', 'warn'); return; }
    state.playerNames[i] = newName;
    if (namePool.indexOf(newName) === -1) namePool.push(newName);
  }
  saveNamePool();

  var identities = [];
  var allFilled = true;
  for (var i = 0; i < state.playerCount; i++) {
    var sel = document.getElementById('end-role-' + i);
    var role = sel ? sel.value : '';
    identities.push({ name: state.playerNames[i], index: i, role: role });
    if (!role) allFilled = false;
  }
  if (!allFilled) { toast('请为所有玩家选择身份', 'warn'); return; }

  // 混子：从行内下拉读取跟随目标
  var huntTargetSel = document.getElementById('end-hunt-target');
  if (huntTargetSel && huntTargetSel.value !== '') {
    state._huntFollowTarget = parseInt(huntTargetSel.value, 10);
  }

  var lancelotFlips = {};
  for (var i = 0; i < state.playerCount; i++) {
    var role = identities[i].role;
    if (role === '兰斯洛特(蓝)' || role === '兰斯洛特(红)') {
      lancelotFlips[i] = state.lancelotFlipped;
    }
  }

  var _uuid = generateUUID();
  var history = loadHistory();
  var record = {
    _uuid: _uuid,
    date: _bjDate(),
    startTime: state.gameStartTime || '',
    endTime: _bjTimestamp(),
    playerCount: state.playerCount,
    winner: state.winner,
    identities: identities,
    lancelotFlips: lancelotFlips,
    activeRoles: state.activeRoles.slice(),
    roundTendencies: state.roundTendencies || [],
    assassinTarget: state.assassinTarget !== null ? playerLabel(state.assassinTarget) : null,
    assassinSuccess: (state.winner === 'evil' && state.assassinTarget !== null),
    assassinAfterRound: state._assassinAfterRound !== null ? state._assassinAfterRound : null,
    assassinFromMission: !!state.assassinFromMission,
    huntFollow: state._huntFollowTarget !== undefined ? state._huntFollowTarget : null,
    currentRound: state._assassinAfterRound !== null ? state._assassinAfterRound : state.currentRound,
    identityMarks: state.identityMarks.map(function(m) {
      return { target: m.target, targetName: playerLabel(m.target), level: m.level, timestamp: m.timestamp };
    }),
    missions: state.missions.map(function(m) {
      return {
        round: m.round,
        size: m.size,
        leader: m.leader !== null ? playerLabel(m.leader) : '',
        team: m.team.map(function(i) { return playerLabel(i); }),
        result: m.result,
        failCount: m.failCount,
        shieldedFails: m.shieldedFails || 0,
        failVoters: (m.failVoters || []).map(function(vi) { return playerLabel(vi); }),
        launchFailures: m.launchFailures,
        launchAttempts: (m.launchAttempts || []).map(function(att) {
          return {
            team: att.team.map(function(i) { return playerLabel(i); }),
            votes: Object.keys(att.votes).reduce(function(acc, k) {
              acc[playerLabel(parseInt(k))] = att.votes[k];
              return acc;
            }, {}),
            leader: playerLabel(att.leader)
          };
        }),
        votes: Object.keys(m.votes || {}).reduce(function(acc, k) {
          acc[playerLabel(parseInt(k))] = m.votes[k];
          return acc;
        }, {})
      };
    }),
    ladyCheckHistory: state.ladyCheckHistory.map(function(h) {
      return {
        round: h.round,
        holder: h.holder,
        holderName: playerLabel(h.holder),
        target: h.target,
        targetName: playerLabel(h.target),
        result: h.result,
        note: h.note || '',
        recordedAtRound: h.recordedAtRound,
        recordedAtSpeaker: h.recordedAtSpeaker
      };
    }),
    excaliburEnabled: state.excaliburEnabled,
    excaliburHistory: (state.excaliburHistory || []).map(function(e) {
      return {
        round: e.round,
        leader: e.leader,
        leaderName: e.leader >= 0 ? playerLabel(e.leader) : '',
        team: (e.team || []).map(function(ti) { return playerLabel(ti); }),
        holder: e.holder,
        holderName: e.holder >= 0 ? playerLabel(e.holder) : '',
        used: e.used,
        target: e.target,
        targetName: e.target !== null && e.target !== undefined ? playerLabel(e.target) : '',
        feedbackRecorded: e.feedbackRecorded,
        feedbackRound: e.feedbackRound,
        feedbackSpeaker: e.feedbackSpeaker,
        claimedDirection: e.claimedDirection || '',
        note: e.note || ''
      };
    })
  };
  var recordV2 = toRecordV2(record);
  recordV2._uuid = _uuid;

  // 顺序：先 Supabase，成功后写 localStorage
  var sb = getSupabase();
  var done = false;
  function finishSave() {
    if (done) return;
    done = true;
    var savedCount = state.playerCount;
    var savedNames = state.playerNames.slice();
    var savedSelf = state.selfIndex;
    var savedRoles = state.activeRoles.slice();
    initState(savedCount);
    state.activeRoles = savedRoles;
    state.playerNames = savedNames;
    state.selfIndex = savedSelf;
    state.myRole = null;
    showPage('setup');
  }
  function writeLocalAndFinish(sid) {
    if (sid) {
      recordV2._sid = sid;
    }
    history.push(recordV2);
    saveHistory(history);
    finishSave();
  }
  if (sb) {
    sb.from('game_records').insert({ game_data: record, game_data_v2: recordV2 }).select('id').single().then(function(res) {
      if (res.error) {
        console.warn('[Supabase] saveGameRecord failed:', res.error);
        // 云端保存失败：先存本地（无 _sid），同时入重推队列
        var queue = getPendingQueue();
        queue.push({ _uuid: _uuid, record: record, recordV2: recordV2 });
        savePendingQueue(queue);
        writeLocalAndFinish(null);
        toast('云端保存失败，记录已保存到本地', 'warn');
      } else if (res.data && res.data.id) {
        writeLocalAndFinish(res.data.id);
      } else {
        writeLocalAndFinish(null);
      }
    });
    // 同步 name_pool 到云端
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }, { onConflict: 'key' }).then(function(res) {
      if (res.error) console.warn('[Supabase] save name_pool failed:', res.error);
    });
    // 超时兜底：5 秒后如果还没结束，强制写本地并跳转
    setTimeout(function() {
      if (!done) {
        var q2 = getPendingQueue();
        q2.push({ _uuid: _uuid, record: record, recordV2: recordV2 });
        savePendingQueue(q2);
        writeLocalAndFinish(null);
        toast('云端保存超时，记录已保存到本地', 'warn');
      }
    }, 5000);
  } else {
    console.warn('[Supabase] saveGameRecord: no connection');
    // 无网络：先存本地（无 _sid），同时入重推队列
    var queue = getPendingQueue();
    queue.push({ _uuid: _uuid, record: record, recordV2: recordV2 });
    savePendingQueue(queue);
    writeLocalAndFinish(null);
    toast('无网络连接，记录已保存到本地', 'warn');
  }
}

/* ==================== 混子跟随选择 ==================== */
function showHuntFollowModal(huntIndex, identities) {
  var huntName = state.playerNames[huntIndex];
  var h = '<h2>混子选择跟随目标</h2>';
  h += '<p style="color:var(--text-dim);font-size:14px;margin-bottom:12px">';
  h += '<strong style="color:var(--gold-light)">' + huntName + '</strong>（' + (huntIndex + 1) + '号）是混子，请选择本轮跟随的玩家：</p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < state.playerCount; i++) {
    // 跳过自己
    if (i === huntIndex) continue;
    h += '<button class="assassin-target-btn" onclick="onHuntFollowSelect(' + i + ')">';
    h += (i + 1) + '号 ' + escapeHtml(state.playerNames[i]);
    h += '</button>';
  }
  h += '</div>';
  showModal(h);
}

function onHuntFollowSelect(targetIdx) {
  state._huntFollowTarget = targetIdx;
  closeModal();
  toast('混子跟随：' + (targetIdx + 1) + '号 ' + state.playerNames[targetIdx]);
  saveGameRecord();
}

/* ==================== STATS PANEL ==================== */
function scheduleRenderStats() {
  if (state._currentPage !== 'stats') return;
  if (_statsRenderScheduled) return;
  _statsRenderScheduled = true;
  var run = function() {
    _statsRenderScheduled = false;
    if (state._currentPage === 'stats') renderStats();
  };
  if (window.requestAnimationFrame) requestAnimationFrame(run);
  else setTimeout(run, 16);
}

function renderStats() {
  renderConnectionStatus();
  var history = loadNormalizedHistory();
  var total = history.length;
  var goodWins = history.filter(function(h) { return h.winner === 'good'; }).length;
  var evilWins = history.filter(function(h) { return h.winner === 'evil'; }).length;
  var winRate = total > 0 ? Math.round(goodWins / total * 100) : 0;

  // v187：战绩概览每格可单独点击，进入对应参赛记录
  var h = '<div class="stat-card stat-card-tap" role="button" tabindex="0" onclick="openStatCellRecords(0)"><div class="stat-value">' + total + '</div><div class="stat-label">总对局</div></div>';
  h += '<div class="stat-card stat-card-tap" role="button" tabindex="0" onclick="openStatCellRecords(1)"><div class="stat-value" style="color:#99ff99">' + goodWins + '</div><div class="stat-label">好人胜场</div>';
  h += '<div class="stat-sub">' + winRate + '%</div></div>';
  h += '<div class="stat-card stat-card-tap" role="button" tabindex="0" onclick="openStatCellRecords(2)"><div class="stat-value" style="color:#ff9999">' + evilWins + '</div><div class="stat-label">反方胜场</div>';
  h += '<div class="stat-sub">' + (total > 0 ? Math.round(evilWins / total * 100) : 0) + '%</div></div>';

  // Merlin assassination rate: count all games except evil won by 3 mission failures
  var merlinGames = 0, merlinKilled = 0;
  var merlinIdxs = [];   // v187：被刺对局索引，供概览格点击
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!rec.missions) continue;
    var failCount = rec.missions.filter(function(m) { return m.result === 'fail'; }).length;
    if (!(failCount >= 3 && rec.winner === 'evil')) {
      merlinGames++;
      if (rec.assassinSuccess === true) { merlinKilled++; merlinIdxs.push(recKeyOf(rec)); }
    }
  }
  state._merlinKilledIdxs = merlinIdxs;
  if (merlinGames > 0) {
    var maRate = Math.round(merlinKilled / merlinGames * 100);
    h += '<div class="stat-card stat-card-tap" role="button" tabindex="0" onclick="openStatCellRecords(3)"><div class="stat-value" style="color:#ff6666">' + maRate + '%</div><div class="stat-label">梅林被刺率</div>';
    h += '<div class="stat-sub" style="font-size:11px">' + merlinKilled + '次被刺 / ' + merlinGames + '局</div></div>';
  }

  $('stats-overview').innerHTML = h;

  // Apply filters
  var filtered = getFilteredHistory(history);
  state._filteredHistory = filtered; // store for pagination

  // Compact history list
  var ps = state._historyPageSize;
  var totalPages = Math.ceil(filtered.length / ps);
  if (state._historyPage >= totalPages && totalPages > 0) state._historyPage = totalPages - 1;
  if (state._historyPage < 0) state._historyPage = 0;
  var start = state._historyPage * ps;
  var end = Math.min(filtered.length, start + ps);

  // 调试信息：已加载记录数和 UTC 转北京时间统计
  var debugInfo = $('history-debug-info');
  if (!debugInfo) {
    var histCard = document.getElementById('history-card');
    if (histCard) {
      debugInfo = document.createElement('div');
      debugInfo.id = 'history-debug-info';
      debugInfo.style.cssText = 'font-size:10px;color:#7a6e5e;padding:4px 12px;text-align:center';
      histCard.insertBefore(debugInfo, histCard.firstChild.nextSibling);
    }
  }
  if (debugInfo) {
    debugInfo.textContent = '\u5df2\u52a0\u8f7d ' + total + ' \u6761\u8bb0\u5f55\uff0c\u5176\u4e2d ' + _migratedCount + ' \u6761\u5df2\u8f6c\u6362\u4e3a\u5317\u4eac\u65f6\u95f4';
  }

  var cl = $('history-compact-list');
  h = '';
  for (var fi = start; fi < end; fi++) {
    var frec = filtered[fi];
    var rec = frec.rec;
    var i = frec.origIdx;
    if (!rec) continue;
    var winnerColor = rec.winner === 'good' ? 'var(--green-bright)' : 'var(--red-bright)';
    var winnerLabel = rec.winner === 'good' ? '好人方胜' : '反方胜';

    // --- One-line summary ---
    var successCount = 0, failCount = 0;
    if (rec.missions) {
      for (var mi2 = 0; mi2 < rec.missions.length; mi2++) {
        if (rec.missions[mi2].result === 'success') successCount++;
        else if (rec.missions[mi2].result === 'fail') failCount++;
      }
    }
    var oneLiner = successCount + ':' + failCount;
    if (rec.winner === 'good') oneLiner = '好人' + oneLiner + '胜利';
    else oneLiner = '反方' + oneLiner + '胜利';
    if (rec.assassinTarget) {
      oneLiner += '，刺' + rec.assassinTarget + (rec.assassinSuccess ? '命中' : '未中');
    }

    // v187：整条预览格可单独点击进入该局详细参赛记录
    // v196：以唯一标识定位，避免数组下标漂移导致点错局
    var _hKey = recKeyOf(rec) || String(i);
    h += '<div class="history-compact-item hci-tap" role="button" tabindex="0" onclick="openHistoryModal(\'' + _hKey + '\')">';
    h += '<div class="hci-header">';
    var timeStr = rec.startTime ? rec.startTime.slice(11, 16) : '';
    h += '<span class="hci-date">' + rec.date + (timeStr ? ' ' + timeStr : '') + '</span>';
    h += '<span class="hci-players">' + rec.playerCount + '人</span>';
    if (rec.startTime && rec.endTime) {
      var durMin = Math.round((new Date(rec.endTime.replace(' ', 'T')) - new Date(rec.startTime.replace(' ', 'T'))) / 60000);
      if (durMin > 0) h += '<span class="hci-duration" style="font-size:11px;color:var(--text-dim);margin-left:4px">' + durMin + '分钟</span>';
    }
    h += '<div class="hci-right">';
    h += '<span class="hci-result" style="color:' + winnerColor + '">' + winnerLabel + '</span>';
    h += '<span style="font-size:11px;color:var(--text-dim);margin:0 6px">' + oneLiner + '</span>';

    h += '</div></div>';
    h += missionChipsHTML(rec);
    h += '</div>';
  }
  cl.innerHTML = h;
  $('no-history').style.display = filtered.length === 0 ? 'block' : 'none';

  // Pagination
  var pageArea = $('pagination-area');
  if (totalPages <= 1) {
    pageArea.innerHTML = '';
  } else {
    var ph = '<div class="pagination">';
    ph += '<button class="page-btn" onclick="goHistoryPage(' + (state._historyPage - 1) + ')"' + (state._historyPage === 0 ? ' disabled' : '') + '>‹</button>';
    var pageButtons = [];
    if (totalPages <= 7) {
      for (var p = 0; p < totalPages; p++) pageButtons.push(p);
    } else {
      pageButtons.push(0);
      if (state._historyPage > 3) pageButtons.push('...');
      var pStart = Math.max(1, state._historyPage - 1);
      var pEnd = Math.min(totalPages - 2, state._historyPage + 1);
      for (var p = pStart; p <= pEnd; p++) pageButtons.push(p);
      if (state._historyPage < totalPages - 4) pageButtons.push('...');
      pageButtons.push(totalPages - 1);
    }
    for (var k = 0; k < pageButtons.length; k++) {
      var bp = pageButtons[k];
      if (bp === '...') {
        ph += '<span class="page-ellipsis">…</span>';
      } else {
        ph += '<button class="page-btn' + (bp === state._historyPage ? ' active' : '') + '" onclick="goHistoryPage(' + bp + ')">' + (bp + 1) + '</button>';
      }
    }
    ph += '<button class="page-btn" onclick="goHistoryPage(' + (state._historyPage + 1) + ')"' + (state._historyPage >= totalPages - 1 ? ' disabled' : '') + '>›</button>';
    ph += '</div>';
    pageArea.innerHTML = ph;
  }

  // Player stats
  var playerSet = {};
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    for (var j = 0; j < rec.identities.length; j++) {
      var id = rec.identities[j];
      var nm = id.name;
      if (!playerSet[nm]) playerSet[nm] = [];
      playerSet[nm].push({
        winner: rec.winner,
        role: id.role,
        flipped: rec.lancelotFlips && rec.lancelotFlips[id.index],
        recIndex: i,
        recKey: recKeyOf(rec),
        huntFollow: rec.huntFollow != null ? rec.huntFollow : null
      });
    }
  }
  var names = Object.keys(playerSet).sort(function(a, b) {
    return playerSet[b].length - playerSet[a].length;
  });
  // Populate filter-player dropdown
  var fpSel = document.getElementById('filter-player');
  if (fpSel) {
    var curFpVal = fpSel.value;
    var fpOpts = '<option value="">全部</option>';
    for (var i = 0; i < names.length; i++) {
      fpOpts += '<option value="' + names[i] + '"' + (curFpVal === names[i] ? ' selected' : '') + '>' + names[i] + '</option>';
    }
    fpSel.innerHTML = fpOpts;
  }
  state._playerSetCache = playerSet;
  // 个人主页放在下方独立区域
  // 个人主页放在下方独立区域
  var profileBtn = '<button class="btn" style="width:100%;margin-top:12px;padding:10px;font-size:15px;font-weight:600" onclick="showPlayerProfilePopup()">&#128100; 个人主页</button>';
  $('player-profile-row').innerHTML = profileBtn;

  // 今日胜率排行榜：第一天19:00到次日18:59:59为一天
  var now = new Date();
  var todayDateStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  var yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayDateStr = yesterday.getFullYear() + '-' +
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterday.getDate()).padStart(2, '0');
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowDateStr = tomorrow.getFullYear() + '-' +
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
    String(tomorrow.getDate()).padStart(2, '0');

  var todayDates = {};
  if (now.getHours() < 19) {
    todayDates[yesterdayDateStr] = true;
    todayDates[todayDateStr] = true;
  } else {
    todayDates[todayDateStr] = true;
    todayDates[tomorrowDateStr] = true;
  }
  state._todayDates = todayDates;   // v187：供今日胜率卡片点击筛选用

  // 按玩家汇总今日数据
  var todayPlayerSet = {};
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!todayDates[rec.date]) continue;
    for (var j = 0; j < rec.identities.length; j++) {
      var id = rec.identities[j];
      var nm = id.name;
      if (!todayPlayerSet[nm]) todayPlayerSet[nm] = [];
      todayPlayerSet[nm].push({
        winner: rec.winner,
        role: id.role,
        flipped: rec.lancelotFlips && rec.lancelotFlips[id.index],
        huntFollow: rec.huntFollow != null ? rec.huntFollow : null,
        recIndex: i,
        recKey: recKeyOf(rec)
      });
    }
  }

  var lb = [];
  for (var nm in todayPlayerSet) {
    var items = todayPlayerSet[nm];
    var totalGames = items.length;
    var goodCount = 0, evilCount = 0, wins = 0;
    for (var g = 0; g < items.length; g++) {
      var faction = getFinalFaction(items[g].role, items[g].flipped);
      // 混子：根据跟随目标解析阵营
      if (items[g].role === '混子' && items[g].huntFollow != null && items[g].recIndex < history.length) {
        var rec_ = history[items[g].recIndex];
        faction = resolveHuntFaction(rec_, items[g].huntFollow);
      }
      if (faction === 'good') goodCount++;
      else if (faction === 'evil') evilCount++;
      if (items[g].winner === faction) wins++;
    }
    var rate = totalGames > 0 ? wins / totalGames : 0;
    lb.push({ name: nm, total: totalGames, goodWins: goodCount, evilWins: evilCount, rate: rate });
  }
  lb.sort(function(a, b) { return b.rate - a.rate || b.total - a.total; });

  var showAll = state._showAllLeaderboard || false;
  state._todayLb = lb;   // v187：供今日胜率卡片点击查看参赛记录
  var maxShow = showAll ? lb.length : Math.min(10, lb.length);
  var lh = '';
  for (var r = 0; r < maxShow; r++) {
    var p = lb[r];
    var topClass = '';
    if (r === 0) topClass = ' top1';
    else if (r === 1) topClass = ' top2';
    else if (r === 2) topClass = ' top3';
    lh += '<div class="win-rate-card win-rate-tap' + topClass + '" role="button" tabindex="0" onclick="openTodayPlayerRecords(' + r + ')">';
    var rateColor = p.rate >= 0.6 ? '#4caf50' : p.rate >= 0.4 ? '#ff9800' : '#f44336';
    lh += '<span class="wc-rank">' + (r + 1) + '</span>';
    lh += '<span class="wc-name">' + p.name + '</span>';
    lh += '<div><div class="wc-rate" style="font-size:24px;color:' + rateColor + ';font-weight:bold;">' + Math.round(p.rate * 100) + '%</div>';
    lh += '<div class="wc-sub">好人' + p.goodWins + ' / 反方' + p.evilWins + ' / 共' + p.total + '场</div></div>';
    lh += '</div>';
  }
  if (lb.length > 10) {
    lh += '<div style="text-align:center;margin-top:8px">';
    lh += '<button class="btn small" onclick="toggleLeaderboard()">' + (showAll ? '收起' : '展开全部（共' + lb.length + '名）') + '</button>';
    lh += '</div>';
  }
  if (lb.length === 0) {
    // 今日无对局，隐藏整个排行榜区域
    var leaderboardCard = document.getElementById('win-rate-leaderboard').parentNode;
    if (leaderboardCard) leaderboardCard.style.display = 'none';
  } else {
    var leaderboardCard = document.getElementById('win-rate-leaderboard').parentNode;
    if (leaderboardCard) leaderboardCard.style.display = '';
  }
  $('win-rate-leaderboard').innerHTML = lh;
  renderNamePoolList();
}

function toggleLeaderboard() {
  state._showAllLeaderboard = !state._showAllLeaderboard;
  renderStats();
}

function toggleHciDetail(toggle) {
  var content = toggle.nextElementSibling;
  toggle.classList.toggle('open');
  if (content) content.classList.toggle('open');
}

function toggleCompactHistory(header) {
  var body = header.nextElementSibling;
  var toggle = header.querySelector('.hci-toggle');
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    toggle.classList.remove('open');
  } else {
    body.classList.add('open');
    toggle.classList.add('open');
  }
}

function goHistoryPage(p) {
  var filtered = state._filteredHistory || loadHistory();
  var totalPages = Math.ceil(filtered.length / state._historyPageSize);
  if (p < 0 || p >= totalPages) return;
  state._historyPage = p;
  renderStats();
}

function getFilteredHistory(history) {
  var dateFrom = document.getElementById('filter-date-from') ? document.getElementById('filter-date-from').value : '';
  var dateTo = document.getElementById('filter-date-to') ? document.getElementById('filter-date-to').value : '';
  var winner = document.getElementById('filter-winner') ? document.getElementById('filter-winner').value : '';
  var player = document.getElementById('filter-player') ? document.getElementById('filter-player').value : '';

  var result = [];
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!rec) continue;

    if (dateFrom && rec.date < dateFrom) continue;
    if (dateTo && rec.date > dateTo) continue;
    if (winner && rec.winner !== winner) continue;

    if (player) {
      var hasPlayer = false;
      if (rec.identities) {
        for (var j = 0; j < rec.identities.length; j++) {
          if (rec.identities[j].name === player) { hasPlayer = true; break; }
        }
      }
      if (!hasPlayer) continue;
    }

    result.push({ rec: rec, origIdx: i });
  }
  // 按日期倒序排列（最近的在前）
  result.sort(function(a, b) {
    if (a.rec.date > b.rec.date) return -1;
    if (a.rec.date < b.rec.date) return 1;
    return b.origIdx - a.origIdx;
  });
  return result;
}

function applyHistoryFilter() {
  state._historyPage = 0;
  renderStats();
}

function clearHistoryFilter() {
  var from = document.getElementById('filter-date-from');
  var to = document.getElementById('filter-date-to');
  var winner = document.getElementById('filter-winner');
  var player = document.getElementById('filter-player');
  if (from) from.value = '';
  if (to) to.value = '';
  if (winner) winner.value = '';
  if (player) player.value = '';
  state._historyPage = 0;
  renderStats();
}

/* ==================== PLAYER STAT ==================== */
function getFinalFaction(role, flipped) {
  if (role === '兰斯洛特(蓝)') return flipped ? 'evil' : 'good';
  if (role === '兰斯洛特(红)') return flipped ? 'good' : 'evil';
  if (role === '混子') return 'neutral';
  return GOOD_ROLES.indexOf(role) !== -1 ? 'good' : 'evil';
}

// 根据跟随目标解析混子的阵营
function resolveHuntFaction(rec, huntTargetIdx) {
  if (huntTargetIdx == null || rec.identities.length === 0) return 'neutral';
  var target = rec.identities.find(function(id) { return id.index === huntTargetIdx; });
  if (!target) return 'neutral';
  var flipped = rec.lancelotFlips ? rec.lancelotFlips[huntTargetIdx] : false;
  return getFinalFaction(target.role, flipped);
}
function showPlayerProfilePopup() {
  var playerSet = state._playerSetCache;
  var history = loadNormalizedHistory();
  var names = Object.keys(playerSet || {}).sort(function(a, b) {
    return playerSet[b].length - playerSet[a].length;
  });
  if (names.length === 0) { toast('暂无对局记录', 'warn'); return; }

  // Step 1: select player
  var h = '<h2>&#128100; 个人主页</h2><p style="color:var(--text-dim)">选择玩家查看详细数据</p>';
  h += '<select id="profile-player-sel" onchange="renderPlayerProfile()" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;cursor:pointer;min-height:48px">';
  h += '<option value="">-- 选择玩家 --</option>';
  for (var i = 0; i < names.length; i++) {
    h += '<option value="' + names[i] + '">' + names[i] + '</option>';
  }
  h += '</select>';
  h += '<div id="profile-content" style="margin-top:12px"></div>';
  h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button></div>';
  showModal(h);
}

function renderPlayerProfile() {
  var sel = document.getElementById('profile-player-sel');
  if (!sel || !sel.value) return;
  var name = sel.value;

  var playerSet = state._playerSetCache;
  var history = loadNormalizedHistory();
  var data = playerSet[name];
  if (!data) return;

  var totalWins = 0, winsGood = 0, winsEvil = 0;
  var gamesGood = 0, gamesEvil = 0;
  var roleStats = {}; // role -> { good: {total,wins}, evil: {total,wins} }
  var streak = 0, maxStreak = 0, streakType = '';
  var recentResults = []; // for streak calc: ordered by recIndex desc

  // Sort data by recIndex desc for streak calculation
  var sortedData = data.slice().sort(function(a, b) { return b.recIndex - a.recIndex; });

  for (var i = 0; i < sortedData.length; i++) {
    var d = sortedData[i];
    var flipped = d.flipped || false;
    var finalFaction = getFinalFaction(d.role, flipped);
    // 混子：根据跟随目标解析阵营
    if (d.role === '混子' && d.huntFollow != null && d.recIndex < history.length) {
      var rec = history[d.recIndex];
      finalFaction = resolveHuntFaction(rec, d.huntFollow);
    }
    var isWin = d.winner === finalFaction;
    if (isWin) totalWins++;

    if (finalFaction === 'good') {
      gamesGood++;
      if (d.winner === 'good') winsGood++;
    } else if (finalFaction === 'evil') {
      gamesEvil++;
      if (d.winner === 'evil') winsEvil++;
    }

    // Role stats by faction
    var rn = d.role;
    if (!roleStats[rn]) roleStats[rn] = { good: { total: 0, wins: 0 }, evil: { total: 0, wins: 0 } };
    if (finalFaction === 'good') {
      roleStats[rn].good.total++;
      if (d.winner === 'good') roleStats[rn].good.wins++;
    } else if (finalFaction === 'evil') {
      roleStats[rn].evil.total++;
      if (d.winner === 'evil') roleStats[rn].evil.wins++;
    }

    // Streak calculation
    var factionTag = finalFaction === 'good' ? 'G' : 'E';
    if (i === 0) {
      streak = 1;
      maxStreak = 1;
      streakType = isWin ? factionTag : 'L';
    } else if (finalFaction === getFinalFaction(sortedData[i-1].role, sortedData[i-1].flipped) && d.winner === sortedData[i-1].winner) {
      // same faction + same result
      // Actually this isn't right. Let me recalculate streak differently.
    }
  }

  // Simpler streak calculation
  streak = 0; maxStreak = 0; streakType = '';
  var prevSW = null;
  for (var s = 0; s < sortedData.length; s++) {
    var sd = sortedData[s];
    var sf = getFinalFaction(sd.role, sd.flipped);
    if (sd.role === '混子' && sd.huntFollow != null && sd.recIndex < history.length) {
      sf = resolveHuntFaction(history[sd.recIndex], sd.huntFollow);
    }
    var sw = sd.winner === sf;
    if (s === 0) {
      streak = 1;
      maxStreak = 1;
      streakType = sw ? 'W' : 'L';
    } else {
      if (sw === prevSW) {
        streak++;
      } else {
        streak = 1;
      }
      if (streak > maxStreak) maxStreak = streak;
    }
    prevSW = sw;
  }

  // Recent: 7/15/30 days
  var now = new Date();
  var d7 = new Date(now); d7.setDate(d7.getDate() - 7);
  var d15 = new Date(now); d15.setDate(d15.getDate() - 15);
  var d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  var recent = { d7: { total: 0, wins: 0 }, d15: { total: 0, wins: 0 }, d30: { total: 0, wins: 0 } };
  for (var ri = 0; ri < data.length; ri++) {
    var rd = data[ri];
    var rec = history[rd.recIndex];
    var gameDate = new Date(rec.date);
    var rf = getFinalFaction(rd.role, rd.flipped);
    if (rd.role === '混子' && rd.huntFollow != null && rd.recIndex < history.length) {
      rf = resolveHuntFaction(history[rd.recIndex], rd.huntFollow);
    }
    var rw = rd.winner === rf;
    var buckets = [];
    if (gameDate >= d7) buckets.push('d7');
    if (gameDate >= d15) buckets.push('d15');
    if (gameDate >= d30) buckets.push('d30');
    for (var b = 0; b < buckets.length; b++) {
      recent[buckets[b]].total++;
      if (rw) recent[buckets[b]].wins++;
    }
  }

  var total = gamesGood + gamesEvil;
  var totalRate = total > 0 ? Math.round(totalWins / total * 100) : 0;
  var goodRate = gamesGood > 0 ? Math.round(winsGood / gamesGood * 100) : 0;
  var evilRate = gamesEvil > 0 ? Math.round(winsEvil / gamesEvil * 100) : 0;

  var streakLabel = streakType === 'W' ? '连胜' : (streakType === 'L' ? '连败' : '');
  var streakColor = streakType === 'W' ? 'var(--green-bright)' : 'var(--red-bright)';

  var initial = name.charAt(0);

  // 掩护梅林次数（被刺次数）：统计该玩家为好人且非梅林时被刺客选中的次数
  var shieldCount = 0;
  for (var si = 0; si < data.length; si++) {
    var sd = data[si];
    var rec = history[sd.recIndex];
    if (!rec || rec.assassinTarget == null) continue;
    var srole = sd.role;
    var sflipped = sd.flipped || false;
    var sfaction = getFinalFaction(srole, sflipped);
    if (srole === '混子' && sd.huntFollow != null && sd.recIndex < history.length) {
      sfaction = resolveHuntFaction(history[sd.recIndex], sd.huntFollow);
    }
    if (sfaction !== 'good' || srole === '梅林') continue;
    if (rec.winner !== 'good') continue;
    if (rec.identities) {
      for (var ji = 0; ji < rec.identities.length; ji++) {
        if (rec.identities[ji].name === name) {
          if (rec.assassinTarget === (rec.identities[ji].index + 1) + '号 ' + rec.identities[ji].name) {
            shieldCount++;
          }
          break;
        }
      }
    }
  }

  var ph = '<div style="text-align:center;margin-bottom:16px">';
  ph += '<div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#8b6914);line-height:60px;font-size:28px;font-weight:700;color:#fff;margin-bottom:8px">' + initial + '</div>';
  ph += '<div style="font-size:20px;font-weight:700">' + name + '</div>';
  ph += '</div>';

  // Total win rate card
  ph += '<div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:var(--radius-sm);padding:16px;text-align:center;margin-bottom:12px">';
  ph += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">总胜率</div>';
  ph += '<div style="font-size:42px;font-weight:700;color:var(--gold-light);line-height:1">' + totalRate + '%</div>';
  ph += '<div style="margin-top:8px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">';
  ph += '<div style="height:100%;width:' + totalRate + '%;background:var(--gold-light);border-radius:3px"></div></div>';
  ph += '</div>';

  // Stats grid 2x2
  ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
  ph += '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center"><div style="font-size:11px;color:var(--text-dim)">总场次</div><div style="font-size:24px;font-weight:700">' + total + '</div></div>';
  ph += '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center"><div style="font-size:11px;color:var(--text-dim)">当前' + streakLabel + '</div><div style="font-size:24px;font-weight:700;color:' + streakColor + '">' + streak + '</div><div style="font-size:10px;color:var(--text-dim)">最高' + maxStreak + '</div></div>';
  ph += '<div style="background:rgba(153,255,153,0.04);border:1px solid rgba(153,255,153,0.15);border-radius:var(--radius-sm);padding:12px;text-align:center"><div style="font-size:11px;color:var(--text-dim)">蓝方胜率</div><div style="font-size:24px;font-weight:700;color:var(--green-bright)">' + goodRate + '%</div><div style="font-size:10px;color:var(--text-dim)">' + gamesGood + '场</div></div>';
  ph += '<div style="background:rgba(255,153,153,0.04);border:1px solid rgba(255,153,153,0.15);border-radius:var(--radius-sm);padding:12px;text-align:center"><div style="font-size:11px;color:var(--text-dim)">红方胜率</div><div style="font-size:24px;font-weight:700;color:var(--red-bright)">' + evilRate + '%</div><div style="font-size:10px;color:var(--text-dim)">' + gamesEvil + '场</div></div>';
  ph += '</div>';

  // 掩护梅林次数（被刺次数）
  ph += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;margin-bottom:12px;background:rgba(255,102,102,0.06);border:1px solid rgba(255,102,102,0.2);border-radius:var(--radius-sm)">';
  ph += '<span style="font-size:14px;font-weight:600">掩护梅林次数（被刺次数）</span>';
  ph += '<span style="font-size:22px;font-weight:700;color:#ff6666">' + shieldCount + '次</span>';
  ph += '</div>';

  // Role performance tabs
  var goodRoles = [], evilRoles = [];
  for (var rn in roleStats) {
    var rs = roleStats[rn];
    var goodAll = rs.good.total + rs.good.wins; // actually total is correct
    if (rs.good.total > 0) goodRoles.push({ role: rn, total: rs.good.total, wins: rs.good.wins });
    if (rs.evil.total > 0) evilRoles.push({ role: rn, total: rs.evil.total, wins: rs.evil.wins });
  }
  goodRoles.sort(function(a, b) { return b.total - a.total; });
  evilRoles.sort(function(a, b) { return b.total - a.total; });

  var activeTab = state._profileRoleTab || 'good';
  ph += '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">角色表现</div>';
  ph += '<div style="display:flex;gap:4px;margin-bottom:8px">';
  ph += '<button class="btn small" style="' + (activeTab === 'good' ? 'background:var(--gold-light);color:#000' : '') + '" onclick="switchProfileTab(\'good\')">蓝方</button>';
  ph += '<button class="btn small" style="' + (activeTab === 'evil' ? 'background:var(--gold-light);color:#000' : '') + '" onclick="switchProfileTab(\'evil\')">红方</button>';
  ph += '</div>';

  var tabRoles = activeTab === 'good' ? goodRoles : evilRoles;
  if (tabRoles.length === 0) {
    ph += '<div style="text-align:center;color:var(--text-dim);padding:20px">暂无数据</div>';
  } else {
    for (var tr = 0; tr < tabRoles.length; tr++) {
      var t = tabRoles[tr];
      var tRate = Math.round(t.wins / t.total * 100);
      var tColor = tRate >= 60 ? 'var(--green-bright)' : tRate >= 40 ? 'var(--gold-light)' : 'var(--red-bright)';
      // v187：每个身份条目可单独点击，进入该身份的参赛记录列表
      ph += '<div class="profile-role-row" role="button" tabindex="0" data-role="' + escAttr(t.role) + '" data-faction="' + activeTab + '" onclick="profileOpenRoleGames(this)">';
      ph += '<span class="profile-role-name">' + t.role + ' <span style="font-size:11px;color:var(--text-dim)">' + t.wins + '胜 ' + (t.total - t.wins) + '负 / ' + t.total + '场</span></span>';
      ph += '<span style="display:flex;align-items:center;gap:6px"><span style="font-weight:700;color:' + tColor + '">' + tRate + '%</span><span class="profile-role-arrow">›</span></span>';
      ph += '</div>';
    }
  }
  ph += '</div>';

  // Game history list
  var sortedByRec = data.slice().sort(function(a, b) { return b.recIndex - a.recIndex; });
  ph += '<div style="margin-bottom:8px">';
  ph += '<div style="font-size:13px;font-weight:600;margin-bottom:6px;cursor:pointer" onclick="var el=document.getElementById(\'player-game-list\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">&#9660; 参赛记录 (' + total + '场)</div>';
  ph += '<div id="player-game-list" style="max-height:360px;overflow-y:auto;display:none">';
  for (var gi = 0; gi < sortedByRec.length; gi++) {
    var gd = sortedByRec[gi];
    var gf = getFinalFaction(gd.role, gd.flipped || false);
    if (gd.role === '混子' && gd.huntFollow != null && gd.recIndex < history.length) {
      gf = resolveHuntFaction(history[gd.recIndex], gd.huntFollow);
    }
    var gw = gd.winner === gf;
    var gRec = history[gd.recIndex];
    var gDate = gRec ? gRec.date : '--';
    var gPlayerCount = gRec ? gRec.playerCount : '?';
    var gWinner = gRec ? (gRec.winner === 'good' ? '好人方' : '反方') : '?';
    var gRoleColor = gf === 'evil' ? 'var(--red-bright)' : gf === 'good' ? 'var(--green-bright)' : 'var(--gold-light)';
    // v196：以唯一标识定位
    var _gKey = gd.recKey || recKeyOf(gRec) || String(gd.recIndex);
    ph += '<div class="history-compact-item hci-tap" role="button" tabindex="0" onclick="openHistoryModal(\'' + _gKey + '\')">';
    ph += '<div class="hci-header">';
    ph += '<span class="hci-date">' + gDate + '</span>';
    ph += '<span class="hci-players">' + gPlayerCount + '人</span>';
    ph += '<span style="font-size:12px;color:' + gRoleColor + ';font-weight:600;margin-left:6px">' + gd.role + '</span>';
    ph += '<div class="hci-right">';
    ph += '<span class="hci-result" style="color:' + (gRec && gRec.winner === 'good' ? 'var(--green-bright)' : 'var(--red-bright)') + '">' + gWinner + '</span>';
    ph += '<span style="font-size:11px;color:var(--text-dim);margin:0 6px">' + (gw ? '&#9989;' : '&#10060;') + '</span>';
    ph += '</div></div>' + missionChipsHTML(gRec) + '</div>';
  }
  ph += '</div></div>';

  var contentEl = document.getElementById('profile-content');
  if (contentEl) contentEl.innerHTML = ph;
}

function switchProfileTab(tab) {
  state._profileRoleTab = tab;
  renderPlayerProfile();
}

/* ==================== v189：历史对局「任务失败票数」统一表述 ==================== */
// 失败票数：有记录返回「×N」，缺失或 0（旧记录兜底值）返回「票数未记录」
function failTicketText(m) {
  if (!m) return '票数未记录';
  var n = m.failCount;
  if (n === null || n === undefined || n === '') return '票数未记录';
  n = parseInt(n, 10);
  if (isNaN(n) || n <= 0) return '票数未记录';
  return '×' + n;
}

// 单轮任务失败描述，例「失败 ×2」/「失败（票数未记录）」
function missionFailLabel(m) {
  var t = failTicketText(m);
  return (t === '票数未记录') ? '失败（票数未记录）' : '失败 ' + t;
}

/* ==================== v192：失败票归属者（谁打的失败） ==================== */
// 取出该轮已录入的失败票归属者（「N号 名字」字符串数组）；旧记录/未录入返回空数组
function failVotersArray(m) {
  if (!m || !m.failVoters || !m.failVoters.length) return [];
  var out = [];
  for (var i = 0; i < m.failVoters.length; i++) {
    var s = m.failVoters[i];
    if (s === null || s === undefined) continue;
    // 记录态存「N号 名字」字符串；对局态（state.missions）存玩家索引，统一转成「N号 名字」
    if (typeof s === 'number') s = playerLabel(s);
    s = String(s).trim();
    if (s) out.push(s);
  }
  return out;
}

// 展示文本：已录入「3号 鹭文、5号 阿弟」，未录入统一「—」
function failVotersText(m) {
  var arr = failVotersArray(m);
  return arr.length ? arr.join('、') : '—';
}

// v194：失败票名单内联 HTML（历史详情共用），未录入显示「—」
// v195：若该轮已存有队外玩家的旧数据，保留展示并标注「（非队内）」，不改动原数据
function failVotersInnerHTML(m) {
  var arr = failVotersArray(m);
  if (!arr.length) return '<span style="color:var(--text-dim)">—</span>';
  var teamLabels = (m && m.team && m.team.length) ? m.team : null;
  return arr.map(function(fv) {
    var nm = /^(\d+)\s*号/.exec(String(fv));
    var outside = false;
    if (teamLabels && nm) {
      var num = parseInt(nm[1], 10);
      for (var ti = 0; ti < teamLabels.length; ti++) {
        var tl = String(teamLabels[ti] == null ? '' : teamLabels[ti]).trim();
        var tn = /^(\d+)\s*号/.exec(tl);
        if ((tn && parseInt(tn[1], 10) === num) || tl === String(fv)) { outside = false; break; }
        outside = true;
      }
    }
    var tag = (teamLabels && nm && outside)
      ? '<span style="color:var(--orange);font-size:11px">（非队内）</span>' : '';
    return '<span style="color:var(--red-bright);font-weight:600">' + escAttr(fv) + '</span>' + tag;
  }).join('、');
}

// 对局列表逐轮任务筹码条（按轮次顺序，成功轮只写「成功」，不标失败数）
function missionChipsHTML(rec) {
  if (!rec || !rec.missions || !rec.missions.length) return '';
  var parts = [];
  for (var i = 0; i < rec.missions.length; i++) {
    var m = rec.missions[i];
    if (!m || !m.result) continue;
    var cls, txt;
    if (m.result === 'success') {
      cls = 'ok';
      txt = '成功';
    } else {
      cls = (failTicketText(m) === '票数未记录') ? 'na' : 'fail';
      txt = missionFailLabel(m);
    }
    parts.push('<span class="ms-chip ' + cls + '">第' + (i + 1) + '轮 · ' + txt + '</span>');
  }
  if (!parts.length) return '';
  return '<div class="ms-chips">' + parts.join('') + '</div>';
}

/* ==================== v187：参赛记录钻取（统计概览格 / 今日胜率卡 / 身份条目） ==================== */
// 单条参赛记录行：点击进入该局详细参赛记录
function recItemHTML(idx, rec, badgeText, badgeCls, extraMeta) {
  var dateStr = rec ? ((rec.date || '--') + (rec.startTime ? ' ' + rec.startTime.slice(11, 16) : '')) : '--';
  var meta = rec ? ((rec.playerCount || '?') + '人') : '该局数据缺失';
  if (rec && rec.winner) meta += ' · ' + (rec.winner === 'good' ? '好人方胜' : '反方胜');
  if (extraMeta) meta += ' · ' + extraMeta;
  // v196：以唯一标识定位
  var _rKey = recKeyOf(rec) || String(idx | 0);
  var h = '<div class="rec-item" role="button" tabindex="0" onclick="openHistoryModal(\'' + _rKey + '\')">';
  h += '<div class="rec-item-main"><span class="rec-item-date">' + escAttr(dateStr) + '</span>';
  h += '<span class="rec-item-meta">' + escAttr(meta) + '</span></div>';
  h += '<span class="rec-item-badge ' + (badgeCls || '') + '">' + escAttr(badgeText || '') + '</span>';
  h += '<span class="rec-item-arrow">&#8250;</span>';
  h += missionChipsHTML(rec);
  h += '</div>';
  return h;
}

function openRecordListModal(cfg) {
  cfg = cfg || {};
  var rows = cfg.rows || [];
  var h = '<h2 style="margin-bottom:6px">' + escAttr(cfg.title || '参赛记录') + '</h2>';
  if (cfg.sub) h += '<div class="rec-list-sub">' + escAttr(cfg.sub) + '</div>';
  if (cfg.summary) h += '<div class="rec-list-summary">' + cfg.summary + '</div>';
  if (!rows.length) {
    h += '<div class="rec-list-empty">' + escAttr(cfg.empty || '暂无参赛记录') + '</div>';
  } else {
    h += '<div class="rec-list">' + rows.join('') + '</div>';
  }
  h += '<div class="modal-actions"><button class="btn primary" onclick="closeModal()">关闭</button></div>';
  showModal(h);
}

// 统计页「战绩概览」每个格子：0=总对局 1=好人胜场 2=反方胜场 3=梅林被刺
function openStatCellRecords(n) {
  n = parseInt(n, 10) || 0;
  var history = loadNormalizedHistory() || [];
  var merlinSet = {};
  var killed = state._merlinKilledIdxs || [];
  for (var mk = 0; mk < killed.length; mk++) merlinSet[killed[mk]] = true;   // v196：元素为记录唯一标识

  var titles = ['全部对局参赛记录', '好人方胜 · 参赛记录', '反方胜 · 参赛记录', '梅林被刺 · 参赛记录'];
  var empties = ['暂无对局记录', '暂无好人方胜的对局', '暂无反方胜的对局', '暂无梅林被刺的对局'];
  var rows = [];
  var goodCnt = 0, evilCnt = 0;
  for (var i = history.length - 1; i >= 0; i--) {
    var rec = history[i];
    if (!rec) continue;
    var keep = true;
    if (n === 1) keep = rec.winner === 'good';
    else if (n === 2) keep = rec.winner === 'evil';
    else if (n === 3) keep = !!merlinSet[recKeyOf(rec)] || !!merlinSet[i];
    if (!keep) continue;
    if (rec.winner === 'good') goodCnt++;
    else if (rec.winner === 'evil') evilCnt++;
    rows.push(recItemHTML(i, rec, rec.winner === 'good' ? '好人胜' : (rec.winner === 'evil' ? '反方胜' : '--'),
      rec.winner === 'good' ? 'good' : 'evil', n === 3 ? '梅林被刺' : ''));
  }
  openRecordListModal({
    title: titles[n] || '参赛记录',
    sub: '点击任意一局查看该局详细参赛记录',
    summary: '共 ' + rows.length + ' 局' + (rows.length ? '（好人胜 ' + goodCnt + ' / 反方胜 ' + evilCnt + '）' : ''),
    empty: empties[n] || '暂无参赛记录',
    rows: rows
  });
}

// 统计页「今日胜率」卡片：查看该玩家今日参赛记录
function openTodayPlayerRecords(rank) {
  var lb = state._todayLb || [];
  var p = lb[parseInt(rank, 10)];
  if (!p) {
    openRecordListModal({ title: '今日参赛记录', empty: '今日暂无参赛记录', rows: [] });
    return;
  }
  var history = loadNormalizedHistory() || [];
  var todayDates = state._todayDates || {};
  var rows = [];
  var wins = 0, total = 0;
  for (var i = history.length - 1; i >= 0; i--) {
    var rec = history[i];
    if (!rec || !todayDates[rec.date]) continue;
    var hit = false, isWin = false, roleText = '';
    for (var j = 0; j < rec.identities.length; j++) {
      var id = rec.identities[j];
      if (id.name !== p.name) continue;
      hit = true;
      var ff = getFinalFaction(id.role, rec.lancelotFlips && rec.lancelotFlips[id.index != null ? id.index : j]);
      if (id.role === '混子' && rec.huntFollow != null) ff = resolveHuntFaction(rec, rec.huntFollow);
      isWin = rec.winner === ff;
      roleText = id.role || '';
      break;
    }
    if (!hit) continue;
    total++;
    if (isWin) wins++;
    rows.push(recItemHTML(i, rec, isWin ? '胜' : '负', isWin ? 'good' : 'evil', roleText));
  }
  var rate = total > 0 ? Math.round(wins / total * 100) : 0;
  openRecordListModal({
    title: p.name + ' · 今日参赛记录',
    sub: '点击任意一局查看该局详细参赛记录',
    summary: '今日 ' + total + ' 场 · ' + wins + ' 胜 ' + (total - wins) + ' 负 · 胜率 ' + rate + '%',
    empty: '今日暂无参赛记录',
    rows: rows
  });
}

// 个人主页「各身份胜负情况」条目：进入该身份参赛记录列表
function profileOpenRoleGames(el) {
  if (!el) return;
  var role = el.getAttribute('data-role') || '';
  var faction = el.getAttribute('data-faction') || '';
  var sel = document.getElementById('profile-player-sel');
  var name = sel ? sel.value : '';
  var contentEl = document.getElementById('profile-content');
  if (!contentEl) return;
  var playerSet = state._playerSetCache || {};
  var data = playerSet[name] || [];
  var history = loadNormalizedHistory() || [];
  var rows = [];
  var wins = 0, total = 0;
  for (var i = data.length - 1; i >= 0; i--) {
    var d = data[i];
    if (!d || d.role !== role) continue;
    var ff = getFinalFaction(d.role, d.flipped || false);
    if (d.role === '混子' && d.huntFollow != null && d.recIndex >= 0 && d.recIndex < history.length) {
      ff = resolveHuntFaction(history[d.recIndex], d.huntFollow);
    }
    if (faction && ff !== faction) continue;
    total++;
    var isWin = d.winner === ff;
    if (isWin) wins++;
    var rec = (d.recIndex >= 0 && d.recIndex < history.length) ? history[d.recIndex] : null;
    rows.push(recItemHTML(d.recIndex, rec, isWin ? '胜' : '负', isWin ? 'good' : 'evil', ff === 'good' ? '蓝方' : (ff === 'evil' ? '红方' : '中立')));
  }
  var rate = total > 0 ? Math.round(wins / total * 100) : 0;
  var factionLabel = faction === 'evil' ? '红方' : (faction === 'good' ? '蓝方' : '中立');
  var out = '';
  out += '<div class="rec-head">';
  out += '<button class="btn small rec-back-btn" onclick="profileBackFromRoleGames()">&#8592; 返回个人主页</button>';
  out += '<span class="rec-head-title">' + escAttr(role) + ' · ' + factionLabel + '</span>';
  out += '</div>';
  out += '<div class="rec-list-summary">' + escAttr(name) + ' 使用「' + escAttr(role) + '」共 ' + total + ' 场：' + wins + ' 胜 ' + (total - wins) + ' 负，胜率 ' + rate + '%</div>';
  if (!rows.length) {
    out += '<div class="rec-list-empty">该身份暂无参赛记录</div>';
  } else {
    out += '<div class="rec-list">' + rows.join('') + '</div>';
  }
  contentEl.innerHTML = out;
}

// 从身份参赛记录返回个人主页原视图（保留选中玩家与身份 Tab）
function profileBackFromRoleGames() {
  renderPlayerProfile();
}

function goToPlayerHistory(name) {
  var fpSel = document.getElementById('filter-player');
  if (fpSel) {
    fpSel.value = name;
    renderStats();
  }
}

/* ==================== GAME DETAIL & EDIT ==================== */
function showGameDetail(ref) {
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { toast('\u672a\u627e\u5230\u8be5\u6761\u8bb0\u5f55\uff08\u53ef\u80fd\u5df2\u88ab\u5220\u9664\uff09', 'warn'); return; }
  var rec = normalizeRecord(history[idx]);
  if (!rec) return;

  var h = '<h2>对局详情</h2>';
  h += '<p><strong>日期：</strong>' + rec.date + ' | <strong>人数：</strong>' + rec.playerCount + '人 | <strong>胜方：</strong>' + (rec.winner === 'good' ? '好人方' : '反方') + '</p>';
  if (rec.startTime) {
    h += '<p><strong>开始时间：</strong>' + rec.startTime + ' | <strong>结束时间：</strong>' + (rec.endTime || '--') + '</p>';
  }
  if (rec.assassinFromMission && rec.assassinTarget) {
    // 游戏内拍刀 - 仅在顶部简要显示
    h += '<p><strong>反方拍刀：</strong>';
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += '第' + (rec.assassinAfterRound + 1) + '轮任务后 | ';
    }
    h += '<strong>目标：</strong>' + rec.assassinTarget + ' | <strong>结果：</strong>' + (rec.assassinSuccess ? '<span style="color:#ff9999">命中梅林，反方胜</span>' : '<span style="color:#99ff99">未命中，好人方胜</span>') + '</p>';
  }
  if (rec.activeRoles) {
    h += '<p><strong>使用角色：</strong>' + rec.activeRoles.join('、') + '</p>';
  }

  h += '<h3 style="margin-top:10px">身份分配</h3>';
  // Sort by faction (good first, then evil), then by index within each faction
  var sortedIds = rec.identities.slice().map(function(id) {
    var final = getFinalFaction(id.role, rec.lancelotFlips && rec.lancelotFlips[id.index]);
    // 混子：根据跟随目标解析阵营
    if (id.role === '混子' && rec.huntFollow != null) {
      final = resolveHuntFaction(rec, rec.huntFollow);
    }
    return { id: id, faction: final };
  });
  sortedIds.sort(function(a, b) {
    if (a.faction === b.faction) return a.id.index - b.id.index;
    return a.faction === 'good' ? -1 : 1;
  });
  for (var i = 0; i < sortedIds.length; i++) {
    var id = sortedIds[i].id;
    var final = sortedIds[i].faction;
    var evilStyle = '';
    var factionBadge = '';
    if (final === 'evil') {
      evilStyle = ' style="background:rgba(255,80,80,0.08);padding:2px 8px;border-radius:4px;margin-bottom:2px"';
      factionBadge = ' <span style="display:inline-block;padding:0 8px;background:rgba(255,80,80,0.15);border:1px solid rgba(255,80,80,0.4);border-radius:10px;color:#ff6b6b;font-size:11px;font-weight:700">反方</span>';
    } else if (final === 'neutral') {
      factionBadge = ' <span style="display:inline-block;padding:0 8px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:10px;color:#c9a84c;font-size:11px;font-weight:700">中立</span>';
    }
    var flipNote = '';
    if (rec.lancelotFlips && rec.lancelotFlips[id.index]) {
      flipNote = ' <span style="color:var(--orange);font-size:11px">[反转→' + (final === 'good' ? '好人方' : '反方') + ']</span>';
    }
    // 混子跟随信息
    var huntNote = '';
    if (id.role === '混子' && rec.huntFollow != null && rec.huntFollow >= 0 && rec.huntFollow < rec.playerCount) {
      var followedName = rec.identities.find(function(x) { return x.index === rec.huntFollow; });
      huntNote = ' <span style="color:var(--gold-light);font-size:11px">→ 混' + (rec.huntFollow + 1) + '号' + (followedName ? followedName.name : '') + '</span>';
    }
    h += '<div' + evilStyle + '>' + (id.index + 1) + '号 ' + id.name + '：' + id.role + factionBadge + flipNote + huntNote + '</div>';
  }

  h += '<h3 style="margin-top:10px">任务记录</h3>';
  // Build index-to-name mapping and faction lookup
  var nameByIndex = {};
  var nameToFaction = {};
  for (var ii = 0; ii < rec.identities.length; ii++) {
    var idt = rec.identities[ii];
    nameByIndex[idt.index] = idt.name;
    nameByIndex[(idt.index + 1) + '号 ' + idt.name] = idt.name;
    var faction = getFinalFaction(idt.role, rec.lancelotFlips && rec.lancelotFlips[idt.index]);
    if (idt.role === '混子' && rec.huntFollow != null) {
      faction = resolveHuntFaction(rec, rec.huntFollow);
    }
    nameToFaction[idt.name] = faction;
    nameToFaction[(idt.index + 1) + '号 ' + idt.name] = faction;
    nameToFaction['玩家' + (idt.index + 1)] = faction;
  }
  var evilSpan = function(n) {
    if (nameToFaction[n] === 'evil') return '<span style="color:#66aaff;font-weight:700">' + n + '</span>';
    return n;
  };
  var namesToHtml = function(arr) { return arr.map(evilSpan).join(' / '); };
  var isGameAssassin = rec.assassinFromMission === true && rec.assassinTarget;
  var isEndGameAssassin = !rec.assassinFromMission && rec.assassinTarget;
  var assassinCutoff = isGameAssassin ? rec.assassinAfterRound : null;
  for (var i = 0; i < rec.missions.length; i++) {
    // 反方拍刀：到达拍刀轮次后截断
    if (isGameAssassin && assassinCutoff !== null && i > assassinCutoff) break;
    // 反方拍刀：在拍刀轮次显示拍刀事件
    if (isGameAssassin && i === assassinCutoff) {
      h += '<div style="margin-bottom:4px;padding:8px 12px;background:rgba(255,153,153,0.08);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm)"><span style="font-weight:700">第' + (i + 1) + '轮：</span><span style="color:#ff9999;font-weight:700">反方拍刀</span> — 游戏在此轮终止</div>';
      continue;
    }
    var m = rec.missions[i];
      // 游戏已结束，本轮未实际执行（result 为 null 且无组队尝试）→ 静默跳过
      if (!m.result && (m.launchAttempts ? m.launchAttempts.length === 0 : true)) {
        continue;
      }
      // Show launch attempts (including failures) before the final mission result
      if (m.launchAttempts && m.launchAttempts.length > 0) {
        for (var la = 0; la < m.launchAttempts.length; la++) {
          var att = m.launchAttempts[la];
          var approveCount = 0, rejectCount = 0;
          for (var vk in att.votes) {
            if (att.votes[vk] === 'approve') approveCount++;
            else rejectCount++;
          }
          var isLastAttempt = (la === m.launchAttempts.length - 1);
          var isSucceeded = isLastAttempt && m.result === 'success';
          var isFailed = isLastAttempt && m.result === 'fail';
          var label = isSucceeded ? '组队成功，任务执行成功' : (isFailed ? '组队成功，任务执行' + missionFailLabel(m) : '组队未通过');
          var bg = isSucceeded ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
          var borderColor = isSucceeded ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
          var labelColor = isSucceeded ? 'var(--green-bright)' : 'var(--red-bright)';
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg + ';border:1px solid ' + borderColor + ';border-radius:var(--radius-sm);font-size:14px">';
          h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
          h += '<span style="font-weight:700;color:' + labelColor + '">' + label + '</span> ';
          h += '| 队长 ' + evilSpan(nameByIndex[att.leader] || att.leader) + ' | 队伍 ' + att.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('、');
          // Per-player vote details
          var approveNames = [], rejectNames = [];
          for (var vk in att.votes) {
            var vidx = resolvePlayerIdx(vk, rec.identities);
            var vn = null;
            if (vidx >= 0) vn = nameByIndex[rec.identities[vidx].index] || nameByIndex[vidx];
            if (!vn) vn = (vidx >= 0) ? ('玩家' + (vidx + 1)) : ('' + vk);
            if (att.votes[vk] === 'approve') approveNames.push(vn);
            else rejectNames.push(vn);
          }
          if (approveNames.length || rejectNames.length) {
            var totalVotes = approveNames.length + rejectNames.length;
            var allApprove = (rejectNames.length === 0);
            h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:13px">';
            if (allApprove) {
              h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + totalVotes + '人)</span></div>';
            } else {
              if (approveNames.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + approveNames.length + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(approveNames) + '</span></div>';
              if (rejectNames.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + rejectNames.length + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(rejectNames) + '</span></div>';
            }
            h += '</div>';
          }
          h += '</div>';
        }
      } else {
        // Legacy data: no launchAttempts, render from mission data with same style
        var lf = m.launchFailures || 0;
        var isSuccess = m.result === 'success';
        // Precompute legacy vote details (shared by failures and result)
        var lgc = 0, lbc = 0;
        var lgn = [], lbn = [];
        if (m.votes) {
          for (var lvk in m.votes) {
            if (m.votes[lvk] === 'approve') lgc++; else lbc++;
          }
          for (var lvk in m.votes) {
            var lidx = resolvePlayerIdx(lvk, rec.identities);
            var ln = null;
            if (lidx >= 0) ln = nameByIndex[rec.identities[lidx].index] || nameByIndex[lidx];
            if (!ln) ln = (lidx >= 0) ? ('玩家' + (lidx + 1)) : ('' + lvk);
            if (m.votes[lvk] === 'approve') lgn.push(ln); else lbn.push(ln);
          }
        }
        for (var f = 0; f < lf; f++) {
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm);font-size:14px">';
          h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
          h += '<span style="font-weight:700;color:var(--red-bright)">组队未通过</span>';
          h += ' | 队长 ' + evilSpan(nameByIndex[m.leader] || m.leader) + ' | 队伍 ' + m.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('、');
          if (m.votes && (lgc + lbc > 0)) {
            var ltotal = lgc + lbc;
            var lall = (lbc === 0);
            h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:13px">';
            if (lall) {
              h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + ltotal + '人)</span></div>';
            } else {
              if (lgn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + lgc + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lgn) + '</span></div>';
              if (lbn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + lbc + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lbn) + '</span></div>';
            }
            h += '</div>';
          }
          h += '</div>';
        }
        var bg2 = isSuccess ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
        var border2 = isSuccess ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
        var color2 = isSuccess ? 'var(--green-bright)' : 'var(--red-bright)';
        h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg2 + ';border:1px solid ' + border2 + ';border-radius:var(--radius-sm);font-size:14px">';
        h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
        h += '<span style="font-weight:700;color:' + color2 + '">' + (isSuccess ? '组队成功，任务执行成功' : '组队成功，任务执行' + missionFailLabel(m)) + '</span>';
        h += ' | 队长 ' + evilSpan(nameByIndex[m.leader] || m.leader) + ' | 队伍 ' + m.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('、');
        // Vote details for legacy data
        if (m.votes && (lgc + lbc > 0)) {
          h += ' | 投票 ' + lgc + ':' + lbc;
          var ltotal = lgc + lbc;
          var lall = (lbc === 0);
          h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:13px">';
          if (lall) {
            h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + ltotal + '人)</span></div>';
          } else {
            if (lgn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + lgc + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lgn) + '</span></div>';
            if (lbn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + lbc + '人)</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lbn) + '</span></div>';
          }
          h += '</div>';
        }
        h += '</div>';
      }
  }
  // 反方拍刀后的剩余轮次提示
  if (isGameAssassin && assassinCutoff !== null && assassinCutoff + 1 < rec.missions.length) {
    h += '<div style="color:var(--text-dim);font-size:14px;margin-top:4px">（后续' + (rec.missions.length - assassinCutoff - 1) + '轮未进行，游戏在反方拍刀后终止）</div>';
  }

  // 正常流程结束后的刺杀环节（独立于轮次之外）
  if (isEndGameAssassin) {
    h += '<h3 style="margin-top:10px">刺杀环节</h3>';
    h += '<div style="padding:10px 14px;background:rgba(255,153,153,0.08);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm)">';
    h += '<strong>目标：</strong>' + rec.assassinTarget + ' | ';
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += '<strong>时机：</strong>第' + (rec.assassinAfterRound + 1) + '轮任务后 | ';
    }
    h += '<strong>结果：</strong>' + (rec.assassinSuccess ? '<span style="color:#ff9999">命中梅林，反方胜</span>' : '<span style="color:#99ff99">未命中，好人方胜</span>');
    h += '</div>';
  }

  if (rec.ladyCheckHistory && rec.ladyCheckHistory.length > 0) {
    h += '<h3 style="margin-top:10px">湖中女神验人</h3>';
    for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
      var lh = rec.ladyCheckHistory[li];
      h += '<div style="margin-bottom:3px;font-size:13px">';
      h += '<strong>第' + (li + 1) + '任女神：</strong>' + lh.holderName + ' → 验 ' + lh.targetName;
      var ladyResultLabel = lh.result === 'good' ? '好人' : (lh.result === 'evil' ? '反方' : (lh.result === 'skip' ? '不报' : (lh.result || '?')));
      var ladyResultColor = lh.result === 'good' ? 'var(--blue-light)' : (lh.result === 'evil' ? 'var(--red-bright)' : 'var(--text-dim)');
      h += ' <span style="font-weight:700;color:' + ladyResultColor + '">女神说' + ladyResultLabel + '</span>';
      h += ' <span style="font-size:11px;color:var(--text-dim)">（女神说的不一定准）</span>';
      h += '</div>';
    }
  }


  if (rec.excaliburHistory && rec.excaliburHistory.length > 0) {
    h += '<h3 style="margin-top:10px">王者之剑</h3>';
    for (var ei = 0; ei < rec.excaliburHistory.length; ei++) {
      var ex = rec.excaliburHistory[ei];
      h += '<div style="margin-bottom:5px;padding:6px 10px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:var(--radius-sm);font-size:13px">';
      h += '<strong>第' + (ex.round + 1) + '轮：</strong>';
      h += '持剑者 ' + (ex.holderName || (ex.holder !== undefined ? (ex.holder + 1) + '号' : '未指定'));
      if (ex.used === false) {
        h += '，<span style="color:var(--text-dim)">未使用</span>';
      } else if (ex.used === true) {
        h += '，对 ' + (ex.targetName || (ex.target !== undefined && ex.target !== null ? (ex.target + 1) + '号' : '未记录目标')) + ' 使用';
        h += '，反馈：<span style="font-weight:700;color:var(--gold-light)">' + excaliburDirectionLabel(ex.claimedDirection) + '</span>';
        if (ex.feedbackRound !== null && ex.feedbackRound !== undefined) h += '（第' + (ex.feedbackRound + 1) + '轮发言记录）';
      } else {
        h += '，<span style="color:var(--orange)">待确认是否使用</span>';
      }
      if (ex.note) h += '<div style="font-size:12px;color:var(--text-dim);margin-top:3px">备注：' + ex.note + '</div>';
      h += '</div>';
    }
  }

  if (rec.roundTendencies && rec.roundTendencies.length > 0) {
    h += '<h3 style="margin-top:10px">倾向值变化</h3>';
    h += '<table style="font-size:11px;width:100%;border-collapse:collapse"><tr style="border-bottom:1px solid var(--border)"><th style="padding:2px 4px;text-align:left;white-space:nowrap">玩家</th>';
    for (var r = 0; r < rec.roundTendencies.length; r++) {
      var entry = rec.roundTendencies[r];
      var label;
      if (entry && typeof entry.v === 'object') {
        // 新格式：{ v: snap, r: round, a: attempt }
        var roundNum = (entry.r || 0) + 1;
        if (entry.a > 0) {
          label = 'R' + roundNum + '(' + entry.a + ')';
        } else {
          label = 'R' + roundNum;
        }
      } else {
        // 旧格式兼容
        label = 'R' + (r + 1);
      }
      h += '<th style="padding:2px 4px;text-align:center;white-space:nowrap">' + label + '</th>';
    }
    h += '</tr>';
    for (var i = 0; i < rec.identities.length; i++) {
      var id = rec.identities[i];
      h += '<tr style="border-bottom:1px solid var(--border)"><td style="padding:2px 4px;font-weight:600;white-space:nowrap">' + (id.index + 1) + '号 ' + id.name + '</td>';
      for (var r = 0; r < rec.roundTendencies.length; r++) {
        var entry = rec.roundTendencies[r];
        var val;
        if (entry && typeof entry.v === 'object') {
          val = entry.v[id.index];
        } else {
          val = entry[id.index];
        }
        if (val !== undefined) {
          var color = val >= 50 ? 'var(--green-bright)' : 'var(--red-bright)';
          h += '<td style="padding:2px 4px;text-align:center;color:' + color + ';font-weight:700;white-space:nowrap">' + val + '</td>';
        } else {
          h += '<td style="padding:2px 4px;text-align:center;color:var(--text-dim)">-</td>';
        }
      }
      h += '</tr>';
    }
    h += '</table>';
  }

  h += '<div class="modal-actions">';
  // v196：编辑入口改为唯一标识定位
  var _dKey = recKeyOf(rec) || String(idx);
  h += '<button class="btn" onclick="showEditGameRecord(\'' + _dKey + '\')">编辑</button>';
  h += '<button class="btn" onclick="closeModal()">关闭</button>';
  h += '</div>';
  showModal(h);
}

function showEditGameRecord(ref) {
  // v196：统一走全字段历史编辑器（同样以唯一标识定位）
  closeModal();
  openHistoryEdit(ref);
}

function editToggleWinner(w) {
  state._editRec.winner = w;
  var gBtn = document.getElementById('edit-winner-good');
  var eBtn = document.getElementById('edit-winner-evil');
  if (gBtn) gBtn.className = 'winner-btn good' + (w === 'good' ? ' selected' : '');
  if (eBtn) eBtn.className = 'winner-btn evil' + (w === 'evil' ? ' selected' : '');
}

function editToggleAssassin(val) {
  state._editRec.assassinSuccess = val;
  var sBtn = document.getElementById('edit-assassin-success');
  var fBtn = document.getElementById('edit-assassin-fail');
  if (sBtn) sBtn.className = 'btn small' + (val ? ' selected' : '');
  if (fBtn) fBtn.className = 'btn small' + (!val ? ' selected' : '');
}

function saveEditGameRecord(idx) {
  var history = loadHistory();
  var rec = state._editRec;
  if (!rec) return;

  // Collect identities from form
  for (var i = 0; i < rec.identities.length; i++) {
    var sel = document.getElementById('edit-role-' + i);
    var nameSel = document.getElementById('edit-name-' + i);
    if (sel) rec.identities[i].role = sel.value;
    if (nameSel) rec.identities[i].name = nameSel.value;
  }

  // Apply global Lancelot flip
  rec.lancelotFlips = {};
  for (var i = 0; i < rec.identities.length; i++) {
    var role = rec.identities[i].role;
    if (role === '兰斯洛特(蓝)' || role === '兰斯洛特(红)') {
      rec.lancelotFlips[rec.identities[i].index] = rec._lancelotFlipped || false;
    }
  }
  delete rec._lancelotFlipped;

  // If winner was changed, recalculate assassinSuccess
  if (rec.assassinTarget) {
    if (rec.winner === 'evil') rec.assassinSuccess = true;
    else rec.assassinSuccess = false;
  }

  history[idx] = toRecordV2(rec);
  saveHistory(history);
  closeModal();
  toast('对局记录已更新');
  renderStats();
}

/* ===== 历史对局改玩家名 ===== */
function startRenameHistoryPlayer(origIdx, playerIdx) {
  var selector = '.hci-name-edit[onclick="event.stopPropagation();startRenameHistoryPlayer(' + origIdx + ',' + playerIdx + ')"]';
  var editBtn = document.querySelector(selector);
  if (!editBtn) {
    // 备选：用 role-item 内找 name span
    var items = document.querySelectorAll('.hci-role-item');
    for (var k = 0; k < items.length; k++) {
      var btn = items[k].querySelector('.hci-name-edit');
      if (btn && btn.getAttribute('onclick') && btn.getAttribute('onclick').indexOf('startRenameHistoryPlayer(' + origIdx + ',' + playerIdx + ')') !== -1) {
        editBtn = btn;
        break;
      }
    }
  }
  if (!editBtn) return;
  var roleItem = editBtn.parentElement;
  var nameSpan = roleItem.querySelector('.hci-name');
  if (!nameSpan) return;
  var oldName = nameSpan.textContent;
  var input = document.createElement('input');
  input.type = 'text';
  input.value = oldName;
  input.className = 'hci-name-input';
  input.onblur = function() { finishRenameHistoryPlayer(origIdx, playerIdx, input.value, oldName); };
  input.onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); finishRenameHistoryPlayer(origIdx, playerIdx, input.value, oldName); }
    if (e.key === 'Escape') { renderStats(); }
  };
  nameSpan.replaceWith(input);
  editBtn.style.display = 'none';
  input.focus();
  input.select();
}

function finishRenameHistoryPlayer(origIdx, playerIdx, newName, oldName) {
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return renderStats();
  var trimmed = newName.trim();
  var history = loadHistory();
  var rec = history[origIdx];
  if (rec && rec.ids && rec.ids[playerIdx]) {
    var old = rec.ids[playerIdx].n;
    rec.ids[playerIdx].n = trimmed;
    // 同步更新记录中所有引用旧名的字段
    _updateNameRefs(rec, old, trimmed);
    saveHistory(history);
    // 新名字加入名称池
    if (namePool.indexOf(trimmed) === -1) { namePool.push(trimmed); saveNamePool(); }
    toast('「' + old + '」→「' + trimmed + '」已保存');
  }
  renderStats();
}

function _updateNameRefs(rec, oldName, newName) {
  if (!rec || oldName === newName) return;
  // excaliburHistory
  if (rec.ex) {
    for (var i = 0; i < rec.ex.length; i++) {
      var e = rec.ex[i];
      if (e.hn === oldName) e.hn = newName;
      if (e.tn === oldName) e.tn = newName;
      if (e.ldn === oldName) e.ldn = newName;
    }
  }
  // ladyCheckHistory
  if (rec.lch) {
    for (var i = 0; i < rec.lch.length; i++) {
      var l = rec.lch[i];
      if (l.hn === oldName) l.hn = newName;
      if (l.tn === oldName) l.tn = newName;
    }
  }
  // identityMarks
  if (rec.im) {
    for (var i = 0; i < rec.im.length; i++) {
      if (rec.im[i].tn === oldName) rec.im[i].tn = newName;
    }
  }
  // assassinTarget
  if (rec.at === oldName) rec.at = newName;
}

/* ==================== v196：删除历史记录需 4 位数密码 ==================== */
var HISTORY_DELETE_PASSWORD = '1234';

// 点击「删除」：先弹密码框，不再直接删除
function deleteGameRecord(ref) {
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { toast('\u672a\u627e\u5230\u8be5\u6761\u8bb0\u5f55\uff08\u53ef\u80fd\u5df2\u88ab\u5220\u9664\uff09', 'warn'); return; }
  var key = recKeyOf(history[idx]) || String(idx);
  var kEsc = escAttr(key);
  var h = '';
  h += '<h2>\u5220\u9664\u5bf9\u5c40\u8bb0\u5f55</h2>';
  h += '<p style="color:var(--text-dim);font-size:13px;margin:6px 0 8px">4 \u4f4d\u6570\u5bc6\u7801</p>';
  h += '<input type="password" id="del-pwd-input" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="\u8bf7\u8f93\u5165 4 \u4f4d\u6570\u5bc6\u7801" '
     + 'style="width:100%;box-sizing:border-box;padding:10px 12px;font-size:18px;letter-spacing:6px;text-align:center;background:rgba(255,255,255,0.06);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:var(--text)" '
     + 'onkeydown="if(event.key===\'Enter\'){submitHistoryDeletePassword(\'' + kEsc + '\')}">';
  h += '<div id="del-pwd-err" style="display:none;color:var(--red-bright);font-size:12px;margin-top:6px"></div>';
  h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">\u53d6\u6d88</button>';
  h += '<button class="btn primary" onclick="submitHistoryDeletePassword(\'' + kEsc + '\')">\u786e\u5b9a\u5220\u9664</button></div>';
  showModal(h);
  setTimeout(function() {
    var el = document.getElementById('del-pwd-input');
    if (el) { try { el.focus(); } catch(e0) {} }
  }, 60);
}

// 校验 4 位数密码后才真正删除；输错给提示可重试，取消则不动数据
function submitHistoryDeletePassword(key) {
  var inp = document.getElementById('del-pwd-input');
  var err = document.getElementById('del-pwd-err');
  var pwd = inp ? String(inp.value || '').replace(/\s/g, '') : '';
  if (pwd !== HISTORY_DELETE_PASSWORD) {
    if (err) { err.textContent = '\u5bc6\u7801\u9519\u8bef\uff0c\u8bf7\u91cd\u65b0\u8f93\u5165 4 \u4f4d\u6570\u5bc6\u7801'; err.style.display = 'block'; }
    if (inp) { inp.value = ''; try { inp.focus(); } catch(e1) {} }
    return;
  }
  var history = loadHistory();
  var idx = resolveHistoryIdx(key, history);
  if (idx < 0) { closeModal(); toast('\u672a\u627e\u5230\u8be5\u6761\u8bb0\u5f55\uff08\u53ef\u80fd\u5df2\u88ab\u5220\u9664\uff09', 'warn'); renderStats(); return; }
  try { closeHistoryModal(); } catch(e2) {}
  confirmDeleteGame(key);
}

function confirmDeleteGame(ref) {
  closeModal();
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { toast('\u672a\u627e\u5230\u8be5\u6761\u8bb0\u5f55\uff08\u53ef\u80fd\u5df2\u88ab\u5220\u9664\uff09', 'warn'); renderStats(); return; }
  var recRaw = history[idx];
  var recKey = recKeyOf(recRaw);
  var record = normalizeRecord(recRaw);
  var key = makeRecordKey(recRaw);
  var sb = getSupabase();

  // 先删除 Supabase，确保云端同步后再更新本地
  var _delDone = false;
  function doLocalDelete() {
    if (_delDone) return;   // v196：防止云端失败兜底与正常回调重复删除
    _delDone = true;
    var deletedKeys = loadDeletedKeys();
    if (key && deletedKeys.indexOf(key) === -1) {
      deletedKeys.push(key);
      saveDeletedKeys(deletedKeys);
    }
    // v196：按唯一标识在当前数组中删除，避免下标漂移删错记录
    var cur = loadHistory();
    var curIdx = resolveHistoryIdx(recKey, cur);
    if (curIdx < 0 && key) {
      for (var qi = 0; qi < cur.length; qi++) {
        if (makeRecordKey(cur[qi]) === key) { curIdx = qi; break; }
      }
    }
    if (curIdx >= 0) {
      cur.splice(curIdx, 1);
      saveHistory(cur);
    }
    toast('\u5df2\u5220\u9664\u8be5\u5bf9\u5c40\u8bb0\u5f55');
    renderStats();
  }

  // v196：云端不可达或请求悬挂时兜底，保证本地一定能删掉（离线也能删）
  setTimeout(function() { if (!_delDone) { try { doLocalDelete(); } catch(e3) {} } }, 2500);

  if (sb) {
    // 按 _supabaseId 删除；若无则按 game_data 匹配查找后删除
    function doDeleteById(sid) {
      sb.from('game_records').delete().eq('id', sid).then(function(res) {
        if (!res.error) {
          console.log('[Supabase] deleteGameRecord success by id:', sid);
          doLocalDelete();
        } else {
          console.warn('[Supabase] deleteGameRecord failed:', res.error);
          doLocalDelete();
        }
      }).catch(function(err) {
        console.warn('[Supabase] deleteGameRecord exception:', err);
        doLocalDelete();
      });
    }

    if (record && record._supabaseId) {
      doDeleteById(record._supabaseId);
    } else if (recRaw && recRaw._sid) {
      doDeleteById(recRaw._sid);
    } else {
      // 无 _supabaseId，按 date + playerCount + identities 匹配查找
      sb.from('game_records').select('id')
        .eq('game_data->>date', record ? record.date : '')
        .eq('game_data->>playerCount', record ? record.playerCount : 0)
        .then(function(res) {
          if (res.error || !res.data || !res.data.length) {
            doLocalDelete();
            return;
          }
          var recIds = (record && record.identities ? record.identities : []).map(function(id) { return (id.name||'')+'|'+(id.role||''); }).sort().join(',');
          var found = null;
          for (var i = 0; i < res.data.length; i++) {
            var gd = res.data[i].game_data;
            if (!gd || !gd.identities) continue;
            var cIds = gd.identities.map(function(id) { return (id.name||'')+'|'+(id.role||''); }).sort().join(',');
            if (cIds === recIds) { found = res.data[i].id; break; }
          }
          if (found) doDeleteById(found); else doLocalDelete();
        });
    }
  } else {
    console.warn('[Supabase] deleteGameRecord: no connection');
    doLocalDelete();
  }
}

/* ==================== MODAL ==================== */
function showModal(html, onClose) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'dynamic-modal-overlay';
  overlay.setAttribute('style', 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center');
  overlay.innerHTML = '<div class="modal" id="temp-modal">' + html + '</div>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      if (onClose) onClose();
      else overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}
function closeModal() {
  var overlay = document.getElementById('dynamic-modal-overlay');
  if (overlay) overlay.remove();
}

function confirmClearStats() {
  closeModal();
  localStorage.removeItem('avalon_history_v2');
  localStorage.removeItem('avalon_last_sync');
  invalidateHistoryCache();
  toast('已清除所有统计');
  renderStats();
}

/* ==================== DATA EXPORT / IMPORT ==================== */
function exportData() {
  var data = {};
  var keys = ['avalon_name_pool', 'avalon_history_v2', 'avalon_last_game'];
  for (var i = 0; i < keys.length; i++) {
    var val = localStorage.getItem(keys[i]);
    if (val !== null) {
      try { data[keys[i]] = JSON.parse(val); } catch(e) { data[keys[i]] = val; }
    }
  }
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'avalon-data-' + _bjDate() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('数据已导出');
}

function importData() {
  var h = '<h2>导入数据</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">选择 JSON 文件导入。按 fingerprint 去重合并到现有数据，不会覆盖已有记录。</p>';
  h += '<input type="file" accept=".json" id="import-file-input" style="display:block;margin:10px auto;padding:8px;background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;width:100%;max-width:300px">';
  h += '<div class="modal-actions">';
  h += '<button class="btn primary" onclick="doImportFile()">确认导入</button>';
  h += '<button class="btn" onclick="closeModal()">取消</button>';
  h += '</div>';
  showModal(h);
}

function doImportFile() {
  var input = document.getElementById('import-file-input');
  if (!input || !input.files || !input.files[0]) { toast('请选择文件', 'warn'); return; }
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var raw = e.target.result;
    var data;
    try { data = JSON.parse(raw); } catch(err) { toast('JSON 格式错误', 'warn'); return; }
    if (!data || typeof data !== 'object') { toast('数据格式无效', 'warn'); return; }

    var importedCount = 0;

    // 导入 name_pool
    if (data['avalon_name_pool'] && Array.isArray(data['avalon_name_pool'])) {
      var existingPool = [];
      try { existingPool = JSON.parse(localStorage.getItem('avalon_name_pool') || '[]'); } catch(e) {}
      var poolSet = {};
      for (var i = 0; i < existingPool.length; i++) poolSet[existingPool[i]] = true;
      for (var i = 0; i < data['avalon_name_pool'].length; i++) {
        if (!poolSet[data['avalon_name_pool'][i]]) {
          existingPool.push(data['avalon_name_pool'][i]);
          poolSet[data['avalon_name_pool'][i]] = true;
        }
      }
      localStorage.setItem('avalon_name_pool', JSON.stringify(existingPool));
      importedCount++;
    }

    // 导入 history_v2 — 按 fingerprint 去重合并
    if (data['avalon_history_v2'] && Array.isArray(data['avalon_history_v2'])) {
      var existingHistory = loadHistory();
      var existingKeys = {};
      for (var i = 0; i < existingHistory.length; i++) {
        existingKeys[makeRecordKey(existingHistory[i])] = true;
      }
      var toAdd = [];
      for (var i = 0; i < data['avalon_history_v2'].length; i++) {
        var rec = data['avalon_history_v2'][i];
        if (!existingKeys[makeRecordKey(rec)]) {
          toAdd.push(rec);
        }
      }
      if (toAdd.length > 0) {
        existingHistory = existingHistory.concat(toAdd);
        saveHistory(existingHistory);
        // push 到 Supabase
        var sb = getSupabase();
        if (sb) {
          for (var j = 0; j < toAdd.length; j++) {
            var recV2 = toAdd[j];
            var recOld = toRecordV2 ? null : null;
            (function(r) {
              sb.from('game_records').insert({ game_data: null, game_data_v2: r }).select('id').single().then(function(res) {
                if (res.error) console.warn('[Import] Supabase push failed:', res.error);
              });
            })(recV2);
          }
        }
        importedCount++;
        toast('导入 ' + toAdd.length + ' 条新对局记录');
        invalidateHistoryCache();
        if (state._currentPage === 'stats') renderStats();
      } else {
        toast('没有新的对局记录需要导入');
      }
    }

    closeModal();
  };
  reader.readAsText(file);
}

// Supabase Realtime 订阅：跨设备实时同步
// 页面加载时从 Supabase 拉取历史数据合并到本地（补充实时推送之前的记录）
function pullInitialData(sb) {
  // 全量拉取云端记录，_uuid 去重合并
  sb.from('game_records').select('id, game_data, game_data_v2, created_at').order('created_at', { ascending: true }).then(function(gameRes) {
    if (gameRes.error) {
      console.warn('[InitPull] game_records fetch failed:', gameRes.error);
      return;
    }
    if (!gameRes.data || gameRes.data.length === 0) {
      console.log('[InitPull] no records in cloud');
      return;
    }

    var localHistory = loadHistory();
    var localDeletedKeys = loadDeletedKeys();

    // 构建云端记录按 _sid 索引（稳定去重键，避免 refresh 时 UUID 漂移）
    var cloudBySid = {};
    var cloudRecords = [];
    for (var i = 0; i < gameRes.data.length; i++) {
      var row = gameRes.data[i];
      var recordV2 = row.game_data_v2 ? row.game_data_v2 : (row.game_data ? toRecordV2(row.game_data) : null);
      if (!recordV2) continue;
      recordV2._sid = row.id;
      // 从 game_data_v2 内读取 _uuid（已由 saveGameRecord 存入 JSONB）
      if (!recordV2._uuid) recordV2._uuid = generateUUID();

      var key = makeRecordKey(recordV2);
      if (localDeletedKeys.indexOf(key) !== -1) {
        console.log('[InitPull] skipped deleted:', key);
        continue;
      }

      cloudRecords.push(recordV2);
      cloudBySid[recordV2._sid] = true;
    }

    // 合并：云端记录全量采用，本地未同步的补充（按 _sid 去重）
    var merged = cloudRecords.slice();
    var hasNew = false;
    for (var i = 0; i < localHistory.length; i++) {
      var lr = localHistory[i];
      if (!isRecordV2(lr)) lr = toRecordV2(lr);
      // 有 _sid 的记录跟随云端状态：云端存在则已含在 cloudRecords 中，
      // 云端不存在该 _sid 说明被其他设备删了，同步从本地移除
      if (lr._sid) continue;
      merged.push(lr);
      hasNew = true;
    }

    if (hasNew || merged.length !== localHistory.length) {
      merged.sort(function(a, b) {
        var da = (a.date || '');
        var db = (b.date || '');
        if (da < db) return -1;
        if (da > db) return 1;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
      // 按内容指纹去重，只保留一份
      merged = deduplicateHistory(merged);
      saveHistory(merged);
      console.log('[InitPull] merged ' + cloudRecords.length + ' cloud + ' +
        (merged.length - cloudRecords.length) + ' local = ' + merged.length);
    } else {
      console.log('[InitPull] already in sync, no changes');
    }

    scheduleRenderStats();
  });

  // 拉取 name_pool
  sb.from('key_value').select('value').eq('key', 'name_pool').single().then(function(res) {
    if (res.error || !res.data) return;
    var cloudPool = res.data.value;
    if (!cloudPool || !cloudPool.length) return;
    // 以云端为准，直接覆盖本地
    namePool = cloudPool;
    localStorage.setItem('avalon_name_pool', JSON.stringify(cloudPool));
    console.log('[InitPull] name_pool synced, total:', cloudPool.length);
  });
}

function setupRealtimeSubscriptions() {
  if (_supabaseChannel) return; // 避免重复订阅
  var sb = getSupabase();
  if (!sb) return;

  // 首次加载时从 Supabase 回拉历史数据（补充 realtime 订阅之前的记录）
  pullInitialData(sb);

  _supabaseChannel = sb.channel('game-records-channel');

  // 订阅 game_records 的 INSERT 事件
  _supabaseChannel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'game_records' },
    function(payload) {
      console.log('[Realtime] new game_record inserted:', payload.new.id);
      try {
        var newRecord = payload.new.game_data_v2 || payload.new.game_data;
        if (!newRecord) return;
        if (!isRecordV2(newRecord) && newRecord.date) {
          newRecord = toRecordV2(newRecord);
        }
        newRecord._sid = payload.new.id;
        // 从 game_data_v2 内读取 _uuid（已由 saveGameRecord 存入 JSONB）
        if (!newRecord._uuid) newRecord._uuid = generateUUID();
        // 检查删除黑名单
        var dk = loadDeletedKeys();
        if (dk.indexOf(makeRecordKey(newRecord)) !== -1) { console.log('[Realtime] skipped deleted record'); return; }
        var localHistory = loadHistory();
        // 按 _uuid 去重
        var exists = false;
        for (var i = 0; i < localHistory.length; i++) {
          if (localHistory[i]._uuid && localHistory[i]._uuid === newRecord._uuid) { exists = true; break; }
        }
        if (!exists) {
          localHistory.push(newRecord);
          saveHistory(localHistory);
          console.log('[Realtime] added new record, total:', localHistory.length);
        } else {
          console.log('[Realtime] skipped duplicate record by _uuid:', newRecord._uuid);
        }
        // 当前在 stats 页面则刷新
        scheduleRenderStats();
      } catch(e) {
        console.warn('[Realtime] failed to process game_record:', e);
      }
    }
  );

  // 订阅 key_value 的 UPDATE 事件（name_pool）
  _supabaseChannel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'key_value', filter: 'key=eq.name_pool' },
    function(payload) {
      console.log('[Realtime] name_pool updated:', payload.new.value);
      try {
        var cloudPool = payload.new.value;
        if (!cloudPool) return;
        // 以云端为准，直接覆盖本地
        namePool = cloudPool;
        localStorage.setItem('avalon_name_pool', JSON.stringify(cloudPool));
        console.log('[Realtime] name_pool synced, total:', cloudPool.length);
      } catch(e) {
        console.warn('[Realtime] failed to process name_pool update:', e);
      }
    }
  );

  // v184：订阅逐句停顿设置（avalon_voice_gaps），其它设备保存后本机面板即时刷新
  _supabaseChannel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'key_value', filter: 'key=eq.avalon_voice_gaps' },
    function(payload) {
      try {
        var v = payload && (payload.new ? payload.new.value : null);
        if (!v) return;
        nvOnCloudGapsRealtime(v);
      } catch(e) {
        console.warn('[Realtime] failed to apply voice_gaps:', e);
      }
    }
  );

  // 订阅 game_records 的 DELETE 事件
  _supabaseChannel.on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'game_records' },
    function(payload) {
      console.log('[Realtime] game_record deleted:', payload.old.id);
      try {
        var deletedId = payload.old.id;
        var localHistory = loadHistory();
        var found = -1;
        for (var i = 0; i < localHistory.length; i++) {
          if (localHistory[i]._sid === deletedId || localHistory[i]._supabaseId === deletedId) { found = i; break; }
        }
        if (found >= 0) {
          localHistory.splice(found, 1);
          saveHistory(localHistory);
          console.log('[Realtime] removed deleted record, total:', localHistory.length);
          scheduleRenderStats();
        }
      } catch(e) {
        console.warn('[Realtime] failed to process game_record delete:', e);
      }
    }
  );

  var _prevRealtimeStatus = null;
  _supabaseChannel.subscribe(function(status) {
    console.log('[Realtime] channel status:', status);
    if (status === 'SUBSCRIBED') {
      if (_prevRealtimeStatus !== null && _prevRealtimeStatus !== 'SUBSCRIBED') {
        console.log('[Realtime] reconnected, triggering full pull');
        var sb = getSupabase();
        if (sb) pullInitialData(sb);
      }
      _supabaseConnected = true;
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      _supabaseConnected = false;
    }
    _prevRealtimeStatus = status;
    // Update connection indicator if on stats page
    if (state._currentPage === 'stats') {
      renderConnectionStatus();
    }
  });
}

function renderConnectionStatus() {
  var el = document.getElementById('connection-indicator');
  if (!el) {
    // 在统计页卡片区域创建连接指示器
    var statsCard = document.querySelector('#page-stats .card');
    if (!statsCard) return;
    el = document.createElement('div');
    el.id = 'connection-indicator';
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;padding:8px 12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600';
    statsCard.parentNode.insertBefore(el, statsCard);
  }
  if (_supabaseConnected) {
    el.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.6)"></span> 实时同步已连接';
    el.style.background = 'rgba(74,222,128,0.08)';
    el.style.color = '#4ade80';
  } else {
    el.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6b7280"></span> 离线';
    el.style.background = 'rgba(107,114,128,0.1)';
    el.style.color = '#9ca3af';
  }
}

// 合并去重：基于 date + playerCount + identities 生成唯一键
function mergeHistories(local, cloud) {
  // 以云端为准，本地新增的保留（云端已删则本地同步删除）
  var seen = {};
  var result = cloud.slice();
  for (var i = 0; i < result.length; i++) {
    seen[makeRecordKey(result[i])] = true;
  }
  for (var j = 0; j < local.length; j++) {
    var lk = makeRecordKey(local[j]);
    if (!seen[lk]) {
      result.push(local[j]);
      seen[lk] = true;
    }
  }
  return result;
}

function makeRecordKey(record) {
  var rec = normalizeGameData(record);
  if (!rec) return '';
  var identities = rec.identities || [];
  var date = rec.date || '';
  var playerCount = rec.playerCount || 0;
  var identityStr = identities.map(function(id) {
    return (id.name || '') + '|' + (id.role || '');
  }).sort().join(',');
  return date + '|' + playerCount + '|' + identityStr;
}

/* ==================== v196：历史记录唯一标识定位（修复「点击历史记录有时跳错局」） ====================
   根因：历史列表/详情/编辑/删除全部以「数组下标」定位，而 history 数组在下列情况下下标会漂移：
     1) loadHistory() 每次把云端记录合并进本地数组（按 _sid 去重后重建数组），云端新增/顺序变化即改变下标；
     2) deduplicateHistory() 按指纹去重会让数组变短；
     3) 删除一条、新增一条之后，后续所有记录下标前移/后移；
     4) 悬停列表用 loadNormalizedHistory() 缓存渲染，点击却按 loadHistory() 的新数组取下标，两数组长度/顺序可能不一致。
   渲染时捕获的旧下标，点击时已指向另一局 —— 这就是「有时跳错局，有时正常」。
   修复：渲染时把记录唯一标识（_sid，其次 _uuid，再次指纹）写进 onclick，点击时在当前数组里按标识反查，彻底不依赖下标。 */
function recKeyOf(record) {
  if (record == null) return '';
  var sid = record._sid || record._supabaseId || '';
  var uuid = record._uuid || '';
  if (!sid || !uuid) {
    var n = null;
    try { n = normalizeGameData(record); } catch (e0) { n = null; }
    if (n) {
      if (!sid) sid = n._supabaseId || '';
      if (!uuid) uuid = n._uuid || '';
    }
  }
  if (sid) return 's|' + sid;
  if (uuid) return 'u|' + uuid;
  var fp = '';
  try { fp = makeRecordKey(record); } catch (e1) { fp = ''; }
  return fp ? ('f|' + fp) : '';
}

// 按唯一标识在当前数组中反查下标；兼容旧版传入的数字下标。找不到返回 -1
function resolveHistoryIdx(ref, history) {
  var list = history || loadHistory();
  if (!list || !list.length) return -1;
  if (ref === null || ref === undefined || ref === '') return -1;
  if (typeof ref === 'number') return (ref >= 0 && ref < list.length) ? ref : -1;
  var key = String(ref);
  var i, nn;
  if (/^\d+$/.test(key)) {
    var n0 = parseInt(key, 10);
    if (n0 >= 0 && n0 < list.length) return n0;
  }
  for (i = 0; i < list.length; i++) {
    if (recKeyOf(list[i]) === key) return i;
  }
  for (i = 0; i < list.length; i++) {            // 兼容裸 _sid / _uuid
    var r = list[i] || {};
    if (r._sid === key || r._uuid === key) return i;
    nn = null;
    try { nn = normalizeGameData(r); } catch (e2) { nn = null; }
    if (nn && (nn._supabaseId === key || nn._uuid === key)) return i;
  }
  if (key.indexOf('f|') === 0) {                  // 指纹 key
    var fp = key.slice(2);
    for (i = 0; i < list.length; i++) {
      if (makeRecordKey(list[i]) === fp) return i;
    }
  }
  return -1;
}

function deduplicateHistory(history) {
  // 归一化到长格式以确保指纹一致性
  var normalized = history.map(function(r) { return normalizeGameData(r) || r; });
  var groups = {};
  for (var i = 0; i < normalized.length; i++) {
    var rec = normalized[i];
    var date = rec.date || '';
    var pc = rec.playerCount || 0;
    var winner = rec.winner || '';
    var ids = rec.identities || [];
    var nameStr = ids.map(function(id) { return id.name || ''; }).sort().join(',');
    var fp = date + '|' + pc + '|' + winner + '|' + nameStr;
    // 用原始记录（含 _sid 等附加字段）入组
    groups[fp] = groups[fp] || [];
    groups[fp].push(history[i]);
  }
  var result = [];
  var dedupCount = 0;
  for (var fp in groups) {
    var items = groups[fp];
    if (items.length === 1) {
      result.push(items[0]);
    } else {
      var best = items[0];
      for (var j = 1; j < items.length; j++) {
        var cur = items[j];
        var bestHasSid = best._sid || best._supabaseId;
        var curHasSid = cur._sid || cur._supabaseId;
        if (curHasSid && !bestHasSid) {
          best = cur;
        } else if (curHasSid && bestHasSid && (cur._sid || cur._supabaseId) < (best._sid || best._supabaseId)) {
          best = cur;
        }
      }
      result.push(best);
      dedupCount += items.length - 1;
    }
  }
  if (dedupCount > 0) {
    console.log('[Dedup] removed ' + dedupCount + ' duplicate records (from ' + history.length + ' to ' + result.length + ')');
  }
  return result;
}

/* ==================== INIT ==================== */
(function() {
  // iPad/移动端兼容：首次用户交互时预初始化 AudioContext（绕过浏览器自动播放限制）
  var initAudioOnce = function() {
    ensureAudioContext();
    document.removeEventListener('click', initAudioOnce);
    document.removeEventListener('touchstart', initAudioOnce);
  };
  document.addEventListener('click', initAudioOnce);
  document.addEventListener('touchstart', initAudioOnce);

  var last = loadLastGame();
  if (last && last.playerCount >= 5 && last.playerCount <= 10) {
    state.playerCount = last.playerCount;
    state.activeRoles = (last.playerCount === 10) ? ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德'] : DEFAULT_ACTIVE_ROLES.slice();
    state.playerNames = last.playerNames.slice();
    state.selfIndex = last.selfIndex;
    state.tendencies = {};
    state.consecutiveRejects = {};
    for (var i = 0; i < state.playerCount; i++) {
      state.tendencies[i] = 50;
      state.consecutiveRejects[i] = 0;
    }
  } else {
    initState(7);
  }
  showPage('setup');

  // v185：首屏先可用；Supabase SDK、实时订阅、离线队列重推全部延后到首屏空闲
  var afterFirstPaint = function() {
    try { processOfflineQueues(); } catch(e) {}
    try { prefetchCloudRows(); } catch(e) {}
    if (typeof window.supabase !== 'undefined') {
      try { setupRealtimeSubscriptions(); } catch(e) { console.warn('[Realtime] setup failed', e); }
    } else {
      loadSupabaseSDK(function(ok) {
        if (ok) { try { setupRealtimeSubscriptions(); } catch(e) { console.warn('[Realtime] setup failed', e); } }
      });
    }
  };
  // v185：再等页面 load 完成（首屏图片/样式全部就绪）后空闲再加载云端能力，避免抢首屏带宽
  var scheduleDeferred = function() {
    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(function() { setTimeout(afterFirstPaint, 300); }, { timeout: 2500 });
    } else {
      setTimeout(afterFirstPaint, 1200);
    }
  };
  if (document.readyState === 'complete') {
    scheduleDeferred();
  } else {
    window.addEventListener('load', scheduleDeferred, { once: true });
  }

})();

/* ==================== NEW TENDENCY SYSTEM ==================== */

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

var ROLE_CATEGORY = {
  '梅林': 'good', '派西维尔': 'good', '忠臣': 'good', '兰斯洛特(蓝)': 'good',
  '莫甘娜': 'evil', '刺客': 'evil', '莫德雷德': 'evil',
  '奥伯伦': 'evil', '爪牙': 'evil', '兰斯洛特(红)': 'evil'
};

function isGoodRole(role) { return ROLE_CATEGORY[role] === 'good'; }
function isEvilRole(role) { return ROLE_CATEGORY[role] === 'evil'; }

/* ==================== FEATURE 4: NIGHT MODE ==================== */
function initNightMode() {
  var saved = localStorage.getItem('avalon_theme');
  if (saved === 'night') {
    document.documentElement.setAttribute('data-theme', 'night');
    updateThemeToggleIcon(true);
  } else {
    document.documentElement.removeAttribute('data-theme');
    updateThemeToggleIcon(false);
  }
}

function toggleNightMode() {
  var isNight = document.documentElement.getAttribute('data-theme') === 'night';
  if (isNight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('avalon_theme', 'light');
    updateThemeToggleIcon(false);
    toast('已切换到日间模式');
  } else {
    document.documentElement.setAttribute('data-theme', 'night');
    localStorage.setItem('avalon_theme', 'night');
    updateThemeToggleIcon(true);
    toast('已切换到夜间模式');
  }
}

function updateThemeToggleIcon(isNight) {
  var btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.innerHTML = isNight ? '&#9789;' : '&#9790;';
}

initNightMode();

/* ==================== FEATURE 3: REPLAY ==================== */
function showReplay() {
  var overlay = document.getElementById('replay-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  buildReplayTimeline();
  setTimeout(function() { drawReplayChart(); }, 100);
}
function closeReplayModal(event) {
  var overlay = document.getElementById('replay-modal-overlay');
  if (!overlay) return;
  if (event && event.target !== overlay) return;
  overlay.style.display = 'none';
}

function buildReplayTimeline() {
  var container = document.getElementById('replay-timeline');
  if (!container) return;

  var pc = state.playerCount;
  var h = '';

  // 遍历所有轮次和事件
  for (var r = 0; r <= state.currentRound; r++) {
    var m = state.missions[r];
    if (!m) continue;

    // 组队尝试
    var attempts = m.launchAttempts || [];
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      var attApproves = 0;
      for (var k = 0; k < pc; k++) { if (att.votes[k] === 'approve') attApproves++; }
      var launched = attApproves > Math.floor(pc / 2);
      var approveList = [], rejectList = [];
      for (var k = 0; k < pc; k++) {
        if (att.votes[k] === 'approve') approveList.push(playerLabel(k));
        else rejectList.push(playerLabel(k));
      }

      h += '<div class="replay-event-card round-event">';
      h += '<div class="replay-event-header">';
      h += '<span class="replay-event-title">第' + (r + 1) + '轮 · 第' + (a + 1) + '次组队</span>';
      h += '<span class="replay-event-time">队长：' + playerLabel(att.leader) + '</span>';
      h += '</div>';
      h += '<div class="replay-event-body">';
      h += '<p>队伍成员：' + att.team.map(function(i) { return playerLabel(i); }).join('、') + '</p>';
      h += '<p>投票结果：' + (launched ? '<span style="color:var(--green-bright)">组队成功</span>' : '<span style="color:var(--red-bright)">组队未通过</span>') + '（赞成 ' + attApproves + ' / 反对 ' + (pc - attApproves) + '）</p>';

      h += '<div class="replay-event-votes">';
      h += '<div class="replay-vote-col approve-col"><div class="replay-vote-col-title">赞成</div>';
      h += approveList.map(function(n) { return '<span class="replay-vote-name">' + n + '</span>'; }).join('');
      h += '</div>';
      h += '<div class="replay-vote-col reject-col"><div class="replay-vote-col-title">反对</div>';
      h += rejectList.map(function(n) { return '<span class="replay-vote-name">' + n + '</span>'; }).join('');
      h += '</div></div>';
      h += '</div></div>';
    }

    // 任务结果
    if (m.result) {
      h += '<div class="replay-event-card round-event">';
      h += '<div class="replay-event-header">';
      h += '<span class="replay-event-title">第' + (r + 1) + '轮任务结果</span>';
      h += '<span class="replay-event-time">队长：' + playerLabel(m.leader) + '</span>';
      h += '</div>';
      h += '<div class="replay-event-body">';
      h += '<p>队伍：' + (m.team || []).map(function(i) { return playerLabel(i); }).join('、') + '</p>';
      var resultColor = m.result === 'success' ? 'var(--green-bright)' : 'var(--red-bright)';
      var resultText = m.result === 'success' ? '成功' : missionFailLabel(m);
      h += '<p>结果：<strong style="color:' + resultColor + '">' + resultText + '</strong>';
      if (m.result === 'success' && m.shieldedFails) h += '（含' + m.shieldedFails + '张失败票）';
      if (m.result === 'success' && !m.shieldedFails && !m.failCount) h += '（全票通过）';
      h += '</p>';
      h += '</div></div>';
    }

    // 湖中女神事件
    var ladyRecords = (state.ladyCheckHistory || []).filter(function(rec) {
      return rec && rec.round === r;
    });
    if (ladyRecords.length > 0) {
      for (var li = 0; li < ladyRecords.length; li++) {
        var lr = ladyRecords[li];
        h += '<div class="replay-event-card lady-event">';
        h += '<div class="replay-event-header">';
        h += '<span class="replay-event-title">湖中女神验人</span>';
        h += '<span class="replay-event-time">第' + (r + 1) + '轮</span>';
        h += '</div>';
        h += '<div class="replay-event-body">';
        h += '<p>' + playerLabel(lr.holder) + ' 查看了 ' + playerLabel(lr.target) + ' 的身份牌</p>';
        h += '<p>结果声明：<strong>' + ladyClaimLabel(lr.result) + '</strong></p>';
        if (lr.note) h += '<p style="color:var(--text-dim);font-size:12px">备注：' + escapeHtml(lr.note) + '</p>';
        h += '</div></div>';
      }
    }

    // 王者之剑事件
    var exRec = getExcaliburRecord(r);
    if (exRec && (exRec.used === true || exRec.used === false)) {
      h += '<div class="replay-event-card excalibur-event">';
      h += '<div class="replay-event-header">';
      h += '<span class="replay-event-title">王者之剑</span>';
      h += '<span class="replay-event-time">第' + (r + 1) + '轮</span>';
      h += '</div>';
      h += '<div class="replay-event-body">';
      h += '<p>持剑者：' + playerLabel(exRec.holder) + '</p>';
      if (exRec.used) {
        h += '<p>对 <strong>' + playerLabel(exRec.target) + '</strong> 使用</p>';
        if (exRec.claimedDirection) h += '<p>声称改变方向：' + excaliburDirectionLabel(exRec.claimedDirection) + '</p>';
      } else {
        h += '<p>未使用</p>';
      }
      h += '</div></div>';
    }

    // 兰斯洛特翻转
    if (r > 0 && r < (state.lancelotDrawResults || []).length) {
      var drew = state.lancelotDrawResults[r];
      if (drew !== null && drew !== undefined) {
        h += '<div class="replay-event-card flip-event">';
        h += '<div class="replay-event-header">';
        h += '<span class="replay-event-title">兰斯洛特翻转</span>';
        h += '<span class="replay-event-time">第' + (r) + '轮后抽取</span>';
        h += '</div>';
        h += '<div class="replay-event-body">';
        h += '<p>结果：<strong style="color:' + (drew ? 'var(--orange)' : 'var(--text-dim)') + '">' + (drew ? '反转' : '未反转') + '</strong></p>';
        h += '</div></div>';
      }
    }
  }

  // 刺客刺杀
  if (state.assassinTarget !== null) {
    h += '<div class="replay-event-card assassin-event">';
    h += '<div class="replay-event-header">';
    h += '<span class="replay-event-title">刺客刺杀</span>';
    h += '</div>';
    h += '<div class="replay-event-body">';
    h += '<p>刺杀目标：<strong>' + playerLabel(state.assassinTarget) + '</strong></p>';
    if (state.winner === 'evil') {
      h += '<p style="color:var(--red-bright)">刺杀成功，反方获胜</p>';
    } else if (state.winner === 'good') {
      h += '<p style="color:var(--green-bright)">刺杀失败，好人方获胜</p>';
    }
    h += '</div></div>';
  }

  container.innerHTML = h || '<p style="color:var(--text-dim);text-align:center;padding:20px">暂无复盘数据</p>';
}

// 尝试获取玩家阵容，优先从结束页 DOM 读取，其次从 knownIdentities
function getPlayerFaction(idx) {
  // 方法1：从结束页身份选择下拉框读取
  var sel = document.getElementById('end-role-' + idx);
  if (sel && sel.value) {
    var role = sel.value;
    if (ROLE_CATEGORY[role] === 'good') return 'good';
    if (ROLE_CATEGORY[role] === 'evil') return 'evil';
    return 'neutral';
  }
  // 方法2：从 knownIdentities 读取
  var known = state.knownIdentities && state.knownIdentities[idx];
  if (known) {
    if (ROLE_CATEGORY[known] === 'good') return 'good';
    if (ROLE_CATEGORY[known] === 'evil') return 'evil';
    return 'neutral';
  }
  return 'unknown';
}

function getFactionColor(faction) {
  if (faction === 'good')  return { fill: '#4a90d9', bg: 'rgba(74,144,217,0.15)', text: '#2d6eb0' };
  if (faction === 'evil')  return { fill: '#c44a4a', bg: 'rgba(196,74,74,0.15)', text: '#9e2e2e' };
  if (faction === 'neutral') return { fill: '#8a8070', bg: 'rgba(138,128,112,0.12)', text: '#5a5246' };
  return { fill: '#8a8070', bg: 'rgba(138,128,112,0.08)', text: '#5a5246' };
}

function drawReplayChart() {
  var canvas = document.getElementById('replay-chart-canvas');
  if (!canvas) return;

  var rt = state.roundTendencies || [];
  if (rt.length === 0) {
    document.getElementById('replay-chart-container').style.display = 'none';
    return;
  }

  document.getElementById('replay-chart-container').style.display = 'block';
  var pc = state.playerCount;

  // 构建轮次标签（去重合并）
  var rounds = [];
  var seenLabels = {};
  for (var i = 0; i < rt.length; i++) {
    var snap = rt[i];
    var r = (snap.r !== undefined) ? snap.r : i;
    var a = (snap.a !== undefined && snap.a > 0) ? snap.a : 0;
    var label = a > 0 ? 'R' + (r + 1) + '-' + a : 'R' + (r + 1);
    var key = 'r' + r + 'a' + a;
    if (!seenLabels[key]) {
      seenLabels[key] = true;
      rounds.push({ label: label, r: r, a: a, idx: i });
    }
  }
  var numRounds = rounds.length;

  // 大尺寸 Canvas
  var ROW_H = 62;
  var LEFT_MARGIN = 100;
  var RIGHT_MARGIN = 24;
  var TOP_MARGIN = 44;
  var BOTTOM_MARGIN = 36;
  var COL_GAP = 12;

  var chartW = Math.max(700, numRounds * 100);
  var chartH = TOP_MARGIN + pc * ROW_H + BOTTOM_MARGIN;

  canvas.width = (LEFT_MARGIN + chartW + RIGHT_MARGIN) * 2;
  canvas.height = chartH * 2;
  canvas.style.width = (LEFT_MARGIN + chartW + RIGHT_MARGIN) + 'px';
  canvas.style.height = chartH + 'px';

  var ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // 白色背景
  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, LEFT_MARGIN + chartW + RIGHT_MARGIN, chartH);

  // 标题
  ctx.fillStyle = '#333';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('玩家倾向值变化', (LEFT_MARGIN + chartW) / 2, 28);

  // 辅助：每列中心 X
  var colW = (chartW - COL_GAP * (numRounds - 1)) / numRounds;
  function colX(ci) { return LEFT_MARGIN + ci * (colW + COL_GAP) + colW / 2; }

  // 列头（轮次标签）
  ctx.fillStyle = '#666';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  for (var ci = 0; ci < numRounds; ci++) {
    ctx.fillText(rounds[ci].label, colX(ci), TOP_MARGIN - 8);
  }

  // 每行玩家
  for (var p = 0; p < pc; p++) {
    var rowY = TOP_MARGIN + p * ROW_H;
    var faction = getPlayerFaction(p);
    var fc = getFactionColor(faction);

    // 行背景（交替浅色条纹）
    if (p % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(LEFT_MARGIN, rowY, chartW, ROW_H);
    }

    // 玩家名（左标签）
    ctx.fillStyle = fc.text;
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'right';
    var name = state.playerNames[p] || ('P' + (p + 1));
    // 截断过长名字
    if (name.length > 6) name = name.substring(0, 5) + '..';
    ctx.fillText(name, LEFT_MARGIN - 10, rowY + ROW_H / 2 + 4);

    // 每列绘制条形 + 数值
    for (var ci = 0; ci < numRounds; ci++) {
      var rIdx = rounds[ci].idx;
      var snap = rt[rIdx];
      var v = snap.v || snap;
      var score = (typeof v === 'object' && v[p] !== undefined) ? v[p] : 50;
      var cx = colX(ci);

      // 背景条（浅灰底）
      var barMaxW = colW - 8;
      var barH = 18;
      var barY = rowY + ROW_H / 2 - barH / 2;
      var barX = cx - barMaxW / 2;

      ctx.fillStyle = '#e8e4da';
      ctx.beginPath();
      roundRect(ctx, barX, barY, barMaxW, barH, 4);
      ctx.fill();

      // 倾向值填充条
      var fillW = Math.max(4, (score / 100) * barMaxW);
      ctx.fillStyle = fc.fill;
      ctx.beginPath();
      roundRect(ctx, barX, barY, fillW, barH, 4);
      ctx.fill();

      // 数值标注
      ctx.fillStyle = fc.text;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      var numX = barX + fillW + 4;
      if (fillW > barMaxW * 0.6) {
        // 数值显示在条内右侧
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        numX = barX + fillW - 5;
      }
      ctx.fillText(String(score), numX, barY + barH / 2 + 4);

      // 如果是有多次尝试的轮次（连续拒绝），在条上方加小圆点标记区别
      if (rounds[ci].a > 1) {
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.arc(cx, barY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 行底部分隔线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(LEFT_MARGIN, rowY + ROW_H);
    ctx.lineTo(LEFT_MARGIN + chartW, rowY + ROW_H);
    ctx.stroke();
  }

  // 底部图例
  var legendY = TOP_MARGIN + pc * ROW_H + 16;
  var legends = [
    { label: '好人方', color: '#4a90d9' },
    { label: '反派方', color: '#c44a4a' },
    { label: '中立/未知', color: '#8a8070' }
  ];
  ctx.font = '11px system-ui';
  var legendX = LEFT_MARGIN;
  for (var li = 0; li < legends.length; li++) {
    ctx.fillStyle = legends[li].color;
    ctx.beginPath();
    ctx.arc(legendX + 5, legendY - 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText(legends[li].label, legendX + 16, legendY);
    legendX += 90;
  }
}

// 圆角矩形辅助函数
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ==================== HISTORY DETAIL MODAL ==================== */
function getPlayerFaction(role) {
  if (GOOD_ROLES.indexOf(role) !== -1) return 'good';
  if (EVIL_ROLES.indexOf(role) !== -1) return 'evil';
  if (NEUTRAL_ROLES.indexOf(role) !== -1) return 'neutral';
  return 'neutral';
}

function closeHistoryModal() {
  var overlay = document.getElementById('hci-modal-overlay');
  if (overlay) overlay.remove();
}

function openHistoryModal(ref) {
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { toast('\u672a\u627e\u5230\u8be5\u6761\u8bb0\u5f55\uff08\u53ef\u80fd\u5df2\u88ab\u5220\u9664\uff09', 'warn'); return; }
  var recRaw = history[idx];
  var rec = normalizeRecord(recRaw);
  if (!rec) return;
  // v196：本条记录的唯一标识，供删除/编辑/截图等操作定位，不再依赖下标
  var _hKey = recKeyOf(recRaw) || String(idx);

  // v196：先移除已存在的同 id 弹窗（编辑器/详情共用 overlay），避免叠加后
  // getElementById 取到旧节点，导致保存后仍显示编辑器、关闭只关掉一层
  var _oldOv = document.getElementById('hci-modal-overlay');
  if (_oldOv && _oldOv.parentNode) _oldOv.parentNode.removeChild(_oldOv);

  var overlay = document.createElement('div');
  overlay.className = 'hci-modal-overlay';
  overlay.id = 'hci-modal-overlay';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeHistoryModal();
  });

  var winnerColor = rec.winner === 'good' ? 'good' : 'evil';
  var winnerLabel = rec.winner === 'good' ? '好人方胜' : '反方胜';

  // Build duration
  var durStr = '';
  if (rec.startTime && rec.endTime) {
    var durMin = Math.round((new Date(rec.endTime.replace(' ', 'T')) - new Date(rec.startTime.replace(' ', 'T'))) / 60000);
    if (durMin > 0) durStr = durMin + '分钟';
  }

  var h = '';
  h += '<div class="hci-modal">';

  // --- Header ---
  h += '<div class="hci-modal-header">';
  h += '<span class="hci-modal-date">' + (rec.date || '--') + (rec.startTime ? ' ' + rec.startTime.slice(11, 16) : '') + '</span>';
  h += '<span class="hci-modal-result ' + winnerColor + '">' + winnerLabel + '</span>';
  h += '<div style="margin-left:auto;display:flex;align-items:center;gap:4px">';
  h += '<button class="hci-modal-del-btn" onclick="deleteGameRecord(\'' + _hKey + '\')" title="删除">删除</button>';
  h += '<button class="hci-modal-close" onclick="closeHistoryModal()">&times;</button>';
  h += '</div>';
  h += '</div>';

  // --- Body ---
  h += '<div class="hci-modal-body">';

  // a) Basic info
  h += '<div class="hci-modal-meta">';
  h += '<span>' + (rec.playerCount || '?') + ' 人</span>';
  if (durStr) h += '<span>' + durStr + '</span>';
  h += '</div>';

  // b) Identity panel
  if (rec.identities && rec.identities.length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">身份</div>';
    h += '<div class="hci-player-grid">';
    for (var j = 0; j < rec.identities.length; j++) {
      var id = rec.identities[j];
      var faction = getPlayerFaction(id.role || '');
      var flipped = rec.lancelotFlips && rec.lancelotFlips[id.index != null ? id.index : j];
      var roleText = id.role || '--';
      if (flipped) roleText += ' <span style="color:var(--orange);font-size:10px">&#8617;变节</span>';
      h += '<div class="hci-player-card ' + faction + '">';
      h += '<div class="hci-pc-name">' + (id.index != null ? (id.index + 1) + '号 ' : '') + id.name + '</div>';
      h += '<div class="hci-pc-role">' + roleText + '</div>';
      h += '</div>';
    }
    h += '</div></div>';
  }

  // c) Mission review
  if (rec.missions && rec.missions.length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">任务回顾</div>';
    h += '<div class="hci-mission-list">';
    for (var mi = 0; mi < rec.missions.length; mi++) {
      var m = rec.missions[mi];
      if (!m.result && (!m.launchAttempts || m.launchAttempts.length === 0)) continue;
      h += '<div class="hci-mission-card">';
      h += '<div class="hci-mission-round">';
      h += '第' + (mi + 1) + '轮';
      if (m.result) {
        if (m.result === 'success' && m.shieldedFails) {
          h += ' <span style="color:var(--green-bright)">&#10003; 成功（含' + m.shieldedFails + '张失败票）</span>';
        } else if (m.result === 'success' && !m.failCount) {
          h += ' <span style="color:var(--green-bright)">&#10003; 成功（全票通过）</span>';
        } else if (m.result === 'success') {
          h += ' <span style="color:var(--green-bright)">&#10003; 成功</span>';
        } else {
          h += ' <span style="color:var(--red-bright)">&#10007; ' + missionFailLabel(m) + '</span>';
        }
      }
      h += '</div>';
      if (m.launchAttempts && m.launchAttempts.length > 0) {
        for (var la = 0; la < m.launchAttempts.length; la++) {
          var att = m.launchAttempts[la];
          var isLast = (la === m.launchAttempts.length - 1);
          var appCnt = 0, rejCnt = 0;
          var approveVoters = [], rejectVoters = [];
          for (var vk in att.votes) {
            var voterIdx = resolvePlayerIdx(vk, rec.identities);
            if (voterIdx < 0) continue;
            if (att.votes[vk] === 'approve') { appCnt++; approveVoters.push(voterIdx); }
            else { rejCnt++; rejectVoters.push(voterIdx); }
          }
          // Build voter name lists
          var approveNames = approveVoters.map(function(vi) {
            for (var vti = 0; vti < rec.identities.length; vti++) {
              if (rec.identities[vti].index === vi) return (vi + 1) + '号';
            }
            return (vi + 1) + '号';
          });
          var rejectNames = rejectVoters.map(function(vi) {
            for (var vti = 0; vti < rec.identities.length; vti++) {
              if (rec.identities[vti].index === vi) return (vi + 1) + '号';
            }
            return (vi + 1) + '号';
          });
          var resIcon = '';
          if (isLast && m.result === 'success') resIcon = ' <span style="color:var(--green-bright)">&#10003;</span>';
          else if (isLast && m.result === 'fail') resIcon = ' <span style="color:var(--red-bright)">&#10007;</span>';
          var teamItems = (att.team || []).map(function(tmName) {
            var tIdx = resolvePlayerIdx(tmName, rec.identities);
            var tLabel = (tIdx >= 0) ? (((rec.identities[tIdx].index != null ? rec.identities[tIdx].index : tIdx) + 1) + '号 ' + rec.identities[tIdx].name) : tmName;
            if (tIdx >= 0 && getPlayerFaction(rec.identities[tIdx].role || '') === 'evil') {
              return '<span style="color:var(--red-bright);font-weight:600">' + tLabel + '</span>';
            }
            return tLabel;
          });
          var teamHtml = teamItems.join(', ');
          var leaderIdx = resolvePlayerIdx(att.leader, rec.identities);
          var leaderLabel = (leaderIdx >= 0) ? (((rec.identities[leaderIdx].index != null ? rec.identities[leaderIdx].index : leaderIdx) + 1) + '号 ' + rec.identities[leaderIdx].name) : (att.leader || '');
          h += '<div class="hci-mission-attempt">';
          h += '组队' + (la + 1) + '：<span class="leader">' + leaderLabel + '</span>';
          if (teamHtml) h += ' <span class="team-members">[' + teamHtml + ']</span>';
          var toggleId = 'vote-detail-' + mi + '-' + la;
          h += ' <span class="vote-count hci-vote-toggle" onclick="var el=document.getElementById(\'' + toggleId + '\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">投票 ' + appCnt + '<span class="hci-vote-approve">赞成</span>:' + rejCnt + '<span class="hci-vote-reject">反对</span>' + resIcon + '</span>';
          h += '<div id="' + toggleId + '" class="hci-vote-detail" style="display:none">';
          h += '赞成：' + (approveNames.join('、') || '无');
          h += '&nbsp;|&nbsp;';
          h += '反对：' + (rejectNames.join('、') || '无');
          h += '</div>';
          h += '</div>';
        }
      } else {
        h += '<div class="hci-mission-attempt">';
        h += '结果：' + (m.result === 'success' ? '<span style="color:var(--green-bright)">&#10003;</span>' : '<span style="color:var(--red-bright)">&#10007;</span>');
        h += '</div>';
      }
      // v192：失败轮展示「谁打的失败」，格式「3号 鹭文、5号 阿弟」；旧记录未录入显示「—」
      // v194：保护轮等「成功但含失败票」的轮次单独用「保护轮 N 张失败票：…（未致失败）」展示，不与失败轮混淆
      if (m.result === 'fail') {
        h += '<div class="hci-fail-voters">失败票：' + failVotersInnerHTML(m) + '</div>';
      } else if (m.result === 'success' && (parseInt(m.shieldedFails, 10) || 0) > 0) {
        h += '<div class="hci-fail-voters">' + escAttr(shieldedFailPrefix(mi, m)) + '：' + failVotersInnerHTML(m)
          + '<span style="color:var(--text-dim)">（未致失败）</span></div>';
      }
      if (m.result === 'success' && m.shieldedFails) {
        var lastAtt = m.launchAttempts && m.launchAttempts.length > 0 ? m.launchAttempts[m.launchAttempts.length - 1] : null;
        var evilNames = [];
        if (lastAtt && lastAtt.team && rec.identities) {
          var tArr = lastAtt.team.map(function(x) { return resolvePlayerIdx(x, rec.identities); }).filter(function(x) { return x >= 0; });
          for (var ei = 0; ei < tArr.length; ei++) {
            if (getPlayerFaction(rec.identities[tArr[ei]].role) === 'evil') evilNames.push(rec.identities[tArr[ei]].name);
          }
        }
        if (evilNames.length > 0) {
          h += '<div style="color:var(--red-bright);font-weight:600;margin-top:4px">失败卡：' + m.shieldedFails + '张（' + evilNames.join('、') + '）</div>';
        }
      }
      h += '</div>';
    }
    h += '</div></div>';
  }

  // d) Lady check
  if (rec.ladyCheckHistory && rec.ladyCheckHistory.length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">湖中女神验人</div>';
    for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
      var lc = rec.ladyCheckHistory[li];
      var holderNum = (lc.holder != null) ? (lc.holder + 1) + '号 ' : '';
      var targetNum = (lc.target != null) ? (lc.target + 1) + '号 ' : '';
      var roundLabel = lc.round ? '第' + lc.round + '轮：' : '';
      var resultLabel = lc.result === 'good' ? '好人' : lc.result === 'evil' ? '反方' : (lc.result === 'skip' ? '不报' : (lc.result || '?'));
      h += '<div class="hci-detail-row">' + roundLabel + holderNum + lc.holderName + ' 查验 ' + targetNum + lc.targetName + ' &#8594; <strong>' + resultLabel + '</strong></div>';
    }
    h += '</div>';
  }

  // e) Identity marks
  if (rec.identityMarks && rec.identityMarks.length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">身份标记</div>';
    for (var mkIdx = 0; mkIdx < rec.identityMarks.length; mkIdx++) {
      var mk = rec.identityMarks[mkIdx];
      var lvlLabel = mk.level === 'high' ? '高' : mk.level === 'mid' ? '中' : '低';
      h += '<div class="hci-detail-row">' + (mk.targetName || mk.target) + ' [' + lvlLabel + ']</div>';
    }
    h += '</div>';
  }

  // f) Excalibur
  if (rec.excaliburHistory && rec.excaliburHistory.length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">王者之剑</div>';
    for (var exIdx = 0; exIdx < rec.excaliburHistory.length; exIdx++) {
      var ex = rec.excaliburHistory[exIdx];
      h += '<div class="hci-detail-row">' + (ex.holderName || ex.holder) + ' &#8594; ' + (ex.targetName || ex.target) + (ex.used ? '（已使用）' : '（未使用）') + '</div>';
    }
    h += '</div>';
  }

  // g) Lancelot flips
  if (rec.lancelotFlips && Object.keys(rec.lancelotFlips).length > 0) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">兰斯洛特变节</div>';
    for (var lfIdx in rec.lancelotFlips) {
      if (rec.identities && rec.identities[lfIdx]) {
        var player = rec.identities[lfIdx];
        var playerNum = (player.index != null ? player.index : parseInt(lfIdx)) + 1;
        var origRole = player.role || '';
        var origFaction = ROLE_CATEGORY[origRole] || '';
        var shortRole = origRole === '兰斯洛特(蓝)' ? '蓝兰斯洛特' : origRole === '兰斯洛特(红)' ? '红兰斯洛特' : origRole;
        var afterLabel = (origFaction === 'good') ? '红方（坏人）' : (origFaction === 'evil') ? '蓝方（好人）' : '?';
        h += '<div class="hci-detail-row" style="color:var(--orange)">' + playerNum + '号 ' + shortRole + ' &#8594; ' + afterLabel + '</div>';
      }
    }
    h += '</div>';
  }

  // h) Assassin
  if (rec.assassinTarget) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">刺杀</div>';
    h += '<div class="hci-detail-row">';
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += '（第' + (rec.assassinAfterRound + 1) + '轮任务后）';
    }
    h += '目标：' + rec.assassinTarget + ' &#8594; ';
    h += rec.assassinSuccess ? '<span style="color:var(--red-bright);font-weight:700">命中</span>' : '<span style="color:var(--green-bright);font-weight:700">未命中</span>';
    h += '</div></div>';
  }

  // Force ended info
  if (rec.forceEnded) {
    h += '<div>';
    h += '<div class="hci-modal-section-title">强制结束</div>';
    h += '<div class="hci-detail-row" style="color:var(--orange)">' + (rec.forceEndReason || '未知原因') + '</div>';
    h += '</div>';
  }

  h += '</div>'; // body

  // --- Footer ---
  h += '<div class="hci-modal-footer">';
  h += '<button class="btn small" id="hci-screenshot-btn">生成截图</button>';
  h += '<button class="btn small" onclick="openHistoryEdit(\'' + _hKey + '\')">编辑记录</button>';
  h += '</div>';

  h += '</div>'; // modal

  overlay.innerHTML = h;
  document.body.appendChild(overlay);

  // 截图按钮使用程序化事件绑定，避免内联 onclick 作用域问题
  var ssBtn = document.getElementById('hci-screenshot-btn');
  if (ssBtn) {
    ssBtn.addEventListener('click', function() {
      generateGameScreenshot(_hKey);
    });
  }
}

/* ==================== SCREENSHOT GENERATION ==================== */
function generateGameScreenshot(ref) {
  try {
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { alert('\u65e0\u6548\u8bb0\u5f55'); return; }
  var recRaw = history[idx];
  var rec = normalizeRecord(recRaw);
  if (!rec) { alert('\u8bb0\u5f55\u89e3\u6790\u5931\u8d25'); return; }
  console.log('[Screenshot] rec:', rec);

  // 防御：检查 identities 并尝试修复
  if (!rec.identities || !Array.isArray(rec.identities) || rec.identities.length === 0) {
    console.error('[Screenshot] rec.identities missing or empty for idx=' + idx + ', raw keys:', Object.keys(recRaw), 'raw v2 ids:', recRaw.ids);
    // 从 raw v2 格式直接提取 ids
    var rebuilt = null;
    if (recRaw.ids && Array.isArray(recRaw.ids) && recRaw.ids.length > 0) {
      rebuilt = recRaw.ids.map(function(id, ri) {
        return { name: id.n || '\u73a9\u5bb6' + (ri + 1), role: id.r || '', index: id.i != null ? id.i : ri };
      });
      console.log('[Screenshot] rebuilt identities from recRaw.ids, count=' + rebuilt.length);
    } else if (rec.missions && rec.missions.length > 0 && rec.playerCount) {
      rebuilt = [];
      for (var ri = 0; ri < rec.playerCount; ri++) {
        rebuilt.push({ name: '\u73a9\u5bb6' + (ri + 1), role: '', index: ri });
      }
      console.log('[Screenshot] rebuilt identities from playerCount=' + rec.playerCount);
    } else if (recRaw.pc) {
      rebuilt = [];
      for (var ri = 0; ri < recRaw.pc; ri++) {
        rebuilt.push({ name: '\u73a9\u5bb6' + (ri + 1), role: '', index: ri });
      }
      console.log('[Screenshot] rebuilt identities from recRaw.pc=' + recRaw.pc);
    }
    if (rebuilt) {
      rec.identities = rebuilt;
    } else {
      toast('\u622a\u56fe\u5931\u8d25\uff1aidentities \u4e3a\u7a7a', 'error');
      return;
    }
  }
  // 防御：每个 identity 必须有 name 和 role，缺少 index 则用数组下标
  for (var ri = 0; ri < rec.identities.length; ri++) {
    var id = rec.identities[ri];
    if (!id) {
      console.warn('[Screenshot] identity[' + ri + '] is null/undefined, replacing');
      rec.identities[ri] = { name: '\u73a9\u5bb6' + (ri + 1), role: '', index: ri };
      continue;
    }
    if (!id.name) id.name = '\u73a9\u5bb6' + (ri + 1);
    if (!id.role) id.role = '';
    if (id.index == null) id.index = ri;
    if (!id.name || !id.role) {
      console.warn('[Screenshot] identity[' + ri + '] missing fields:', JSON.stringify(id));
    }
  }

  var W = 750;
  var SCALE = 6;
  var PAD = 28;
  var contentW = W - PAD * 2;

  var canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  var ctx = canvas.getContext('2d');
  if (!ctx) {
    toast('\u622a\u56fe\u5931\u8d25\uff1aCanvas \u6e32\u67d3\u5f02\u5e38', 'error');
    return;
  }

  var ids = rec.identities || [];
  var pc = ids.length;
  function pn(idx) { var p = ids[idx]; return (idx + 1) + '\u53f7 ' + ((p && p.name) || '\u73a9\u5bb6' + (idx + 1)); }
  function pnShort(idx) { var p = ids[idx]; return (idx + 1) + ((p && p.name) || '\u73a9\u5bb6' + (idx + 1)); }
  function isEvil(idx) { var p = ids[idx]; return p && getFinalFaction(p.role, rec.lancelotFlips && rec.lancelotFlips[idx]) === 'evil'; }
  function evilColor(idx) { return isEvil(idx) ? '#d32f2f' : '#3b2f22'; }
  // 投票值查找：从 votes 对象中按多种 key 格式匹配玩家 vi 的投票
  function getVoteValue(votes, vi) {
    if (!votes) return null;
    if (votes[vi] !== undefined) return votes[vi];
    if (votes[String(vi)] !== undefined) return votes[String(vi)];
    var label = pn(vi);
    if (votes[label] !== undefined) return votes[label];
    // 兜底：按 "N号" 前缀扫描所有 key，应对记录时名字与 identities 不一致的边界情况
    var prefix = (vi + 1) + '\u53f7 ';
    for (var k in votes) {
      if (k.indexOf(prefix) === 0) return votes[k];
    }
    return null;
  }

  function dtSegments(x, y, segs, sz) {
    ctx.font = sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.textBaseline = 'top';
    var cx = x;
    for (var si = 0; si < segs.length; si++) {
      if (segs[si].bold) ctx.font = 'bold ' + sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
      else ctx.font = sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
      ctx.fillStyle = segs[si].color || TXT;
      ctx.textAlign = 'left';
      ctx.fillText(segs[si].text, cx, y);
      cx += tw(segs[si].text, sz);
    }
    return cx;
  }

  var GOLD = '#c8910a';
  var GREEN = '#1e8e3e';
  var GREEN_BRIGHT = '#16a34a';
  var RED = '#d32f2f';
  var BLUE = '#1976d2';
  var TXT = '#3b2f22';
  var TXT_SEC = '#8a6d4f';
  var TXT_DIM = '#b09a80';

  function tw(text, size) {
    ctx.font = size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    return ctx.measureText(text).width;
  }
  function dt(text, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.fillStyle = color || TXT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  var hasLady = rec.ladyCheckHistory && rec.ladyCheckHistory.length > 0;
  var hasExcalibur = rec.excaliburHistory && rec.excaliburHistory.length > 0;
  var hasLancelot = rec.lancelotFlips && Object.keys(rec.lancelotFlips).length > 0;
  var hasAssassin = !!rec.assassinTarget;
  var hasForceEnd = !!rec.forceEnded;
  var hasIdentityMarks = rec.identityMarks && rec.identityMarks.length > 0;
  var hasAnyRule = hasLady || hasExcalibur || hasLancelot || hasAssassin || hasForceEnd || hasIdentityMarks;

  var goodPlayers = [], evilPlayers = [];
  for (var pi = 0; pi < ids.length; pi++) {
    var f = getFinalFaction(ids[pi].role, rec.lancelotFlips && rec.lancelotFlips[pi]);
    if (f === 'good') goodPlayers.push(pn(pi));
    else if (f === 'evil') evilPlayers.push(pn(pi));
  }
  var doneMissions = 0, failMissions = 0;
  for (var mi2 = 0; mi2 < (rec.missions || []).length; mi2++) {
    if (rec.missions[mi2].result === 'success') doneMissions++;
    else if (rec.missions[mi2].result === 'fail') failMissions++;
  }

  function calcMissionCardH(m) {
    var attempts = m.launchAttempts || [];
    if (attempts.length === 0) attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
    var h = 10 + 18 + 6;
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      h += 18;
      var voteLine = '\u6295\u7968\uff1a';
      for (var vi = 0; vi < pc; vi++) {
        var vv = getVoteValue(att.votes, vi);
        voteLine += pnShort(vi) + (vv === 'approve' ? '\u2713' : vv === 'reject' ? '\u2717' : '?') + ' ';
      }
      var approves = 0, rejects = 0;
      for (var vi2 = 0; vi2 < pc; vi2++) {
        var vv2 = getVoteValue(att.votes, vi2);
        if (vv2 === 'approve') approves++; else if (vv2 === 'reject') rejects++;
      }
      voteLine += ' \u2014 ' + approves + ':' + rejects;
      h += (tw(voteLine, 10) > contentW - 28) ? 34 : 16;
      h += 2;
    }
    if (m.result) {
      h += 18 + 10;
      if (m.result === 'success' && m.shieldedFails) h += 18;
    }
    return h;
  }

  var secH = [];
  secH.push(28 + 8 + 26 + 4 + 16 + 16);
  secH.push(16);
  secH.push(20 + Math.ceil(pc / 2) * 28 + 4);
  secH.push(16);
  var questH = 20 + 12;
  if (rec.missions) {
    for (var qi = 0; qi < rec.missions.length; qi++) {
      if (!rec.missions[qi].result) continue;
      questH += calcMissionCardH(rec.missions[qi]) + 8;
    }
    questH -= 8;
  }
  secH.push(questH + 8);
  var rulesH = 0;
  if (hasAnyRule) {
    rulesH += 20 + 8;
    if (hasLady) rulesH += 18 * rec.ladyCheckHistory.length + 4;
    if (hasExcalibur) rulesH += 18 * rec.excaliburHistory.length + 4;
    if (hasLancelot) { var lfc = 0; for (var k in rec.lancelotFlips) lfc++; rulesH += 18 * lfc + 4; }
    if (hasAssassin) rulesH += 18 + 18 + 18 + 10 + 4;
    if (hasForceEnd) rulesH += 18 + 4;
    if (hasIdentityMarks) rulesH += 18 * rec.identityMarks.length + 4;
    secH.push(rulesH + 8);
  }
  secH.push(12);
  secH.push(18 + 6 + 36 + 16 + 20);

  var totalH = PAD * 2;
  for (var si = 0; si < secH.length; si++) totalH += secH[si];
  canvas.height = Math.ceil(totalH * SCALE);
  ctx.scale(SCALE, SCALE);

  var grad = ctx.createLinearGradient(0, 0, 0, totalH);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#fff7ec');
  grad.addColorStop(1, '#ffedd8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, totalH);

  var y = PAD;
  var si = 0;

  // === Header ===
  (function() {
    var badgeText = rec.winner === 'good' ? '\u597d\u4eba\u9635\u8425\u83b7\u80dc' : '\u574f\u4eba\u9635\u8425\u83b7\u80dc';
    var badgeW = tw(badgeText, 15) + 36;
    var bx = (W - badgeW) / 2;
    rr(bx, y, badgeW, 28, 14);
    if (rec.winner === 'good') {
      var g = ctx.createLinearGradient(bx, 0, bx + badgeW, 0);
      g.addColorStop(0, '#1a6b3c'); g.addColorStop(1, '#27ae60');
      ctx.fillStyle = g;
    } else {
      var g = ctx.createLinearGradient(bx, 0, bx + badgeW, 0);
      g.addColorStop(0, '#8e1a1a'); g.addColorStop(1, '#c0392b');
      ctx.fillStyle = g;
    }
    ctx.fill();
    dt(badgeText, W/2, y + 6, 15, '#fff', 'center');
    var ty = y + 28 + 8;
    dt('\u7b2c' + (idx + 1) + '\u5c40 \u00b7 \u963f\u74e6\u9686', W/2, ty, 20, '#e65100', 'center');
    var iy = ty + 26 + 4;
    dt((rec.date || '--') + ' \u00b7 ' + (rec.playerCount || '?') + '\u4eba\u5c40', W/2, iy, 11, TXT_DIM, 'center');
  })();
  y += secH[si++];

  // === Divider ===
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Identity Reveal ===
  (function() {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
    dt('\u8eab\u4efd\u63ed\u6653', PAD + 12, y + 1, 13, TXT_SEC, 'left');
    var gridY = y + 20;
    var colW = (contentW - 12) / 2;
    for (var pi = 0; pi < pc; pi++) {
      var col = pi % 2, row = Math.floor(pi / 2);
      var px = PAD + col * (colW + 12), py = gridY + row * 28;
      var id = ids[pi], flippedS = rec.lancelotFlips && rec.lancelotFlips[pi], evil = getFinalFaction(id.role, flippedS) === 'evil';
      ctx.fillStyle = evil ? 'rgba(211,47,47,0.10)' : 'rgba(30,142,62,0.08)';
      rr(px, py, colW, 24, 6); ctx.fill();
      dt(evil ? '\u25b2' : '\u2b22', px + 8, py + 5, 10, evil ? RED : BLUE, 'left');
      dt(pn(pi), px + 22, py + 4, 13, evil ? RED : TXT, 'left', evil ? true : false);
      dt(id.role || '', px + colW - 8 - tw(id.role || '', 11), py + 5, 11, evil ? RED : BLUE, 'left', evil ? true : false);
    }
  })();
  y += secH[si++];

  // === Divider === (same as before)
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Missions ===
  (function() {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
    dt('\u4efb\u52a1\u5386\u7a0b', PAD + 12, y + 1, 13, TXT_SEC, 'left');
    var qy = y + 20 + 12;
    for (var qi = 0; qi < rec.missions.length; qi++) {
      var m = rec.missions[qi];
      if (!m.result) { qy += 8; continue; }
      var isSuc = m.result === 'success', isShielded = m.result === 'success' && m.shieldedFails, isPureSuc = m.result === 'success' && !m.failCount && !m.shieldedFails;
      var attempts = m.launchAttempts || [];
      if (attempts.length === 0) attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
      var cardH = calcMissionCardH(m);
      var cx = PAD + 16;
      ctx.fillStyle = 'rgba(230,81,0,0.05)'; rr(PAD, qy, contentW, cardH, 8); ctx.fill();
      // \u6210\u529f\u8f6e\u6b21\u7528\u91d1\u8272\u5de6\u8fb9\u6761+\u91d1\u8272\u8fb9\u6846\u9ad8\u4eae
      ctx.fillStyle = isSuc ? GOLD : RED; rr(PAD, qy + 10, 3, cardH - 20, 1.5); ctx.fill();
      if (isSuc) { ctx.strokeStyle = 'rgba(201,168,76,0.35)'; ctx.lineWidth = 1; rr(PAD, qy, contentW, cardH, 8); ctx.stroke(); }
      dt('\u4efb\u52a1 ' + (qi + 1) + ' \u00b7 ' + m.size + '\u4eba\u51fa\u6218', cx, qy + 10, 13, TXT_SEC, 'left');
      var tagText = isShielded ? ('\u2713 \u6210\u529f\uff08\u542b' + m.shieldedFails + '\u5f20\u5931\u8d25\u7968\uff09') : isPureSuc ? '\u2713 \u6210\u529f\uff08\u5168\u7968\u901a\u8fc7\uff09' : isSuc ? '\u2713 \u6210\u529f' : ('\u2717 ' + missionFailLabel(m));
      var tagW = tw(tagText, 11) + 16, tagX = PAD + contentW - 16 - tagW;
      ctx.fillStyle = isSuc ? 'rgba(30,142,62,0.14)' : 'rgba(211,47,47,0.14)'; rr(tagX, qy + 9, tagW, 18, 9); ctx.fill();
      dt(tagText, PAD + contentW - 16 - tagW / 2, qy + 11, 11, isSuc ? GREEN_BRIGHT : RED, 'center');
      var ay = qy + 10 + 18 + 8;
      for (var a = 0; a < attempts.length; a++) {
        var att = attempts[a], isLast = (a === attempts.length - 1);
        var approves = 0, rejects = 0;
        for (var vk = 0; vk < pc; vk++) {
          var vv = getVoteValue(att.votes, vk);
          if (vv === 'approve') approves++; else if (vv === 'reject') rejects++;
        }
        var passed = approves > pc / 2;
        var leader = resolvePlayerIdx(att.leader, rec.identities); if (leader < 0) leader = 0;
        var teamIndices = att.team || [];
        teamIndices = teamIndices.map(function(x) { return resolvePlayerIdx(x, rec.identities); }).filter(function(x) { return x >= 0; });
        // Draw attempt header: "第N次组队 ★X号NAME提议：A、B、C"
        var hSegs = [{ text: '\u7b2c' + (a + 1) + '\u6b21\u7ec4\u961f ', color: TXT_DIM }, { text: '\u2605' + pnShort(leader), color: GOLD }, { text: '\u63d0\u8bae\uff1a', color: TXT_DIM }];
        for (var ti = 0; ti < teamIndices.length; ti++) {
          var tiVal = (typeof teamIndices[ti] === 'number') ? teamIndices[ti] : parseInt(teamIndices[ti]);
          if (ti > 0) hSegs.push({ text: '\u3001', color: TXT_DIM });
          hSegs.push({ text: pnShort(tiVal), color: evilColor(tiVal), bold: isEvil(tiVal) });
        }
        dtSegments(cx, ay, hSegs, 11);
        ay += 18;
        // Draw vote line
        var vSegs = [{ text: '\u6295\u7968\uff1a', color: TXT_DIM }];
        for (var vi = 0; vi < pc; vi++) {
          var vvv = getVoteValue(att.votes, vi);
          vSegs.push({ text: pnShort(vi), color: evilColor(vi), bold: isEvil(vi) });
          vSegs.push({ text: (vvv === 'approve' ? '\u2713' : vvv === 'reject' ? '\u2717' : '?') + ' ', color: vvv === 'approve' ? GREEN_BRIGHT : vvv === 'reject' ? RED : TXT_DIM });
        }
        vSegs.push({ text: ' \u2014 ' + approves + ':' + rejects + ' ' + (passed ? '\u901a\u8fc7' : '\u5426\u51b3') + ' ' + (passed ? '\u2713' : '\u2717'), color: passed ? GREEN_BRIGHT : RED });
        var voteFull = ''; for (var vsi = 0; vsi < vSegs.length; vsi++) voteFull += vSegs[vsi].text;
        if (tw(voteFull, 10) > contentW - 28) {
          var v1Segs = [vSegs[0]];
          for (var vi = 0; vi < pc; vi++) { v1Segs.push(vSegs[vi * 2 + 1]); v1Segs.push(vSegs[vi * 2 + 2]); }
          dtSegments(cx, ay, v1Segs, 10); ay += 16;
          dtSegments(cx, ay, [vSegs[vSegs.length - 1]], 10); ay += 18 + 2;
        } else { dtSegments(cx, ay, vSegs, 10); ay += 16 + 2; }
      }
      // Mission result line
      if (m.result) {
        if (m.result === 'fail') {
          var fs = '\u4efb\u52a1\u7ed3\u679c\uff1a\u2717 \u5931\u8d25'; if (m.failCount) fs += '\uff08' + m.failCount + '\u5f20\u5931\u8d25\u5361\uff09';
          dt(fs, cx, ay, 12, RED, 'left');
        } else if (isShielded) {
          dt('\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f\uff08\u542b' + m.shieldedFails + '\u5f20\u5931\u8d25\u7968\uff0c\u4fdd\u62a4\u8f6e\u62b5\u6d88\uff09', cx, ay, 12, '#e65100', 'left');
          ay += 18;
          // fail card details
          var lastAtt = m.launchAttempts && m.launchAttempts.length > 0 ? m.launchAttempts[m.launchAttempts.length - 1] : null;
          var evilNames = [];
          if (lastAtt && lastAtt.team) {
            var tArr = lastAtt.team.map(function(x) { return resolvePlayerIdx(x, rec.identities); }).filter(function(x) { return x >= 0; });
            for (var ei = 0; ei < tArr.length; ei++) {
              if (isEvil(tArr[ei])) evilNames.push(pnShort(tArr[ei]));
            }
          }
          if (evilNames.length > 0) {
            dt('\u5931\u8d25\u5361\uff1a' + m.shieldedFails + '\u5f20\uff08' + evilNames.join('\u3001') + '\uff09', cx, ay, 12, RED, 'left', true);
          }
        }
        else if (isPureSuc) { dt('\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f\uff08\u5168\u7968\u901a\u8fc7\uff09', cx, ay, 12, GREEN_BRIGHT, 'left'); }
        else { dt('\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f', cx, ay, 12, GREEN_BRIGHT, 'left'); }
        ay += 18 + 10;
      }
      qy += cardH + 8;
    }
  })();
  y += secH[si++];

  // === Optional Rules ===
  if (hasAnyRule) {
    (function() {
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2); ctx.fill();
      dt(hasAssassin ? '\u523a\u6740\u9636\u6bb5' : '\u53ef\u9009\u89c4\u5219', PAD + 12, y + 1, 13, TXT_SEC, 'left');
      var ry = y + 20 + 8;
      if (hasLady) {
        for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
          var lc = rec.ladyCheckHistory[li];
          var hldr = (lc.holder != null) ? lc.holder : 0, tgt = (lc.target != null) ? lc.target : 0;
          var rl = lc.round ? '\u7b2c' + lc.round + '\u8f6e\u540e\uff1a' : '';
          var resultLabel2 = lc.result === 'good' ? '好人' : lc.result === 'evil' ? '反方' : (lc.result === 'skip' ? '不报' : (lc.result || '?'));
          dt(rl + pn(hldr) + ' \u67e5\u9a8c ' + pn(tgt) + ' \u2192 ', PAD + 12, ry, 12, TXT, 'left');
          dt(resultLabel2, PAD + 12 + tw(rl + pn(hldr) + ' \u67e5\u9a8c ' + pn(tgt) + ' \u2192 ', 12), ry, 12, resultLabel2 === '反方' ? RED : GREEN_BRIGHT, 'left', true);
          ry += 18;
        }
        ry += 4;
      }
      if (hasExcalibur) {
        for (var exi = 0; exi < rec.excaliburHistory.length; exi++) {
          var ex = rec.excaliburHistory[exi];
          var desc = '\u738b\u8005\u4e4b\u5251\uff1a' + (ex.holderName || '') + ' \u6388\u4e88 ' + (ex.targetName || '') + (ex.used ? '\uff08\u5df2\u4f7f\u7528\uff09' : '\uff08\u672a\u4f7f\u7528\uff09');
          dt(desc, PAD + 12, ry, 12, TXT_SEC, 'left'); ry += 18;
        }
        ry += 4;
      }
      if (hasLancelot) {
        for (var lfKey in rec.lancelotFlips) {
          if (ids[lfKey]) {
            var pIdx = (ids[lfKey].index != null ? ids[lfKey].index : parseInt(lfKey));
            var origF = getPlayerFaction(ids[lfKey].role);
            var afterL = (origF === 'good') ? '\u7ea2\u65b9(\u574f\u4eba)' : (origF === 'evil') ? '\u84dd\u65b9(\u597d\u4eba)' : '?';
            dt('\u5170\u65af\u6d1b\u7279\u53d8\u8282: ' + pn(pIdx) + ' ' + ids[lfKey].role + ' \u2192 ' + afterL, PAD + 12, ry, 12, '#e65100', 'left');
            ry += 18;
          }
        }
        ry += 4;
      }
      if (hasAssassin) {
        var aboxY = ry - 4, aboxH = 18 + 18 + 18 + 10;
        ctx.fillStyle = 'rgba(211,47,47,0.10)'; rr(PAD, aboxY, contentW, aboxH, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(211,47,47,0.35)'; ctx.lineWidth = 1; rr(PAD, aboxY, contentW, aboxH, 8); ctx.stroke();
        dt('\u597d\u4eba\u5b8c\u6210' + doneMissions + '\u6b21\u4efb\u52a1 \u2192 \u8fdb\u5165\u523a\u6740\u9636\u6bb5', PAD + 12, aboxY + 6, 12, RED, 'left');
        dt('\u523a\u5ba2\u731c\u6d4b\u6885\u6797\u662f ' + (rec.assassinTarget || ''), PAD + 12, aboxY + 6 + 18, 12, TXT, 'left');
        var hitT = rec.assassinSuccess ? '\u731c\u5bf9\u4e86!' : '\u731c\u9519\u4e86!';
        dt(hitT, PAD + 12 + tw('\u523a\u5ba2\u731c\u6d4b\u6885\u6797\u662f ' + (rec.assassinTarget || ''), 12), aboxY + 6 + 18, 12, rec.assassinSuccess ? RED : GREEN_BRIGHT, 'left');
        dt(rec.assassinSuccess ? '\u574f\u4eba\u901a\u8fc7\u523a\u6740\u6885\u6797\u9006\u8f6c\u83b7\u80dc' : '\u597d\u4eba\u62b5\u5fa1\u523a\u6740\u83b7\u80dc', PAD + 12, aboxY + 6 + 36, 11, TXT_DIM, 'left');
        ry = aboxY + aboxH + 4;
      }
      if (hasForceEnd) { dt('\u5f3a\u5236\u7ed3\u675f: ' + (rec.forceEndReason || '\u672a\u77e5\u539f\u56e0'), PAD + 12, ry, 12, '#e65100', 'left'); ry += 18 + 4; }
      if (hasIdentityMarks) {
        for (var mi3 = 0; mi3 < rec.identityMarks.length; mi3++) {
          var mk = rec.identityMarks[mi3];
          dt((mk.targetName || mk.target) + ' [' + (mk.level === 'high' ? '\u9ad8' : mk.level === 'mid' ? '\u4e2d' : '\u4f4e') + ']', PAD + 12, ry, 12, TXT_SEC, 'left');
          ry += 18;
        }
      }
    })();
    y += secH[si++];
  }

  // === Bottom Divider === (same)
  (function() {
    var dy = y + 6;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, '#e65100'); g.addColorStop(0.7, '#e65100'); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  })();
  y += secH[si++];

  // === Footer ===
  (function() {
    dt('\u4efb\u52a1\uff1a' + doneMissions + '\u2713 ' + failMissions + '\u2717', PAD, y, 12, TXT_DIM, 'left');
    dt('\u597d\u4eba\u9635\u7ebf\uff1a' + goodPlayers.join('\u3001'), PAD, y + 18, 12, TXT_DIM, 'left');
    dt('\u574f\u4eba\u9635\u7ebf\uff1a' + evilPlayers.join('\u3001'), PAD, y + 36, 12, TXT_DIM, 'left');
    ctx.fillStyle = '#8a6d4f'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '10px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.fillText('\u963f\u74e6\u9686 \u00b7 The Resistance Avalon', W / 2, totalH - PAD);
  })();

  canvas.toBlob(function(blob) {
    if (!blob) {
      console.error('[Screenshot] generateGameScreenshot canvas.toBlob returned null');
      toast('\u622a\u56fe\u5931\u8d25\uff1ablob \u4e3a\u7a7a', 'error');
      return;
    }
    var dateStr = (rec.date || 'unknown').replace(/[\/\s:]/g, '-');
    var fileName = '\u963f\u74e6\u9686\u7b2c' + (idx + 1) + '\u5c40_' + dateStr + '.png';
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
  }, 'image/png');
  console.log('[Screenshot] Game screenshot generated, idx=' + idx + ', canvas=' + (canvas ? canvas.width + 'x' + canvas.height : 'null'));
  // 调试：输出文字版任务和投票数据
  var debugText = '[Screenshot DEBUG] idx=' + idx + ' players=' + ids.length + '\n';
  for (var mi4 = 0; mi4 < rec.missions.length; mi4++) {
    var m2 = rec.missions[mi4];
    debugText += '  Mission ' + (mi4+1) + ' (size=' + m2.size + ', result=' + (m2.result||'?') + '):\n';
    var atts2 = m2.launchAttempts || [];
    if (atts2.length === 0) atts2 = [{ leader: m2.leader, team: m2.team, votes: m2.votes || {} }];
    for (var a2 = 0; a2 < atts2.length; a2++) {
      var att2 = atts2[a2];
      debugText += '    Attempt ' + (a2+1) + ' leader=' + att2.leader + ' team=[' + (att2.team||[]).join(',') + ']\n';
      var voteKeys = Object.keys(att2.votes || {});
      debugText += '    votes keys: [' + voteKeys.join(',') + ']\n';
      for (var vi3 = 0; vi3 < ids.length; vi3++) {
        var pnLabel = pn(vi3);
        var v1 = att2.votes[vi3];
        var vS = att2.votes[String(vi3)];
        var vPN = att2.votes[pnLabel];
        debugText += '      p' + vi3 + ' (' + pnLabel + '): n=' + v1 + ' s=' + vS + ' pn=' + vPN + '\n';
      }
    }
  }
  console.log(debugText);
} catch(e) {
  console.error('[Screenshot] generateGameScreenshot error:', e);
  toast('\u622a\u56fe\u5931\u8d25\uff1a' + e.message, 'error');
}
}
/* ==================== HISTORY EDIT ==================== */
/* ==================== v196：历史记录全字段编辑器（按唯一标识定位） ==================== */
var HCE_ROLES = ['梅林', '派西维尔', '忠臣', '莫甘娜', '刺客', '莫德雷德', '奥伯伦', '爪牙', '兰斯洛特(蓝)', '兰斯洛特(红)', '混子'];

function hceE() { return (window._hce && window._hce.E) ? window._hce.E : null; }
function hceVal(id) { var el = document.getElementById(id); return el ? el.value : null; }
function hceChk(id) { var el = document.getElementById(id); return el ? !!el.checked : false; }
function hceNum(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

function hceNameAt(ids, idx) {
  if (!ids || idx == null || idx < 0 || idx >= ids.length) return '';
  return ids[idx].n || '';
}

function hceLabelAt(ids, idx) {
  if (idx == null || idx < 0) return '';
  return (idx + 1) + '号 ' + hceNameAt(ids, idx);
}

function hceIsProtectRound(mi, pc) { return (mi | 0) === 3 && (pc || 0) !== 6; }

// 单次提案的投票统计（同意票 > 人数一半即通过，与对局中判定口径一致）
function hceAttemptStat(att, pc) {
  var ap = 0, rj = 0;
  var n = pc || 0;
  for (var k = 0; k < n; k++) {
    var v = att.votes[k];
    if (v === 'approve') ap++;
    else if (v === 'reject') rj++;
  }
  return { ap: ap, rj: rj, pass: ap > n / 2 };
}

// 失败票归属上限：失败轮 = 失败票数（保护轮最多 2）；成功轮 = 最多 1 张（保护轮或抵消过失败票）
function hceFvLimit(mi, mm, teamLen, pc) {
  if (!mm.res) return 0;
  if (mm.res === 'fail') {
    var fc = hceNum(mm.fc);
    if (fc <= 0) return teamLen > 0 ? teamLen : (pc || 0);
    if (hceIsProtectRound(mi, pc)) return Math.min(fc, 2);
    return fc;
  }
  return 1;
}

function hcePlayerOptions(ids, sel, allowNone) {
  var h = '';
  if (allowNone) h += '<option value="-1"' + (sel < 0 ? ' selected' : '') + '>无</option>';
  for (var i = 0; i < ids.length; i++) {
    h += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + escAttr((i + 1) + '号 ' + (ids[i].n || '')) + '</option>';
  }
  return h;
}

/* ---------- 从记录构建编辑模型 ---------- */
function hceBuildFromRaw(raw) {
  var rec = normalizeRecord(raw);
  if (!rec) return null;
  var ids = [];
  var srcIds = rec.identities || [];
  for (var i = 0; i < srcIds.length; i++) {
    var pi = (srcIds[i].index != null) ? srcIds[i].index : i;
    ids.push({
      i: pi,
      n: srcIds[i].name || '',
      r: srcIds[i].role || '',
      f: !!(rec.lancelotFlips && rec.lancelotFlips[pi])
    });
  }
  var pc = rec.playerCount || ids.length;
  var E = {
    key: recKeyOf(raw),
    date: rec.date || '',
    st: rec.startTime || '',
    et: rec.endTime || '',
    w: (rec.winner === 'evil') ? 'evil' : 'good',
    at: resolvePlayerIdx(rec.assassinTarget, ids),
    as: !!rec.assassinSuccess,
    aar: (rec.assassinAfterRound != null ? rec.assassinAfterRound : 0),
    afm: !!rec.assassinFromMission,
    players: ids,
    pc: pc,
    missions: [],
    lch: [],
    ex: []
  };
  if (E.at < 0) E.at = -1;

  var ms = rec.missions || [];
  for (var mi = 0; mi < ms.length; mi++) {
    var m = ms[mi] || {};
    var mm = {
      res: m.result || '',
      res0: m.result || '',   // v196：原始任务结果，投票由否决切回通过时用于恢复
      fc: (m.failCount || 0),
      ld: resolvePlayerIdx(m.leader, ids),
      team: historyExecutedTeamIdx(rec, mi),
      fv: [],
      attempts: []
    };
    if (mm.ld < 0) mm.ld = 0;
    var fvArr = failVotersArray(m);
    for (var fi = 0; fi < fvArr.length; fi++) {
      var fvi = resolvePlayerIdx(fvArr[fi], ids);
      if (fvi >= 0 && mm.fv.indexOf(fvi) === -1) mm.fv.push(fvi);
    }
    var la = m.launchAttempts || [];
    if (la.length) {
      for (var ai = 0; ai < la.length; ai++) {
        var att = la[ai] || {};
        var na = { ld: resolvePlayerIdx(att.leader, ids), team: [], votes: {} };
        if (na.ld < 0) na.ld = mm.ld;
        var tt = att.team || [];
        for (var ti = 0; ti < tt.length; ti++) {
          var tvi = resolvePlayerIdx(tt[ti], ids);
          if (tvi >= 0 && na.team.indexOf(tvi) === -1) na.team.push(tvi);
        }
        na.team.sort(function(a, b) { return a - b; });
        var vv = att.votes || {};
        for (var vk in vv) {
          var vki = resolvePlayerIdx(vk, ids);
          if (vki >= 0) na.votes[vki] = (vv[vk] === 'approve' ? 'approve' : 'reject');
        }
        mm.attempts.push(na);
      }
    } else {
      var base = { ld: mm.ld, team: mm.team.slice(), votes: {} };
      var v0 = m.votes || {};
      for (var vk2 in v0) {
        var vk2i = resolvePlayerIdx(vk2, ids);
        if (vk2i >= 0) base.votes[vk2i] = (v0[vk2] === 'approve' ? 'approve' : 'reject');
      }
      mm.attempts.push(base);
    }
    E.missions.push(mm);
  }

  var lch = rec.ladyCheckHistory || [];
  for (var li = 0; li < lch.length; li++) {
    var hh = lch[li] || {};
    E.lch.push({
      r: (hh.round != null ? hh.round : li + 1),
      h: resolvePlayerIdx(hh.holder, ids),
      t: resolvePlayerIdx(hh.target, ids),
      res: hh.result || ''
    });
  }

  var ex = rec.excaliburHistory || [];
  for (var ei = 0; ei < ex.length; ei++) {
    var ee = ex[ei] || {};
    E.ex.push({
      r: (ee.round != null ? ee.round : ei + 1),
      ld: resolvePlayerIdx(ee.leader, ids),
      h: resolvePlayerIdx(ee.holder, ids),
      u: !!ee.used,
      t: resolvePlayerIdx(ee.target, ids),
      cd: ee.claimedDirection || ''
    });
  }
  return E;
}

/* ---------- 打开编辑器 ---------- */
function openHistoryEdit(ref) {
  var history = loadHistory();
  var idx = resolveHistoryIdx(ref, history);
  if (idx < 0) { toast('未找到该条记录（可能已被删除）', 'warn'); return; }
  var E = hceBuildFromRaw(history[idx]);
  if (!E) { toast('记录解析失败', 'warn'); return; }
  window._hce = { key: E.key, E: E };
  var overlay = document.getElementById('hci-modal-overlay');
  if (!overlay) {   // v196：详情弹窗不存在时自建，保证任何入口都能进入编辑器
    overlay = document.createElement('div');
    overlay.className = 'hci-modal-overlay';
    overlay.id = 'hci-modal-overlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeHistoryEdit(); });
    document.body.appendChild(overlay);
  }
  var h = '';
  h += '<div class="hci-modal hce-modal">';
  h += '<div class="hci-modal-header">';
  h += '<span class="hci-modal-date">编辑记录 · 全字段</span>';
  h += '<button class="hci-modal-close" onclick="closeHistoryEdit()">&times;</button>';
  h += '</div>';
  h += '<div class="hci-modal-body" id="hce-body"></div>';
  h += '<div class="hci-modal-footer" style="gap:8px">';
  h += '<button class="btn" onclick="closeHistoryEdit()">取消</button>';
  h += '<button class="btn primary" onclick="saveHistoryEdit()">保存</button>';
  h += '</div>';
  h += '</div>';
  overlay.innerHTML = h;
  hceRenderBody();
}

function closeHistoryEdit() {
  var key = window._hce ? window._hce.key : '';
  window._hce = null;
  if (key) openHistoryModal(key); else closeHistoryModal();
}

/* ---------- 渲染 ---------- */
function hceRenderBody() {
  var E = hceE();
  if (!E) return;
  var body = document.getElementById('hce-body');
  if (!body) return;
  var ids = E.players;
  var pc = E.pc || ids.length;
  var h = '';
  var i, mi, ai, pi;

  // 基本信息
  h += '<div class="hce-sec">';
  h += '<div class="hce-sec-title">基本信息</div>';
  h += '<div class="hce-row"><label>日期</label><input type="date" id="hce-date" value="' + escAttr(E.date) + '" onchange="hceSyncScalars()"></div>';
  h += '<div class="hce-row"><label>开始</label><input type="text" id="hce-st" value="' + escAttr(E.st) + '" placeholder="YYYY-MM-DD HH:MM:SS" onchange="hceSyncScalars()"></div>';
  h += '<div class="hce-row"><label>结束</label><input type="text" id="hce-et" value="' + escAttr(E.et) + '" placeholder="YYYY-MM-DD HH:MM:SS" onchange="hceSyncScalars()"></div>';
  h += '<div class="hce-row"><label>胜负</label><select id="hce-w" onchange="hceSyncScalars()">'
    + '<option value="good"' + (E.w === 'good' ? ' selected' : '') + '>好人方胜</option>'
    + '<option value="evil"' + (E.w === 'evil' ? ' selected' : '') + '>反方胜</option></select></div>';
  h += '<div class="hce-row"><label>刺客点名</label><select id="hce-at" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, E.at, true) + '</select></div>';
  h += '<div class="hce-row"><label>刺杀结果</label><select id="hce-as" onchange="hceSyncScalars()">'
    + '<option value="0"' + (!E.as ? ' selected' : '') + '>未刺杀成功</option>'
    + '<option value="1"' + (E.as ? ' selected' : '') + '>刺杀成功</option></select></div>';
  h += '<div class="hce-row"><label>刺杀轮次</label><input type="number" min="0" id="hce-aar" value="' + hceNum(E.aar) + '" onchange="hceSyncScalars()"></div>';
  h += '<div class="hce-row"><label>刺杀源自任务失败</label><select id="hce-afm" onchange="hceSyncScalars()">'
    + '<option value="0"' + (!E.afm ? ' selected' : '') + '>否</option>'
    + '<option value="1"' + (E.afm ? ' selected' : '') + '>是</option></select></div>';
  h += '</div>';

  // 玩家与身份
  h += '<div class="hce-sec">';
  h += '<div class="hce-sec-title">玩家与身份（身份决定阵营，变节仅兰斯洛特）</div>';
  for (i = 0; i < ids.length; i++) {
    var roleList = HCE_ROLES.slice();
    if (ids[i].r && roleList.indexOf(ids[i].r) === -1) roleList.push(ids[i].r);
    h += '<div class="hce-prow">';
    h += '<span class="hce-pnum">' + (i + 1) + '号</span>';
    h += '<input type="text" class="hce-pname" id="hce-pn-' + i + '" value="' + escAttr(ids[i].n || '') + '" placeholder="玩家名" onchange="hceSyncScalars()">';
    h += '<select class="hce-prole" id="hce-pr-' + i + '" onchange="hceSyncScalars()">';
    for (var ri = 0; ri < roleList.length; ri++) {
      h += '<option value="' + escAttr(roleList[ri]) + '"' + (roleList[ri] === ids[i].r ? ' selected' : '') + '>' + escAttr(roleList[ri]) + '</option>';
    }
    h += '</select>';
    h += '<label class="hce-flip"><input type="checkbox" id="hce-pf-' + i + '"' + (ids[i].f ? ' checked' : '') + ' onchange="hceSyncScalars()">变节</label>';
    h += '</div>';
  }
  h += '</div>';

  // 每轮任务
  for (mi = 0; mi < E.missions.length; mi++) {
    var mm = E.missions[mi];
    var teamLen = mm.team.length;
    h += '<div class="hce-sec hce-mission">';
    h += '<div class="hce-sec-title">第' + (mi + 1) + '轮任务' + (hceIsProtectRound(mi, pc) ? ' · 保护轮' : '') + '</div>';
    h += '<div class="hce-row"><label>任务结果</label><select id="hce-mres-' + mi + '" onchange="hceSyncScalars()">'
      + '<option value=""' + (!mm.res ? ' selected' : '') + '>未判定（被否提案）</option>'
      + '<option value="success"' + (mm.res === 'success' ? ' selected' : '') + '>成功</option>'
      + '<option value="fail"' + (mm.res === 'fail' ? ' selected' : '') + '>失败</option></select></div>';
    h += '<div class="hce-row"><label>任务队长</label><select id="hce-mld-' + mi + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, mm.ld, false) + '</select></div>';
    h += '<div class="hce-row"><label>失败票数</label><input type="number" min="0" id="hce-mfc-' + mi + '" value="' + hceNum(mm.fc) + '" onchange="hceSyncScalars()"></div>';

    h += '<div class="hce-sub">执行队伍（点选切换，当前 ' + teamLen + ' 人）</div><div class="hce-chips">';
    for (pi = 0; pi < ids.length; pi++) {
      h += '<button type="button" class="hce-chip' + (mm.team.indexOf(pi) !== -1 ? ' on' : '') + '" data-mi="' + mi + '" data-p="' + pi + '" onclick="hceToggleTeam(this)">'
        + escAttr((pi + 1) + '号 ' + (ids[pi].n || '')) + '</button>';
    }
    h += '</div>';

    h += '<div class="hce-sub">投票过程（共 ' + mm.attempts.length + ' 次提案）</div>';
    for (ai = 0; ai < mm.attempts.length; ai++) {
      var att = mm.attempts[ai];
      var st = hceAttemptStat(att, pc);
      h += '<div class="hce-att">';
      h += '<div class="hce-att-head">';
      h += '<span class="hce-att-name">第 ' + (ai + 1) + ' 次提案</span>';
      h += '<span class="hce-att-stat ' + (st.pass ? 'pass' : 'reject') + '">同意 ' + st.ap + ' : 反对 ' + st.rj + ' · ' + (st.pass ? '通过' : '否决') + '</span>';
      if (mm.attempts.length > 1) {
        h += '<button type="button" class="hce-mini danger" data-mi="' + mi + '" data-ai="' + ai + '" onclick="hceDelAttempt(this)">删除</button>';
      }
      h += '</div>';
      h += '<div class="hce-row"><label>提案队长</label><select id="hce-attld-' + mi + '-' + ai + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, att.ld, false) + '</select></div>';
      h += '<div class="hce-chips">';
      for (pi = 0; pi < ids.length; pi++) {
        h += '<button type="button" class="hce-chip small' + (att.team.indexOf(pi) !== -1 ? ' on' : '') + '" data-mi="' + mi + '" data-ai="' + ai + '" data-p="' + pi + '" onclick="hceToggleAttemptTeam(this)">' + (pi + 1) + '号</button>';
      }
      h += '</div>';
      h += '<div class="hce-votes">';
      for (var pk = 0; pk < ids.length; pk++) {
        var v = att.votes[pk];
        h += '<div class="hce-vrow">';
        h += '<span class="hce-vname">' + escAttr((pk + 1) + '号 ' + (ids[pk].n || '')) + '</span>';
        h += '<button type="button" class="hce-vbtn ap' + (v === 'approve' ? ' on' : '') + '" data-mi="' + mi + '" data-ai="' + ai + '" data-p="' + pk + '" data-v="approve" onclick="hceSetVote(this)">同意</button>';
        h += '<button type="button" class="hce-vbtn rj' + (v === 'reject' ? ' on' : '') + '" data-mi="' + mi + '" data-ai="' + ai + '" data-p="' + pk + '" data-v="reject" onclick="hceSetVote(this)">反对</button>';
        h += '</div>';
      }
      h += '</div>';
      h += '</div>';
    }

    h += '<div class="hce-btns">';
    h += '<button type="button" class="btn small" data-mi="' + mi + '" onclick="hceAddAttempt(this)">+ 增加提案</button>';
    h += '<button type="button" class="btn small" data-mi="' + mi + '" onclick="hceRecalcMission(this)">按投票重算本轮</button>';
    h += '</div>';

    // 失败票归属
    var fvLimit = hceFvLimit(mi, mm, teamLen, pc);
    if (fvLimit > 0) {
      var cand = failVoterCandidateIdx(mm.team, mm.fv);
      if (!cand.length) {
        h += '<div class="hce-sub">失败票归属（该轮无执行队伍，无法指定）</div>';
      } else {
        h += '<div class="hce-sub">失败票归属（上限 ' + fvLimit + ' 人，候选仅该轮执行队伍）</div><div class="hce-chips">';
        for (pi = 0; pi < cand.length; pi++) {
          var pn = cand[pi];
          var inTeam = mm.team.indexOf(pn) !== -1;
          var mark = inTeam ? '<span class="hce-team">队</span>' : '<span class="hce-out">非队内</span>';
          h += '<button type="button" class="hce-chip fv' + (mm.fv.indexOf(pn) !== -1 ? ' on' : '') + '" data-mi="' + mi + '" data-p="' + pn + '" onclick="hceToggleFv(this)">'
            + escAttr((pn + 1) + '号 ' + (ids[pn] ? ids[pn].n || '' : '')) + mark + '</button>';
        }
        h += '</div>';
      }
    }
    h += '</div>';
  }

  // 湖中女神
  h += '<div class="hce-sec">';
  h += '<div class="hce-sec-title">湖中女神验证</div>';
  if (!E.lch.length) {
    h += '<div class="hce-empty">无记录</div>';
  }
  for (i = 0; i < E.lch.length; i++) {
    var lc = E.lch[i];
    h += '<div class="hce-line">';
    h += '<span class="hce-lnum">第</span><input type="number" min="1" class="hce-lr" id="hce-lr-' + i + '" value="' + hceNum(lc.r) + '" onchange="hceSyncScalars()"><span class="hce-lnum">轮</span>';
    h += '<select id="hce-lh-' + i + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, lc.h, true) + '</select>';
    h += '<span class="hce-arrow">查</span>';
    h += '<select id="hce-lt-' + i + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, lc.t, true) + '</select>';
    h += '<select id="hce-lres-' + i + '" onchange="hceSyncScalars()">'
      + '<option value="good"' + (lc.res === 'good' ? ' selected' : '') + '>好人</option>'
      + '<option value="evil"' + (lc.res === 'evil' ? ' selected' : '') + '>反方</option>'
      + '<option value="skip"' + (lc.res === 'skip' ? ' selected' : '') + '>不报</option>'
      + '<option value="unknown"' + (lc.res === 'unknown' ? ' selected' : '') + '>未说明</option>'
      + '<option value="refused"' + (lc.res === 'refused' ? ' selected' : '') + '>拒绝说明</option>'
      + '<option value=""' + (!lc.res ? ' selected' : '') + '>未记录</option></select>';
    h += '<button type="button" class="hce-mini danger" data-li="' + i + '" onclick="hceDelLch(this)">删</button>';
    h += '</div>';
  }
  h += '<div class="hce-btns"><button type="button" class="btn small" onclick="hceAddLch()">+ 增加一条验证</button></div>';
  h += '</div>';

  // 王者之剑
  h += '<div class="hce-sec">';
  h += '<div class="hce-sec-title">王者之剑</div>';
  if (!E.ex.length) {
    h += '<div class="hce-empty">无记录</div>';
  }
  for (i = 0; i < E.ex.length; i++) {
    var exr = E.ex[i];
    h += '<div class="hce-line">';
    h += '<span class="hce-lnum">第</span><input type="number" min="1" class="hce-lr" id="hce-exr-' + i + '" value="' + hceNum(exr.r) + '" onchange="hceSyncScalars()"><span class="hce-lnum">轮</span>';
    h += '<select id="hce-exh-' + i + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, exr.h, true) + '</select>';
    h += '<span class="hce-arrow">给</span>';
    h += '<select id="hce-ext-' + i + '" onchange="hceSyncScalars()">' + hcePlayerOptions(ids, exr.t, true) + '</select>';
    h += '<select id="hce-exu-' + i + '" onchange="hceSyncScalars()">'
      + '<option value="0"' + (!exr.u ? ' selected' : '') + '>未使用</option>'
      + '<option value="1"' + (exr.u ? ' selected' : '') + '>已使用</option></select>';
    h += '<select id="hce-excd-' + i + '" onchange="hceSyncScalars()">'
      + '<option value="fail_to_success"' + (exr.cd === 'fail_to_success' ? ' selected' : '') + '>失败→成功</option>'
      + '<option value="success_to_fail"' + (exr.cd === 'success_to_fail' ? ' selected' : '') + '>成功→失败</option>'
      + '<option value="unknown"' + (exr.cd === 'unknown' ? ' selected' : '') + '>未说明</option>'
      + '<option value="refused"' + (exr.cd === 'refused' ? ' selected' : '') + '>拒绝说明</option>'
      + '<option value=""' + (!exr.cd ? ' selected' : '') + '>待反馈</option></select>';
    h += '<button type="button" class="hce-mini danger" data-ei="' + i + '" onclick="hceDelEx(this)">删</button>';
    h += '</div>';
  }
  h += '<div class="hce-btns"><button type="button" class="btn small" onclick="hceAddEx()">+ 增加一条王者之剑</button></div>';
  h += '</div>';

  body.innerHTML = h;
}

/* ---------- 表单 → 模型 ---------- */
function hceSyncScalars() {
  var E = hceE();
  if (!E) return;
  var t;
  t = hceVal('hce-date'); if (t !== null) E.date = t;
  t = hceVal('hce-st'); if (t !== null) E.st = t;
  t = hceVal('hce-et'); if (t !== null) E.et = t;
  t = hceVal('hce-w'); if (t !== null) E.w = (t === 'evil' ? 'evil' : 'good');
  t = hceVal('hce-at'); if (t !== null) E.at = parseInt(t, 10);
  t = hceVal('hce-as'); if (t !== null) E.as = (t === '1');
  t = hceVal('hce-aar'); if (t !== null) E.aar = hceNum(t);
  t = hceVal('hce-afm'); if (t !== null) E.afm = (t === '1');

  for (var i = 0; i < E.players.length; i++) {
    t = hceVal('hce-pn-' + i); if (t !== null) E.players[i].n = String(t).trim();
    t = hceVal('hce-pr-' + i); if (t !== null) E.players[i].r = t;
    var fel = document.getElementById('hce-pf-' + i);
    if (fel) E.players[i].f = !!fel.checked;
  }

  for (var mi = 0; mi < E.missions.length; mi++) {
    var mm = E.missions[mi];
    t = hceVal('hce-mres-' + mi); if (t !== null) mm.res = t;
    t = hceVal('hce-mld-' + mi); if (t !== null) mm.ld = parseInt(t, 10);
    t = hceVal('hce-mfc-' + mi); if (t !== null) mm.fc = hceNum(t);
    for (var ai = 0; ai < mm.attempts.length; ai++) {
      t = hceVal('hce-attld-' + mi + '-' + ai);
      if (t !== null) mm.attempts[ai].ld = parseInt(t, 10);
    }
  }

  for (var li = 0; li < E.lch.length; li++) {
    t = hceVal('hce-lr-' + li); if (t !== null) E.lch[li].r = hceNum(t);
    t = hceVal('hce-lh-' + li); if (t !== null) E.lch[li].h = parseInt(t, 10);
    t = hceVal('hce-lt-' + li); if (t !== null) E.lch[li].t = parseInt(t, 10);
    t = hceVal('hce-lres-' + li); if (t !== null) E.lch[li].res = t;
  }

  for (var ei = 0; ei < E.ex.length; ei++) {
    t = hceVal('hce-exr-' + ei); if (t !== null) E.ex[ei].r = hceNum(t);
    t = hceVal('hce-exh-' + ei); if (t !== null) E.ex[ei].h = parseInt(t, 10);
    t = hceVal('hce-ext-' + ei); if (t !== null) E.ex[ei].t = parseInt(t, 10);
    t = hceVal('hce-exu-' + ei); if (t !== null) E.ex[ei].u = (t === '1');
    t = hceVal('hce-excd-' + ei); if (t !== null) E.ex[ei].cd = t;
  }
}

/* ---------- 交互 ---------- */
function hceToggleIn(arr, val) {
  var pos = arr.indexOf(val);
  if (pos === -1) { arr.push(val); arr.sort(function(a, b) { return a - b; }); return true; }
  arr.splice(pos, 1);
  return false;
}

function hceToggleTeam(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  var p = parseInt(btn.getAttribute('data-p'), 10);
  if (isNaN(mi) || isNaN(p) || !E.missions[mi]) return;
  hceToggleIn(E.missions[mi].team, p);
  hceRenderBody();
}

function hceToggleAttemptTeam(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  var ai = parseInt(btn.getAttribute('data-ai'), 10);
  var p = parseInt(btn.getAttribute('data-p'), 10);
  if (isNaN(mi) || isNaN(ai) || isNaN(p)) return;
  var mm = E.missions[mi];
  if (!mm || !mm.attempts[ai]) return;
  hceToggleIn(mm.attempts[ai].team, p);
  // 最后一次提案的队伍变化需联动本轮执行队伍
  if (ai === mm.attempts.length - 1) hceApplyVerdict(mi, true);
  hceRenderBody();
}

// 逐人切换 同意 / 反对
function hceSetVote(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  var ai = parseInt(btn.getAttribute('data-ai'), 10);
  var p = parseInt(btn.getAttribute('data-p'), 10);
  var v = btn.getAttribute('data-v');
  if (isNaN(mi) || isNaN(ai) || isNaN(p)) return;
  var mm = E.missions[mi];
  if (!mm || !mm.attempts[ai]) return;
  var att = mm.attempts[ai];
  if (att.votes[p] === v) delete att.votes[p];
  else att.votes[p] = (v === 'approve' ? 'approve' : 'reject');
  // 最后一轮提案的投票直接决定本轮通过/否决，切换后立即重算
  if (ai === mm.attempts.length - 1) hceApplyVerdict(mi, true);
  hceRenderBody();
}

function hceToggleFv(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  var p = parseInt(btn.getAttribute('data-p'), 10);
  if (isNaN(mi) || isNaN(p)) return;
  var mm = E.missions[mi];
  if (!mm) return;
  var limit = hceFvLimit(mi, mm, mm.team.length, E.pc);
  var on = mm.fv.indexOf(p) !== -1;
  if (!on && limit > 0 && mm.fv.length >= limit) {
    toast('本轮失败票归属最多 ' + limit + ' 人，请先取消其他人', 'warn');
    return;
  }
  hceToggleIn(mm.fv, p);
  hceSyncVoteDerived();
  hceRenderBody();
}

// 队伍/结果变化后清理不合规的失败票归属（不改结果，仅保持数据自洽）
function hceSyncVoteDerived() {
  var E = hceE();
  if (!E) return;
  for (var mi = 0; mi < E.missions.length; mi++) {
    var mm = E.missions[mi];
    var limit = hceFvLimit(mi, mm, mm.team.length, E.pc);
    if (limit <= 0) { mm.fv = []; continue; }
    if (mm.fv.length > limit) mm.fv = mm.fv.slice(0, limit);
  }
}

function hceAddAttempt(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  if (isNaN(mi) || !E.missions[mi]) return;
  var mm = E.missions[mi];
  var last = mm.attempts[mm.attempts.length - 1];
  mm.attempts.push({ ld: last ? last.ld : mm.ld, team: [], votes: {} });
  hceRenderBody();
}

function hceDelAttempt(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  var ai = parseInt(btn.getAttribute('data-ai'), 10);
  if (isNaN(mi) || isNaN(ai)) return;
  var mm = E.missions[mi];
  if (!mm || mm.attempts.length <= 1) return;
  mm.attempts.splice(ai, 1);
  hceRenderBody();
}

// 按最后一次提案的投票结果重算「通过/否决」相关字段（投票切换时自动调用，也可手动触发）：
//   通过 → 执行队伍 = 最后一次提案队伍、队长 = 提案队长（结果保持用户选择）
//   否决 → 执行队伍清空、结果置为未判定（与被否提案不产生任务结果的规则一致）
function hceApplyVerdict(mi, silent) {
  var E = hceE();
  if (!E) return null;
  var mm = E.missions[mi];
  if (!mm || !mm.attempts.length) return null;
  var att = mm.attempts[mm.attempts.length - 1];
  var st = hceAttemptStat(att, E.pc);
  if (st.pass) {
    mm.team = att.team.slice();
    mm.team.sort(function(a, b) { return a - b; });
    mm.ld = att.ld;
    // v196：由否决切回通过时恢复原本的任务结果，避免投票来回切换后结果被永久清空
    if (!mm.res) mm.res = mm.res0 || '';
  } else {
    mm.team = [];
    mm.res = '';
    mm.fv = [];
  }
  hceSyncVoteDerived();
  if (!silent) toast('第' + (mi + 1) + '轮判定：' + (st.pass ? '通过' : '否决') + '（同意 ' + st.ap + ' : 反对 ' + st.rj + '）', 'ok');
  return st;
}

function hceRecalcMission(btn) {
  hceSyncScalars();
  var mi = parseInt(btn.getAttribute('data-mi'), 10);
  if (isNaN(mi)) return;
  hceApplyVerdict(mi, false);
  hceRenderBody();
}

function hceAddLch() {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  E.lch.push({ r: E.lch.length + 1, h: -1, t: -1, res: '' });
  hceRenderBody();
}

function hceDelLch(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var li = parseInt(btn.getAttribute('data-li'), 10);
  if (isNaN(li)) return;
  E.lch.splice(li, 1);
  hceRenderBody();
}

function hceAddEx() {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  E.ex.push({ r: E.ex.length + 1, ld: -1, h: -1, u: false, t: -1, cd: '' });
  hceRenderBody();
}

function hceDelEx(btn) {
  hceSyncScalars();
  var E = hceE();
  if (!E) return;
  var ei = parseInt(btn.getAttribute('data-ei'), 10);
  if (isNaN(ei)) return;
  E.ex.splice(ei, 1);
  hceRenderBody();
}

/* ---------- 保存 ---------- */
function saveHistoryEdit() {
  var E = hceE();
  if (!E) return;
  hceSyncScalars();
  var history = loadHistory();
  var idx = resolveHistoryIdx(window._hce.key, history);
  if (idx < 0) { toast('记录已不存在，无法保存', 'warn'); return; }
  var raw = history[idx];
  var updated = JSON.parse(JSON.stringify(raw));

  // 玩家与身份
  var ids = [];
  var lf = {};
  for (var i = 0; i < E.players.length; i++) {
    var p = E.players[i];
    var nm = String(p.n || '').trim();
    if (!nm) { toast('玩家名称不能为空', 'warn'); return; }
    if (!p.r) { toast('请为所有玩家选择身份', 'warn'); return; }
    ids.push({ n: nm, r: p.r, i: (p.i != null ? p.i : i) });
    if (p.f) lf[(p.i != null ? p.i : i)] = true;
  }
  for (var ni = 0; ni < ids.length; ni++) {
    for (var nj = ni + 1; nj < ids.length; nj++) {
      if (ids[ni].n === ids[nj].n) { toast('名字「' + ids[ni].n + '」重复', 'warn'); return; }
    }
  }
  function lbl(x) { return hceLabelAt(ids, x); }
  function voteMap(votes) {
    var out = {};
    for (var k in votes) {
      if (votes[k] !== 'approve' && votes[k] !== 'reject') continue;
      var li = parseInt(k, 10);
      if (isNaN(li) || li < 0 || li >= ids.length) continue;
      out[lbl(li)] = votes[k];
    }
    return out;
  }

  updated.ids = ids;
  updated.lf = lf;
  updated.d = E.date;
  updated.st = E.st;
  updated.et = E.et;
  updated.w = (E.w === 'evil' ? 'evil' : 'good');
  updated.at = (E.at >= 0 && E.at < ids.length) ? lbl(E.at) : '';
  updated.as = !!E.as;
  updated.aar = hceNum(E.aar);
  updated.afm = !!E.afm;

  // 每轮任务
  var rawMs = (updated.ms && updated.ms.length) ? updated.ms : [];
  var newMs = [];
  for (var mi = 0; mi < E.missions.length; mi++) {
    var mm = E.missions[mi];
    var old = rawMs[mi] || {};
    var vm = {};
    vm.r = mi;
    if (old.s != null) vm.s = old.s;
    else if (mm.team.length) vm.s = mm.team.length;
    vm.ld = lbl(mm.ld);
    vm.t = mm.team.map(function(x) { return lbl(x); });
    vm.res = mm.res || '';
    vm.fc = hceNum(mm.fc);
    vm.sf = hceNum(old.sf);
    if (old.lf2 !== undefined) vm.lf2 = old.lf2;
    if (mm.fv.length) vm.fv = mm.fv.map(function(x) { return lbl(x); });
    var last = mm.attempts[mm.attempts.length - 1];
    if (last) vm.v = voteMap(last.votes);
    vm.la = mm.attempts.map(function(att) {
      return {
        t: att.team.map(function(x) { return lbl(x); }),
        v: voteMap(att.votes),
        ld: lbl(att.ld)
      };
    });
    newMs.push(vm);
  }
  updated.ms = newMs;

  // 湖中女神
  var oldLch = updated.lch || [];
  if (E.lch.length) {
    var newLch = [];
    for (var li2 = 0; li2 < E.lch.length; li2++) {
      var lc = E.lch[li2];
      var nl = JSON.parse(JSON.stringify(oldLch[li2] || {}));
      nl.r = hceNum(lc.r) || (li2 + 1);
      nl.h = (lc.h >= 0 ? lbl(lc.h) : '');
      nl.hn = (lc.h >= 0 ? hceNameAt(ids, lc.h) : '');
      nl.t = (lc.t >= 0 ? lbl(lc.t) : '');
      nl.tn = (lc.t >= 0 ? hceNameAt(ids, lc.t) : '');
      nl.res = lc.res || '';
      newLch.push(nl);
    }
    updated.lch = newLch;
  } else {
    delete updated.lch;
  }

  // 王者之剑
  var oldEx = updated.ex || [];
  if (E.ex.length) {
    var newEx = [];
    for (var ei2 = 0; ei2 < E.ex.length; ei2++) {
      var exr = E.ex[ei2];
      var ne = JSON.parse(JSON.stringify(oldEx[ei2] || {}));
      ne.r = hceNum(exr.r) || (ei2 + 1);
      ne.ld = (exr.ld >= 0 ? lbl(exr.ld) : '');
      ne.ldn = (exr.ld >= 0 ? hceNameAt(ids, exr.ld) : '');
      ne.h = (exr.h >= 0 ? lbl(exr.h) : '');
      ne.hn = (exr.h >= 0 ? hceNameAt(ids, exr.h) : '');
      ne.u = !!exr.u;
      ne.t = (exr.t >= 0 ? lbl(exr.t) : '');
      ne.tn = (exr.t >= 0 ? hceNameAt(ids, exr.t) : '');
      ne.cd = exr.cd || '';
      newEx.push(ne);
    }
    updated.ex = newEx;
  } else {
    delete updated.ex;
  }

  history[idx] = updated;
  saveHistory(history);

  // 云端同步（按 _sid 更新同一条记录）
  try {
    var sb = getSupabase();
    var sid = raw._sid || updated._sid;
    if (sb && sid) {
      sb.from('game_records').update({ game_data_v2: updated }).eq('id', sid).then(function(res) {
        if (res.error) console.warn('[Supabase] update failed:', res.error);
      });
    }
  } catch (e) { console.warn('[HistoryEdit] supabase update error', e); }

  var newKey = recKeyOf(updated);
  window._hce = null;
  toast('已保存，统计与复盘已重算', 'ok');
  try { if (typeof renderStats === 'function') renderStats(); } catch (e2) { console.warn('[HistoryEdit] renderStats error', e2); }
  try { if (typeof renderHistoryList === 'function') renderHistoryList(); } catch (e3) {}
  openHistoryModal(newKey);
}

/* ==================== 补录对局 ==================== */
function openSupplementModal() {
  var overlay = document.getElementById('supplement-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  var now = new Date();
  var dtLocal = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + 'T' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  document.getElementById('supplement-time').value = dtLocal;
  var pcSel = document.getElementById('supplement-pc');
  if (pcSel && state.playerCount) pcSel.value = state.playerCount;
  renderSuppIdentities();
  renderSuppMissions();
  renderSuppLancelot();
  renderSuppLady();
  renderSuppExcalibur();
  renderSuppAssassin();
}

function closeSupplementModal(e) {
  if (e && e.target !== document.getElementById('supplement-modal-overlay')) return;
  document.getElementById('supplement-modal-overlay').style.display = 'none';
}

function onSuppPcChange() {
  renderSuppIdentities();
  renderSuppMissions();
  renderSuppLancelot();
  renderSuppLady();
  renderSuppExcalibur();
  renderSuppAssassin();
}

function getSuppPc() { return parseInt(document.getElementById('supplement-pc').value) || 7; }
function getSuppNames() {
  var pc = getSuppPc();
  var names = [];
  for (var i = 0; i < pc; i++) {
    var inp = document.getElementById('supp-name-' + i);
    names.push(inp ? (inp.value.trim() || ('玩家' + (i + 1))) : ('玩家' + (i + 1)));
  }
  return names;
}
function getSuppRoles() {
  var pc = getSuppPc();
  var roles = [];
  for (var i = 0; i < pc; i++) {
    var sel = document.getElementById('supp-role-' + i);
    roles.push(sel ? sel.value : '');
  }
  return roles;
}

function renderSuppIdentities() {
  var pc = getSuppPc();
  var container = document.getElementById('supplement-identities');
  if (!container) return;
  var h = '';
  // Build datalist for name combobox from current namePool
  h += '<datalist id="supp-name-datalist">';
  for (var ni = 0; ni < namePool.length; ni++) {
    var n = namePool[ni];
    if (n && n.indexOf('玩家') !== 0) {
      h += '<option value="' + escAttr(n) + '">';
    }
  }
  h += '</datalist>';
  for (var i = 0; i < pc; i++) {
    h += '<div style="display:flex;align-items:center;gap:4px">';
    h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">' + (i + 1) + '号</span>';
    h += '<input type="text" list="supp-name-datalist" id="supp-name-' + i + '" class="filter-input" style="flex:1;min-width:0;box-sizing:border-box" value="' + escAttr(namePool[i] || ('玩家' + (i + 1))) + '" placeholder="姓名" oninput="onSuppNameInput()">';
    h += '<select id="supp-role-' + i + '" class="filter-select" style="width:110px;flex-shrink:0;box-sizing:border-box" onchange="onSuppRoleChange()"></select>';
    h += '</div>';
  }
  container.innerHTML = h;
  fillSuppRoleOptions(pc);
  // Restore prev values
  for (var j = 0; j < pc; j++) {
    var prevSel = document.getElementById('supp-role-' + j);
    if (prevSel && state._suppPrevRoles && state._suppPrevRoles[j]) prevSel.value = state._suppPrevRoles[j];
  }
}

function fillSuppRoleOptions(pc) {
  // Count role appearances in history for sorting
  var roleAppearance = {};
  var history = loadNormalizedHistory();
  for (var hi = 0; hi < history.length; hi++) {
    var ids = history[hi].identities;
    for (var ji = 0; ji < ids.length; ji++) {
      roleAppearance[ids[ji].role] = (roleAppearance[ids[ji].role] || 0) + 1;
    }
  }
  // Sort roles by appearance count (descending), new roles at end
  var sortedRoles = ALL_ROLES.slice().sort(function(a, b) {
    var ca = roleAppearance[a] || 0;
    var cb = roleAppearance[b] || 0;
    return cb - ca;
  });

  var defaultAssign = getDefaultRoleAssign(pc);
  for (var i = 0; i < pc; i++) {
    var sel = document.getElementById('supp-role-' + i);
    if (!sel) continue;
    var prevVal = sel.value;
    sel.innerHTML = '<option value="">-- 选身份 --</option>';
    for (var r = 0; r < sortedRoles.length; r++) {
      var role = sortedRoles[r];
      var selAttr = '';
      if (prevVal && prevVal === role) selAttr = ' selected';
      else if (!prevVal && role === defaultAssign[i]) selAttr = ' selected';
      sel.innerHTML += '<option value="' + escAttr(role) + '"' + selAttr + '>' + role + '</option>';
    }
  }
  renderSuppMissions();
  renderSuppLancelot();
  renderSuppLady();
  renderSuppExcalibur();
  renderSuppAssassin();
}

function getDefaultRoleAssign(pc) {
  if (pc === 5) return ['梅林','派西维尔','忠臣','莫甘娜','刺客'];
  if (pc === 6) return ['梅林','派西维尔','忠臣','忠臣','莫甘娜','刺客'];
  if (pc === 7) return ['梅林','派西维尔','忠臣','忠臣','莫甘娜','刺客','奥伯伦'];
  if (pc === 8) return ['梅林','派西维尔','忠臣','忠臣','忠臣','莫甘娜','刺客','爪牙'];
  if (pc === 9) return ['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣','莫甘娜','刺客','莫德雷德'];
  return ['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣','莫甘娜','刺客','莫德雷德','奥伯伦'];
}

function onSuppNameInput() {
  // Re-render missions/lancelot/lady/excalibur/assassin with updated names
  renderSuppMissions();
  renderSuppLancelot();
  renderSuppLady();
  renderSuppExcalibur();
  renderSuppAssassin();
}

function onSuppRoleChange() {
  // Save current role selections
  var pc = getSuppPc();
  state._suppPrevRoles = [];
  for (var i = 0; i < pc; i++) {
    var sel = document.getElementById('supp-role-' + i);
    state._suppPrevRoles[i] = sel ? sel.value : '';
  }
}

function getSuppMissionCount() {
  return 5;
}

function getSuppMissionSizes() {
  var pc = getSuppPc();
  if (pc === 5) return [2,3,2,3,3];
  if (pc === 6) return [2,3,4,3,4];
  if (pc === 7) return [2,3,3,4,4];
  if (pc === 8) return [3,4,4,5,5];
  return [3,4,4,5,5]; // 9-10人
}

function getSuppShieldRound() {
  var pc = getSuppPc();
  return (pc >= 7) ? 4 : -1; // 7+人第4轮需要2票失败
}

function onSuppWinnerChange() {
  renderSuppAssassin();
}

function renderSuppMissions() {
  var container = document.getElementById('supplement-missions');
  if (!container) return;
  var pc = getSuppPc();
  var names = getSuppNames();
  var missionCount = getSuppMissionCount();
  var sizes = getSuppMissionSizes();
  var shieldRound = getSuppShieldRound();
  var h = '';
  for (var r = 0; r < missionCount; r++) {
    var size = sizes[r];
    var shielded = (r + 1 === shieldRound);
    var prevData = state._suppMissionData && state._suppMissionData[r];
    var prevRes = prevData ? prevData.result : '';
    var prevFail = prevData ? prevData.failCount : 0;
    var prevLeader = prevData ? prevData.leader : '';
    var prevTeam = prevData ? prevData.team : [];
    var prevLaunchFailures = prevData ? prevData.launchFailures : 0;
    var prevLaunchAttempts = prevData ? prevData.launchAttempts : [];
    h += '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:6px">';
    h += '<div style="font-size:13px;font-weight:600;margin-bottom:6px">任务' + (r + 1) + ' · ' + size + '人出战' + (shielded ? ' · 需2票失败' : '') + '</div>';

    // --- 组队失败（多次组队尝试） ---
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
    h += '<span style="font-size:12px;color:var(--text-dim);min-width:56px">组队失败</span>';
    h += '<select id="supp-m-launchfail-' + r + '" class="filter-select" style="width:56px" onchange="onSuppLaunchFailChange(' + r + ')">';
    for (var lf = 0; lf <= 5; lf++) {
      h += '<option value="' + lf + '"' + (lf === prevLaunchFailures ? ' selected' : '') + '>' + lf + '次</option>';
    }
    h += '</select>';
    h += '<span style="font-size:11px;color:#888">（0次=首轮即组队成功）</span>';
    h += '</div>';

    // Render failed launch attempts
    for (var la = 0; la < prevLaunchFailures; la++) {
      var att = (la < prevLaunchAttempts.length) ? prevLaunchAttempts[la] : { team: [], leader: '' };
      var attLeader = att.leader || '';
      var attTeam = att.team || [];
      h += '<div style="margin-left:8px;padding:4px 6px;margin-bottom:3px;background:rgba(220,53,69,0.08);border-left:3px solid #dc3545;border-radius:0 4px 4px 0;font-size:11px">';
      h += '<span style="color:#dc3545;font-weight:600">第' + (la + 1) + '次失败</span>';
      // Leader
      h += '<div style="display:flex;align-items:center;gap:4px;margin-top:3px">';
      h += '<span style="font-size:11px;color:var(--text-dim);min-width:24px">队长</span>';
      h += '<select id="supp-m-' + r + '-failldr-' + la + '" class="filter-select" style="flex:1;min-width:0;font-size:11px;padding:2px 4px">';
      h += '<option value="">-- 选队长 --</option>';
      for (var pi = 0; pi < pc; pi++) {
        var fKeyL = (pi + 1) + '号 ' + names[pi];
        h += '<option value="' + escAttr(fKeyL) + '"' + (attLeader === fKeyL ? ' selected' : '') + '>' + names[pi] + '</option>';
      }
      h += '</select></div>';
      // Team
      h += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;align-items:center">';
      h += '<span style="font-size:11px;color:var(--text-dim);min-width:24px">队伍</span>';
      for (var pi = 0; pi < pc; pi++) {
        var fKeyT = (pi + 1) + '号 ' + names[pi];
        var fChecked = attTeam.indexOf(fKeyT) !== -1 ? ' checked' : '';
        h += '<label style="font-size:11px;padding:1px 4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:3px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:2px">';
        h += '<input type="checkbox" id="supp-m-' + r + '-failteam-' + la + '-' + pi + '" value="' + escAttr(fKeyT) + '"' + fChecked + '> ' + names[pi];
        h += '</label>';
      }
      h += '</div></div>';
    }

    // --- 成功组队 ---
    h += '<div style="font-size:11px;color:#28a745;font-weight:600;margin-bottom:4px;margin-top:2px">最终组队成功</div>';
    // Leader
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
    h += '<span style="font-size:12px;color:var(--text-dim);min-width:32px">队长</span>';
    h += '<select id="supp-m-leader-' + r + '" class="filter-select" style="flex:1;min-width:0">';
    h += '<option value="">-- 选队长 --</option>';
    for (var pi = 0; pi < pc; pi++) {
      h += '<option value="' + (pi + 1) + '号 ' + escAttr(names[pi]) + '"' + (prevLeader === (pi + 1) + '号 ' + names[pi] ? ' selected' : '') + '>' + names[pi] + '</option>';
    }
    h += '</select></div>';
    // Team
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">';
    h += '<span style="font-size:12px;color:var(--text-dim);min-width:32px;line-height:28px">队伍</span>';
    for (var pi = 0; pi < pc; pi++) {
      var selKey = (pi + 1) + '号 ' + names[pi];
      var checked = prevTeam.indexOf(selKey) !== -1 ? ' checked' : '';
      h += '<label style="font-size:12px;padding:2px 6px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:3px">';
      h += '<input type="checkbox" id="supp-m-team-' + r + '-' + pi + '" value="' + escAttr(selKey) + '"' + checked + '> ' + names[pi];
      h += '</label>';
    }
    h += '</div>';
    // Result + fail count
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span style="font-size:12px;color:var(--text-dim)">结果</span>';
    h += '<select id="supp-m-result-' + r + '" class="filter-select" style="width:90px" onchange="onSuppMissionResultChange()">';
    h += '<option value=""' + (prevRes === '' ? ' selected' : '') + '>--</option>';
    h += '<option value="success"' + (prevRes === 'success' ? ' selected' : '') + '>成功</option>';
    h += '<option value="fail"' + (prevRes === 'fail' ? ' selected' : '') + '>失败</option>';
    h += '</select>';
    h += '<span style="font-size:12px;color:var(--text-dim)">失败票</span>';
    h += '<select id="supp-m-failcount-' + r + '" class="filter-select" style="width:50px">';
    for (var fc = 0; fc <= size; fc++) {
      h += '<option value="' + fc + '"' + (fc === prevFail ? ' selected' : '') + '>' + fc + '</option>';
    }
    h += '</select>';
    h += '</div>';
    h += '</div>';
  }
  container.innerHTML = h;
}

function onSuppMissionResultChange() {
  // Save current mission data so it survives re-renders
  saveSuppMissionData();
}

function onSuppLaunchFailChange(round) {
  // Save current state before re-render
  saveSuppMissionData();
  // Re-render missions to show/hide failed attempt rows
  renderSuppMissions();
}

function saveSuppMissionData() {
  var pc = getSuppPc();
  var names = getSuppNames();
  var missionCount = getSuppMissionCount();
  state._suppMissionData = [];
  for (var r = 0; r < missionCount; r++) {
    var team = [];
    for (var pi = 0; pi < pc; pi++) {
      var cb = document.getElementById('supp-m-team-' + r + '-' + pi);
      if (cb && cb.checked) team.push(cb.value);
    }
    var resultEl = document.getElementById('supp-m-result-' + r);
    var failEl = document.getElementById('supp-m-failcount-' + r);
    var leaderEl = document.getElementById('supp-m-leader-' + r);
    var lfEl = document.getElementById('supp-m-launchfail-' + r);
    var launchFailures = lfEl ? parseInt(lfEl.value) || 0 : 0;

    // Collect failed launch attempts
    var launchAttempts = [];
    for (var la = 0; la < launchFailures; la++) {
      var fTeam = [];
      for (var pi = 0; pi < pc; pi++) {
        var fCb = document.getElementById('supp-m-' + r + '-failteam-' + la + '-' + pi);
        if (fCb && fCb.checked) fTeam.push(fCb.value);
      }
      var fLdrEl = document.getElementById('supp-m-' + r + '-failldr-' + la);
      launchAttempts.push({
        team: fTeam,
        leader: fLdrEl ? fLdrEl.value : '',
        votes: buildAllApproveVotes(names)
      });
    }

    state._suppMissionData.push({
      result: resultEl ? resultEl.value : '',
      failCount: failEl ? parseInt(failEl.value) || 0 : 0,
      leader: leaderEl ? leaderEl.value : '',
      team: team,
      launchFailures: launchFailures,
      launchAttempts: launchAttempts
    });
  }
}

function onSuppLancelotToggle() {
  var cb = document.getElementById('supp-has-lancelot');
  var div = document.getElementById('supplement-lancelot');
  if (div) div.style.display = cb && cb.checked ? 'block' : 'none';
  if (cb && cb.checked) renderSuppLancelot();
}

function renderSuppLancelot() {
  var container = document.getElementById('supplement-lancelot');
  if (!container || container.style.display === 'none') return;
  var pc = getSuppPc();
  var names = getSuppNames();
  var roles = getSuppRoles();
  var missionCount = getSuppMissionCount();

  // Save current checkbox states before re-render
  saveSuppLancelotState();

  // Find Lancelot players
  var lancelotIndices = [];
  for (var pi = 0; pi < pc; pi++) {
    var role = roles[pi];
    if (role.indexOf('兰斯洛特') !== -1) lancelotIndices.push(pi);
  }
  if (lancelotIndices.length === 0) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:8px">没有兰斯洛特身份</div>';
    return;
  }

  // Load previous state
  var prevRounds = state._suppLancelotRounds;
  if (!prevRounds) { prevRounds = {}; state._suppLancelotRounds = prevRounds; }

  var h = '<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">每轮是否反转？（第3轮起有效）</div>';
  // Per-round toggles: rounds 3, 4, 5 (or up to missionCount)
  var maxRound = Math.min(missionCount, 5);
  for (var r = 3; r <= maxRound; r++) {
    h += '<div style="margin-bottom:4px;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:4px">';
    h += '<span style="font-size:12px;color:var(--gold-light);font-weight:600">第' + r + '轮</span>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">';
    for (var li2 = 0; li2 < lancelotIndices.length; li2++) {
      var pi = lancelotIndices[li2];
      var key = 'supp-lf-r' + r + '-p' + pi;
      var prevVal = prevRounds[key] || false;
      h += '<label style="font-size:11px;padding:2px 8px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px">';
      h += '<input type="checkbox" id="' + key + '"' + (prevVal ? ' checked' : '') + '> ' + names[pi] + ' 翻转';
      h += '</label>';
    }
    h += '</div></div>';
  }
  container.innerHTML = h;
}

function saveSuppLancelotState() {
  if (!state._suppLancelotRounds) state._suppLancelotRounds = {};
  var missionCount = getSuppMissionCount();
  var maxRound = Math.min(missionCount, 5);
  for (var r = 3; r <= maxRound; r++) {
    var keys = document.querySelectorAll('[id^="supp-lf-r' + r + '-p"]');
    for (var k = 0; k < keys.length; k++) {
      var el = keys[k];
      state._suppLancelotRounds[el.id] = el.checked;
    }
  }
}

function onSuppLancelotFlippedChange() {
  // No-op kept for backward compatibility
}

function onSuppLadyToggle() {
  var cb = document.getElementById('supp-has-lady');
  var div = document.getElementById('supplement-lady');
  if (div) div.style.display = cb && cb.checked ? 'block' : 'none';
  if (cb && cb.checked) renderSuppLady();
}

function renderSuppLady() {
  var container = document.getElementById('supplement-lady');
  if (!container || container.style.display === 'none') return;
  var pc = getSuppPc();
  var names = getSuppNames();
  var missionCount = getSuppMissionCount();
  var prevEntries = state._suppLadyEntries || [];
  var h = '<div style="margin-bottom:6px">';
  h += '<button class="btn small" onclick="addSuppLadyEntry()" style="font-size:11px">+ 添加湖中仙女</button>';
  h += '</div>';
  for (var ei = 0; ei < prevEntries.length; ei++) {
    var ent = prevEntries[ei];
    h += renderSuppLadyEntry(ei, ent, pc, names, missionCount);
  }
  container.innerHTML = h;
}

function renderSuppLadyEntry(ei, ent, pc, names, missionCount) {
  var h = '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:4px">';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim)">第</span>';
  h += '<select id="supp-lady-round-' + ei + '" class="filter-select" style="width:60px">';
  for (var r = 0; r < missionCount; r++) {
    h += '<option value="' + r + '"' + (ent.round === r ? ' selected' : '') + '>' + (r + 1) + '轮</option>';
  }
  h += '</select>';
  h += '<span style="font-size:12px;color:var(--text-dim)">后</span>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">持有</span>';
  h += '<select id="supp-lady-holder-' + ei + '" class="filter-select" style="flex:1">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + pi + '"' + (ent.holder === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select></div>';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">查验</span>';
  h += '<select id="supp-lady-target-' + ei + '" class="filter-select" style="flex:1">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + pi + '"' + (ent.target === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select></div>';
  h += '<div style="display:flex;align-items:center;gap:6px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">结果</span>';
  h += '<select id="supp-lady-result-' + ei + '" class="filter-select" style="flex:1">';
  h += '<option value="正义"' + (ent.result === '正义' ? ' selected' : '') + '>正义</option>';
  h += '<option value="邪恶"' + (ent.result === '邪恶' ? ' selected' : '') + '>邪恶</option>';
  h += '</select>';
  h += '<button class="btn small" onclick="removeSuppLadyEntry(' + ei + ')" style="font-size:11px;color:#ff6666">删除</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function addSuppLadyEntry() {
  if (!state._suppLadyEntries) state._suppLadyEntries = [];
  state._suppLadyEntries.push({ round: 0, holder: 0, target: 1, result: '正义' });
  renderSuppLady();
}

function removeSuppLadyEntry(idx) {
  if (!state._suppLadyEntries) return;
  state._suppLadyEntries.splice(idx, 1);
  renderSuppLady();
}

function onSuppExcaliburToggle() {
  var cb = document.getElementById('supp-has-excalibur');
  var div = document.getElementById('supplement-excalibur');
  if (div) div.style.display = cb && cb.checked ? 'block' : 'none';
  if (cb && cb.checked) renderSuppExcalibur();
}

function renderSuppExcalibur() {
  var container = document.getElementById('supplement-excalibur');
  if (!container || container.style.display === 'none') return;
  var pc = getSuppPc();
  var names = getSuppNames();
  var missionCount = getSuppMissionCount();
  var prevEntries = state._suppExcaliburEntries || [];
  var h = '<div style="margin-bottom:6px">';
  h += '<button class="btn small" onclick="addSuppExcaliburEntry()" style="font-size:11px">+ 添加王者之剑</button>';
  h += '</div>';
  for (var ei = 0; ei < prevEntries.length; ei++) {
    var ent = prevEntries[ei];
    h += renderSuppExcaliburEntry(ei, ent, pc, names, missionCount);
  }
  container.innerHTML = h;
}

function renderSuppExcaliburEntry(ei, ent, pc, names, missionCount) {
  var h = '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:4px">';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim)">第</span>';
  h += '<select id="supp-ex-round-' + ei + '" class="filter-select" style="width:60px">';
  for (var r = 0; r < missionCount; r++) {
    h += '<option value="' + r + '"' + (ent.round === r ? ' selected' : '') + '>' + (r + 1) + '轮</option>';
  }
  h += '</select></div>';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">使用者</span>';
  h += '<select id="supp-ex-user-' + ei + '" class="filter-select" style="flex:1">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + pi + '"' + (ent.user === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select></div>';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">对象</span>';
  h += '<select id="supp-ex-target-' + ei + '" class="filter-select" style="flex:1">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + pi + '"' + (ent.target === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select></div>';
  h += '<div style="display:flex;align-items:center;gap:6px">';
  h += '<span style="font-size:12px;color:var(--text-dim);min-width:28px">结果</span>';
  h += '<select id="supp-ex-result-' + ei + '" class="filter-select" style="flex:1">';
  h += '<option value="success"' + (ent.result !== 'fail' ? ' selected' : '') + '>成功（抵消失败票）</option>';
  h += '<option value="fail"' + (ent.result === 'fail' ? ' selected' : '') + '>失败</option>';
  h += '</select>';
  h += '<button class="btn small" onclick="removeSuppExcaliburEntry(' + ei + ')" style="font-size:11px;color:#ff6666">删除</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function addSuppExcaliburEntry() {
  if (!state._suppExcaliburEntries) state._suppExcaliburEntries = [];
  state._suppExcaliburEntries.push({ round: 0, user: 0, target: 1, result: 'success' });
  renderSuppExcalibur();
}

function removeSuppExcaliburEntry(idx) {
  if (!state._suppExcaliburEntries) return;
  state._suppExcaliburEntries.splice(idx, 1);
  renderSuppExcalibur();
}

function onSuppAssassinToggle() {
  renderSuppAssassin();
}

function renderSuppAssassin() {
  var container = document.getElementById('supplement-assassin');
  if (!container) return;
  var cb = document.getElementById('supp-has-assassin');
  if (!cb || !cb.checked) { container.innerHTML = ''; return; }
  var pc = getSuppPc();
  var names = getSuppNames();
  var roles = getSuppRoles();
  var winner = document.getElementById('supplement-winner').value;
  // 反方胜+有刺杀 → 刺杀成功；好人胜+有刺杀 → 可选命中
  var prevData = state._suppAssassinData || {};
  var h = '';
  h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  h += '<span style="font-size:12px;color:var(--text-dim)">刺客</span>';
  h += '<select id="supp-assassin-who" class="filter-select" style="width:100px">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + pi + '"' + (prevData.who === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select>';
  h += '<span style="font-size:12px;color:var(--text-dim)">刺杀目标</span>';
  h += '<select id="supp-assassin-target" class="filter-select" style="width:100px">';
  for (var pi = 0; pi < pc; pi++) {
    h += '<option value="' + (pi + 1) + '号 ' + escAttr(names[pi]) + '"' + (prevData.targetIdx === pi ? ' selected' : '') + '>' + names[pi] + '</option>';
  }
  h += '</select>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">';
  h += '<span style="font-size:12px;color:var(--text-dim)">是否命中梅林</span>';
  h += '<select id="supp-assassin-success" class="filter-select" style="width:80px">';
  var defaultSuccess = (winner === 'evil');
  h += '<option value="yes"' + (prevData.success === true ? ' selected' : (!prevData.hasOwnProperty('success') && defaultSuccess ? ' selected' : '')) + '>是</option>';
  h += '<option value="no"' + (prevData.success === false ? ' selected' : (!prevData.hasOwnProperty('success') && !defaultSuccess ? ' selected' : '')) + '>否</option>';
  h += '</select>';
  h += '</div>';
  container.innerHTML = h;
}

function submitSupplement() {
  var dt = document.getElementById('supplement-time').value;
  if (!dt) { toast('请选择对局时间', 'warn'); return; }

  var pc = getSuppPc();
  var winner = document.getElementById('supplement-winner').value;
  var note = document.getElementById('supplement-note').value.trim();
  var names = getSuppNames();
  var roles = getSuppRoles();

  // Verify all identities have roles
  for (var i = 0; i < pc; i++) {
    if (!roles[i]) { toast(names[i] + '未选择身份', 'warn'); return; }
  }

  // Build identities
  var identities = [];
  for (var i = 0; i < pc; i++) {
    identities.push({ index: i, name: names[i], role: roles[i] });
  }

  // Build activeRoles from identities
  var activeRoles = [];
  for (var i = 0; i < identities.length; i++) {
    if (activeRoles.indexOf(identities[i].role) === -1) {
      activeRoles.push(identities[i].role);
    }
  }

  var parts = dt.split('T');
  var dateStr = parts[0];
  var timeStr = (parts[1] || '00:00') + ':00';
  var startTime = dateStr + ' ' + timeStr;
  var endTime = startTime;

  // Build missions
  saveSuppMissionData();
  var missionData = state._suppMissionData || [];
  var missionCount = getSuppMissionCount();
  var sizes = getSuppMissionSizes();
  var votedMissions = 0;
  var failMissions = 0;
  var missions = [];
  for (var r = 0; r < missionCount; r++) {
    var md = (r < missionData.length) ? missionData[r] : { result: '', failCount: 0, leader: '', team: [], launchFailures: 0, launchAttempts: [] };
    if (!md.result) continue;
    // Build launchAttempts: failed attempts + final successful one
    var launchAttempts = [];
    var failedAttempts = md.launchAttempts || [];
    for (var la = 0; la < failedAttempts.length; la++) {
      launchAttempts.push({
        team: failedAttempts[la].team || [],
        votes: failedAttempts[la].votes || buildAllApproveVotes(names),
        leader: failedAttempts[la].leader || ''
      });
    }
    // Final successful attempt
    launchAttempts.push({
      team: md.team || [],
      votes: buildAllApproveVotes(names),
      leader: md.leader || ''
    });
    missions.push({
      round: r + 1,
      size: sizes[r],
      leader: md.leader || '',
      team: md.team || [],
      result: md.result,
      failCount: md.failCount || 0,
      shieldedFails: 0,
      launchFailures: md.launchFailures || 0,
      launchAttempts: launchAttempts,
      votes: buildAllApproveVotes(names)
    });
    votedMissions++;
    if (md.result === 'fail') failMissions++;
  }

  // Lancelot flips: collect from per-round toggles, odd total = flipped
  var lancelotFlips = {};
  var hasLancelot = document.getElementById('supp-has-lancelot');
  if (hasLancelot && hasLancelot.checked) {
    var flipCounts = {};
    var missionCount = getSuppMissionCount();
    var maxRound = Math.min(missionCount, 5);
    for (var r = 3; r <= maxRound; r++) {
      for (var pi = 0; pi < pc; pi++) {
        var cb = document.getElementById('supp-lf-r' + r + '-p' + pi);
        if (cb && cb.checked) {
          flipCounts[pi] = (flipCounts[pi] || 0) + 1;
        }
      }
    }
    for (var pi = 0; pi < pc; pi++) {
      if (flipCounts[pi] && flipCounts[pi] % 2 !== 0) {
        lancelotFlips[pi] = true;
      }
    }
  }

  // Lady of lake
  var ladyCheckHistory = [];
  var hasLady = document.getElementById('supp-has-lady');
  if (hasLady && hasLady.checked && state._suppLadyEntries) {
    for (var ei = 0; ei < state._suppLadyEntries.length; ei++) {
      var ent = state._suppLadyEntries[ei];
      ladyCheckHistory.push({
        round: ent.round,
        holder: ent.holder,
        holderName: names[ent.holder],
        target: ent.target,
        targetName: names[ent.target],
        result: ent.result,
        note: '',
        recordedAtRound: ent.round,
        recordedAtSpeaker: 0
      });
    }
  }

  // Excalibur
  var excaliburHistory = [];
  var hasExcalibur = document.getElementById('supp-has-excalibur');
  if (hasExcalibur && hasExcalibur.checked && state._suppExcaliburEntries) {
    for (var ei = 0; ei < state._suppExcaliburEntries.length; ei++) {
      var ent = state._suppExcaliburEntries[ei];
      excaliburHistory.push({
        round: ent.round,
        user: ent.user,
        userName: names[ent.user],
        target: ent.target,
        targetName: names[ent.target],
        result: ent.result,
        recordedAtRound: ent.round
      });
      // Apply excalibur effect to mission
      if (ent.result === 'success' && ent.round < missions.length) {
        var mission = missions[ent.round];
        if (mission && mission.failCount > 0) {
          mission.failCount = Math.max(0, mission.failCount - 1);
          mission.shieldedFails = (mission.shieldedFails || 0) + 1;
        }
      }
    }
  }

  // Assassination
  var assassinTarget = '';
  var assassinSuccess = false;
  var hasAssassin = document.getElementById('supp-has-assassin');
  if (hasAssassin && hasAssassin.checked) {
    var targetEl = document.getElementById('supp-assassin-target');
    var successEl = document.getElementById('supp-assassin-success');
    assassinTarget = targetEl ? targetEl.value : '';
    assassinSuccess = successEl ? successEl.value === 'yes' : false;
  }

  // If assassin killed Merlin, evil wins regardless of missions
  if (assassinSuccess) winner = 'evil';

  // Save names to pool
  var dirty = false;
  for (var i3 = 0; i3 < Math.min(pc, 10); i3++) {
    if (names[i3] && names[i3] !== ('玩家' + (i3 + 1))) {
      namePool[i3] = names[i3];
      dirty = true;
    }
  }
  if (dirty) saveNamePool();

  var record = {
    _uuid: generateUUID(),
    date: dateStr,
    startTime: startTime,
    endTime: endTime,
    playerCount: pc,
    winner: winner,
    identities: identities,
    activeRoles: activeRoles,
    missions: missions,
    lancelotFlips: lancelotFlips,
    ladyCheckHistory: ladyCheckHistory,
    excaliburEnabled: (excaliburHistory.length > 0),
    excaliburHistory: excaliburHistory,
    assassinTarget: assassinTarget,
    assassinSuccess: assassinSuccess,
    roundTendencies: [],
    currentRound: missionCount,
    identityMarks: [],
    _isSupplement: true,
    _note: note || ''
  };

  var history = loadRawHistoryForSupplement();
  history.push(record);
  localStorage.setItem('avalon_history_v2', JSON.stringify(history));
  invalidateHistoryCache();

  var sb = getSupabase();
  if (sb) {
    var v2 = toRecordV2(record);
    if (!v2._uuid) v2._uuid = record._uuid;
    v2._note = note || '';
    v2._isSupplement = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', SUPABASE_URL + '/rest/v1/game_records', false);
      xhr.setRequestHeader('apikey', SUPABASE_KEY);
      xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Prefer', 'return=representation');
      xhr.send(JSON.stringify({ game_data_v2: v2 }));
    } catch(e) {
      console.warn('[Supplement] Supabase sync failed:', e);
    }
  }

  toast('补录成功！');
  closeSupplementModal();
  renderStats();
}

function buildAllApproveVotes(names) {
  var votes = {};
  for (var i = 0; i < names.length; i++) {
    votes[(i + 1) + '号 ' + names[i]] = 'approve';
  }
  return votes;
}

function loadRawHistoryForSupplement() {
  try {
    return JSON.parse(localStorage.getItem('avalon_history_v2') || '[]');
  } catch(e) {
    return [];
  }
}

function escAttr(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/* ==================== v175: 夜间动态身份语音播报（Web Speech API） ==================== */
/* 说明：不打包任何音频，全部由浏览器 window.speechSynthesis 实时朗读；
   播报台词按本场实际角色池（state.activeRoles / state.playerRoles / state.myRole）动态拼装，
   角色不存在则整段跳过。变量与函数统一使用 NV / nv 前缀，避免与既有 speech* 发言阶段逻辑冲突。 */

var NV_EVIL_OPEN = ['莫甘娜', '刺客', '莫德雷德', '爪牙'];     // 睁眼互认的红色方
var NV_EVIL_THUMB = ['莫甘娜', '刺客', '爪牙', '奥伯伦', '兰斯洛特(红)']; // 给梅林竖拇指（= 红色方 - 莫德雷德）
var NV_GAP_MIN = 0;
var NV_GAP_MAX = 10;      // v179：逐句停顿支持 0~10 秒
var NV_GAP_STEP = 0.5;    // v179：步长 0.5 秒
var NV_GAP_DEFAULT = 3;

/* v183：播报倍速档位（只作用于语音 utterance.rate，不改音色、停顿与背景乐） */
var NV_RATE_OPTS = [0.5, 0.75, 1, 1.25, 1.5];   // v184：删除 ×2，仅保留五档
var NV_RATE_DEFAULT = 1;

/* v190：真人感策略（默认开启，可在面板内关闭）
   - 角色名字片段单独朗读，语速乘名字放慢系数（只作用于名字，其余不变）
   - 句内按标点做短停顿（不改逐句停顿秒数）
   - 音高轻微下压到更自然区间
   v191：名字放慢仅作用于「红色方请睁开眼睛」「红色方竖大拇指」两个环节，且系数可调 */
var NV_NAME_RATE_DEFAULT = 0.82;                              // 名字放慢默认系数（1.00 = 正常语速）
var NV_NAME_RATES = [0.6, 0.7, 0.8, 0.82, 0.9, 1.0];          // 可选档位：0.60 明显放慢 → 1.00 正常语速
// v191：按 step 键名判定是否命中名字放慢（不按序号，避免有/无红兰斯洛特两种局错位）
var NV_NAME_STEPS = { '红色方请睁开眼睛': 1, '红色方竖大拇指': 1 };
var NV_NAME_RATE = NV_NAME_RATE_DEFAULT;   // 兼容旧引用（面板只读展示用）
var NV_PITCH = 0.95;          // 真人感开启时的音高
var NV_HUMAN_DEFAULT = true;
// 句内标点微停顿（毫秒），仅句内使用，与 NV.gaps 的逐句停顿互不影响
var NV_PAUSE_CHARS = {
  '，': 120, '、': 100, '；': 130, '：': 130, ',': 120, ';': 130, ':': 130,
  '。': 240, '！': 240, '？': 240, '!': 240, '?': 240, '.': 240, '…': 200
};

var NV = {
  lines: [],
  idx: -1,
  playing: false,
  paused: false,
  finished: false,
  gap: NV_GAP_DEFAULT,   // 默认停顿（统一值）
  rate: NV_RATE_DEFAULT, // v183：播报倍速（1 = 原速，只影响 utterance.rate）
  human: NV_HUMAN_DEFAULT, // v190：真人感（名字减速 + 句内标点微停顿 + 音高微调）
  nameRate: NV_NAME_RATE_DEFAULT, // v191：名字放慢系数（仅两个目标环节生效，1.00 = 正常语速）
  gaps: {},              // v179：按步骤名索引的逐句停顿时长
  timer: null,
  utter: null,
  seq: 0,
  supported: false,
  open: false
};

// v181：开局停在队长页由用户选队长（'choose'），确认后置 'none'；'pending' 为旧版状态保留兼容
var NV_PROMPT = 'none';
// v181：播报询问是否已处理（已被点过「开始/跳过播报」后不再显示该按钮组）
var NV_ASKED = false;
// v183：队长已确认的停留态下点了「开始语音播报」，播报结束/关闭面板后再进组队页
var NV_PENDING_ENTER = false;

(function nvInitEnv() {
  try {
    NV.supported = !!(window && window.speechSynthesis && window.SpeechSynthesisUtterance);
  } catch (e) {
    NV.supported = false;
  }
  try {
    var g = parseFloat(localStorage.getItem('avalon_voice_gap'));
    if (!isNaN(g) && g >= NV_GAP_MIN && g <= NV_GAP_MAX) NV.gap = g;
  } catch (e) {}
  // v179：逐句停顿设置（按步骤名索引；缺项回退默认 3 秒）
  try {
    var rawGaps = localStorage.getItem('avalon_voice_gaps');
    if (rawGaps) {
      var gapObj = JSON.parse(rawGaps);
      if (gapObj && typeof gapObj === 'object') {
        for (var gk in gapObj) {
          if (!Object.prototype.hasOwnProperty.call(gapObj, gk)) continue;
          var gv = parseFloat(gapObj[gk]);
          if (!isNaN(gv)) NV.gaps[gk] = nvClampGap(gv);
        }
      }
    }
  } catch (e) {}
  // v183：播报倍速（持久化，非法值回退 1 倍）
  // v184：删除 ×2 后，历史持久化的 2 读取时回落 ×1，并把规范值写回，避免残留非法档
  try {
    var rawRate = localStorage.getItem('avalon_voice_rate');
    NV.rate = nvClampRate(rawRate);
    if (rawRate !== null && String(NV.rate) !== String(rawRate)) {
      localStorage.setItem('avalon_voice_rate', String(NV.rate));
    }
  } catch (e) {}
  // v190：真人感开关（默认开启；旧用户无该键时按默认开启）
  try {
    var rawHuman = localStorage.getItem('avalon_voice_human');
    if (rawHuman === '0') NV.human = false;
    else if (rawHuman === '1') NV.human = true;
  } catch (e) {}
  // v191：名字放慢系数（持久化，非法值回退默认 0.82）
  try {
    var rawNameRate = localStorage.getItem('avalon_voice_name_rate');
    NV.nameRate = nvClampNameRate(rawNameRate === null ? NV_NAME_RATE_DEFAULT : parseFloat(rawNameRate));
    if (rawNameRate !== null && !nvNameRateEqual(parseFloat(rawNameRate), NV.nameRate)) {
      localStorage.setItem('avalon_voice_name_rate', String(NV.nameRate));
    }
  } catch (e) {}
  // 语音列表在部分浏览器是异步加载的，提前预热一次
  if (NV.supported) {
    try {
      window.speechSynthesis.getVoices();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', function () {});
      }
    } catch (e) {}
  }
})();

/* ---------- iOS / 移动端首次手势解锁 ---------- */
function nvUnlockSpeech() {
  if (!NV.supported) return;
  try {
    var u = new SpeechSynthesisUtterance(' ');
    u.lang = 'zh-CN';
    u.volume = 0;
    u.rate = 1;
    window.speechSynthesis.speak(u);
    setTimeout(function () {
      // v179：若此时已经在朗读正式台词，不要用解锁用的空 utterance 取消它
      if (NV.playing || NV._started) return;
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }, 220);
  } catch (e) {}
}

/* ---------- 语音选择（v177：严格 zh-CN 标准普通话，排除港台/粤语音色） ---------- */
// v190：偏好名单扩充到微软主流中文神经音色（Natural / Neural 家族）
var NV_VOICE_PREF = ['Xiaoxiao', 'Yunxi', 'Yunyang', 'Yunxia', 'Xiaoyi', 'Yunjian', 'Huihui'];
// v190：高质量音色门槛，低于该分数即视为「无高质量音色」，回落最佳可用 zh-CN 音色但不再做音高/语速美化
var NV_VOICE_GOOD = 18;
// 港台 / 粤语音色黑名单（名称或 voiceURI 命中即排除）
var NV_VOICE_BLOCK = /粤|粵|Cantonese|Hong\s*Kong|香港|Taiwan|台灣|台湾|Hant/i;

function nvGetVoices() {
  try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
}

function nvNormalizeLang(v) {
  if (!v || !v.lang) return '';
  return String(v.lang).replace(/_/g, '-').toLowerCase();
}

// 只接受大陆普通话标识（zh-CN / zh-CHS / zh-Hans），其余（zh-HK / zh-TW / yue 等）一律不算候选
function nvIsZhCN(v) {
  if (!v) return false;
  var lang = nvNormalizeLang(v);
  if (!lang) return false;
  if (!/^zh-(cn|chs|hans)$/.test(lang)) return false;
  if (NV_VOICE_BLOCK.test((v.name || '') + ' ' + (v.voiceURI || ''))) return false;
  return true;
}

function nvScoreVoice(v) {
  return nvVoiceScoreDetail(v).score;
}

// v190：音色评分明细（供选择与评分表展示；分数越高越接近真人）
function nvVoiceScoreDetail(v) {
  var name = (v && v.name) || '';
  var uri = (v && v.voiceURI) || '';
  var all = name + ' ' + uri;
  var score = 0, notes = [], i;
  if (/Microsoft/i.test(all)) { score += 5; notes.push('Microsoft+5'); }
  if (/Natural/i.test(all)) { score += 10; notes.push('Natural+10'); }
  else if (/Neural/i.test(all)) { score += 8; notes.push('Neural+8'); }
  if (/Online/i.test(all)) { score += 3; notes.push('Online+3'); }         // 云端神经音色（仍在浏览器内置范围内）
  for (i = 0; i < NV_VOICE_PREF.length; i++) {
    if (new RegExp(NV_VOICE_PREF[i], 'i').test(all)) { score += 10; notes.push(NV_VOICE_PREF[i] + '+10'); break; }
  }
  if (/Desktop/i.test(all)) { score -= 8; notes.push('LegacyDesktop-8'); } // 老 SAPI5 机械音色降权
  if (/eSpeak|Festival|Pico|compact|Compact/i.test(all)) { score -= 6; notes.push('Synth-6'); }
  return { score: score, notes: notes };
}

// v190：生成候选音色评分表（含被排除的港台/粤语候选，便于核对）
function nvVoiceReport() {
  var vs = nvGetVoices(), rows = [], i, d;
  for (i = 0; i < vs.length; i++) {
    var v = vs[i];
    var cand = nvIsZhCN(v);
    d = nvVoiceScoreDetail(v);
    rows.push({
      name: v.name || '',
      lang: v.lang || '',
      uri: v.voiceURI || '',
      candidate: cand,
      score: cand ? d.score : -1,
      notes: cand ? d.notes.join(' ') : '非 zh-CN 普通话（已排除）'
    });
  }
  rows.sort(function (a, b) { return b.score - a.score; });
  var picked = NV._voice ? NV._voice.name : null;
  var ps = 0;
  for (i = 0; i < rows.length; i++) if (rows[i].name === picked) ps = rows[i].score;
  return {
    total: vs.length,
    zhcnCount: rows.filter(function (r) { return r.candidate; }).length,
    threshold: NV_VOICE_GOOD,
    picked: picked,
    pickedScore: ps,
    pickedHighQuality: !!picked && ps >= NV_VOICE_GOOD,
    rows: rows
  };
}

function nvPickVoice() {
  if (!NV.supported) return null;
  var vs = nvGetVoices();
  if (!vs.length) return null;
  var best = null, bestScore = -1, i, v, s;
  for (i = 0; i < vs.length; i++) {
    v = vs[i];
    if (!nvIsZhCN(v)) continue;
    s = nvScoreVoice(v);
    if (s > bestScore) { bestScore = s; best = v; }
  }
  // 绝不回退到 zh-HK / zh-TW / 粤语音色：无 zh-CN 候选时返回 null
  NV._voiceScore = best ? bestScore : 0;
  NV._voiceGood = !!best && bestScore >= NV_VOICE_GOOD;
  return best;
}

// 语音列表在多数浏览器是异步加载的：等 voiceschanged / 轮询，最多等 1.5s
function nvResolveVoice(cb) {
  if (NV._voice) { cb(NV._voice); return; }
  var done = false;
  var finish = function (v) {
    if (done) return;
    done = true;
    NV._voice = v || null;
    cb(NV._voice);
  };
  var first = nvPickVoice();
  if (first) { finish(first); return; }
  if (nvGetVoices().length) { finish(null); return; }   // 列表已就绪但没有 zh-CN 音色
  var waited = 0, step = 120, limit = 1500;
  var onChanged = function () {
    var v = nvPickVoice();
    if (v) { cleanup(); finish(v); }
  };
  var cleanup = function () {
    try { window.speechSynthesis.removeEventListener('voiceschanged', onChanged); } catch (e) {}
  };
  try { window.speechSynthesis.addEventListener('voiceschanged', onChanged); } catch (e) {}
  var tick = function () {
    if (done) return;
    var v = nvPickVoice();
    if (v) { cleanup(); finish(v); return; }
    waited += step;
    if (waited >= limit) { cleanup(); finish(null); return; }
    setTimeout(tick, step);
  };
  setTimeout(tick, step);
}

// 未选到 zh-CN 音色时给出降级提示（不切换到港台音色）
function nvWarnNoCnVoice() {
  if (NV._noCnVoiceTip) return;
  NV._noCnVoiceTip = true;
  var tip = document.getElementById('nv-tip');
  if (tip) {
    tip.textContent = '未检测到标准普通话（zh-CN）音色，已按 lang=zh-CN 交由系统默认语音朗读；'
      + '若发音带口音，请在系统「语音/语言」中安装中文（中国大陆）语音包后重试。';
  }
}

/* ---------- 本场角色集合 ---------- */
function nvRoleSet() {
  var set = {};
  function add(r) {
    if (!r || typeof r !== 'string') return;
    if (r === '不明' || r === '正方' || r === '反方') return;
    if (ALL_ROLES.indexOf(r) === -1) return;
    set[r] = true;
  }
  var i;
  var ar = state.activeRoles || [];
  for (i = 0; i < ar.length; i++) add(ar[i]);
  var pr = state.playerRoles || [];
  for (i = 0; i < pr.length; i++) add(pr[i]);
  add(state.myRole);
  return set;
}

/* ---------- 播报用角色名（念白口语化） ---------- */
function nvRoleName(r) {
  if (r === '兰斯洛特(红)') return '红色兰斯洛特';
  if (r === '兰斯洛特(蓝)') return '蓝色兰斯洛特';
  return r;
}
function nvJoinNames(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) out.push(nvRoleName(list[i]));
  return out.join('、');
}

/* ---------- 台词动态拼装 ---------- */
function buildNightVoiceLines() {
  var R = nvRoleSet();
  function has(r) { return !!R[r]; }
  function pick(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) if (has(list[i])) out.push(list[i]);
    return out;
  }
  var lines = [];
  function push(step, text) { lines.push({ step: step, text: text }); }

  // 1) 天黑请闭眼（v188：首句文案改为「天黑请闭眼。」，全篇唯一出现「闭眼」二字的句子；step 键沿用旧名以保持停顿配置不错位）
  push('天黑请闭上眼睛', '天黑请闭眼。');

  var openEvil = pick(NV_EVIL_OPEN);   // 互相认识、需要睁眼的红色方（莫甘娜/刺客/莫德雷德/爪牙）
  var thumbs = pick(NV_EVIL_THUMB);    // 第4句给梅林竖拇指的红色方（含奥伯伦）
  var hasRedLancelot = has('兰斯洛特(红)');

  // 2) 红色方睁眼互认（v179：奥伯伦完全退出本段——不念名、不睁眼、不竖大拇指；红色兰斯洛特保持"竖起大拇指"）
  if (openEvil.length || hasRedLancelot) {
    var openText;
    if (hasRedLancelot && openEvil.length) {
      openText = '请红色方红色兰斯洛特竖起大拇指，请'
        + nvJoinNames(openEvil) + '睁开眼睛，互相确认你们的同伴。';
    } else if (hasRedLancelot) {
      // 本场没有需要睁眼互认的红色方，只念红色兰斯洛特竖大拇指
      openText = '请红色方红色兰斯洛特竖起大拇指。';
    } else {
      openText = '请红色方' + nvJoinNames(openEvil) + '睁开眼睛，互相确认你们的同伴。';
    }
    push('红色方请睁开眼睛', openText);
  }

  // 3) v190：本场有红色兰斯洛特时，睁眼互认后立刻收回大拇指（无兰斯洛特则整句零出现）
  if (hasRedLancelot) {
    push('请红色兰斯洛特收回大拇指', '请红色兰斯洛特收回大拇指。');
  }

  // 4) 红色方闭上眼睛（v190：收回大拇指 → 红色方闭眼）
  if (openEvil.length || hasRedLancelot) {
    push('红色方请闭上眼睛', '红色方请闭上眼睛。');
  }

  // 5) v190：红色方竖大拇指（含红色兰斯洛特）移到「红色方闭眼」之后、「梅林请睁眼」之前
  //    v178："除莫德雷德以外"仅在本场存在莫德雷德时出现
  if (thumbs.length) {
    var thumbText = has('莫德雷德')
      ? '请除莫德雷德以外的红色方竖起大拇指：' + nvJoinNames(thumbs) + '。'
      : '请红色方竖起大拇指：' + nvJoinNames(thumbs) + '。';
    push('红色方竖大拇指', thumbText);
  }

  // 5) 梅林请睁眼（看谁竖了大拇指；不点名莫德雷德）
  if (has('梅林')) {
    push('梅林请睁眼', '梅林请睁眼，请看竖着大拇指的玩家并记住他们。');
    // 6) 梅林闭上眼睛、所有人放下大拇指
    push('梅林请闭上眼睛', '梅林请闭上眼睛，所有人请放下大拇指。');
  }

  // 7) 梅林和莫甘娜竖起大拇指（无莫甘娜只念梅林）
  if (has('梅林') || has('莫甘娜')) {
    var mvText;
    if (has('梅林') && has('莫甘娜')) {
      mvText = '请梅林和莫甘娜竖起大拇指。';
    } else if (has('梅林')) {
      mvText = '请梅林竖起大拇指。';
    } else {
      mvText = '请莫甘娜竖起大拇指。';
    }
    push('梅林和莫甘娜竖拇指', mvText);
  }

  // 8) 派西维尔请睁眼（无派西维尔整段跳过；v178：本场无梅林时不得念出"梅林"）
  if (has('派西维尔')) {
    var percText = has('梅林')
      ? '派西维尔请睁眼，请派西维尔确认两个梅林身份。'
      : '派西维尔请睁眼，请派西维尔确认你看到的那两个身份。';
    push('派西维尔请睁眼', percText);
    // 8.5) v192：派西维尔闭眼前，先让梅林、莫甘娜收回大拇指（v193 修正：由「闭上眼睛」改为「收回大拇指」，不启用名字放慢）
    if (has('梅林') || has('莫甘娜')) {
      push('梅林莫甘娜请收回大拇指', '请梅林、莫甘娜收回大拇指。');
    }
    // 9) 派西维尔闭上眼睛
    push('派西维尔请闭上眼睛', '派西维尔请闭上眼睛。');
  }

  // 10) 天亮了（v184：原「天亮请睁眼」改为「天亮了」；v178：队长与人数信息仅界面展示，不再朗读）
  push('天亮了', '天亮了。');
  // 11) v179：天亮后再加一句，此句之后不再播报任何语音
  push('所有人整理表情', '所有人整理表情，睁开眼睛。');

  return lines;
}

/* ---------- 台词文案清单（供外部查看，不改状态） ---------- */
function getNightVoiceLineTexts() {
  var ls = buildNightVoiceLines();
  var out = [];
  for (var i = 0; i < ls.length; i++) out.push({ step: ls[i].step, text: ls[i].text });
  return out;
}

/* ---------- 面板渲染 ---------- */
function nvRenderPanel() {
  var old = document.getElementById('nv-overlay');
  if (old && old.parentNode) old.parentNode.removeChild(old);

  var ov = document.createElement('div');
  ov.className = 'nv-overlay';
  ov.id = 'nv-overlay';

  var listHTML = '';
  for (var i = 0; i < NV.lines.length; i++) {
    listHTML += '<div class="nv-line" id="nv-line-' + i + '" onclick="nvJump(' + i + ')">'
      + '<span class="nv-line-step">' + (i + 1) + '. ' + escAttr(NV.lines[i].step) + '</span>'
      + '<span class="nv-line-text">' + escAttr(NV.lines[i].text) + '</span>'
      + '</div>';
  }

  // v179：逐句停顿设置行（按当前实际句序列出，显示步骤名 + 文本前十字）
  var gapsHTML = '';
  for (var gi = 0; gi < NV.lines.length; gi++) {
    var gStep = NV.lines[gi].step;
    var gFull = NV.lines[gi].text || '';
    var gCut = gFull.length > 10 ? gFull.slice(0, 10) + '…' : gFull;
    gapsHTML += '<div class="nv-gap-row">'
      + '<span class="nv-gap-idx">' + (gi + 1) + '.</span>'
      + '<span class="nv-gap-name">' + escAttr(gStep) + '</span>'
      + '<span class="nv-gap-preview" title="' + escAttr(gFull) + '">' + escAttr(gCut) + '</span>'
      + '<input type="number" class="nv-gap-input" min="' + NV_GAP_MIN + '" max="' + NV_GAP_MAX
      + '" step="' + NV_GAP_STEP + '" value="' + nvGapOf(gStep) + '" data-step="' + escAttr(gStep)
      + '" onchange="nvSetGapFor(this)">'
      + '<span class="nv-gap-unit">秒</span>'
      + '</div>';
  }

  // v184：播报倍速按钮（5 档横向，已删除 ×2 档）
  var rateBtnsHTML = '';
  for (var ri = 0; ri < NV_RATE_OPTS.length; ri++) {
    var rev = NV_RATE_OPTS[ri];
    rateBtnsHTML += '<button class="nv-rate-btn' + (Math.abs(rev - NV.rate) < 0.001 ? ' active' : '') + '"'
      + ' data-rate="' + rev + '" onclick="nvSetRate(' + rev + ')">×' + rev + '</button>';
  }

  // v191：名字放慢档位按钮（0.60 最慢 → 1.00 正常语速）
  var nameRateBtnsHTML = '';
  for (var ni = 0; ni < NV_NAME_RATES.length; ni++) {
    var nrv = NV_NAME_RATES[ni];
    nameRateBtnsHTML += '<button class="nv-name-rate-btn' + (nvNameRateEqual(nrv, NV.nameRate) ? ' active' : '') + '"'
      + ' data-name-rate="' + nrv + '" onclick="nvSetNameRate(' + nrv + ')">' + nrv.toFixed(2) + '</button>';
  }

  var myRoleHTML = '';

  if (state.myRole && state.myRole !== '不明') {
    myRoleHTML = '<span class="nv-badge">我的身份：' + escAttr(state.myRole) + '</span>';
  }

  ov.innerHTML =
    '<div class="nv-panel">'
    + '<div class="nv-head">'
    +   '<div class="nv-title">🌙 夜间行动语音播报</div>'
    +   '<button class="nv-close" onclick="nvClose()" aria-label="关闭">✕</button>'
    + '</div>'
    + '<div class="nv-stage">'
    +   '<div class="nv-step-name" id="nv-step-name">准备开始</div>'
    +   '<div class="nv-caption" id="nv-caption">点击「开始播报」开始夜间流程</div>'
    +   myRoleHTML
    + '</div>'
    + '<div class="nv-list" id="nv-list">' + listHTML + '</div>'
    + '<div class="nv-ctrl">'
    +   '<button class="btn small primary" id="nv-btn-play" onclick="nvTogglePlay()">开始播报</button>'
    +   '<button class="btn small" onclick="nvReplay()">重播</button>'
    +   '<button class="btn small" onclick="nvNext()">下一句</button>'
    +   '<button class="btn small" onclick="nvSkip()">跳过</button>'
    + '</div>'
    + '<div class="nv-setting nv-gaps-wrap">'
    +   '<div class="nv-setting-head" onclick="nvToggleGapsBody()">'
    +     '<span class="nv-setting-label">逐句停顿设置</span>'
    +     '<span class="nv-setting-hint" id="nv-gaps-hint">共 ' + NV.lines.length + ' 句，点击展开</span>'
    +   '</div>'
    +   '<div class="nv-gaps-body" id="nv-gaps-body" style="display:none">'
    +     gapsHTML
    +     '<div class="nv-gap-actions">'
    +       '<button class="btn small primary" onclick="nvSaveGaps()">保存停顿设置</button>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="nv-setting nv-rate-wrap">'
    +   '<span class="nv-setting-label">播报倍速</span>'
    +   '<div class="nv-rate-btns">' + rateBtnsHTML + '</div>'
    + '</div>'
    + '<div class="nv-setting nv-human-wrap">'
    +   '<span class="nv-setting-label">真人感</span>'
    +   '<button class="btn small nv-human-btn" id="nv-human-toggle" onclick="nvHumanToggle()">' + (NV.human ? '已开启' : '已关闭') + '</button>'
    +   '<span class="nv-gap-val">按标点自然停顿</span>'
    + '</div>'
    + '<div class="nv-setting nv-name-rate-wrap">'
    +   '<div class="nv-name-rate-head">'
    +     '<span class="nv-setting-label">名字放慢</span>'
    +     '<span class="nv-gap-val" id="nv-name-rate-val">' + nvNameRateText(NV.nameRate) + '</span>'
    +   '</div>'
    +   '<div class="nv-name-rate-btns">' + nameRateBtnsHTML + '</div>'
    +   '<div class="nv-name-rate-hint">仅「红色方请睁开眼睛」「红色方竖大拇指」两个环节的名字放慢；1.00 = 正常语速</div>'
    + '</div>'
    + '<div class="nv-setting">'
    +   '<span class="nv-setting-label">背景乐</span>'
    +   '<button class="btn small nv-bgm-btn" id="nv-bgm-toggle" onclick="nvmToggle()">' + (NVM.enabled ? '已开启' : '已关闭') + '</button>'
    +   '<input type="range" id="nv-bgm-vol" min="2" max="30" step="1" value="' + Math.round(NVM.vol * 100) + '" oninput="nvmSetVol(this.value)">'
    +   '<span class="nv-gap-val" id="nv-bgm-val">' + Math.round(NVM.vol * 100) + '%</span>'
    + '</div>'
    + '<div class="nv-tip" id="nv-tip">' + (NV.supported
        ? '支持开始 / 暂停 / 继续 / 重播 / 跳过，也可点列表任意一句直接跳转；倍速与停顿可分别调整，互不影响。真人感（按标点自然停顿）默认开启；名字放慢仅作用于「红色方请睁开眼睛」「红色方竖大拇指」两个环节，可调 0.60～1.00（1.00 = 正常语速）。关闭真人感时名字放慢一并暂停、恢复原速。'
        : '当前浏览器不支持语音合成（speechSynthesis），已降级为纯文字播报，可手动逐句推进。') + '</div>'
    + '</div>';

  document.body.appendChild(ov);
  NV.open = true;
  nvUpdateHighlight(NV.idx);
  nvRefreshPlayBtn();
}

function nvRefreshPlayBtn() {
  var btn = document.getElementById('nv-btn-play');
  if (!btn) return;
  if (NV.finished) btn.textContent = '重新播报';
  else if (NV.paused) btn.textContent = '继续播报';
  else if (NV.playing) btn.textContent = '暂停';
  else btn.textContent = '开始播报';
}

function nvUpdateHighlight(i) {
  var list = document.getElementById('nv-list');
  if (list) {
    var nodes = list.querySelectorAll('.nv-line');
    for (var k = 0; k < nodes.length; k++) {
      nodes[k].classList.remove('active', 'done');
      if (k < i) nodes[k].classList.add('done');
      if (k === i) nodes[k].classList.add('active');
    }
    if (i >= 0 && nodes[i] && nodes[i].scrollIntoView) {
      try { nodes[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    }
  }
  var sn = document.getElementById('nv-step-name');
  var cap = document.getElementById('nv-caption');
  if (i >= 0 && NV.lines[i]) {
    if (sn) sn.textContent = '第 ' + (i + 1) + ' 句 · ' + NV.lines[i].step;
    if (cap) cap.textContent = NV.lines[i].text;
  } else {
    if (sn) sn.textContent = '准备开始';
    if (cap) cap.textContent = '点击「开始播报」开始夜间流程';
  }
}

/* ---------- 播放控制 ---------- */
function nvClearTimer() {
  if (NV.timer) {
    clearTimeout(NV.timer);
    NV.timer = null;
  }
}

function nvStopSpeech() {
  if (!NV.supported) return;
  try { window.speechSynthesis.cancel(); } catch (e) {}
}

// 语音不可用（无 TTS 引擎 / 触发 error）时，按文本长度模拟正常语速推进字幕
function nvSimMs(text) {
  var len = (text || '').length;
  return Math.max(1800, Math.min(9000, len * 190));
}

function nvSimAdvance(mySeq, text) {
  nvClearTimer();
  NV.timer = setTimeout(function () {
    if (mySeq !== NV.seq || !NV.playing || NV.paused) return;
    nvScheduleNext();
  }, nvSimMs(text));
}

function nvMarkUnsupported() {
  NV.supported = false;
  var tip = document.getElementById('nv-tip');
  if (tip) {
    tip.textContent = '当前浏览器语音合成不可用，已切换为文字节奏播报（字幕自动推进，也可手动逐句）。';
  }
}

function nvSpeakAt(i) {
  nvClearTimer();
  if (!NV.open) return;
  if (i < 0) i = 0;
  if (i >= NV.lines.length) { nvFinish(); return; }
  nvmStart();   // v179：播报开始即播放背景乐（停顿期间不断，结束/跳过才停）
  NV.idx = i;
  NV.finished = false;
  NV._speakStart = 0;
  NV._started = false;
  var line = NV.lines[i];
  nvUpdateHighlight(i);
  var mySeq = ++NV.seq;

  // 不支持语音：按文本长度模拟节奏，只做字幕推进
  if (!NV.supported) {
    nvSimAdvance(mySeq, line.text);
    return;
  }

  // v177：先等语音列表就绪并锁定 zh-CN 标准普通话音色，再真正开口
  nvResolveVoice(function (voice) {
    if (mySeq !== NV.seq || !NV.open) return;
    nvStartUtterance(line, mySeq, voice);
  });
}

/* ---------- v190：真人感切句（角色名字片段单独放慢，句内按标点做微停顿） ---------- */
// 角色名可读名（长词优先，保证「红色兰斯洛特」不被切成「兰斯洛特」）
function nvNameWords() {
  if (NV._nameWords) return NV._nameWords;
  var raw = [], i;
  try {
    for (i = 0; i < ALL_ROLES.length; i++) raw.push(nvRoleName(ALL_ROLES[i]));
  } catch (e) {}
  raw = raw.concat(['红色兰斯洛特', '蓝色兰斯洛特', '莫甘娜', '莫德雷德', '奥伯伦', '派西维尔', '刺客', '爪牙', '梅林', '忠臣']);
  var seen = {}, out = [];
  raw.sort(function (a, b) { return b.length - a.length; });
  for (i = 0; i < raw.length; i++) {
    var w = raw[i];
    if (!w || seen[w]) continue;
    seen[w] = 1;
    out.push(w);
  }
  NV._nameWords = out;
  return out;
}

// 按角色名切成 [{text, name}]，名字片段 rate 系数 = NV_NAME_RATE
function nvSplitByNames(text, words) {
  var out = [], i = 0, k;
  while (i < text.length) {
    var hit = null;
    for (k = 0; k < words.length; k++) {
      if (text.substr(i, words[k].length) === words[k]) { hit = words[k]; break; }
    }
    if (hit) {
      out.push({ text: hit, name: true });
      i += hit.length;
    } else {
      var ch = text.charAt(i);
      if (out.length && !out[out.length - 1].name) out[out.length - 1].text += ch;
      else out.push({ text: ch, name: false });
      i++;
    }
  }
  return out;
}

// 生成一句话的朗读片段：命中名字放慢的两个环节才把角色名单独切出并减速；其余句子正常语速
// v191：是否名字放慢由 line.step（step 键名）判定，不依赖句子序号
function nvLineNameSlow(line) {
  return !!(line && NV_NAME_STEPS[line.step]);
}

function nvBuildSpeechSegments(line) {
  var text = (line && line.text) || '';
  var human = nvHumanActive();
  if (!human || !text) return [{ text: text, rateFactor: 1, pauseAfter: 0 }];
  var nameSlow = nvLineNameSlow(line);          // v191：非目标环节不切名字段，保持原速与原节奏
  var nameFactor = nameSlow ? nvNameRateFactor() : 1;
  var toks = nvSplitByNames(text, nameSlow ? nvNameWords() : []);
  var cut = [], i, k;
  for (i = 0; i < toks.length; i++) {
    var t = toks[i];
    if (t.name && nameSlow) { cut.push({ text: t.text, name: true }); continue; }
    var s = typeof t.text === 'string' ? t.text : '';
    var buf = '';
    for (k = 0; k < s.length; k++) {
      buf += s.charAt(k);
      if (NV_PAUSE_CHARS[s.charAt(k)] && k < s.length - 1) { cut.push({ text: buf, name: false }); buf = ''; }
    }
    if (buf) {
      // 非名字段内部连续文本在原实现中是逐字累积的，这里同样合并且不与已切出的名字段混淆
      cut.push({ text: buf, name: false });
    }
  }
  var segs = [];
  for (i = 0; i < cut.length; i++) {
    var cur = { text: cut[i].text, rateFactor: cut[i].name ? nameFactor : 1, pauseAfter: 0, name: !!cut[i].name };
    // 紧随的纯标点片段并入本段（名字段不并入，保证只放慢名字本身）
    while (!cur.name && i + 1 < cut.length && !cut[i + 1].name && /^[，、；：。！？,;:.!?…]+$/.test(cut[i + 1].text)) {
      cur.text += cut[++i].text;
    }
    var tail = cur.text.slice(-1);
    cur.pauseAfter = NV_PAUSE_CHARS[tail] || (cur.name ? 60 : 0);
    segs.push(cur);
  }
  if (!segs.length) segs.push({ text: text, rateFactor: 1, pauseAfter: 0 });
  return segs;
}

// 片段实际语速 = 五档倍速 × 片段系数（名字段 0.82，其余 1）
// 真人感实际生效条件：开关打开且当前音色达到高质量门槛（否则回落 v189 现有逻辑）
function nvHumanActive() {
  return !!NV.human && NV._voiceGood !== false;
}

function nvSegRate(seg) {
  var base = NV.rate || 1;
  var f = (nvHumanActive() && seg && seg.rateFactor) ? seg.rateFactor : 1;
  var r = Math.round(base * f * 100) / 100;
  if (r < 0.1) r = 0.1;
  if (r > 2) r = 2;
  return r;
}

function nvPitch() {
  return nvHumanActive() ? NV_PITCH : 1;
}

function nvStartUtterance(line, mySeq, voice) {
  NV._seg = nvBuildSpeechSegments(line);
  NV._segI = 0;
  NV._lineDone = 0;
  NV._idleChecks = 0;
  if (!NV._seg.length) { nvSimAdvance(mySeq, line.text); return; }
  var needDelay = false;
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      needDelay = true;
    }
  } catch (e) {}
  var start = function () { nvSpeakSeg(line, mySeq, voice, 0); };
  NV.playing = true;
  nvRefreshPlayBtn();
  if (needDelay) setTimeout(start, 90);
  else start();

  // 兜底：个别环境 onend 不触发，检测 speaking 状态后强行推进（v190：先判本句是否已读完）
  var tick = function () {
    if (mySeq !== NV.seq) return;
    if (NV._lineDone === mySeq) return;                  // 本句片段已全部读完，停止看门狗
    if (!NV.playing || NV.paused) { NV._wdTimer = setTimeout(tick, 800); return; }
    var speaking = false;
    try { speaking = window.speechSynthesis.speaking || window.speechSynthesis.pending; } catch (e) {}
    if (speaking) {
      var stuckMs = Date.now() - (NV._speakStart || Date.now());
      if (!NV._started && stuckMs > 6000) {
        try { window.speechSynthesis.cancel(); } catch (e2) {}
        NV._errCount = (NV._errCount || 0) + 1;
        if (NV._errCount >= 2) nvMarkUnsupported();
        nvSimAdvance(mySeq, line.text);
        return;
      }
      NV._wdTimer = setTimeout(tick, 700);
      return;
    }
    // 片段之间的微停顿期间 speaking 为 false：若本句还有后续片段，稍后再看，不能提前跳句
    var last = NV._seg ? NV._seg.length - 1 : 0;
    if ((NV._segI || 0) < last) { NV._wdTimer = setTimeout(tick, 160); return; }
    // 最后一段刚结束、onend 尚未回调时也别抢跑：连续两次探测空闲才判定本句读完
    NV._idleChecks = (NV._idleChecks || 0) + 1;
    if (NV._idleChecks < 2) { NV._wdTimer = setTimeout(tick, 260); return; }
    NV._speakStart = 0;
    nvmDuck(false);
    NV._lineDone = mySeq;
    nvScheduleNext();
  };
  NV._speakStart = Date.now();
  if (NV._wdTimer) { clearTimeout(NV._wdTimer); NV._wdTimer = null; }
  NV._wdTimer = setTimeout(tick, Math.max(3500, line.text.length * 260 + 900));
}

// 朗读单个片段；片段结束按 pauseAfter 微停顿后继续下一个，全部读完再进入句间停顿
function nvSpeakSeg(line, mySeq, voice, si) {
  var segs = NV._seg || [];
  if (si >= segs.length) {
    if (mySeq !== NV.seq) return;
    NV._lineDone = mySeq;
    nvmDuck(false);
    if (!NV.playing || NV.paused) return;
    nvScheduleNext();
    return;
  }
  if (mySeq !== NV.seq || !NV.playing || NV.paused) return;
  NV._segI = si;
  var seg = segs[si];
  var u;
  try {
    u = new SpeechSynthesisUtterance(seg.text);
  } catch (e) {
    nvSimAdvance(mySeq, line.text);
    return;
  }
  u.lang = 'zh-CN';             // 每个 Utterance 显式指定普通话，避免跟随系统默认语言
  u.rate = nvSegRate(seg);      // v190：档位 × 片段系数（名字 0.82 / 其余 1）
  u.pitch = nvPitch();          // v190：真人感开启时轻微下压到 0.95
  u.volume = 1;
  if (voice) u.voice = voice;
  else if (si === 0) nvWarnNoCnVoice();
  u.onstart = function () {
    NV._started = true;
    nvmDuck(true);    // v179：语音朗读时把背景乐压低到约六成
  };
  u.onend = function () {
    if (mySeq !== NV.seq || !NV.playing || NV.paused) return;
    if (si === segs.length - 1) nvmDuck(false);
    var next = function () {
      if (mySeq !== NV.seq || !NV.playing || NV.paused) return;
      nvSpeakSeg(line, mySeq, voice, si + 1);
    };
    var pause = seg.pauseAfter || 0;
    if (pause > 0) { nvClearTimer(); NV.timer = setTimeout(next, pause); }
    else next();
  };
  u.onerror = function () {
    nvmDuck(false);
    if (mySeq !== NV.seq || !NV.playing || NV.paused) return;
    NV._errCount = (NV._errCount || 0) + 1;
    if (NV._errCount >= 2) nvMarkUnsupported();
    nvSimAdvance(mySeq, line.text);
  };
  NV.utter = u;
  NV.playing = true;
  nvRefreshPlayBtn();
  try {
    window.speechSynthesis.speak(u);
  } catch (e) {
    NV._errCount = (NV._errCount || 0) + 1;
    if (NV._errCount >= 2) nvMarkUnsupported();
    nvSimAdvance(mySeq, line.text);
  }
}

function nvScheduleNext() {
  nvClearTimer();
  if (!NV.open || !NV.playing || NV.paused) return;
  // v179：第 N 句结束后按"该句"配置的秒数停顿，再播下一句
  var curLine = NV.lines[NV.idx];
  var gapSec = curLine ? nvGapOf(curLine.step) : NV.gap;
  var gapMs = Math.round(gapSec * 1000);
  if (gapMs <= 0) { nvSpeakAt(NV.idx + 1); return; }
  NV.timer = setTimeout(function () {
    if (!NV.open || !NV.playing || NV.paused) return;
    nvSpeakAt(NV.idx + 1);
  }, gapMs);
}

function nvFinish() {
  NV.playing = false;
  NV.paused = false;
  NV.finished = true;
  nvClearTimer();
  nvmStop();   // v179：播报结束即停止背景乐
  nvRefreshPlayBtn();
  var sn = document.getElementById('nv-step-name');
  var cap = document.getElementById('nv-caption');
  if (sn) sn.textContent = '播报结束';
  if (cap) cap.textContent = '夜间流程播报完毕，请开始第一轮组队。';
  nvEnterTeamStageIfPending();   // v183：队长确认停留态下播完即切到组队页
}

function nvTogglePlay() {
  if (!NV.open) { openNightVoice(false); return; }
  nvUnlockSpeech();
  nvmEnsure();   // v179：手势内解锁 AudioContext（移动端必需）
  if (NV.finished) { nvStartFrom(0); return; }
  if (NV.playing && !NV.paused) { nvPause(); return; }
  if (NV.paused) { nvResume(); return; }
  nvStartFrom(NV.idx >= 0 ? NV.idx : 0);
}

function nvStartFrom(i) {
  NV.lines = buildNightVoiceLines();
  if (!NV.lines.length) { toast('本场没有可播报的夜间流程', 'warn'); return; }
  // v184：启动播报时再拉一次云端停顿（异步、不阻塞；拉到后按新值执行后续句）
  if (!NV._cloudPullTs || (Date.now() - NV._cloudPullTs) > 8000) nvCloudPullGaps(null);
  NV.playing = true;
  NV.paused = false;
  NV.finished = false;
  NV.seq++;
  nvRefreshPlayBtn();
  nvSpeakAt(i || 0);
}

function nvPause() {
  NV.paused = true;
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  nvmDuck(false);   // v179：暂停时背景乐不中断，只恢复正常音量
  nvRefreshPlayBtn();
  var sn = document.getElementById('nv-step-name');
  if (sn && NV.idx >= 0) sn.textContent = '已暂停 · 第 ' + (NV.idx + 1) + ' 句';
}

function nvResume() {
  NV.paused = false;
  NV.playing = true;
  nvUnlockSpeech();
  nvRefreshPlayBtn();
  var at = NV.idx >= 0 ? NV.idx : 0;
  NV.seq++;
  nvSpeakAt(at);
}

function nvReplay() {
  if (!NV.open) return;
  nvUnlockSpeech();
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  NV.idx = -1;
  NV.paused = false;
  NV.finished = false;
  NV.playing = true;
  nvRefreshPlayBtn();
  nvSpeakAt(0);
}

function nvNext() {
  if (!NV.open) return;
  if (!NV.playing && !NV.paused && !NV.finished && NV.idx < 0) { nvStartFrom(0); return; }
  NV.paused = false;
  NV.playing = true;
  NV.finished = false;
  nvUnlockSpeech();
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  nvSpeakAt(NV.idx + 1);
}

function nvJump(i) {
  if (!NV.open) return;
  if (!NV.lines[i]) return;
  NV.paused = false;
  NV.playing = true;
  NV.finished = false;
  nvUnlockSpeech();
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  nvSpeakAt(i);
}

function nvSkip() {
  NV.playing = false;
  NV.paused = false;
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  nvmStop();   // v179：跳过播报后停止背景乐
  nvClose();
  toast('已跳过夜间语音播报');
}

/* ---------- v179：逐句停顿时长 ---------- */
function nvClampGap(v) {
  var g = parseFloat(v);
  if (isNaN(g)) g = NV_GAP_DEFAULT;
  g = Math.round(g / NV_GAP_STEP) * NV_GAP_STEP;
  if (g < NV_GAP_MIN) g = NV_GAP_MIN;
  if (g > NV_GAP_MAX) g = NV_GAP_MAX;
  return g;
}

// v185：播报句子措辞改为「闭上眼睛」并调整红色方顺序后，兼容旧版保存的停顿配置（旧键名用转义写法，避免源码出现旧措辞）
var NV_STEP_ALIAS = {
  '天黑请\u95ed\u773c': '天黑请闭上眼睛',
  '红色方请睁眼': '红色方请睁开眼睛',
  '红色方请\u95ed\u773c': '红色方请闭上眼睛',
  '梅林请\u95ed\u773c': '梅林请闭上眼睛',
  '派西维尔请\u95ed\u773c': '派西维尔请闭上眼睛'
};
function nvStepAlias(k) {
  if (!k) return k;
  return NV_STEP_ALIAS[k] || k;
}

// 取某一句的停顿秒数：优先逐句配置，缺项回退默认值
function nvGapOf(step) {
  var sk = nvStepAlias(step);
  if (sk && Object.prototype.hasOwnProperty.call(NV.gaps, sk)) {
    var v = parseFloat(NV.gaps[sk]);
    if (!isNaN(v)) return v;
  }
  // 兼容旧版 step 名
  if (step && Object.prototype.hasOwnProperty.call(NV.gaps, step)) {
    var v2 = parseFloat(NV.gaps[step]);
    if (!isNaN(v2)) return v2;
  }
  return NV.gap;
}

function nvToggleGapsBody() {
  var body = document.getElementById('nv-gaps-body');
  var hint = document.getElementById('nv-gaps-hint');
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (hint) hint.textContent = open ? ('共 ' + NV.lines.length + ' 句，点击展开') : ('共 ' + NV.lines.length + ' 句，点击收起');
}

// 单句输入即时生效（未点保存前不写入本地存储）
function nvSetGapFor(el) {
  if (!el) return;
  var step = el.getAttribute('data-step');
  var g = nvClampGap(el.value);
  el.value = g;
  if (step) NV.gaps[step] = g;
}

function nvSaveGaps() {
  try {
    var obj = {};
    for (var k in NV.gaps) {
      if (Object.prototype.hasOwnProperty.call(NV.gaps, k)) obj[k] = NV.gaps[k];
    }
    localStorage.setItem('avalon_voice_gaps', JSON.stringify(obj));
    localStorage.setItem('avalon_voice_gap', String(NV.gap));
    // v184：同时写云端，其它设备进入播报面板或启动播报即拉取到新值
    var pushed = nvCloudPushGaps(function (ok) {
      toast(ok ? '已保存停顿设置，云端已同步，其它设备打开播报即生效'
               : '已保存到本机（云端同步失败，联网后再点保存即可）', ok ? 'ok' : 'warn');
    });
    if (!pushed) toast('已保存停顿设置（本机），云端同步暂不可用', 'warn');
  } catch (e) {
    toast('保存失败：浏览器本地存储不可用', 'warn');
  }
}

/* ---------- v184：逐句停顿跨设备云端同步（复用 Supabase key_value 表，key = avalon_voice_gaps） ----------
   云端结构：{ gap: 统一默认秒数, gaps: { 步骤名: 秒数 }, ts: 客户端写入时间戳 }
   策略：以云端为准；localStorage 仅作缓存与离线兜底；拉取失败静默回落本地、不报错不打断播报；
        写入为整条 upsert 覆盖，并发时最后写入者生效。 */
var NV_GAPS_CLOUD_KEY = 'avalon_voice_gaps';
var NV_GAPS_REST = '/rest/v1/key_value';

function nvGapsSnapshot() {
  var gaps = {};
  for (var k in NV.gaps) {
    if (Object.prototype.hasOwnProperty.call(NV.gaps, k)) gaps[k] = nvClampGap(NV.gaps[k]);
  }
  return { gap: nvClampGap(NV.gap), gaps: gaps, ts: Date.now() };
}

// 应用一份停顿配置（云端或实时推送），并同步刷新面板控件
function nvApplyGapsPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  var changed = false;
  if (payload.gaps && typeof payload.gaps === 'object') {
    var ng = {};
    for (var k in payload.gaps) {
      if (!Object.prototype.hasOwnProperty.call(payload.gaps, k)) continue;
      var gv = parseFloat(payload.gaps[k]);
      if (!isNaN(gv)) ng[nvStepAlias(k)] = nvClampGap(gv);
    }
    NV.gaps = ng;
    changed = true;
  }
  if (payload.gap !== undefined && payload.gap !== null && payload.gap !== '') {
    var g = parseFloat(payload.gap);
    if (!isNaN(g)) { NV.gap = nvClampGap(g); changed = true; }
  }
  if (!changed) return false;
  try {
    localStorage.setItem('avalon_voice_gaps', JSON.stringify(NV.gaps));
    localStorage.setItem('avalon_voice_gap', String(NV.gap));
  } catch (e) {}
  nvRefreshGapUI();
  return true;
}

// 面板已渲染时把最新停顿值写回控件（不重绘面板，避免打断播放）
function nvRefreshGapUI() {
  try {
    var rows = document.querySelectorAll('.nv-gap-input[data-step]');
    for (var i = 0; i < rows.length; i++) {
      rows[i].value = nvGapOf(rows[i].getAttribute('data-step'));
    }
    /* v185：已删除「统一设为 X 秒」预设控件，无需同步该输入框 */
  } catch (e) {}
}

// 拉取云端停顿；失败/超时静默回落本地，回调最多触发一次
function nvCloudPullGaps(done) {
  var finished = false;
  var finish = function (ok) {
    if (finished) return;
    finished = true;
    if (typeof done === 'function') { try { done(ok); } catch (e) {} }
  };
  NV._cloudPullTs = Date.now();
  var guard = setTimeout(function () { finish(false); }, 2500);
  try {
    if (typeof fetch !== 'function') { clearTimeout(guard); finish(false); return; }
    fetch(SUPABASE_URL + NV_GAPS_REST + '?select=value&key=eq.' + encodeURIComponent(NV_GAPS_CLOUD_KEY), {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (rows) {
      clearTimeout(guard);
      var val = (rows && rows.length) ? rows[0].value : null;
      if (!val) { finish(false); return; }
      var ok = nvApplyGapsPayload(val);
      console.log('[nvGaps] cloud pull ok:', JSON.stringify(val));
      finish(ok);
    }).catch(function (e) {
      clearTimeout(guard);
      console.warn('[nvGaps] cloud pull failed, fallback to local:', e && (e.message || e));
      finish(false);
    });
  } catch (e) {
    clearTimeout(guard);
    finish(false);
  }
}

// 写入云端（整条覆盖 upsert，最后写入者生效）；done(ok) 最多回调一次，用于给用户真实结果
function nvCloudPushGaps(done) {
  var settled = false;
  var finish = function (ok, why) {
    if (settled) return;
    settled = true;
    if (typeof done === 'function') { try { done(ok, why); } catch (e) {} }
  };
  try {
    if (typeof fetch !== 'function') { finish(false, 'fetch unavailable'); return false; }
    var snap = nvGapsSnapshot();
    var guard = setTimeout(function () { finish(false, 'timeout'); }, 2500);
    fetch(SUPABASE_URL + NV_GAPS_REST + '?on_conflict=key', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([{ key: NV_GAPS_CLOUD_KEY, value: snap, updated_at: new Date().toISOString() }])
    }).then(function (r) {
      clearTimeout(guard);
      if (!r.ok) { console.warn('[nvGaps] cloud save HTTP ' + r.status); finish(false, 'HTTP ' + r.status); }
      else { console.log('[nvGaps] cloud saved:', JSON.stringify(snap)); finish(true); }
    }).catch(function (e) {
      clearTimeout(guard);
      console.warn('[nvGaps] cloud save failed:', e && (e.message || e));
      finish(false, e && (e.message || 'network error'));
    });
    return true;
  } catch (e) {
    console.warn('[nvGaps] cloud save exception:', e);
    finish(false, 'exception');
    return false;
  }
}

// 其它设备保存后实时生效
function nvOnCloudGapsRealtime(val) {
  if (!val) return;
  if (nvApplyGapsPayload(val)) console.log('[nvGaps] applied realtime update');
}

/* ---------- v183：播报倍速（只作用于语音 rate，句间停顿仍按真实秒数独立执行） ---------- */
function nvClampRate(v) {
  var r = parseFloat(v);
  if (isNaN(r)) return NV_RATE_DEFAULT;
  for (var i = 0; i < NV_RATE_OPTS.length; i++) {
    if (Math.abs(NV_RATE_OPTS[i] - r) < 0.001) return NV_RATE_OPTS[i];
  }
  return NV_RATE_DEFAULT;
}

// 切换倍速：立即持久化并在下一句生效，正在朗读的当前句不打断
function nvSetRate(v) {
  NV.rate = nvClampRate(v);
  try { localStorage.setItem('avalon_voice_rate', String(NV.rate)); } catch (e) {}
  nvRefreshRateBtns();
}

function nvRefreshRateBtns() {
  var btns = document.querySelectorAll('.nv-rate-btn');
  for (var i = 0; i < btns.length; i++) {
    var rv = parseFloat(btns[i].getAttribute('data-rate'));
    if (Math.abs(rv - NV.rate) < 0.001) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
}

// v190：真人感开关（默认开启）——角色名字放慢 + 句内标点微停顿 + 音高微调，立刻持久化并作用于下一句
function nvHumanToggle() {
  NV.human = !NV.human;
  try { localStorage.setItem('avalon_voice_human', NV.human ? '1' : '0'); } catch (e) {}
  var btn = document.getElementById('nv-human-toggle');
  if (btn) btn.textContent = NV.human ? '已开启' : '已关闭';
  nvRefreshNameRateBtns();
  toast(NV.human ? '已开启真人感：角色名字放慢、按标点自然停顿' : '已关闭真人感：恢复原速朗读（名字放慢同时暂停）');
}

/* ---------- v191：名字放慢系数（仅「红色方请睁开眼睛」「红色方竖大拇指」两个环节的名字片段） ---------- */
// 合法档位：命中 NV_NAME_RATES 取该档，否则按 0.6~1.0 夹取并保留两位小数
function nvClampNameRate(v) {
  var r = parseFloat(v);
  if (isNaN(r)) return NV_NAME_RATE_DEFAULT;
  for (var i = 0; i < NV_NAME_RATES.length; i++) {
    if (Math.abs(NV_NAME_RATES[i] - r) < 0.001) return NV_NAME_RATES[i];
  }
  if (r < 0.6) return 0.6;
  if (r > 1.0) return 1.0;
  return Math.round(r * 100) / 100;
}

function nvNameRateEqual(a, b) {
  return Math.abs(parseFloat(a) - parseFloat(b)) < 0.001;
}

// 当前生效的名字放慢系数：真人感关闭或音色不达标时不放慢（与原速一致）
function nvNameRateFactor() {
  var c = nvClampNameRate(NV.nameRate);
  if (!nvHumanActive()) return 1;
  return c;
}

// 切换名字放慢档位：立即持久化，作用于下一句
function nvSetNameRate(v) {
  NV.nameRate = nvClampNameRate(v);
  try { localStorage.setItem('avalon_voice_name_rate', String(NV.nameRate)); } catch (e) {}
  nvRefreshNameRateBtns();
  nvRefreshNameRateLabel();
  toast('名字放慢已设为 ' + nvNameRateText(NV.nameRate));
}

function nvNameRateText(v) {
  var r = parseFloat(v);
  if (Math.abs(r - 1) < 0.001) return '1.00（正常语速）';
  return r.toFixed(2);
}

function nvRefreshNameRateBtns() {
  var btns = document.querySelectorAll('.nv-name-rate-btn');
  for (var i = 0; i < btns.length; i++) {
    var rv = parseFloat(btns[i].getAttribute('data-name-rate'));
    if (nvNameRateEqual(rv, NV.nameRate)) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
}

function nvRefreshNameRateLabel() {
  var el = document.getElementById('nv-name-rate-val');
  if (el) el.textContent = nvNameRateText(NV.nameRate);
}

/* ---------- v180：背景乐（Web Audio 程序化合成「F 轻快拨弦」，零外部依赖、无版权音频） ---------- */
var NVM = {
  ctx: null,
  master: null,
  chain: [],
  oscs: [],
  playing: false,
  enabled: true,
  vol: 0.08,
  duck: false,
  timer: null,
  nextTime: 0,
  step: 0
};
var NVM_DUCK_RATIO = 0.6;   // 朗读时压低到约六成
var NVM_VOL_MAX = 0.30;

/* 编曲参数：BPM 112 / 4-4 / 每拍两个八分音符 */
var NVM_BPM = 112;
var NVM_EIGHTH = 60 / NVM_BPM / 2;   // ≈0.2679s
var NVM_STEPS_PER_BAR = 8;           // 4 拍 × 2
var NVM_ATTACK = 0.003;              // 3ms attack 防爆音
var NVM_DECAY_K = 6;                 // exp(-6t) 快速衰减
var NVM_TAIL = 0.6;                  // 拨弦尾长上限 0.6s
var NVM_BASS_AMP = 0.12;             // 每小节第一拍低音根音
var NVM_LOOKAHEAD = 0.25;
var NVM_TICK_MS = 25;

/* 五声音阶 C4 D4 E4 G4 A4 C5 */
var NVM_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
/* 行进型旋律（八分音符序列，索引指向 NVM_SCALE），上下流动、避免连续重复 */
var NVM_PATTERNS = [
  [0, 2, 3, 4, 3, 2, 1, 0],
  [1, 3, 4, 5, 4, 3, 2, 1],
  [2, 4, 3, 5, 4, 2, 3, 1],
  [0, 3, 4, 3, 5, 4, 2, 0],
  [1, 2, 4, 3, 2, 4, 5, 3]
];
/* 每小节低音根音（C3 / A2 / G2 / C3） */
var NVM_BASS = [130.81, 110.00, 98.00, 130.81];

(function nvmInitCfg() {
  try {
    if (localStorage.getItem('avalon_bgm_on') === '0') NVM.enabled = false;
    var v = parseFloat(localStorage.getItem('avalon_bgm_vol'));
    if (!isNaN(v) && v >= 0 && v <= NVM_VOL_MAX) NVM.vol = v;
  } catch (e) {}
})();

function nvmTargetGain() {
  var g = NVM.vol * (NVM.duck ? NVM_DUCK_RATIO : 1);
  if (g < 0) g = 0;
  if (g > 1) g = 1;
  return g;
}

// 创建 / 唤醒 AudioContext（必须在用户手势里调用一次以解锁移动端）
function nvmEnsure() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!NVM.ctx) {
      NVM.ctx = new AC();
      NVM.master = NVM.ctx.createGain();
      NVM.master.gain.value = 0;
      NVM.master.connect(NVM.ctx.destination);
    }
    if (NVM.ctx.state === 'suspended' && NVM.ctx.resume) {
      try { NVM.ctx.resume(); } catch (e) {}
    }
    return NVM.ctx;
  } catch (e) {
    return null;
  }
}

// 拨弦音色：基频 + 二次泛音 0.3 + 三次泛音 0.12，3ms attack，exp(-6t) 指数衰减，尾长 ≤0.6s
function nvmPluck(at, freq, amp, tail) {
  var ctx = NVM.ctx;
  if (!ctx || !freq) return;
  if (!(tail > 0)) tail = NVM_TAIL;
  if (tail > NVM_TAIL) tail = NVM_TAIL;
  var env = ctx.createGain();
  var stopAt = at + tail + 0.02;
  var floor = Math.max(amp * Math.exp(-NVM_DECAY_K * (tail - NVM_ATTACK)), 0.00001);
  try {
    env.gain.setValueAtTime(0.00001, at);
    env.gain.linearRampToValueAtTime(amp, at + NVM_ATTACK);
    env.gain.exponentialRampToValueAtTime(floor, at + tail);
  } catch (e) {
    try { env.gain.value = amp; } catch (e2) {}
  }
  env.connect(NVM.bus);

  var parts = [[1, 1], [2, 0.3], [3, 0.12]];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var f = freq * p[0];
    if (f > 12000) continue;
    var o = ctx.createOscillator();
    var og = ctx.createGain();
    o.type = 'sine';           // 仅 sine / triangle，禁用 square / sawtooth
    o.frequency.value = f;
    og.gain.value = p[1];
    o.connect(og);
    og.connect(env);
    try { o.start(at); o.stop(stopAt); } catch (e) {}
    NVM.oscs.push(o);
  }
  while (NVM.oscs.length > 96) {
    var old = NVM.oscs.shift();
    try { old.disconnect(); } catch (e) {}
  }
}

// 滤波链：highpass 300Hz（切净低频嗡鸣）+ lowpass 5500Hz + 双延迟（0.12s/0.19s，反馈 0.15/0.10，无混响）
function nvmBuildGraph() {
  var ctx = NVM.ctx;
  var bus = ctx.createGain();
  bus.gain.value = 1;

  var hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 300;
  hp.Q.value = 0.7;

  var lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5500;
  lp.Q.value = 0.7;

  var post = ctx.createGain();
  post.gain.value = 0.9;

  var d1 = ctx.createDelay(1.0);
  d1.delayTime.value = 0.12;
  var fb1 = ctx.createGain();
  fb1.gain.value = 0.15;

  var d2 = ctx.createDelay(1.0);
  d2.delayTime.value = 0.19;
  var fb2 = ctx.createGain();
  fb2.gain.value = 0.10;

  var wet = ctx.createGain();
  wet.gain.value = 0.26;

  bus.connect(hp);
  hp.connect(lp);
  lp.connect(post);
  post.connect(NVM.master);
  post.connect(d1);
  post.connect(d2);
  d1.connect(fb1);
  fb1.connect(d1);
  d1.connect(wet);
  d2.connect(fb2);
  fb2.connect(d2);
  d2.connect(wet);
  wet.connect(NVM.master);

  NVM.bus = bus;
  NVM.nodes = [bus, hp, lp, post, d1, fb1, d2, fb2, wet];
  NVM.chain = NVM.nodes.slice();
}

function nvmApplyGain(fadeSec) {
  if (!NVM.ctx || !NVM.master) return;
  var now = NVM.ctx.currentTime;
  var target = nvmTargetGain();
  try {
    var gain = NVM.master.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + (fadeSec || 0.25));
  } catch (e) {
    try { NVM.master.gain.value = target; } catch (e2) {}
  }
}

// 单步发声：八分音符位置 idx（0-7），小节第一拍叠一个轻低音根音（无持续低音铺底）
function nvmEmitStep(step, at) {
  var idx = step % NVM_STEPS_PER_BAR;
  var bar = Math.floor(step / NVM_STEPS_PER_BAR);
  var pat = NVM_PATTERNS[bar % NVM_PATTERNS.length];
  var f = NVM_SCALE[pat[idx] % NVM_SCALE.length];
  var amp = (idx % 2 === 0) ? 0.5 : 0.34;   // 强弱交替，轻快律动
  if (idx === 0) {
    nvmPluck(at, NVM_BASS[bar % NVM_BASS.length], NVM_BASS_AMP, 0.45);
  }
  nvmPluck(at, f, amp, NVM_TAIL);
}

// 前瞻调度（setInterval 每 25ms 排 0.25s），保证时间稳定无抖动
function nvmSchedule() {
  var ctx = NVM.ctx;
  if (!ctx || !NVM.playing) return;
  var horizon = ctx.currentTime + NVM_LOOKAHEAD;
  if (NVM.nextTime < ctx.currentTime - 0.4) NVM.nextTime = ctx.currentTime + 0.05;
  var guard = 0;
  while (NVM.nextTime < horizon && guard++ < 64) {
    nvmEmitStep(NVM.step, NVM.nextTime);
    NVM.step++;
    NVM.nextTime += NVM_EIGHTH;
  }
}

// 播报开始即播放（暂停/停顿期间持续）
function nvmStart() {
  if (!NVM.enabled) return;
  var ctx = nvmEnsure();
  if (!ctx) return;
  if (NVM.playing) { nvmApplyGain(0.25); return; }
  try {
    nvmBuildGraph();
    NVM.step = 0;
    NVM.nextTime = ctx.currentTime + 0.05;
    NVM.playing = true;
    nvmSchedule();
    if (NVM.timer) clearInterval(NVM.timer);
    NVM.timer = setInterval(nvmSchedule, NVM_TICK_MS);
    nvmApplyGain(1.2);
  } catch (e) {
    NVM.playing = false;
    if (NVM.timer) { clearInterval(NVM.timer); NVM.timer = null; }
  }
}

// 播报结束 / 跳过 / 关闭面板即停止（淡出后释放节点）
function nvmStop() {
  var ctx = NVM.ctx;
  if (NVM.timer) { clearInterval(NVM.timer); NVM.timer = null; }
  if (ctx && NVM.master && NVM.playing) {
    var now = ctx.currentTime;
    try {
      var gain = NVM.master.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0, now + 0.5);
    } catch (e) {
      try { NVM.master.gain.value = 0; } catch (e2) {}
    }
  }
  NVM.playing = false;
  NVM.duck = false;
  var oscs = NVM.oscs.slice();
  var chain = (NVM.nodes || NVM.chain || []).slice();
  NVM.oscs = [];
  NVM.chain = [];
  NVM.nodes = [];
  NVM.bus = null;
  setTimeout(function () {
    var i;
    for (i = 0; i < oscs.length; i++) {
      try { oscs[i].stop(); } catch (e) {}
      try { oscs[i].disconnect(); } catch (e) {}
    }
    for (i = 0; i < chain.length; i++) {
      try { chain[i].disconnect(); } catch (e) {}
    }
  }, 640);
}

// 语音朗读期间轻微压低背景乐
function nvmDuck(on) {
  var next = !!on;
  if (NVM.duck === next) return;
  NVM.duck = next;
  if (NVM.playing) nvmApplyGain(0.12);
}

function nvmToggle() {
  NVM.enabled = !NVM.enabled;
  try { localStorage.setItem('avalon_bgm_on', NVM.enabled ? '1' : '0'); } catch (e) {}
  var btn = document.getElementById('nv-bgm-toggle');
  if (btn) btn.textContent = NVM.enabled ? '已开启' : '已关闭';
  if (!NVM.enabled) {
    nvmStop();
  } else if (NV.open && (NV.playing || NV.paused)) {
    nvmStart();
  }
}

function nvmSetVol(v) {
  var pct = parseFloat(v);
  if (isNaN(pct)) pct = 8;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  NVM.vol = Math.min(NVM_VOL_MAX, pct / 100);
  var lab = document.getElementById('nv-bgm-val');
  if (lab) lab.textContent = Math.round(NVM.vol * 100) + '%';
  try { localStorage.setItem('avalon_bgm_vol', String(NVM.vol)); } catch (e) {}
  if (NVM.playing) nvmApplyGain(0.2);
}

function nvSetGap(v) {
  var g = parseInt(v, 10);
  if (isNaN(g)) g = NV_GAP_DEFAULT;
  if (g < NV_GAP_MIN) g = NV_GAP_MIN;
  if (g > NV_GAP_MAX) g = NV_GAP_MAX;
  NV.gap = g;
  var lab = document.getElementById('nv-gap-val');
  if (lab) lab.textContent = g + ' 秒';
  try { localStorage.setItem('avalon_voice_gap', String(g)); } catch (e) {}
}

function nvClose() {
  NV.seq++;
  nvClearTimer();
  nvStopSpeech();
  nvmStop();   // v179：关闭面板即停止背景乐
  NV.playing = false;
  NV.paused = false;
  NV.open = false;
  var ov = document.getElementById('nv-overlay');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  nvEnterTeamStageIfPending();   // v183：关闭面板后若仍在队长确认停留态则进组队页
}

/* ---------- 打开夜间播报 ---------- */
function openNightVoice(autoStart) {
  if (!state.missions || !state.missions.length) {
    toast('请先开始游戏', 'warn');
    return;
  }
  NV.lines = buildNightVoiceLines();
  NV.idx = -1;
  NV.playing = false;
  NV.paused = false;
  NV.finished = false;
  NV._errCount = 0;
  nvRenderPanel();
  nvCloudPullGaps(null);   // v184：进面板即拉取云端停顿（失败静默回落本地缓存）
  if (!NV.supported) {
    // 降级为纯文字：不报错，仍可手动逐句推进；v180：背景乐与 TTS 无关，照常播放
    NV.playing = false;
    try { nvmStart(); } catch (e) {}
    nvRefreshPlayBtn();
    return;
  }
  if (autoStart) {
    // v184：自动流程先拉云端停顿（失败静默回落本地），再按原延迟开口
    var _nvStarted = false;
    var _nvGo = function () {
      if (_nvStarted) return;
      _nvStarted = true;
      setTimeout(function () {
        if (!NV.open) return;
        nvStartFrom(0);
      }, 420);
    };
    nvCloudPullGaps(_nvGo);
    setTimeout(_nvGo, 2600);   // 兜底：网络异常时也不阻塞播报
  }
}

/* ---------- v181：开局队长选择（掷色子 / 手动，均需点「确认」才生效） ---------- */
var LDR_PICK = { preview: null, rolling: false, mode: 'none', timer: null };

function ldrResetPick() {
  if (LDR_PICK.timer) { clearInterval(LDR_PICK.timer); LDR_PICK.timer = null; }
  LDR_PICK.preview = null;
  LDR_PICK.rolling = false;
  LDR_PICK.mode = 'none';
  ldrRemoveOverlay();
}

function ldrRemoveOverlay() {
  var ov = document.getElementById('nv-dice-overlay');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}

function ldrBuildOverlay() {
  ldrRemoveOverlay();
  var ov = document.createElement('div');
  ov.className = 'nv-dice-overlay';
  ov.id = 'nv-dice-overlay';
  var h = '';
  h += '<div class="nv-dice-panel">';
  h += '<div class="nv-dice-title" id="nv-dice-title">🎲 随机决定首发队长</div>';
  h += '<div class="nv-dice" id="nv-dice-face">?</div>';
  h += '<div class="nv-dice-name" id="nv-dice-name">请选择一种方式</div>';
  h += '<div class="nv-dice-sub" id="nv-dice-sub">号码停住后点「确认」才生效</div>';
  h += '<div class="ldr-numgrid" id="nv-dice-numgrid"></div>';
  h += '<div class="nv-dice-actions">';
  // v184：确认键为主动作（整行放大），重掷与取消同尺寸同层级，手动选择为整行次级按钮
  h += '<button class="btn primary" id="nv-dice-roll" onclick="ldrPickDice()">&#127922; 掷色子选队长</button>';
  h += '<button class="btn" id="nv-dice-cancel" onclick="ldrPickCancel()">取消</button>';
  h += '<button class="btn primary" id="nv-dice-confirm" onclick="ldrPickConfirm()" style="display:none">确认</button>';
  h += '<button class="btn" id="nv-dice-manual" onclick="ldrPickManual()">&#9995; 手动选择队长</button>';
  h += '</div></div>';
  ov.innerHTML = h;
  document.body.appendChild(ov);
  return ov;
}

/* 掷色子：沿用原骰子 UI 与动画（同框、95ms 跳动 16 次、末次定格），停住后不跳转，只出「确认」 */
function ldrPickDice() {
  var pc = state.playerCount;
  var ov = document.getElementById('nv-dice-overlay') || ldrBuildOverlay();
  var face = document.getElementById('nv-dice-face');
  var nameEl = document.getElementById('nv-dice-name');
  var title = document.getElementById('nv-dice-title');
  var sub = document.getElementById('nv-dice-sub');
  var grid = document.getElementById('nv-dice-numgrid');
  var btnRoll = document.getElementById('nv-dice-roll');
  var btnMan = document.getElementById('nv-dice-manual');
  var btnOk = document.getElementById('nv-dice-confirm');
  if (!face || !btnOk) return;
  if (LDR_PICK.timer) { clearInterval(LDR_PICK.timer); LDR_PICK.timer = null; }
  LDR_PICK.mode = 'dice';
  LDR_PICK.preview = null;
  LDR_PICK.rolling = true;
  ov.classList.remove('nv-dice-done');
  ov.classList.remove('nv-dice-idle');
  if (title) title.textContent = '🎲 随机决定首发队长';
  if (grid) { grid.innerHTML = ''; grid.style.display = 'none'; }
  if (btnRoll) { btnRoll.style.display = ''; btnRoll.textContent = '🎲 掷色子选队长'; }
  if (btnMan) btnMan.style.display = '';
  btnOk.style.display = 'none';
  if (sub) sub.textContent = '摇骰子中…';
  if (nameEl) nameEl.textContent = '摇骰子中…';
  if (face) face.textContent = '?';
  var target = Math.floor(Math.random() * pc);
  var ticks = 0;
  var total = 16;
  LDR_PICK.timer = setInterval(function () {
    ticks++;
    var n = 1 + Math.floor(Math.random() * pc);
    if (face) face.textContent = String(n);
    if (nameEl) nameEl.textContent = (state.playerNames[n - 1] || ('玩家' + n));
    if (ticks >= total) {
      clearInterval(LDR_PICK.timer);
      LDR_PICK.timer = null;
      if (face) face.textContent = String(target + 1);
      if (nameEl) nameEl.textContent = playerLabel(target);
      if (ov) ov.classList.add('nv-dice-done');
      LDR_PICK.preview = target;
      LDR_PICK.rolling = false;
      if (sub) sub.textContent = '可重掷，点「确认」后生效';
      if (btnRoll) { btnRoll.textContent = '🔁 重新掷色子'; btnRoll.className = 'btn'; }   // v184：重掷与取消同尺寸同层级
      btnOk.style.display = '';
    }
  }, 95);
}

/* 手动选择：在同一个框里列出 1~N 号，选中后同框定格 */
function ldrPickManual() {
  var pc = state.playerCount;
  var ov = document.getElementById('nv-dice-overlay') || ldrBuildOverlay();
  var face = document.getElementById('nv-dice-face');
  var nameEl = document.getElementById('nv-dice-name');
  var title = document.getElementById('nv-dice-title');
  var sub = document.getElementById('nv-dice-sub');
  var grid = document.getElementById('nv-dice-numgrid');
  var btnRoll = document.getElementById('nv-dice-roll');
  var btnOk = document.getElementById('nv-dice-confirm');
  if (!face || !grid) return;
  if (LDR_PICK.timer) { clearInterval(LDR_PICK.timer); LDR_PICK.timer = null; }
  LDR_PICK.mode = 'manual';
  LDR_PICK.preview = null;
  LDR_PICK.rolling = false;
  ov.classList.remove('nv-dice-done');
  ov.classList.add('nv-dice-idle');
  if (title) title.textContent = '✋ 手动选择首发队长';
  if (face) face.textContent = '?';
  if (nameEl) nameEl.textContent = '请选择 1~' + pc + ' 号';
  if (sub) sub.textContent = '选中号码后点「确认」才生效';
  if (btnRoll) { btnRoll.style.display = ''; btnRoll.textContent = '🎲 掷色子选队长'; btnRoll.className = 'btn'; }
  if (btnOk) btnOk.style.display = 'none';
  var gh = '';
  for (var i = 0; i < pc; i++) {
    gh += '<button class="ldr-num" id="ldr-num-' + i + '" onclick="ldrPickNum(' + i + ')">' + (i + 1) + '</button>';
  }
  grid.innerHTML = gh;
  grid.style.display = 'flex';
}

function ldrPickNum(i) {
  var pc = state.playerCount;
  if (i < 0 || i >= pc) return;
  var ov = document.getElementById('nv-dice-overlay');
  var face = document.getElementById('nv-dice-face');
  var nameEl = document.getElementById('nv-dice-name');
  var sub = document.getElementById('nv-dice-sub');
  var btnOk = document.getElementById('nv-dice-confirm');
  LDR_PICK.preview = i;
  LDR_PICK.mode = 'manual';
  if (ov) { ov.classList.remove('nv-dice-idle'); ov.classList.add('nv-dice-done'); }
  if (face) face.textContent = String(i + 1);
  if (nameEl) nameEl.textContent = playerLabel(i);
  if (sub) sub.textContent = '已选 ' + (i + 1) + ' 号，点「确认」后生效';
  for (var k = 0; k < pc; k++) {
    var b = document.getElementById('ldr-num-' + k);
    if (b) { if (k === i) b.classList.add('sel'); else b.classList.remove('sel'); }
  }
  if (btnOk) btnOk.style.display = '';
}

/* 确认：此时才写入 missions[currentRound].leader 并进入组队页 */
function ldrPickConfirm() {
  var idx = LDR_PICK.preview;
  if (idx === null || idx === undefined) return;
  if (LDR_PICK.timer) { clearInterval(LDR_PICK.timer); LDR_PICK.timer = null; }
  ldrRemoveOverlay();
  LDR_PICK.preview = null;
  LDR_PICK.rolling = false;
  LDR_PICK.mode = 'none';
  // v183：确认后只写入队长并停在队长页（播报卡片保留），不跳组队页
  NV_PROMPT = 'confirmed';
  selectLeader(idx);
  // v185：追加压栈「队长已确认 + 队伍为空 + 播报未决定」，使组队阶段的撤销能回到本停留界面
  try {
    state._nvDecided = false;
    saveUndo();
  } catch (e) {}
  try { toast('队长已确定：' + playerLabel(idx) + '，请选择是否进行开局播报'); } catch (e) {}
}

/* 取消：不写入任何队长，保持在选择页 */
function ldrPickCancel() {
  if (LDR_PICK.timer) { clearInterval(LDR_PICK.timer); LDR_PICK.timer = null; }
  ldrRemoveOverlay();
  LDR_PICK.preview = null;
  LDR_PICK.rolling = false;
  LDR_PICK.mode = 'none';
  renderStepPanel();
}

/* ---------- 开局序列：停在队长页，由用户掷色子/手动选队长并确认，询问是否播报（v181） ---------- */
function startNightOpeningSequence() {
  if (!state.missions || !state.missions.length) return;
  // v181：不再自动掷色子，改由用户主动选择；未确认前 missions[0].leader 保持 null
  NV_PROMPT = 'choose';
  NV_ASKED = false;
  NV_PENDING_ENTER = false;
  state._nvDecided = false;   // v183：是否已决定开局播报（播完 / 跳过 / 关闭面板后置 true）
  ldrResetPick();
  renderStepPanel();
}

/* 点「开始语音播报」：进入播报面板；队长已确认时播完（或关闭面板）才进入组队页（v183） */
function nvPromptStart() {
  if (NV_PROMPT !== 'pending' && NV_PROMPT !== 'choose' && NV_PROMPT !== 'confirmed') return;
  NV_ASKED = true;
  if (NV_PROMPT === 'pending') NV_PROMPT = 'none';
  // v183：队长已确认的停留态 —— 播报结束/关闭面板后再进组队页
  NV_PENDING_ENTER = (NV_PROMPT === 'confirmed');
  nvmEnsure();   // v179：以本次点击作为手势解锁 AudioContext，兼容移动端
  var sb = document.getElementById('nv-prompt-start');
  if (sb) sb.style.display = 'none';
  var kb = document.getElementById('nv-prompt-skip');
  if (kb) kb.style.display = 'none';
  if (NV_PROMPT !== 'confirmed') renderStepPanel();   // v183：停留态页面不变，避免卡片重建闪烁
  openNightVoice(true);
}

/* 点「跳过播报」：不播放语音；队长已确认时直接进入组队页（v183） */
function nvPromptSkip() {
  if (NV_PROMPT !== 'pending' && NV_PROMPT !== 'choose' && NV_PROMPT !== 'confirmed') return;
  NV_ASKED = true;
  if (NV_PROMPT === 'pending' || NV_PROMPT === 'confirmed') NV_PROMPT = 'none';
  NV_PENDING_ENTER = false;
  state._nvDecided = true;   // v183：已决定不播报，进组队页后不再回队长页
  var sb = document.getElementById('nv-prompt-start');
  if (sb) sb.style.display = 'none';
  var kb = document.getElementById('nv-prompt-skip');
  if (kb) kb.style.display = 'none';
  renderStepPanel();
  try { if (typeof toast === 'function') toast('已跳过语音播报，请开始组队'); } catch (e) {}
  setTimeout(function () { renderStepPanel(); }, 30);
}

/* v183：队长已确认的停留态下，播报结束/关闭面板后统一进入组队页 */
function nvEnterTeamStageIfPending() {
  if (!NV_PENDING_ENTER) return;
  NV_PENDING_ENTER = false;
  state._nvDecided = true;   // v183：播报已结束（或关闭面板），可以进组队页
  if (NV_PROMPT === 'confirmed') NV_PROMPT = 'none';
  try { renderStepPanel(); } catch (e) {}
}
