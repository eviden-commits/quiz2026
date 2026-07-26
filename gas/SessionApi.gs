/**
 * 진행 상태 관리 (호스트 진행 세션 / 참여형 접수 세션 공용)
 */

function getSessionRow_(quizNo, mode) {
  var rows = sheetToObjects_(getSheet_('sessions'));
  return rows.filter(function (r) { return String(r.quizNo) === String(quizNo) && r.mode === mode; })[0];
}

function getSession_(quizNo, mode) {
  var row = getSessionRow_(quizNo, mode);
  if (!row) return { quizNo: quizNo, mode: mode, status: 'ready', currentIndex: 0 };
  return row;
}

function upsertSession_(quizNo, mode, patch) {
  var existing = getSessionRow_(quizNo, mode);
  var obj = {
    quizNo: quizNo, mode: mode,
    status: (existing && existing.status) || 'ready',
    currentIndex: (existing && existing.currentIndex) || 0,
    updatedAt: new Date()
  };
  Object.keys(patch).forEach(function (k) { obj[k] = patch[k]; });
  if (existing) {
    updateRow_('sessions', existing._row, obj);
  } else {
    appendObject_('sessions', obj);
  }
  return obj;
}

function closeSession_(quizNo, mode) {
  return upsertSession_(quizNo, mode, { status: 'closed' });
}
