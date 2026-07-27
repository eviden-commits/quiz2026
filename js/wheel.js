// 동률 추첨용 "운명의 수레바퀴" 모달. 당첨자는 화면 애니메이션과 무관하게
// Math.random()으로 먼저 공정하게 뽑고, 바퀴는 그 결과를 보여주는 연출로만 사용한다.
window.runTieBreakWheel = function (names, startRank) {
  return new Promise(function (resolve) {
    var COLORS = ['#6d5efc', '#2dd4bf', '#f2596b', '#ffb020', '#4cc9f0', '#c77dff', '#7bf1a8', '#ff8fab'];
    var remaining = names.slice();
    var resolved = [];

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(4,5,10,0.88);display:flex;align-items:center;justify-content:center;z-index:3000;';
    overlay.innerHTML =
      '<div class="card" style="max-width:420px; text-align:center;">' +
      '<div class="brandmark">TIE BREAKER</div>' +
      '<h1 class="title" style="font-size:24px;">🎡 운명의 수레바퀴</h1>' +
      '<p class="subtitle" id="wheelSub"></p>' +
      '<div style="position:relative; width:260px; height:260px; margin:0 auto 20px;">' +
        '<div style="position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:12px solid transparent; border-right:12px solid transparent; border-top:20px solid var(--accent); z-index:2;"></div>' +
        '<canvas id="wheelCanvas" width="260" height="260" style="border-radius:50%; transition: transform 3.5s cubic-bezier(.17,.67,.12,1);"></canvas>' +
      '</div>' +
      '<div class="alert success hidden" id="wheelResult"></div>' +
      '<div id="wheelOrderList" class="winners-list"></div>' +
      '<button class="btn" id="wheelSpinBtn">🎲 돌리기</button>' +
      '<button class="btn secondary hidden" id="wheelDoneBtn">완료</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector('#wheelCanvas');
    var ctx = canvas.getContext('2d');
    var spinBtn = overlay.querySelector('#wheelSpinBtn');
    var doneBtn = overlay.querySelector('#wheelDoneBtn');
    var resultBox = overlay.querySelector('#wheelResult');
    var orderList = overlay.querySelector('#wheelOrderList');
    var subEl = overlay.querySelector('#wheelSub');
    var totalRotation = 0;

    function updateSub() {
      subEl.textContent = (startRank + resolved.length) + '위 자리를 놓고 추첨합니다 (' + remaining.length + '명 중 1명)';
    }

    function drawWheel(items) {
      var n = items.length;
      var slice = (2 * Math.PI) / n;
      ctx.clearRect(0, 0, 260, 260);
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(130, 130);
        ctx.arc(130, 130, 130, i * slice, (i + 1) * slice);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.save();
        ctx.translate(130, 130);
        ctx.rotate(i * slice + slice / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0b0d14';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(items[i], 118, 5);
        ctx.restore();
      }
    }

    function renderOrderList() {
      orderList.innerHTML = resolved.map(function (name, idx) {
        return '<span class="winner-chip">' + (startRank + idx) + '위 ' + name + '</span>';
      }).join('');
    }

    drawWheel(remaining);
    updateSub();

    spinBtn.addEventListener('click', function () {
      spinBtn.disabled = true;
      resultBox.classList.add('hidden');
      var winnerIndex = Math.floor(Math.random() * remaining.length);
      var winnerName = remaining[winnerIndex];
      var sliceDeg = 360 / remaining.length;
      var winnerCenterDeg = winnerIndex * sliceDeg + sliceDeg / 2;
      // 포인터는 12시(위) 방향 고정. 바퀴를 회전시켜 당첨 슬라이스가 12시에 오도록 계산.
      var need = (270 - winnerCenterDeg + 360) % 360;
      totalRotation += 360 * 4 + need - (totalRotation % 360);
      canvas.style.transform = 'rotate(' + totalRotation + 'deg)';

      setTimeout(function () {
        resolved.push(winnerName);
        remaining.splice(winnerIndex, 1);
        resultBox.textContent = '🎉 ' + (startRank + resolved.length - 1) + '위: ' + winnerName;
        resultBox.classList.remove('hidden');
        renderOrderList();

        if (remaining.length === 0) {
          spinBtn.classList.add('hidden');
          doneBtn.classList.remove('hidden');
        } else {
          canvas.style.transition = 'none';
          canvas.style.transform = 'rotate(0deg)';
          totalRotation = 0;
          void canvas.offsetWidth;
          canvas.style.transition = 'transform 3.5s cubic-bezier(.17,.67,.12,1)';
          drawWheel(remaining);
          updateSub();
          spinBtn.disabled = false;
        }
      }, 3600);
    });

    doneBtn.addEventListener('click', function () {
      document.body.removeChild(overlay);
      resolve(resolved);
    });
  });
};
