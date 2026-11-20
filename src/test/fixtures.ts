import type { Admin, AdminAccount, AppConfig, AuditLog, Faq, Inquiry, Maintenance, PlatformConfig, Stats, UserDetail, UserRow } from '../lib/api/types';

export const admin: Admin = { id: '11111111-1111-4111-8111-111111111111', loginId: 'owner', name: '김관리' };

export const adminAccount = (over: Partial<AdminAccount> = {}): AdminAccount => ({
  ...admin,
  active: true,
  createdAt: '2026-11-01T00:00:00Z',
  ...over,
});

export const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  category: 'BUG',
  body: '리포트가 열리지 않아요.\n두 번째 줄입니다.',
  replyEmail: 'user@example.com',
  createdAt: '2026-11-12T04:05:06Z',
  status: 'NEW',
  memo: null,
  handledBy: null,
  handledAt: null,
  ownerRef: '0123456789ab',
  ...over,
});

export const faq = (over: Partial<Faq> = {}): Faq => ({
  id: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
  question: '요금이 있나요?',
  answer: '지금은 모두 무료예요.',
  sortOrder: 1,
  published: true,
  updatedAt: '2026-11-12T04:05:06Z',
  updatedBy: { id: admin.id, name: admin.name },
  ...over,
});

export const stats = (over: Partial<Stats> = {}): Stats => ({
  generatedAt: '2026-11-12T04:05:06Z',
  accounts: { total: 120, last7Days: 7, last30Days: 30 },
  profiles: { total: 101 },
  readings: { total: 88 },
  reports: { total: 45, byStatus: { DONE: 40, WRITING: 3, FAILED: 2 } },
  synastries: { total: 33 },
  synastryReports: { total: 12, byStatus: { DONE: 10, WRITING: 1, FAILED: 1 } },
  directions: { total: 9, byTopic: { LOVE: 9 } },
  inquiries: { total: 6, byStatus: { NEW: 3, IN_PROGRESS: 2, DONE: 1 } },
  ...over,
});

/** 로그인 응답. expiresAt 은 먼 미래로 둔다(만료 테스트는 따로 정한다). */
export const loginResult = (expiresAt = '2099-01-01T00:00:00Z') => ({ token: 'tok-test', expiresAt, admin });

export const auditLog = (over: Partial<AuditLog> = {}): AuditLog => ({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  occurredAt: '2026-11-12T04:05:06Z',
  actorType: 'ADMIN',
  actor: { ref: 'root-admin', label: 'root-admin' },
  action: 'ADMIN_LOGIN',
  targetType: null,
  targetId: null,
  outcome: 'SUCCESS',
  detail: null,
  ...over,
});

/** 한 번도 고치지 않은 플랫폼 설정(계약의 처음 값) */
export const platformConfig = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  minVersion: null,
  storeUrl: null,
  message: null,
  blockNow: false,
  updatedAt: '2026-11-12T04:05:06Z',
  updatedBy: null,
  ...over,
});

export const maintenance = (over: Partial<Maintenance> = {}): Maintenance => ({
  active: false,
  message: null,
  updatedAt: '2026-11-12T04:05:06Z',
  updatedBy: null,
  ...over,
});

export const appConfig = (over: Partial<AppConfig> = {}): AppConfig => ({
  ios: platformConfig(),
  android: platformConfig(),
  maintenance: maintenance(),
  ...over,
});

/** 현황 v2(결정 043 의 3) 필드까지 채운 값 */
export const statsV2 = (): Stats => ({
  ...stats(),
  reports: { total: 45, byStatus: { DONE: 40, WRITING: 3, FAILED: 2 }, me: 214, timing: 172, generating: 4 },
  inquiries: { total: 6, byStatus: { NEW: 3, IN_PROGRESS: 2, DONE: 1 }, waiting: 5, oldestWaitingAt: '2026-11-10T04:05:06Z' },
  users: { total: 1284, joinedToday: 32, joined7d: 214 },
  nicknames: { total: 1201 },
  todaySky: { today: 412, onDemand: 132, prebuilt: 280 },
  failuresToday: { nickname: 1, report: 2 },
  pushToday: { sent: 1920, failed: 12 },
  consents: { pushRate: 0.62, marketingRate: 0.18, adReachable: 211 },
});

export const activeStats = (range = 'week') => ({
  range,
  points: ['월', '화', '수', '목', '금', '토', '오늘'].map((label, i) => ({ label, value: [132, 141, 128, 156, 149, 171, 158][i] ?? 0 })),
  total: 1020,
  average: 148,
  previousTotal: 911,
});

export const userRow = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'uuuuuuuu-uuuu-4uuu-8uuu-uuuuuuuuuuu1',
  nickname: '새벽별',
  profileNo: 1,
  emailMasked: 'dawn****@kakao.com',
  provider: 'KAKAO',
  joinedAt: '2026-11-08T05:20:05Z',
  lastSeenAt: '2026-11-19T23:12:44Z',
  reports: { me: 'DONE', timing: 'DONE' },
  status: 'ACTIVE',
  ...over,
});

export const userDetail = (over: Partial<UserDetail> = {}): UserDetail => ({
  ...userRow(),
  consents: { termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushAt: '2026-11-08T05:20:05Z', marketingAt: null },
  todaySky: { on: true, time: '08:00' },
  birth: { registered: true, hasTime: true, hasPlace: true },
  generations: [
    { kind: 'NICKNAME', status: 'DONE', at: '2026-11-08T05:22:10Z' },
    { kind: 'REPORT_ME', status: 'DONE', at: '2026-11-09T13:10:36Z' },
    { kind: 'REPORT_TIMING', status: 'FAILED', at: '2026-11-20T05:02:07Z' },
    { kind: 'TODAY_SKY', status: 'PREBUILT', at: '2026-11-19T22:30:00Z' },
  ],
  devices: [{ platform: 'ios', appVersion: '1.0.2', lastSeenAt: '2026-11-19T23:12:44Z' }],
  inquiries: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category: 'BUG', status: 'NEW', createdAt: '2026-11-17T23:42:13Z', excerpt: '아침에 오늘의 하늘 알림이 오지 않아요.' }],
  recent: [{ at: '2026-11-17T23:42:13Z', action: 'INQUIRY_SUBMITTED', detail: '오류' }],
  suspension: null,
  ...over,
});
