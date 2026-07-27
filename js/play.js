(function () {
  var QUESTION_TIME_SEC = 10;
  var NEXT_DELAY_MS = 3000;

  var state = {
    quizNo: null,
    code: null,
    questions: [],
    currentIndex: 0,
    locked: false,
    questionTimer: null,
    questionRemainingSec: null
  };

  var screens = {
    join: document.getElementById('screen-join'),
    quiz: document.getElementById('screen-quiz'),
    name: document.getElementById('screen-name'),
    result: document.getElementById('screen-result')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('hidden', k !== name); });
  }

  function showJoinError(msg) {
    var box = document.getElementById('join-alert');
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  // URL 쿼리로 퀴즈번호가 넘어온 경우(QR 접속) 자동 채움
  var params = new URLSearchParams(location.search);
  if (params.get('q')) document.getElementById('quizNoInput').value = params.get('q');

  document.getElementById('joinBtn').addEventListener('click', function () {
    var quizNo = document.getElementById('quizNoInput').value.trim();
    var code = document.getElementById('codeInput').value.trim();
    document.getElementById('join-alert').classList.add('hidden');
    if (!quizNo || !code) { showJoinError('퀴즈 번호와 참여코드를 모두 입력하세요.'); return; }

    QuizApi.call('claimCode', { quizNo: quizNo, code: code })
      .then(function () {
        state.quizNo = quizNo;
        state.code = code;
        return QuizApi.call('getQuizForPlayer', { quizNo: quizNo });
      })
      .then(function (questions) {
        state.questions = questions;
        showScreen('quiz');
        renderQuestion();
      })
      .catch(function (err) { showJoinError(err.message); });
  });

  function startQuestionTimer() {
    clearInterval(state.questionTimer);
    state.questionRemainingSec = QUESTION_TIME_SEC;
    updateQuestionTimerDisplay();
    state.questionTimer = setInterval(function () {
      state.questionRemainingSec--;
      updateQuestionTimerDisplay();
      if (state.questionRemainingSec <= 0) {
        clearInterval(state.questionTimer);
        handleTimeout();
      }
    }, 1000);
  }

  function updateQuestionTimerDisplay() {
    var el = document.getElementById('countdown');
    el.textContent = '00:' + (state.questionRemainingSec < 10 ? '0' : '') + state.questionRemainingSec;
    el.classList.toggle('urgent', state.questionRemainingSec <= 3);
  }

  function renderQuestion() {
    var q = state.questions[state.currentIndex];
    var total = state.questions.length;
    document.getElementById('qCounter').textContent = (state.currentIndex + 1) + ' / ' + total;
    document.getElementById('progressBar').style.width = Math.round((state.currentIndex / total) * 100) + '%';
    document.getElementById('qOrderLabel').textContent = '문제 ' + (state.currentIndex + 1);
    document.getElementById('questionText').textContent = q.question;

    var box = document.getElementById('choicesBox');
    box.innerHTML = '';
    ['choice1', 'choice2', 'choice3', 'choice4'].forEach(function (key, idx) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = '<span class="num">' + (idx + 1) + '</span><span>' + q[key] + '</span>';
      btn.addEventListener('click', function () { selectAnswer(q[key], btn); });
      box.appendChild(btn);
    });

    state.locked = false;
    startQuestionTimer();
  }

  function goToNextQuestionAfterDelay() {
    setTimeout(function () {
      state.currentIndex++;
      if (state.currentIndex >= state.questions.length) {
        goToNameScreen('모든 문제를 풀었습니다. 이름을 입력하고 제출하세요.');
      } else {
        renderQuestion();
      }
    }, NEXT_DELAY_MS);
  }

  function selectAnswer(value, btnEl) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.questionTimer);
    var q = state.questions[state.currentIndex];
    document.querySelectorAll('#choicesBox .choice-btn').forEach(function (b) { b.disabled = true; });
    btnEl.classList.add('selected');

    QuizApi.call('submitAnswer', {
      quizNo: state.quizNo, code: state.code, order: q.order, selected: value
    }).then(function (result) {
      btnEl.classList.remove('selected');
      btnEl.classList.add(result.correct ? 'correct' : 'wrong');
      goToNextQuestionAfterDelay();
    }).catch(function (err) {
      state.locked = false;
      alert(err.message);
    });
  }

  function handleTimeout() {
    if (state.locked) return;
    state.locked = true;
    var q = state.questions[state.currentIndex];
    document.querySelectorAll('#choicesBox .choice-btn').forEach(function (b) { b.disabled = true; });

    QuizApi.call('submitAnswer', {
      quizNo: state.quizNo, code: state.code, order: q.order, selected: '__TIMEOUT__'
    }).then(function () {
      goToNextQuestionAfterDelay();
    }).catch(function () {
      goToNextQuestionAfterDelay();
    });
  }

  function goToNameScreen(message) {
    document.getElementById('nameSub').textContent = message;
    showScreen('name');
  }

  document.getElementById('submitNameBtn').addEventListener('click', function () {
    var name = document.getElementById('nameInput').value.trim();
    var errBox = document.getElementById('name-alert');
    errBox.classList.add('hidden');
    if (!name) { errBox.textContent = '이름을 입력하세요.'; errBox.classList.remove('hidden'); return; }

    QuizApi.call('finalizeParticipant', { quizNo: state.quizNo, code: state.code, name: name })
      .then(function (result) {
        document.getElementById('resultSummary').textContent =
          result.correctCount + ' / ' + result.totalQuestions + '문제 정답 (' + result.score + '점)';
        return QuizApi.call('getLeaderboard', { quizNo: state.quizNo });
      })
      .then(function (lb) {
        renderLeaderboard(lb, name);
        showScreen('result');
        launchConfetti(3500);
      })
      .catch(function (err) { errBox.textContent = err.message; errBox.classList.remove('hidden'); });
  });

  function renderLeaderboard(lb, myName) {
    var table = document.getElementById('leaderboardTable');
    var rows = lb.ranking.slice(0, 10);
    var medal = { 1: '🥇', 2: '🥈', 3: '🥉' };
    table.innerHTML = '<tr><th>순위</th><th>이름</th><th>정답수</th><th>점수</th></tr>' +
      rows.map(function (r) {
        var isMe = r.name === myName;
        return '<tr style="' + (isMe ? 'outline:2px solid var(--accent);' : '') + '">' +
          '<td class="rank-badge">' + (medal[r.rank] || r.rank) + '</td>' +
          '<td>' + r.name + (isMe ? ' (나)' : '') + '</td>' +
          '<td>' + r.correctCount + '</td><td>' + r.score + '</td></tr>';
      }).join('');
  }
})();
