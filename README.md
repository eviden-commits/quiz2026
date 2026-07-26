# 현장 퀴즈 챔피언 (quiz2026)

근로자 대상 현장 퀴즈 프로그램. HTML(GitHub Pages) + Google Sheets(DB) + Google Apps Script(백엔드 API)로 구성됩니다.

## 구성

- `index.html` — 진행자형 / 참여형 선택
- `host.html` + `js/host.js` — 진행자형: 퀴즈번호 입력 → 문제 표시 → 마우스로 진행, 정답자 이름 기입, 종료 시 축하 화면
- `play.html` + `js/play.js` — 참여형: 퀴즈번호+참여코드 입력(중복 시 경고) → 개인 문제풀이 → 마감 후 이름 입력 → 순위 확인
- `admin.html` + `js/admin.js` — 문제 출제(data→quiz), 사전설정(상품/수상자수/제한시간), 진행 제어, QR 생성
- `gas/` — Apps Script 백엔드 (clasp 프로젝트). Google Sheet에 바인딩되어 있음.

## Google Sheets 구조

- `data` : 문제 은행 (id, category, question, choice1-4, answer, points, active)
- `quiz` : 실제 회차용 문제 (quizNo, order, question, choice1-4, answer, points) — admin.html에서 data로부터 자동 생성
- `settings` : 회차별 사전설정 (quizNo, title, quizCount, prizeCount, winnerCount, prizeNames, timeLimitSec)
- `participants` : 참여형 참가자 기록 (quizNo, code, name, correctCount, score, rank, status)
- `answers` : 참여형 개인별 응답 로그
- `sessions` : 진행/접수 상태 (host/participant 모드별)
- `winners` : 진행자형 정답자 기록

## 배포

- Apps Script: `cd gas && clasp push && clasp deploy`
- 배포 후 웹앱 exec URL을 `js/config.js`의 `API_URL`에 반영
- 관리자/진행자 화면 비밀번호 보호가 필요하면 Apps Script 프로젝트의 스크립트 속성(Script Properties)에 `LoginPassWord` 키로 값을 설정 (설정하지 않으면 로그인 없이 접근 가능)
- 프론트엔드는 GitHub Pages로 정적 호스팅

## 최초 1회 필수 작업

Apps Script가 스프레드시트에 접근하려면 배포 전에 에디터에서 아무 함수(`ensureAllSheets_` 등)를 한 번 실행하여 OAuth 권한을 승인해야 합니다. 승인하지 않으면 익명 사용자의 웹앱 접근이 로그인 페이지로 리다이렉트됩니다.
