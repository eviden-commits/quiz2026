/**
 * 시트 스키마 정의 및 공통 CRUD 유틸리티
 */

var SS = SpreadsheetApp.getActiveSpreadsheet();

var SHEETS = {
  data: ['id', 'category', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'points', 'active'],
  quiz: ['quizNo', 'order', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'points'],
  settings: ['quizNo', 'title', 'quizCount', 'prizeCount', 'winnerCount', 'prizeNames', 'timeLimitSec', 'createdAt'],
  participants: ['quizNo', 'code', 'name', 'correctCount', 'score', 'startTime', 'endTime', 'rank', 'status'],
  answers: ['quizNo', 'code', 'order', 'selected', 'correct', 'answeredAt'],
  sessions: ['quizNo', 'mode', 'status', 'currentIndex', 'accessCode', 'updatedAt'],
  winners: ['quizNo', 'questionOrder', 'name', 'recordedAt']
};

function getSheet_(name) {
  var sh = SS.getSheetByName(name);
  var headers = SHEETS[name];
  if (!sh) {
    sh = SS.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  } else {
    var currentHeaders = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var matches = headers.every(function (h, i) { return currentHeaders[i] === h; });
    if (!matches) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function ensureAllSheets_() {
  Object.keys(SHEETS).forEach(getSheet_);
  var defaultSheet = SS.getSheetByName('Sheet1');
  if (defaultSheet && SS.getSheets().length > 1) {
    var hasData = defaultSheet.getLastRow() > 0;
    if (!hasData) SS.deleteSheet(defaultSheet);
  }
}

function sheetToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    obj._row = i + 1;
    out.push(obj);
  }
  return out;
}

function appendObject_(sheetName, obj) {
  var sheet = getSheet_(sheetName);
  var headers = SHEETS[sheetName];
  var row = headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateRow_(sheetName, rowIndex, obj) {
  var sheet = getSheet_(sheetName);
  var headers = SHEETS[sheetName];
  headers.forEach(function (h, idx) {
    if (obj.hasOwnProperty(h)) sheet.getRange(rowIndex, idx + 1).setValue(obj[h]);
  });
}

function jsonOut_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) { return jsonOut_({ ok: true, data: data || null }); }
function fail_(message) { return jsonOut_({ ok: false, message: message }); }
