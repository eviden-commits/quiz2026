/**
 * 사전설정(퀴즈갯수/상품/수상자수) 및 data → quiz 시트 회차 출제
 */

function getSettings_(quizNo) {
  var rows = sheetToObjects_(getSheet_('settings'));
  var row = rows.filter(function (r) { return String(r.quizNo) === String(quizNo); })[0];
  if (!row) throw new Error('설정을 찾을 수 없습니다 (퀴즈번호 ' + quizNo + ')');
  return row;
}

function listSettings_() {
  return sheetToObjects_(getSheet_('settings'));
}

/**
 * 관리자 화면의 "지난회차 결과" 목록용. 최근 생성 순으로 정렬.
 */
function listPastRounds_() {
  var rows = sheetToObjects_(getSheet_('settings'));
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return rows.map(function (r) {
    return { quizNo: r.quizNo, title: r.title, siteName: r.siteName, createdAt: r.createdAt };
  });
}

function listQuizNos_() {
  var rows = sheetToObjects_(getSheet_('quiz'));
  var set = {};
  rows.forEach(function (r) { set[String(r.quizNo)] = true; });
  return Object.keys(set);
}

function saveSettings_(p) {
  var sheet = getSheet_('settings');
  var rows = sheetToObjects_(sheet);
  var existing = rows.filter(function (r) { return String(r.quizNo) === String(p.quizNo); })[0];
  var obj = {
    quizNo: p.quizNo,
    siteName: p.siteName !== undefined ? p.siteName : (existing ? existing.siteName : ''),
    title: p.title || ('퀴즈 ' + p.quizNo),
    quizCount: p.quizCount || (existing ? existing.quizCount : 0),
    prizeCount: p.prizeCount || 0,
    winnerCount: p.winnerCount || 0,
    prizeNames: p.prizeNames || '',
    timeLimitSec: p.timeLimitSec || 0,
    randomizeFrom4th: p.randomizeFrom4th !== undefined ? !!p.randomizeFrom4th : (existing ? existing.randomizeFrom4th : false),
    luckyEnabled: p.luckyEnabled !== undefined ? !!p.luckyEnabled : (existing ? existing.luckyEnabled : false),
    luckyCount: p.luckyCount !== undefined ? p.luckyCount : (existing ? existing.luckyCount : 0),
    createdAt: existing ? existing.createdAt : new Date()
  };
  if (existing) {
    updateRow_('settings', existing._row, obj);
  } else {
    appendObject_('settings', obj);
  }
  return obj;
}

/**
 * 회차 번호 생성 규칙: X + YY + MM + DD + HH + mm + CC (총 13자리)
 *  X  = 짝수년도면 1, 홀수년도면 2 (예: 2026 -> 1)
 *  YY = 연도 뒤 2자리
 *  CC = 오늘 생성된 회차 순번 (01부터)
 * 접속코드(4자리)는 CC+YY로 유도해 같은 날 발급되는 코드끼리 충돌하지 않게 한다.
 */
function pad2_(n) { return (n < 10 ? '0' : '') + n; }

function generateQuizNo_() {
  var now = new Date();
  var year = now.getFullYear();
  var X = (year % 2 === 0) ? '1' : '2';
  var YY = String(year).slice(-2);
  var MM = pad2_(now.getMonth() + 1);
  var DD = pad2_(now.getDate());
  var HH = pad2_(now.getHours());
  var mm = pad2_(now.getMinutes());

  var todayStr = now.toDateString();
  var rows = sheetToObjects_(getSheet_('settings'));
  var countToday = rows.filter(function (r) {
    return r.createdAt && new Date(r.createdAt).toDateString() === todayStr;
  }).length;
  var CC = pad2_(countToday + 1);

  return X + YY + MM + DD + HH + mm + CC;
}

function accessCodeFromQuizNo_(quizNo) {
  var CC = quizNo.slice(-2);
  var YY = quizNo.slice(1, 3);
  return CC + YY;
}

function listDataCategories_() {
  var rows = sheetToObjects_(getSheet_('data'));
  var set = {};
  rows.forEach(function (r) { if (r.category) set[r.category] = true; });
  return Object.keys(set);
}

function generateQuizSet_(p) {
  var quizNo = p.quizNo;
  var count = Number(p.count) || 10;
  var category = p.category || '';

  var dataRows = sheetToObjects_(getSheet_('data')).filter(function (r) {
    if (r.active === false || r.active === 'FALSE') return false;
    if (category && String(r.category) !== String(category)) return false;
    return true;
  });
  if (dataRows.length === 0) throw new Error('data 시트에 사용 가능한 문제가 없습니다.');

  // shuffle
  for (var i = dataRows.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = dataRows[i]; dataRows[i] = dataRows[j]; dataRows[j] = tmp;
  }
  var picked = dataRows.slice(0, Math.min(count, dataRows.length));

  var quizSheet = getSheet_('quiz');
  // remove existing rows for this quizNo
  var existingRows = sheetToObjects_(quizSheet).filter(function (r) { return String(r.quizNo) === String(quizNo); });
  existingRows.sort(function (a, b) { return b._row - a._row; });
  existingRows.forEach(function (r) { quizSheet.deleteRow(r._row); });

  picked.forEach(function (row, idx) {
    appendObject_('quiz', {
      quizNo: quizNo,
      order: idx + 1,
      question: row.question,
      choice1: row.choice1,
      choice2: row.choice2,
      choice3: row.choice3,
      choice4: row.choice4,
      answer: row.answer,
      points: row.points || 10
    });
  });

  saveSettings_({ quizNo: quizNo, quizCount: picked.length });
  return { quizNo: quizNo, count: picked.length };
}

/**
 * 참여형: 퀴즈번호를 직접 입력하지 않고 문항 수만으로 새 회차를 자동 생성한다.
 */
function createParticipantRound_(p) {
  var quizNo = generateQuizNo_();
  return generateQuizSet_({ quizNo: quizNo, count: p.count, category: p.category });
}
