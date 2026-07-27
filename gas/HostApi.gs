/**
 * 진행자형(Host) 진행 제어
 */

function startHostSession_(quizNo) {
  getQuizRows_(quizNo); // validate exists
  return upsertSession_(quizNo, 'host', { status: 'open', currentIndex: 0 });
}

/**
 * 진행자형: 퀴즈번호 없이 문항 수만 받아 data 시트에서 랜덤 출제하고 바로 세션을 시작한다.
 */
function startHostRandomQuiz_(p) {
  var quizNo = 'H' + new Date().getTime();
  var gen = generateQuizSet_({ quizNo: quizNo, count: p.count, category: p.category });
  var session = startHostSession_(quizNo);
  var quiz = getQuizForHost_(quizNo);
  return { quizNo: quizNo, count: gen.count, settings: quiz.settings, questions: quiz.questions, session: session };
}

function hostSetIndex_(quizNo, index) {
  var rows = getQuizRows_(quizNo);
  var idx = Math.max(0, Math.min(Number(index), rows.length - 1));
  var status = Number(index) >= rows.length ? 'closed' : 'open';
  return upsertSession_(quizNo, 'host', { currentIndex: idx, status: status });
}

function recordHostWinner_(p) {
  appendObject_('winners', {
    quizNo: p.quizNo, questionOrder: p.questionOrder, name: p.name, recordedAt: new Date()
  });
  return { ok: true };
}

function getHostWinners_(quizNo) {
  return sheetToObjects_(getSheet_('winners')).filter(function (r) { return String(r.quizNo) === String(quizNo); });
}
