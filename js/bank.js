(function () {
  var entriesBox = document.getElementById('entriesBox');
  var template = document.getElementById('entryTemplate');
  var entryCounter = 0;

  function flash(msg, type) {
    var el = document.getElementById('bankAlert');
    el.textContent = msg;
    el.className = 'alert ' + (type || 'info');
    el.classList.remove('hidden');
  }

  function addEntry() {
    entryCounter++;
    var node = template.content.cloneNode(true);
    var entryEl = node.querySelector('.qbank-entry');
    entryEl.querySelectorAll('.qb-answer-radio').forEach(function (radio) {
      radio.name = 'qb-answer-' + entryCounter;
    });
    entryEl.querySelector('.qbank-remove').addEventListener('click', function () {
      if (entriesBox.querySelectorAll('.qbank-entry').length <= 1) return;
      entryEl.remove();
    });
    entriesBox.appendChild(entryEl);
  }

  function readEntries() {
    var entries = [];
    var errors = [];
    Array.prototype.forEach.call(entriesBox.querySelectorAll('.qbank-entry'), function (entryEl, idx) {
      var question = entryEl.querySelector('.qb-question').value.trim();
      var choices = ['1', '2', '3', '4'].map(function (n) {
        return entryEl.querySelector('.qb-choice' + n).value.trim();
      });
      var checked = entryEl.querySelector('.qb-answer-radio:checked');
      var category = entryEl.querySelector('.qb-category').value.trim();

      if (!question || choices.some(function (c) { return !c; }) || !checked) {
        errors.push((idx + 1) + '번째 문제: 문제/문항 4개/정답 선택을 모두 입력하세요.');
        return;
      }
      entries.push({
        category: category,
        question: question,
        choice1: choices[0], choice2: choices[1], choice3: choices[2], choice4: choices[3],
        answer: choices[Number(checked.value) - 1]
      });
    });
    return { entries: entries, errors: errors };
  }

  document.getElementById('addEntryBtn').addEventListener('click', addEntry);

  document.getElementById('saveAllBtn').addEventListener('click', function () {
    var result = readEntries();
    if (result.errors.length) {
      flash(result.errors.join(' / '), 'error');
      return;
    }
    QuizApi.call('addQuestionsBatch', { questions: result.entries })
      .then(function (res) {
        flash(res.added + '개 문제가 문제은행에 저장되었습니다.', 'success');
        entriesBox.innerHTML = '';
        addEntry();
      })
      .catch(function (err) { flash(err.message, 'error'); });
  });

  addEntry();
  requireAppLogin('quiz2026_admin_auth');
})();
