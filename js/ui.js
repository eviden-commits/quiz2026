// 화면 전환 시 부드러운 페이드+슬라이드 모션을 적용하는 공용 헬퍼
window.showScreenAnimated = function (screens, name) {
  Object.keys(screens).forEach(function (k) {
    var el = screens[k];
    if (k === name) {
      el.classList.remove('hidden');
      el.classList.remove('screen-anim');
      void el.offsetWidth; // reflow로 애니메이션 재시작
      el.classList.add('screen-anim');
    } else {
      el.classList.add('hidden');
    }
  });
};
