/**
 * 참여형(Player) 참여코드 접수 / 응답 제출 / 최종 제출 / 순위
 */

function openParticipantSession_(quizNo) {
  getQuizRows_(quizNo);
  return upsertSession_(quizNo, 'participant', { status: 'open', currentIndex: 0 });
}

function claimCode_(quizNo, code) {
  code = String(code).trim();
  if (!code) throw new Error('참여코드를 입력하세요.');
  var session = getSession_(quizNo, 'participant');
  if (session.status === 'closed') throw new Error('참여가 마감되었습니다.');

  var sheet = getSheet_('participants');
  var rows = sheetToObjects_(sheet);
  var dup = rows.filter(function (r) { return String(r.quizNo) === String(quizNo) && String(r.code) === code; })[0];
  if (dup) throw new Error('이미 사용 중인 참여코드입니다. 다른 번호를 입력하세요.');

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
