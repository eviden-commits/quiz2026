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
