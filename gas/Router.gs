/**
 * 진입점: doGet / doPost 및 action 라우팅
 * 실제 비즈니스 로직은 SettingsApi.gs / QuizApi.gs / SessionApi.gs / HostApi.gs / PlayerApi.gs 에 있음
 */

function doGet(e) {
  ensureAllSheets_();
  var action = e.parameter.action || 'ping';
  try {
    var result = route_(action, e.parameter);
    return ok_(result);
  } catch (err) {
    return fail_(err.message);
  }
}

function doPost(e) {
  ensureAllSheets_();
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return fail_('잘못된 요청 형식입니다.');
  }
  var action = body.action;
  try {
    var result = route_(action, body.payload || {});
    return ok_(result);
  } catch (err) {
    return fail_(err.message);
  }
}

function route_(action, p) {
  switch (action) {
    case 'ping': return { pong: true, now: new Date() };

    // ---- auth ----
    case 'authStatus': return authRequired_();
    case 'login': return checkLogin_(p.password);

    // ---- settings / admin ----
    case 'getSettings': return getSettings_(p.quizNo);
    case 'saveSettings': return saveSettings_(p);
    case 'listSettings': return listSettings_();
    case 'listDataCategories': return listDataCategories_();
    case 'generateQuizSet': return generateQuizSet_(p);
    case 'listQuizNos': return listQuizNos_();
    case 'seedSampleData': return seedSampleData_();

    // ---- quiz retrieval ----
    case 'getQuizForHost': return getQuizForHost_(p.quizNo);
    case 'getQuizForPlayer': return getQuizForPlayer_(p.quizNo);

    // ---- host mode ----
    case 'startHostSession': return startHostSession_(p.quizNo);
    case 'getHostSession': return getSession_(p.quizNo, 'host');
    case 'hostSetIndex': return hostSetIndex_(p.quizNo, p.index);
    case 'recordHostWinner': return recordHostWinner_(p);
    case 'getHostWinners': return getHostWinners_(p.quizNo);
    case 'closeHostSession': return closeSession_(p.quizNo, 'host');

    // ---- participant mode ----
    case 'claimCode': return claimCode_(p.quizNo, p.code);
    case 'generateParticipantCodes': return generateParticipantCodes_(p);
    case 'submitAnswer': return submitAnswer_(p);
    case 'finalizeParticipant': return finalizeParticipant_(p);
    case 'openParticipantSession': return openParticipantSession_(p.quizNo);
    case 'closeParticipantSession': return closeSession_(p.quizNo, 'participant');
    case 'getParticipantSession': return getSession_(p.quizNo, 'participant');
    case 'getLeaderboard': return getLeaderboard_(p.quizNo);

    default: throw new Error('알 수 없는 action: ' + action);
  }
}
