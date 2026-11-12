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
} from './types';

export interface InquiryQuery {
  status?: string;
  category?: string;
  page?: number;
  size?: number;
}

/** 보낸 키만 바뀐다. memo: null 은 메모를 지운다. */
export interface InquiryPatch {
  status?: string;
  memo?: string | null;
}

export interface FaqPatch {
  question?: string;
  answer?: string;
  published?: boolean;
}

/** 모두 선택. 빈 값은 보내지 않는다(서버도 빈 값을 없는 것으로 본다). from · to 는 한국 시간의 날짜 YYYY-MM-DD. */
export interface AuditLogQuery {
  actorType?: string;
  action?: string;
  from?: string;
  to?: string;
  actorRef?: string;
  page?: number;
  size?: number;
}

/** 네 키를 모두 보낸다. 값이 없으면 null(빈 글이 아니다). */
export interface PlatformConfigInput {
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

const id = encodeURIComponent;

/** 계약 "관리자 API" 의 경로 표 그대로. 여기에 없는 경로는 서버에도 없다. */
export const createAdminApi = (client: Client) => ({
  login: (loginId: string, password: string): Promise<LoginResult> =>
    client.request('POST', '/admin/auth/login', { body: { loginId, password }, guard: isLoginResult, auth: false }),
  logout: (): Promise<void> => client.request('POST', '/admin/auth/logout'),
  me: (): Promise<Admin> => client.request('GET', '/admin/me', { guard: isAdmin }),
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    client.request('PUT', '/admin/me/password', { body: { currentPassword, newPassword } }),

  listAdmins: (): Promise<AdminAccount[]> => client.request('GET', '/admin/admins', { guard: arrayOf(isAdminAccount) }),
  createAdmin: (input: { loginId: string; name: string; password: string }): Promise<AdminAccount> =>
    client.request('POST', '/admin/admins', { body: input, guard: isAdminAccount }),
  setAdminActive: (adminId: string, active: boolean): Promise<AdminAccount> =>
    client.request('PATCH', `/admin/admins/${id(adminId)}`, { body: { active }, guard: isAdminAccount }),
  /** 다른 관리자의 비밀번호를 다시 정한다. 자기 것은 changePassword 다(서버가 409 로 막는다). */
  resetAdminPassword: (adminId: string, password: string): Promise<void> =>
    client.request('PUT', `/admin/admins/${id(adminId)}/password`, { body: { password } }),

  listInquiries: (query: InquiryQuery): Promise<InquiryPage> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.category) params.set('category', query.category);
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
