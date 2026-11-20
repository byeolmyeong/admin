import type { Client } from './client';
import {
  arrayOf,
  isAdmin,
  isAdminAccount,
  isAppConfig,
  isAuditLogPage,
  isFaq,
  isInquiry,
  isInquiryPage,
  isLoginResult,
  isMaintenance,
  isPlatformConfig,
  isStats,
  isActiveStats,
  isAudience,
  isCreatedAdmin,
  isPushEventPage,
  isPushStatus,
  isSentPush,
  isTemporaryPassword,
  isUserDetail,
  isUserPage,
} from './guards';
import type {
  Admin,
  AdminAccount,
  AppConfig,
  AuditLogPage,
  Faq,
  Inquiry,
  InquiryPage,
  LoginResult,
  Maintenance,
  Platform,
  PlatformConfig,
  Stats,
  ActiveRange,
  ActiveStats,
  CreatedAdmin,
  PushEventPage,
  PushStatus,
  PushTarget,
  UserDetail,
  UserPage,
} from './types';

export interface InquiryQuery {
  status?: string;
  category?: string;
  /** 내용 · 닉네임 일부(S⑧) */
  q?: string;
  page?: number;
  size?: number;
}

/** 보낸 키만 바뀐다. memo: null 은 메모를 지운다. answer 는 답변 전송(처음 한 번 알림), answerDraft 는 알림 없는 임시 저장(S⑧). */
export interface InquiryPatch {
  status?: string;
  memo?: string | null;
  answer?: string;
  answerDraft?: string | null;
}

export interface FaqPatch {
  question?: string;
  answer?: string;
  published?: boolean;
}

/** 모두 선택. 빈 값은 보내지 않는다(서버도 빈 값을 없는 것으로 본다). from · to 는 한국 시간의 날짜 YYYY-MM-DD. */
export interface AuditLogQuery {
  /** 닉네임 · 관리자 아이디 일부(결정 043 의 8) */
  q?: string;
  actorType?: string;
  action?: string;
  from?: string;
  to?: string;
  actorRef?: string;
  page?: number;
  size?: number;
}

/** 모든 키를 보낸다. 값이 없으면 null(빈 글이 아니다). latestVersion 은 S⑧ — 옛 서버는 읽지 않는 키를 무시한다. */
export interface PlatformConfigInput {
  latestVersion: string | null;
  minVersion: string | null;
  storeUrl: string | null;
  message: string | null;
  blockNow: boolean;
}

/** 두 키를 모두 보낸다. */
export interface MaintenanceInput {
  active: boolean;
  message: string | null;
}

/** 사용자 목록 조건(결정 043 의 1). 빈 값은 보내지 않는다. */
export interface UserQuery {
  q?: string;
  status?: string;
  provider?: string;
  joinedFrom?: string;
  joinedTo?: string;
  page?: number;
  size?: number;
}

export interface PushInput {
  title: string;
  body: string;
  target: PushTarget;
}

const id = encodeURIComponent;
const queryOf = (query: Record<string, string | number | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/** 계약 "관리자 API" 의 경로 표 그대로. 여기에 없는 경로는 서버에도 없다. */
export const createAdminApi = (client: Client) => ({
  login: (loginId: string, password: string): Promise<LoginResult> =>
    client.request('POST', '/admin/auth/login', { body: { loginId, password }, guard: isLoginResult, auth: false }),
  logout: (): Promise<void> => client.request('POST', '/admin/auth/logout'),
  me: (): Promise<Admin> => client.request('GET', '/admin/me', { guard: isAdmin }),
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    client.request('PUT', '/admin/me/password', { body: { currentPassword, newPassword } }),

  listAdmins: (): Promise<AdminAccount[]> => client.request('GET', '/admin/admins', { guard: arrayOf(isAdminAccount) }),
  /** 아이디만 보내면 서버가 임시 비밀번호를 만든다 — 이 응답에서 한 번만 보인다(결정 043 의 5). */
  createAdmin: (loginId: string): Promise<CreatedAdmin> => client.request('POST', '/admin/admins', { body: { loginId }, guard: isCreatedAdmin }),
  /** 임시 비밀번호 재발급. 그 관리자의 세션은 모두 끝난다(결정 043 의 5). */
  reissuePassword: (adminId: string): Promise<string> =>
    client.request('POST', `/admin/admins/${id(adminId)}/password-reset`, { guard: isTemporaryPassword }).then((r) => r.temporaryPassword),
  setAdminActive: (adminId: string, active: boolean): Promise<AdminAccount> =>
    client.request('PATCH', `/admin/admins/${id(adminId)}`, { body: { active }, guard: isAdminAccount }),

  listInquiries: (query: InquiryQuery): Promise<InquiryPage> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.category) params.set('category', query.category);
    if (query.q) params.set('q', query.q);
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.size !== undefined) params.set('size', String(query.size));
    const qs = params.toString();
    return client.request('GET', `/admin/inquiries${qs ? `?${qs}` : ''}`, { guard: isInquiryPage });
  },
  getInquiry: (inquiryId: string): Promise<Inquiry> =>
    client.request('GET', `/admin/inquiries/${id(inquiryId)}`, { guard: isInquiry }),
  patchInquiry: (inquiryId: string, patch: InquiryPatch): Promise<Inquiry> =>
    client.request('PATCH', `/admin/inquiries/${id(inquiryId)}`, { body: patch, guard: isInquiry }),

  getStats: (): Promise<Stats> => client.request('GET', '/admin/stats', { guard: isStats }),
  getActiveStats: (range: ActiveRange): Promise<ActiveStats> => client.request('GET', `/admin/stats/active?range=${range}`, { guard: isActiveStats }),

  listUsers: (query: UserQuery): Promise<UserPage> => client.request('GET', `/admin/users${queryOf({ ...query })}`, { guard: isUserPage }),
  getUser: (userId: string): Promise<UserDetail> => client.request('GET', `/admin/users/${id(userId)}`, { guard: isUserDetail }),
  suspendUser: (userId: string, reason: string): Promise<void> => client.request('POST', `/admin/users/${id(userId)}/suspend`, { body: { reason } }),
  unsuspendUser: (userId: string, reason: string): Promise<void> => client.request('POST', `/admin/users/${id(userId)}/unsuspend`, { body: { reason } }),
  deleteUser: (userId: string, reason: string, confirmNickname: string): Promise<void> =>
    client.request('DELETE', `/admin/users/${id(userId)}`, { body: { reason, confirmNickname } }),
  /** 실패한 생성만 다시 만든다(결정 043 의 1). kind: NICKNAME · REPORT_ME · REPORT_TIMING */
  regenerate: (userId: string, kind: string): Promise<void> => client.request('POST', `/admin/users/${id(userId)}/regenerate`, { body: { kind } }),

  getPushAudience: (): Promise<number> => client.request('GET', '/admin/push/audience', { guard: isAudience }).then((r) => r.count),
  getPushStatus: (): Promise<PushStatus> => client.request('GET', '/admin/push/status', { guard: isPushStatus }),
  listPushEvents: (page: number, size: number): Promise<PushEventPage> =>
    client.request('GET', `/admin/push/events${queryOf({ page, size })}`, { guard: isPushEventPage }),
  /** 서버가 제목 앞 "(광고) " 와 본문 끝 수신 거부 안내를 붙인다 — 화면은 붙이지 않는다(결정 043 의 6). */
  sendPush: (input: PushInput): Promise<{ id: string; recipients: number }> => client.request('POST', '/admin/push/events', { body: input, guard: isSentPush }),

  listFaqs: (): Promise<Faq[]> => client.request('GET', '/admin/faqs', { guard: arrayOf(isFaq) }),
  createFaq: (input: { question: string; answer: string; published: boolean }): Promise<Faq> =>
    client.request('POST', '/admin/faqs', { body: input, guard: isFaq }),
  patchFaq: (faqId: string, patch: FaqPatch): Promise<Faq> =>
    client.request('PATCH', `/admin/faqs/${id(faqId)}`, { body: patch, guard: isFaq }),
  deleteFaq: (faqId: string): Promise<void> => client.request('DELETE', `/admin/faqs/${id(faqId)}`),
  orderFaqs: (ids: string[]): Promise<Faq[]> =>
    client.request('PUT', '/admin/faqs/order', { body: { ids }, guard: arrayOf(isFaq) }),

  listAuditLogs: (query: AuditLogQuery): Promise<AuditLogPage> => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.actorType) params.set('actorType', query.actorType);
    if (query.action) params.set('action', query.action);
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.actorRef) params.set('actorRef', query.actorRef);
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.size !== undefined) params.set('size', String(query.size));
    const qs = params.toString();
    return client.request('GET', `/admin/audit-logs${qs ? `?${qs}` : ''}`, { guard: isAuditLogPage });
  },

  getAppConfig: (): Promise<AppConfig> => client.request('GET', '/admin/app-config', { guard: isAppConfig }),
  putPlatformConfig: (platform: Platform, input: PlatformConfigInput): Promise<PlatformConfig> =>
    client.request('PUT', `/admin/app-config/${platform}`, { body: input, guard: isPlatformConfig }),
  putMaintenance: (input: MaintenanceInput): Promise<Maintenance> =>
    client.request('PUT', '/admin/app-config/maintenance', { body: input, guard: isMaintenance }),
});

export type AdminApi = ReturnType<typeof createAdminApi>;
