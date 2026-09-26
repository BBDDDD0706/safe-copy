# 세이프카피 (safe-copy)

신분증·통장 사본에 "제출처 · 날짜 · 용도 제한" 워터마크를 넣고, 주민번호 뒷자리 같은 민감 정보를 가리는 웹 도구입니다.
사진은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.

## 구성

- `index.html`, `app.js`: 워터마크/가리기 도구 (JPG·PNG·PDF 저장)
- `guide.html`: 사용법 · FAQ (애드센스 심사용 안내 콘텐츠)
- `privacy.html`: 개인정보처리방침
- `sitemap.xml`, `robots.txt`: SEO

빌드 과정 없는 정적 사이트입니다. `index.html`을 브라우저로 열면 바로 동작합니다.

## 배포 (Vercel)

1. vercel.com에서 GitHub로 로그인
2. Add New → Project → `safe-copy` 저장소 Import → Deploy
3. 배포 주소가 `safe-copy.vercel.app`이 아니거나 도메인을 연결했다면
   `index.html`, `guide.html`, `privacy.html`의 canonical 주소와 `sitemap.xml`, `robots.txt`의 주소를 바꿔 주세요.

## 광고 달기 전 할 일

- `privacy.html`의 `[운영자 이메일 입력]` 채우기
- 구글 서치 콘솔 / 네이버 서치 어드바이저에 사이트와 `sitemap.xml` 등록
- 애드센스 승인 후 광고 코드는 `<head>`에 추가
