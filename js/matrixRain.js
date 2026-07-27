// DB 문제 텍스트에서 글자를 뽑아 흐릿한 매트릭스 스타일 배경 레인을 그린다.
(function () {
  var FALLBACK_CHARS = '안전퀴즈현장근로자정답문제참여진행0123456789';

  function randomHexToken() {
    return '0x' + Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  }

  // 오답률(0~1)에 따라 초록 -> 붉은색으로 이어지는 그라데이션 색상을 계산한다.
  var GREEN = [0, 255, 106];
  var RED = [255, 23, 68];
  var currentColor = 'rgb(' + GREEN.join(',') + ')';

  function colorForWrongRatio(ratio) {
    var t = Math.max(0, Math.min(1, ratio));
    var rgb = GREEN.map(function (start, idx) {
      return Math.round(start + (RED[idx] - start) * t);
    });
    return 'rgb(' + rgb.join(',') + ')';
  }

  window.setMatrixWrongRatio = function (ratio) {
    currentColor = colorForWrongRatio(ratio);
  };

  function startRain(poolText) {
    var chars = (poolText || '').replace(/\s+/g, '').split('').filter(Boolean);
    if (chars.length < 20) chars = FALLBACK_CHARS.split('');

    var canvas = document.createElement('canvas');
    canvas.id = 'matrix-rain-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;opacity:0.2;';
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    var fontSize = 16;
    var columns, drops;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(0).map(function () { return Math.random() * -50; });
    }
    resize();
    window.addEventListener('resize', resize);

    function frame() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = currentColor;
      ctx.font = fontSize + 'px monospace';
      for (var i = 0; i < columns; i++) {
        var ch = Math.random() < 0.06 ? randomHexToken() : chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }
    setInterval(frame, 60);
  }

  if (window.QuizApi) {
    QuizApi.call('getQuestionPoolText', {})
      .then(function (res) { startRain(res.text); })
      .catch(function () { startRain(''); });
  } else {
    startRain('');
  }
})();
