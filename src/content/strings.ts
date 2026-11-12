/**
 * 화면 문구의 단일 출처. 화면과 부품은 글자를 여기서만 가져온다.
 * 오류 코드는 서버 계약("관리자 API")의 `{ "error": "<코드>" }` 값이다.
 */
export const strings = {
  appName: '별명 관리자',

  common: {
    loading: '불러오는 중이에요…',
    retry: '다시 시도',
    cancel: '취소',
    save: '저장',
    saving: '저장하는 중…',
    none: '없음',
    /** 시각은 모두 한국 시간으로 적는다 */
    timeZoneNote: '시각은 한국 시간이에요.',
    count: (n: number) => n.toLocaleString('ko-KR'),
    counter: (n: number, max: number) => `${n.toLocaleString('ko-KR')} / ${max.toLocaleString('ko-KR')}자`,
  },

  /** 어느 화면에서나 같은 뜻인 오류. 화면마다 다른 코드는 그 화면의 errors 에 있다. */
  errors: {
    NETWORK: '서버에 연결하지 못했어요. 인터넷 연결과 서버 주소, 서버의 허용 출처 설정을 확인해 주세요.',
    INVALID_RESPONSE: '서버의 응답을 읽지 못했어요. 화면과 서버의 버전이 맞는지 확인해 주세요.',
    UNAUTHORIZED: '세션이 끝났어요. 다시 로그인해 주세요.',
    RATE_LIMITED: '요청이 너무 많아요. 잠시 뒤에 다시 시도해 주세요.',
    INVALID_REQUEST: '보낸 값이 올바르지 않아요. 입력을 확인하고 다시 시도해 주세요.',
    NOT_FOUND: '찾을 수 없어요. 이미 지워졌을 수 있어요.',
    UNKNOWN: '문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.',
  },

  config: {
    missingApiUrl: '서버 주소가 설정되지 않았어요. 환경 변수 VITE_API_URL 을 넣고 다시 실행해 주세요.',
  },

  login: {
    title: '관리자 로그인',
    loginId: '아이디',
    password: '비밀번호',
    submit: '로그인',
    submitting: '로그인하는 중…',
    required: '아이디와 비밀번호를 입력해 주세요.',
    noticeExpired: '세션이 끝났어요. 다시 로그인해 주세요.',
    noticeSignedOut: '로그아웃했어요.',
    errors: {
      INVALID_CREDENTIALS: '아이디 또는 비밀번호가 맞지 않아요. 사용이 중지된 계정일 수도 있어요.',
      RATE_LIMITED: '로그인 시도가 너무 많아요. 10분쯤 뒤에 다시 시도해 주세요.',
      INVALID_REQUEST: '아이디와 비밀번호를 입력해 주세요.',
    },
  },
} as const;
