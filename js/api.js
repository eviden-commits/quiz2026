// quiz2026 API 클라이언트
// GAS 웹앱은 CORS preflight(OPTIONS)를 처리하지 못하므로 text/plain 으로 POST하여 preflight를 피한다.
window.QuizApi = (function () {
  var API_URL = window.QUIZ_CONFIG.API_URL;

  function call(action, payload) {
    var body = Object.assign({}, payload || {});
    // 로그인 게이트를 통과한 화면(admin/host)이면 관리자 전용 action 서버 재검증용 비밀번호를 함께 보낸다.
    var pw = sessionStorage.getItem('quiz2026_pw');
    if (pw && body.password === undefined) body.password = pw;

    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: body })
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.message || '요청 처리 중 오류가 발생했습니다.');
        return json.data;
      });
  }

  return { call: call };
})();
