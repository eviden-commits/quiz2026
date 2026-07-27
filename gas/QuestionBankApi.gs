/**
 * 문제은행(data 시트) 문제 일괄 추가
 */

function addQuestionsBatch_(p) {
  var questions = p.questions || [];
  if (!questions.length) throw new Error('추가할 문제가 없습니다.');

  var sheet = getSheet_('data');
  var existing = sheetToObjects_(sheet);
  var nextId = existing.reduce(function (max, r) { return Math.max(max, Number(r.id) || 0); }, 0) + 1;
  var headers = SHEETS.data;

  var rows = questions.map(function (q, idx) {
    var obj = {
      id: nextId + idx,
      category: q.category || '',
      question: q.question,
      choice1: q.choice1, choice2: q.choice2, choice3: q.choice3, choice4: q.choice4,
      answer: q.answer,
      points: q.points || 10,
      active: true
    };
    return headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return { added: rows.length };
}

/**
 * 배경 연출(매트릭스 레인)용 문제 텍스트 풀. 개인정보 없는 문제/문항 텍스트만 노출.
 */
function getQuestionPoolText_() {
  var rows = sheetToObjects_(getSheet_('data'));
  var parts = [];
  rows.forEach(function (r) {
    ['question', 'choice1', 'choice2', 'choice3', 'choice4'].forEach(function (k) {
      if (r[k]) parts.push(String(r[k]));
    });
  });
  var text = parts.join(' ').slice(0, 3000);
  return { text: text };
}
