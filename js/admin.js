(function () {
  var currentQuizNo = null;

  function flash(elId, msg, type) {
    var el = document.getElementById(elId);
    el.textContent = msg;
    el.className = 'alert ' + (type || 'info');
    el.classList.remove('hidden');
  }

  function updateRoundBadge() {
    var el = document.getElementById('roundBadge');
    if (!currentQuizNo) {
      el.textContent = '현재 회차: 없음 · 아래에서 문항을 추가해 새 회차를 시작하세요';
      el.className = 'alert info';
    } else {
      el.textContent = '현재 회차: ' + currentQuizNo;
      el.className = 'alert success';
    }
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

  // 1. 문항 추가 (새 회차 자동 생성)
  document.getElementById('genBtn').addEventListener('click', function () {
    var count = document.getElementById('genCount').value.trim();
    var category = document.getElementById('genCategory').value;
    QuizApi.call('createParticipantRound', { count: count, category: category })
      .then(function (res) {
        currentQuizNo = res.quizNo;
        updateRoundBadge();
        flash('genAlert', res.count + '개 문항으로 새 회차가 생성되었습니다.', 'success');
        document.getElementById('sessionStatus').textContent = '';
        document.getElementById('codesOutput').value = '';
        document.getElementById('qrBox').classList.add('hidden');
      })
      .catch(function (err) { flash('genAlert', err.message, 'error'); });
  });

  // 2. 참석자 오픈 (세션 오픈 + 참여코드 생성 + QR)
  document.getElementById('openBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('codeAlert', '먼저 문항을 추가해 회차를 생성하세요.', 'error'); return; }
    var count = document.getElementById('codeCount').value.trim();
    var digits = document.getElementById('codeDigits').value.trim();

    QuizApi.call('openParticipantSession', { quizNo: currentQuizNo })
      .then(function () {
        return QuizApi.call('generateParticipantCodes', { quizNo: currentQuizNo, count: count, digits: digits });
      })
      .then(function (res) {
        flash('codeAlert', res.codes.length + '명 참석자 오픈 완료.', 'success');
        document.getElementById('codesOutput').value = res.codes.join(', ');
        showQr(currentQuizNo);
        refreshStatus();
      })
      .catch(function (err) { flash('codeAlert', err.message, 'error'); });
  });

  function showQr(quizNo) {
    var url = location.origin + location.pathname.replace(/admin\.html$/, '') + 'play.html?q=' + encodeURIComponent(quizNo);
    document.getElementById('qrImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url);
    var linkEl = document.getElementById('qrLink');
    linkEl.href = url;
    linkEl.textContent = url;
    document.getElementById('qrBox').classList.remove('hidden');
  }

  // 3. 참석자 클로즈
  document.getElementById('closeBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('closeAlert', '진행 중인 회차가 없습니다.', 'error'); return; }
    QuizApi.call('closeParticipantSession', { quizNo: currentQuizNo })
      .then(function () {
        flash('closeAlert', '참석자가 마감되었습니다. 이 회차는 재사용할 수 없습니다.', 'success');
        refreshStatus();
      })
      .catch(function (err) { flash('closeAlert', err.message, 'error'); });
  });

  function refreshStatus() {
    if (!currentQuizNo) return;
    QuizApi.call('getParticipantSession', { quizNo: currentQuizNo }).then(function (s) {
      document.getElementById('sessionStatus').textContent = '참여형 상태: ' + s.status;
    });
  }

  // 사전설정 (선택사항)
  document.getElementById('saveSettingsBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('settingsAlert', '먼저 문항을 추가해 회차를 생성하세요.', 'error'); return; }
    QuizApi.call('saveSettings', {
      quizNo: currentQuizNo,
      title: document.getElementById('setTitle').value.trim(),
      prizeCount: document.getElementById('setPrizeCount').value.trim(),
      winnerCount: document.getElementById('setWinnerCount').value.trim(),
      prizeNames: document.getElementById('setPrizeNames').value.trim()
    }).then(function () {
      flash('settingsAlert', '저장되었습니다.', 'success');
    }).catch(function (err) { flash('settingsAlert', err.message, 'error'); });
  });

  requireAppLogin('quiz2026_admin_auth');
})();
