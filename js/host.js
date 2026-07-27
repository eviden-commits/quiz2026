(function () {
  var state = {
    quizNo: null,
    questions: [],
    settings: null,
    currentIndex: 0,
    revealed: false,
    stopwatchTimer: null,
    stopwatchSec: 0,
    winners: [] // {questionOrder, name} - 로컬에만 쌓아두고 종료 시 한 번에 저장
  };

  var screens = {
    setup: document.getElementById('screen-setup'),
    play: document.getElementById('screen-play'),
    end: document.getElementById('screen-end')
  };

  function showScreen(name) { showScreenAnimated(screens, name); }

  function showSetupError(msg) {
    var box = document.getElementById('setup-alert');
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  document.getElementById('loadBtn').addEventListener('click', function () {
    var count = document.getElementById('questionCountInput').value.trim();
    if (!count || Number(count) <= 0) { showSetupError('문항 수를 입력하세요.'); return; }
    document.getElementById('setup-alert').classList.add('hidden');
    QuizApi.call('startHostRandomQuiz', { count: count })
      .then(function (data) {
        state.quizNo = data.quizNo;
        state.questions = data.questions;
        state.settings = data.settings;
        state.currentIndex = 0;
        showScreen('play');
        renderQuestion();
      })
      .catch(function (err) { showSetupError(err.message); });
  });

  function startStopwatch() {
    clearInterval(state.stopwatchTimer);
    state.stopwatchSec = 0;
    updateStopwatchDisplay();
    state.stopwatchTimer = setInterval(function () {
      state.stopwatchSec++;
      updateStopwatchDisplay();
    }, 1000);
  }

  function updateStopwatchDisplay() {
    var m = Math.floor(state.stopwatchSec / 60);
    var s = state.stopwatchSec % 60;
    var el = document.getElementById('stopwatch');
    el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    el.classList.toggle('urgent', state.stopwatchSec >= 20);
  }

  function renderQuestion() {
    state.revealed = false;
    var q = state.questions[state.currentIndex];
    var total = state.questions.length;
    document.getElementById('qCounter').textContent = (state.currentIndex + 1) + ' / ' + total;
    document.getElementById('titleBadge').textContent = (state.settings && state.settings.title) || '랜덤 퀴즈';
    document.getElementById('progressBar').style.width = Math.round(((state.currentIndex) / total) * 100) + '%';
    document.getElementById('qOrderLabel').textContent = '문제 ' + (state.currentIndex + 1);
    document.getElementById('questionText').textContent = q.question;

    var choicesBox = document.getElementById('choicesBox');
    choicesBox.innerHTML = '';
    ['choice1', 'choice2', 'choice3', 'choice4'].forEach(function (key, idx) {
      var btn = document.createElement('div');
      btn.className = 'choice-btn';
      btn.innerHTML = '<span class="num">' + (idx + 1) + '</span><span>' + q[key] + '</span>';
      btn.dataset.value = q[key];
      choicesBox.appendChild(btn);
    });

    document.getElementById('winnerNameInput').value = '';
    renderWinnersForCurrentQuestion();
    startStopwatch();
  }

  function renderWinnersForCurrentQuestion() {
    var order = state.currentIndex + 1;
    var box = document.getElementById('winnersForQuestion');
    box.innerHTML = '';
    state.winners.filter(function (w) { return w.questionOrder === order; }).forEach(function (w) {
      var chip = document.createElement('span');
      chip.className = 'winner-chip';
      chip.textContent = '✅ ' + w.name;
      box.appendChild(chip);
    });
  }

  document.getElementById('addWinnerBtn').addEventListener('click', function () {
    var input = document.getElementById('winnerNameInput');
    var name = input.value.trim();
    if (!name) return;
    state.winners.push({ questionOrder: state.currentIndex + 1, name: name });
    input.value = '';
    renderWinnersForCurrentQuestion();
  });

  document.getElementById('revealBtn').addEventListener('click', function () {
    state.revealed = !state.revealed;
    var q = state.questions[state.currentIndex];
    var boxes = document.querySelectorAll('#choicesBox .choice-btn');
    boxes.forEach(function (b) {
      b.classList.toggle('correct', state.revealed && String(b.dataset.value).trim() === String(q.answer).trim());
    });
  });

  document.getElementById('nextBtn').addEventListener('click', function () {
    var total = state.questions.length;
    var nextIndex = state.currentIndex + 1;
    // 세션 진행 상태 동기화는 화면 전환을 막지 않도록 백그라운드로 전송한다.
    QuizApi.call('hostSetIndex', { quizNo: state.quizNo, index: nextIndex }).catch(function () {});
    if (nextIndex >= total) {
      clearInterval(state.stopwatchTimer);
      showEndScreen();
    } else {
      state.currentIndex = nextIndex;
      renderQuestion();
    }
  });

  function showEndScreen() {
    showScreen('end');
    launchConfetti(4000);
    renderWinnersSummary();
    // 정답자 기록은 여기서 한 번만 서버에 저장한다.
    if (state.winners.length) {
      QuizApi.call('recordHostWinnersBatch', { quizNo: state.quizNo, winners: state.winners }).catch(function () {});
    }
  }

  function renderWinnersSummary() {
    var counts = {};
    state.winners.forEach(function (w) { counts[w.name] = (counts[w.name] || 0) + 1; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var list = document.getElementById('allWinnersList');
    if (names.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center;">등록된 정답자가 없습니다.</p>';
      return;
    }
    var table = document.createElement('table');
    table.className = 'leaderboard';
    table.innerHTML = '<tr><th>이름</th><th>정답 횟수</th></tr>' +
      names.map(function (n) { return '<tr><td>' + n + '</td><td>' + counts[n] + '회</td></tr>'; }).join('');
    list.innerHTML = '';
    list.appendChild(table);
  }

  requireAppLogin('quiz2026_host_auth');
})();
