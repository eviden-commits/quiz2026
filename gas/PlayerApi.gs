/**
 * 참여형(Player) 참여코드 접수 / 응답 제출 / 최종 제출 / 순위
 */

function openParticipantSession_(quizNo) {
  getQuizRows_(quizNo);
  var existing = getSession_(quizNo, 'participant');
  if (existing.status === 'closed') throw new Error('이미 마감된 회차입니다. 새 회차를 생성하세요. (재사용 불가)');
  return upsertSession_(quizNo, 'participant', { status: 'open', currentIndex: 0 });
}

function claimCode_(quizNo, code) {
  code = String(code).trim();
  if (!code) throw new Error('참여코드를 입력하세요.');
  var session = getSession_(quizNo, 'participant');
  if (session.status === 'closed') throw new Error('참여가 마감되었습니다.');

  var sheet = getSheet_('participants');
  var rows = sheetToObjects_(sheet);
  var row = rows.filter(function (r) { return String(r.quizNo) === String(quizNo) && String(r.code) === code; })[0];

  if (!row) throw new Error('유효하지 않은 참여코드입니다. 진행자에게 확인하세요.');
  if (row.status !== 'unassigned') throw new Error('이미 사용 중인 참여코드입니다. 다른 번호를 입력하세요.');

  updateRow_('participants', row._row, { startTime: new Date(), status: 'playing' });
  return { quizNo: quizNo, code: code };
}

function generateParticipantCodes_(p) {
  var quizNo = p.quizNo;
  var count = Number(p.count) || 10;
  var digits = Number(p.digits) || 4;
  var min = Math.pow(10, digits - 1);
  var max = Math.pow(10, digits) - 1;

  var sheet = getSheet_('participants');
  var existing = sheetToObjects_(sheet).filter(function (r) { return String(r.quizNo) === String(quizNo); });
  var used = {};
  existing.forEach(function (r) { used[String(r.code)] = true; });

  var codes = [];
  var attempts = 0;
  while (codes.length < count && attempts < count * 50) {
    attempts++;
    var candidate = String(Math.floor(min + Math.random() * (max - min + 1)));
    if (used[candidate]) continue;
    used[candidate] = true;
    codes.push(candidate);
  }
  if (codes.length < count) throw new Error('생성 가능한 코드 조합이 부족합니다. 자릿수를 늘려주세요.');

  codes.forEach(function (code) {
    appendObject_('participants', {
      quizNo: quizNo, code: code, name: '', correctCount: 0, score: 0,
      startTime: '', endTime: '', rank: '', status: 'unassigned'
    });
  });

  return { quizNo: quizNo, codes: codes };
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
