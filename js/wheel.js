// 동률 추첨용 "운명의 수레바퀴" 모달. 당첨자는 화면 애니메이션과 무관하게
// Math.random()으로 먼저 공정하게 뽑고, 바퀴는 그 결과를 보여주는 연출로만 사용한다.
// neededCount: 상품이 걸린 자리 수만큼만 스핀한다 (그 이상은 순서가 의미 없으므로 스핀하지 않음).
window.runTieBreakWheel = function (names, startRank, neededCount) {
  neededCount = Math.min(neededCount || names.length, names.length);
  return new Promise(function (resolve) {
    var GOLD = '#e8c766';
    var SLICE_COLORS = ['#3a1f5d', '#5b2a86', '#7b2d43', '#8c3b2b', '#1f2f5d', '#2d5d55'];
    var remaining = names.slice();
    var resolved = [];

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle at 50% 40%, rgba(60,30,90,0.5), rgba(4,5,10,0.92));display:flex;align-items:center;justify-content:center;z-index:3000;';
    overlay.innerHTML =
      '<div class="card" style="max-width:440px; text-align:center; border-color:' + GOLD + '55;">' +
      '<div class="brandmark" style="color:' + GOLD + ';">TIE BREAKER</div>' +
      '<h1 class="title" style="font-size:24px;">🎡 운명의 수레바퀴</h1>' +
      '<p class="subtitle" id="wheelSub"></p>' +
      '<div style="position:relative; width:280px; height:280px; margin:0 auto 20px;">' +
        '<div style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:14px solid transparent; border-right:14px solid transparent; border-top:24px solid ' + GOLD + '; z-index:2; filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));"></div>' +
        '<canvas id="wheelCanvas" width="280" height="280" style="transition: transform 3.5s cubic-bezier(.17,.67,.12,1);"></canvas>' +
      '</div>' +
      '<div class="alert success hidden" id="wheelResult"></div>' +
      '<div id="wheelOrderList" class="winners-list"></div>' +
      '<button class="btn" id="wheelSpinBtn">🔮 돌리기</button>' +
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
    var CX = 140, CY = 140, R = 132;

    function updateSub() {
      var remainingNeeded = neededCount - resolved.length;
      subEl.textContent = (startRank + resolved.length) + '위 자리를 놓고 추첨합니다 (' + remaining.length + '명 중 1명, 남은 추첨 ' + remainingNeeded + '회)';
    }

    function drawStar(cx, cy, r) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, -Math.sin((18 + i * 72) * Math.PI / 180) * r);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * r * 0.45, -Math.sin((54 + i * 72) * Math.PI / 180) * r * 0.45);
      }
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.restore();
    }

    function drawWheel(items) {
      var n = items.length;
      var slice = (2 * Math.PI) / n;
      ctx.clearRect(0, 0, 280, 280);

      // 슬라이스
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, i * slice, (i + 1) * slice);
        ctx.closePath();
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 슬라이스 경계에 작은 보석 점
        var edgeX = CX + Math.cos(i * slice) * R;
        var edgeY = CY + Math.sin(i * slice) * R;
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = GOLD;
        ctx.fill();

        // 텍스트
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(i * slice + slice / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f4efe0';
        ctx.font = 'bold 14px "Pretendard", sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 3;
        ctx.fillText(items[i], R - 14, 5);
        ctx.restore();
      }

      // 금색 테두리 이중선
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY, R - 7, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = GOLD;
      ctx.stroke();

      // 중앙 허브 + 별
      ctx.beginPath();
      ctx.arc(CX, CY, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1030';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
      drawStar(CX, CY, 12);
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

        if (resolved.length >= neededCount) {
          // 남은 인원은 상품과 무관하므로 순서 상관없이 뒤에 붙인다.
          resolved = resolved.concat(remaining);
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
