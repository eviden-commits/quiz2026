// 관리자/진행자 화면 보호용 로그인 게이트
// Apps Script 속성(Script Properties)에 LoginPassWord가 설정되어 있을 때만 잠금
window.requireAppLogin = function (storageKey) {
  return QuizApi.call('authStatus', {}).then(function (status) {
    if (!status.requireLogin) return true;
    if (sessionStorage.getItem(storageKey) === '1') return true;

    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,8,30,0.92);display:flex;align-items:center;justify-content:center;z-index:2000;';
      overlay.innerHTML =
        '<div class="card" style="max-width:360px;">' +
        '<h1 class="title" style="font-size:26px;">🔒 접근 확인</h1>' +
        '<p class="subtitle">비밀번호를 입력하세요</p>' +
        '<input type="password" id="__loginPw" placeholder="비밀번호" />' +
        '<div class="alert error hidden" id="__loginErr"></div>' +
        '<button class="btn" id="__loginBtn">입장하기</button>' +
        '</div>';
      document.body.appendChild(overlay);

      var pwInput = overlay.querySelector('#__loginPw');
      var errBox = overlay.querySelector('#__loginErr');
      var btn = overlay.querySelector('#__loginBtn');

      function attempt() {
        errBox.classList.add('hidden');
        btn.disabled = true;
        QuizApi.call('login', { password: pwInput.value })
          .then(function () {
            sessionStorage.setItem(storageKey, '1');
            document.body.removeChild(overlay);
            resolve(true);
          })
          .catch(function (err) {
            errBox.textContent = err.message;
            errBox.classList.remove('hidden');
            btn.disabled = false;
          });
      }
      btn.addEventListener('click', attempt);
      pwInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
      pwInput.focus();
    });
  });
};
