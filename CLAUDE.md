# 관리 화면 저장소 (byeolmyeong-admin)

별명(가칭) 서비스의 관리자 웹 화면. 문의 관리 · 현황 숫자 · 자주 묻는 질문 편집 · 관리자 계정 · 감사 로그 · 앱 설정. 화면만 가진다 — API 는 서버 저장소(`byeolmyeong-api`)에 있다.

## 서버 계약 (단일 출처)
- 서버 저장소 `docs/architecture.md` 의 "관리자 API" 절과 `docs/decisions/014-admin-back-office.md` · `043-admin-v2.md`(사용자 · 현황 v2 · 임시 비밀번호 · 푸시 발송) · `044-account-suspension.md`.
- 그 절에 없는 경로·필드·오류 코드를 만들어 쓰지 않는다. 계약이 바뀌면 `src/lib/api/` 의 타입·검사와 테스트를 같은 커밋에서 고친다.

## 스택 (결정: docs/decisions/001-stack.md · 화면 틀의 점검 상태는 002 · v2 메뉴 · 화면 · 반응형 · 동작 · 글귀 규칙은 003)
Vite · React · TypeScript(strict) · React Router · CSS 파일(토큰) · Vitest + Testing Library · ESLint. Node 22(`.nvmrc`).

## 명령어 (Node 22)
- 개발: `npm run dev` (http://localhost:5173) · 빌드: `npm run build`
- 테스트: `npm test` · 타입: `npx tsc --noEmit` · 린트: `npm run lint`
- 환경 변수 이름은 `.env.example` (값은 `.env.local`, 커밋하지 않는다)

## 디렉터리 (이름이 곧 지시)
- `src/app/` 라우터 · 화면 틀(왼쪽 메뉴) · 구역 목록(`sections.tsx` — 메뉴와 라우트가 여기서 나온다. 새 구역은 여기에 한 줄)
- `src/features/<영역>/` 화면과 그 로직(auth · stats · inquiries · faqs · admins · audit · app-config)
- `src/components/` 공용 부품 · `src/content/` 문구(`strings.ts`)와 FAQ 초안(`faq-seed.json`)
- `src/lib/` 서버 호출(`api/`) · 세션 보관 · 글자 수 세기 등 순수 함수
- `src/styles/` 디자인 값(`tokens.css`)과 화면 스타일(`app.css`)
- `docs/decisions/` 결정 기록(번호순). `dist/` 는 생성물이다.

## 규칙
- 화면 문구는 한국어이고 `src/content/strings.ts` 에서만 가져온다.
- 색 · 글자 · 간격 · 크기는 `src/styles/tokens.css` 에서만 정한다(결정 003 의 밝은 테마 — 바탕 `#F5F6F8` · 카드 흰색 · 주 색 `#4752FF` · Pretendard. 지금 값을 바꾸는 일은 계획 D⓪).
- 테스트 먼저: 로직과 화면은 실패하는 테스트를 보고 구현한다. 서버 호출은 테스트에서 `fetch` 를 흉내 낸다.
- 서버 응답은 쓰기 전에 실행 시점에 모양을 검사한다(`src/lib/api/guards.ts`).
- 비밀값을 저장소에 두지 않는다. `.env.example` 에는 이름만.
- 토큰 · 비밀번호 · 문의 글 · 이메일을 로그에 남기지 않는다(`console` 은 린트가 막는다).
- 세션 토큰은 `sessionStorage` 에만 둔다. `localStorage` 에는 아무것도 두지 않는다. 비밀번호는 요청 뒤 화면 상태에서 지운다.
- 사용자가 쓴 글(문의 · FAQ)은 글자로만 그린다. HTML 로 해석하지 않는다.
- 요청한 것만 만든다.
- 커밋: 한국어 + Conventional Commits, 한 커밋 = 한 관심사. 작업 브랜치에서 한다(`main` 에 직접 쓰지 않는다).
- 끝났다고 말하기 전에 `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build` 를 이번에 돌린다.
- 결정이 바뀌면 코드보다 먼저 `docs/decisions/` 에 새 번호로 적는다.
