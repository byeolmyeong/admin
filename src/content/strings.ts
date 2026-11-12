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

  /** 문의의 처리 상태(문의 화면과 현황이 함께 쓴다) */
  inquiryStatus: { NEW: '새 문의', IN_PROGRESS: '처리 중', DONE: '끝남' },

  stats: {
    title: '현황',
    refresh: '새로 고침',
    generatedAt: (time: string) => `${time}에 센 값`,
    note: '모든 숫자는 지금 남아 있는 것이에요(누적이 아니에요). 계정이 지워지면 그 사람의 기록도 함께 빠져요.',
    noteReports:
      '리포트의 "실패" 는 지금 실패 상태로 남아 있는 수예요(다시 요청해 성공하면 "완료" 로 바뀌어요). "쓰는 중" 에는 서버가 꺼져 멈춘 것도 들어 있어요. 저장되지 않는 생성 실패는 세지 못해요.',
    groups: {
      accounts: '계정',
      profiles: '출생 정보를 저장한 계정',
      readings: '요약 해석',
      reports: '심층 리포트',
      synastries: '궁합',
      synastryReports: '궁합 리포트',
      directions: '방향성 제시',
      inquiries: '문의',
    },
    last7Days: '최근 7일',
    last30Days: '최근 30일',
    reportStatus: { DONE: '완료', WRITING: '쓰는 중', FAILED: '실패' },
    topics: { LOVE: '연애' },
  },

  inquiries: {
    title: '문의',
    filterStatus: '상태',
    filterCategory: '종류',
    all: '전체',
    categories: { ACCOUNT: '계정', READING: '해석', SYNASTRY: '궁합', BUG: '오류', OTHER: '기타' },
    columns: {
      category: '종류',
      status: '상태',
      excerpt: '내용',
      ownerRef: '보낸 계정',
      createdAt: '보낸 때',
      handler: '처리한 관리자',
    },
    listLabel: '문의 목록',
    notHandled: '아직 없음',
    empty: '조건에 맞는 문의가 없어요.',
    emptyPage: '이 쪽에는 문의가 없어요. 앞쪽으로 돌아가 주세요.',
    total: (n: number) => `모두 ${n.toLocaleString('ko-KR')}건`,
    pagerLabel: '쪽 이동',
    prev: '이전',
    next: '다음',
    position: (page: number, pages: number) => `${page} / ${pages}쪽`,
    errors: {
      INVALID_STATUS: '고를 수 없는 상태예요. 조건을 다시 골라 주세요.',
      INVALID_PAGE: '없는 쪽이에요. 첫 쪽부터 다시 봐 주세요.',
    },
    detail: {
      title: '문의 내용',
      back: '목록으로',
      body: '문의 글',
      replyEmail: '답장 받을 이메일',
      noReplyEmail: '이메일을 남기지 않았어요.',
      copy: '주소 복사',
      copied: '주소를 복사했어요.',
      copyFailed: '복사하지 못했어요. 주소를 직접 선택해 복사해 주세요.',
      mailto: '메일 쓰기',
      mailNote: '서버는 메일을 보내지 않아요. 답장은 내 메일에서 직접 보내요.',
      ownerRef: '보낸 계정',
      ownerRefHelp: '같은 계정이 보낸 문의는 이 값이 같아요. 계정을 찾는 값은 아니에요.',
      createdAt: '보낸 때',
      category: '종류',
      status: '처리 상태',
      statusSaved: '상태를 바꿨어요.',
      memo: '관리자 메모',
      memoHelp: '관리자끼리만 보여요. 비우고 저장하면 메모를 지워요.',
      memoSave: '메모 저장',
      memoSaved: '메모를 저장했어요.',
      handled: '마지막으로 처리',
      handledBy: (name: string, time: string) => `${name} · ${time}`,
      notHandled: '아직 아무도 처리하지 않았어요.',
      gone: '이 문의는 더 이상 없어요. 보낸 사람이 계정을 지우면 문의도 함께 지워져요.',
      errors: {
        INVALID_MEMO: '메모는 2,000자까지 쓸 수 있어요. 줄이고 다시 저장해 주세요.',
        INVALID_STATUS: '고를 수 없는 상태예요.',
      },
    },
  },
} as const;
