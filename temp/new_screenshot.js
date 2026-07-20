function generateGameScreenshot(idx) {
  var history = loadHistory();
  if (idx < 0 || idx >= history.length) { alert('无效记录'); return; }
  var recRaw = history[idx];
  var rec = normalizeRecord(recRaw);
  if (!rec) { alert('记录解析失败'); return; }

  var W = 750;
  var PAD = 28;
  var contentW = W - PAD * 2;

  var canvas = document.createElement('canvas');
  canvas.width = W;
  var ctx = canvas.getContext('2d');

  var ids = rec.identities || [];
  var pc = ids.length;
  function pn(idx) { return (idx + 1) + '\u53f7 ' + ids[idx].name; }
  function pnShort(idx) { return (idx + 1) + ids[idx].name; }
  function isEvil(idx) { return getPlayerFaction(ids[idx].role) === 'evil'; }
  function evilColor(idx) { return isEvil(idx) ? '#e74c3c' : '#e8dcc8'; }

  // Build per-player vote display with evil highlighting
  function voteSegments(votes, sz) {
    var segs = [];
    for (var i = 0; i < pc; i++) {
      var v = null;
      if (votes[i] !== undefined) v = votes[i];
      else if (votes[String(i)] !== undefined) v = votes[String(i)];
      var vChar = v === 'approve' ? '\u2713' : v === 'reject' ? '\u2717' : '?';
      var c = v === 'approve' ? '#2ecc71' : v === 'reject' ? '#e74c3c' : '#7a6e5e';
      segs.push({ text: pnShort(i) + vChar + ' ', color: evilColor(i) });
      segs.push({ text: '', color: c });
      // Store vote char separately - actually combine name+vote with name color for evil
    }
    return segs;
  }

  function dtSegments(x, y, segs, sz) {
    ctx.font = sz + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.textBaseline = 'top';
    var cx = x;
    for (var si = 0; si < segs.length; si++) {
      ctx.fillStyle = segs[si].color || TXT;
      ctx.textAlign = 'left';
      ctx.fillText(segs[si].text, cx, y);
      cx += tw(segs[si].text, sz);
    }
    return cx;
  }

  var GOLD = '#f4d03f';
  var GREEN = '#27ae60';
  var GREEN_BRIGHT = '#2ecc71';
  var RED = '#e74c3c';
  var BLUE = '#5dade2';
  var TXT = '#e8dcc8';
  var TXT_SEC = '#a89070';
  var TXT_DIM = '#7a6e5e';

  function tw(text, size) {
    ctx.font = size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    return ctx.measureText(text).width;
  }
  function dt(text, x, y, size, color, align) {
    ctx.font = size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
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
    var f = getPlayerFaction(ids[pi].role);
    if (f === 'good') goodPlayers.push(pn(pi));
    else if (f === 'evil') evilPlayers.push(pn(pi));
  }
  var doneMissions = 0, failMissions = 0;
  for (var mi2 = 0; mi2 < (rec.missions || []).length; mi2++) {
    if (rec.missions[mi2].result === 'success') doneMissions++;
    else if (rec.missions[mi2].result === 'fail') failMissions++;
  }

  // Compute mission section height per card
  function calcMissionCardH(m, qi) {
    var attempts = m.launchAttempts || [];
    if (attempts.length === 0) attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
    var h = 10 + 18 + 6; // card padding top + title + gap
    for (var a = 0; a < attempts.length; a++) {
      var att = attempts[a];
      var line1 = '\u7b2c' + (a + 1) + '\u6b21\u7ec4\u961f \u2605' + pnShort(att.leader) + '\u63d0\u8bae\uff1a';
      for (var ti = 0; ti < (att.team || []).length; ti++) {
        if (ti > 0) line1 += '\u3001';
        line1 += pnShort(att.team[ti]);
      }
      h += 18; // attempt header line
      // Vote line
      var voteLine = '\u6295\u7968\uff1a';
      for (var vi = 0; vi < pc; vi++) {
        var vv = null;
        if (att.votes[vi] !== undefined) vv = att.votes[vi];
        else if (att.votes[String(vi)] !== undefined) vv = att.votes[String(vi)];
        voteLine += pnShort(vi) + (vv === 'approve' ? '\u2713' : vv === 'reject' ? '\u2717' : '?') + ' ';
      }
      var approves = 0, rejects = 0;
      for (var vi2 = 0; vi2 < pc; vi2++) {
        var vv2 = null;
        if (att.votes[vi2] !== undefined) vv2 = att.votes[vi2];
        else if (att.votes[String(vi2)] !== undefined) vv2 = att.votes[String(vi2)];
        if (vv2 === 'approve') approves++; else if (vv2 === 'reject') rejects++;
      }
      var passed = approves > pc / 2;
      voteLine += ' \u2014 ' + approves + ':' + rejects + ' ' + (passed ? '\u901a\u8fc7' : '\u5426\u51b3') + ' ' + (passed ? '\u2713' : '\u2717');
      if (tw(voteLine, 10) > contentW - 28) {
        h += 34; // 2 lines
      } else {
        h += 16;
      }
      h += 2;
    }
    // Result line
    if (m.result) {
      h += 18 + 10;
    }
    return h;
  }

  // Compute layout
  var secH = [];
  secH.push(28 + 8 + 26 + 4 + 16 + 16); // 0 header
  secH.push(16); // 1 divider
  secH.push(20 + Math.ceil(pc / 2) * 28 + 4); // 2 players
  secH.push(16); // 3 divider
  var questH = 20 + 12;
  if (rec.missions) {
    for (var qi = 0; qi < rec.missions.length; qi++) {
      var m = rec.missions[qi];
      if (!m.result) continue;
      questH += calcMissionCardH(m, qi) + 8;
    }
    questH -= 8;
  }
  secH.push(questH + 8); // 4
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
  secH.push(12); // bottom divider
  secH.push(18 + 6 + 36 + 16 + 20); // summary + watermark

  var totalH = PAD * 2;
  for (var si = 0; si < secH.length; si++) totalH += secH[si];
  canvas.height = Math.ceil(totalH);

  // ==== DRAW ====
  var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1a0e30');
  grad.addColorStop(0.4, '#120926');
  grad.addColorStop(1, '#0d0617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    dt('\u7b2c' + (idx + 1) + '\u5c40 \u00b7 \u963f\u74e6\u9686', W/2, ty, 20, GOLD, 'center');

    var iy = ty + 26 + 4;
    var infoText = (rec.date || '--') + ' \u00b7 ' + (rec.playerCount || '?') + '\u4eba\u5c40';
    dt(infoText, W/2, iy, 11, TXT_DIM, 'center');
  })();
  y += secH[si++];

  // === Divider ===
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.3, '#5b3d8e');
    g.addColorStop(0.7, '#5b3d8e');
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, dy);
    ctx.lineTo(W - PAD, dy);
    ctx.stroke();
  })();
  y += secH[si++];

  // === Identity Reveal ===
  (function() {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    dt('\u8eab\u4efd\u63ed\u6653', PAD + 12, y + 1, 13, TXT_SEC, 'left');

    var gridY = y + 20;
    var colW = (contentW - 12) / 2;
    for (var pi = 0; pi < pc; pi++) {
      var col = pi % 2;
      var row = Math.floor(pi / 2);
      var px = PAD + col * (colW + 12);
      var py = gridY + row * 28;
      var id = ids[pi];
      var faction = getPlayerFaction(id.role);
      var evil = faction === 'evil';

      ctx.fillStyle = evil ? 'rgba(192,57,43,0.08)' : 'rgba(39,174,96,0.08)';
      rr(px, py, colW, 24, 6);
      ctx.fill();

      dt(evil ? '\u25b2' : '\u2b22', px + 8, py + 5, 10, evil ? RED : BLUE, 'left');
      dt(pn(pi), px + 22, py + 4, 13, TXT, 'left');

      var roleW = tw(id.role || '', 11);
      dt(id.role || '', px + colW - 8 - roleW, py + 5, 11, evil ? RED : BLUE, 'left');
    }
  })();
  y += secH[si++];

  // === Divider ===
  (function() {
    var dy = y + 8;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.3, '#5b3d8e');
    g.addColorStop(0.7, '#5b3d8e');
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, dy);
    ctx.lineTo(W - PAD, dy);
    ctx.stroke();
  })();
  y += secH[si++];

  // === Missions ===
  (function() {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    dt('\u4efb\u52a1\u5386\u7a0b', PAD + 12, y + 1, 13, TXT_SEC, 'left');

    var qy = y + 20 + 12;
    for (var qi = 0; qi < rec.missions.length; qi++) {
      var m = rec.missions[qi];
      if (!m.result) { qy += 8; continue; }

      var isSuc = m.result === 'success';
      var isShielded = m.result === 'success' && m.shieldedFails;
      var isPureSuc = m.result === 'success' && !m.failCount && !m.shieldedFails;

      var attempts = m.launchAttempts || [];
      if (attempts.length === 0) {
        attempts = [{ leader: m.leader, team: m.team, votes: m.votes || {} }];
      }

      var cardH = calcMissionCardH(m, qi);
      var cx = PAD + 16;

      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      rr(PAD, qy, contentW, cardH, 8);
      ctx.fill();

      // Left color bar
      ctx.fillStyle = isSuc ? GREEN : RED;
      rr(PAD, qy + 10, 3, cardH - 20, 1.5);
      ctx.fill();

      // Title row
      dt('\u4efb\u52a1 ' + (qi + 1) + ' \u00b7 ' + m.size + '\u4eba\u51fa\u6218', cx, qy + 10, 13, TXT_SEC, 'left');

      // Tag
      var tagText = isShielded ? ('\u2713 \u6210\u529f\uff08\u542b' + m.shieldedFails + '\u5f20\u5931\u8d25\u7968\uff09') : isPureSuc ? '\u2713 \u6210\u529f\uff08\u5168\u7968\u901a\u8fc7\uff09' : isSuc ? '\u2713 \u6210\u529f' : '\u2717 \u5931\u8d25';
      var tagW = tw(tagText, 11) + 16;
      var tagX = PAD + contentW - 16 - tagW;
      ctx.fillStyle = isSuc ? 'rgba(39,174,96,0.2)' : 'rgba(192,57,43,0.2)';
      rr(tagX, qy + 9, tagW, 18, 9);
      ctx.fill();
      dt(tagText, PAD + contentW - 16 - tagW / 2, qy + 11, 11, isSuc ? GREEN_BRIGHT : RED, 'center');

      var ay = qy + 10 + 18 + 8;

      // Render each launch attempt
      for (var a = 0; a < attempts.length; a++) {
        var att = attempts[a];
        var isLastAttempt = (a === attempts.length - 1);

        // Count votes
        var approves = 0, rejects = 0;
        for (var vk = 0; vk < pc; vk++) {
          var vv = null;
          if (att.votes[vk] !== undefined) vv = att.votes[vk];
          else if (att.votes[String(vk)] !== undefined) vv = att.votes[String(vk)];
          if (vv === 'approve') approves++;
          else if (vv === 'reject') rejects++;
        }
        var passed = approves > pc / 2;

        // Attempt header: "第N次组队 ★X号NAME提议：A、B、C"
        var leader = (typeof att.leader === 'number') ? att.leader : 0;
        var teamIndices = att.team || [];
        if (typeof teamIndices[0] === 'string') {
          // Some legacy data may have string indices
          teamIndices = teamIndices.map(function(x) { return parseInt(x); });
        }
        var headerText = '\u7b2c' + (a + 1) + '\u6b21\u7ec4\u961f \u2605' + pnShort(leader) + '\u63d0\u8bae\uff1a';
        var headerSegs = [
          { text: '\u7b2c' + (a + 1) + '\u6b21\u7ec4\u961f ', color: TXT_DIM },
          { text: '\u2605' + pnShort(leader), color: GOLD },
          { text: '\u63d0\u8bae\uff1a', color: TXT_DIM }
        ];
        for (var ti = 0; ti < teamIndices.length; ti++) {
          var tiVal = (typeof teamIndices[ti] === 'number') ? teamIndices[ti] : parseInt(teamIndices[ti]);
          if (ti > 0) headerSegs.push({ text: '\u3001', color: TXT_DIM });
          headerSegs.push({ text: pnShort(tiVal), color: evilColor(tiVal) });
        }

        // Draw attempt header - dimmed for rejected attempts
        var headerColor = passed || isLastAttempt ? TXT : TXT_DIM;
        dtSegments(cx, ay, headerSegs, 11);
        ay += 18;

        // Vote line: "投票：1振宁✓ 2老板✓ 3如意✓ 4卢艺✗ ... — A:R 通过/否决 ✓/✗"
        var voteSegs = [];
        voteSegs.push({ text: '\u6295\u7968\uff1a', color: TXT_DIM });
        for (var vi = 0; vi < pc; vi++) {
          var vv = null;
          if (att.votes[vi] !== undefined) vv = att.votes[vi];
          else if (att.votes[String(vi)] !== undefined) vv = att.votes[String(vi)];
          var vChar = vv === 'approve' ? '\u2713' : vv === 'reject' ? '\u2717' : '?';
          var nameColor = evilColor(vi);
          voteSegs.push({ text: pnShort(vi), color: nameColor });
          voteSegs.push({ text: vChar + ' ', color: vv === 'approve' ? GREEN_BRIGHT : vv === 'reject' ? RED : TXT_DIM });
        }
        var resultLabel = passed ? '\u901a\u8fc7' : '\u5426\u51b3';
        var resultMark = passed ? '\u2713' : '\u2717';
        voteSegs.push({ text: ' \u2014 ' + approves + ':' + rejects + ' ' + resultLabel + ' ' + resultMark, color: passed ? GREEN_BRIGHT : RED });

        // Measure and draw vote line, wrapping if needed
        var voteText = '';
        for (var vsi = 0; vsi < voteSegs.length; vsi++) voteText += voteSegs[vsi].text;
        var voteSingleW = tw(voteText, 10);
        if (voteSingleW > contentW - 28) {
          // Wrap: draw in two lines - votes first, then result
          var voteLine1Segs = [voteSegs[0]]; // "投票："
          for (var vi = 0; vi < pc; vi++) {
            voteLine1Segs.push(voteSegs[vi * 2 + 1]);
            voteLine1Segs.push(voteSegs[vi * 2 + 2]);
          }
          dtSegments(cx, ay, voteLine1Segs, 10);
          ay += 16;
          dtSegments(cx, ay, [voteSegs[voteSegs.length - 1]], 10);
          ay += 18 + 2;
        } else {
          dtSegments(cx, ay, voteSegs, 10);
          ay += 16 + 2;
        }
      }

      // Mission result line
      if (m.result) {
        if (m.result === 'fail') {
          var failStr = '\u4efb\u52a1\u7ed3\u679c\uff1a\u2717 \u5931\u8d25';
          if (m.failCount) failStr += '\uff08' + m.failCount + '\u5f20\u5931\u8d25\u5361\uff09';
          dt(failStr, cx, ay, 12, RED, 'left');
        } else if (isShielded) {
          var shieldStr = '\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f\uff08\u542b' + m.shieldedFails + '\u5f20\u5931\u8d25\u7968\uff0c\u4fdd\u62a4\u8f6e\u62b5\u6d88\uff09';
          dt(shieldStr, cx, ay, 12, '#e65100', 'left');
        } else if (isPureSuc) {
          dt('\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f\uff08\u5168\u7968\u901a\u8fc7\uff09', cx, ay, 12, GREEN_BRIGHT, 'left');
        } else {
          dt('\u4efb\u52a1\u7ed3\u679c\uff1a\u2713 \u6210\u529f', cx, ay, 12, GREEN_BRIGHT, 'left');
        }
        ay += 18 + 10;
      }

      qy += cardH + 8;
    }
  })();
  y += secH[si++];

  // === Optional Rules ===
  if (hasAnyRule) {
    (function() {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(PAD + 3, y + 7, 3, 0, Math.PI * 2);
      ctx.fill();
      var sectionLabel = hasAssassin ? '\u523a\u6740\u9636\u6bb5' : '\u53ef\u9009\u89c4\u5219';
      dt(sectionLabel, PAD + 12, y + 1, 13, TXT_SEC, 'left');
      var ry = y + 20 + 8;

      if (hasLady) {
        for (var li = 0; li < rec.ladyCheckHistory.length; li++) {
          var lc = rec.ladyCheckHistory[li];
          var holder = (lc.holder != null) ? lc.holder : 0;
          var target = (lc.target != null) ? lc.target : 0;
          var holderLabel = pn(holder);
          var targetLabel = pn(target);
          var roundLabel = lc.round ? '\u7b2c' + lc.round + '\u8f6e\u540e\uff1a' : '';
          dt(roundLabel + holderLabel + ' \u67e5\u9a8c ' + targetLabel + ' \u2192 ' + (lc.result || '?'), PAD + 12, ry, 12, TXT_SEC, 'left');
          ry += 18;
        }
        ry += 4;
      }

      if (hasExcalibur) {
        for (var exi = 0; exi < rec.excaliburHistory.length; exi++) {
          var ex = rec.excaliburHistory[exi];
          var holderLabel = (ex.holderName ? pn(ex.holder) : '') || '';
          var targetLabel = (ex.targetName ? pn(ex.target) : '') || '';
          var desc = '\u738b\u8005\u4e4b\u5251\uff1a' + (ex.holderName || '') + ' \u6388\u4e88 ' + (ex.targetName || '') + (ex.used ? '\uff08\u5df2\u4f7f\u7528\uff09' : '\uff08\u672a\u4f7f\u7528\uff09');
          dt(desc, PAD + 12, ry, 12, TXT_SEC, 'left');
          ry += 18;
        }
        ry += 4;
      }

      if (hasLancelot) {
        for (var lfKey in rec.lancelotFlips) {
          if (ids[lfKey]) {
            var player = ids[lfKey];
            var pIndex = (player.index != null ? player.index : parseInt(lfKey));
            var origRole = player.role || '';
            var origFaction = getPlayerFaction(origRole);
            var shortRole = origRole;
            var afterLabel = (origFaction === 'good') ? '\u7ea2\u65b9(\u574f\u4eba)' : (origFaction === 'evil') ? '\u84dd\u65b9(\u597d\u4eba)' : '?';
            dt('\u5170\u65af\u6d1b\u7279\u53d8\u8282: ' + pn(pIndex) + ' ' + shortRole + ' \u2192 ' + afterLabel, PAD + 12, ry, 12, '#e65100', 'left');
            ry += 18;
          }
        }
        ry += 4;
      }

      if (hasAssassin) {
        var aboxY = ry - 4;
        var aboxH = 18 + 18 + 18 + 10;
        ctx.fillStyle = 'rgba(192,57,43,0.08)';
        rr(PAD, aboxY, contentW, aboxH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(192,57,43,0.25)';
        ctx.lineWidth = 1;
        rr(PAD, aboxY, contentW, aboxH, 8);
        ctx.stroke();

        dt('\u597d\u4eba\u5b8c\u6210' + doneMissions + '\u6b21\u4efb\u52a1 \u2192 \u8fdb\u5165\u523a\u6740\u9636\u6bb5', PAD + 12, aboxY + 6, 12, RED, 'left');
        dt('\u523a\u5ba2\u731c\u6d4b\u6885\u6797\u662f ' + (rec.assassinTarget || ''), PAD + 12, aboxY + 6 + 18, 12, TXT, 'left');
        var hitText = rec.assassinSuccess ? '\u731c\u5bf9\u4e86!' : '\u731c\u9519\u4e86!';
        var hitColor = rec.assassinSuccess ? RED : GREEN_BRIGHT;
        dt(hitText, PAD + 12 + tw('\u523a\u5ba2\u731c\u6d4b\u6885\u6797\u662f ' + (rec.assassinTarget || ''), 12), aboxY + 6 + 18, 12, hitColor, 'left');
        dt(rec.assassinSuccess ? '\u574f\u4eba\u901a\u8fc7\u523a\u6740\u6885\u6797\u9006\u8f6c\u83b7\u80dc' : '\u597d\u4eba\u62b5\u5fa1\u523a\u6740\u83b7\u80dc', PAD + 12, aboxY + 6 + 36, 11, TXT_DIM, 'left');
        ry = aboxY + aboxH + 4;
      }

      if (hasForceEnd) {
        dt('\u5f3a\u5236\u7ed3\u675f: ' + (rec.forceEndReason || '\u672a\u77e5\u539f\u56e0'), PAD + 12, ry, 12, '#e65100', 'left');
        ry += 18 + 4;
      }

      if (hasIdentityMarks) {
        for (var mi3 = 0; mi3 < rec.identityMarks.length; mi3++) {
          var mk = rec.identityMarks[mi3];
          var lvlLabel = mk.level === 'high' ? '\u9ad8' : mk.level === 'mid' ? '\u4e2d' : '\u4f4e';
          dt((mk.targetName || mk.target) + ' [' + lvlLabel + ']', PAD + 12, ry, 12, TXT_SEC, 'left');
          ry += 18;
        }
      }
    })();
    y += secH[si++];
  }

  // === Bottom Divider ===
  (function() {
    var dy = y + 6;
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.3, '#5b3d8e');
    g.addColorStop(0.7, '#5b3d8e');
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, dy);
    ctx.lineTo(W - PAD, dy);
    ctx.stroke();
  })();
  y += secH[si++];

  // === Footer with summary + watermark ===
  (function() {
    dt('\u4efb\u52a1\uff1a' + doneMissions + '\u2713 ' + failMissions + '\u2717', PAD, y, 12, TXT_DIM, 'left');
    dt('\u597d\u4eba\u9635\u7ebf\uff1a' + goodPlayers.join('\u3001'), PAD, y + 18, 12, TXT_DIM, 'left');
    dt('\u574f\u4eba\u9635\u7ebf\uff1a' + evilPlayers.join('\u3001'), PAD, y + 36, 12, TXT_DIM, 'left');

    var wy = canvas.height - PAD;
    ctx.fillStyle = '#5a4e3e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '10px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.fillText('\u963f\u74e6\u9686 \u00b7 The Resistance Avalon', W / 2, wy);
  })();

  // Export
  canvas.toBlob(function(blob) {
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
}
