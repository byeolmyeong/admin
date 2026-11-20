/** 서버 계약(서버 저장소 docs/architecture.md "관리자 API")의 모양. 값이 없는 필드는 null 이다. */

export interface Admin {
  id: string;
  loginId: string;
  name: string;
}

export interface AdminAccount extends Admin {
  active: boolean;
  createdAt: string;
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

export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_CATEGORIES = ['ACCOUNT', 'READING', 'SYNASTRY', 'BUG', 'OTHER'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export interface Inquiry {
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

export interface Stats {
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

/** 계약 "감사 기록" 의 행동 표 그대로(관리자). 조건(`action`)에 넣을 수 있는 값이다. */
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
  'FAQ_CREATED',
  'FAQ_UPDATED',
  'FAQ_PUBLISHED',
  'FAQ_UNPUBLISHED',
  'FAQ_DELETED',
  'FAQ_REORDERED',
  'APP_CONFIG_UPDATED',
  'MAINTENANCE_UPDATED',
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
  updatedAt: string;
  updatedBy: AdminRef | null;
}

export interface AppConfig {
  ios: PlatformConfig;
  android: PlatformConfig;
  maintenance: Maintenance;
}
