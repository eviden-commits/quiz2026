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

  function readSettingsForm() {
    return {
      siteName: document.getElementById('setSiteName').value.trim(),
      title: document.getElementById('setTitle').value.trim(),
      prizeCount: document.getElementById('setPrizeCount').value.trim(),
      winnerCount: document.getElementById('setWinnerCount').value.trim(),
      prizeNames: document.getElementById('setPrizeNames').value.trim(),
      randomizeFrom4th: document.getElementById('setRandomizeFrom4th').checked,
      luckyEnabled: document.getElementById('setLuckyEnabled').checked,
      luckyCount: document.getElementById('setLuckyCount').value.trim()
    };
  }

  var luckyCheckbox = document.getElementById('setLuckyEnabled');
  var luckyCountRow = document.getElementById('luckyCountRow');
  luckyCheckbox.addEventListener('change', function () {
    luckyCountRow.style.display = luckyCheckbox.checked ? 'grid' : 'none';
  });

  // 2. 문항 추가 (새 회차 자동 생성 + 위에서 입력해둔 사전설정 자동 적용)
  document.getElementById('genBtn').addEventListener('click', function () {
    var count = document.getElementById('genCount').value.trim();
    var category = document.getElementById('genCategory').value;
    QuizApi.call('createParticipantRound', { count: count, category: category })
      .then(function (res) {
        currentQuizNo = res.quizNo;
        updateRoundBadge();
        flash('genAlert', res.count + '개 문항으로 새 회차가 생성되었습니다.', 'success');
        document.getElementById('sessionStatus').textContent = '';
        document.getElementById('accessCodeBox').classList.add('hidden');
        document.getElementById('qrBox').classList.add('hidden');

        var settings = readSettingsForm();
        var hasSettings = settings.siteName || settings.title || settings.prizeNames ||
          settings.prizeCount !== '0' || settings.winnerCount !== '0' ||
          settings.randomizeFrom4th || settings.luckyEnabled;
        if (hasSettings) {
          QuizApi.call('saveSettings', Object.assign({ quizNo: currentQuizNo }, settings))
            .then(function () { flash('settingsAlert', '사전설정이 새 회차에 적용되었습니다.', 'success'); })
            .catch(function () {});
        }
      })
      .catch(function (err) { flash('genAlert', err.message, 'error'); });
  });

  // 2. 참석자 오픈 (세션 오픈 + 접속코드 자동 생성 + QR)
  document.getElementById('openBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('codeAlert', '먼저 문항을 추가해 회차를 생성하세요.', 'error'); return; }

    QuizApi.call('openParticipantSession', { quizNo: currentQuizNo })
      .then(function (session) {
        flash('codeAlert', '참석자 오픈 완료.', 'success');
        var box = document.getElementById('accessCodeBox');
        box.textContent = '접속코드: ' + session.accessCode;
        box.classList.remove('hidden');
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

  // 4. 참석자 클로즈 (상품 구간 동률이 있으면 운명의 수레바퀴로 추첨 + 행운상 추첨)
  document.getElementById('closeBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('closeAlert', '진행 중인 회차가 없습니다.', 'error'); return; }
    var quizNo = currentQuizNo;
    var winnerCount = 0;

    QuizApi.call('closeParticipantSession', { quizNo: quizNo })
      .then(function () {
        flash('closeAlert', '참석자가 마감되었습니다. 이 회차는 재사용할 수 없습니다.', 'success');
        refreshStatus();
        return QuizApi.call('getTieGroupsForPrizes', { quizNo: quizNo });
      })
      .then(function (result) {
        winnerCount = result.winnerCount;
        if (!result.tieGroups.length) {
          return QuizApi.call('finalizeRanks', { quizNo: quizNo, orderedCodes: result.orderedCodes });
        }
        return resolveTieGroupsSequentially(result.orderedCodes, result.tieGroups)
          .then(function (finalOrder) {
            return QuizApi.call('finalizeRanks', { quizNo: quizNo, orderedCodes: finalOrder });
          });
      })
      .then(function (lb) {
        return QuizApi.call('drawLuckyWinners', { quizNo: quizNo }).then(function (lucky) {
          showFinalResultPopup(lb, winnerCount, lucky.drawn);
        });
      })
      .catch(function (err) { flash('closeAlert', err.message, 'error'); });
  });

  // tieGroups: [{startRank, members:[{code,name,...}]}] (score순 orderedCodes 안에서 해당 구간만 교체)
  function resolveTieGroupsSequentially(orderedCodes, tieGroups) {
    var finalOrder = orderedCodes.slice();
    var codeToName = {};

    function next(i) {
      if (i >= tieGroups.length) return Promise.resolve(finalOrder);
      var group = tieGroups[i];
      group.members.forEach(function (m) { codeToName[m.code] = m.name; });
      var names = group.members.map(function (m) { return m.name; });

      return window.runTieBreakWheel(names, group.startRank, group.neededCount).then(function (resolvedNames) {
        var nameToCode = {};
        group.members.forEach(function (m) { nameToCode[m.name] = m.code; });
        var startIdx = group.startRank - 1;
        resolvedNames.forEach(function (name, idx) {
          finalOrder[startIdx + idx] = nameToCode[name];
        });
        return next(i + 1);
      });
    }
    return next(0);
  }

  function rankMarker(rank, winnerCount) {
    if (rank === 1) return '👑';
    if (rank === 2) return '<span class="crown-silver">👑</span>';
    if (rank === 3) return '<span class="crown-bronze">👑</span>';
    if (winnerCount > 3 && rank <= winnerCount) return '🥉';
    return rank;
  }

  function showFinalResultPopup(lb, winnerCount, luckyWinners) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(4,5,10,0.88);display:flex;align-items:center;justify-content:center;z-index:2500;';
    var rows = lb.ranking.slice(0, 20).map(function (r) {
      return '<tr><td class="rank-badge">' + rankMarker(Number(r.rank), winnerCount) + '</td><td>' + r.name + '</td><td>' + r.correctCount + '</td><td>' + r.score + '</td></tr>';
    }).join('');
    var luckyHtml = (luckyWinners && luckyWinners.length)
      ? '<div class="section-title">🍀 행운상</div><div class="winners-list">' +
        luckyWinners.map(function (w) { return '<span class="winner-chip">' + w.name + '</span>'; }).join('') + '</div>'
      : '';
    overlay.innerHTML =
      '<div class="card" style="max-width:480px;">' +
      '<h1 class="title" style="font-size:22px;">🏁 최종 순위 확정</h1>' +
      '<table class="leaderboard"><tr><th>순위</th><th>이름</th><th>정답수</th><th>점수</th></tr>' + rows + '</table>' +
      luckyHtml +
      '<button class="btn" id="finalResultCloseBtn" style="margin-top:16px;">확인</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#finalResultCloseBtn').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
  }

  function refreshStatus() {
    if (!currentQuizNo) return;
    QuizApi.call('getParticipantSession', { quizNo: currentQuizNo }).then(function (s) {
      document.getElementById('sessionStatus').textContent = '참여형 상태: ' + s.status;
    });
  }

  // 1. 사전설정 (선택사항) - 회차 생성 전이면 입력만 해두고, 아래 "문항 추가" 시 자동 적용된다.
  var saveSettingsBtn = document.getElementById('saveSettingsBtn');
  var SAVE_LABEL = '① 설정 저장';

  function markSettingsDirty() {
    if (saveSettingsBtn.disabled) {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = SAVE_LABEL;
    }
  }
  ['setSiteName', 'setTitle', 'setPrizeCount', 'setWinnerCount', 'setPrizeNames', 'setLuckyCount'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', markSettingsDirty);
  });
  ['setRandomizeFrom4th', 'setLuckyEnabled'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', markSettingsDirty);
  });

  saveSettingsBtn.addEventListener('click', function () {
    if (!currentQuizNo) {
      flash('settingsAlert', '입력해두신 내용은 아래에서 문항을 추가해 회차를 생성할 때 자동 적용됩니다.', 'info');
      return;
    }
    var payload = Object.assign({ quizNo: currentQuizNo }, readSettingsForm());
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = '저장 중...';

    QuizApi.call('saveSettings', payload)
      .then(function () {
        // 실제로 시트에 반영됐는지 다시 읽어와서 확인한다.
        return QuizApi.call('getSettings', { quizNo: currentQuizNo });
      })
      .then(function (saved) {
        var matches = String(saved.title || '') === payload.title &&
          String(saved.siteName || '') === payload.siteName &&
          String(saved.prizeNames || '') === payload.prizeNames;
        if (!matches) throw new Error('저장은 됐지만 값이 일치하지 않습니다. 다시 확인해주세요.');
        flash('settingsAlert', '✅ 저장 확인 완료 (시트에 반영됨)', 'success');
        saveSettingsBtn.textContent = '✅ 저장됨';
      })
      .catch(function (err) {
        flash('settingsAlert', err.message, 'error');
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = SAVE_LABEL;
      });
  });

  // 완료자 인원수만 가볍게 10초마다 갱신 (상세 목록은 모달에서 조회)
  function refreshFinishedCount() {
    if (!currentQuizNo) return;
    QuizApi.call('getLeaderboard', { quizNo: currentQuizNo }).then(function (lb) {
      document.getElementById('finishedCount').textContent = '완료 ' + lb.ranking.length + '명';
    }).catch(function () {});
  }
  setInterval(refreshFinishedCount, 10000);

  // 보고서형 모달: 완료 현황(진행 중) / 지난회차 결과 조회에 공용으로 사용
  function showReportModal(title, lb) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(4,5,10,0.88);display:flex;align-items:center;justify-content:center;z-index:2500;';
    var total = lb.ranking.length;
    var rows = lb.ranking.slice(0, 20);
    var siteName = lb.settings && lb.settings.siteName ? lb.settings.siteName + ' · ' : '';
    overlay.innerHTML =
      '<div class="card" style="max-width:520px;">' +
      '<h1 class="title" style="font-size:22px;">' + title + '</h1>' +
      '<p class="subtitle">' + siteName + '총 ' + total + '명 완료' + (total > 20 ? ' (상위 20명만 표시)' : '') + '</p>' +
      '<table class="leaderboard"><tr><th>순위</th><th>이름</th><th>정답수</th><th>점수</th></tr>' +
      rows.map(function (r) {
        return '<tr><td>' + r.rank + '</td><td>' + r.name + '</td><td>' + r.correctCount + '</td><td>' + r.score + '</td></tr>';
      }).join('') +
      '</table>' +
      '<button class="btn" id="reportModalCloseBtn" style="margin-top:16px;">닫기</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#reportModalCloseBtn').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
  }

  document.getElementById('refreshFinishedBtn').addEventListener('click', function () {
    if (!currentQuizNo) { flash('closeAlert', '진행 중인 회차가 없습니다.', 'error'); return; }
    QuizApi.call('getLeaderboard', { quizNo: currentQuizNo }).then(function (lb) {
      document.getElementById('finishedCount').textContent = '완료 ' + lb.ranking.length + '명';
      showReportModal('📋 완료 현황', lb);
    });
  });

  // 지난회차 결과
  document.getElementById('pastResultsLink').addEventListener('click', function (e) {
    e.preventDefault();
    var panel = document.getElementById('pastResultsPanel');
    panel.classList.toggle('hidden');
    if (panel.classList.contains('hidden')) return;

    QuizApi.call('listPastRounds', {}).then(function (rounds) {
      var sel = document.getElementById('pastRoundsSelect');
      sel.innerHTML = '';
      rounds.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.quizNo;
        var when = r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '';
        var sitePrefix = r.siteName ? r.siteName + ' - ' : '';
        opt.textContent = sitePrefix + (r.title || r.quizNo) + ' · ' + when;
        sel.appendChild(opt);
      });
    }).catch(function () {});
  });

  document.getElementById('loadPastResultBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('pastRoundsSelect').value;
    if (!quizNo) return;
    QuizApi.call('getLeaderboard', { quizNo: quizNo }).then(function (lb) {
      showReportModal('📊 지난회차 결과', lb);
    });
  });

  requireAppLogin('quiz2026_admin_auth');
})();
