/**
 * 참여형(Player) 참여코드 접수 / 응답 제출 / 최종 제출 / 순위
 */

function generateRandomCode_(digits) {
  var min = Math.pow(10, digits - 1);
  var max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function openParticipantSession_(quizNo) {
  getQuizRows_(quizNo);
  var existing = getSession_(quizNo, 'participant');
  if (existing.status === 'closed') throw new Error('이미 마감된 회차입니다. 새 회차를 생성하세요. (재사용 불가)');
  // quizNo에서 유도(CC+YY)해 같은 날 다른 회차와 절대 겹치지 않게 한다.
  var accessCode = accessCodeFromQuizNo_(String(quizNo));
  return upsertSession_(quizNo, 'participant', { status: 'open', currentIndex: 0, accessCode: accessCode });
}

/**
 * 참석자는 진행자가 공지한 4자리 접속코드를 입력해 참여한다.
 * 접속코드는 회차 전체가 공유하며, 개인 식별용 내부 코드는 서버가 자동 발급한다.
 */
function joinWithAccessCode_(quizNo, accessCode) {
  accessCode = String(accessCode).trim();
  if (!accessCode) throw new Error('접속코드를 입력하세요.');
  var session = getSession_(quizNo, 'participant');
  if (session.status === 'closed') throw new Error('참여가 마감되었습니다.');
  if (session.status !== 'open') throw new Error('아직 참여가 시작되지 않았습니다.');
  if (String(session.accessCode).trim() !== accessCode) throw new Error('접속코드가 올바르지 않습니다. 진행자에게 확인하세요.');

  var existingRows = sheetToObjects_(getSheet_('participants')).filter(function (r) { return String(r.quizNo) === String(quizNo); });
  var used = {};
  existingRows.forEach(function (r) { used[String(r.code)] = true; });

  var code;
  var attempts = 0;
  do {
    code = generateRandomCode_(4);
    attempts++;
  } while (used[code] && attempts < 200);

  appendObject_('participants', {
    quizNo: quizNo, code: code, name: '', correctCount: 0, score: 0,
    startTime: new Date(), endTime: '', rank: '', status: 'playing'
  });
  return { quizNo: quizNo, code: code };
}

function getParticipantRow_(quizNo, code) {
  var rows = sheetToObjects_(getSheet_('participants'));
  var row = rows.filter(function (r) { return String(r.quizNo) === String(quizNo) && String(r.code) === String(code); })[0];
  if (!row) throw new Error('참여 정보를 찾을 수 없습니다. 참여코드를 다시 확인하세요.');
  return row;
}

function submitAnswer_(p) {
  var quizNo = p.quizNo, code = p.code;
  getParticipantRow_(quizNo, code); // validate participant exists
  var session = getSession_(quizNo, 'participant');
  if (session.status === 'closed') throw new Error('참여가 마감되어 더 이상 응답을 제출할 수 없습니다.');

  var quizRows = getQuizRows_(quizNo);
  var q = quizRows.filter(function (r) { return String(r.order) === String(p.order); })[0];
  if (!q) throw new Error('문항을 찾을 수 없습니다.');
  var correct = String(q.answer).trim() === String(p.selected).trim();

  var answersSheet = getSheet_('answers');
  var existingAnswers = sheetToObjects_(answersSheet).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && String(r.code) === String(code) && String(r.order) === String(p.order);
  });
  if (existingAnswers.length) {
    updateRow_('answers', existingAnswers[0]._row, { selected: p.selected, correct: correct, answeredAt: new Date() });
  } else {
    appendObject_('answers', { quizNo: quizNo, code: code, order: p.order, selected: p.selected, correct: correct, answeredAt: new Date() });
  }
  return { correct: correct, answer: q.answer };
}

function finalizeParticipant_(p) {
  var quizNo = p.quizNo, code = p.code, name = p.name;
  var participant = getParticipantRow_(quizNo, code);
  var answers = sheetToObjects_(getSheet_('answers')).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && String(r.code) === String(code);
  });
  var quizRows = getQuizRows_(quizNo);
  var pointsByOrder = {};
  quizRows.forEach(function (r) { pointsByOrder[r.order] = Number(r.points) || 10; });

  var correctCount = 0, score = 0;
  answers.forEach(function (a) {
    if (a.correct === true || a.correct === 'TRUE') {
      correctCount++;
      score += pointsByOrder[a.order] || 10;
    }
  });

  updateRow_('participants', participant._row, {
    name: name, correctCount: correctCount, score: score, endTime: new Date(), status: 'finished'
  });

  recomputeRanks_(quizNo);
  return { correctCount: correctCount, score: score, totalQuestions: quizRows.length };
}

function recomputeRanks_(quizNo) {
  var sheet = getSheet_('participants');
  var rows = sheetToObjects_(sheet).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && r.status === 'finished';
  });
  rows.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.endTime) - new Date(b.endTime); // 동점이면 먼저 끝낸 사람이 상위
  });
  rows.forEach(function (r, idx) {
    updateRow_('participants', r._row, { rank: idx + 1 });
  });
}

/**
 * 참석자 클로즈 시 상품 구간에 동률이 있는지 확인한다.
 * 점수만으로 그룹핑하고, winnerCount 이내 순위에 걸치는 2명 이상 그룹만 돌려준다.
 */
function getTieGroupsForPrizes_(quizNo) {
  var settings = null;
  try { settings = getSettings_(quizNo); } catch (e) { /* 사전설정 없으면 동률처리 불필요 */ }
  var winnerCount = settings ? Number(settings.winnerCount) || 0 : 0;

  var rows = sheetToObjects_(getSheet_('participants')).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && r.status === 'finished';
  });
  rows.sort(function (a, b) { return Number(b.score) - Number(a.score); });

  var groups = [];
  rows.forEach(function (r) {
    var last = groups[groups.length - 1];
    if (last && Number(last.score) === Number(r.score)) {
      last.members.push({ code: r.code, name: r.name, correctCount: r.correctCount, score: r.score });
    } else {
      groups.push({ score: r.score, members: [{ code: r.code, name: r.name, correctCount: r.correctCount, score: r.score }] });
    }
  });

  // 4위부터 랜덤배정 옵션이 켜져 있으면 상위 3위까지만 동률 추첨 대상으로 본다.
  // (4위 이하는 어차피 순서를 다시 섞을 것이므로 동률을 가려낼 필요가 없다)
  var tieZoneLimit = (settings && (settings.randomizeFrom4th === true || settings.randomizeFrom4th === 'TRUE'))
    ? Math.min(winnerCount, 3) : winnerCount;

  var tieGroups = [];
  var runningCount = 0;
  groups.forEach(function (g) {
    var start = runningCount + 1;
    runningCount += g.members.length;
    if (g.members.length > 1 && tieZoneLimit > 0 && start <= tieZoneLimit) {
      var neededCount = Math.min(g.members.length, tieZoneLimit - start + 1);
      tieGroups.push({ startRank: start, neededCount: neededCount, members: g.members });
    }
  });

  return { winnerCount: winnerCount, orderedCodes: rows.map(function (r) { return r.code; }), tieGroups: tieGroups };
}

/**
 * 동률 추첨(운명의 수레바퀴) 등으로 확정된 순서를 받아 rank를 일괄 반영한다.
 * randomizeFrom4th가 켜져 있으면 4위~수상자수 구간은 서버에서 다시 무작위로 섞는다.
 */
function finalizeRanks_(p) {
  var quizNo = p.quizNo;
  var orderedCodes = (p.orderedCodes || []).slice();
  var settings = null;
  try { settings = getSettings_(quizNo); } catch (e) { /* optional */ }
  var winnerCount = settings ? Number(settings.winnerCount) || 0 : 0;
  var randomizeFrom4th = settings && (settings.randomizeFrom4th === true || settings.randomizeFrom4th === 'TRUE');

  if (randomizeFrom4th && winnerCount > 3) {
    var start = 3, end = Math.min(winnerCount, orderedCodes.length); // index 3 = 4위
    var segment = orderedCodes.slice(start, end);
    for (var i = segment.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = segment[i]; segment[i] = segment[j]; segment[j] = tmp;
    }
    for (var k = 0; k < segment.length; k++) orderedCodes[start + k] = segment[k];
  }

  var rows = sheetToObjects_(getSheet_('participants')).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && r.status === 'finished';
  });
  var byCode = {};
  rows.forEach(function (r) { byCode[String(r.code)] = r; });

  orderedCodes.forEach(function (code, idx) {
    var r = byCode[String(code)];
    if (r) updateRow_('participants', r._row, { rank: idx + 1 });
  });

  return getLeaderboard_(quizNo);
}

/**
 * 행운상: 순위(1~winnerCount)와 무관하게 완료자 중에서 무작위로 luckyCount명을 뽑는다.
 * 이미 순위 상품을 받은 사람은 중복 당첨되지 않도록 제외한다.
 */
function drawLuckyWinners_(quizNo) {
  var settings = null;
  try { settings = getSettings_(quizNo); } catch (e) { return { drawn: [] }; }
  var luckyEnabled = settings && (settings.luckyEnabled === true || settings.luckyEnabled === 'TRUE');
  var luckyCount = settings ? Number(settings.luckyCount) || 0 : 0;
  if (!luckyEnabled || luckyCount <= 0) return { drawn: [] };

  var winnerCount = Number(settings.winnerCount) || 0;
  var pool = sheetToObjects_(getSheet_('participants')).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && r.status === 'finished' && Number(r.rank) > winnerCount;
  });

  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  var drawn = pool.slice(0, Math.min(luckyCount, pool.length));
  var drawnAt = new Date();
  drawn.forEach(function (r) {
    appendObject_('luckyWinners', { quizNo: quizNo, code: r.code, name: r.name, drawnAt: drawnAt });
  });

  return { drawn: drawn.map(function (r) { return { code: r.code, name: r.name }; }) };
}

function getLeaderboard_(quizNo) {
  var rows = sheetToObjects_(getSheet_('participants')).filter(function (r) {
    return String(r.quizNo) === String(quizNo) && r.status === 'finished';
  });
  rows.sort(function (a, b) { return Number(a.rank) - Number(b.rank); });
  var settings = null;
  try { settings = getSettings_(quizNo); } catch (e) { /* optional */ }
  return {
    settings: settings,
    ranking: rows.map(function (r) {
      return { rank: r.rank, name: r.name, correctCount: r.correctCount, score: r.score, code: r.code };
    })
  };
}
