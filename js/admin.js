(function () {
  function flash(elId, msg, type) {
    var el = document.getElementById(elId);
    el.textContent = msg;
    el.className = 'alert ' + (type || 'info');
    el.classList.remove('hidden');
  }

  // 카테고리 목록 로드
  QuizApi.call('listDataCategories', {}).then(function (cats) {
    var sel = document.getElementById('genCategory');
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
  }).catch(function () {});

  // 1. 문제 출제
  document.getElementById('genBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('genQuizNo').value.trim();
    var count = document.getElementById('genCount').value.trim();
    var category = document.getElementById('genCategory').value;
    if (!quizNo) { flash('genAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('generateQuizSet', { quizNo: quizNo, count: count, category: category })
      .then(function (res) { flash('genAlert', res.count + '개 문제가 퀴즈 ' + res.quizNo + '번에 출제되었습니다.', 'success'); })
      .catch(function (err) { flash('genAlert', err.message, 'error'); });
  });

  // 2. 사전설정
  document.getElementById('loadSettingsBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('setQuizNo').value.trim();
    if (!quizNo) return;
    QuizApi.call('getSettings', { quizNo: quizNo }).then(function (s) {
      document.getElementById('setTitle').value = s.title || '';
      document.getElementById('setPrizeCount').value = s.prizeCount || 0;
      document.getElementById('setWinnerCount').value = s.winnerCount || 0;
      document.getElementById('setPrizeNames').value = s.prizeNames || '';
      document.getElementById('setTimeLimit').value = s.timeLimitSec || 0;
      flash('settingsAlert', '불러왔습니다.', 'success');
    }).catch(function (err) { flash('settingsAlert', err.message, 'error'); });
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('setQuizNo').value.trim();
    if (!quizNo) { flash('settingsAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('saveSettings', {
      quizNo: quizNo,
      title: document.getElementById('setTitle').value.trim(),
      prizeCount: document.getElementById('setPrizeCount').value.trim(),
      winnerCount: document.getElementById('setWinnerCount').value.trim(),
      prizeNames: document.getElementById('setPrizeNames').value.trim(),
      timeLimitSec: document.getElementById('setTimeLimit').value.trim()
    }).then(function () {
      flash('settingsAlert', '저장되었습니다.', 'success');
    }).catch(function (err) { flash('settingsAlert', err.message, 'error'); });
  });

  // 3. 참여코드 발급
  document.getElementById('genCodesBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('codeQuizNo').value.trim();
    var count = document.getElementById('codeCount').value.trim();
    var digits = document.getElementById('codeDigits').value.trim();
    if (!quizNo) { flash('codeAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('generateParticipantCodes', { quizNo: quizNo, count: count, digits: digits })
      .then(function (res) {
        flash('codeAlert', res.codes.length + '개 참여코드가 생성되었습니다.', 'success');
        document.getElementById('codesOutput').value = res.codes.join(', ');
      })
      .catch(function (err) { flash('codeAlert', err.message, 'error'); });
  });

  // 4. 진행 제어
  document.getElementById('openPartBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('sessQuizNo').value.trim();
    if (!quizNo) { flash('sessionAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('openParticipantSession', { quizNo: quizNo })
      .then(function () { flash('sessionAlert', '참여 접수가 시작되었습니다.', 'success'); refreshStatus(); })
      .catch(function (err) { flash('sessionAlert', err.message, 'error'); });
  });

  document.getElementById('closePartBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('sessQuizNo').value.trim();
    if (!quizNo) { flash('sessionAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('closeParticipantSession', { quizNo: quizNo })
      .then(function () { flash('sessionAlert', '참여가 마감되었습니다.', 'success'); refreshStatus(); })
      .catch(function (err) { flash('sessionAlert', err.message, 'error'); });
  });

  document.getElementById('closeHostBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('sessQuizNo').value.trim();
    if (!quizNo) { flash('sessionAlert', '퀴즈 번호를 입력하세요.', 'error'); return; }
    QuizApi.call('closeHostSession', { quizNo: quizNo })
      .then(function () { flash('sessionAlert', '진행자 세션이 마감되었습니다.', 'success'); refreshStatus(); })
      .catch(function (err) { flash('sessionAlert', err.message, 'error'); });
  });

  function refreshStatus() {
    var quizNo = document.getElementById('sessQuizNo').value.trim();
    if (!quizNo) return;
    Promise.all([
      QuizApi.call('getParticipantSession', { quizNo: quizNo }),
      QuizApi.call('getHostSession', { quizNo: quizNo })
    ]).then(function (results) {
      document.getElementById('sessionStatus').textContent =
        '참여형: ' + results[0].status + ' · 진행자형: ' + results[1].status;
    });
  }
  document.getElementById('refreshStatusBtn').addEventListener('click', refreshStatus);

  // 4. QR / 링크
  document.getElementById('genQrBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('qrQuizNo').value.trim();
    if (!quizNo) return;
    var url = location.origin + location.pathname.replace(/admin\.html$/, '') + 'play.html?q=' + encodeURIComponent(quizNo);
    document.getElementById('qrImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url);
    var linkEl = document.getElementById('qrLink');
    linkEl.href = url;
    linkEl.textContent = url;
    document.getElementById('qrBox').classList.remove('hidden');
  });

  requireAppLogin('quiz2026_admin_auth');
})();
