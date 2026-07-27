/**
 * 관리자/진행자 화면 보호용 간단 비밀번호 로그인
 * 스크립트 속성(Script Properties)에 LoginPassWord 키로 비밀번호를 설정한다.
 * 설정하지 않으면 로그인 없이 통과(개발 편의).
 */

function authRequired_() {
  var real = PropertiesService.getScriptProperties().getProperty('LoginPassWord');
  return { requireLogin: !!real };
}

function checkLogin_(password) {
  var real = PropertiesService.getScriptProperties().getProperty('LoginPassWord');
  if (!real) return { requireLogin: false, ok: true };
  var ok = String(password) === String(real);
  if (!ok) throw new Error('비밀번호가 올바르지 않습니다.');
  return { requireLogin: true, ok: true };
}

/**
 * 관리자 전용 action은 클라이언트 UI 게이트만으로는 보호되지 않는다.
 * (누구나 exec URL에 action=... 을 직접 호출할 수 있으므로) 서버에서도 반드시 재검증한다.
 */
function assertAuthorized_(password) {
  var real = PropertiesService.getScriptProperties().getProperty('LoginPassWord');
  if (!real) return; // 비밀번호 미설정 시 개발 편의를 위해 통과
  if (String(password) !== String(real)) {
    throw new Error('인증이 필요합니다. 관리자 비밀번호가 올바르지 않습니다.');
  }
}
