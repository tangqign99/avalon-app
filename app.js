/* ==================== DATA ==================== */
var MISSION_COUNTS = {5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]};
var DEFAULT_NAME_POOL = ['振宁','鹭文','小小','菜头','阿弟','齐齐','延平','小吴','涛','小黄','浩文','宝强','小洪'];
var ALL_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(蓝)','兰斯洛特(红)'];
var UNIQUE_ROLES = ['梅林','派西维尔','莫甘娜','刺客','莫德雷德','奥伯伦','兰斯洛特(蓝)','兰斯洛特(红)'];
var MULTI_ROLES = ['忠臣','爪牙'];
var GOOD_ROLES = ['梅林','派西维尔','忠臣','兰斯洛特(蓝)'];
var EVIL_ROLES = ['莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(红)'];
var DEFAULT_ACTIVE_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德'];

/* ==================== SUPABASE ==================== */
var SUPABASE_URL = 'https://nzbpopxrxniixnhnqktw.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YnBvcHhyeG5paXhuaG5xa3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODQ2MzQsImV4cCI6MjA5NzQ2MDYzNH0.wLk-FdQlKha8YObTvgINW2M_9QVSpJk8c91bKJeQO7Q';
var _supabase = null;
var _supabaseConnected = false;
var _supabaseChannel = null;
function getSupabase() {
  if (!_supabase && typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

var namePool = DEFAULT_NAME_POOL.slice();

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
  _visitorPage: 0,
  _visitorPageSize: 5,
  _assassinTimerRemaining: 0,
  _assassinTimerInterval: null,
  ladyOfLakeEnabled: false,
  ladyLakeHolder: -1,
  ladyLakeChecks: [],
  timerMode: 'per',
  timerSeconds: 60,
  timerInterval: null,
  timerRemaining: 0,
  lancelotFlipped: false,
  _lancelotAsked: false,
  lancelotDeck: null,
  lancelotDrawResults: [],
  roundTendencies: [],
  identityMarks: [],
  ladyCheckHistory: []
};

function initState(n) {
  n = n || 7;
  state.playerCount = n;
  state.playerNames = [];
  for (var i = 0; i < n; i++) state.playerNames[i] = '玩家' + (i + 1);
  state.selfIndex = -1;
  state.myRole = null;
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德'] : DEFAULT_ACTIVE_ROLES.slice();
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
  state._lancelotAsked = false;
  state.lancelotDeck = null;
  state.lancelotDrawResults = [];
  state._historyPage = 0;
  state._visitorPage = 0;
  state._assassinTimerRemaining = 0;
  state._assassinTimerInterval = null;
  state.ladyOfLakeEnabled = false;
  state.ladyLakeHolder = -1;
  state.ladyLakeChecks = [];
  state.ladyCheckHistory = [];
  state.timerMode = 'per';
  state.timerSeconds = 60;
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

/* ==================== MULTIPLAYER STATE ==================== */
var _isHost = false;
var _isViewer = false;
var _deviceId = null;
var _gameSessionId = null;
var _gameSessionChannel = null;
var _gameSessionPollInterval = null;

/* ==================== PLAYER LABEL ==================== */
function playerLabel(idx) {
  return (idx + 1) + '号 ' + state.playerNames[idx];
}

/* ==================== STORAGE ==================== */
function loadNamePool() {
  try { var d = localStorage.getItem('avalon_name_pool'); if (d) namePool = JSON.parse(d); } catch(e) {}
}
function saveNamePool() {
  localStorage.setItem('avalon_name_pool', JSON.stringify(namePool));
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('avalon_history_v2') || '[]'); } catch(e) { return []; }
}
function saveHistory(data) {
  localStorage.setItem('avalon_history_v2', JSON.stringify(data));
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

/* ==================== VISITOR LOG ==================== */
function getDeviceType() {
  var ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function generateDeviceId() {
  if (_deviceId) return _deviceId;
  var stored = localStorage.getItem('avalon_device_id');
  if (stored) { _deviceId = stored; return stored; }
  _deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('avalon_device_id', _deviceId);
  return _deviceId;
}

function isIPad() {
  return /iPad/.test(navigator.userAgent);
}

function loadVisitors() {
  try { return JSON.parse(localStorage.getItem('avalon_visitors') || '[]'); } catch(e) { return []; }
}

function saveVisitors(data) {
  localStorage.setItem('avalon_visitors', JSON.stringify(data));
}

function recordVisitor() {
  var visitors = loadVisitors();
  var now = new Date();
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  var timeStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  var device = getDeviceType();
  visitors.push({ time: timeStr, device: device });
  if (visitors.length > 500) visitors = visitors.slice(-500);
  saveVisitors(visitors);

  // 同步推送到 Supabase
  var sb = getSupabase();
  if (sb) {
    sb.from('visitors').insert([{ visit_time: timeStr, device: device }]).then(function(r) {
      if (r.error) console.warn('Supabase visitor insert:', r.error.message);
    });
  }
}

function renderVisitorLog() {
  // 先从 localStorage 快速渲染，然后合并 Supabase 数据
  var localVisitors = loadVisitors().slice().reverse();
  renderVisitorList(localVisitors);

  var sb = getSupabase();
  if (sb) {
    sb.from('visitors').select('*').order('created_at', { ascending: false }).limit(200).then(function(r) {
      if (r.error) return;
      // 合并去重
      var merged = {};
      for (var i = 0; i < localVisitors.length; i++) {
        var key = localVisitors[i].time + '|' + localVisitors[i].device;
        merged[key] = true;
      }
      var remoteVisitors = [];
      for (var j = 0; j < r.data.length; j++) {
        var v = r.data[j];
        var vkey = v.visit_time + '|' + v.device;
        if (!merged[vkey]) {
          remoteVisitors.push({ time: v.visit_time, device: v.device });
        }
      }
      var all = remoteVisitors.concat(localVisitors);
      all.sort(function(a, b) { return b.time.localeCompare(a.time); });
      renderVisitorList(all);
    });
  }
}

function renderVisitorList(visitors) {
  var ps = state._visitorPageSize;
  var totalPages = Math.ceil(visitors.length / ps);
  if (state._visitorPage >= totalPages && totalPages > 0) state._visitorPage = totalPages - 1;
  if (state._visitorPage < 0) state._visitorPage = 0;
  var start = state._visitorPage * ps;
  var pageItems = visitors.slice(start, start + ps);

  var h = '';
  for (var i = 0; i < pageItems.length; i++) {
    var v = pageItems[i];
    h += '<div class="visitor-item">';
    h += '<span class="v-time">' + v.time + '</span>';
    h += '<span class="v-device">' + v.device + '</span>';
    h += '</div>';
  }
  if (pageItems.length === 0) {
    h = '<div style="text-align:center;padding:16px;color:var(--text-dim)">暂无访客记录</div>';
  }
  var listEl = document.getElementById('visitor-list');
  if (listEl) listEl.innerHTML = h;

  // pagination
  var pageArea = document.getElementById('visitor-pagination-area');
  if (pageArea) {
    if (totalPages <= 1) {
      pageArea.innerHTML = '';
    } else {
      var ph = '<div class="visitor-pagination">';
      ph += '<button class="page-btn" onclick="goVisitorPage(' + (state._visitorPage - 1) + ')"' + (state._visitorPage === 0 ? ' disabled' : '') + '>‹</button>';
      var pageButtons = [];
      if (totalPages <= 7) {
        for (var p = 0; p < totalPages; p++) pageButtons.push(p);
      } else {
        pageButtons.push(0);
        if (state._visitorPage > 3) pageButtons.push('...');
        var pStart = Math.max(1, state._visitorPage - 1);
        var pEnd = Math.min(totalPages - 2, state._visitorPage + 1);
        for (var p = pStart; p <= pEnd; p++) pageButtons.push(p);
        if (state._visitorPage < totalPages - 4) pageButtons.push('...');
        pageButtons.push(totalPages - 1);
      }
      for (var k = 0; k < pageButtons.length; k++) {
        var bp = pageButtons[k];
        if (bp === '...') {
          ph += '<span class="page-ellipsis">…</span>';
        } else {
          ph += '<button class="page-btn' + (bp === state._visitorPage ? ' active' : '') + '" onclick="goVisitorPage(' + bp + ')">' + (bp + 1) + '</button>';
        }
      }
      ph += '<button class="page-btn" onclick="goVisitorPage(' + (state._visitorPage + 1) + ')"' + (state._visitorPage >= totalPages - 1 ? ' disabled' : '') + '>›</button>';
      ph += '<span style="color:var(--text-dim);font-size:13px;margin-left:8px">第' + (state._visitorPage + 1) + '/' + totalPages + '页</span>';
      ph += '</div>';
      pageArea.innerHTML = ph;
    }
  }
}

function goVisitorPage(p) {
  var visitors = loadVisitors();
  var totalPages = Math.ceil(visitors.length / state._visitorPageSize);
  if (p < 0 || p >= totalPages) return;
  state._visitorPage = p;
  renderVisitorLog();
}

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
  state._currentPage = page;
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  setActiveNav(page);
  // 多人模式：游戏页根据host/viewer状态处理
  if (page === 'game') {
    updateMultiplayerStatusBar();
    renderGame();
    if (_isViewer) applyViewerMode();
  }
  if (page === 'setup') { renderSetup(); renderVisitorLog(); }
  if (page === 'tend') { renderTendencyFull(); renderIdentityPrediction(); renderMerlinPredictTend(); renderIdentitySimGrid(); renderDeduction(); }
  if (page === 'end') renderEnd();
  if (page === 'stats') { state._historyPage = 0; renderStats(); }
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
    for (var j = 0; j < namePool.length; j++) {
      var nm = namePool[j];
      if (takenNames[nm] && nm !== curName) continue;
      h += '<option value="' + nm + '"' + (nm === curName ? ' selected' : '') + '>' + nm + '</option>';
    }
    if (namePool.indexOf(curName) === -1) {
      h += '<option value="' + curName + '" selected>' + curName + '</option>';
    }
    h += '</select>';
    h += '<button class="btn small" onclick="addNameFromSetup()" title="新增玩家" style="min-width:36px;font-size:18px;padding:6px 8px">+</button>';
    h += '</div>';
  }
  $('player-names').innerHTML = h;

  h = '<div class="role-horizontal">';
  h += '<div class="role-group good-group">';
  h += '<span class="faction-label good">好人方</span>';
  for (var i = 0; i < GOOD_ROLES.length; i++) {
    var r = GOOD_ROLES[i];
    var checked = state.activeRoles.indexOf(r) !== -1;
    h += '<label class="' + (checked ? 'checked' : '') + '" onclick="toggleRole(\'' + r + '\')">' + r + '</label>';
  }
  h += '</div>';
  h += '<div class="role-group evil-group">';
  h += '<span class="faction-label evil">反方</span>';
  for (var i = 0; i < EVIL_ROLES.length; i++) {
    var r = EVIL_ROLES[i];
    var checked = state.activeRoles.indexOf(r) !== -1;
    h += '<label class="' + (checked ? 'checked' : '') + '" onclick="toggleRole(\'' + r + '\')">' + r + '</label>';
  }
  h += '</div></div>';
  $('role-checkbox-grid').innerHTML = h;

  var mc = MISSION_COUNTS[state.playerCount];
  $('mission-info').textContent = mc ? mc.join('-') : '请先选择人数';
  // Sync lady toggle button UI
  var ladyRow = document.getElementById('lady-check-row');
  if (ladyRow) {
    if (state.ladyOfLakeEnabled) { ladyRow.classList.add('checked'); }
    else { ladyRow.classList.remove('checked'); }
  }
}

function setPlayerCount(n) {
  var oldNames = state.playerNames;
  var oldSelf = state.selfIndex;
  state.playerCount = n;
  state.activeRoles = (n === 10) ? ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德'] : DEFAULT_ACTIVE_ROLES.slice();
  state.playerNames = [];
  for (var i = 0; i < n; i++) {
    state.playerNames[i] = (oldNames[i] && oldNames[i].indexOf('玩家') !== 0) ? oldNames[i] : ('玩家' + (i + 1));
  }
  state.selfIndex = oldSelf < n ? oldSelf : -1;
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

function addNameToPool() {
  var input = $('add-name-input');
  var name = input.value.trim();
  if (_addNameCore(name)) input.value = '';
}

function addNameFromSetup() {
  var name = prompt('输入新玩家姓名（不超过10个字符）：');
  if (!name) return;
  name = name.trim();
  if (name.length > 10) { toast('名字不能超过10个字符', 'warn'); return; }
  _addNameCore(name);
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

function setTimerMode(mode) {
  state.timerMode = mode;
  var optRow = document.getElementById('timer-options');
  optRow.style.display = (mode === 'per') ? 'flex' : 'none';
  ['off','all','per'].forEach(function(m) {
    var btn = document.getElementById('timer-mode-' + m);
    if (btn) btn.className = 'timer-mode-btn' + (m === mode ? ' selected' : '');
  });
}

function setTimerSecondsInput() {
  var input = document.getElementById('timer-seconds-input');
  if (!input) return;
  var val = parseInt(input.value);
  if (isNaN(val) || val < 10) { val = 10; input.value = 10; }
  if (val > 300) { val = 300; input.value = 300; }
  state.timerSeconds = val;
  [45,60,75,90].forEach(function(s) {
    var btn = document.getElementById('timer-opt-' + s);
    if (btn) btn.className = 'timer-opt-btn';
  });
}

function setTimerSeconds(sec) {
  state.timerSeconds = sec;
  var input = document.getElementById('timer-seconds-input');
  if (input) input.value = sec;
  [45,60,75,90].forEach(function(s) {
    var btn = document.getElementById('timer-opt-' + s);
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
  // 多人模式：先检查Supabase是否有活跃房间
  var sb = getSupabase();
  if (sb) {
    initGameSession(sb, function(role) {
      if (role === 'host') {
        showIdentityModal();
      }
      // viewer: initGameSession 内部已设置_isViewer=true并订阅，直接切到游戏页
    });
  } else {
    // Supabase不可用，回退单机模式
    showIdentityModal();
  }
}

function showIdentityModal() {
  var h = '<h2>我的身份是？</h2>';
  h += '<p class="sub">选定后将用于倾向值分析（权重翻倍），仅自己可见</p>';
  h += '<div class="identity-role-grid">';
  for (var j = 0; j < ALL_ROLES.length; j++) {
    var r = ALL_ROLES[j];
    h += '<button class="identity-role-btn" onclick="setMyRole(\'' + r + '\')">' + r + '</button>';
  }
  h += '</div>';
  h += '<div style="margin-top:12px"><button class="btn" onclick="skipIdentity()" style="color:var(--text-dim);font-size:13px">跳过，不记录自己身份</button></div>';
  $('identity-card').innerHTML = h;
  $('identity-overlay').classList.add('active');
}

function setMyRole(role) {
  state.myRole = role;
  $('identity-overlay').classList.remove('active');
  doStartGame();
}

function skipIdentity() {
  state.myRole = null;
  $('identity-overlay').classList.remove('active');
  doStartGame();
}

function doStartGame() {
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
  state._lancelotAsked = false;
  state.lancelotFlipCount = 0;
  state.lancelotRoundFlips = [false, false, false, false, false];
  state.lancelotDrawResults = [false]; // index 0 = round 0, no draw before game starts
  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || state.activeRoles.indexOf('兰斯洛特(红)') !== -1;
  state.lancelotDeck = hasLancelot ? shuffleLancelotDeck() : null;
  state.autoRoles = null;
  state.ladyLakeChecks = [];
  state.ladyCheckHistory = [];
  state.ladyLakeHolder = -1;
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
  syncGameState();
  var msg = '游戏开始！共 ' + state.playerCount + ' 名玩家，5 轮任务';
  if (state.myRole) msg += '（你的身份：' + state.myRole + '）';
  toast(msg);
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

  var h = '';
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
  syncGameState();
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
  h += '<span class="step-label">第' + (state.currentRound + 1) + '轮 · 需要 ' + reqSize + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">' + (m.result ? (m.result === 'success' ? '已完成 ✓' : '已失败 ✕') : '进行中');
  if (m.launchFailures > 0) h += ' · 发车失败 ' + m.launchFailures + ' 次';
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
    h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + leaderName + '</span>';
    var pendingTeamHTML = m.team.map(function(i) {
      return '<span style="display:inline-block;padding:3px 10px;margin:2px 3px;border:2px solid var(--gold);border-radius:20px;background:rgba(201,168,76,0.1);color:var(--gold-light);font-size:13px;font-weight:600;box-shadow:0 0 6px rgba(201,168,76,0.2)">' + playerLabel(i) + '</span>';
    }).join('');
    h += '<div style="margin-top:6px">' + pendingTeamHTML + '</div></div>';
    h += '<div style="text-align:center;padding:20px;border:2px solid var(--gold);border-radius:var(--radius);background:var(--bg-card);margin:12px 0">';
    h += '<div style="font-size:18px;color:var(--gold-light);margin-bottom:8px">发言进行中</div>';
    h += '<div style="font-size:13px;color:var(--text-dim)">队长已确认队伍，请按顺序发言。计时结束后将进入投票阶段。</div>';
    h += '</div>';

    // 湖中女神内联验人（第3轮起，发言环节中可用）
    if (state.ladyOfLakeEnabled && state.currentRound >= 2) {
      h += buildLadySpeechSection();
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
    h += '<span style="color:var(--text-dim);margin-left:10px">已选 ' + m.team.length + '/' + reqSize + ' 人</span></div>';

    h += '<div style="margin-bottom:10px"><div class="step-label">步骤B：选择队伍成员</div>';
    var splitAt = Math.ceil(pc / 2);
    for (var row = 0; row < 2; row++) {
      h += '<div class="btn-row" style="margin-bottom:' + (row === 0 ? '12px' : '0') + ';gap:12px">';
      for (var i = row * splitAt; i < Math.min((row + 1) * splitAt, pc); i++) {
        var inTeam = m.team.indexOf(i) !== -1;
        var cls = 'btn team-member-btn';
        if (inTeam) cls += ' selected team-member-highlight';
        h += '<button class="' + cls + '" onclick="toggleTeamMember(' + i + ')">';
        h += playerLabel(i) + (i === m.leader ? ' ♔' : '');
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
    h += '<div class="step-label">步骤C：全员投票 <span style="font-size:11px;color:var(--text-dim);font-weight:400">（默认反对，点击切换赞成）</span></div>';
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

function renderTendencyFull() {
  var el = $('tendency-full');
  var probs = computeMerlinProbability();
  var h = '';
  for (var i = 0; i < state.playerCount; i++) {
    h += renderTendencyItem(i, state.tendencies[i] || 50, probs[i]);
  }
  el.innerHTML = h || '<p style="color:var(--text-dim)">暂无数据，请先开始游戏</p>';
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
  var history = loadHistory();
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

function renderMerlinPredictMini() {
  var el = $('merlin-predict-mini');
  if (!el) return;
  var probs = computeMerlinProbability();
  var pc = state.playerCount;

  // Sort by probability descending
  var sorted = [];
  for (var i = 0; i < pc; i++) {
    sorted.push({ idx: i, prob: probs[i] });
  }
  sorted.sort(function(a, b) { return b.prob - a.prob; });

  var h = '';
  for (var k = 0; k < sorted.length; k++) {
    var p = sorted[k];
    h += '<div class="merlin-bar-row">';
    h += '<span class="m-name">' + playerLabel(p.idx) + '</span>';
    h += '<div class="m-bar-wrap"><div class="m-bar-fill" style="width:' + p.prob + '%"></div></div>';
    h += '<span class="m-pct">' + p.prob + '%</span>';
    h += '</div>';
  }
  el.innerHTML = h || '<p style="color:var(--text-dim);font-size:12px">暂无数据</p>';
}

function renderMerlinPredictTend() {
  var el = $('merlin-predict-tend');
  if (!el) return;
  var probs = computeMerlinProbability();
  var pc = state.playerCount;

  var sorted = [];
  for (var i = 0; i < pc; i++) {
    sorted.push({ idx: i, prob: probs[i] });
  }
  sorted.sort(function(a, b) { return b.prob - a.prob; });

  var h = '';
  for (var k = 0; k < sorted.length; k++) {
    var p = sorted[k];
    h += '<div class="merlin-bar-row">';
    h += '<span class="m-name">' + playerLabel(p.idx) + '</span>';
    h += '<div class="m-bar-wrap"><div class="m-bar-fill" style="width:' + p.prob + '%"></div></div>';
    h += '<span class="m-pct">' + p.prob + '%</span>';
    h += '</div>';
  }
  el.innerHTML = h || '<p style="color:var(--text-dim);font-size:12px">暂无数据</p>';
}

/* ==================== IDENTITY SIMULATION ==================== */
var SIM_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德','兰斯洛特(红)','兰斯洛特(蓝)','奥伯伦'];

function renderIdentitySimGrid() {
  var el = $('identity-sim-grid');
  if (!el) return;
  var pc = state.playerCount;
  var h = '';
  for (var i = 0; i < pc; i++) {
    h += '<div class="identity-sim-row">';
    h += '<span class="sim-name"><span class="sim-idx">' + (i + 1) + '号</span>' + playerLabel(i) + '</span>';
    h += '<select id="sim-role-' + i + '">';
    h += '<option value="">未指定</option>';
    for (var j = 0; j < SIM_ROLES.length; j++) {
      h += '<option value="' + SIM_ROLES[j] + '">' + SIM_ROLES[j] + '</option>';
    }
    h += '</select>';
    h += '</div>';
  }
  el.innerHTML = h;
}

function getSimRole(i) {
  var sel = document.getElementById('sim-role-' + i);
  return sel ? sel.value : '';
}

function runIdentitySimulation() {
  var el = $('identity-sim-result');
  if (!el) return;
  var pc = state.playerCount;
  var assigned = {};
  for (var i = 0; i < pc; i++) {
    var r = getSimRole(i);
    if (r) assigned[i] = r;
  }

  if (Object.keys(assigned).length < 2) {
    el.innerHTML = '<div class="sim-contradiction info">请至少为 2 名玩家指定身份后再校验</div>';
    return;
  }

  var contradictions = [];

  // Build maps for quick lookup
  var roleMap = {}; // idx -> role
  var factionMap = {}; // idx -> 'good'/'evil'
  for (var i = 0; i < pc; i++) {
    roleMap[i] = assigned[i];
    factionMap[i] = EVIL_ROLES.indexOf(assigned[i]) !== -1 ? 'evil' : 'good';
  }

  // Rule 1: Task fail => team must have at least one evil
  for (var r = 0; r < state.missions.length; r++) {
    var m = state.missions[r];
    if (!m || !m.result || m.result !== 'fail') continue;
    if (!m.team || m.team.length === 0) continue;
    var hasEvil = false;
    for (var t = 0; t < m.team.length; t++) {
      if (factionMap[m.team[t]] === 'evil') { hasEvil = true; break; }
    }
    if (!hasEvil) {
      contradictions.push('第' + (r + 1) + '轮任务失败，但假设中队伍[' + m.team.map(function(i) { return playerLabel(i); }).join('、') + ']里没有反方角色');
    }
  }

  // Rule 2: Task success - if all team members are good, but team has known evil (less likely contradiction)
  // Rule 3: Merlin & Morgana: both know evil, shouldn't both approve a fail mission
  var merlinIdx = -1, morganaIdx = -1;
  for (var i = 0; i < pc; i++) {
    if (assigned[i] === '梅林') merlinIdx = i;
    if (assigned[i] === '莫甘娜') morganaIdx = i;
  }

  if (merlinIdx !== -1 && morganaIdx !== -1) {
    for (var r = 0; r < state.missions.length; r++) {
      var m = state.missions[r];
      if (!m || !m.result || !m.launchAttempts) continue;
      for (var a = 0; a < m.launchAttempts.length; a++) {
        var att = m.launchAttempts[a];
        if (!att.votes) continue;
        var mVote = att.votes[merlinIdx];
        var mgVote = att.votes[morganaIdx];
        // If mission failed and both Merlin and Morgana voted approve, both are complicit
        // Not necessarily a contradiction since Morgana may approve to blend in
        // But if mission was a FAIL and the team is all good (from merlin's POV), merlin shouldn't approve
        if (m.result === 'fail' && mVote === 'approve' && mgVote === 'approve') {
          // Check if merlin knew there was evil in the team
          if (m.team && m.team.length > 0) {
            var teamEvil = false;
            for (var t = 0; t < m.team.length; t++) {
              if (factionMap[m.team[t]] === 'evil' && assigned[m.team[t]] !== '莫德雷德') { teamEvil = true; break; }
            }
            if (teamEvil && merlinIdx !== -1) {
              contradictions.push('第' + (r + 1) + '轮任务失败，梅林(' + playerLabel(merlinIdx) + ')和莫甘娜(' + playerLabel(morganaIdx) + ')都投了赞成，但梅林已知队伍中有非莫德雷德的反方');
            }
          }
        }
      }
    }
  }

  // Rule 4: Assassin & Mordred don't know each other, votes should not be 100% identical
  var assassinIdx = -1, mordredIdx = -1;
  for (var i = 0; i < pc; i++) {
    if (assigned[i] === '刺客') assassinIdx = i;
    if (assigned[i] === '莫德雷德') mordredIdx = i;
  }
  if (assassinIdx !== -1 && mordredIdx !== -1 && state.missions.length > 0) {
    var totalVotes = 0, sameVotes = 0;
    for (var r = 0; r < state.missions.length; r++) {
      var m = state.missions[r];
      if (!m || !m.launchAttempts) continue;
      for (var a = 0; a < m.launchAttempts.length; a++) {
        var att = m.launchAttempts[a];
        if (!att.votes) continue;
        if (att.votes[assassinIdx] && att.votes[mordredIdx]) {
          totalVotes++;
          if (att.votes[assassinIdx] === att.votes[mordredIdx]) sameVotes++;
        }
      }
    }
    if (totalVotes > 3 && sameVotes === totalVotes) {
      contradictions.push('刺客(' + playerLabel(assassinIdx) + ')和莫德雷德(' + playerLabel(mordredIdx) + ')在所有' + totalVotes + '次投票中完全一致，但互不知身份，可疑');
    }
  }

  // Rule 5: Lancelot flip - after flip, their faction changes
  var lancelotBlueIdx = -1, lancelotRedIdx = -1;
  for (var i = 0; i < pc; i++) {
    if (assigned[i] === '兰斯洛特(蓝)') lancelotBlueIdx = i;
    if (assigned[i] === '兰斯洛特(红)') lancelotRedIdx = i;
  }

  // Simple check: if both Lancelots exist and there are more than 3 missions, 
  // their voting pattern might indicate a flip point
  if (lancelotBlueIdx !== -1 && lancelotRedIdx !== -1 && state.lancelotFlipped !== undefined) {
    // Check if flipped lancelot's votes changed dramatically
    if (state.lancelotFlipped) {
      var blueVotes = [], redVotes = [];
      for (var r = 0; r < state.missions.length; r++) {
        var m = state.missions[r];
        if (!m || !m.launchAttempts || m.launchAttempts.length === 0) continue;
        var att = m.launchAttempts[m.launchAttempts.length - 1];
        if (!att.votes) continue;
        blueVotes.push({ round: r, vote: att.votes[lancelotBlueIdx] || '?' });
        redVotes.push({ round: r, vote: att.votes[lancelotRedIdx] || '?' });
      }
      // Simple check: if blue lancelot (now evil after flip) starts rejecting missions that succeed
      // This is a nuanced check; we'll flag if pattern seems off
      if (blueVotes.length >= 2 && redVotes.length >= 2) {
        var lastBlue = blueVotes[blueVotes.length - 1].vote;
        var lastRed = redVotes[redVotes.length - 1].vote;
        // After flip, blue becomes evil (should tend to reject or at least not always approve)
        // Red becomes good (should tend to approve good missions)
        // This is suggestive, not definitive, so we note it
      }
    }
  }

  if (contradictions.length === 0) {
    el.innerHTML = '<div class="sim-ok">当前假设与所有线索兼容，无矛盾</div>';
  } else {
    var h = '<div style="font-weight:700;color:var(--red-bright);margin-bottom:8px;font-size:14px">发现 ' + contradictions.length + ' 个矛盾：</div>';
    for (var c = 0; c < contradictions.length; c++) {
      h += '<div class="sim-contradiction danger">' + contradictions[c] + '</div>';
    }
    el.innerHTML = h;
  }
}

/* ==================== LADY OF THE LAKE ==================== */
function renderLadyLakeResults() {
  // 湖中验人记录已合并至女神系谱栏，此处仅保留容器清理
  var el = $('lady-lake-results');
  if (el) el.innerHTML = '';
}

function renderLadyLakeEntry() {
  var el = $('lady-lake-entry');
  if (!el) return;
  if (state.ladyOfLakeEnabled) {
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
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
      h += ' <span style="font-weight:700;font-size:15px;color:' + (rec.result === 'good' ? '#99bbff' : '#ff9999') + '">' + (rec.result === 'good' ? '好人' : '反方') + '</span>';
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

function showLadyCheck() {
  if (!state.ladyOfLakeEnabled) return;
  var pc = state.playerCount;
  var h = '<h2>湖中女神验人</h2>';
  h += '<p class="sub" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">选择一名其他玩家查验阵营（好人方/反方）</p>';
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
  h += '<p style="font-size:15px;margin-bottom:10px">查验目标：<strong style="color:var(--gold-light)">' + playerLabel(targetIdx) + '</strong></p>';
  h += '<p style="font-size:14px;margin-bottom:14px">该玩家的阵营是？</p>';
  h += '<div class="winner-toggle">';
  h += '<button class="winner-btn good" onclick="recordLadyCheck(' + targetIdx + ',\'good\')">&#128737; 好人方</button>';
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
}

/* 湖中女神发言环节内联验人界面 */
var _ladySpeechSelected = null; // 发言环节中选中的查验目标

function buildLadySpeechSection() {
  var pc = state.playerCount;
  var round = state.currentRound;
  
  // 检查本轮是否已经验过人
  var thisRoundCheck = null;
  for (var i = state.ladyLakeChecks.length - 1; i >= 0; i--) {
    if (state.ladyLakeChecks[i].round === round) {
      thisRoundCheck = state.ladyLakeChecks[i];
      break;
    }
  }

  var h = '<div class="lady-speech-section">';
  h += '<h3>湖中女神验人</h3>';

  if (thisRoundCheck) {
    // 已查验完毕，显示结果（不可撤销）
    var cls = thisRoundCheck.result === 'good' ? 'good-done' : thisRoundCheck.result === 'evil' ? 'evil-done' : 'uncertain-done';
    var label = thisRoundCheck.result === 'good' ? '好人' : thisRoundCheck.result === 'evil' ? '坏人' : '不报';
    h += '<p class="lady-speech-hint">本轮查验已完成</p>';
    h += '<div class="lady-speech-done ' + cls + '">';
    var holderName = playerLabel(thisRoundCheck.holder !== undefined ? thisRoundCheck.holder : state.ladyLakeHolder);
    h += holderName + '验' + playerLabel(thisRoundCheck.target) + ' → ' + label;
    h += '</div>';
  } else {
    // 还未查验，显示选择界面
    h += '<p class="lady-speech-hint">查验一名其他玩家的阵营（主持人操作，结果在发言环节公布）</p>';

    if (_ladySpeechSelected === null) {
      // 步骤1：选择查验目标
      for (var i = 0; i < pc; i++) {
        h += '<div class="lady-speech-target-btn" onclick="selectLadySpeechTarget(' + i + ')">' + playerLabel(i) + '</div>';
      }
    } else {
      // 步骤2：选择查验结果
      var target = _ladySpeechSelected;
      h += '<p style="font-size:14px;color:var(--gold-light);margin-bottom:8px;text-align:center">查验目标：<strong>' + playerLabel(target) + '</strong></p>';
      h += '<div class="lady-speech-result-row">';
      h += '<button class="lady-speech-result-btn good-btn" onclick="doLadyCheckInline(\'good\')">好人方</button>';
      h += '<button class="lady-speech-result-btn evil-btn" onclick="doLadyCheckInline(\'evil\')">反方</button>';
      h += '<button class="lady-speech-result-btn uncertain-btn" onclick="doLadyCheckInline(\'uncertain\')">不确定</button>';
      h += '</div>';
      h += '<div style="text-align:center;margin-top:8px">';
      h += '<button class="btn small" onclick="_ladySpeechSelected=null;renderStepPanel()">重新选择</button>';
      h += '</div>';
    }
  }

  h += '</div>';
  return h;
}

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

function renderIdentityPrediction() {
  renderPredictPlayerDropdowns();
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

function renderDeduction() {
  var pc = state.playerCount;
  var si = state.selfIndex;
  var grid = $('deduction-grid');
  var merlinCard = $('deduction-merlin');
  var merlinList = $('deduction-merlin-list');

  if (!grid) return;

  // Check if there's any game data to work with
  var hasData = false;
  for (var i = 0; i < state.missions.length; i++) {
    var m = state.missions[i];
    if (m && m.team && m.team.length > 0) { hasData = true; break; }
  }

  if (!hasData) {
    grid.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px">正在进行中或尚无对局数据</p>';
    if (merlinCard) merlinCard.style.display = 'none';
    return;
  }

  // Compute good/evil probability for each player
  var goodProbs = [];
  var merlinProbs = [];
  for (var i = 0; i < pc; i++) {
    // Good/evil: blend tendency with Bayesian prior from role counts
    var tendency = state.tendencies[i] || 50;
    var prior = computePriorGoodProb(i, pc, si, state.myRole, state.activeRoles);
    var pred = state.playerPredictions[i] || '';
    var goodScore = Math.round(tendency * 0.5 + prior * 0.5);

    // Adjust from prediction marks
    if (pred === '正方') goodScore = Math.min(100, goodScore + 15);
    else if (pred === '反方') goodScore = Math.max(0, goodScore - 15);
    else if (pred === '梅林' || pred === '派西维尔') goodScore = Math.min(100, goodScore + 20);
    else if (pred === '莫甘娜' || pred === '刺客' || pred === '莫德雷德' || pred === '奥伯伦') goodScore = Math.max(0, goodScore - 20);

    // Vote analysis
    var goodVotes = 0, badVotes = 0;
    for (var r = 0; r < state.missions.length; r++) {
      var m = state.missions[r];
      if (!m || !m.result || !m.launchAttempts) continue;
      for (var a = 0; a < m.launchAttempts.length; a++) {
        var att = m.launchAttempts[a];
        var vote = att.votes[i];
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
      var voteAlign = Math.round(goodVotes / totalVotes * 100);
      goodScore = Math.round(goodScore * 0.4 + voteAlign * 0.6);
    }

    goodScore = Math.max(5, Math.min(95, goodScore));
    goodProbs.push(goodScore);

    // Merlin probability: based on vote alignment with known good outcomes + tendency
    var merlinScore = goodScore; // Base: higher good score = more likely merlin
    // Bonus for consistently voting approve on success missions
    if (totalVotes > 0 && goodVotes / totalVotes > 0.7) merlinScore += 10;
    // Bonus for high tendency
    if (tendency > 70) merlinScore += 8;
    // Penalty for being on fail mission teams
    for (var r = 0; r < state.missions.length; r++) {
      var m = state.missions[r];
      if (m && m.result === 'fail' && m.team && m.team.indexOf(i) !== -1) {
        merlinScore -= 10;
      }
    }
    merlinScore = Math.max(5, Math.min(95, merlinScore));
    merlinProbs.push(merlinScore);
  }

  // Sort for Merlin ranking
  var merlinSorted = [];
  for (var i = 0; i < pc; i++) {
    if (i === si) continue; // Skip self
    merlinSorted.push({ idx: i, prob: merlinProbs[i] });
  }
  merlinSorted.sort(function(a, b) { return b.prob - a.prob; });

  // Render player cards
  var h = '';
  for (var i = 0; i < pc; i++) {
    var isSelf = (i === si);
    var g = goodProbs[i];
    var e = 100 - g;
    var m = merlinProbs[i];
    var gColor = g >= 60 ? 'var(--green-bright)' : g >= 40 ? 'var(--gold-light)' : 'var(--red-bright)';
    var eColor = e >= 60 ? 'var(--red-bright)' : e >= 40 ? 'var(--gold-light)' : 'var(--green-bright)';
    var mColor = m >= 60 ? 'var(--gold-light)' : 'var(--text-dim)';

    h += '<div class="deduction-player-card' + (isSelf ? ' self-card' : '') + '">';
    h += '<span class="deduction-name">' + (isSelf ? '<span class="deduction-self-star">★我</span>' : '') + playerLabel(i) + '</span>';
    h += '<div class="deduction-bars">';
    // Good bar
    h += '<div class="deduction-bar-row">';
    h += '<span class="deduction-bar-label">好人</span>';
    h += '<div class="deduction-bar-track"><div class="deduction-bar-fill good" style="width:' + g + '%"></div></div>';
    h += '<span class="deduction-pct" style="color:' + gColor + '">' + g + '%</span>';
    h += '</div>';
    // Evil bar
    h += '<div class="deduction-bar-row">';
    h += '<span class="deduction-bar-label">坏人</span>';
    h += '<div class="deduction-bar-track"><div class="deduction-bar-fill evil" style="width:' + e + '%"></div></div>';
    h += '<span class="deduction-pct" style="color:' + eColor + '">' + e + '%</span>';
    h += '</div>';
    // Merlin bar
    h += '<div class="deduction-bar-row">';
    h += '<span class="deduction-bar-label">梅林</span>';
    h += '<div class="deduction-bar-track"><div class="deduction-bar-fill merlin" style="width:' + m + '%"></div></div>';
    h += '<span class="deduction-pct" style="color:' + mColor + '">' + m + '%</span>';
    h += '</div>';
    h += '</div>';
    h += '</div>';
  }
  grid.innerHTML = h;

  // Render Merlin ranking
  if (merlinCard && merlinList) {
    merlinCard.style.display = 'block';
    var mh = '';
    for (var k = 0; k < merlinSorted.length; k++) {
      var p = merlinSorted[k];
      var topClass = '';
      if (k === 0) topClass = ' top1';
      else if (k === 1) topClass = ' top2';
      else if (k === 2) topClass = ' top3';
      mh += '<div class="deduction-merlin-row">';
      mh += '<span class="deduction-merlin-rank' + topClass + '">' + (k + 1) + '</span>';
      mh += '<span class="deduction-name">' + playerLabel(p.idx) + '</span>';
      mh += '<span class="deduction-merlin-pct">' + p.prob + '%</span>';
      mh += '</div>';
    }
    merlinList.innerHTML = mh;
  }

  // Also update nav button state
  setActiveNav('tend');
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
  stopTimer();
  if (state.timerMode === 'off') return;
  if (state.timerMode === 'all') {
    state.timerRemaining = 5 * 60;
  } else {
    state.timerRemaining = state.timerSeconds;
  }
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
      toast('计时结束！', 'warn');
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
  state.timerRemaining = (state.timerMode === 'all') ? 5 * 60 : state.timerSeconds;
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

function buildReviewHTML() {
  var h = '';
  var pc = state.playerCount;

  for (var r = 0; r <= state.currentRound; r++) {
    var m = state.missions[r];
    if (!m) continue;

    h += '<div class="review-card">';
    h += '<div class="rc-header" onclick="toggleReviewCard(this)">';
    h += '<span class="rc-title">第' + (r + 1) + '轮 · ' + (m.result ? (m.result === 'success' ? '任务成功' : '任务失败') : '进行中') + '</span>';
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
        h += launched ? ' <span style="color:var(--green-bright)">发车</span>' : ' <span style="color:var(--red-bright)">否决</span>';

        // Vote detail - two-column layout
        var approveList = [], rejectList = [];
        for (var k = 0; k < pc; k++) {
          if (att.votes[k] === 'approve') approveList.push(playerLabel(k));
          else rejectList.push(playerLabel(k));
        }
        h += '<div class="vote-result-split">';
        h += '<div class="vote-row-h vote-row-approve"><span class="vote-col-title">赞成 (' + approveList.length + '人)：</span>';
        if (approveList.length > 0) {
          h += approveList.map(function(n) { return '<span class="vote-player-name">' + n + '</span>'; }).join('');
        } else { h += '<span class="vote-col-empty">无</span>'; }
        h += '</div>';
        h += '<div class="vote-row-h vote-row-reject"><span class="vote-col-title">反对 (' + rejectList.length + '人)：</span>';
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
      h += (m.result === 'success' ? '成功' : '失败');
      if (m.result === 'fail' && m.failCount) h += ' (' + m.failCount + '张失败票)';
      h += '</span></div>';
    }

    if (m.launchFailures > 0) {
      h += '<div style="margin-top:4px;color:var(--orange)">发车失败 ' + m.launchFailures + ' 次</div>';
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
}

function transitionToVotes() {
  state._teamConfirmedPending = false;
  var m = state.missions[state.currentRound];
  m.votes = {};
  for (var i = 0; i < state.playerCount; i++) {
    m.votes[i] = 'reject';
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
    syncGameState();
  } else {
    m.launchFailures++;

    if (m.launchFailures >= 5) {
      m.result = 'fail';
      m.failCount = 0;
      updateFinalTendencies();
      checkGameEnd();
      renderGame();
      syncGameState();
      var banner = '<div class="launch-fail-banner">第' + (state.currentRound + 1) + '轮连续 <span class="count">5</span> 次发车失败，任务自动失败！</div>';
      $('launch-fail-area').innerHTML = banner;
      return;
    }

    m.leader = (m.leader + 1) % pc;
    state._lastLeaderIdx = m.leader;
    m.team = [];
    m.votes = {};

    renderGame();
    var banner = '<div class="launch-fail-banner">第' + (state.currentRound + 1) + '轮第 <span class="count">' + m.launchFailures + '</span> 次发车失败！赞成 ' + approves + ' / 反对 ' + rejects + '（赞成≤反对）队长轮换至 ' + playerLabel(m.leader) + '</div>';
    $('launch-fail-area').innerHTML = banner;
    toast('发车失败！队长轮换', 'warn');
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
  h += '<span class="step-label">第' + (state.currentRound + 1) + '轮 · 需要 ' + m.size + ' 人出任务</span>';
  h += '<span style="font-size:13px;color:var(--text-dim)">进行中</span></div>';

  h += '<div style="margin-bottom:6px"><span class="leader-badge">♔ ' + playerLabel(m.leader) + '</span>';
  h += '<span style="font-size:13px;color:var(--text-dim);margin-left:10px">队伍：' + m.team.map(function(i) { return playerLabel(i); }).join('、') + '</span></div>';

  var approves = Object.values(m.votes).filter(function(v) { return v === 'approve'; }).length;
  var rejects = state.playerCount - approves;
  h += '<div style="font-size:14px;color:var(--green-bright);margin-bottom:10px">发车成功！赞成 ' + approves + ' / 反对 ' + rejects + '</div>';

  h += '<hr style="border-color:var(--border);margin-bottom:10px">';
  h += '<div class="step-label">步骤D：任务结果</div>';
  h += '<div class="mission-result-area">';
  h += '<div class="mission-btn success-btn' + (m.result === 'success' ? ' selected' : '') + '" onclick="setMissionResult(\'success\')">&#128737;</div>';
  h += '<div class="mission-btn fail-btn' + (m.result === 'fail' ? ' selected' : '') + '" onclick="setMissionResult(\'fail\')">&#128481;</div>';
  h += '</div>';
  h += '<div id="fail-count-row" class="fail-count-row" style="display:none">';
  h += '<div class="step-label">失败票数量</div>';
  h += '<div class="fail-count-btns" id="fail-count-btns"></div></div>';
  h += '<div style="text-align:center;margin-top:10px"><button class="btn primary" id="btn-finalize" style="display:none" onclick="finalizeMission()">确认任务结果，进入下一轮</button></div>';
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
  if (m.result === 'fail' && !m.failCount) { toast('请选择失败票数量', 'warn'); return; }

  // 第4轮保护轮：需2张失败票任务才失败，1张失败任务仍成功
  if (state.currentRound === 3 && m.result === 'fail' && (m.failCount || 0) === 1) {
    m.result = 'success';
    m.failCount = 1;
    toast('第4轮保护轮：1张失败票，任务仍成功');
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

  var hasLancelot = state.activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || state.activeRoles.indexOf('兰斯洛特(红)') !== -1;
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
  syncGameState();
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
    toast('坏人方成功破坏 3 轮任务！游戏结束');
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
    var sel = document.getElementById('end-role-' + i);
    var role = sel ? sel.value : '';
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
    // 自动填入已知身份（如刺杀中确认的梅林）
    if (!curVal && state.autoRoles && state.autoRoles[i]) {
      curVal = state.autoRoles[i];
    }

    h += '<div class="end-player-row">';
    h += '<span class="ep-name">' + playerLabel(i) + '</span>';
    h += '<select id="end-role-' + i + '" onchange="onEndRoleChange(' + i + ')">';
    h += '<option value="">-- 未选 --</option>';
    for (var j = 0; j < state.activeRoles.length; j++) {
      var r = state.activeRoles[j];
      if (UNIQUE_ROLES.indexOf(r) !== -1 && taken[r] && r !== curVal) continue;
      h += '<option value="' + r + '"' + (r === curVal ? ' selected' : '') + '>' + r + '</option>';
    }
    h += '</select>';
    h += '</div>';
  }
  grid.innerHTML = h;
  state._renderingIdentities = false;
}

function renderEnd() {
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
  $('end-round-summary').textContent = sc + '轮成功 / ' + fc + '轮失败';

  renderEndIdentityDropdowns();
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
function showLancelotFlipModal(roundNum) {
  applyLancelotAutoDraw(roundNum);
}

function applyLancelotFlip() {
  closeModal();
  checkGameEnd();
  renderGame();
}

function skipLancelotFlip() {
  closeModal();
  checkGameEnd();
  renderGame();
}

function setLancelotFlip(val) {
  state.lancelotFlipped = val;
  state._lancelotAsked = true;
  renderEnd();
  toast(val ? '兰斯洛特已反转' : '兰斯洛特未反转');
}

function resolveAssassin(isMerlin) {
  state.winner = isMerlin ? 'evil' : 'good';
  state.assassinFromMission = false;
  if (isMerlin && state.assassinTarget !== null) {
    state.autoRoles = state.autoRoles || {};
    state.autoRoles[state.assassinTarget] = '梅林';
  }
  $('end-assassin-card').style.display = 'none';
  renderEnd();
  syncGameState();
  toast(isMerlin ? '刺杀成功！反方获胜' : '刺杀失败！好人方获胜');
}

function setWinner(w) {
  state.winner = w;
  renderEnd();
  syncGameState();
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
    if (role === '兰斯洛特(蓝)' || role === '兰斯洛特(红)') {
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
        result: h.result
      };
    })
  };
  history.push(record);
  saveHistory(history);

  // Supabase: 静默保存对局记录到云端（实时订阅会自动通知其他设备）
  var sb = getSupabase();
  if (sb) {
    var recordKey = makeRecordKey(record);
    sb.from('game_records').insert({ game_data: record, record_key: recordKey }).select('id').single().then(function(res) {
      if (res.error) {
        console.warn('[Supabase] saveGameRecord failed:', res.error);
      } else if (res.data && res.data.id) {
        // 回写 Supabase 记录 ID 到本地，供后续删除时使用
        record._supabaseId = res.data.id;
        history[history.length - 1]._supabaseId = res.data.id;
        saveHistory(history);
      }
    });
    // 同步 name_pool 到云端
    sb.from('key_value').upsert({ key: 'name_pool', value: namePool, updated_at: new Date().toISOString() }, { onConflict: 'key' }).then(function(res) {
      if (res.error) console.warn('[Supabase] save name_pool failed:', res.error);
    });
  }

  var savedCount = state.playerCount;
  var savedNames = state.playerNames.slice();
  var savedSelf = state.selfIndex;
  var savedRoles = state.activeRoles.slice();
  initState(savedCount);
  state.activeRoles = savedRoles;
  state.playerNames = savedNames;
  state.selfIndex = savedSelf;
  state.myRole = null;
  syncGameState();
  showPage('setup');
}

/* ==================== STATS PANEL ==================== */
function renderStats() {
  renderConnectionStatus();
  var history = loadHistory();
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
    h += '<div class="stat-card"><div class="stat-value" style="color:#ff6666">' + maRate + '%</div><div class="stat-label">梅林被刺率</div>';
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
  var start = filtered.length - 1 - state._historyPage * ps;
  var end = Math.max(-1, start - ps);

  var cl = $('history-compact-list');
  h = '';
  for (var fi = start; fi > end; fi--) {
    var frec = filtered[fi];
    var rec = frec.rec;
    var i = frec.origIdx;
    if (!rec) continue;
    var winnerColor = rec.winner === 'good' ? 'var(--green-bright)' : 'var(--red-bright)';
    var winnerLabel = rec.winner === 'good' ? '好人方胜' : '反方胜';

    h += '<div class="history-compact-item">';
    h += '<div class="hci-header" onclick="toggleCompactHistory(this)">';
    h += '<span class="hci-date">' + rec.date + '</span>';
    h += '<span class="hci-players">' + rec.playerCount + '人</span>';
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
        h += '<span>' + id.name + '：' + (id.role || '--') + '</span>';
      }
      h += '</div>';
    }
    // Missions summary
    if (rec.missions) {
      h += '<div class="hci-missions">任务：';
      for (var j = 0; j < rec.missions.length; j++) {
        var m = rec.missions[j];
        h += '<span style="color:' + (m.result === 'success' ? 'var(--green-bright)' : 'var(--red-bright)') + '">';
        h += 'R' + (j + 1) + (m.result === 'success' ? '✓' : '✕') + '</span> ';
      }
      h += '</div>';
    }
    // Identity marks
    if (rec.identityMarks && rec.identityMarks.length > 0) {
      h += '<div style="margin-top:4px;font-size:11px;color:var(--text-dim)">标记：';
      for (var j = 0; j < rec.identityMarks.length; j++) {
        var mk = rec.identityMarks[j];
        var lvlLabel = mk.level === 'high' ? '高' : mk.level === 'mid' ? '中' : '低';
        h += '<span>' + mk.targetName + '[' + lvlLabel + '] </span>';
      }
      h += '</div>';
    }
    if (rec.assassinTarget) {
      h += '<div style="margin-top:4px;font-size:11px;color:var(--text-dim)">刺杀';
      if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
        h += '（第' + (rec.assassinAfterRound + 1) + '轮任务后）';
      }
      h += '：' + rec.assassinTarget + ' → ' + (rec.assassinSuccess ? '成功' : '失败') + '</div>';
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
        flipped: rec.lancelotFlips && rec.lancelotFlips[id.index]
      });
    }
  }

  var lb = [];
  for (var nm in todayPlayerSet) {
    var items = todayPlayerSet[nm];
    var totalGames = items.length;
    var goodWins = 0, evilWins = 0;
    for (var g = 0; g < items.length; g++) {
      var faction = getFinalFaction(items[g].role, items[g].flipped);
      if (items[g].winner === faction) {
        if (faction === 'good') goodWins++;
        else evilWins++;
      }
    }
    var wins = goodWins + evilWins;
    var rate = totalGames > 0 ? wins / totalGames : 0;
    lb.push({ name: nm, total: totalGames, goodWins: goodWins, evilWins: evilWins, wins: wins, rate: rate });
  }
  lb.sort(function(a, b) {
    if (b.rate !== a.rate) return b.rate - a.rate;
    return b.total - a.total;
  });

  var showAll = state._showAllLeaderboard || false;
  var maxShow = showAll ? lb.length : Math.min(10, lb.length);
  var lh = '';
  for (var r = 0; r < maxShow; r++) {
    var p = lb[r];
    var rateColor = p.rate >= 0.6 ? 'var(--green-bright)' : p.rate >= 0.4 ? 'var(--gold-light)' : 'var(--red-bright)';
    var topClass = '';
    if (r === 0) topClass = ' top1';
    else if (r === 1) topClass = ' top2';
    else if (r === 2) topClass = ' top3';
    lh += '<div class="win-rate-card' + topClass + '">';
    lh += '<span class="wc-rank">' + (r + 1) + '</span>';
    lh += '<span class="wc-name">' + p.name + '</span>';
    lh += '<div><div class="wc-rate" style="color:' + rateColor + '">' + Math.round(p.rate * 100) + '%</div>';
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
    if (d.winner === getFinalFaction(role, false)) roleStats[role].wins++;
  }

  var totalRate = total > 0 ? Math.round(totalWins / total * 100) : 0;
  var goodRate = gamesGood > 0 ? Math.round(winsGood / gamesGood * 100) : 0;
  var evilRate = gamesEvil > 0 ? Math.round(winsEvil / gamesEvil * 100) : 0;

  var h = '<strong>总场次：</strong>' + total + ' 局<br>';
  h += '<strong>总胜场：</strong>' + totalWins + ' 场 <span style="color:var(--gold-light)">(' + totalRate + '%)</span><br>';
  h += '<strong>好人方胜率：</strong>' + winsGood + '/' + gamesGood + ' <span style="color:var(--green-bright)">(' + goodRate + '%)</span><br>';
  h += '<strong>反方胜率：</strong>' + winsEvil + '/' + gamesEvil + ' <span style="color:var(--red-bright)">(' + evilRate + '%)</span><br><br>';
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
  var rec = history[idx];
  if (!rec) return;

  var h = '<h2>对局详情</h2>';
  h += '<p><strong>日期：</strong>' + rec.date + ' | <strong>人数：</strong>' + rec.playerCount + '人 | <strong>胜方：</strong>' + (rec.winner === 'good' ? '好人方' : '反方') + '</p>';
  if (rec.assassinTarget) {
    h += '<p><strong>拍刀：</strong>';
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += '第' + (rec.assassinAfterRound + 1) + '轮任务后反方拍刀 | ';
    }
    h += '<strong>目标：</strong>' + rec.assassinTarget + ' | <strong>结果：</strong>' + (rec.assassinSuccess ? '<span style="color:#ff9999">命中梅林，反方胜</span>' : '<span style="color:#99ff99">未命中，好人方胜</span>') + '</p>';
  }
  if (rec.activeRoles) {
    h += '<p><strong>使用角色：</strong>' + rec.activeRoles.join('、') + '</p>';
  }

  h += '<h3 style="margin-top:10px">身份分配</h3>';
  for (var i = 0; i < rec.identities.length; i++) {
    var id = rec.identities[i];
    var final = getFinalFaction(id.role, rec.lancelotFlips && rec.lancelotFlips[id.index]);
    var flipNote = '';
    if (rec.lancelotFlips && rec.lancelotFlips[id.index]) {
      flipNote = ' <span style="color:var(--orange);font-size:11px">[反转→' + (final === 'good' ? '好人方' : '反方') + ']</span>';
    }
    h += '<div>' + (id.index + 1) + '号 ' + id.name + '：' + id.role + flipNote + '</div>';
  }

  h += '<h3 style="margin-top:10px">任务记录</h3>';
  var hasAssassin = (rec.assassinTarget && rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined);
  var assassinCutoff = hasAssassin ? rec.assassinAfterRound : rec.missions.length;
  var totalRounds = hasAssassin ? Math.max(rec.missions.length, assassinCutoff + 1) : rec.missions.length;
  for (var i = 0; i < totalRounds; i++) {
    if (hasAssassin && i === assassinCutoff) {
      h += '<div style="margin-bottom:4px;padding:8px 12px;background:rgba(255,153,153,0.08);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm)"><span style="font-weight:700">第' + (i + 1) + '轮：</span><span style="color:#ff9999;font-weight:700">反方拍刀</span> — 游戏在此轮终止</div>';
      continue;
    }
    if (hasAssassin && i > assassinCutoff) break;
    if (i < rec.missions.length) {
      var m = rec.missions[i];
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
          var label = isSucceeded ? '发车成功' : (isFailed ? '发车失败（最终）' : '发车失败');
          var bg = isSucceeded ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
          var borderColor = isSucceeded ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
          var labelColor = isSucceeded ? 'var(--green-bright)' : 'var(--red-bright)';
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg + ';border:1px solid ' + borderColor + ';border-radius:var(--radius-sm);font-size:13px">';
          h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
          h += '<span style="font-weight:700;color:' + labelColor + '">' + label + '</span> ';
          h += '| 队长 ' + att.leader + ' | 队伍 ' + att.team.join('、');
          h += ' | 投票 ' + approveCount + ':' + rejectCount;
          h += '</div>';
        }
      } else {
        // Legacy data: no launchAttempts, render from mission data with same style
        var lf = m.launchFailures || 0;
        var isSuccess = m.result === 'success';
        for (var f = 0; f < lf; f++) {
          h += '<div style="margin-bottom:3px;padding:6px 10px;background:rgba(255,153,153,0.06);border:1px solid rgba(255,153,153,0.25);border-radius:var(--radius-sm);font-size:13px">';
          h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
          h += '<span style="font-weight:700;color:var(--red-bright)">发车失败</span>';
          h += ' | 队长 ' + m.leader + ' | 队伍 ' + m.team.join('、');
          h += '</div>';
        }
        var bg2 = isSuccess ? 'rgba(153,255,153,0.06)' : 'rgba(255,153,153,0.06)';
        var border2 = isSuccess ? 'rgba(153,255,153,0.25)' : 'rgba(255,153,153,0.25)';
        var color2 = isSuccess ? 'var(--green-bright)' : 'var(--red-bright)';
        h += '<div style="margin-bottom:3px;padding:6px 10px;background:' + bg2 + ';border:1px solid ' + border2 + ';border-radius:var(--radius-sm);font-size:13px">';
        h += '<span style="font-weight:700">第' + (i + 1) + '轮</span> ';
        h += '<span style="font-weight:700;color:' + color2 + '">' + (isSuccess ? '发车成功' : '发车失败（最终）') + '</span>';
        h += ' | 队长 ' + m.leader + ' | 队伍 ' + m.team.join('、');
        h += '</div>';
      }
    }
  }
  if (hasAssassin && assassinCutoff < totalRounds - 1) {
    h += '<div style="color:var(--text-dim);font-size:13px;margin-top:4px">（后续' + (totalRounds - assassinCutoff - 1) + '轮未进行，游戏在拍刀环节终止）</div>';
  }

  if (rec.ladyCheckHistory && rec.ladyCheckHistory.length > 0) {
    h += '<h3 style="margin-top:10px">湖中女神验人</h3>';
    for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
      var lh = rec.ladyCheckHistory[li];
      h += '<div style="margin-bottom:3px;font-size:13px">';
      h += '<strong>第' + (li + 1) + '任女神：</strong>' + lh.holderName + ' → 验 ' + lh.targetName;
      h += ' <span style="font-weight:700;color:' + (lh.result === 'good' ? 'var(--blue-light)' : 'var(--red-bright)') + '">女神说' + (lh.result === 'good' ? '好人' : '反方') + '</span>';
      h += ' <span style="font-size:11px;color:var(--text-dim)">（女神说的不一定准）</span>';
      h += '</div>';
    }
  }

  if (rec.roundTendencies && rec.roundTendencies.length > 0) {
    h += '<h3 style="margin-top:10px">倾向值变化</h3>';
    h += '<table style="font-size:12px;width:100%;border-collapse:collapse"><tr style="border-bottom:1px solid var(--border)"><th style="padding:4px 6px;text-align:left">玩家</th>';
    for (var r = 0; r < rec.roundTendencies.length; r++) {
      h += '<th style="padding:4px 6px;text-align:center">第' + (r + 1) + '轮</th>';
    }
    h += '</tr>';
    for (var i = 0; i < rec.identities.length; i++) {
      var id = rec.identities[i];
      h += '<tr style="border-bottom:1px solid var(--border)"><td style="padding:4px 6px;font-weight:600">' + (id.index + 1) + '号 ' + id.name + '</td>';
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
  var rec = history[idx];
  if (!rec) return;

  var h = '<h2>编辑对局</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim)">' + rec.date + ' · ' + rec.playerCount + '人</p>';

  h += '<h3 style="margin-top:8px">胜方</h3>';
  h += '<div class="winner-toggle" style="margin-bottom:8px">';
  h += '<button class="winner-btn good' + (rec.winner === 'good' ? ' selected' : '') + '" id="edit-winner-good" onclick="editToggleWinner(\'good\')">&#128737; 好人方</button>';
  h += '<button class="winner-btn evil' + (rec.winner === 'evil' ? ' selected' : '') + '" id="edit-winner-evil" onclick="editToggleWinner(\'evil\')">&#128481; 反方</button>';
  h += '</div>';

  if (rec.assassinTarget) {
    h += '<h3 style="margin-top:8px">拍刀</h3>';
    h += '<p style="font-size:13px">目标：' + rec.assassinTarget;
    if (rec.assassinAfterRound !== null && rec.assassinAfterRound !== undefined) {
      h += ' | 第' + (rec.assassinAfterRound + 1) + '轮任务后';
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
    h += '<span class="ep-name">' + (id.index + 1) + '号</span>';
    h += '<select id="edit-name-' + i + '" style="flex:0;min-width:72px;padding:7px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer;min-height:40px">';
    for (var k = 0; k < namePool.length; k++) {
      var nm = namePool[k];
      if (takenEditNames[nm] && nm !== id.name) continue;
      h += '<option value="' + nm + '"' + (nm === id.name ? ' selected' : '') + '>' + nm + '</option>';
    }
    if (namePool.indexOf(id.name) === -1) {
      h += '<option value="' + id.name + '" selected>' + id.name + '</option>';
    }
    h += '</select>';
    h += '<select id="edit-role-' + i + '">';
    h += '<option value="">-- 未选 --</option>';
    for (var j = 0; j < activeRoles.length; j++) {
      h += '<option value="' + activeRoles[j] + '"' + (activeRoles[j] === id.role ? ' selected' : '') + '>' + activeRoles[j] + '</option>';
    }
    h += '</select>';
    h += '</div>';
  }

  var hasLancelot = activeRoles.indexOf('兰斯洛特(蓝)') !== -1 || activeRoles.indexOf('兰斯洛特(红)') !== -1;
  var anyFlipped = false;
  if (rec.lancelotFlips) {
    for (var k = 0; k < rec.identities.length; k++) {
      if (rec.lancelotFlips[rec.identities[k].index]) { anyFlipped = true; break; }
    }
  }
  h += '<h3 style="margin-top:8px">兰斯洛特反转</h3>';
  h += '<div class="winner-toggle" style="margin-bottom:8px">';
  h += '<button class="winner-btn good' + (anyFlipped ? ' selected' : '') + '" id="edit-lancelot-yes" onclick="setEditLancelotFlip(true)">&#9989; 是，反转</button>';
  h += '<button class="winner-btn evil' + (!anyFlipped ? ' selected' : '') + '" id="edit-lancelot-no" onclick="setEditLancelotFlip(false)">&#10060; 否，不反转</button>';
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

  history[idx] = rec;
  saveHistory(history);
  closeModal();
  toast('对局记录已更新');
  renderStats();
}

function deleteGameRecord(idx) {
  var h = '<h2>确认删除</h2>';
  h += '<p>确定要删除这条对局记录吗？此操作不可撤销。</p>';
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
  var record = history[idx];
  var key = makeRecordKey(record);
  var sb = getSupabase();

  // 先删除 Supabase，确保云端同步后再更新本地
  function doLocalDelete() {
    // 兜底黑名单
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
    // 按 _supabaseId 删除；若无则按 game_data 匹配查找后删除
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
      // 无 _supabaseId，按 date + playerCount + identities 匹配查找
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
    // 无 Supabase 连接，仅本地删除
    doLocalDelete();
  }
}

/* ==================== MODAL ==================== */
function showModal(html) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = '<div class="modal" id="temp-modal">' + html + '</div>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
function closeModal() {
  var overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(function(o) { o.remove(); });
}

function clearStats() {
  var h = '<h2>确认清除</h2><p>确定要清除所有统计记录吗？此操作不可撤销。</p>';
  h += '<div class="modal-actions">';
  h += '<button class="btn danger" onclick="confirmClearStats()">确认清除</button>';
  h += '<button class="btn" onclick="closeModal()">取消</button></div>';
  showModal(h);
}

function confirmClearStats() {
  closeModal();
  localStorage.removeItem('avalon_history_v2');
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
  var json = JSON.stringify(data);

  var prettyJson = JSON.stringify(data, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prettyJson).then(function() {
      toast('数据已复制到剪贴板');
    }).catch(function() {
      showExportModal(prettyJson);
    });
  } else {
    showExportModal(prettyJson);
  }
}

function showExportModal(json) {
  var h = '<h2>导出数据</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">复制下方 JSON 文本：</p>';
  h += '<textarea class="import-textarea" readonly onclick="this.select()">' + json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>';
  h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button></div>';
  showModal(h);
}

function importData() {
  var h = '<h2>导入数据</h2>';
  h += '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px">粘贴 JSON 数据后点击导入。将覆盖现有的阿瓦隆数据。</p>';
  h += '<textarea class="import-textarea" id="import-textarea" placeholder="在此粘贴 JSON 数据…"></textarea>';
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
  if (!raw) { toast('请粘贴 JSON 数据', 'warn'); return; }

  var data;
  try { data = JSON.parse(raw); } catch(e) { toast('JSON 格式错误，请检查', 'warn'); return; }
  if (!data || typeof data !== 'object') { toast('数据格式无效', 'warn'); return; }

  var validKeys = ['avalon_name_pool', 'avalon_history_v2', 'avalon_last_game'];
  var imported = 0;
  for (var i = 0; i < validKeys.length; i++) {
    var k = validKeys[i];
    if (k in data) {
      localStorage.setItem(k, JSON.stringify(data[k]));
      imported++;
    }
  }
  if (imported === 0) { toast('未识别到有效数据', 'warn'); return; }

  closeModal();
  toast('已导入 ' + imported + ' 条数据，即将刷新页面');
  setTimeout(function() { location.reload(); }, 800);
}

// Supabase Realtime 订阅：跨设备实时同步
// 页面加载时从 Supabase 拉取历史数据合并到本地（补充实时推送之前的记录）
function pullInitialData(sb) {
  // 拉取对局记录
  sb.from('game_records').select('game_data').then(function(res) {
    if (res.error || !res.data) {
      console.warn('[InitPull] game_records fetch failed:', res.error);
      return;
    }
    var cloudRecords = [];
    for (var i = 0; i < res.data.length; i++) {
      if (res.data[i].game_data) cloudRecords.push(res.data[i].game_data);
    }
    // 过滤删除黑名单
    var deletedKeys = loadDeletedKeys();
    if (deletedKeys.length > 0) {
      var dkSet = {};
      for (var d = 0; d < deletedKeys.length; d++) { dkSet[deletedKeys[d]] = true; }
      cloudRecords = cloudRecords.filter(function(r) { return !dkSet[makeRecordKey(r)]; });
      console.log('[InitPull] filtered out', (deletedKeys.length), 'deleted records from cloud');
    }
    var localHistory = loadHistory();
    var merged = mergeHistories(localHistory, cloudRecords);
    saveHistory(merged);
    console.log('[InitPull] merged game_records, local:', localHistory.length, 'cloud:', cloudRecords.length, 'merged:', merged.length);
    // 当前在 stats 页面则刷新
    if (state._currentPage === 'stats') renderStats();

    // 补推：将本地有但云端没有的记录上传到 Supabase（排除已删除的）
    var cloudKeys = {};
    for (var k = 0; k < cloudRecords.length; k++) {
      cloudKeys[makeRecordKey(cloudRecords[k])] = true;
    }
    var pushCount = 0;
    for (var j = 0; j < localHistory.length; j++) {
      var key = makeRecordKey(localHistory[j]);
      if (!cloudKeys[key] && (!dkSet || !dkSet[key])) {
        (function(rec) {
          sb.from('game_records').insert({ game_data: rec }).then(function(r) {
            if (!r.error) { pushCount++; console.log('[InitPull] pushed missing record'); }
          });
        })(localHistory[j]);
      }
    }
  });

  // 拉取 name_pool
  sb.from('key_value').select('value').eq('key', 'name_pool').single().then(function(res) {
    if (res.error || !res.data) return;
    var cloudPool = res.data.value;
    if (!cloudPool || !cloudPool.length) return;
    var localPool = JSON.parse(localStorage.getItem('avalon_name_pool') || '[]');
    // 以云端为准，本地新增的保留（云端已删则本地同步删除）
    var mergedPool = cloudPool.slice();
    for (var j = 0; j < localPool.length; j++) {
      if (mergedPool.indexOf(localPool[j]) === -1) mergedPool.push(localPool[j]);
    }
    namePool = mergedPool;
    localStorage.setItem('avalon_name_pool', JSON.stringify(mergedPool));
    console.log('[InitPull] name_pool synced, total:', mergedPool.length);
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
        var newRecord = payload.new.game_data;
        if (!newRecord) return;
        // 检查删除黑名单
        var dk = loadDeletedKeys();
        if (dk.indexOf(makeRecordKey(newRecord)) !== -1) { console.log('[Realtime] skipped deleted record'); return; }
        var localHistory = loadHistory();
        var merged = mergeHistories(localHistory, [newRecord]);
        saveHistory(merged);
        console.log('[Realtime] merged new record, total:', merged.length);
        // 当前在 stats 页面则刷新
        if (state._currentPage === 'stats') {
          renderStats();
        }
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
        var localPool = JSON.parse(localStorage.getItem('avalon_name_pool') || '[]');
        var mergedPool = localPool.slice();
        for (var i = 0; i < cloudPool.length; i++) {
          if (mergedPool.indexOf(cloudPool[i]) === -1) mergedPool.push(cloudPool[i]);
        }
        namePool = mergedPool;
        localStorage.setItem('avalon_name_pool', JSON.stringify(mergedPool));
        console.log('[Realtime] name_pool synced, total:', mergedPool.length);
      } catch(e) {
        console.warn('[Realtime] failed to process name_pool update:', e);
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
  if (!record || !record.identities) return '';
  var identityStr = record.identities.map(function(id) { return (id.name || '') + '|' + (id.role || ''); }).sort().join(',');
  return (record.date || '') + '|' + (record.playerCount || 0) + '|' + identityStr;
}

/* ==================== MULTIPLAYER GAME SESSION ==================== */

// 序列化需同步的 state 字段为 JSON
function serializeGameState() {
  return {
    playerCount: state.playerCount,
    playerNames: state.playerNames.slice(),
    activeRoles: state.activeRoles.slice(),
    selfIndex: state.selfIndex,
    missions: JSON.parse(JSON.stringify(state.missions)),
    currentRound: state.currentRound,
    winner: state.winner,
    tendencies: JSON.parse(JSON.stringify(state.tendencies)),
    identityMarks: state.identityMarks ? JSON.parse(JSON.stringify(state.identityMarks)) : [],
    assassinTarget: state.assassinTarget,
    assassinSuccess: (state.winner === 'evil' && state.assassinTarget !== null),
    assassinFromMission: state.assassinFromMission,
    assassinMode: state.assassinMode,
    _assassinAfterRound: state._assassinAfterRound,
    ladyOfLakeEnabled: state.ladyOfLakeEnabled,
    ladyLakeHolder: state.ladyLakeHolder,
    ladyLakeChecks: state.ladyLakeChecks ? JSON.parse(JSON.stringify(state.ladyLakeChecks)) : [],
    ladyCheckHistory: state.ladyCheckHistory ? JSON.parse(JSON.stringify(state.ladyCheckHistory)) : [],
    roundTendencies: state.roundTendencies ? JSON.parse(JSON.stringify(state.roundTendencies)) : [],
    lancelotFlipped: state.lancelotFlipped,
    lancelotDeck: state.lancelotDeck ? state.lancelotDeck.slice() : null,
    lancelotDrawResults: state.lancelotDrawResults ? state.lancelotDrawResults.slice() : [],
    lancelotFlipCount: state.lancelotFlipCount || 0,
    lancelotRoundFlips: state.lancelotRoundFlips ? state.lancelotRoundFlips.slice() : [],
    timerMode: state.timerMode,
    timerDuration: state.timerSeconds,
    timerRemaining: state.timerRemaining || 0,
    _firstLeaderPicked: state._firstLeaderPicked,
    _lastLeaderIdx: state._lastLeaderIdx,
    consecutiveRejects: JSON.parse(JSON.stringify(state.consecutiveRejects))
  };
}

// 从 Supabase 同步的 JSON 反序列化到 state
function deserializeGameState(gs) {
  state.playerCount = gs.playerCount || 7;
  state.playerNames = gs.playerNames || [];
  state.activeRoles = gs.activeRoles || [];
  state.selfIndex = gs.selfIndex !== undefined ? gs.selfIndex : -1;
  state.missions = gs.missions || [];
  state.currentRound = gs.currentRound || 0;
  state.winner = gs.winner || null;
  state.tendencies = gs.tendencies || {};
  state.identityMarks = gs.identityMarks || [];
  state.assassinTarget = gs.assassinTarget || null;
  state._assassinSuccess = gs.assassinSuccess || null;
  state.assassinFromMission = gs.assassinFromMission || false;
  state.assassinMode = gs.assassinMode || false;
  state._assassinAfterRound = gs._assassinAfterRound !== undefined ? gs._assassinAfterRound : null;
  state.ladyOfLakeEnabled = gs.ladyOfLakeEnabled || false;
  state.ladyLakeHolder = gs.ladyLakeHolder !== undefined ? gs.ladyLakeHolder : -1;
  state.ladyLakeChecks = gs.ladyLakeChecks || [];
  state.ladyCheckHistory = gs.ladyCheckHistory || [];
  state.roundTendencies = gs.roundTendencies || [];
  state.lancelotFlipped = gs.lancelotFlipped || false;
  state.lancelotDeck = gs.lancelotDeck || null;
  state.lancelotDrawResults = gs.lancelotDrawResults || [];
  state.lancelotFlipCount = gs.lancelotFlipCount || 0;
  state.lancelotRoundFlips = gs.lancelotRoundFlips || [];
  state.timerMode = gs.timerMode || 'per';
  state.timerSeconds = gs.timerDuration || 60;
  state.timerRemaining = gs.timerRemaining || 0;
  state._firstLeaderPicked = gs._firstLeaderPicked || false;
  state._lastLeaderIdx = gs._lastLeaderIdx !== undefined ? gs._lastLeaderIdx : -1;
  state.consecutiveRejects = gs.consecutiveRejects || {};
  // 确保 internal 字段存在
  if (!state.identityMarks) state.identityMarks = [];
  if (!state.roundTendencies) state.roundTendencies = [];
  if (!state.ladyCheckHistory) state.ladyCheckHistory = [];
}

// 初始化游戏房间：检查是否有活跃房间，没有则创建（成为host），有则加入（成为viewer）
function initGameSession(sb, callback) {
  console.log('[Multiplayer] initGameSession 开始, deviceId=' + generateDeviceId());
  _deviceId = generateDeviceId();

  sb.from('game_sessions').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).then(function(res) {
    if (res.error) {
      console.warn('[Multiplayer] check session failed:', res.error);
      _isHost = true;
      _isViewer = false;
      console.log('[Multiplayer] initGameSession 结束 → host (查询失败回退)');
      callback('host');
      return;
    }

    if (!res.data || res.data.length === 0) {
      console.log('[Multiplayer] 无活跃房间，创建新房间');
      createNewSession(sb, callback);
      return;
    }

    var session = res.data[0];
    var updatedAt = session.updated_at;
    var TIMEOUT_MS = 5 * 60 * 1000;
    if (updatedAt) {
      var age = Date.now() - new Date(updatedAt).getTime();
      if (age > TIMEOUT_MS) {
        console.log('[Multiplayer] session timed out (age=' + age + 'ms), deleting old session and creating new');
        sb.from('game_sessions').delete().eq('id', session.id).then(function(delRes) {
          if (delRes.error) {
            console.warn('[Multiplayer] delete timed-out session failed:', delRes.error);
          }
          createNewSession(sb, callback);
        });
        return;
      }
    }

    _isHost = false;
    _isViewer = true;
    _gameSessionId = session.id;
    console.log('[Multiplayer] 加入已有房间, sessionId=' + _gameSessionId);
    var gs = session.game_state;
    if (gs && gs.playerCount) {
      deserializeGameState(gs);
    }
    console.log('[Multiplayer] initGameSession 结束 → viewer');
    toast('已加入房间，当前为围观模式', 'success');
    watchGameSession(sb);
    showPage('game');
    callback('viewer');
  });
}

// 创建新游戏房间（房主）
function createNewSession(sb, callback) {
  console.log('[Multiplayer] createNewSession 开始');
  _isHost = true;
  _isViewer = false;
  var initState = serializeGameState();
  sb.from('game_sessions').insert({
    host_id: _deviceId,
    game_state: initState,
    status: 'active',
    updated_at: new Date().toISOString()
  }).select('id').single().then(function(r2) {
    if (r2.error) {
      console.warn('[Multiplayer] create session failed:', r2.error);
      toast('创建房间失败，使用单机模式', 'warn');
    } else {
      _gameSessionId = r2.data.id;
      console.log('[Multiplayer] session 创建成功, sessionId=' + _gameSessionId);
      toast('你是房主 — 创建了新房间', 'success');
    }
    callback('host');
  });
}

// 房主：将完整 state 写入 Supabase
function syncGameState() {
  if (!_isHost || !_gameSessionId) return;
  var sb = getSupabase();
  if (!sb) return;
  console.log('[Multiplayer] syncGameState 调用, sessionId=' + _gameSessionId);
  var gs = serializeGameState();
  sb.from('game_sessions').update({
    game_state: gs,
    status: state.winner ? 'finished' : 'active',
    updated_at: new Date().toISOString()
  }).eq('id', _gameSessionId).then(function(r) {
    if (r.error) console.warn('[Multiplayer] sync failed:', r.error);
    else console.log('[Multiplayer] sync 成功');
  });
}

// 清除围观者状态，恢复操作权限
function clearViewerState(msg) {
  _isViewer = false;
  _isHost = false;
  _gameSessionId = null;
  if (_gameSessionChannel) {
    _gameSessionChannel.unsubscribe();
    _gameSessionChannel = null;
  }
  if (_gameSessionPollInterval) {
    clearInterval(_gameSessionPollInterval);
    _gameSessionPollInterval = null;
  }
  // 恢复 UI 控件
  restoreViewerControls();
  toast(msg, 'warn');
}

// 恢复被围观模式禁用的控件
function restoreViewerControls() {
  var pages = ['page-game', 'page-tend', 'page-end'];
  for (var p = 0; p < pages.length; p++) {
    var page = document.getElementById(pages[p]);
    if (!page) continue;
    var disabledEls = page.querySelectorAll('.viewer-disabled');
    for (var i = 0; i < disabledEls.length; i++) {
      disabledEls[i].disabled = false;
      disabledEls[i].classList.remove('viewer-disabled');
    }
  }
}

// 围观者：订阅 Supabase Realtime 更新
function watchGameSession(sb) {
  if (_gameSessionChannel) return;
  _gameSessionChannel = sb.channel('game-session-' + _gameSessionId);

  _gameSessionChannel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: 'id=eq.' + _gameSessionId },
    function(payload) {
      console.log('[Multiplayer] watchGameSession 收到推送, sessionId=' + _gameSessionId + ', status=' + payload.new.status);
      var gs = payload.new.game_state;
      // 检查房间是否被强制重启（status变为waiting且game_state清空）
      if (payload.new.status === 'waiting' && (!gs || !gs.playerCount || gs.playerCount === 0)) {
        clearViewerState('房间已被房主重置，请重新进入');
        showPage('setup');
        return;
      }
      // 检查房间是否已结束（房主离开 / 超时释放 / 游戏完成）
      if (payload.new.status === 'finished' || payload.new.status === 'ended') {
        clearViewerState('房主已离开，你可以成为新房主');
        showPage('setup');
        return;
      }
      if (!gs) return;
      deserializeGameState(gs);
      // 重新渲染当前页面
      if (state._currentPage === 'game') {
        renderGame();
        applyViewerMode();
      } else if (state._currentPage === 'end') {
        renderEnd();
      } else if (state._currentPage === 'tend') {
        renderTendencyFull(); renderIdentityPrediction(); renderMerlinPredictTend();
        renderIdentitySimGrid(); renderDeduction();
      } else if (state._currentPage === 'stats') {
        renderStats();
      }
    }
  );

  // 订阅 DELETE 事件（房间被关闭/删除）
  _gameSessionChannel.on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'game_sessions', filter: 'id=eq.' + _gameSessionId },
    function() {
      clearViewerState('房主已离开，你可以成为新房主');
      showPage('setup');
    }
  );

  _gameSessionChannel.subscribe(function(status) {
    console.log('[Multiplayer] channel status:', status);
  });

  // 轮询兜底：每 2 秒查询 Supabase，防止 Realtime 推送丢失
  if (_gameSessionPollInterval) clearInterval(_gameSessionPollInterval);
  _gameSessionPollInterval = setInterval(function() {
    if (!_isViewer || !_gameSessionId) {
      clearInterval(_gameSessionPollInterval);
      _gameSessionPollInterval = null;
      return;
    }
    var sbPoll = getSupabase();
    if (!sbPoll) return;
    sbPoll.from('game_sessions').select('game_state,status').eq('id', _gameSessionId).single().then(function(res) {
      if (res.error || !res.data) return;
      var gs = res.data.game_state;
      // 检查房间状态
      if (res.data.status === 'finished' || res.data.status === 'ended') {
        clearInterval(_gameSessionPollInterval);
        _gameSessionPollInterval = null;
        clearViewerState('房主已离开，你可以成为新房主');
        showPage('setup');
        return;
      }
      if (res.data.status === 'waiting' && (!gs || !gs.playerCount || gs.playerCount === 0)) {
        clearInterval(_gameSessionPollInterval);
        _gameSessionPollInterval = null;
        clearViewerState('房间已被房主重置，请重新进入');
        showPage('setup');
        return;
      }
      if (!gs) return;
      deserializeGameState(gs);
      if (state._currentPage === 'game') {
        renderGame();
        applyViewerMode();
      } else if (state._currentPage === 'end') {
        renderEnd();
      } else if (state._currentPage === 'tend') {
        renderTendencyFull(); renderIdentityPrediction(); renderMerlinPredictTend();
        renderIdentitySimGrid(); renderDeduction();
      } else if (state._currentPage === 'stats') {
        renderStats();
      }
    });
  }, 2000);
}

// iPad 强制重启：清除房间
function forceRestartSession() {
  if (!isIPad()) return;
  var sb = getSupabase();
  if (!sb || !_gameSessionId) return;
  showModal(
    '<h2>强制重启</h2>' +
    '<p>将清除当前游戏房间，所有玩家回到等待状态。确定？</p>' +
    '<div class="modal-actions">' +
    '<button class="btn danger" onclick="confirmForceRestart()">确认重启</button>' +
    '<button class="btn" onclick="closeModal()">取消</button>' +
    '</div>'
  );
}

function confirmForceRestart() {
  closeModal();
  var sb = getSupabase();
  if (!sb || !_gameSessionId) return;
  sb.from('game_sessions').update({
    game_state: serializeGameState(),
    status: 'waiting'
  }).eq('id', _gameSessionId).then(function(r) {
    if (r.error) {
      toast('强制重启失败: ' + r.error.message, 'warn');
      return;
    }
    // 然后删除该记录触发所有设备重置
    sb.from('game_sessions').delete().eq('id', _gameSessionId).then(function(r2) {
      if (r2.error) {
        // 删除失败，用 status=waiting 触发重置
        toast('房间已重置，等待新房主', 'success');
      } else {
        toast('房间已关闭，所有玩家回到等待状态', 'success');
      }
      _isHost = false;
      _isViewer = false;
      _gameSessionId = null;
      if (_gameSessionChannel) {
        _gameSessionChannel.unsubscribe();
        _gameSessionChannel = null;
      }
      initState(state.playerCount || 7);
      showPage('setup');
    });
  });
}

// 更新多人状态栏：显示host/viewer/iPad按钮
function updateMultiplayerStatusBar() {
  var bar = document.getElementById('multiplayer-status-bar');
  if (!bar) return;
  var h = '';
  if (_isHost) {
    h += '<span class="mp-badge host">房主</span>';
    if (isIPad()) {
      h += '<button class="btn small danger" onclick="forceRestartSession()" style="margin-left:8px">强制重启</button>';
    }
  } else if (_isViewer) {
    h += '<span class="mp-badge viewer">围观中</span>';
    h += '<span style="margin-left:8px;color:var(--text-dim);font-size:13px">等待房主操作...</span>';
  }
  bar.innerHTML = h;
  bar.style.display = (_isHost || _isViewer) ? 'flex' : 'none';
}

// 围观模式下禁用所有操作控件
function applyViewerMode() {
  if (!_isViewer) return;
  // 禁用游戏页所有按钮（除了导航）
  var gamePage = document.getElementById('page-game');
  if (!gamePage) return;
  var btns = gamePage.querySelectorAll('button:not(.nav-btn)');
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = true;
    btns[i].classList.add('viewer-disabled');
  }
  // 禁用 select 和 input
  var inputs = gamePage.querySelectorAll('select, input');
  for (var j = 0; j < inputs.length; j++) {
    inputs[j].disabled = true;
  }
  // 隐藏倾向页的操作控件
  var tendPage = document.getElementById('page-tend');
  if (tendPage) {
    var tendBtns = tendPage.querySelectorAll('button:not(.nav-btn)');
    for (var k = 0; k < tendBtns.length; k++) {
      tendBtns[k].disabled = true;
      tendBtns[k].classList.add('viewer-disabled');
    }
    var tendInputs = tendPage.querySelectorAll('select, input');
    for (var m = 0; m < tendInputs.length; m++) {
      tendInputs[m].disabled = true;
    }
  }
  // 结束页禁用操作
  var endPage = document.getElementById('page-end');
  if (endPage) {
    var endBtns = endPage.querySelectorAll('button:not(.nav-btn)');
    for (var n = 0; n < endBtns.length; n++) {
      endBtns[n].disabled = true;
      endBtns[n].classList.add('viewer-disabled');
    }
  }
}

/* ==================== INIT ==================== */
(function() {
  generateDeviceId();
  recordVisitor();
  // 建立 Supabase Realtime 订阅（跨设备实时同步）
  setupRealtimeSubscriptions();
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


})();