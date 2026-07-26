/**
 * quiz 시트에서 회차별 문제 조회
 */

function getQuizRows_(quizNo) {
  var rows = sheetToObjects_(getSheet_('quiz')).filter(function (r) { return String(r.quizNo) === String(quizNo); });
  rows.sort(function (a, b) { return Number(a.order) - Number(b.order); });
  if (rows.length === 0) throw new Error('퀴즈번호 ' + quizNo + '에 해당하는 문제가 없습니다.');
  return rows;
}

function getQuizForHost_(quizNo) {
  var rows = getQuizRows_(quizNo);
  var settings = null;
  try { settings = getSettings_(quizNo); } catch (e) { /* optional */ }
  return {
    settings: settings,
    questions: rows.map(function (r) {
      return {
        order: r.order, question: r.question,
        choice1: r.choice1, choice2: r.choice2, choice3: r.choice3, choice4: r.choice4,
        answer: r.answer, points: r.points
      };
    })
  };
}

function getQuizForPlayer_(quizNo) {
  var rows = getQuizRows_(quizNo);
  return rows.map(function (r) {
    return {
      order: r.order, question: r.question,
      choice1: r.choice1, choice2: r.choice2, choice3: r.choice3, choice4: r.choice4,
      points: r.points
    };
  });
}
