// quiz2026 API 클라이언트
// GAS 웹앱은 CORS preflight(OPTIONS)를 처리하지 못하므로 text/plain 으로 POST하여 preflight를 피한다.
window.QuizApi = (function () {
  var API_URL = window.QUIZ_CONFIG.API_URL;

  function call(action, payload) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.message || '요청 처리 중 오류가 발생했습니다.');
        return json.data;
      });
  }

  return { call: call };
})();
