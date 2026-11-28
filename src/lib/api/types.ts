/** 서버 계약(서버 저장소 docs/architecture.md "관리자 API")의 모양. 값이 없는 필드는 null 이다. */

export interface Admin {
  id: string;
  loginId: string;
  name: string;
  /** 임시 비밀번호로 들어왔으면 true(결정 043 의 5) — 비밀번호를 바꾸기 전엔 다른 화면으로 못 간다 */
  mustChangePassword?: boolean;
}

export interface AdminAccount extends Admin {
  active: boolean;
  createdAt: string;
  /** 마지막 로그인(S⑪) */
  lastLoginAt?: string | null;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  admin: Admin;
}

/** 처리한(또는 마지막으로 고친) 관리자 */
export interface AdminRef {
  id: string;
  name: string;
}

/** 상태. ANSWERED 는 S⑧(문의 답변)에서 생긴다. */
export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'ANSWERED', 'DONE'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_CATEGORIES = ['ACCOUNT', 'READING', 'SYNASTRY', 'BUG', 'OTHER'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export interface Inquiry extends InquiryV2Fields {
  id: string;
  /** 계약의 다섯 값. 모르는 값이 와도 화면이 깨지지 않게 글자로 받는다. */
  category: string;
  body: string;
  replyEmail: string | null;
  createdAt: string;
  /** 계약의 세 값. 모르는 값이 와도 화면이 깨지지 않게 글자로 받는다. */
  status: string;
  memo: string | null;
  handledBy: AdminRef | null;
  handledAt: string | null;
  ownerRef: string;
}

export interface InquiryPage {
  items: Inquiry[];
  page: number;
  size: number;
  total: number;
}

export type Counts = Record<string, number>;

export interface Stats extends StatsV2Fields {
  generatedAt: string;
  accounts: { total: number; last7Days: number; last30Days: number };
  profiles: { total: number };
  readings: { total: number };
  reports: { total: number; byStatus: Counts };
  synastries: { total: number };
  synastryReports: { total: number; byStatus: Counts };
  directions: { total: number; byTopic: Counts };
  inquiries: { total: number; byStatus: Counts };
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
  updatedBy: AdminRef | null;
}

export const AUDIT_ACTOR_TYPES = ['ADMIN', 'USER', 'SYSTEM'] as const;

/** 계약 "감사 기록" 의 행동 표 그대로(관리자, 서버 `AuditAction` 과 같다). 조건(`action`)에 넣을 수 있는 값이다. */
export const AUDIT_ADMIN_ACTIONS = [
  'ADMIN_LOGIN',
  'ADMIN_LOGOUT',
  'ADMIN_PASSWORD_CHANGED',
  'ADMIN_PASSWORD_RESET',
  'ADMIN_CREATED',
  'ADMIN_DEACTIVATED',
  'ADMIN_REACTIVATED',
  'ADMIN_BOOTSTRAPPED',
  'INQUIRY_VIEWED',
  'INQUIRY_UPDATED',
  // 결정 039 — 답을 저장할 때마다
  'INQUIRY_ANSWERED',
  'FAQ_CREATED',
  'FAQ_UPDATED',
  'FAQ_PUBLISHED',
  'FAQ_UNPUBLISHED',
  'FAQ_DELETED',
  'FAQ_REORDERED',
  'APP_CONFIG_UPDATED',
  'MAINTENANCE_UPDATED',
  // 결정 043 의 8
  'ADMIN_PASSWORD_REISSUED',
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'USER_DELETED_BY_ADMIN',
  'GENERATION_RETRIED',
  'PUSH_EVENT_SENT',
] as const;

/** 계약 "감사 기록" 의 행동 표 그대로(앱 사용자). */
export const AUDIT_USER_ACTIONS = [
  'USER_LOGIN',
  'PROFILE_SAVED',
  'READING_GENERATED',
  'REPORT_REQUESTED',
  'SYNASTRY_CREATED',
  'SYNASTRY_REPORT_REQUESTED',
  'SYNASTRY_DELETED',
  'DIRECTION_GENERATED',
  'SHARE_CREATED',
  'SHARE_DELETED',
  'INQUIRY_SUBMITTED',
  'ACCOUNT_DELETED',
  // 결정 025 — 마케팅 수신 동의를 켜거나 끔
  'MARKETING_CONSENT_CHANGED',
  'TERMS_AGREED',
  'PUSH_CONSENT_CHANGED',
] as const;

/** label 은 보여 줄 글, ref 는 actorRef 조건에 그대로 넣는 값 */
export interface AuditActor {
  ref: string;
  label: string;
}

export interface AuditLog {
  id: string;
  occurredAt: string;
  /** 계약의 세 값. 모르는 값이 와도 화면이 깨지지 않게 글자로 받는다. */
  actorType: string;
  /** SYSTEM 이면 언제나 null */
  actor: AuditActor | null;
  /** 계약의 코드. 서버에 코드가 늘 수 있어 글자로 받고, 모르는 코드는 그대로 보여 준다. */
  action: string;
  targetType: string | null;
  targetId: string | null;
  outcome: string;
  /** 코드 값만 담은 작은 객체 */
  detail: Record<string, unknown> | null;
}

export interface AuditLogPage {
  items: AuditLog[];
  page: number;
  size: number;
  total: number;
}

export const PLATFORMS = ['ios', 'android'] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface PlatformConfig {
  /** 최신 버전(S⑧ — 미만이면 업데이트 권유 창) */
  latestVersion?: string | null;
  minVersion: string | null;
  storeUrl: string | null;
  message: string | null;
  blockNow: boolean;
  updatedAt: string;
  updatedBy: AdminRef | null;
}

export interface Maintenance {
  active: boolean;
  message: string | null;
  /** 켠 때 · 켠 관리자(결정 043 의 7) */
  startedAt?: string | null;
  startedBy?: AdminRef | null;
  updatedAt: string;
  updatedBy: AdminRef | null;
}

export interface AppConfig {
  ios: PlatformConfig;
  android: PlatformConfig;
  maintenance: Maintenance;
}

/* ── v2(서버 결정 043 · 044 와 S⑧ 문의 답변 · 최신 버전) ─────────────────────────
 * 서버가 아직 주지 않는 필드는 선택(?)으로 받는다. 화면은 없으면 "—" 로 그린다(소유자 "보드 그대로 지금 다").
 */

/** 새 문의 종류(앱 결정 058). 옛 READING · SYNASTRY · OTHER 줄은 읽기만 한다. */
export const INQUIRY_CATEGORIES_V2 = ['BUG', 'IDEA', 'ACCOUNT', 'ETC'] as const;

/** 문의를 보낸 사람(계정이 지워졌으면 null) */
export interface InquiryOwner {
  userId: string;
  nickname: string | null;
  provider: string | null;
  platform: string | null;
  appVersion: string | null;
  joinedAt: string | null;
}

export interface InquiryV2Fields {
  answer?: string | null;
  answeredAt?: string | null;
  answeredBy?: AdminRef | null;
  answerDraft?: string | null;
  owner?: InquiryOwner | null;
}

export interface UserRow {
  id: string;
  nickname: string | null;
  profileNo: number | null;
  emailMasked: string | null;
  /** KAKAO · APPLE · GOOGLE … 모르는 값은 그대로 */
  provider: string;
  joinedAt: string;
  lastSeenAt: string | null;
  /** NONE · GENERATING · DONE · FAILED */
  reports: { me: string; timing: string };
  /** ACTIVE · SUSPENDED */
  status: string;
}

export interface UserPage {
  items: UserRow[];
  page: number;
  size: number;
  total: number;
}

export interface UserDetail extends UserRow {
  consents: { termsVersion: string | null; privacyVersion: string | null; pushAt: string | null; marketingAt: string | null };
  /** 오늘의 하늘 알림 — 서버 푸시 묶음(결정 042)이 더한다. 그 전에는 없다. */
  todaySky?: { on: boolean; time: string | null } | null;
  birth: { registered: boolean; hasTime: boolean; hasPlace: boolean };
  /** kind: NICKNAME · REPORT_ME · REPORT_TIMING · TODAY_SKY, status: DONE · FAILED · GENERATING · PREBUILT … */
  generations: { kind: string; status: string; at: string | null }[];
  /** 등록 기기 — 서버 푸시 묶음(결정 042)이 더한다. 그 전에는 없다. */
  devices?: { platform: string; appVersion: string | null; lastSeenAt: string | null }[] | null;
  inquiries: { id: string; category: string; status: string; createdAt: string; excerpt?: string | null }[];
  recent: { at: string; action: string; detail?: string | null }[];
  /** by 는 정지한 관리자(없어졌으면 null) */
  suspension: { at: string; by: AdminRef | null; reason: string } | null;
}

/** 현황 v2(결정 043 의 3). 서버가 붙기 전에는 모두 없을 수 있다. */
export interface StatsV2Fields {
  users?: { total: number; joinedToday: number; joined7d: number };
  nicknames?: { total: number };
  /** 자세한 풀이 둘(결정 043 은 reports 라 불렀지만 옛 칸과 겹쳐 서버가 detailReports 로 — 서버 S⑪) */
  detailReports?: { me: number; timing: number; generating: number };
  /** 오늘의 하늘 — 셀 표가 생기기 전(서버 S④)에는 null */
  todaySky?: { today: number; onDemand: number; prebuilt: number } | null;
  /** 별명 생성 실패는 저장되지 않아 셀 수 없다 — 늘 null */
  failuresToday?: { nickname: number | null; report: number };
  /** 오늘의 푸시 — 서버 S⑩ 전에는 null */
  pushToday?: { sent: number; failed: number } | null;
  /** 답을 기다리는 문의(결정 043 은 inquiries 라 불렀지만 옛 칸과 겹쳐 inquiryQueue — 서버 S⑪) */
  inquiryQueue?: { waiting: number; oldestWaitingAt: string | null };
  consents?: { pushRate: number; marketingRate: number; adReachable: number };
}

export type ActiveRange = 'today' | 'week' | 'month';
export interface ActiveStats {
  range: string;
  points: { label: string; value: number }[];
  total: number;
  average: number;
  previousTotal: number;
}

export interface CreatedAdmin {
  admin: AdminAccount;
  temporaryPassword: string;
}

export const PUSH_TARGETS = ['HOME', 'TODAY_SKY', 'ME', 'TIMING_MONTH', 'TIMING_YEAR', 'MY'] as const;
export type PushTarget = (typeof PUSH_TARGETS)[number];

export interface PushEvent {
  id: string;
  sentAt: string;
  title: string;
  recipients: number;
  succeeded: number | null;
  failed: number | null;
  sentBy: string | null;
}

export interface PushEventPage {
  items: PushEvent[];
  page: number;
  size: number;
  total: number;
}

export interface PushStatus {
  canSend: boolean;
  /** null · QUIET_HOURS · DAILY_LIMIT */
  reason: string | null;
  sentTodayAt: string | null;
  sentTodayBy: string | null;
  nextAvailableAt: string | null;
}
