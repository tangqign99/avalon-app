/* ==================== DATA ==================== */
var MISSION_COUNTS = {5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]};
var DEFAULT_NAME_POOL = ['振宁','鹭文','小小','菜头','阿弟','齐齐','延平','小吴','�?,'小黄','淏文','宝强','小洪'];
var ALL_ROLES = ['梅林','派西维尔','忠臣','莫甘�?,'刺客','莫德雷德','奥伯�?,'爪牙','兰斯洛特(�?','兰斯洛特(�?'];
var UNIQUE_ROLES = ['梅林','派西维尔','莫甘�?,'刺客','莫德雷德','奥伯�?,'兰斯洛特(�?','兰斯洛特(�?'];
var GOOD_ROLES = ['梅林','派西维尔','忠臣','兰斯洛特(�?'];
var EVIL_ROLES = ['莫甘�?,'刺客','莫德雷德','奥伯�?,'爪牙','兰斯洛特(�?'];
var DEFAULT_ACTIVE_ROLES = ['梅林','派西维尔','忠臣','莫甘�?,'刺客'];

/* ==================== SUPABASE ==================== */
var SUPABASE_URL = 'https://nzbpopxrxniixnhnqktw.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YnBvcHhyeG5paXhuaG5xa3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODQ2MzQsImV4cCI6MjA5NzQ2MDYzNH0.wLk-FdQlKha8YObTvgINW2M_9QVSpJk8c91bKJeQO7Q';
var _supabase = null;
var _supabaseConnected = false;
var _supabaseChannel = null;
function getSupabase() {
  if (_supabase) {
    return _supabase;
  }
  // 兼容多种全局变量�?
  var sdkGlobal = typeof supabase !== 'undefined' ? supabase : (typeof window.supabase !== 'undefined' ? window.supabase : null);
  if (!sdkGlobal) {
    console.warn('[Supabase] SDK not loaded (typeof supabase=' + typeof supabase + ', typeof window.supabase=' + typeof window.supabase + '), running in offline mode');
    return null;
  }
  try {
    _supabase = sdkGlobal.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Supabase] client created successfully, URL:', SUPABASE_URL, ', keys:', Object.keys(_supabase).length);
  } catch(e) {
    console.error('[Supabase] createClient failed:', e.message, '| sdkGlobal keys:', Object.keys(sdkGlobal).slice(0, 5));
    _supabase = null;
  }
  return _supabase;
}

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
  _assassinTimerInterval: null,
  ladyOfLakeEnabled: true,
  excaliburEnabled: false,
  excaliburHistory: [],
  ladyLakeHolder: -1,
  ladyLakeChecks: [],
  timerMode: 'all',
  timerSeconds: 300,
  timerInterval: null,
  timerRemaining: 0,
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
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘�?,'刺客'] : DEFAULT_ACTIVE_ROLES.slice();
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
  state._assassinPickTarget = null;
  state._assassinAfterRound = null;
  state.lancelotFlipped = false;
  state.lancelotDeck = null;
  state.lancelotDrawResults = [];
  state._historyPage = 0;
  state._assassinTimerRemaining = 0;
  state._assassinTimerInterval = null;
  state.ladyOfLakeEnabled = true;
  state.excaliburEnabled = false;
  state.excaliburHistory = [];
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
  return (idx + 1) + '�?' + state.playerNames[idx];
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
}
function loadHistory() {
  try {
    var rawText = localStorage.getItem('avalon_history_v2') || '[]';
    if (_historyRawCache === rawText && _historyCache) return _historyCache.slice();
    var raw = JSON.parse(rawText);
    var migrated = false;
    for (var i = 0; i < raw.length; i++) {
      if (!isRecordV2(raw[i])) {
        raw[i] = toRecordV2(raw[i]);
        migrated = true;
      }
    }
    if (migrated) {
      rawText = JSON.stringify(raw);
      localStorage.setItem('avalon_history_v2', rawText);
    }
    _historyRawCache = rawText;
    _historyCache = raw;
    _normalizedHistoryRawCache = null;
    _normalizedHistoryCache = null;
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
function saveHistory(data) {
  var rawText = JSON.stringify(data);
  localStorage.setItem('avalon_history_v2', rawText);
  _historyRawCache = rawText;
  _historyCache = data.slice();
  _normalizedHistoryRawCache = null;
  _normalizedHistoryCache = null;
}

// 将旧格式记录转为 v2 短字段格�?
function toRecordV2(record) {
  var v2 = {};
  if (record.date !== undefined) v2.d = record.date;
  if (record.playerCount !== undefined) v2.pc = record.playerCount;
  if (record.winner !== undefined) v2.w = record.winner;
  if (record.identities) v2.ids = record.identities.map(function(id) { return { n: id.name, r: id.role, i: id.index }; });
  if (record.lancelotFlips) v2.lf = record.lancelotFlips;
  if (record.activeRoles) v2.ar = record.activeRoles;
  if (record.roundTendencies) v2.rt = record.roundTendencies;
  if (record.assassinTarget !== undefined) v2.at = record.assassinTarget;
  if (record.assassinSuccess !== undefined) v2.as = record.assassinSuccess;
  if (record.assassinAfterRound != null) v2.aar = record.assassinAfterRound;
  if (record.currentRound !== undefined) v2.cr = record.currentRound;
  if (record.identityMarks) v2.im = record.identityMarks.map(function(m) { return { t: m.target, tn: m.targetName, l: m.level, ts: m.timestamp }; });
  if (record.missions) v2.ms = record.missions.map(function(m) {
    var vm = { r: m.round, s: m.size, ld: m.leader, t: m.team, res: m.result, fc: m.failCount };
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
  return v2;
}

// �?v2 短字段格式转回旧格式（供渲染等消费端使用�?
function fromRecordV2(v2) {
  var rec = {};
  rec.date = v2.d || '';
  rec.playerCount = v2.pc || 0;
  rec.winner = v2.w || '';
  rec.identities = (v2.ids || []).map(function(id) { return { name: id.n, role: id.r, index: id.i }; });
  rec.lancelotFlips = v2.lf || {};
  rec.activeRoles = v2.ar || [];
  rec.roundTendencies = v2.rt || [];
  rec.assassinTarget = v2.at || null;
  rec.assassinSuccess = v2.as || false;
  rec.assassinAfterRound = v2.aar != null ? v2.aar : null;
  rec.currentRound = v2.cr != null ? v2.cr : 0;
  rec.identityMarks = (v2.im || []).map(function(m) { return { target: m.t, targetName: m.tn, level: m.l, timestamp: m.ts }; });
  rec.missions = (v2.ms || []).map(function(m) {
    var rm = { round: m.r, size: m.s, leader: m.ld, team: m.t || [], result: m.res, failCount: m.fc || 0 };
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
  return rec;
}

// 判断记录是否�?v2 格式
function isRecordV2(record) {
  return record && record.d !== undefined && record.w !== undefined;
}

// �?v2 记录标准化为消费端可用格式（带旧字段名）
function normalizeRecord(record) {
  if (!record) return null;
  if (isRecordV2(record)) return fromRecordV2(record);
  return record; // 兼容未迁移的旧格�?
}
function getSortedNamePool() {
  var history = loadNormalizedHistory();
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
function saveLastGame() {
  var cfg = {
    date: new Date().toISOString().slice(0, 10),
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
    var today = new Date().toISOString().slice(0, 10);
    if (cfg.date !== today) return null;
    return cfg;
  } catch(e) { return null; }
}
loadNamePool();

/* ==================== ASSASSIN COUNTDOWN ==================== */
function startAssassinTimer() {
  stopAssassinTimer();
  ensureAudioContext();
  state._assassinTimerRemaining = 3 * 60; // 3 minutes
  renderAssassinTimer();
  state._assassinTimerInterval = setInterval(function() {
    state._assassinTimerRemaining--;
    renderAssassinTimer();
    if (state._assassinTimerRemaining <= 0) {
      stopAssassinTimer();
      playBeepSound();
    }
  }, 1000);
}

function stopAssassinTimer() {
  if (state._assassinTimerInterval) {
    clearInterval(state._assassinTimerInterval);
    state._assassinTimerInterval = null;
  }
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
    + '<div class="ac-label">刺杀倒计�?/div></div>';
  if (state._assassinTimerRemaining <= 0) {
    el.innerHTML = '<div class="assassin-countdown warning">'
      + '<div class="ac-value">00:00</div>'
      + '<div class="ac-label">倒计时结�?/div></div>';
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
  state._currentPage = page;
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  setActiveNav(page);
  if (page === 'game') {
    renderGame();
  }
  if (page === 'setup') { renderSetup(); }
  if (page === 'tend') {
    renderV7EngineInfo(); renderTendRoleSelector(); renderTendPerspective(); renderKnownIdentityGrid(); renderTendResult();
  }
  if (page === 'end') renderEnd();
  if (page === 'stats') {
    if (prevPage !== 'stats') state._historyPage = 0;
    renderStats();
  }
}

// 游戏导航入口：未开始游戏则提示先去 setup 配置
function goToGame() {
  if (!state.missions || state.missions.length === 0) {
    toast('请先在设置页面配置游戏参�?, 'warn');
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
    h += '<span class="idx">' + (i + 1) + '�?/span>';
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
    h += '<button class="btn small swap-seat-btn" id="swap-seat-' + i + '" onclick="toggleSwapSeat(' + i + ')" title="换座">�?/button>';
    h += '</div>';
  }
  $('player-names').innerHTML = h;

  h = '<div class="role-horizontal">';
  h += '<div class="good-section">';
  h += '<span class="faction-label good">好人�?/span>';
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
}

function setPlayerCount(n) {
  var oldNames = state.playerNames;
  var oldSelf = state.selfIndex;
  state.playerCount = n;
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘�?,'刺客'] : DEFAULT_ACTIVE_ROLES.slice();
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
  if (!name) { toast('请输入名�?, 'warn'); return false; }
  if (namePool.indexOf(name) !== -1) { toast('名字已存�?, 'warn'); return false; }
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
  toast('已添加�? + name + '�?);
  return true;
}

var _swapSeatFirst = null;
var _endSwapRoleFirst = null;

function toggleSwapSeat(idx) {
  if (_swapSeatFirst === null) {
    _swapSeatFirst = idx;
    var btn = document.getElementById('swap-seat-' + idx);
    if (btn) { btn.classList.add('swapping'); btn.textContent = '�?; }
    toast('已选中 ' + (idx + 1) + ' 号，再点另一位的换座按钮完成互换');
  } else if (_swapSeatFirst === idx) {
    _swapSeatFirst = null;
    var btn = document.getElementById('swap-seat-' + idx);
    if (btn) { btn.classList.remove('swapping'); btn.textContent = '�?; }
    toast('已取�?);
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
  toast('已删除�? + name + '�?);
}

function editNameInPool(oldName) {
  var newName = prompt('修改玩家姓名�? + oldName + '」：', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  newName = newName.trim();
  if (newName.length > 10) { toast('名字不能超过10个字�?, 'warn'); return; }
  if (namePool.indexOf(newName) !== -1) { toast('名字已存�?, 'warn'); return; }
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
  toast('已修改�? + oldName + '」→�? + newName + '�?);
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
  // 防御性修复：确保玩家数组长度与选择人数一�?
  state.playerNames = (state.playerNames || []).slice(0, state.playerCount);
  for (var pn = 0; pn < state.playerCount; pn++) {
    if (!state.playerNames[pn]) state.playerNames[pn] = '玩家' + (pn + 1);
  }
  state.missions = MISSION_COUNTS[state.playerCount].map(function(size, i) {
    return { round: i, size: size, leader: null, team: [], votes: {}, result: null, failCount: 0, launchFailures: 0, launchAttempts: [] };
  });
  state.currentRound = 0;
  state.winner = null;
  state._firstLeaderPicked = false;
  state._lastLeaderIdx = -1;
  state.assassinTarget = null;
  state.assassinFromMission = false;
  state.assassinMode = false;
  state._assassinPickTarget = null;
  state._assassinAfterRound = null;
  state.lancelotFlipped = false;
  state.lancelotFlipCount = 0;
  state.lancelotRoundFlips = [false, false, false, false, false];
  state.lancelotDrawResults = [false]; // index 0 = round 0, no draw before game starts
  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(�?') !== -1 || state.activeRoles.indexOf('兰斯洛特(�?') !== -1;
  state.lancelotDeck = hasLancelot ? shuffleLancelotDeck() : null;
  state.autoRoles = null;
  state.ladyLakeChecks = [];
  state.ladyCheckHistory = [];
  state.ladyLakeHolder = -1;
  state._ladyCheckTriggeredThisRound = false;
  _swapSeatFirst = null;
  state.roundTendencies = [];
  state.identityMarks = [];
  state.playerPredictions = {};
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  state.speakTimes = {};
  stopTimer();
  for (var i = 0; i < state.playerCount; i++) {
    state.tendencies[i] = 50;
    state.consecutiveRejects[i] = 0;
  }
  state.roundTendencies = [];
  saveLastGame();
  showPage('game');
  var msg = '游戏开始！�?' + state.playerCount + ' 名玩家，5 轮任�?;
  if (state.myRole) msg += '（你的身份：' + state.myRole + '�?;
  toast(msg);
}

/* ==================== GAME RENDER ==================== */

function renderLancelotFlipTracker() {
  var el = $('lancelot-flip-tracker');
  if (!el) return;
  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(�?') !== -1 || state.activeRoles.indexOf('兰斯洛特(�?') !== -1;
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
      drawInfo = '<div class="lancelot-draw-label" style="color:var(--text-dim);font-size:10px">�?�?/div>';
    } else if (i < state.lancelotDrawResults.length && state.lancelotDrawResults[i] !== null && state.lancelotDrawResults[i] !== undefined) {
      var drew = state.lancelotDrawResults[i];
      if (drew) {
        drawInfo = '<div class="lancelot-draw-label flip-label"><img src="images/兰斯洛特转移.png?v=3" style="width:16px;height:16px;border-radius:50%;vertical-align:middle"> 反转</div>';
      } else {
        drawInfo = '<div class="lancelot-draw-label blank-label">&#9711; 未反�?/div>';
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
    btn.title = '反方拍刀：选择一名玩家作为梅�?;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      enterAssassinMode();
    });
    var gamePage = document.getElementById('page-game');
    if (gamePage) gamePage.appendChild(btn);
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
  h += '<p style="text-align:center;color:var(--text-dim);font-size:13px;margin:0 0 16px">选择一名玩家作为梅�?/p>';
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
  stopAssassinTimer();
  if (state._assassinPickTarget === null) return;
  var targetIdx = state._assassinPickTarget;
  var targetName = playerLabel(targetIdx);
  exitAssassinMode();

  var h = '<h2>拍刀结果</h2>';
  h += '<p style="text-align:center;font-size:15px;margin:12px 0">拍刀目标�?strong style="color:var(--red-bright)">' + targetName + '</strong></p>';
  h += '<p style="text-align:center;font-size:14px;margin-bottom:16px">目标是否为梅林？</p>';
  h += '<div class="modal-actions" style="justify-content:center;gap:16px">';
  h += '<button class="winner-btn evil" onclick="resolveInGameAssassin(true, ' + targetIdx + ')">是梅�?�?反方�?/button>';
  h += '<button class="winner-btn good" onclick="resolveInGameAssassin(false, ' + targetIdx + ')">不是梅林 �?好人方胜</button>';
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
  toast(isMerlin ? '拍刀成功！反方获�? : '拍刀失败！好人方获胜');
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

function renderStepPanel() {
  var m = state.missions[state.currentRound];
  if (!m) return;
  var c = $('step-container');
  var reqSize = m.size;
  var pc = state.playerCount;
  var h = '';

  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<span class="step-label">�? + (state.currentRound + 1) + '�?· 需�?' + reqSize + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">' + (m.result ? (m.result === 'success' ? '已完�?�? : '已失�?�?) : '进行�?);
  if (m.launchFailures > 0) h += ' · 组队未通过 ' + m.launchFailures + ' �?;
  h += '</span></div>';

  if (m.result) {
    h += '<div style="text-align:center;padding:16px">';
    h += '<div style="font-size:52px;margin-bottom:6px">' + (m.result === 'success' ? '&#128737;' : '&#128481;') + '</div>';
    h += '<div style="font-size:17px;color:' + (m.result === 'success' ? '#99ff99' : '#ff9999') + '">';
    h += '任务' + (m.result === 'success' ? '成功' : '失败');
    if (m.result === 'fail' && m.failCount) h += ' (' + m.failCount + '张失败票)';
    h += '</div>';
    if (state.winner) {
      h += '<div style="margin-top:10px;font-size:16px;font-weight:700;color:var(--gold-light)">';
      h += '游戏结束�? + (state.winner === 'good' ? '好人方获�? : '反方获胜');
      if (state.winner === 'evil' && state.assassinTarget !== null) {
        h += '（刺杀' + playerLabel(state.assassinTarget) + '�?;
      }
      h += '</div>';
      h += '<div style="margin-top:8px"><button class="btn primary" onclick="showPage(\'end\')">进入结束面板</button></div>';
    }
    h += '</div>';
    c.innerHTML = h;
    return;
  }

  var votesConfirmed = Object.keys(m.votes).length > 0;

  if (m.leader === null) {
    if (state._firstLeaderPicked) {
      var nextLeader = (state._lastLeaderIdx + 1) % pc;
      selectLeader(nextLeader);
      return;
    }
    h += '<div style="margin-bottom:10px"><div class="step-label">步骤A：选择队长</div><div class="btn-row">';
    for (var i = 0; i < pc; i++) {
      h += '<button class="btn" onclick="selectLeader(' + i + ')">' + playerLabel(i) + '</button>';
    }
    h += '<button class="btn random-leader-btn" onclick="randomFirstLeader()" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;font-weight:700">&#127922; 随机</button>';
    h += '</div></div>';
    c.innerHTML = h;
    return;
  }

  var leaderName = playerLabel(m.leader);

  if (state._teamConfirmedPending) {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">�?' + leaderName + '</span>';
    var pendingTeamHTML = m.team.map(function(i) {
      return '<span style="display:inline-block;padding:3px 10px;margin:2px 3px;border:2px solid var(--gold);border-radius:20px;background:rgba(201,168,76,0.1);color:var(--gold-light);font-size:13px;font-weight:600;box-shadow:0 0 6px rgba(201,168,76,0.2)">' + playerLabel(i) + '</span>';
    }).join('');
    h += '<div style="margin-top:6px">' + pendingTeamHTML + '</div></div>';
    h += '<div style="text-align:center;padding:20px;border:2px solid var(--gold);border-radius:var(--radius);background:var(--bg-card);margin:12px 0">';
    h += '<div style="font-size:18px;color:var(--gold-light);margin-bottom:8px">发言进行�?/div>';
    h += '<div style="font-size:13px;color:var(--text-dim)">队长已确认队伍，请按顺序发言。计时结束后将进入投票阶段�?/div>';
    h += '</div>';
    h += buildSpeechPhaseInfoPanel();

    c.innerHTML = h;
    return;
  }

  if (votesConfirmed) {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">�?' + leaderName + '</span>';
    var teamMembersHTML = m.team.map(function(i) {
      return '<span style="display:inline-block;padding:3px 10px;margin:2px 3px;border:2px solid var(--gold);border-radius:20px;background:rgba(201,168,76,0.1);color:var(--gold-light);font-size:13px;font-weight:600;box-shadow:0 0 6px rgba(201,168,76,0.2)">' + playerLabel(i) + '</span>';
    }).join('');
    h += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:4px"><span style="color:var(--text-dim);font-size:13px">队伍�?/span>' + teamMembersHTML + '</div></div>';
  } else {
    h += '<div style="margin-bottom:6px"><span class="leader-badge">�?' + leaderName + '</span>';
    h += ' <button class="btn small warn" onclick="reSelectLeader()">重�?/button>';
    h += '<span style="color:var(--text-dim);margin-left:10px">已�?' + m.team.length + '/' + reqSize + ' �?/span></div>';

    h += '<div style="margin-bottom:10px"><div class="step-label">步骤B：选择队伍成员</div>';
    var splitAt = Math.ceil(pc / 2);
    for (var row = 0; row < 2; row++) {
      h += '<div class="btn-row" style="margin-bottom:' + (row === 0 ? '12px' : '0') + ';gap:12px">';
      for (var i = row * splitAt; i < Math.min((row + 1) * splitAt, pc); i++) {
        var inTeam = m.team.indexOf(i) !== -1;
        var cls = 'btn team-member-btn';
        if (inTeam) cls += ' selected team-member-highlight';
        h += '<button class="' + cls + '" onclick="toggleTeamMember(' + i + ')">';
        h += playerLabel(i) + (i === m.leader ? ' �? : '');
        h += '</button>';
      }
      h += '</div>';
    }
    h += '</div>';

    h += '<div style="text-align:center;margin-bottom:12px">';
    h += '<button class="btn primary" onclick="confirmTeam()"';
    if (m.team.length !== reqSize) h += ' disabled';
    h += '>确认队伍 (' + m.team.length + '/' + reqSize + ')</button></div>';
  }

  if (votesConfirmed) {
    h += '<hr style="border-color:var(--border);margin-bottom:10px">';
    h += '<div class="step-label">步骤C：全员投�?<span style="font-size:11px;color:var(--text-dim);font-weight:400">（默认赞成，点击切换反对�?/span></div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    for (var i = 0; i < pc; i++) {
      var v = m.votes[i];
      var onTeam = m.team.indexOf(i) !== -1;
      h += '<div class="vote-row" style="width:calc(50% - 4px)">';
      h += '<span class="voter-name">' + playerLabel(i) + '</span>';
      if (onTeam) h += '<span class="on-team">⚔队�?/span>';
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

/* ==================== TENDENCY RENDER ==================== */
function renderTendencyItem(idx, score, merlinProb) {
  var cls, barCls;
  if (score >= 60) { cls = 'trust'; barCls = 'trust'; }
  else if (score >= 40) { cls = 'neutral'; barCls = 'neutral'; }
  else { cls = 'suspect'; barCls = 'suspect'; }
  var h = '<div class="tendency-item">';
  h += '<span class="tend-name">' + playerLabel(idx) + '</span>';
  h += '<div class="tend-bar-wrap"><div class="tend-bar-fill ' + barCls + '" style="width:' + score + '%"></div></div>';
  h += '<span class="tend-score ' + cls + '">' + score + '</span>';
  if (merlinProb !== undefined) {
    h += '<span class="merlin-pct-col">' + merlinProb + '%</span>';
  }
  h += '</div>';
  return h;
}

function renderTendencyMini() {
  var el = $('tendency-mini');
  if (!el) return;
  var probs = computeMerlinProbability();
  var h = '';
  for (var i = 0; i < state.playerCount; i++) {
    h += renderTendencyItem(i, state.tendencies[i] || 50, probs[i]);
  }
  el.innerHTML = h;
}

/* ==================== MERLIN PREDICTION ==================== */
function computeMerlinProbability() {
  var pc = state.playerCount;
  var probs = {};
  for (var i = 0; i < pc; i++) {
    probs[i] = 0;
  }

  var totalWeight = 0;

  // --- Current game analysis ---
  for (var round = 0; round < state.missions.length; round++) {
    var m = state.missions[round];
    if (!m || !m.team || m.team.length === 0) continue;
    if (!m.result) continue;

    var attempts = m.launchAttempts || [];
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      var attApproves = 0;
      for (var k = 0; k < pc; k++) { if (att.votes[k] === 'approve') attApproves++; }
      if (attApproves <= Math.floor(pc / 2)) continue;

      for (var i = 0; i < pc; i++) {
        if (i === state.selfIndex) continue;
        var vote = att.votes[i];
        if (m.result === 'success' && vote === 'approve') probs[i] += 3;
        if (m.result === 'fail' && vote === 'reject') probs[i] += 2;
      }
      totalWeight += 3;
      break;
    }
  }

  // Tendency scores
  for (var i = 0; i < pc; i++) {
    if (i === state.selfIndex) continue;
    var t = state.tendencies[i] || 50;
    probs[i] += t * 0.5;
    totalWeight += 0.5;
  }

  // --- Historical analysis: check past games where each player was Merlin ---
  var history = loadNormalizedHistory();
  if (history.length > 0) {
    for (var i = 0; i < pc; i++) {
      if (i === state.selfIndex) continue;
      var playerName = state.playerNames[i];
      var merlinGames = [];

      for (var h = 0; h < history.length; h++) {
        var rec = history[h];
        if (!rec.identities) continue;
        for (var j = 0; j < rec.identities.length; j++) {
          if (rec.identities[j].name === playerName && rec.identities[j].role === '梅林') {
            merlinGames.push(rec);
            break;
          }
        }
      }

      if (merlinGames.length > 0) {
        var successApproves = 0, failRejects = 0, totalVotes = 0;
        for (var h = 0; h < merlinGames.length; h++) {
          var rec = merlinGames[h];
          if (!rec.missions) continue;
          for (var m = 0; m < rec.missions.length; m++) {
            var mission = rec.missions[m];
            if (!mission.votes || !mission.result) continue;
            var vote = mission.votes[playerName];
            if (!vote) continue;
            totalVotes++;
            if (mission.result === 'success' && vote === 'approve') successApproves++;
            if (mission.result === 'fail' && vote === 'reject') failRejects++;
          }
        }
        if (totalVotes > 0) {
          var merlinScore = (successApproves + failRejects) / totalVotes;
          var historyWeight = Math.min(merlinGames.length * 2, 8);
          probs[i] += merlinScore * historyWeight;
          totalWeight += historyWeight;
        }
      }
    }
  }

  // Normalize
  var maxProb = 0;
  for (var i = 0; i < pc; i++) {
    if (probs[i] > maxProb) maxProb = probs[i];
  }

  if (maxProb > 0) {
    for (var i = 0; i < pc; i++) {
      probs[i] = Math.round((probs[i] / maxProb) * 90 + 5);
      if (probs[i] > 95) probs[i] = 95;
    }
  } else {
    for (var i = 0; i < pc; i++) {
      probs[i] = Math.round(20 + Math.random() * 30);
    }
  }

  return probs;
}

/* ==================== IDENTITY SIMULATION ==================== */
var SIM_ROLES = ['梅林','派西维尔','忠臣','莫甘�?,'刺客','莫德雷德','兰斯洛特(�?','兰斯洛特(�?','奥伯�?];

/* ==================== LADY OF THE LAKE ==================== */
function renderLadyLakeResults() {
  // 湖中验人记录已合并至女神系谱栏，此处仅保留容器清�?
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
      h += '<strong>�? + genNum + '任女神：</strong>' + (rec.holder + 1) + '�?' + state.playerNames[rec.holder] + ' <span style="color:var(--gold-light)">�?/span> �?' + (rec.target + 1) + '�?' + state.playerNames[rec.target];
      h += ' <span style="font-weight:700;font-size:15px;color:' + (rec.result === 'good' ? '#99bbff' : '#ff9999') + '">' + (rec.result === 'good' ? '好人' : '反方') + '</span>';
      h += '</div>';
      genNum++;
    }
  }
  // 当前持有�?
  if (state.ladyLakeHolder >= 0) {
    h += '<div style="font-size:13px;font-weight:700;color:var(--gold-light);margin-top:4px;border-top:1px solid var(--border);padding-top:4px">';
    h += '当前女神�? + (state.ladyLakeHolder + 1) + '�?' + state.playerNames[state.ladyLakeHolder];
    h += '</div>';
  }
  el.innerHTML = h || '<span style="color:var(--text-dim)">湖中女神未分�?/span>';
}

function showLadyCheck() {
  if (!state.ladyOfLakeEnabled) return;
  var pc = state.playerCount;
  var h = '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人�?反方�?/p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < pc; i++) {
    if (i === state.ladyLakeHolder && state.ladyLakeHolder >= 0) continue;
    h += '<button class="assassin-target-btn" onclick="doLadyCheck(' + i + ')">' + playerLabel(i) + '</button>';
  }
  h += '</div>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeModal()" style="color:var(--text-dim)">不报（放弃本次验人）</button></div>';
  showModal(h);
}

function doLadyCheck(targetIdx) {
  closeModal();
  var pc = state.playerCount;
  // Determine faction: we need to simulate - in the assistant context we don't know real roles
  // Show a modal to let the user input the real result
  var h = '<h2>湖中女神验人结果</h2>';
  h += '<p style="font-size:15px;margin-bottom:10px">查验目标�?strong style="color:var(--gold-light)">' + playerLabel(targetIdx) + '</strong></p>';
  h += '<p style="font-size:14px;margin-bottom:14px">该玩家的阵营是？</p>';
  h += '<div class="winner-toggle">';
  h += '<button class="winner-btn good" onclick="recordLadyCheck(' + targetIdx + ',\'good\')">&#128737; 好人�?/button>';
  h += '<button class="winner-btn evil" onclick="recordLadyCheck(' + targetIdx + ',\'evil\')">&#128481; 反方</button>';
  h += '</div>';
  showModal(h);
}

function recordLadyCheck(targetIdx, result) {
  closeModal();
  var holderIdx = state.ladyLakeHolder;
  var holderLabel = playerLabel(holderIdx);
  state.ladyLakeChecks.push({
    round: state.currentRound,
    target: targetIdx,
    result: result,
    holder: holderIdx
  });
  // 湖中女神头衔传递给被验�?
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
  // 'uncertain' 不改变倾向�?
  var resultLabel = result === 'good' ? '好人' : result === 'evil' ? '坏人' : '不报';
  renderGame();
  toast(holderLabel + '�? + playerLabel(targetIdx) + ' �?' + resultLabel + '，头衔已传�?);
}

/* 湖中女神发言环节内联验人界面 */
var _ladySpeechSelected = null; // 发言环节中选中的查验目�?

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
      // 恢复倾向�?
      if (c.result === 'good' && (c.target in state.tendencies)) {
        state.tendencies[c.target] = Math.max(0, state.tendencies[c.target] - 15);
      } else if (c.result === 'evil' && (c.target in state.tendencies)) {
        state.tendencies[c.target] = Math.min(100, state.tendencies[c.target] + 15);
      }
      // 恢复湖中女神头衔给原来的持有�?
      state.ladyLakeHolder = c.holder;
      state.ladyLakeChecks.splice(i, 1);
      break;
    }
  }
  // 也移�?ladyCheckHistory 中的对应记录
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
var PREDICT_ROLES = ['正方','反方','梅林','派西维尔','莫甘�?,'刺客','莫德雷德','奥伯�?,'忠臣'];

function getTakenPredictions(excludeIdx) {
  var taken = {};
  var loyalCount = 0;
  for (var i = 0; i < state.playerCount; i++) {
    if (i === excludeIdx) continue;
    var pred = state.playerPredictions[i] || '';
    if (pred && pred !== '未标�? && pred !== '正方' && pred !== '反方') {
      taken[pred] = (taken[pred] || 0) + 1;
    }
    if (pred === '忠臣') loyalCount++;
  }
  taken._loyalCount = loyalCount;
  return taken;
}

function setPlayerPrediction(idx, role) {
  if (role === '未标�?) {
    delete state.playerPredictions[idx];
  } else {
    state.playerPredictions[idx] = role;
  }
  renderPredictPlayerDropdowns();
  renderTendencyMini();
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
    var curPred = state.playerPredictions[i] || '未标�?;
    h += '<div class="predict-player-row">';
    h += '<span class="predict-pname">' + playerLabel(i) + '</span>';
    h += '<select onchange="setPlayerPrediction(' + i + ',this.value)" style="flex:1;min-width:100px;padding:6px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer;min-height:38px;-webkit-appearance:none;appearance:none;background-image:url(\'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 12 12%27%3E%3Cpath d=%27M6 8L1 3h10z%27 fill=%27%23c9a84c%27/%3E%3C/svg%3E\');background-repeat:no-repeat;background-position:right 8px center;padding-right:24px">';
    h += '<option value="未标�?' + (curPred === '未标�? ? ' selected' : '') + '>未标�?/option>';
    for (var j = 0; j < PREDICT_ROLES.length; j++) {
      var r = PREDICT_ROLES[j];
      var disabled = false;
      if (r !== '未标�? && r !== '正方' && r !== '反方' && r !== curPred) {
        if (r === '忠臣') {
          if (taken._loyalCount >= 3) disabled = true;
        } else {
          if ((taken[r] || 0) >= 1) disabled = true;
        }
      }
      h += '<option value="' + r + '"' + (curPred === r ? ' selected' : '') + (disabled ? ' disabled' : '') + '>' + r + (disabled ? ' (已�?' : '') + '</option>';
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
  if (!pred || pred === '未标�?) {
    // No prediction, show tendency-based
    var t = state.tendencies[idx] || 50;
    return { good: t, evil: 100 - t };
  }

  var goodScore = 50;
  // Base on tendency
  var t = state.tendencies[idx] || 50;
  goodScore = t;

  // Adjust based on prediction
  if (pred === '正方') { goodScore = Math.min(100, goodScore + 20); }
  else if (pred === '反方') { goodScore = Math.max(0, goodScore - 20); }
  else if (pred === '梅林' || pred === '派西维尔') { goodScore = Math.min(100, goodScore + 25); }
  else if (pred === '莫甘�? || pred === '刺客' || pred === '莫德雷德' || pred === '奥伯�?) { goodScore = Math.max(0, goodScore - 25); }

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
  if (pred === '莫甘�? || pred === '刺客' || pred === '莫德雷德' || pred === '奥伯�? || pred === '反方') {
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

/* ==================== 发言阶段信息：湖中女�?/ 王者之�?==================== */
function excaliburDirectionLabel(dir) {
  if (dir === 'fail_to_success') return '失败 �?成功';
  if (dir === 'success_to_fail') return '成功 �?失败';
  if (dir === 'unknown') return '未说�?;
  if (dir === 'refused') return '拒绝说明';
  return '待反�?;
}

function ladyClaimLabel(res) {
  if (res === 'good') return '好人';
  if (res === 'evil') return '反方';
  if (res === 'unknown') return '未说�?;
  if (res === 'refused') return '拒绝说明';
  return '未记�?;
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

function showExcaliburHolderModal(round) {
  if (!state.excaliburEnabled) return;
  var m = state.missions[round];
  if (!m || !m.team || m.team.length === 0) return;
  var rec = ensureExcaliburRecord(round);
  // 不能发给上一轮持剑�?
  var prevHolder = -1;
  var hist = state.excaliburHistory || [];
  for (var hi = hist.length - 1; hi >= 0; hi--) {
    if (hist[hi].round < round && hist[hi].holder >= 0) {
      prevHolder = hist[hi].holder;
      break;
    }
  }
  var h = '<h2>王者之�?/h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:10px">队长指定本轮队伍成员持剑。后续若使用，只能对队伍中除持剑者外的玩家使用�?/p>';
  h += '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < m.team.length; i++) {
    var pi = m.team[i];
    if (pi === prevHolder) continue;
    h += '<button class="assassin-target-btn" onclick="setExcaliburHolder(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
  }
  h += '</div>';
  if (rec.holder >= 0) h += '<p style="font-size:12px;color:var(--text-dim);margin-top:10px">当前持剑者：' + playerLabel(rec.holder) + '</p>';
  h += '<div style="text-align:center;margin-top:12px"><button class="btn" onclick="closeModal()">稍后指定</button></div>';
  showModal(h);
}

function setExcaliburHolder(round, holderIdx) {
  var rec = ensureExcaliburRecord(round);
  rec.holder = holderIdx;
  rec.used = rec.used === undefined ? null : rec.used;
  rec.target = (rec.target === holderIdx) ? null : rec.target;
  closeModal();
  toast('王者之剑持剑者：' + playerLabel(holderIdx));
  renderGame();
}

function setExcaliburUsed(round, used) {
  var rec = ensureExcaliburRecord(round);
  if (rec.holder < 0) { toast('请先指定王者之剑持剑�?, 'warn'); return; }
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
  if (rec.holder === targetIdx) { toast('王者之剑不能对持剑者本人使�?, 'warn'); return; }
  rec.target = targetIdx;
  renderStepPanelWithResult();
}

function buildExcaliburPreResultPanel(m) {
  if (!state.excaliburEnabled) return '';
  var round = state.currentRound;
  var rec = ensureExcaliburRecord(round);
  var h = '<div class="speech-info-card excalibur-card">';
  h += '<div class="speech-info-title">王者之�?· 任务结果公布前确�?/div>';
  if (rec.holder < 0) {
    h += '<div class="speech-info-sub">队长需要先从本轮队伍成员中指定持剑者�?/div>';
    h += '<button class="btn small" onclick="showExcaliburHolderModal(' + round + ')">指定持剑�?/button>';
    h += '</div>';
    return h;
  }
  h += '<div class="speech-info-sub">持剑者：<strong>' + playerLabel(rec.holder) + '</strong></div>';
  h += '<div class="btn-row" style="margin:6px 0">';
  h += '<button class="btn small' + (rec.used === false ? ' success' : '') + '" onclick="setExcaliburUsed(' + round + ',false)">不使�?/button>';
  h += '<button class="btn small' + (rec.used === true ? ' warn' : '') + '" onclick="setExcaliburUsed(' + round + ',true)">使用</button>';
  h += '</div>';
  if (rec.used === true) {
    h += '<div class="speech-info-sub">使用目标（仅限本轮队伍中除持剑者外）：</div><div class="btn-row" style="gap:6px">';
    for (var i = 0; i < m.team.length; i++) {
      var pi = m.team[i];
      if (pi === rec.holder) continue;
      h += '<button class="btn small' + (rec.target === pi ? ' primary' : '') + '" onclick="setExcaliburTarget(' + round + ',' + pi + ')">' + playerLabel(pi) + '</button>';
    }
    h += '</div><div class="speech-info-sub">下一轮发言阶段只记录持剑者口述的改变方向�?/div>';
  } else if (rec.used === false) {
    h += '<div class="speech-info-sub">本轮确认不使用，下一轮不会弹出王者之剑反馈�?/div>';
  } else {
    h += '<div class="speech-info-sub">请在公布任务结果前确认是否使用�?/div>';
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
  if (!state.ladyOfLakeEnabled || state.currentRound <= 0 || state.ladyLakeHolder < 0 || hasLadyClaimThisRound()) return false;
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
  h += '<div class="speech-info-sub">持有人：<strong>' + playerLabel(holder) + '</strong>。请在其发言时记录口述验人结果�?/div>';
  h += '<label class="speech-info-label">口述验人对象</label><select id="lady-speech-target" class="speech-info-select">';
  for (var i = 0; i < state.playerCount; i++) {
    if (i === holder) continue;
    h += '<option value="' + i + '">' + playerLabel(i) + '</option>';
  }
  h += '</select>';
  h += '<label class="speech-info-label">口述结果</label><select id="lady-speech-result" class="speech-info-select">';
  h += '<option value="good">好人</option><option value="evil">反方</option><option value="unknown">未说�?/option><option value="refused">拒绝说明</option>';
  h += '</select>';
  h += '<input id="lady-speech-note" class="speech-info-input" placeholder="备注：记录原话或简�?>';
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
  toast('已记录湖中女神声明：' + playerLabel(holder) + ' �?' + playerLabel(target) + '�? + ladyClaimLabel(result));
  renderGame();
}

function buildExcaliburFeedbackCard(rec) {
  var h = '<div class="speech-info-card excalibur-card">';
  h += '<div class="speech-info-title">上一轮王者之剑反�?/div>';
  h += '<div class="speech-info-sub">�? + (rec.round + 1) + '轮持剑者：<strong>' + playerLabel(rec.holder) + '</strong>；使用目标：<strong>' + playerLabel(rec.target) + '</strong></div>';
  h += '<label class="speech-info-label">持剑者口述改变方�?/label><select id="excalibur-feedback-dir-' + rec.round + '" class="speech-info-select">';
  h += '<option value="fail_to_success">失败 �?成功</option><option value="success_to_fail">成功 �?失败</option><option value="unknown">未说�?/option><option value="refused">拒绝说明</option>';
  h += '</select>';
  h += '<input id="excalibur-feedback-note-' + rec.round + '" class="speech-info-input" placeholder="备注：记录原话或简�?>';
  h += '<button class="btn small primary" onclick="saveExcaliburFeedback(' + rec.round + ')">保存王者之剑反�?/button>';
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
  if (!state._teamConfirmedPending || state.timerMode === 'off') return '';
  var cards = [];
  if (shouldShowLadySpeechCard()) cards.push(buildLadySpeechCard());
  var exs = getPendingExcaliburFeedbacks();
  for (var i = 0; i < exs.length; i++) cards.push(buildExcaliburFeedbackCard(exs[i]));
  if (!cards.length) return '';
  var title = state.timerMode === 'all' ? '发言阶段信息记录' : '当前发言人信息记�?;
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
      spkEl.textContent = '当前发言�? + playerLabel(spk);
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
  stopTimer();
  if (state.timerMode === 'off') return;
  state.timerRemaining = state.timerSeconds;
  if (state.timerMode === 'per' && state.currentSpeakerIdx >= 0) {
    var btnRow = document.getElementById('timer-btns');
    if (btnRow) btnRow.hidden = false;
  }
  state.timerInterval = setInterval(function() {
    state.timerRemaining--;
    renderTimerDisplay();
    if (state.timerRemaining <= 0) {
      stopTimer();
      playBeepSound();
      toast('计时结束�?, 'warn');
      if (state.timerMode === 'per' && state.currentSpeakerIdx < state.speakerOrder.length - 1) {
        setTimeout(function() { speakEnd(); }, 800);
      } else if (state._teamConfirmedPending) {
        setTimeout(function() { transitionToVotes(); }, 800);
      }
    }
  }, 1000);
  renderTimerDisplay();
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
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
    startTimer();
  } else {
    state.currentSpeakerIdx = -1;
    state.speakerOrder = [];
    toast('所有玩家发言结束');
    if (state._teamConfirmedPending) {
      setTimeout(function() { transitionToVotes(); }, 800);
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
    setTimeout(function() { transitionToVotes(); }, 500);
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
      ladyHtml += playerLabel(lr.holder) + ' �?' + playerLabel(lr.target) + '�?strong>' + ladyClaimLabel(lr.result) + '</strong>';
      if (lr.recordedAtRound !== undefined && lr.recordedAtRound !== null && lr.recordedAtRound !== round) {
        ladyHtml += ' <span style="color:var(--text-dim)">（第' + (lr.recordedAtRound + 1) + '轮发言记录�?/span>';
      }
      if (lr.recordedAtSpeaker !== undefined && lr.recordedAtSpeaker !== null) {
        ladyHtml += ' <span style="color:var(--text-dim)">发言人：' + playerLabel(lr.recordedAtSpeaker) + '</span>';
      }
      if (lr.note) ladyHtml += '<div style="font-size:12px;color:var(--text-dim)">备注�? + escapeHtml(lr.note) + '</div>';
      ladyHtml += '</div>';
    }
    ladyHtml += '</div>';
    parts.push(ladyHtml);
  }

  var ex = getExcaliburRecord(round);
  if (ex) {
    var exHtml = '<div style="margin-top:8px;padding:8px;border:1px solid rgba(201,168,76,0.32);border-radius:8px;background:rgba(201,168,76,0.08)">';
    exHtml += '<div style="font-weight:700;color:var(--gold-light);margin-bottom:4px">王者之�?/div>';
    exHtml += '<div style="font-size:13px;line-height:1.6;color:var(--text)">';
    exHtml += '持剑者：<strong>' + (ex.holder >= 0 ? playerLabel(ex.holder) : '未指�?) + '</strong>';
    if (ex.used === false) {
      exHtml += '；本轮确�?strong>不使�?/strong>';
    } else if (ex.used === true) {
      exHtml += '；对 <strong>' + (ex.target !== null && ex.target !== undefined ? playerLabel(ex.target) : '未选择目标') + '</strong> 使用';
      if (ex.feedbackRecorded) {
        exHtml += '；口述改变：<strong>' + excaliburDirectionLabel(ex.claimedDirection) + '</strong>';
        if (ex.feedbackRound !== null && ex.feedbackRound !== undefined) {
          exHtml += ' <span style="color:var(--text-dim)">（第' + (ex.feedbackRound + 1) + '轮发言记录�?/span>';
        }
        if (ex.feedbackSpeaker !== null && ex.feedbackSpeaker !== undefined) {
          exHtml += ' <span style="color:var(--text-dim)">发言人：' + playerLabel(ex.feedbackSpeaker) + '</span>';
        }
      } else {
        exHtml += '�?span style="color:var(--orange)">待持剑者反馈改变方�?/span>';
      }
      if (ex.note) exHtml += '<div style="font-size:12px;color:var(--text-dim)">备注�? + escapeHtml(ex.note) + '</div>';
    } else {
      exHtml += '�?span style="color:var(--orange)">尚未确认是否使用</span>';
    }
    exHtml += '</div></div>';
    parts.push(exHtml);
  }

  if (!parts.length) return '';
  return '<div style="margin-top:8px"><strong>特殊信息�?/strong>' + parts.join('') + '</div>';
}

function buildReviewHTML() {
  var h = '';
  var pc = state.playerCount;

  for (var r = 0; r <= state.currentRound; r++) {
    var m = state.missions[r];
    if (!m) continue;

    h += '<div class="review-card">';
    h += '<div class="rc-header" onclick="toggleReviewCard(this)">';
    h += '<span class="rc-title">�? + (r + 1) + '�?· ' + (m.result ? (m.result === 'success' ? '任务成功' : '任务失败') : '进行�?) + '</span>';
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
        h += '<strong>�? + (a + 1) + '次组�?/strong> ';
        h += '<span class="launch-leader">' + playerLabel(att.leader) + '</span>';
        h += ' <span style="color:var(--text-dim)">带队�?/span>';
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
        h += '<div class="vote-col-approve"><span class="vote-col-title">赞成 (' + approveList.length + '�?�?/span>';
        if (approveList.length > 0) {
          h += approveList.map(function(n) { return '<span class="vote-player-name">' + n + '</span>'; }).join('');
        } else { h += '<span class="vote-col-empty">�?/span>'; }
        h += '</div>';
        h += '<div class="vote-col-reject"><span class="vote-col-title">反对 (' + rejectList.length + '�?�?/span>';
        if (rejectList.length > 0) {
          h += rejectList.map(function(n) { return '<span class="vote-player-name">' + n + '</span>'; }).join('');
        } else { h += '<span class="vote-col-empty">�?/span>'; }
        h += '</div></div>';
        h += '</div>';
      }
    }

    if (m.result) {
      h += '<div style="margin-top:6px"><strong>任务结果�?/strong>';
      h += '<span style="color:' + (m.result === 'success' ? 'var(--green-bright)' : 'var(--red-bright)') + '">';
      h += (m.result === 'success' ? '成功' : '失败');
      if (m.result === 'fail' && m.failCount) h += ' (' + m.failCount + '张失败票)';
      h += '</span></div>';
    }

    h += buildReviewSpecialInfo(r);

    if (m.launchFailures > 0) {
      h += '<div style="margin-top:4px;color:var(--orange)">组队未通过 ' + m.launchFailures + ' �?/div>';
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
  var m = state.missions[state.currentRound];
  m.leader = idx;
  m.team = [];
  m.votes = {};
  m.result = null;
  m.failCount = 0;
  // 仅在首次选队长（无发车尝试记录）时重置计数器，避免丢失已记录的发车失败历�?
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
    '<p style="font-size:16px;text-align:center;margin:16px 0">随机选中�?strong>' + (idx + 1) + '�?' + state.playerNames[idx] + '</strong></p>' +
    '<div class="modal-actions">' +
    '<button class="btn primary" onclick="closeModal();selectLeader(' + idx + ')">确认</button>' +
    '<button class="btn" onclick="closeModal()">手动选号</button>' +
    '</div>'
  );
}

function reSelectLeader() {
  var m = state.missions[state.currentRound];
  m.leader = null;
  m.team = [];
  m.votes = {};
  state._firstLeaderPicked = false;
  renderStepPanel();
}

function toggleTeamMember(idx) {
  var m = state.missions[state.currentRound];
  var pos = m.team.indexOf(idx);
  if (pos !== -1) m.team.splice(pos, 1);
  else if (m.team.length < m.size) m.team.push(idx);
  renderStepPanel();
}

function confirmTeam() {
  var m = state.missions[state.currentRound];
  if (m.team.length !== m.size) { toast('队伍人数不正�?, 'warn'); return; }

  // 湖中女神：第一轮队长确认后自动设定持有�?
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
    state.timerInterval = null;
    renderTimerDisplay();
    startTimer();
  } else if (state.timerMode === 'all') {
    state.timerRemaining = state.timerSeconds;
    state.timerInterval = null;
    state.speakerOrder = [];
    state.currentSpeakerIdx = -1;
    renderTimerDisplay();
    startTimer();
  }
  renderStepPanel();
  if (state.excaliburEnabled && !getExcaliburRecord(state.currentRound)) {
    setTimeout(function() { showExcaliburHolderModal(state.currentRound); }, 50);
  }
  if (state.ladyOfLakeEnabled && state.currentRound >= 2 && state.ladyLakeHolder >= 0 && !hasLadyClaimThisRound()) {
    setTimeout(function() { showLadyCheck(); }, 200);
  }
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
  var m = state.missions[state.currentRound];
  m.votes[idx] = type;
  renderStepPanel();
}

function allApprove() {
  var m = state.missions[state.currentRound];
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'approve';
  }
  renderStepPanel();
}

function allReject() {
  var m = state.missions[state.currentRound];
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'reject';
  }
  renderStepPanel();
}

function confirmVotes() {
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
      snap[i] = state.tendencies[i] || 50;
    }
    state.roundTendencies.push(snap);

    if (m.launchFailures >= 5) {
      m.result = 'fail';
      m.failCount = 0;
      updateFinalTendencies();
      checkGameEnd();
      renderGame();
      var banner = '<div class="launch-fail-banner">�? + (state.currentRound + 1) + '轮连�?<span class="count">5</span> 次组队未通过，任务自动失败！</div>';
      $('launch-fail-area').innerHTML = banner;
      return;
    }

    m.leader = (m.leader + 1) % pc;
    state._lastLeaderIdx = m.leader;
    m.team = [];
    m.votes = {};

    renderGame();
    var banner = '<div class="launch-fail-banner">�? + (state.currentRound + 1) + '轮第 <span class="count">' + m.launchFailures + '</span> 次组队未通过！赞�?' + approves + ' / 反对 ' + rejects + '（赞成≤反对）队长轮换至 ' + playerLabel(m.leader) + '</div>';
    $('launch-fail-area').innerHTML = banner;
    toast('组队未通过！队长轮�?, 'warn');
  }
}

function applyLaunchTendencies() {
  var m = state.missions[state.currentRound];
  var si = state.selfIndex;
  var lastAttempt = m.launchAttempts[m.launchAttempts.length - 1];
  var myVote = si >= 0 ? lastAttempt.votes[si] : null;
  var weight = state.myRole ? 2 : 1;

  for (var i = 0; i < state.playerCount; i++) {
    if (i === si) continue;
    if (!(i in state.tendencies)) state.tendencies[i] = 50;
    var vote = lastAttempt.votes[i];

    if (myVote) {
      if (vote === myVote) state.tendencies[i] += 2 * weight;
      else state.tendencies[i] -= 2 * weight;
    }

    if (state.tendencies[i] < 0) state.tendencies[i] = 0;
    if (state.tendencies[i] > 100) state.tendencies[i] = 100;
  }
  renderTendencyMini();
}

function renderStepPanelWithResult() {
  var m = state.missions[state.currentRound];
  var c = $('step-container');
  var h = '';

  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<span class="step-label">�? + (state.currentRound + 1) + '�?· 需�?' + m.size + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">进行�?/span></div>';

  h += '<div style="margin-bottom:6px"><span class="leader-badge">�?' + playerLabel(m.leader) + '</span>';
  h += '<span style="font-size:13px;color:var(--text-dim);margin-left:10px">队伍�? + m.team.map(function(i) { return playerLabel(i); }).join('�?) + '</span></div>';

  var approves = Object.values(m.votes).filter(function(v) { return v === 'approve'; }).length;
  var rejects = state.playerCount - approves;
  h += '<div style="font-size:14px;color:var(--green-bright);margin-bottom:10px">组队成功！赞�?' + approves + ' / 反对 ' + rejects + '</div>';

  h += buildExcaliburPreResultPanel(m);
  h += '<hr style="border-color:var(--border);margin-bottom:10px">';
  h += '<div class="step-label">步骤D：任务结�?/div>';
  h += '<div class="mission-result-area">';
  h += '<div class="mission-btn success-btn' + (m.result === 'success' ? ' selected' : '') + '" onclick="setMissionResult(\'success\')">&#128737;</div>';
  h += '<div class="mission-btn fail-btn' + (m.result === 'fail' ? ' selected' : '') + '" onclick="setMissionResult(\'fail\')">&#128481;</div>';
  h += '</div>';
  h += '<div id="fail-count-row" class="fail-count-row" style="display:none">';
  h += '<div class="step-label">失败票数�?/div>';
  h += '<div class="fail-count-btns" id="fail-count-btns"></div></div>';
  h += '<div style="text-align:center;margin-top:10px"><button class="btn primary" id="btn-finalize" style="display:none" onclick="finalizeMission()">确认任务结果，进入下一�?/button></div>';
  c.innerHTML = h;

  if (m.result === 'fail') showFailCountSelector();
}

function setMissionResult(result) {
  var m = state.missions[state.currentRound];
  m.result = result;
  if (result === 'fail') {
    m.failCount = 0;
    showFailCountSelector();
  } else {
    m.failCount = 0;
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
  var m = state.missions[state.currentRound];
  m.failCount = n;
  var btns = document.querySelectorAll('#fail-count-btns .fail-count-btn');
  btns.forEach(function(b) {
    b.className = 'fail-count-btn' + (parseInt(b.textContent) === n ? ' selected' : '');
  });
}

function finalizeMission() {
  var m = state.missions[state.currentRound];
  if (!m.result) { toast('请选择任务结果', 'warn'); return; }
  if (m.result === 'fail' && !m.failCount) { toast('请选择失败票数�?, 'warn'); return; }
  if (state.excaliburEnabled) {
    var exRec = getExcaliburRecord(state.currentRound);
    if (!exRec || exRec.holder < 0) { toast('请先指定王者之剑持剑�?, 'warn'); return; }
    if (exRec.used === null || exRec.used === undefined) { toast('请先确认王者之剑是否使�?, 'warn'); return; }
    if (exRec.used === true && (exRec.target === null || exRec.target === undefined)) { toast('请选择王者之剑使用目�?, 'warn'); return; }
  }

  // �?轮保护轮：需2张失败票任务才失败，1张失败任务仍成功�?人局例外，无保护�?
  if (state.currentRound === 3 && m.result === 'fail' && (m.failCount || 0) === 1 && state.playerCount !== 6) {
    m.result = 'success';
    m.failCount = 1;
    toast('�?轮保护轮�?张失败票，任务仍成功');
  }

  stopTimer();
  state.speakerOrder = [];
  state.currentSpeakerIdx = -1;
  updateFinalTendencies();

  // Capture tendency snapshot for this round
  var snap = {};
  for (var i = 0; i < state.playerCount; i++) {
    snap[i] = state.tendencies[i] || 50;
  }
  state.roundTendencies.push(snap);

  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(�?') !== -1 || state.activeRoles.indexOf('兰斯洛特(�?') !== -1;
  if (hasLancelot && state.currentRound >= 1) {
    var sc = state.missions.filter(function(mm) { return mm.result === 'success'; }).length;
    var fc = state.missions.filter(function(mm) { return mm.result === 'fail'; }).length;
    if (sc >= 3 || fc >= 3) {
      // 已决定胜负，跳过抽卡直接推进游戏结束
      checkGameEnd();
      renderGame();
    } else {
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
  var weight = state.myRole ? 2 : 1;

  for (var i = 0; i < state.playerCount; i++) {
    if (i === si) continue;
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

    if (myVote) {
      if (vote === myVote) state.tendencies[i] += 2 * weight;
      else state.tendencies[i] -= 2 * weight;
    }

    if (state.tendencies[i] < 0) state.tendencies[i] = 0;
    if (state.tendencies[i] > 100) state.tendencies[i] = 100;
  }
  renderTendencyMini();
}

function checkGameEnd() {
  var successCount = state.missions.filter(function(mm) { return mm.result === 'success'; }).length;
  var failCount = state.missions.filter(function(mm) { return mm.result === 'fail'; }).length;

  if (failCount >= 3) {
    state.winner = 'evil';
    stopTimer();
    toast('坏人方成功破�?3 轮任务！游戏结束');
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
    // 互换身份进行中时，用交换后的�?
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
    // 互换身份时使用交换后的�?
    var isSwapped = state._swapEndRole && (i in state._swapEndRole);
    if (isSwapped) { curVal = state._swapEndRole[i]; }
    // 自动填入已知身份（如刺杀中确认的梅林），被互换的玩家跳过自动填入
    if (!curVal && !isSwapped && state.autoRoles && state.autoRoles[i]) {
      curVal = state.autoRoles[i];
    }

    h += '<div class="end-player-row">';
    h += '<span class="ep-name">' + playerLabel(i) + '</span>';
    h += '<select id="end-role-' + i + '" onchange="onEndRoleChange(' + i + ')">';
    h += '<option value="">-- 未�?--</option>';
    for (var j = 0; j < state.activeRoles.length; j++) {
      var r = state.activeRoles[j];
      if (UNIQUE_ROLES.indexOf(r) !== -1 && taken[r] && r !== curVal) continue;
      h += '<option value="' + r + '"' + (r === curVal ? ' selected' : '') + '>' + r + '</option>';
    }
    h += '</select>';
    h += '<button class="btn small swap-seat-btn" id="end-swap-role-' + i + '" onclick="swapEndRole(' + i + ')" title="互换身份">�?/button>';
    h += '</div>';
  }
  grid.innerHTML = h;
  state._renderingIdentities = false;
}

function swapEndRole(idx) {
  if (_endSwapRoleFirst === null) {
    _endSwapRoleFirst = idx;
    var btn = document.getElementById('end-swap-role-' + idx);
    if (btn) { btn.classList.add('swapping'); btn.textContent = '�?; }
    toast('已选中 ' + playerLabel(idx) + '，再点另一位的互换按钮完成互换');
  } else if (_endSwapRoleFirst === idx) {
    _endSwapRoleFirst = null;
    var btn = document.getElementById('end-swap-role-' + idx);
    if (btn) { btn.classList.remove('swapping'); btn.textContent = '�?; }
    toast('已取�?);
  } else {
    var a = _endSwapRoleFirst;
    var b = idx;
    var selA = document.getElementById('end-role-' + a);
    var selB = document.getElementById('end-role-' + b);
    var valA = selA ? selA.value : '';
    var valB = selB ? selB.value : '';
    _endSwapRoleFirst = null;
    // 清除首次点击按钮的高�?
    var prevBtn = document.getElementById('end-swap-role-' + a);
    if (prevBtn) { prevBtn.classList.remove('swapping'); prevBtn.textContent = '�?; }
    // 不能直接 sel.value = ...，因为目标值可能不在对方下拉框选项里（�?taken 过滤了）
    // 用临时映射让 renderEndIdentityDropdowns 读取交换后的值来重建
    state._swapEndRole = {};
    state._swapEndRole[a] = valB;
    state._swapEndRole[b] = valA;
    renderEndIdentityDropdowns();
    delete state._swapEndRole;
    toast(playerLabel(a) + ' �?' + playerLabel(b) + ' 身份已互�?);
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

  if (state.assassinFromMission && !state.winner) {
    $('winner-toggle').innerHTML = '';
  } else {
    var h = '<button class="winner-btn good' + (state.winner === 'good' ? ' selected' : '') + '" onclick="setWinner(\'good\')">&#128737; 好人方获�?/button>';
    h += '<button class="winner-btn evil' + (state.winner === 'evil' ? ' selected' : '') + '" onclick="setWinner(\'evil\')">&#128481; 反方获胜</button>';
    $('winner-toggle').innerHTML = h;
  }

  // 兰斯洛特反转状态由游戏中累计的反转记录自动判定
  if (state.lancelotFlipCount > 0) {
    state.lancelotFlipped = (state.lancelotFlipCount % 2 !== 0);
  }

  var sc = state.missions.filter(function(m) { return m.result === 'success'; }).length;
  var fc = state.missions.filter(function(m) { return m.result === 'fail'; }).length;
  $('end-round-summary').textContent = sc + '轮成�?/ ' + fc + '轮失�?;

  renderEndIdentityDropdowns();
  // 强制结束按钮：始终隐藏（v104：单机模式下不需要）
  var forceEndCard = $('end-force-end-card');
  if (forceEndCard) {
    forceEndCard.style.display = 'none';
  }
}

function onEndRoleChange(idx) {
  var sel = document.getElementById('end-role-' + idx);
  var role = sel ? sel.value : '';
  if (role && UNIQUE_ROLES.indexOf(role) !== -1) {
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
  var modeHtml = '<h2>兰斯洛特抽卡 · �?' + (round + 1) + ' 轮结�?/h2>' +
    '<p style="font-size:14px;text-align:center;color:var(--text-dim);margin:8px 0">剩余牌堆�? + remaining + ' 张（反转 ' + flipCount + ' / 未反�?' + blankCount + '�?/p>' +
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
  checkGameEnd();
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

  var html = '<h2>手动录入 · �?' + (round + 1) + ' 轮结�?/h2>' +
    '<p style="font-size:13px;text-align:center;color:var(--text-dim);margin:6px 0">请选择实际抽到的卡�?/p>' +
    '<div class="modal-actions" style="justify-content:center;gap:20px;flex-wrap:wrap">' +
    '<button class="btn" id="lancelot-manual-flip"' + flipDisabled + '>' + flipCard + '<span style="font-weight:700;color:var(--red-bright)">反转</span>' + (flipCount === 0 ? '<br><span style="font-size:10px;color:var(--text-dim)">已抽�?/span>' : '') + '</button>' +
    '<button class="btn" id="lancelot-manual-blank"' + blankDisabled + '>' + blankCard + '<span>未反�?/span>' + (blankCount === 0 ? '<br><span style="font-size:10px;color:var(--text-dim)">已抽�?/span>' : '') + '</button>' +
    '</div>' +
    '<div class="modal-actions" style="margin-top:6px"><button class="btn" onclick="closeModal();applyLancelotAutoDraw(' + round + ')" style="font-size:12px">�?返回选择模式</button></div>';

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
      '<p style="font-size:16px;text-align:center;margin:10px 0">�?' + (round + 1) + ' 轮结�?/p>' +
      '<p style="font-size:14px;text-align:center;color:var(--orange)">牌堆已耗尽，本轮无法抽�?/p>' +
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
    : '<span style="color:var(--text-dim)">未反转，无变�?/span>';
  var statusNote = isFlip
    ? (state.lancelotFlipped ? '（当前状态：已反转）' : '（第2次翻转，恢复原阵营）')
    : '';
  var remaining = state.lancelotDeck ? state.lancelotDeck.length : 0;

  showModal(
    '<h2>兰斯洛特抽卡 · �?' + (round + 1) + ' 轮结�?/h2>' +
    cardDisplay +
    '<p style="font-size:16px;text-align:center;margin:8px 0">' + msg + ' ' + statusNote + '</p>' +
    '<p style="font-size:12px;text-align:center;color:var(--text-dim)">剩余牌堆�? + remaining + ' �?/p>' +
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
  toast(isMerlin ? '刺杀成功！反方获�? : '刺杀失败！好人方获胜');
}

function setWinner(w) {
  state.winner = w;
  renderEnd();
}

function saveGameRecord() {
  if (!state.winner) { toast('请确定获胜方', 'warn'); return; }

  var identities = [];
  var allFilled = true;
  for (var i = 0; i < state.playerCount; i++) {
    var sel = document.getElementById('end-role-' + i);
    var role = sel ? sel.value : '';
    identities.push({ name: state.playerNames[i], index: i, role: role });
    if (!role) allFilled = false;
  }
  if (!allFilled) { toast('请为所有玩家选择身份', 'warn'); return; }

  var lancelotFlips = {};
  for (var i = 0; i < state.playerCount; i++) {
    var role = identities[i].role;
    if (role === '兰斯洛特(�?' || role === '兰斯洛特(�?') {
      lancelotFlips[i] = state.lancelotFlipped;
    }
  }

  var history = loadHistory();
  var record = {
    date: new Date().toISOString().slice(0, 10),
    playerCount: state.playerCount,
    winner: state.winner,
    identities: identities,
    lancelotFlips: lancelotFlips,
    activeRoles: state.activeRoles.slice(),
    roundTendencies: state.roundTendencies || [],
    assassinTarget: state.assassinTarget !== null ? playerLabel(state.assassinTarget) : null,
    assassinSuccess: (state.winner === 'evil' && state.assassinTarget !== null),
    assassinAfterRound: state._assassinAfterRound !== null ? state._assassinAfterRound : null,
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
  history.push(recordV2);
  saveHistory(history);

  // Supabase: 等待插入完成再跳转，防止刷新丢失
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
  if (sb) {
    var recordKey = makeRecordKey(record);
    sb.from('game_records').insert({ game_data: record, game_data_v2: recordV2 }).select('id').single().then(function(res) {
      if (res.error) {
        console.warn('[Supabase] saveGameRecord failed:', res.error);
        toast('保存失败�? + res.error.message, 'warn');
      } else if (res.data && res.data.id) {
        recordV2._sid = res.data.id;
        history[history.length - 1]._sid = res.data.id;
        saveHistory(history);
      }
      finishSave();
    });
    // 同步 name_pool 到云�?
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }, { onConflict: 'key' }).then(function(res) {
      if (res.error) console.warn('[Supabase] save name_pool failed:', res.error);
    });
    // 超时兜底�? 秒后无论如何跳转
    setTimeout(finishSave, 5000);
  } else {
    finishSave();
  }
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

  var h = '<div class="stat-card"><div class="stat-value">' + total + '</div><div class="stat-label">总对局</div></div>';
  h += '<div class="stat-card"><div class="stat-value" style="color:#99ff99">' + goodWins + '</div><div class="stat-label">好人胜场</div>';
  h += '<div class="stat-sub">' + winRate + '%</div></div>';
  h += '<div class="stat-card"><div class="stat-value" style="color:#ff9999">' + evilWins + '</div><div class="stat-label">反方胜场</div>';
  h += '<div class="stat-sub">' + (total > 0 ? Math.round(evilWins / total * 100) : 0) + '%</div></div>';

  // Merlin assassination rate: count all games except evil won by 3 mission failures
  var merlinGames = 0, merlinKilled = 0;
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!rec.missions) continue;
    var failCount = rec.missions.filter(function(m) { return m.result === 'fail'; }).length;
    if (!(failCount >= 3 && rec.winner === 'evil')) {
      merlinGames++;
      if (rec.assassinSuccess === true) merlinKilled++;
    }
  }
  if (merlinGames > 0) {
    var maRate = Math.round(merlinKilled / merlinGames * 100);
    h += '<div class="stat-card"><div class="stat-value" style="color:#ff6666">' + maRate + '%</div><div class="stat-label">梅林被刺�?/div>';
    h += '<div class="stat-sub" style="font-size:11px">' + merlinKilled + '次被�?/ ' + merlinGames + '局</div></div>';
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

  var cl = $('history-compact-list');
  h = '';
  for (var fi = start; fi < end; fi++) {
    var frec = filtered[fi];
    var rec = frec.rec;
    var i = frec.origIdx;
    if (!rec) continue;
    var winnerColor = rec.winner === 'good' ? 'var(--green-bright)' : 'var(--red-bright)';
    var winnerLabel = rec.winner === 'good' ? '好人方胜' : '反方�?;

    h += '<div class="history-compact-item">';
    h += '<div class="hci-header" onclick="toggleCompactHistory(this)">';
    h += '<span class="hci-date">' + rec.date + '</span>';
    h += '<span class="hci-players">' + rec.playerCount + '�?/span>';
    h += '<div class="hci-right">';
    h += '<span class="hci-result" style="color:' + winnerColor + '">' + winnerLabel + '</span>';
    h += '<span class="hci-toggle">&#9654;</span>';
    h += '</div></div>';
    h += '<div class="hci-body">';
    // Roles
    if (rec.identities) {
      h += '<div class="hci-roles">';
      for (var j = 0; j < rec.identities.length; j++) {
        var id = rec.identities[j];
        h += '<span>' + id.name + '�? + (id.role || '--') + '</span>';
      }
      h += '</div>';
    }
    // Missions summary
    if (rec.missions) {
      h += '<div class="hci-missions">任务�?;
      for (var j = 0; j < rec.missions.length; j++) {
        var m = rec.missions[j];
        h += '<span style="color:' + (m.result === 'success' ? 'var(--green-bright)' : 'var(--red-bright)') + '">';
        h += 'R' + (j + 1) + (m.result === 'success' ? '�? : '�?) + '</span> ';
      }
      h += '</div>';
    }
    // Identity marks
    if (rec.identityMarks && rec.identityMarks.length > 0) {
      h += '<div style="margin-top:4px;font-size:11px;color:var(--text-dim)">标记�?;
      for (var j = 0; j < rec.identityMarks.length; j++) {
        var mk = rec.identityMarks[j];
        var lvlLabel = mk.level === 'high' ? '�? : mk.level === 'mid' ? '�? : '�?;
        h += '<span>' + mk.targetName + '[' + lvlLabel + '] </span>';
      }
      h += '</div>';
    }
    if (rec.assassinTarget) {
      h += '<div style="margin-top:4px;font-size:11px;color:var(--text-dim)">刺杀';
      if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
        h += '（第' + (rec.assassinAfterRound + 1) + '轮任务后�?;
      }
      h += '�? + rec.assassinTarget + ' �?' + (rec.assassinSuccess ? '成功' : '失败') + '</div>';
    }
    h += '<div class="hci-actions">';
    h += '<button class="btn small" onclick="showGameDetail(' + i + ')">完整详情</button>';
    h += '<button class="btn small danger" onclick="deleteGameRecord(' + i + ')" style="margin-left:auto">删除</button>';
    h += '</div></div></div>';
  }
  cl.innerHTML = h;
  $('no-history').style.display = filtered.length === 0 ? 'block' : 'none';

  // Pagination
  var pageArea = $('pagination-area');
  if (totalPages <= 1) {
    pageArea.innerHTML = '';
  } else {
    var ph = '<div class="pagination">';
    ph += '<button class="page-btn" onclick="goHistoryPage(' + (state._historyPage - 1) + ')"' + (state._historyPage === 0 ? ' disabled' : '') + '>�?/button>';
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
        ph += '<span class="page-ellipsis">�?/span>';
      } else {
        ph += '<button class="page-btn' + (bp === state._historyPage ? ' active' : '') + '" onclick="goHistoryPage(' + bp + ')">' + (bp + 1) + '</button>';
      }
    }
    ph += '<button class="page-btn" onclick="goHistoryPage(' + (state._historyPage + 1) + ')"' + (state._historyPage >= totalPages - 1 ? ' disabled' : '') + '>�?/button>';
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
        recIndex: i
      });
    }
  }
  var names = Object.keys(playerSet).sort();
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
  // Player stats section - dropdown instead of buttons
  h = '<select id="player-stat-select" onchange="togglePlayerStat(this.value)" style="width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;cursor:pointer;min-height:44px;-webkit-appearance:none;appearance:none;background-image:url(\'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 12 12%27%3E%3Cpath d=%27M6 8L1 3h10z%27 fill=%27%23c9a84c%27/%3E%3C/svg%3E\');background-repeat:no-repeat;background-position:right 12px center;padding-right:32px">';
  h += '<option value="">-- 选择玩家查看统计 --</option>';
  for (var i = 0; i < names.length; i++) {
    h += '<option value="' + names[i] + '">' + names[i] + '</option>';
  }
  h += '</select>';
  $('player-stat-btns').innerHTML = h;
  state._playerSetCache = playerSet;

  // 今日胜率排行榜：第一�?9:00到次�?8:59:59为一�?
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

  // 按玩家汇总今日数�?
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
        flipped: rec.lancelotFlips && rec.lancelotFlips[id.index]
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
      if (faction === 'good') goodCount++;
      else evilCount++;
      if (items[g].winner === faction) wins++;
    }
    var rate = totalGames > 0 ? wins / totalGames : 0;
    lb.push({ name: nm, total: totalGames, goodWins: goodCount, evilWins: evilCount, rate: rate });
  }
  lb.sort(function(a, b) { return b.rate - a.rate || b.total - a.total; });

  var showAll = state._showAllLeaderboard || false;
  var maxShow = showAll ? lb.length : Math.min(10, lb.length);
  var lh = '';
  for (var r = 0; r < maxShow; r++) {
    var p = lb[r];
    var topClass = '';
    if (r === 0) topClass = ' top1';
    else if (r === 1) topClass = ' top2';
    else if (r === 2) topClass = ' top3';
    lh += '<div class="win-rate-card' + topClass + '">';
    var rateColor = p.rate >= 0.6 ? '#4caf50' : p.rate >= 0.4 ? '#ff9800' : '#f44336';
    lh += '<span class="wc-rank">' + (r + 1) + '</span>';
    lh += '<span class="wc-name">' + p.name + '</span>';
    lh += '<div><div class="wc-rate" style="font-size:24px;color:' + rateColor + ';font-weight:bold;">' + Math.round(p.rate * 100) + '%</div>';
    lh += '<div class="wc-sub">好人' + p.goodWins + ' / 反方' + p.evilWins + ' / �? + p.total + '�?/div></div>';
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
  // 按日期倒序排列（最近的在前�?
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
  if (role === '兰斯洛特(�?') return flipped ? 'evil' : 'good';
  if (role === '兰斯洛特(�?') return flipped ? 'good' : 'evil';
  return GOOD_ROLES.indexOf(role) !== -1 ? 'good' : 'evil';
}

function togglePlayerStat(name) {
  var detailEl = $('player-stat-detail');
  var safeId = 'ps-' + name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  var existing = document.getElementById(safeId);

  // Close if clicking the same player
  if (existing) {
    existing.remove();
    return;
  }

  // Close any other open detail
  var allDetails = detailEl.querySelectorAll('.player-stat-expand');
  for (var d = 0; d < allDetails.length; d++) allDetails[d].remove();

  var data = state._playerSetCache[name];
  if (!data) return;

  var total = data.length;
  var totalWins = 0;
  var gamesGood = 0, winsGood = 0;
  var gamesEvil = 0, winsEvil = 0;
  var roleStats = {};

  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var role = d.role;
    var flipped = d.flipped || false;
    var finalFaction = getFinalFaction(role, flipped);

    if (finalFaction === 'good') {
      gamesGood++;
      if (d.winner === 'good') winsGood++;
    } else {
      gamesEvil++;
      if (d.winner === 'evil') winsEvil++;
    }

    if (d.winner === finalFaction) totalWins++;

    if (!roleStats[role]) roleStats[role] = { total: 0, wins: 0 };
    roleStats[role].total++;
    if (d.winner === getFinalFaction(role, d.flipped)) roleStats[role].wins++;
  }

  var totalRate = total > 0 ? Math.round(totalWins / total * 100) : 0;
  var goodRate = gamesGood > 0 ? Math.round(winsGood / gamesGood * 100) : 0;
  var evilRate = gamesEvil > 0 ? Math.round(winsEvil / gamesEvil * 100) : 0;

  var h = '<strong>总场次：</strong>' + total + ' 局<br>';
  h += '<strong>总胜场：</strong>' + totalWins + ' �?<span style="color:var(--gold-light)">(' + totalRate + '%)</span><br>';
  h += '<strong>好人方胜率：</strong>' + winsGood + '/' + gamesGood + ' <span style="color:var(--green-bright)">(' + goodRate + '%)</span><br>';
  h += '<strong>反方胜率�?/strong>' + winsEvil + '/' + gamesEvil + ' <span style="color:var(--red-bright)">(' + evilRate + '%)</span><br><br>';
  h += '<strong>各身份胜率：</strong><table>';
  for (var j = 0; j < ALL_ROLES.length; j++) {
    var r = ALL_ROLES[j];
    var rs = roleStats[r];
    if (rs) {
      h += '<tr><td>' + r + '</td><td>' + rs.wins + '/' + rs.total + '</td><td>' + Math.round(rs.wins / rs.total * 100) + '%</td></tr>';
    } else {
      h += '<tr><td>' + r + '</td><td>-</td><td>-</td></tr>';
    }
  }
  h += '</table>';

  var div = document.createElement('div');
  div.id = safeId;
  div.className = 'player-stat-expand';
  div.innerHTML = h;
  detailEl.appendChild(div);
}

/* ==================== GAME DETAIL & EDIT ==================== */
function showGameDetail(idx) {
  var history = loadHistory();
  var rec = normalizeRecord(history[idx]);
  if (!rec) return;

  var h = '<h2>对局详情</h2>';
  h += '<p><strong>日期�?/strong>' + rec.date + ' | <strong>人数�?/strong>' + rec.playerCount + '�?| <strong>胜方�?/strong>' + (rec.winner === 'good' ? '好人�? : '反方') + '</p>';
  if (rec.assassinTarget) {
    h += '<p><strong>拍刀�?/strong>';
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += '�? + (rec.assassinAfterRound + 1) + '轮任务后反方拍刀 | ';
    }
    h += '<strong>目标�?/strong>' + rec.assassinTarget + ' | <strong>结果�?/strong>' + (rec.assassinSuccess ? '<span style="color:#ff9999">命中梅林，反方胜</span>' : '<span style="color:#99ff99">未命中，好人方胜</span>') + '</p>';
  }
  if (rec.activeRoles) {
    h += '<p><strong>使用角色�?/strong>' + rec.activeRoles.join('�?) + '</p>';
  }

  h += '<h3 style="margin-top:10px">身份分配</h3>';
  // Sort by faction (good first, then evil), then by index within each faction
  var sortedIds = rec.identities.slice().map(function(id) {
    var final = getFinalFaction(id.role, rec.lancelotFlips && rec.lancelotFlips[id.index]);
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
    }
    var flipNote = '';
    if (rec.lancelotFlips && rec.lancelotFlips[id.index]) {
      flipNote = ' <span style="color:var(--orange);font-size:11px">[反转�? + (final === 'good' ? '好人�? : '反方') + ']</span>';
    }
    h += '<div' + evilStyle + '>' + (id.index + 1) + '�?' + id.name + '�? + id.role + factionBadge + flipNote + '</div>';
  }

  h += '<h3 style="margin-top:10px">任务记录</h3>';
  // Build index-to-name mapping and faction lookup
  var nameByIndex = {};
  var nameToFaction = {};
  for (var ii = 0; ii < rec.identities.length; ii++) {
    var idt = rec.identities[ii];
    nameByIndex[idt.index] = idt.name;
    var faction = getFinalFaction(idt.role, rec.lancelotFlips && rec.lancelotFlips[idt.index]);
    nameToFaction[idt.name] = faction;
    nameToFaction[(idt.index + 1) + '�?' + idt.name] = faction;
    nameToFaction['玩家' + (idt.index + 1)] = faction;
  }
  var evilSpan = function(n) {
    if (nameToFaction[n] === 'evil') return '<span style="color:#66aaff;font-weight:700">' + n + '</span>';
    return n;
  };
  var namesToHtml = function(arr) { return arr.map(evilSpan).join(' / '); };
  var hasAssassin = (rec.assassinTarget && rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined);
  var assassinCutoff = hasAssassin ? rec.assassinAfterRound : rec.missions.length;
  var totalRounds = hasAssassin ? Math.max(rec.missions.length, assassinCutoff + 1) : rec.missions.length;
  for (var i = 0; i < totalRounds; i++) {
    if (hasAssassin && i === assassinCutoff) {
      h += '<div style="margin-bottom:4px;padding:8px 12px;background:rgba(255,153,153,0.08);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm)"><span style="font-weight:700">�? + (i + 1) + '轮：</span><span style="color:#ff9999;font-weight:700">反方拍刀</span> �?游戏在此轮终�?/div>';
      continue;
    }
    if (hasAssassin && i > assassinCutoff) break;
    if (i < rec.missions.length) {
      var m = rec.missions[i];
      // 游戏已结束，本轮未进行（result �?null 表示该轮未实际执行）
      if (!m.result && (m.launchAttempts ? m.launchAttempts.length === 0 : true)) {
        h += '<div style="margin-bottom:3px;padding:6px 10px;color:var(--text-dim);font-size:13px;font-style:italic">';
        h += '<span style="font-weight:700">�? + (i + 1) + '轮：</span>游戏已结束，本轮未进�?/div>';
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
          var label = isSucceeded ? '组队成功，任务执行成�? : (isFailed ? '组队成功，任务执行失�? + (m.failCount ? '�? + m.failCount + '张失败票�? : '') : '组队未通过');
          var bg = isSucceeded ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
          var borderColor = isSucceeded ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
          var labelColor = isSucceeded ? 'var(--green-bright)' : 'var(--red-bright)';
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg + ';border:1px solid ' + borderColor + ';border-radius:var(--radius-sm);font-size:13px">';
          h += '<span style="font-weight:700">�? + (i + 1) + '�?/span> ';
          h += '<span style="font-weight:700;color:' + labelColor + '">' + label + '</span> ';
          h += '| 队长 ' + evilSpan(nameByIndex[att.leader] || att.leader) + ' | 队伍 ' + att.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('�?);
          // Per-player vote details
          var approveNames = [], rejectNames = [];
          for (var vk in att.votes) {
            var vidx = parseInt(vk) - 1;
            var vn = nameByIndex[vidx];
            if (!vn) vn = '玩家' + (parseInt(vk));
            if (att.votes[vk] === 'approve') approveNames.push(vn);
            else rejectNames.push(vn);
          }
          if (approveNames.length || rejectNames.length) {
            var totalVotes = approveNames.length + rejectNames.length;
            var allApprove = (rejectNames.length === 0);
            h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:12px">';
            if (allApprove) {
              h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + totalVotes + '�?</span></div>';
            } else {
              if (approveNames.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + approveNames.length + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(approveNames) + '</span></div>';
              if (rejectNames.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + rejectNames.length + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(rejectNames) + '</span></div>';
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
            var lidx = parseInt(lvk) - 1;
            var ln = nameByIndex[lidx];
            if (!ln) ln = '玩家' + (parseInt(lvk));
            if (m.votes[lvk] === 'approve') lgn.push(ln); else lbn.push(ln);
          }
        }
        for (var f = 0; f < lf; f++) {
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm);font-size:13px">';
          h += '<span style="font-weight:700">�? + (i + 1) + '�?/span> ';
          h += '<span style="font-weight:700;color:var(--red-bright)">组队未通过</span>';
          h += ' | 队长 ' + evilSpan(nameByIndex[m.leader] || m.leader) + ' | 队伍 ' + m.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('�?);
          if (m.votes && (lgc + lbc > 0)) {
            var ltotal = lgc + lbc;
            var lall = (lbc === 0);
            h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:12px">';
            if (lall) {
              h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + ltotal + '�?</span></div>';
            } else {
              if (lgn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + lgc + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lgn) + '</span></div>';
              if (lbn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + lbc + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lbn) + '</span></div>';
            }
            h += '</div>';
          }
          h += '</div>';
        }
        var bg2 = isSuccess ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
        var border2 = isSuccess ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
        var color2 = isSuccess ? 'var(--green-bright)' : 'var(--red-bright)';
        h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg2 + ';border:1px solid ' + border2 + ';border-radius:var(--radius-sm);font-size:13px">';
        h += '<span style="font-weight:700">�? + (i + 1) + '�?/span> ';
        h += '<span style="font-weight:700;color:' + color2 + '">' + (isSuccess ? '组队成功，任务执行成�? : '组队成功，任务执行失�? + (m.failCount ? '�? + m.failCount + '张失败票�? : '')) + '</span>';
        h += ' | 队长 ' + evilSpan(nameByIndex[m.leader] || m.leader) + ' | 队伍 ' + m.team.map(function(idx) { return evilSpan(nameByIndex[idx] || idx); }).join('�?);
        // Vote details for legacy data
        if (m.votes && (lgc + lbc > 0)) {
          h += ' | 投票 ' + lgc + ':' + lbc;
          var ltotal = lgc + lbc;
          var lall = (lbc === 0);
          h += '<div style="margin-top:4px;display:flex;gap:8px;font-size:12px">';
          if (lall) {
            h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">全员同意(' + ltotal + '�?</span></div>';
          } else {
            if (lgn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(153,255,153,0.06);border:1px solid rgba(153,255,153,0.2);border-radius:4px"><span style="color:var(--green-bright);font-weight:700">同意(' + lgc + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lgn) + '</span></div>';
            if (lbn.length) h += '<div style="flex:1;min-width:0;padding:3px 8px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.2);border-radius:4px"><span style="color:var(--red-bright);font-weight:700">反对(' + lbc + '�?</span><span style="color:var(--text-dim);margin-left:6px">' + namesToHtml(lbn) + '</span></div>';
          }
          h += '</div>';
        }
        h += '</div>';
      }
    }
  }
  if (hasAssassin && assassinCutoff < totalRounds - 1) {
    h += '<div style="color:var(--text-dim);font-size:13px;margin-top:4px">（后�? + (totalRounds - assassinCutoff - 1) + '轮未进行，游戏在拍刀环节终止�?/div>';
  }

  if (rec.ladyCheckHistory && rec.ladyCheckHistory.length > 0) {
    h += '<h3 style="margin-top:10px">湖中女神验人</h3>';
    for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
      var lh = rec.ladyCheckHistory[li];
      h += '<div style="margin-bottom:3px;font-size:13px">';
      h += '<strong>�? + (li + 1) + '任女神：</strong>' + lh.holderName + ' �?�?' + lh.targetName;
      h += ' <span style="font-weight:700;color:' + (lh.result === 'good' ? 'var(--blue-light)' : 'var(--red-bright)') + '">女神�? + (lh.result === 'good' ? '好人' : '反方') + '</span>';
      h += ' <span style="font-size:11px;color:var(--text-dim)">（女神说的不一定准�?/span>';
      h += '</div>';
    }
  }


  if (rec.excaliburHistory && rec.excaliburHistory.length > 0) {
    h += '<h3 style="margin-top:10px">王者之�?/h3>';
    for (var ei = 0; ei < rec.excaliburHistory.length; ei++) {
      var ex = rec.excaliburHistory[ei];
      h += '<div style="margin-bottom:5px;padding:6px 10px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:var(--radius-sm);font-size:13px">';
      h += '<strong>�? + (ex.round + 1) + '轮：</strong>';
      h += '持剑�?' + (ex.holderName || (ex.holder !== undefined ? (ex.holder + 1) + '�? : '未指�?));
      if (ex.used === false) {
        h += '�?span style="color:var(--text-dim)">未使�?/span>';
      } else if (ex.used === true) {
        h += '，对 ' + (ex.targetName || (ex.target !== undefined && ex.target !== null ? (ex.target + 1) + '�? : '未记录目�?)) + ' 使用';
        h += '，反馈：<span style="font-weight:700;color:var(--gold-light)">' + excaliburDirectionLabel(ex.claimedDirection) + '</span>';
        if (ex.feedbackRound !== null && ex.feedbackRound !== undefined) h += '（第' + (ex.feedbackRound + 1) + '轮发言记录�?;
      } else {
        h += '�?span style="color:var(--orange)">待确认是否使�?/span>';
      }
      if (ex.note) h += '<div style="font-size:12px;color:var(--text-dim);margin-top:3px">备注�? + ex.note + '</div>';
      h += '</div>';
    }
  }

  if (rec.roundTendencies && rec.roundTendencies.length > 0) {
    h += '<h3 style="margin-top:10px">倾向值变�?/h3>';
    h += '<table style="font-size:12px;width:100%;border-collapse:collapse"><tr style="border-bottom:1px solid var(--border)"><th style="padding:4px 6px;text-align:left">玩家</th>';
    for (var r = 0; r < rec.roundTendencies.length; r++) {
      h += '<th style="padding:4px 6px;text-align:center">�? + (r + 1) + '�?/th>';
    }
    h += '</tr>';
    for (var i = 0; i < rec.identities.length; i++) {
      var id = rec.identities[i];
      h += '<tr style="border-bottom:1px solid var(--border)"><td style="padding:4px 6px;font-weight:600">' + (id.index + 1) + '�?' + id.name + '</td>';
      for (var r = 0; r < rec.roundTendencies.length; r++) {
        var val = rec.roundTendencies[r][id.index];
        if (val !== undefined) {
          var color = val >= 50 ? 'var(--green-bright)' : 'var(--red-bright)';
          h += '<td style="padding:4px 6px;text-align:center;color:' + color + ';font-weight:700">' + val + '</td>';
        } else {
          h += '<td style="padding:4px 6px;text-align:center;color:var(--text-dim)">-</td>';
        }
      }
      h += '</tr>';
    }
    h += '</table>';
  }

  h += '<div class="modal-actions">';
  h += '<button class="btn" onclick="showEditGameRecord(' + idx + ')">编辑</button>';
  h += '<button class="btn" onclick="closeModal()">关闭</button>';
  h += '</div>';
  showModal(h);
}

function showEditGameRecord(idx) {
  closeModal();
  var history = loadHistory();
  var rec = normalizeRecord(history[idx]);
  if (!rec) return;

  var h = '<h2>编辑对局</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim)">' + rec.date + ' · ' + rec.playerCount + '�?/p>';

  h += '<h3 style="margin-top:8px">胜方</h3>';
  h += '<div class="winner-toggle" style="margin-bottom:8px">';
  h += '<button class="winner-btn good' + (rec.winner === 'good' ? ' selected' : '') + '" id="edit-winner-good" onclick="editToggleWinner(\'good\')">&#128737; 好人�?/button>';
  h += '<button class="winner-btn evil' + (rec.winner === 'evil' ? ' selected' : '') + '" id="edit-winner-evil" onclick="editToggleWinner(\'evil\')">&#128481; 反方</button>';
  h += '</div>';

  if (rec.assassinTarget) {
    h += '<h3 style="margin-top:8px">拍刀</h3>';
    h += '<p style="font-size:13px">目标�? + rec.assassinTarget;
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += ' | �? + (rec.assassinAfterRound + 1) + '轮任务后';
    }
    h += '</p>';
    h += '<div class="btn-row" style="margin-bottom:8px">';
    h += '<button class="btn small' + (rec.assassinSuccess ? ' selected' : '') + '" id="edit-assassin-success" onclick="editToggleAssassin(true)">刺杀成功</button>';
    h += '<button class="btn small' + (!rec.assassinSuccess ? ' selected' : '') + '" id="edit-assassin-fail" onclick="editToggleAssassin(false)">刺杀失败</button>';
    h += '</div>';
  }

  h += '<h3 style="margin-top:8px">玩家身份</h3>';
  var activeRoles = rec.activeRoles || ALL_ROLES.slice(0, 8);
  for (var i = 0; i < rec.identities.length; i++) {
    var id = rec.identities[i];
    // Collect names already taken by other players
    var takenEditNames = {};
    for (var k = 0; k < rec.identities.length; k++) {
      if (k === i) continue;
      takenEditNames[rec.identities[k].name] = true;
    }
    h += '<div class="edit-player-row">';
    h += '<span class="ep-name">' + (id.index + 1) + '�?/span>';
    h += '<select id="edit-name-' + i + '" style="flex:0;min-width:72px;padding:7px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer;min-height:40px">';
    var sortedEditPool = getSortedNamePool();
    for (var k = 0; k < sortedEditPool.length; k++) {
      var nm = sortedEditPool[k];
      if (takenEditNames[nm] && nm !== id.name) continue;
      h += '<option value="' + nm + '"' + (nm === id.name ? ' selected' : '') + '>' + nm + '</option>';
    }
    if (namePool.indexOf(id.name) === -1) {
      h += '<option value="' + id.name + '" selected>' + id.name + '</option>';
    }
    h += '</select>';
    h += '<select id="edit-role-' + i + '">';
    h += '<option value="">-- 未�?--</option>';
    for (var j = 0; j < activeRoles.length; j++) {
      h += '<option value="' + activeRoles[j] + '"' + (activeRoles[j] === id.role ? ' selected' : '') + '>' + activeRoles[j] + '</option>';
    }
    h += '</select>';
    h += '</div>';
  }

  var hasLancelot = activeRoles.indexOf('兰斯洛特(�?') !== -1 || activeRoles.indexOf('兰斯洛特(�?') !== -1;
  var anyFlipped = false;
  if (rec.lancelotFlips) {
    for (var k = 0; k < rec.identities.length; k++) {
      if (rec.lancelotFlips[rec.identities[k].index]) { anyFlipped = true; break; }
    }
  }
  h += '<h3 style="margin-top:8px">兰斯洛特反转</h3>';
  h += '<div class="winner-toggle" style="margin-bottom:8px">';
  h += '<button class="winner-btn good' + (anyFlipped ? ' selected' : '') + '" id="edit-lancelot-yes" onclick="setEditLancelotFlip(true)">&#9989; 是，反转</button>';
  h += '<button class="winner-btn evil' + (!anyFlipped ? ' selected' : '') + '" id="edit-lancelot-no" onclick="setEditLancelotFlip(false)">&#10060; 否，不反�?/button>';
  h += '</div>';

  h += '<div class="modal-actions">';
  h += '<button class="btn primary" onclick="saveEditGameRecord(' + idx + ')">保存修改</button>';
  h += '<button class="btn" onclick="showGameDetail(' + idx + ')">取消</button>';
  h += '</div>';

  // Store current edit state
  state._editRec = JSON.parse(JSON.stringify(rec));
  state._editRec._lancelotFlipped = anyFlipped;
  state._editIdx = idx;

  showModal(h);
}

function setEditLancelotFlip(val) {
  state._editRec._lancelotFlipped = val;
  var yBtn = document.getElementById('edit-lancelot-yes');
  var nBtn = document.getElementById('edit-lancelot-no');
  if (yBtn) yBtn.className = 'winner-btn good' + (val ? ' selected' : '');
  if (nBtn) nBtn.className = 'winner-btn evil' + (!val ? ' selected' : '');
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
    if (role === '兰斯洛特(�?' || role === '兰斯洛特(�?') {
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
  toast('对局记录已更�?);
  renderStats();
}

function deleteGameRecord(idx) {
  var h = '<h2>确认删除</h2>';
  h += '<p>确定要删除这条对局记录吗？此操作不可撤销�?/p>';
  h += '<div class="modal-actions">';
  h += '<button class="btn danger" onclick="confirmDeleteGame(' + idx + ')">确认删除</button>';
  h += '<button class="btn" onclick="closeModal()">取消</button>';
  h += '</div>';
  showModal(h);
}

function confirmDeleteGame(idx) {
  closeModal();
  var history = loadHistory();
  if (idx < 0 || idx >= history.length) return;
  var recRaw = history[idx];
  var record = normalizeRecord(recRaw);
  var key = makeRecordKey(recRaw);
  var sb = getSupabase();

  // 先删�?Supabase，确保云端同步后再更新本�?
  function doLocalDelete() {
    var deletedKeys = loadDeletedKeys();
    if (key && deletedKeys.indexOf(key) === -1) {
      deletedKeys.push(key);
      saveDeletedKeys(deletedKeys);
    }
    history.splice(idx, 1);
    saveHistory(history);
    toast('已删除该对局记录');
    renderStats();
  }

  if (sb) {
    // �?_supabaseId 删除；若无则�?game_data 匹配查找后删�?
    function doDeleteById(sid) {
      sb.from('game_records').delete().eq('id', sid).then(function(res) {
        if (!res.error) {
          console.log('[Supabase] deleteGameRecord success by id:', sid);
          doLocalDelete();
        } else {
          console.warn('[Supabase] deleteGameRecord failed:', res.error);
          toast('云端删除失败，请重试');
        }
      });
    }

    if (record._supabaseId) {
      doDeleteById(record._supabaseId);
    } else {
      // �?_supabaseId，按 date + playerCount + identities 匹配查找
      sb.from('game_records').select('id')
        .eq('game_data->>date', record.date)
        .eq('game_data->>playerCount', record.playerCount)
        .then(function(res) {
          if (res.error || !res.data || !res.data.length) {
            // 云端无匹配，直接本地删除
            doLocalDelete();
            return;
          }
          // 进一步按 identities 匹配
          var recIds = (record.identities || []).map(function(id) { return (id.name||'')+'|'+(id.role||''); }).sort().join(',');
          var found = null;
          for (var i = 0; i < res.data.length; i++) {
            var gd = res.data[i].game_data;
            if (!gd || !gd.identities) continue;
            var cIds = gd.identities.map(function(id) { return (id.name||'')+'|'+(id.role||''); }).sort().join(',');
            if (cIds === recIds) { found = res.data[i].id; break; }
          }
          if (found) {
            doDeleteById(found);
          } else {
            doLocalDelete();
          }
        });
    }
  } else {
    // �?Supabase 连接，仅本地删除
    doLocalDelete();
  }
}

/* ==================== MODAL ==================== */
function showModal(html) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'dynamic-modal-overlay';
  overlay.innerHTML = '<div class="modal" id="temp-modal">' + html + '</div>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
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
  toast('已清除所有统�?);
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
  // 导出时把 v2 格式转回旧格式（可读�?
  if (data['avalon_history_v2'] && Array.isArray(data['avalon_history_v2'])) {
    data['avalon_history_v2'] = data['avalon_history_v2'].map(function(r) { return normalizeRecord(r); });
  }
  var json = JSON.stringify(data);

  var prettyJson = JSON.stringify(data, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prettyJson).then(function() {
      toast('数据已复制到剪贴�?);
    }).catch(function() {
      showExportModal(prettyJson);
    });
  } else {
    showExportModal(prettyJson);
  }
}

function showExportModal(json) {
  var h = '<h2>导出数据</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">复制下方 JSON 文本�?/p>';
  h += '<textarea class="import-textarea" readonly onclick="this.select()">' + json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>';
  h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button></div>';
  showModal(h);
}

function importData() {
  var h = '<h2>导入数据</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">粘贴 JSON 数据后点击导入。将覆盖现有的阿瓦隆数据�?/p>';
  h += '<textarea class="import-textarea" id="import-textarea" placeholder="在此粘贴 JSON 数据�?></textarea>';
  h += '<div class="modal-actions">';
  h += '<button class="btn primary" onclick="doImport()">确认导入</button>';
  h += '<button class="btn" onclick="closeModal()">取消</button>';
  h += '</div>';
  showModal(h);
}

function doImport() {
  var ta = document.getElementById('import-textarea');
  if (!ta) return;
  var raw = ta.value.trim();
  if (!raw) { toast('请粘�?JSON 数据', 'warn'); return; }

  var data;
  try { data = JSON.parse(raw); } catch(e) { toast('JSON 格式错误，请检�?, 'warn'); return; }
  if (!data || typeof data !== 'object') { toast('数据格式无效', 'warn'); return; }

  var validKeys = ['avalon_name_pool', 'avalon_history_v2', 'avalon_last_game'];
  var imported = 0;
  for (var i = 0; i < validKeys.length; i++) {
    var k = validKeys[i];
    if (k in data) {
      localStorage.setItem(k, JSON.stringify(data[k]));
      if (k === 'avalon_history_v2') invalidateHistoryCache();
      imported++;
    }
  }
  if (imported === 0) { toast('未识别到有效数据', 'warn'); return; }

  closeModal();
  toast('已导�?' + imported + ' 条数据，即将刷新页面');
  setTimeout(function() { location.reload(); }, 800);
}

// Supabase Realtime 订阅：跨设备实时同步
// 页面加载时从 Supabase 拉取历史数据合并到本地（补充实时推送之前的记录�?
function pullInitialData(sb) {
  var lastSync = localStorage.getItem('avalon_last_sync');
  var query = sb.from('game_records').select('id, game_data, game_data_v2, created_at').order('created_at', { ascending: true });

  if (lastSync) {
    query = query.gt('created_at', lastSync);
  }

  query.then(function(gameRes) {
    if (gameRes.error) {
      console.warn('[InitPull] game_records fetch failed:', gameRes.error);
      return;
    }
    if (!gameRes.data || gameRes.data.length === 0) {
      if (!lastSync) console.log('[InitPull] no records in cloud');
      return;
    }

    var localHistory = loadHistory();
    var localDeletedKeys = loadDeletedKeys();
    var newSyncTime = gameRes.data[gameRes.data.length - 1].created_at;
    var hasNew = false;

    for (var i = 0; i < gameRes.data.length; i++) {
      var row = gameRes.data[i];
      var recordV2 = row.game_data_v2 ? row.game_data_v2 : (row.game_data ? toRecordV2(row.game_data) : null);
      if (!recordV2) continue;
      recordV2._sid = row.id;

      // 检查删除黑名单
      var key = makeRecordKey(recordV2);
      if (localDeletedKeys.indexOf(key) !== -1) {
        console.log('[InitPull] skipped deleted:', key);
        continue;
      }

      // 合并去重：按 key 查找本地是否已存�?
      var exists = false;
      for (var j = 0; j < localHistory.length; j++) {
        if (makeRecordKey(localHistory[j]) === key) { exists = true; break; }
      }
      if (!exists) {
        localHistory.push(recordV2);
        hasNew = true;
      }
    }

    if (hasNew) {
      localHistory.sort(function(a, b) {
        var da = (a.d || a.date || '');
        var db = (b.d || b.date || '');
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });
      saveHistory(localHistory);
      console.log('[InitPull] merged ' + gameRes.data.length + ' cloud records, total:', localHistory.length);
    }

    if (newSyncTime) localStorage.setItem('avalon_last_sync', newSyncTime);

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

  // 首次加载时从 Supabase 回拉历史数据（补�?realtime 订阅之前的记录）
  pullInitialData(sb);

  _supabaseChannel = sb.channel('game-records-channel');

  // 订阅 game_records �?INSERT 事件
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
        // 检查删除黑名单
        var dk = loadDeletedKeys();
        if (dk.indexOf(makeRecordKey(newRecord)) !== -1) { console.log('[Realtime] skipped deleted record'); return; }
        var localHistory = loadHistory();
        // 检查是否已存在（避免重复）
        var newKey = makeRecordKey(newRecord);
        var exists = false;
        for (var i = 0; i < localHistory.length; i++) {
          if (makeRecordKey(localHistory[i]) === newKey) { exists = true; break; }
        }
        if (!exists) {
          localHistory.push(newRecord);
          saveHistory(localHistory);
          console.log('[Realtime] added new record, total:', localHistory.length);
        } else {
          console.log('[Realtime] skipped duplicate record');
        }
        // 当前�?stats 页面则刷�?
        scheduleRenderStats();
      } catch(e) {
        console.warn('[Realtime] failed to process game_record:', e);
      }
    }
  );

  // 订阅 key_value �?UPDATE 事件（name_pool�?
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

  // 订阅 game_records �?DELETE 事件
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

  _supabaseChannel.subscribe(function(status) {
    console.log('[Realtime] channel status:', status);
    if (status === 'SUBSCRIBED') {
      _supabaseConnected = true;
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      _supabaseConnected = false;
    }
    // Update connection indicator if on stats page
    if (state._currentPage === 'stats') {
      renderConnectionStatus();
    }
  });
}

function renderConnectionStatus() {
  var el = document.getElementById('connection-indicator');
  if (!el) {
    // 在统计页卡片区域创建连接指示�?
    var statsCard = document.querySelector('#page-stats .card');
    if (!statsCard) return;
    el = document.createElement('div');
    el.id = 'connection-indicator';
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;padding:8px 12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600';
    statsCard.parentNode.insertBefore(el, statsCard);
  }
  if (_supabaseConnected) {
    el.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.6)"></span> 实时同步已连�?;
    el.style.background = 'rgba(74,222,128,0.08)';
    el.style.color = '#4ade80';
  } else {
    el.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6b7280"></span> 离线';
    el.style.background = 'rgba(107,114,128,0.1)';
    el.style.color = '#9ca3af';
  }
}

// 合并去重：基�?date + playerCount + identities 生成唯一�?
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
  var rec = normalizeRecord(record);
  if (!rec || !rec.identities) return '';
  var identityStr = rec.identities.map(function(id) { return (id.name || '') + '|' + (id.role || ''); }).sort().join(',');
  return (rec.date || '') + '|' + (rec.playerCount || 0) + '|' + identityStr;
}

/* ==================== INIT ==================== */
(function() {
  // iPad/移动端兼容：首次用户交互时预初始�?AudioContext（绕过浏览器自动播放限制�?
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
    state.activeRoles = (last.playerCount === 10) ? ['梅林','派西维尔','忠臣','莫甘�?,'刺客','莫德雷德'] : DEFAULT_ACTIVE_ROLES.slice();
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

  // 首屏先可用，再延后非必要网络任务，提升手机刷新速度
  setTimeout(function() {
    setupRealtimeSubscriptions();
  }, 1200);

})();

/* ==================== NEW TENDENCY SYSTEM ==================== */

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

var ROLE_CATEGORY = {
  '梅林': 'good', '派西维尔': 'good', '忠臣': 'good',
  '莫甘�?: 'evil', '刺客': 'evil', '莫德雷德': 'evil',
  '奥伯�?: 'evil', '爪牙': 'evil', '兰斯洛特': 'evil'
};

function isGoodRole(role) { return ROLE_CATEGORY[role] === 'good'; }
function isEvilRole(role) { return ROLE_CATEGORY[role] === 'evil'; }

function getPerspective() {
  if (!state.myRole) return 'unknown';
  return isGoodRole(state.myRole) ? 'good' : 'evil';
}

function getKnownLabel(idx) {
  return state.knownIdentities[idx] || null;
}

function getRoleOptions() {
  return [
    { value: '', label: '不明' },
    { value: '正方', label: '正方（通用�? },
    { value: '反方', label: '反方（通用�? },
    { value: '梅林', label: '梅林' },
    { value: '派西维尔', label: '派西维尔' },
    { value: '忠臣', label: '忠臣' },
    { value: '莫甘�?, label: '莫甘�? },
    { value: '刺客', label: '刺客' },
    { value: '莫德雷德', label: '莫德雷德' },
    { value: '奥伯�?, label: '奥伯�? },
    { value: '爪牙', label: '爪牙' },
    { value: '兰斯洛特', label: '兰斯洛特' }
  ];
}

/* ------- Tend Role Selector ------- */
function setTendRole(role) {
  state.myRole = role;
  renderTendRoleSelector();
  renderTendPerspective();
  renderKnownIdentityGrid();
  renderTendResult();
}
function clearTendRole() {
  state.myRole = null;
  renderTendRoleSelector();
  renderTendPerspective();
  renderKnownIdentityGrid();
  renderTendResult();
}
function renderTendRoleSelector() {
  var grid = document.getElementById('tend-role-grid');
  var card = document.getElementById('tend-role-card');
  if (!grid || !card) return;
  var h = '';
  if (state.myRole) {
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span style="font-size:14px;font-weight:600;color:var(--gold-light)">当前身份�? + escapeHtml(state.myRole) + '</span>';
    h += '<button class="btn tiny" onclick="clearTendRole()">清除</button>';
    h += '</div>';
  }
  h += '<select onchange="setTendRole(this.value)" style="width:100%;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid rgba(201,168,76,0.25);background:var(--parchment);color:var(--text);font-size:15px;cursor:pointer;min-height:44px;margin-top:6px">';
  h += '<option value="">-- 选择身份 --</option>';
  for (var j = 0; j < ALL_ROLES.length; j++) {
    var r = ALL_ROLES[j];
    var sel = state.myRole === r ? ' selected' : '';
    h += '<option value="' + r + '"' + sel + '>' + r + '</option>';
  }
  h += '</select>';
  grid.innerHTML = h;
}

/* ------- Perspective header ------- */
function renderTendPerspective() {
  var persp = getPerspective();
  var titleEl = document.getElementById('tend-perspective-title');
  var descEl = document.getElementById('tend-perspective-desc');

  if (!state.myRole) {
    titleEl.textContent = '倾向分析';
    descEl.textContent = '请在上方「我的身份」卡片中选择你的角色';
    return;
  }

  if (persp === 'good') {
    titleEl.textContent = '好人视角：寻找反�?;
    descEl.textContent = '你当前身份是�? + state.myRole + '」，正在分析其他玩家是反方的概率';
  } else {
    titleEl.textContent = '反方视角：寻找梅�?;
    descEl.textContent = '你当前身份是�? + state.myRole + '」，正在分析其他玩家是梅林的概率';
  }
}

/* ------- Known identity grid ------- */
function renderKnownIdentityGrid() {
  var el = document.getElementById('known-identity-grid');
  var opts = getRoleOptions();
  var h = '<div class="known-identity-row">';

  for (var i = 0; i < state.playerCount; i++) {
    if (i === state.selfIndex) continue;
    var cur = state.knownIdentities[i] || '';
    h += '<div class="known-item">';
    h += '<span class="known-name">' + escapeHtml(state.playerNames[i]) + '</span>';
    h += '<select class="known-select" onchange="setKnownIdentity(' + i + ', this.value)"' +
         ' id="known-sel-' + i + '">';
    for (var j = 0; j < opts.length; j++) {
      h += '<option value="' + opts[j].value + '"' + (opts[j].value === cur ? ' selected' : '') + '>' +
           opts[j].label + '</option>';
    }
    h += '</select>';
    h += '</div>';
  }

  h += '</div>';
  el.innerHTML = h;
}

function setKnownIdentity(idx, value) {
  if (value === '') {
    delete state.knownIdentities[idx];
  } else {
    state.knownIdentities[idx] = value;
  }
  renderTendResult();
}

function buildTendScoreCacheKey() {
  var missionSig = (state.missions || []).map(function(m) {
    return {
      r: m.round,
      s: m.size,
      ld: m.leader,
      t: m.team,
      v: m.votes,
      res: m.result,
      fc: m.failCount,
      lf: m.launchFailures
    };
  });
  return JSON.stringify({
    pc: state.playerCount,
    names: state.playerNames,
    self: state.selfIndex,
    role: state.myRole,
    known: state.knownIdentities,
    lady: state.ladyLakeChecks,
    ex: state.excaliburHistory,
    lanc: state.lancelotFlipped,
    missions: missionSig
  });
}

function cloneTendScoreList(list) {
  if (!list) return null;
  var cloned = list.map(function(item) {
    return {
      idx: item.idx,
      score: item.score,
      evidence: (item.evidence || []).slice()
    };
  });
  cloned._dataQuality = list._dataQuality;
  cloned._totalRounds = list._totalRounds;
  return cloned;
}

/* ------- Scoring engine ------- */
/* ---------- v7 Progressive Evidence-Accumulation Scoring Engine ---------- */
function computeSuspectScores() {
  var cacheKey = buildTendScoreCacheKey();
  if (_tendScoreCacheKey === cacheKey && _tendScoreCacheValue) {
    return cloneTendScoreList(_tendScoreCacheValue);
  }

  var pc = state.playerCount;
  var persp = getPerspective();
  var selfIdx = state.selfIndex;

  // Evidence accumulation: good_ev / evil_ev with 10/10 smooth prior
  var ev = {};
  for (var i = 0; i < pc; i++) {
    if (i === selfIdx) continue;
    ev[i] = { good_ev: 10, evil_ev: 10, merlin: 0, locked: false, lockReason: '', reasons: [] };
  }

  var knownIdentities = state.knownIdentities || {};

  // Step 1: Lock known identities (hard anchors)
  for (var i = 0; i < pc; i++) {
    if (i === selfIdx) continue;
    var label = knownIdentities[i];
    if (!label) continue;
    if (isGoodRole(label) || label === '正方' || label === '好人') {
      ev[i].good_ev = 100; ev[i].evil_ev = 0; ev[i].locked = true;
      ev[i].lockReason = '已知�? + label;
      ev[i].reasons.push('已知正派�? + label);
      if (label === '梅林') ev[i].merlin = 100;
    } else if (isEvilRole(label) || label === '反方' || label === '坏人') {
      ev[i].good_ev = 0; ev[i].evil_ev = 100; ev[i].locked = true;
      ev[i].lockReason = '已知�? + label;
      ev[i].reasons.push('已知反派�? + label);
    }
  }

  // Step 2: Lady of the Lake checks (strong signal, non-locking)
  var ladyChecks = state.ladyLakeChecks || [];
  for (var c = 0; c < ladyChecks.length; c++) {
    var check = ladyChecks[c];
    var target = check.target;
    if (target === undefined || target === selfIdx) continue;
    if (!ev[target] || ev[target].locked) continue;
    if (check.result === 'good') {
      ev[target].good_ev += 20;
      ev[target].reasons.push('湖中仙女�? + (state.playerNames[target] || '') + '为好 +20');
    } else if (check.result === 'evil') {
      ev[target].evil_ev += 20;
      ev[target].reasons.push('湖中仙女�? + (state.playerNames[target] || '') + '为坏 +20');
    }
  }


  // Step 2B: 王者之剑声明类证据
  var exHistory = state.excaliburHistory || [];
  for (var exi = 0; exi < exHistory.length; exi++) {
    var ex = exHistory[exi];
    if (!ex || ex.used !== true || ex.holder === undefined || ex.holder < 0) continue;
    var holder = ex.holder;
    var target = ex.target;
    var dir = ex.claimedDirection || '';
    if (ev[holder] && !ev[holder].locked) {
      if (!ex.feedbackRecorded) {
        ev[holder].reasons.push('R' + (ex.round + 1) + '王者之剑已使用，待反馈；该轮任务权重降�?);
      } else if (dir === 'fail_to_success') {
        ev[holder].good_ev += 10;
        ev[holder].reasons.push('R' + (ex.round + 1) + '王者之剑声明：失败→成功，持剑者好人证�?+10');
      } else if (dir === 'success_to_fail') {
        ev[holder].evil_ev += 15;
        ev[holder].reasons.push('R' + (ex.round + 1) + '王者之剑声明：成功→失败，持剑者坏人证�?+15');
      } else if (dir === 'unknown') {
        ev[holder].evil_ev += 4;
        ev[holder].reasons.push('R' + (ex.round + 1) + '王者之剑已使用但未说明方向 +4');
      } else if (dir === 'refused') {
        ev[holder].evil_ev += 5;
        ev[holder].reasons.push('R' + (ex.round + 1) + '王者之剑已使用但拒绝说�?+5');
      }
    }
    if (target !== null && target !== undefined && ev[target] && !ev[target].locked && ex.feedbackRecorded) {
      if (dir === 'fail_to_success') {
        ev[target].evil_ev += 8;
        ev[target].reasons.push('R' + (ex.round + 1) + '王者之剑声明：目标原为失败�?+8');
      } else if (dir === 'success_to_fail') {
        ev[target].good_ev += 6;
        ev[target].reasons.push('R' + (ex.round + 1) + '王者之剑声明：目标原为成功牌，好人也可能被改成失败 +6');
      }
    }
  }

  // Step 3: Task result hard constraints (with round recency decay & dual-fail detection)
  var missions = state.missions || [];
  var completed = [];
  for (var m = 0; m < missions.length; m++) {
    if (missions[m].result) completed.push(missions[m]);
  }
  var totalRounds = completed.length;

  // Collect known evils/goods for constraint propagation
  var knownEvils = [];
  var knownGoods = [];
  for (var i = 0; i < pc; i++) {
    if (i === selfIdx) continue;
    if (ev[i].locked) {
      if (ev[i].evil_ev === 100) knownEvils.push(i);
      if (ev[i].good_ev === 100) knownGoods.push(i);
    }
  }

  function roundRecency(r, total) {
    if (total <= 2) return r === 0 ? 0.95 : 1.0;
    return [0.7, 0.85, 1.0, 1.0, 1.0][Math.min(r, 4)] || 1.0;
  }

  for (var r = 0; r < completed.length; r++) {
    var m = completed[r];
    var team = m.team || [];
    var resultStr = m.result;
    var teamSize = team.length;
    var failCount = m.failCount || 0;
    var recency = roundRecency(r, totalRounds);
    var exRoundRec = getExcaliburRecord(m.round != null ? m.round : r);
    if (exRoundRec && exRoundRec.used === true) recency *= 0.7;

    var knownEvilInTeam = [];
    var unknownInTeam = [];
    for (var t = 0; t < team.length; t++) {
      var ti = team[t];
      if (ti === selfIdx) continue;
      if (ev[ti] && ev[ti].locked && ev[ti].evil_ev === 100) knownEvilInTeam.push(ti);
      else if (ev[ti] && !ev[ti].locked) unknownInTeam.push(ti);
    }

    if (resultStr === 'fail') {
      if (knownEvilInTeam.length > 0) {
        for (var u = 0; u < unknownInTeam.length; u++) {
          ev[unknownInTeam[u]].reasons.push('R' + (r+1) + '失败(有已知坏人，不罚)');
        }
      } else if (unknownInTeam.length === 1) {
        ev[unknownInTeam[0]].evil_ev += Math.floor(40 * recency);
        ev[unknownInTeam[0]].reasons.push('R' + (r+1) + '失败，唯一未知�?+' + Math.floor(40 * recency));
      } else if (unknownInTeam.length > 1) {
        var share, note;
        if (teamSize >= 5 && failCount >= 2) {
          share = Math.floor(80 * recency / unknownInTeam.length);
          note = '至少2坏人';
        } else {
          share = Math.floor(60 * recency / unknownInTeam.length);
          note = '必有坏人';
        }
        for (var u = 0; u < unknownInTeam.length; u++) {
          ev[unknownInTeam[u]].evil_ev += share;
          ev[unknownInTeam[u]].reasons.push('R' + (r+1) + '失败(' + note + ') +' + share);
        }
      }
    }

    if (resultStr === 'success') {
      var addGood = knownEvilInTeam.length > 0 ? Math.floor(4 * recency) : Math.floor(6 * recency);
      var suffix = knownEvilInTeam.length > 0 ? '(有坏人伪�?' : '';
      for (var u = 0; u < unknownInTeam.length; u++) {
        ev[unknownInTeam[u]].good_ev += addGood;
        ev[unknownInTeam[u]].reasons.push('R' + (r+1) + '成功' + suffix + ' +' + addGood);
      }
    }
  }

  // Step 4: Multi-round cross analysis (adaptive threshold)
  var failCountMap = {};
  var successCountMap = {};
  for (var i = 0; i < pc; i++) { failCountMap[i] = 0; successCountMap[i] = 0; }
  for (var r = 0; r < completed.length; r++) {
    var m = completed[r];
    var team = m.team || [];
    if (m.result === 'fail') {
      for (var t = 0; t < team.length; t++) failCountMap[team[t]]++;
    } else {
      for (var t = 0; t < team.length; t++) successCountMap[team[t]]++;
    }
  }

  var failThreshold = totalRounds <= 2 ? 1 : 2;
  var successThreshold = totalRounds <= 2 ? 2 : 3;

  for (var i = 0; i < pc; i++) {
    if (i === selfIdx || ev[i].locked) continue;
    if (failCountMap[i] >= failThreshold) {
      var failRoundsWithKnownEvil = 0;
      for (var r = 0; r < completed.length; r++) {
        var m = completed[r];
        if (m.result !== 'fail') continue;
        var team = m.team || [];
        if (team.indexOf(i) === -1) continue;
        var hasKnownEvil = false;
        for (var t = 0; t < team.length; t++) {
          if (ev[team[t]] && ev[team[t]].locked && ev[team[t]].evil_ev === 100) { hasKnownEvil = true; break; }
        }
        if (hasKnownEvil) failRoundsWithKnownEvil++;
      }
      if (failRoundsWithKnownEvil < failCountMap[i]) {
        var weight = totalRounds >= 3 ? 12 : 8;
        ev[i].evil_ev += weight;
        ev[i].reasons.push(failCountMap[i] + '轮失�?+' + weight);
      }
    }
    if (successCountMap[i] >= successThreshold) {
      ev[i].good_ev += 8;
      ev[i].reasons.push(successCountMap[i] + '轮成�?+8');
    }
  }

  // Step 5: Launch failure analysis
  var leaderLaunchFails = {};
  for (var r = 0; r < completed.length; r++) {
    var m = completed[r];
    var leader = m.leader;
    var lf = m.launchFailures || 0;
    if (!leader || lf <= 0) continue;
    try {
      var leaderIdx = parseInt(leader.split('�?)[0]) - 1;
      leaderLaunchFails[leaderIdx] = (leaderLaunchFails[leaderIdx] || 0) + lf;
    } catch(e) {}
  }
  for (var i in leaderLaunchFails) {
    i = parseInt(i);
    if (i === selfIdx || !ev[i] || ev[i].locked) continue;
    if (leaderLaunchFails[i] >= 3) {
      ev[i].evil_ev += 3;
      ev[i].reasons.push('累计' + leaderLaunchFails[i] + '次发车失�?+3');
    }
  }

  // Step 6: Voting analysis (skip unanimous rounds, adaptive min votes)
  for (var i = 0; i < pc; i++) {
    if (i === selfIdx || ev[i].locked) continue;
    var evilMatch = 0, evilTotal = 0;
    var goodMatch = 0, goodTotal = 0;

    for (var r = 0; r < completed.length; r++) {
      var m = completed[r];
      if (!m.votes) continue;
      var iVote = m.votes[i];
      if (!iVote) continue;

      // Skip unanimous rounds
      var allEvilVotes = [];
      for (var e = 0; e < knownEvils.length; e++) {
        var evv = m.votes[knownEvils[e]];
        if (evv) allEvilVotes.push(evv);
      }
      if (allEvilVotes.length >= 2 && allEvilVotes.every(function(v) { return v === allEvilVotes[0]; })) continue;

      var allGoodVotes = [];
      for (var g = 0; g < knownGoods.length; g++) {
        var gvv = m.votes[knownGoods[g]];
        if (gvv) allGoodVotes.push(gvv);
      }
      if (allGoodVotes.length >= 2 && allGoodVotes.every(function(v) { return v === allGoodVotes[0]; })) continue;

      for (var e = 0; e < knownEvils.length; e++) {
        var eVote = m.votes[knownEvils[e]];
        if (eVote) { evilTotal++; if (iVote === eVote) evilMatch++; }
      }
      for (var g = 0; g < knownGoods.length; g++) {
        var gVote = m.votes[knownGoods[g]];
        if (gVote) { goodTotal++; if (iVote === gVote) goodMatch++; }
      }
    }

    var totalKnown = knownEvils.length + knownGoods.length;
    var minVotes = totalRounds <= 2 ? Math.min(3, Math.floor(totalRounds * totalKnown / 2)) : 3;
    if (evilTotal >= minVotes) {
      var rate = evilMatch / evilTotal;
      if (rate > 0.75) {
        ev[i].evil_ev += 12;
        ev[i].reasons.push('投票与坏人一�? + Math.round(rate*100) + '% +12');
      }
    }
    if (goodTotal >= minVotes) {
      var rate = goodMatch / goodTotal;
      if (rate > 0.7) {
        ev[i].good_ev += 10;
        ev[i].reasons.push('投票与好人一�? + Math.round(rate*100) + '% +10');
      }
    }
  }

  // Step 7: Merlin hunting (evil perspective only)
  if (persp === 'evil' && knownEvils.length > 0 && totalRounds >= 2) {
    for (var i = 0; i < pc; i++) {
      if (i === selfIdx || ev[i].locked) continue;
      var evilInReject = 0, evilInTotal = 0;
      var noEvilReject = 0, noEvilTotal = 0;
      for (var r = 0; r < completed.length; r++) {
        var m = completed[r];
        if (!m.votes || !m.team) continue;
        var team = m.team || [];
        var hasEvil = false;
        for (var t = 0; t < team.length; t++) {
          if (knownEvils.indexOf(team[t]) !== -1) { hasEvil = true; break; }
        }
        var iVote = m.votes[i];
        if (!iVote) continue;
        if (hasEvil) {
          evilInTotal++;
          if (iVote === 'reject') evilInReject++;
        } else {
          noEvilTotal++;
          if (iVote === 'reject') noEvilReject++;
        }
      }
      if (evilInTotal >= 2) {
        var rateWhen = evilInReject / evilInTotal;
        var rateNo = noEvilTotal > 0 ? noEvilReject / noEvilTotal : 0;
        ev[i].merlin = Math.max(0, Math.min(95, (rateWhen - rateNo) * 100 + 10));
      }
    }
  }

  // Step 8: Lancelot flip awareness
  var lancelotFlipped = state.lancelotFlipped;
  if (lancelotFlipped) {
    for (var i = 0; i < pc; i++) {
      if (i === selfIdx || !ev[i] || ev[i].locked) continue;
      var label = knownIdentities[i] || '';
      if (label === '兰斯洛特' || label === '兰斯洛特(�?' || label === '兰斯洛特(�?' || label === '蓝兰斯洛�? || label === '红兰斯洛�?) {
        ev[i].good_ev = Math.floor((ev[i].good_ev - 10) * 0.5 + 10);
        ev[i].evil_ev = Math.floor((ev[i].evil_ev - 10) * 0.5 + 10);
        ev[i].reasons.push('兰斯洛特已翻转，信号减半');
      }
    }
  }

  // Step 9: Convert to scores
  var list = [];
  for (var i = 0; i < pc; i++) {
    if (i === selfIdx) continue;
    var e = ev[i];
    var score;
    if (e.locked) {
      if (persp === 'evil') {
        // Evil perspective: locked evil = 0, locked good = 0 (not Merlin target), locked Merlin = 100
        score = (e.merlin === 100) ? 100 : 0;
      } else {
        score = e.evil_ev; // 0 or 100
      }
    } else {
      if (persp === 'evil') {
        // Evil perspective: use merlin hunting score, fall back to good probability
        if (e.merlin > 0) {
          score = e.merlin;
        } else {
          var total = e.good_ev + e.evil_ev;
          score = total > 0 ? Math.round(e.good_ev / total * 100) : 50;
        }
      } else {
        var total = e.good_ev + e.evil_ev;
        score = total > 0 ? Math.round(e.evil_ev / total * 100) : 50;
      }
    }

    list.push({
      idx: i,
      score: score,
      evidence: e.reasons
    });
  }

  list.sort(function(a, b) { return b.score - a.score; });

  // Attach data quality metadata for progressive rendering
  list._dataQuality = totalRounds <= 1 ? 'low' : (totalRounds === 2 ? 'medium' : 'high');
  list._totalRounds = totalRounds;

  _tendScoreCacheKey = cacheKey;
  _tendScoreCacheValue = cloneTendScoreList(list);
  return cloneTendScoreList(list);
}


/* ------- v7 Engine Info Panel (v102: 9-step visualizer) ------- */
function renderV7EngineInfo() {
  var statusEl = document.getElementById('v7-engine-status');
  var stepsEl = document.getElementById('v7-engine-steps');
  if (!statusEl || !stepsEl) return;

  var pc = state.playerCount;
  var persp = getPerspective();
  var selfIdx = state.selfIndex;
  var missions = state.missions || [];
  var completed = [];
  for (var m = 0; m < missions.length; m++) {
    if (missions[m].result) completed.push(missions[m]);
  }
  var totalRounds = completed.length;
  var knownIdentities = state.knownIdentities || {};
  var knownCount = Object.keys(knownIdentities).length;

  // === 全局状�?===
  var perspText = persp === 'good'
    ? '<span style="color:#4caf50">好人视角</span>（找反方�?
    : (persp === 'evil' ? '<span style="color:#f44336">反方视角</span>（找梅林�? : '<span style="color:var(--text-dim)">未设�?/span>');
  var quality = totalRounds <= 1 ? '<span class="warn">低（�? + totalRounds + '轮）</span>'
              : (totalRounds === 2 ? '<span class="warn">中（2轮）</span>'
              : '<span class="ok">高（' + totalRounds + '轮）</span>');

  statusEl.innerHTML =
    '<span class="v7-stat">视角�?strong>' + perspText + '</strong></span>' +
    '<span class="v7-stat">已完成：<strong>' + totalRounds + ' / ' + (missions.length || 5) + ' �?/strong></span>' +
    '<span class="v7-stat">数据置信度：<strong>' + quality + '</strong></span>' +
    '<span class="v7-stat">已知身份锚点�?strong>' + knownCount + ' �?/strong></span>';

  // === 计算各步骤激活情�?===
  // Step 1: 已知身份锁定
  var lockedGood = 0, lockedEvil = 0;
  for (var k in knownIdentities) {
    var lab = knownIdentities[k];
    if (isGoodRole(lab) || lab === '正方' || lab === '好人') lockedGood++;
    else if (isEvilRole(lab) || lab === '反方' || lab === '坏人') lockedEvil++;
  }

  // Step 2: 声明类信息（湖中女神 / 王者之剑）
  var ladyChecks = (state.ladyLakeChecks || []).filter(function(c){ return c && c.target !== undefined && c.target !== selfIdx; });
  var exTotal = (state.excaliburHistory || []).length;
  var exUsed = (state.excaliburHistory || []).filter(function(e){ return e && e.used === true; }).length;
  var exPending = (state.excaliburHistory || []).filter(function(e){ return e && e.used === true && !e.feedbackRecorded; }).length;

  // Step 3: 任务结果硬约�?
  var failRounds = 0, succRounds = 0, dualFail = 0;
  for (var r = 0; r < completed.length; r++) {
    if (completed[r].result === 'fail') {
      failRounds++;
      if ((completed[r].team || []).length >= 5 && (completed[r].failCount || 0) >= 2) dualFail++;
    } else if (completed[r].result === 'success') succRounds++;
  }
  var recencyText = totalRounds <= 2 ? 'R1×0.95' : 'R1×0.7 / R2×0.85 / R3+×1.0';

  // Step 4: 多轮交叉分析
  var failThreshold = totalRounds <= 2 ? 1 : 2;
  var successThreshold = totalRounds <= 2 ? 2 : 3;
  var crossActive = totalRounds >= 1;

  // Step 5: 发车失败
  var leaderLF = {};
  for (var r = 0; r < completed.length; r++) {
    var lf = completed[r].launchFailures || 0;
    var ld = completed[r].leader;
    if (!ld || lf <= 0) continue;
    try {
      var li = parseInt(ld.split('�?)[0]) - 1;
      leaderLF[li] = (leaderLF[li] || 0) + lf;
    } catch(e) {}
  }
  var lfTriggered = 0;
  for (var li in leaderLF) if (leaderLF[li] >= 3) lfTriggered++;
  var lfTotal = 0;
  for (var li in leaderLF) lfTotal += leaderLF[li];

  // Step 6: 投票分析
  var voteRoundsHasData = 0;
  for (var r = 0; r < completed.length; r++) {
    if (completed[r].votes && Object.keys(completed[r].votes).length >= 2) voteRoundsHasData++;
  }
  var voteAnchorTotal = lockedGood + lockedEvil;
  var voteActive = voteRoundsHasData >= 1 && voteAnchorTotal >= 1;

  // Step 7: 梅林猎杀
  var merlinActive = persp === 'evil' && lockedEvil > 0 && totalRounds >= 2;

  // Step 8: 兰斯洛特翻转
  var lancFlipped = !!state.lancelotFlipped;
  var lancInGame = (state.activeRoles || []).some(function(r){ return r && r.indexOf('兰斯洛特') !== -1; });

  // Step 9: 始终运行
  // === 渲染 9 �?===
  function step(num, name, active, meta) {
    var cls = active ? 'active' : (totalRounds === 0 ? 'idle' : 'idle');
    return '<div class="v7-step ' + cls + '">' +
      '<div class="v7-step-num">' + num + '</div>' +
      '<div class="v7-step-body">' +
      '<div class="v7-step-name">' + name + '</div>' +
      '<div class="v7-step-meta">' + meta + '</div>' +
      '</div></div>';
  }

  var s1Meta = knownCount > 0
    ? '<span class="ok">已锁�?' + knownCount + ' �?/span>（好' + lockedGood + ' / �? + lockedEvil + '）硬锚点 0 �?100'
    : '<span>暂无标注</span>，可在下方「已知身份」标�?;

  var s2Meta = '湖中女神声明 <span class="hl">' + ladyChecks.length + '</span> 次（±20�?;
  s2Meta += '；王者之�?<span class="hl">' + exTotal + '</span> 轮，已使�?<span class="hl">' + exUsed + '</span> �?;
  if (exPending > 0) s2Meta += '�?span class="warn">待反�?' + exPending + ' �?/span>';
  s2Meta += '；声明不等于事实';

  var s3Meta;
  if (totalRounds === 0) {
    s3Meta = '等待首轮任务�? + recencyText;
  } else {
    s3Meta = '失败 <span class="hl">' + failRounds + '</span> �?/ 成功 <span class="hl">' + succRounds + '</span> �?;
    if (dualFail > 0) s3Meta += '�?span class="warn">双失�?' + dualFail + ' �?/span>';
    s3Meta += '；衰减：' + recencyText;
  }

  var s4Meta = totalRounds === 0
    ? '待数据，门槛：失败≥' + failThreshold + ' / 成功�? + successThreshold
    : '失败门槛 <span class="hl">�? + failThreshold + '</span>，成功门�?<span class="hl">�? + successThreshold + '</span>（R1-2 自适应放宽�?;

  var s5Meta = lfTotal === 0
    ? '<span>暂无发车失败</span>，触发门�?�? �?
    : (lfTriggered > 0
      ? '<span class="warn">已触�?' + lfTriggered + ' 名队�?/span>（累�?' + lfTotal + ' 次） +3'
      : '累计 <span class="hl">' + lfTotal + '</span> 次未达门�?(<3)');

  var s6Meta;
  if (!voteActive) {
    s6Meta = voteAnchorTotal === 0 ? '需先标注已知身份才能比�? : '等待投票数据';
  } else {
    s6Meta = '<span class="ok">' + voteRoundsHasData + ' 轮投�?/span>，跳过全票一致；与坏�?>75%�?12，与好人 >70%�?10';
  }

  var s7Meta;
  if (persp !== 'evil') {
    s7Meta = '�?span class="hl">反方视角</span>启用';
  } else if (lockedEvil === 0) {
    s7Meta = '需标注 �? 名已知坏�?;
  } else if (totalRounds < 2) {
    s7Meta = '需 �? 轮数�?;
  } else {
    s7Meta = '<span class="ok">运行�?/span>：条件拒绝率�?= P(拒|含坏)-P(拒|无坏)';
  }

  var s8Meta;
  if (!lancInGame) {
    s8Meta = '本局未启用兰斯洛�?;
  } else if (lancFlipped) {
    s8Meta = '<span class="warn">已翻�?/span>，兰斯洛特玩家信�?<span class="hl">×0.5</span>';
  } else {
    s8Meta = '兰斯洛特<span>未翻�?/span>，正常计�?;
  }

  var s9Meta;
  if (totalRounds === 0) {
    s9Meta = '所有未知玩家分数：50（先�?10:10�?;
  } else {
    s9Meta = '<span class="ok">分数 = 好人证据 / (好人+坏人证据) × 100</span>';
  }

  stepsEl.innerHTML =
    step(1, '已知身份锁定（硬锚点�?, knownCount > 0, s1Meta) +
    step(2, '声明类信息（湖中女神 / 王者之剑）', ladyChecks.length > 0 || exTotal > 0, s2Meta) +
    step(3, '任务结果硬约束（轮次衰减+双失败）', totalRounds > 0, s3Meta) +
    step(4, '多轮交叉分析（自适应门槛�?, crossActive && totalRounds > 0, s4Meta) +
    step(5, '发车失败分析（≥3 次）', lfTriggered > 0, s5Meta) +
    step(6, '投票行为分析（跳过全票一致）', voteActive, s6Meta) +
    step(7, '梅林猎杀（条件拒绝率差）', merlinActive, s7Meta) +
    step(8, '兰斯洛特翻转感知（信号减半）', lancInGame, s8Meta) +
    step(9, '证据累积 �?分数转换', true, s9Meta);
}


/* ------- Result rendering ------- */
function renderTendResult() {
  var persp = getPerspective();
  var titleEl = document.getElementById('tend-result-title');
  var descEl = document.getElementById('tend-result-desc');
  var listEl = document.getElementById('tend-result-list');

  if (!state.myRole) {
    titleEl.textContent = '分析结果';
    descEl.textContent = '';
    listEl.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px">请在上方「我的身份」卡片中选择你的角色</p>';
    return;
  }

  if (persp === 'good') {
    titleEl.textContent = '反方嫌疑排行';
    descEl.textContent = '分数越高，是反方的概率越大。绿�?低嫌�?黄色=中等 红色=高嫌�?;
  } else {
    titleEl.textContent = '梅林概率排行';
    descEl.textContent = '分数越高，是梅林的概率越大。绿�?低概�?黄色=中等 红色=高概�?;
  }

  var list = computeSuspectScores();

  // v7 Progressive Data Quality Badge
  var quality = list._dataQuality || 'unknown';
  var totalRounds = list._totalRounds || 0;
  var qualityLabel = '';
  var qualityColor = '';
  var qualityBg = '';
  if (quality === 'low') {
    qualityLabel = '&#9888; 数据不足（仅' + totalRounds + '轮），谨慎参�?;
    qualityColor = '#ff9800';
    qualityBg = 'rgba(255,152,0,0.1)';
  } else if (quality === 'medium') {
    qualityLabel = '&#9889; 中等置信度（' + totalRounds + '轮数据）';
    qualityColor = '#ffc107';
    qualityBg = 'rgba(255,193,7,0.1)';
  } else if (quality === 'high') {
    qualityLabel = '&#10004; 高置信度�? + totalRounds + '轮数据）';
    qualityColor = '#4caf50';
    qualityBg = 'rgba(76,175,80,0.1)';
  }
  if (qualityLabel) {
    descEl.innerHTML = '<div style="display:inline-block;font-size:11px;color:' + qualityColor + ';background:' + qualityBg + ';padding:3px 10px;border-radius:4px;border:1px solid ' + qualityColor + ';margin-left:8px;vertical-align:middle">' + qualityLabel + '</div>';
  } else {
    descEl.innerHTML = '';
  }

  if (list.length === 0) {
    listEl.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px">暂无数据</p>';
    renderEvidencePanel(list);
    return;
  }

  var h = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var cls = 'suspect';
    if (item.score < 40) cls = 'trust';
    else if (item.score < 65) cls = 'neutral';

    var label = getKnownLabel(item.idx);
    var labeled = label ? ' <span style="font-size:11px;color:var(--accent);background:rgba(201,168,76,0.15);padding:1px 6px;border-radius:3px">' + escapeHtml(label) + '</span>' : '';

    h += '<div class="tend-result-item">';
    h += '<span class="tend-result-name">' + escapeHtml(state.playerNames[item.idx]) + labeled + '</span>';
    h += '<div class="tend-bar-wrap">';
    h += '<div class="tend-bar-fill ' + cls + '" style="width:' + item.score + '%"></div>';
    h += '</div>';
    h += '<span class="tend-score ' + cls + '">' + item.score + '</span>';
    h += '<button class="btn tiny" onclick="toggleEvidence(' + item.idx + ')" style="font-size:11px;margin-left:8px;min-width:24px">�?/button>';
    h += '</div>';
    h += '<div id="ev-' + item.idx + '" class="evidence-panel" style="display:none">';
    if (item.evidence.length === 0) {
      h += '<p style="font-size:11px;color:var(--text-dim);padding:4px 20px">暂无具体证据</p>';
    } else {
      for (var e = 0; e < item.evidence.length; e++) {
        h += '<p style="font-size:11px;color:var(--text-dim);margin:0;padding:2px 20px">�?' + escapeHtml(item.evidence[e]) + '</p>';
      }
    }
    h += '</div>';
  }

  listEl.innerHTML = h;
  renderEvidencePanel(list);
}

function renderEvidencePanel(list) {
  var panel = document.getElementById('tend-evidence-list');
  if (!panel) return;

  var allEvidence = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].evidence.length > 0) {
      allEvidence.push({
        player: state.playerNames[list[i].idx],
        idx: list[i].idx,
        score: list[i].score,
        evidence: list[i].evidence
      });
    }
  }

  if (allEvidence.length === 0) {
    panel.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:12px">随游戏推进，关键证据将在此汇�?/p>';
    return;
  }

  var h = '';
  for (var i = 0; i < allEvidence.length; i++) {
    var e = allEvidence[i];
    h += '<div class="evidence-item">';
    h += '<strong style="color:var(--text-bright)">' + escapeHtml(e.player) + '（分数：' + e.score + '�?/strong>';
    h += '<ul style="margin:4px 0 0 16px;padding:0">';
    for (var j = 0; j < e.evidence.length; j++) {
      h += '<li style="font-size:12px;color:var(--text-dim)">' + escapeHtml(e.evidence[j]) + '</li>';
    }
    h += '</ul></div>';
  }
  panel.innerHTML = h;
}

function toggleEvidence(idx) {
  var el = document.getElementById('ev-' + idx);
  if (!el) return;
  el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

