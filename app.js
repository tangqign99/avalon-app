/* ==================== DATA ==================== */
var MISSION_COUNTS = {5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]};
var DEFAULT_NAME_POOL = ['振宁','鹭文','小小','菜头','阿弟','齐齐','延平','小吴','涛','小黄','浩文','宝强','小洪'];
var ALL_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(蓝)','兰斯洛特(红)'];
var UNIQUE_ROLES = ['梅林','派西维尔','莫甘娜','刺客','莫德雷德','奥伯伦','兰斯洛特(蓝)','兰斯洛特(红)'];
var MULTI_ROLES = ['忠臣','爪牙'];
var GOOD_ROLES = ['梅林','派西维尔','忠臣','兰斯洛特(蓝)'];
var EVIL_ROLES = ['莫甘娜','刺客','莫德雷德','奥伯伦','爪牙','兰斯洛特(红)'];
var DEFAULT_ACTIVE_ROLES = ['梅林','派西维尔','忠臣','莫甘娜','刺客','莫德雷德'];

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
  _historyPage: 0,
  _historyPageSize: 5,
  ladyOfLakeEnabled: false,
  ladyLakeHolder: -1,
  ladyLakeChecks: [],
  timerMode: 'per',
  timerSeconds: 60,
  timerInterval: null,
  timerRemaining: 0,
  lancelotFlipped: false,
  _lancelotAsked: false,
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
  state.lancelotFlipped = false;
  state._lancelotAsked = false;
  state._historyPage = 0;
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
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  setActiveNav(page);
  if (page === 'setup') renderSetup();
  if (page === 'game') renderGame();
  if (page === 'tend') { renderTendencyFull(); renderIdentityPrediction(); renderMerlinPredictTend(); renderIdentitySimGrid(); renderDeduction(); }
  if (page === 'end') renderEnd();
  if (page === 'stats') { state._historyPage = 0; renderStats(); }
}

/* ==================== SETUP RENDER ==================== */
function renderSetup() {
  var h = '';
  for (var i = 5; i <= 10; i++) {
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

function addNameToPool() {
  var input = $('add-name-input');
  var name = input.value.trim();
  if (!name) { toast('请输入名字', 'warn'); return; }
  if (namePool.indexOf(name) !== -1) { toast('名字已存在', 'warn'); return; }
  namePool.push(name);
  saveNamePool();
  input.value = '';
  renderSetup();
  toast('已添加「' + name + '」');
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
  showIdentityModal();
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
  state.lancelotFlipped = false;
  state._lancelotAsked = false;
  state.lancelotFlipCount = 0;
  state.lancelotRoundFlips = [false, false, false, false, false];
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
  var flipImg = '<img src="images/兰斯洛特转移.png?v=2" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  var h = '';
  for (var i = 0; i < 5; i++) {
    var cls = 'lancelot-flip-dot';
    if (i === 0) { cls += ' blank'; }
    else if (i > state.currentRound) { cls += ' future'; }
    else if (state.lancelotRoundFlips[i]) { cls += ' flipped'; }
    else { cls += ' no-flip'; }
    h += '<div class="' + cls + '">' + flipImg + '</div>';
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
  $('launch-fail-area').innerHTML = '';
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
    for (var i = 0; i < pc; i++) {
      var v = m.votes[i];
      var onTeam = m.team.indexOf(i) !== -1;
      h += '<div class="vote-row">';
      h += '<span class="voter-name">' + playerLabel(i) + '</span>';
      if (onTeam) h += '<span class="on-team">⚔队伍</span>';
      h += '<div class="vote-btns">';
      h += '<span class="vote-num">' + (i + 1) + '</span>';
      h += '<div class="vote-btn approve' + (v === 'approve' ? ' selected' : '') + '" onclick="castVote(' + i + ',\'approve\')">&#128077;</div>';
      h += '<div class="vote-btn reject' + (v !== 'approve' ? ' selected' : '') + '" onclick="castVote(' + i + ',\'reject\')">&#128078;</div>';
      h += '</div></div>';
    }
    h += '<div style="display:flex;justify-content:flex-end;padding-right:8px;margin-top:4px"><button class="btn small success" onclick="allApprove()">全员赞成</button></div>';
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

    if (m.leader !== null) {
      h += '<div style="margin-bottom:4px"><strong>队长：</strong>' + playerLabel(m.leader) + '</div>';
    }

    if (m.team.length > 0) {
      h += '<div style="margin-bottom:4px"><strong>队伍：</strong>' + m.team.map(function(i) { return playerLabel(i); }).join('、') + '</div>';
    }

    // Show all launch attempts
    var attempts = m.launchAttempts || [];
    if (attempts.length > 0) {
      for (var a = 0; a < attempts.length; a++) {
        var att = attempts[a];
        var attApproves = 0;
        for (var k = 0; k < pc; k++) { if (att.votes[k] === 'approve') attApproves++; }
        var launched = attApproves > Math.floor(pc / 2);

        h += '<div class="launch-item' + (launched ? '' : '') + '" style="' + (launched ? 'border-left-color:var(--green);' : '') + '">';
        h += '<strong>第' + (a + 1) + '次组队</strong> ';
        h += '(队长 ' + playerLabel(att.leader) + ', 队伍 ' + att.team.map(function(i) { return playerLabel(i); }).join('、') + ')';
        h += ' | 赞成 ' + attApproves + ' / 反对 ' + (pc - attApproves);
        h += launched ? ' <span style="color:var(--green-bright)">发车</span>' : ' <span style="color:var(--red-bright)">否决</span>';

        // Vote detail table
        h += '<table class="rc-vote-table"><tr><th>玩家</th><th>投票</th></tr>';
        for (var k = 0; k < pc; k++) {
          var v = att.votes[k];
          h += '<tr><td>' + playerLabel(k) + '</td>';
          h += '<td class="' + (v === 'approve' ? 'vote-ap' : 'vote-rj') + '">';
          h += (v === 'approve' ? '赞成' : '反对') + '</td></tr>';
        }
        h += '</table>';
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
  m.launchFailures = 0;
  m.launchAttempts = [];
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
    m.launchFailures++;

    if (m.launchFailures >= 5) {
      m.result = 'fail';
      m.failCount = 0;
      updateFinalTendencies();
      checkGameEnd();
      renderGame();
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
      // 已决定胜负，跳过反转确认直接推进游戏结束
      checkGameEnd();
      renderGame();
    } else {
      showLancelotFlipModal(state.currentRound);
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
    toast('坏人方成功破坏 3 轮任务！游戏结束');
    return;
  }
  if (successCount >= 3) {
    state.assassinTarget = null;
    state.assassinFromMission = true;
    stopTimer();
    showPage('end');
    return;
  }

  state.currentRound++;
  if (state.currentRound >= 5) state.currentRound = 4;
}

/* ==================== ASSASSIN PHASE (inline on end page) ==================== */
function renderEndAssassinPick() {
  var h = '<p class="sub">好人方已完成 3 轮任务，请刺客选择刺杀目标（可参考下方复盘信息）</p>';
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

function showLancelotFlipModal(roundNum) {
  var flips = state.lancelotFlipCount;
  var currentlyFlipped = (flips % 2 !== 0);
  var flipStatus = currentlyFlipped ? '（当前状态：已反转）' : '（当前状态：未反转）';
  showModal(
    '<h2>兰斯洛特反转卡</h2>' +
    '<p style="font-size:15px;text-align:center;margin:10px 0">第 ' + (roundNum + 1) + ' 轮结束，是否抽到反转卡？</p>' +
    '<p style="font-size:13px;text-align:center;color:var(--text-dim)">已抽到 ' + flips + ' 次 ' + flipStatus + '</p>' +
    '<p style="font-size:11px;text-align:center;color:var(--text-dim)">抽到2次恢复原阵营</p>' +
    '<div class="modal-actions">' +
    '<button class="btn primary" onclick="closeModal();applyLancelotFlip()">&#9989; 是，反转</button>' +
    '<button class="btn" onclick="closeModal();skipLancelotFlip()">&#10060; 否，不反转</button>' +
    '</div>'
  );
}

function applyLancelotFlip() {
  state.lancelotFlipCount++;
  state.lancelotFlipped = (state.lancelotFlipCount % 2 !== 0);
  if (state.currentRound >= 0 && state.currentRound < 5) {
    state.lancelotRoundFlips[state.currentRound] = true;
  }
  toast(state.lancelotFlipped ? '兰斯洛特阵营已反转（第 ' + state.lancelotFlipCount + ' 次）' : '兰斯洛特阵营恢复原状（反转2次）');
  checkGameEnd();
  renderGame();
}

function skipLancelotFlip() {
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
  toast(isMerlin ? '刺杀成功！反方获胜' : '刺杀失败！好人方获胜');
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
        votes: Object.keys(m.votes).reduce(function(acc, k) {
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
  toast('对局记录已保存');

  // 自动更新 data.json 以便云端同步
  var syncData = {
    avalon_name_pool: namePool,
    avalon_history_v2: history,
    avalon_last_game: JSON.parse(localStorage.getItem('avalon_last_game') || 'null')
  };
  updateLocalDataJson(syncData);

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

/* ==================== STATS PANEL ==================== */
function renderStats() {
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

  // Merlin assassination rate: count games where good won 3 missions and assassin guessed correctly
  var merlinGames = 0, merlinKilled = 0;
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    if (!rec.missions) continue;
    var sc = rec.missions.filter(function(m) { return m.result === 'success'; }).length;
    if (sc >= 3) {
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
      h += '<div style="margin-top:4px;font-size:11px;color:var(--text-dim)">刺杀：' + rec.assassinTarget + ' → ' + (rec.assassinSuccess ? '成功' : '失败') + '</div>';
    }
    h += '<div class="hci-actions">';
    h += '<button class="btn small" onclick="showGameDetail(' + i + ')">完整详情</button>';
    h += '<button class="btn small danger" onclick="deleteGameRecord(' + i + ')">删除</button>';
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

  // Win rate leaderboard - compact dual-column cards
  var lb = [];
  for (var nm in playerSet) {
    var items = playerSet[nm];
    var totalGames = items.length;
    var wins = 0;
    for (var g = 0; g < items.length; g++) {
      var faction = getFinalFaction(items[g].role, items[g].flipped);
      if (items[g].winner === faction) wins++;
    }
    var rate = totalGames > 0 ? wins / totalGames : 0;
    lb.push({ name: nm, total: totalGames, wins: wins, rate: rate });
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
    lh += '<div class="wc-sub">' + p.wins + '/' + p.total + '场</div></div>';
    lh += '</div>';
  }
  if (lb.length > 10) {
    lh += '<div style="text-align:center;margin-top:8px">';
    lh += '<button class="btn small" onclick="toggleLeaderboard()">' + (showAll ? '收起' : '展开全部（共' + lb.length + '名）') + '</button>';
    lh += '</div>';
  }
  if (lb.length === 0) {
    lh = '<div style="text-align:center;padding:16px;color:var(--text-dim)">暂无数据</div>';
  }
  $('win-rate-leaderboard').innerHTML = lh;
  renderSyncStatus();
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
    h += '<p><strong>刺杀目标：</strong>' + rec.assassinTarget + ' | <strong>结果：</strong>' + (rec.assassinSuccess ? '<span style="color:#ff9999">刺杀成功</span>' : '<span style="color:#99ff99">刺杀失败</span>') + '</p>';
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
  for (var i = 0; i < rec.missions.length; i++) {
    var m = rec.missions[i];
    h += '<div style="margin-bottom:4px">第' + (i + 1) + '轮 (需' + m.size + '人)：队长 ' + m.leader + ' | 队伍 ' + m.team.join('、') + ' | 结果 ' + (m.result === 'success' ? '成功' : '失败' + (m.failCount ? '(' + m.failCount + '票)' : ''));
    if (m.launchFailures) h += ' | 发车失败 ' + m.launchFailures + '次';
    h += '</div>';
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
    h += '<h3 style="margin-top:8px">刺杀</h3>';
    h += '<p style="font-size:13px">目标：' + rec.assassinTarget + '</p>';
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
  history.splice(idx, 1);
  saveHistory(history);

  // 同步更新 data.json 以便云端同步
  var syncData = {
    avalon_name_pool: JSON.parse(localStorage.getItem('avalon_name_pool') || '[]'),
    avalon_history_v2: history,
    avalon_last_game: JSON.parse(localStorage.getItem('avalon_last_game') || 'null')
  };
  updateLocalDataJson(syncData);

  toast('已删除该对局记录');
  renderStats();
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

  // 静默推送至本地 sync server
  fetch('http://localhost:8090/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  }).catch(function() {});

  // 更新本地 data.json 以便 git commit
  updateLocalDataJson(data);

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

function renderSyncStatus() {
  var el = $('sync-status-content');
  if (!el) return;
  var history = loadHistory();
  var cloudData = null;
  var cloudError = '';
  try {
    var raw = localStorage.getItem('avalon_sync_meta');
    if (raw) cloudData = JSON.parse(raw);
  } catch(e) {}

  var localGames = history.length;
  var cloudGames = 0;
  var lastSyncTime = '';
  var syncOk = false;

  if (cloudData && cloudData.cloudGames !== undefined) {
    cloudGames = cloudData.cloudGames;
    lastSyncTime = cloudData.lastCheck || '';
    syncOk = cloudData.syncOk === true;
  }

  // Also check data.json's local copy
  var dataJson = null;
  fetch('./data.json?t=' + Date.now()).then(function(res) {
    return res.json();
  }).then(function(d) {
    dataJson = d;
    updateSyncStatusDisplay(localGames, cloudGames, lastSyncTime, syncOk, dataJson, cloudError);
  }).catch(function() {
    updateSyncStatusDisplay(localGames, cloudGames, lastSyncTime, syncOk, null, '无法读取本地 data.json');
  });
}

function updateSyncStatusDisplay(localGames, cloudGames, lastSyncTime, syncOk, dataJson, cloudError) {
  var el = $('sync-status-content');
  if (!el) return;

  var djGames = 0;
  if (dataJson && dataJson.avalon_history_v2 && Array.isArray(dataJson.avalon_history_v2)) {
    djGames = dataJson.avalon_history_v2.length;
  }

  var h = '<div class="sync-stat-row"><span class="sync-key">本地 localStorage 对局数</span><span class="sync-val ok">' + localGames + ' 局</span></div>';
  h += '<div class="sync-stat-row"><span class="sync-key">本地 data.json 对局数</span><span class="sync-val ' + (djGames === localGames ? 'ok' : 'warn') + '">' + djGames + ' 局' + (djGames !== localGames ? ' (不同步！)' : '') + '</span></div>';
  h += '<div class="sync-stat-row"><span class="sync-key">上次云端检查</span><span class="sync-val">' + (lastSyncTime || '未检查') + '</span></div>';
  h += '<div class="sync-stat-row"><span class="sync-key">云端对局数</span><span class="sync-val ' + (cloudGames > 0 ? 'ok' : 'warn') + '">' + (lastSyncTime ? cloudGames + ' 局' : '未知') + '</span></div>';
  if (cloudError) {
    h += '<div class="sync-stat-row"><span class="sync-key">云端状态</span><span class="sync-val bad">读取失败</span></div>';
  }
  el.innerHTML = h;

  var hintEl = $('sync-hint-text');
  if (hintEl) {
    if (djGames !== localGames && localGames > 0) {
      hintEl.textContent = '⚠ data.json 与 localStorage 不同步！请点击"保存数据到本地文件"按钮同步，然后通过 git push 推送到 GitHub Pages。\n朋友访问地址：https://tangqign99.github.io/avalon-app/';
    } else if (localGames > 0) {
      hintEl.textContent = '数据文件已同步。推送到 GitHub 后，朋友刷新 https://tangqign99.github.io/avalon-app/ 点击"从云端同步"即可获取最新数据。';
    } else {
      hintEl.textContent = '暂无对局数据。开始游戏并保存记录后，将自动更新到本地数据文件。';
    }
  }
}

function pushDataToFile() {
  var data = {};
  var keys = ['avalon_name_pool', 'avalon_history_v2', 'avalon_last_game'];
  for (var i = 0; i < keys.length; i++) {
    var val = localStorage.getItem(keys[i]);
    if (val !== null) {
      try { data[keys[i]] = JSON.parse(val); } catch(e) { data[keys[i]] = val; }
    }
  }
  var json = JSON.stringify(data, null, 2);
  updateLocalDataJson(data);
  fetch('http://localhost:8090/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  }).then(function(res) {
    if (res.ok) {
      toast('data.json 已保存！运行 git push 或点击「同步」推送到云端');
    } else {
      downloadDataJsonFile(json);
      toast('data.json 已下载，请放入项目目录后 git push', 'warn');
    }
    renderSyncStatus();
  }).catch(function() {
    downloadDataJsonFile(json);
    toast('同步服务未运行。data.json 已下载，请放入项目目录（avalon-app/）后手动 git push', 'warn');
    renderSyncStatus();
  });
}

function updateLocalDataJson(data) {
  var json = JSON.stringify(data, null, 2);
  try {
    fetch('http://localhost:8090/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    }).then(function(res) {
      if (res.ok) {
        window._dataJsonSynced = true;
        window._lastDataJsonSave = Date.now();
        console.log('[sync] data.json saved via sync_server');
      }
    }).catch(function() {
      window._dataJsonSynced = false;
      window._pendingDataJson = json;
      // 只提示一次，避免每局都弹
      if (!window._syncWarningShown) {
        window._syncWarningShown = true;
        setTimeout(function() {
          toast('同步服务未运行。对局已保存到本地，点击统计页「保存数据到本地文件」可导出 data.json', 'warn');
        }, 1500);
      }
    });
  } catch(e) {}
}

function downloadDataJsonFile(json) {
  var blob = new Blob([json], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function syncFromCloud() {
  var meta = {
    lastCheck: new Date().toLocaleString('zh-CN'),
    syncOk: false,
    cloudGames: 0
  };
  showModal('<h2>从云端同步</h2><p style="font-size:14px;margin-bottom:10px">正在从 GitHub Pages 拉取最新数据...</p>');
  fetch('https://tangqign99.github.io/avalon-app/data.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) {
        if (res.status === 404) {
          closeModal();
          localStorage.setItem('avalon_sync_meta', JSON.stringify(meta));
          toast('云端暂无数据文件。请先在本地保存数据并推送到 GitHub。', 'info');
          renderSyncStatus();
          return;
        }
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || typeof data !== 'object') {
        toast('云端数据格式无效', 'warn'); closeModal(); renderSyncStatus(); return;
      }
      var validKeys = ['avalon_name_pool', 'avalon_history_v2', 'avalon_last_game'];
      var synced = 0;
      var cloudGameCount = 0;
      for (var i = 0; i < validKeys.length; i++) {
        var k = validKeys[i];
        if (k in data) {
          localStorage.setItem(k, JSON.stringify(data[k]));
          synced++;
          if (k === 'avalon_history_v2' && Array.isArray(data[k])) {
            cloudGameCount = data[k].length;
          }
        }
      }
      meta.syncOk = true;
      meta.cloudGames = cloudGameCount;
      localStorage.setItem('avalon_sync_meta', JSON.stringify(meta));
      if (synced === 0) { toast('云端未找到有效数据', 'warn'); closeModal(); renderSyncStatus(); return; }
      closeModal();
      toast('已同步 ' + synced + ' 项数据（云端 ' + cloudGameCount + ' 局）');
      renderSyncStatus();
      setTimeout(function() { location.reload(); }, 800);
    })
    .catch(function(err) {
      closeModal();
      localStorage.setItem('avalon_sync_meta', JSON.stringify(meta));
      toast('同步失败：' + err.message, 'warn');
      renderSyncStatus();
    });
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

  // 初始化时检测 localStorage 与 data.json 是否同步
  setTimeout(function() {
    var localGames = loadHistory().length;
    if (localGames === 0) return;
    fetch('data.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(dj) {
        var djGames = (dj && dj.avalon_history_v2 && Array.isArray(dj.avalon_history_v2)) ? dj.avalon_history_v2.length : 0;
        if (djGames < localGames) {
          // 尝试通过 sync_server 自动修复
          var autoData = {
            avalon_name_pool: JSON.parse(localStorage.getItem('avalon_name_pool') || '[]'),
            avalon_history_v2: loadHistory(),
            avalon_last_game: JSON.parse(localStorage.getItem('avalon_last_game') || 'null')
          };
          fetch('http://localhost:8090/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(autoData, null, 2)
          }).then(function(res) {
            if (res.ok) {
              toast('已自动修复 data.json（补充 ' + (localGames - djGames) + ' 条对局记录）', 'info');
            } else {
              showSyncMismatchWarning(localGames, djGames);
            }
          }).catch(function() {
            showSyncMismatchWarning(localGames, djGames);
          });
        }
      })
      .catch(function() {});
  }, 1500);

  function showSyncMismatchWarning(localGames, djGames) {
    window._syncWarningShown = true;
    setTimeout(function() {
      toast('⚠ data.json 缺少 ' + (localGames - djGames) + ' 条对局记录！请到统计页点击「保存数据到本地文件」同步，然后 git push 推送到云端', 'warn');
    }, 500);
  }
})();