// 접속 게이트 공용 암호 해시 — 관리자 소유 값. 이 파일은 이후 작업에서 수정 금지.
//
// 사용법: 브라우저 콘솔에서 아래 1줄로 암호의 SHA-256 hex(소문자 64자)를 만든다.
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('암호')).then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')))
//
// 이 파일의 해시만 고쳐 암호를 바꾼다. 바꾼 뒤 deploy.ps1로 재배포해야 공개 URL에 반영된다.
// 빈 문자열이면 게이트가 비활성화되어 앱이 정상 개방된다(fail-open).
export const ACCESS_SHA256 = '';

