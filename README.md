# byeolmyeong-admin

별명(가칭) 서비스의 관리자 페이지. 문의 관리 · 현황 숫자 · 자주 묻는 질문 편집 · 관리자 계정 · 감사 로그 · 앱 설정(최소 버전 · 점검).

- 앱: https://github.com/byeolmyeong/byeolmyeong-app
- 서버: https://github.com/byeolmyeong/byeolmyeong-api (관리자 API 도 서버에 있다. 이 저장소는 화면만 가진다)
- 서버 계약: 서버 저장소 `docs/architecture.md` 의 "관리자 API" 절, 결정 `docs/decisions/014-admin-back-office.md`
- 이 저장소의 규칙: `CLAUDE.md` · 결정: `docs/decisions/`(001 스택 · 002 화면 틀의 점검 상태)

## 준비

Node 22(`.nvmrc`).

```sh
nvm use
npm install
cp .env.example .env.local   # 값을 채운다. .env.local 은 커밋하지 않는다
```

환경 변수(이름만 — 값은 `.env.local` 에):

| 이름 | 뜻 |
|---|---|
| `VITE_API_URL` | 서버 주소. `스킴://호스트[:포트]`, 끝에 `/` 없이 |

## 실행

```sh
npm run dev        # http://localhost:5173 (포트 고정)
```

서버 쪽에 필요한 것(값은 서버의 환경에 둔다. 여기에는 이름만 적는다):

- `ADMIN_ALLOWED_ORIGINS` — 이 화면이 열리는 주소가 들어 있어야 브라우저가 `/admin/**` 를 부를 수 있다. 로컬 개발이면 `http://localhost:5173`(끝에 `/` 없이). 없으면 모든 호출이 "서버에 연결하지 못했어요" 로 보인다.
- 첫 관리자는 화면이나 API 로 만들 수 없다. 서버가 뜰 때 관리자가 한 명도 없고 `ADMIN_BOOTSTRAP_ID` · `ADMIN_BOOTSTRAP_PASSWORD` 가 둘 다 있으면 그 값으로 만들어진다(아이디는 소문자 · 숫자 · `.` `_` `-` 3~32자, 비밀번호는 10자 이상 72바이트 이하. 규칙에 안 맞으면 만들어지지 않는다). 관리자가 한 명이라도 있으면 두 변수는 읽히지 않는다. 그 뒤의 관리자는 화면의 "관리자" 에서 만든다.

## 검사

```sh
npx tsc --noEmit   # 타입
npm run lint       # ESLint
npm test           # Vitest (서버 호출은 fetch 를 흉내 낸다)
npm run build      # dist/ 에 정적 파일
```

## 배포

- 버셀 프로젝트 `byeolmyeong-admin`(팀 swyp)이 `main` 만 운영으로 올린다 → https://admin.byeolmyeong.com. 어드민은 스테이징이 없다(소유자 2026-11-20 "어드민은 스테이징 필요없고 그냥 운영만 있어도 돼").
- `develop` · 작업 브랜치는 버셀이 빌드하지 않는다(`vercel.json` 의 `ignoreCommand`). 고친 것은 `develop` 에 합친 뒤 `develop` → `main` PR 로 올린다(합치기 = 운영 배포, 소유자 확인).
- 서버 주소 `VITE_API_URL` 은 버셀 Production 환경 변수 `https://api.byeolmyeong.com`. 서버 운영 `.env` 의 `ADMIN_ALLOWED_ORIGINS` 가 `https://admin.byeolmyeong.com` 이다.
- 주소 하나라 새로 고침 · 깊은 주소는 `vercel.json` 의 되돌려 쓰기(모든 경로 → `index.html`)로 연다. 검색에 걸리지 않게 `X-Robots-Tag: noindex`.

## 화면과 주소

| 주소 | 화면 |
|---|---|
| `/login` | 로그인 |
| `/stats` | 현황 (첫 화면) |
| `/inquiries` · `/inquiries/:id` | 문의 목록(`?status=&category=&page=`) · 문의 한 건 |
| `/faqs` | 자주 묻는 질문 편집 · 초안 불러오기 |
| `/admins` | 관리자 목록 · 만들기 · 사용 중지/다시 켜기 · 다른 관리자의 비밀번호 재설정 |
| `/audit-logs` | 감사 로그(`?actorType=&action=&from=&to=&actorRef=&page=`) |
| `/app-config` | 앱 설정: 점검 켜기/끄기 · iOS/Android 최소 버전 · 스토어 주소 · 안내 문구 · 즉시 차단 |
| `/password` | 내 비밀번호 변경 |

- 로그인하면 세션 토큰을 `sessionStorage` 에 둔다(탭을 닫으면 사라진다). 세션은 로그인부터 12시간이고 늘어나지 않는다. 로그아웃 · 401 · 만료 때 지우고 로그인 화면으로 간다.
- 서버는 메일을 보내지 않는다. 문의의 답장은 관리자가 자기 메일로 보낸다(화면은 주소 복사와 `mailto:` 링크만 준다).
- 자주 묻는 질문의 공개 · 수정은 앱에 보이기까지 5분쯤 걸릴 수 있다(앱 쪽 응답이 5분 캐시된다).
- 감사 로그는 "누가 무엇을 언제" 만 보여 준다. 날짜 조건(`from` · `to`)은 한국 시간의 날짜이고, 계정 조건(`actorRef`)은 전체가 같은 것만 찾는다. 문의 상세의 "이 계정의 행동 보기" 가 그 계정으로 거른 목록을 연다.
- 앱 설정은 고친 값이 앱에 보이기까지 1분쯤 걸릴 수 있다. 즉시 차단을 켜거나 최소 버전을 올릴 때, 점검을 켤 때는 먼저 묻는다.
- 점검이 켜져 있으면 모든 화면 위에 "점검 중" 띠가 보인다. 로그인한 뒤 한 번 받고 앱 설정 화면이 받아 오거나 저장할 때 고친다(다른 관리자가 바꾼 것은 새로 고치거나 앱 설정을 열어야 보인다 — 결정 002).
- 다른 관리자의 비밀번호를 다시 정하면 그 관리자의 세션이 모두 끝난다. 새 비밀번호는 정한 사람이 직접 전한다.
- "초안 불러오기" 는 `src/content/faq-seed.json` 의 초안 가운데 같은 질문이 없는 것만 비공개로 만든다.

## 구조

- `src/app/` 라우터 · 화면 틀 · 구역 목록(`sections.tsx` — 새 구역은 여기에 한 줄)
- `src/features/` 화면(auth · stats · inquiries · faqs · admins · audit · app-config)
- `src/components/` 공용 부품 · `src/content/` 문구와 FAQ 초안
- `src/lib/` 서버 호출(`api/`)과 응답 검사 · 세션 보관 · 순수 함수
- `src/styles/tokens.css` 디자인 값(앱의 `theme.ts` 와 같은 값) · `app.css` 화면 스타일
