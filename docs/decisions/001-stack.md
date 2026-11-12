---
type: decision
tags: [스택, Vite, React, TypeScript, 테스트]
status: active
last_reviewed: 2026-11-12
superseded_by:
---
# 001. 관리 화면은 Vite + React + TypeScript 의 한 쪽짜리 웹 앱으로 만든다

> 상태: 활성 · 결정일 2026-11-12(소유자) · 서버 쪽 결정: 서버 저장소 `docs/decisions/014-admin-back-office.md`

## 맥락
- 서버에 관리자 API(`/admin/**`)가 생겼고, 화면은 이 저장소가 맡는다. 쓰는 사람은 관리자 몇 명이고 데스크톱 브라우저에서 쓴다.
- 화면은 여섯 가지다(로그인 · 현황 · 문의 · 자주 묻는 질문 · 관리자 · 비밀번호 변경). 검색 노출도 서버 렌더링도 필요 없다.
- 앱(`byeolmyeong-app`)과 같은 제품으로 보여야 한다(앱 결정 018 의 색 · 글꼴 · 부품 크기).

## 결정
- **Vite + React + TypeScript(strict)** 의 SPA. 라우팅은 **React Router**.
- **UI 프레임워크를 쓰지 않는다.** 디자인 값은 `src/styles/tokens.css` 의 CSS 변수 한 곳(앱 `theme.ts` 와 같은 값)이고, 화면 스타일은 그 변수만 쓰는 CSS 파일이다. 글꼴은 `pretendard` 패키지를 빌드에 넣는다(외부 CDN 을 부르지 않는다).
- 서버 호출은 **`fetch` 를 감싼 얇은 함수** 하나. 응답은 손으로 쓴 **실행 시점 타입 검사**를 통과한 것만 화면에 준다. 오류는 계약의 `{ "error": "<코드>" }` 를 코드로 읽어 문구로 바꾼다. `credentials` 는 주지 않는다(쿠키를 쓰지 않는다).
- 세션 토큰은 **`sessionStorage`** 에 둔다(탭을 닫으면 사라진다). 로그아웃 · 401 · `expiresAt` 이 지나면 지운다. 서버 상태를 담는 라이브러리(React Query 등)와 전역 상태 라이브러리는 쓰지 않는다 — 화면마다 받아서 그린다.
- 테스트는 **Vitest + Testing Library(jsdom)**, `fetch` 를 흉내 낸다. 린트는 **ESLint + typescript-eslint**.
- TypeScript 는 6.0 대에 고정한다 — 2026-11-12 기준 typescript-eslint 8 이 `<6.1.0` 까지만 받는다(7 은 받지 않는다).
- 개발 서버는 Vite 기본값 `5173`. 서버의 `ADMIN_ALLOWED_ORIGINS` 에 이 주소가 있어야 브라우저가 부를 수 있다.

## 버린 대안
- Next.js 등 서버 렌더링 틀 — 로그인 뒤에만 보이는 내부 화면이라 얻는 것이 없고 배포가 무거워진다.
- UI 프레임워크(MUI · Ant Design 등) — 앱의 디자인 값과 맞추려면 덮어쓰는 일이 더 많다. 화면이 여섯 개뿐이다.
- 스키마 라이브러리(zod 등) — 응답 모양이 열 개 남짓이라 손으로 쓴 검사로 충분하다. 늘어나면 다시 본다.
- `localStorage` 에 토큰 — 탭을 닫아도 남는다. 세션이 12시간이고 갱신이 없으니 탭 단위면 충분하다.

## 영향
- 배포물은 정적 파일(`dist/`)이다. 어디에 올릴지는 아직 정하지 않았다. [확인 필요] 소유자.
- 새 구역(다음: 감사 로그)은 `src/app/sections.tsx` 에 한 줄을 더해 메뉴와 라우트에 함께 나타나게 한다.
