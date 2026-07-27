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
  var quizNo = generateQuizNo_();
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

/**
 * 진행 중에는 정답자를 화면(브라우저) 메모리에만 쌓아두고,
 * 퀴즈 종료 시 한 번에 배치로 저장해 매 등록마다 GAS 왕복이 생기지 않게 한다.
 */
function recordHostWinnersBatch_(p) {
  var quizNo = p.quizNo;
  var winners = p.winners || [];
  var recordedAt = new Date();
  var sheet = getSheet_('winners');
  var headers = SHEETS.winners;
  var rows = winners.map(function (w) {
    return headers.map(function (h) {
      if (h === 'quizNo') return quizNo;
      if (h === 'questionOrder') return w.questionOrder;
      if (h === 'name') return w.name;
      if (h === 'recordedAt') return recordedAt;
      return '';
    });
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
  return { saved: rows.length };
}

function getHostWinners_(quizNo) {
  return sheetToObjects_(getSheet_('winners')).filter(function (r) { return String(r.quizNo) === String(quizNo); });
}
