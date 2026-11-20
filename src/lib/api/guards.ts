import type {
  Admin,
  AdminAccount,
  AdminRef,
  AppConfig,
  AuditActor,
  AuditLog,
  AuditLogPage,
  Counts,
  Faq,
  Inquiry,
  InquiryPage,
  LoginResult,
  Maintenance,
  PlatformConfig,
  Stats,
  ActiveStats,
  CreatedAdmin,
  InquiryOwner,
  PushEvent,
  PushEventPage,
  PushStatus,
  UserDetail,
  UserPage,
  UserRow,
} from './types';

/** 서버 응답을 쓰기 전에 모양을 확인한다. 통과하지 못한 응답은 화면에 넘기지 않는다. */
export type Guard<T> = (v: unknown) => v is T;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isCount = (v: unknown): v is number => isInt(v) && v >= 0;
/** 키가 있어야 하고 값은 글자이거나 null */
const isStrOrNull = (o: Obj, key: string): boolean => key in o && (o[key] === null || isStr(o[key]));
/** v2 필드: 없어도 되고, 있으면 글자이거나 null */
const optStr = (o: Obj, key: string): boolean => !(key in o) || o[key] === null || isStr(o[key]);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const arrayOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard);

export const isAdmin: Guard<Admin> = (v): v is Admin =>
  isObj(v) && isStr(v.id) && isStr(v.loginId) && isStr(v.name) && (!('mustChangePassword' in v) || isBool(v.mustChangePassword));

export const isAdminAccount: Guard<AdminAccount> = (v): v is AdminAccount =>
  isAdmin(v) && isBool((v as unknown as Obj).active) && isStr((v as unknown as Obj).createdAt) && optStr(v as unknown as Obj, 'lastLoginAt');

export const isCreatedAdmin: Guard<CreatedAdmin> = (v): v is CreatedAdmin =>
  isObj(v) && isAdminAccount(v.admin) && isStr(v.temporaryPassword) && v.temporaryPassword !== '';

export const isTemporaryPassword = (v: unknown): v is { temporaryPassword: string } =>
  isObj(v) && isStr(v.temporaryPassword) && v.temporaryPassword !== '';

export const isLoginResult: Guard<LoginResult> = (v): v is LoginResult =>
  isObj(v) &&
  isStr(v.token) &&
  v.token !== '' &&
  isStr(v.expiresAt) &&
  !Number.isNaN(Date.parse(v.expiresAt)) &&
  isAdmin(v.admin);

const isAdminRef = (v: unknown): v is AdminRef => isObj(v) && isStr(v.id) && isStr(v.name);
const isAdminRefOrNull = (o: Obj, key: string): boolean => key in o && (o[key] === null || isAdminRef(o[key]));
const optAdminRef = (o: Obj, key: string): boolean => !(key in o) || o[key] === null || isAdminRef(o[key]);

const isInquiryOwner = (v: unknown): v is InquiryOwner =>
  isObj(v) && isStr(v.userId) && optStr(v, 'nickname') && optStr(v, 'provider') && optStr(v, 'platform') && optStr(v, 'appVersion') && optStr(v, 'joinedAt');

export const isInquiry: Guard<Inquiry> = (v): v is Inquiry =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.category) &&
  isStr(v.body) &&
  isStrOrNull(v, 'replyEmail') &&
  isStr(v.createdAt) &&
  isStr(v.status) &&
  isStrOrNull(v, 'memo') &&
  isAdminRefOrNull(v, 'handledBy') &&
  isStrOrNull(v, 'handledAt') &&
  isStr(v.ownerRef) &&
  optStr(v, 'answer') &&
  optStr(v, 'answeredAt') &&
  optAdminRef(v, 'answeredBy') &&
  optStr(v, 'answerDraft') &&
  (!('owner' in v) || v.owner === null || isInquiryOwner(v.owner));

export const isInquiryPage: Guard<InquiryPage> = (v): v is InquiryPage =>
  isObj(v) && arrayOf(isInquiry)(v.items) && isCount(v.page) && isCount(v.size) && isCount(v.total);

const isCounts = (v: unknown): v is Counts => isObj(v) && Object.values(v).every(isCount);
const hasTotal = (v: unknown): v is Obj => isObj(v) && isCount(v.total);

const countsOf = (v: unknown, keys: string[]): boolean => isObj(v) && keys.every((k) => isCount(v[k]));
const ratesOf = (v: unknown, keys: string[]): boolean => isObj(v) && keys.every((k) => isNum(v[k]));
/** v2 묶음: 없어도 되고, 있으면 모양이 맞아야 한다 */
const optGroup = (o: Obj, key: string, check: (v: unknown) => boolean): boolean => !(key in o) || check(o[key]);

export const isStats: Guard<Stats> = (v): v is Stats =>
  isObj(v) &&
  isStr(v.generatedAt) &&
  hasTotal(v.accounts) &&
  isCount(v.accounts.last7Days) &&
  isCount(v.accounts.last30Days) &&
  hasTotal(v.profiles) &&
  hasTotal(v.readings) &&
  hasTotal(v.reports) &&
  isCounts(v.reports.byStatus) &&
  hasTotal(v.inquiries) &&
  isCounts(v.inquiries.byStatus) &&
  // 1.0.0 에서 쓰지 않는 옛 묶음(궁합 · 방향성)은 없어도 된다
  optGroup(v, 'synastries', hasTotal) &&
  optGroup(v, 'synastryReports', (g) => hasTotal(g) && isCounts(g.byStatus)) &&
  optGroup(v, 'directions', (g) => hasTotal(g) && isCounts(g.byTopic)) &&
  optGroup(v, 'users', (g) => countsOf(g, ['total', 'joinedToday', 'joined7d'])) &&
  optGroup(v, 'nicknames', hasTotal) &&
  optGroup(v, 'detailReports', (g) => countsOf(g, ['me', 'timing', 'generating'])) &&
  // 셀 표가 아직 없는 칸은 null(서버 S⑪ — 오늘의 하늘은 S④, 푸시는 S⑩ 뒤에 채운다)
  optGroup(v, 'todaySky', (g) => g === null || countsOf(g, ['today', 'onDemand', 'prebuilt'])) &&
  optGroup(v, 'failuresToday', (g) => isObj(g) && (g.nickname === null || isCount(g.nickname)) && isCount(g.report)) &&
  optGroup(v, 'pushToday', (g) => g === null || countsOf(g, ['sent', 'failed'])) &&
  optGroup(v, 'inquiryQueue', (g) => isObj(g) && isCount(g.waiting) && isStrOrNull(g, 'oldestWaitingAt')) &&
  optGroup(v, 'consents', (g) => ratesOf(g, ['pushRate', 'marketingRate']) && isObj(g) && isCount(g.adReachable));

export const isActiveStats: Guard<ActiveStats> = (v): v is ActiveStats =>
  isObj(v) &&
  isStr(v.range) &&
  Array.isArray(v.points) &&
  v.points.every((p) => isObj(p) && isStr(p.label) && isCount(p.value)) &&
  isCount(v.total) &&
  isNum(v.average) &&
  isCount(v.previousTotal);

export const isFaq: Guard<Faq> = (v): v is Faq =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.question) &&
  isStr(v.answer) &&
  isInt(v.sortOrder) &&
  isBool(v.published) &&
  isStr(v.updatedAt) &&
  isAdminRefOrNull(v, 'updatedBy');

const isAuditActor = (v: unknown): v is AuditActor => isObj(v) && isStr(v.ref) && isStr(v.label);

export const isAuditLog: Guard<AuditLog> = (v): v is AuditLog =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.occurredAt) &&
  isStr(v.actorType) &&
  'actor' in v &&
  (v.actor === null || isAuditActor(v.actor)) &&
  isStr(v.action) &&
  isStrOrNull(v, 'targetType') &&
  isStrOrNull(v, 'targetId') &&
  isStr(v.outcome) &&
  'detail' in v &&
  (v.detail === null || isObj(v.detail));

export const isAuditLogPage: Guard<AuditLogPage> = (v): v is AuditLogPage =>
  isObj(v) && arrayOf(isAuditLog)(v.items) && isCount(v.page) && isCount(v.size) && isCount(v.total);

export const isPlatformConfig: Guard<PlatformConfig> = (v): v is PlatformConfig =>
  isObj(v) &&
  optStr(v, 'latestVersion') &&
  isStrOrNull(v, 'minVersion') &&
  isStrOrNull(v, 'storeUrl') &&
  isStrOrNull(v, 'message') &&
  isBool(v.blockNow) &&
  isStr(v.updatedAt) &&
  isAdminRefOrNull(v, 'updatedBy');

export const isMaintenance: Guard<Maintenance> = (v): v is Maintenance =>
  isObj(v) &&
  isBool(v.active) &&
  isStrOrNull(v, 'message') &&
  isStr(v.updatedAt) &&
  isAdminRefOrNull(v, 'updatedBy') &&
  optStr(v, 'startedAt') &&
  optAdminRef(v, 'startedBy');

export const isAppConfig: Guard<AppConfig> = (v): v is AppConfig =>
  isObj(v) && isPlatformConfig(v.ios) && isPlatformConfig(v.android) && isMaintenance(v.maintenance);

/* ── 사용자(결정 043 의 1 · 044) ── */
const isUserRowFields = (v: Obj): boolean =>
  isStr(v.id) &&
  isStrOrNull(v, 'nickname') &&
  'profileNo' in v &&
  (v.profileNo === null || isInt(v.profileNo)) &&
  isStrOrNull(v, 'emailMasked') &&
  isStr(v.provider) &&
  isStr(v.joinedAt) &&
  isStrOrNull(v, 'lastSeenAt') &&
  isObj(v.reports) &&
  isStr(v.reports.me) &&
  isStr(v.reports.timing) &&
  isStr(v.status);

export const isUserRow: Guard<UserRow> = (v): v is UserRow => isObj(v) && isUserRowFields(v);

export const isUserPage: Guard<UserPage> = (v): v is UserPage =>
  isObj(v) && arrayOf(isUserRow)(v.items) && isCount(v.page) && isCount(v.size) && isCount(v.total);

const listOf = (v: unknown, item: (x: Obj) => boolean): boolean => Array.isArray(v) && v.every((x) => isObj(x) && item(x));

export const isUserDetail: Guard<UserDetail> = (v): v is UserDetail =>
  isObj(v) &&
  isUserRowFields(v) &&
  isObj(v.consents) &&
  isStrOrNull(v.consents, 'termsVersion') &&
  isStrOrNull(v.consents, 'privacyVersion') &&
  isStrOrNull(v.consents, 'pushAt') &&
  isStrOrNull(v.consents, 'marketingAt') &&
  // 오늘의 하늘 · 기기는 서버 푸시 묶음(결정 042)이 더한다 — 없거나 null 이어도 된다.
  (v.todaySky === undefined || v.todaySky === null || (isObj(v.todaySky) && isBool(v.todaySky.on) && isStrOrNull(v.todaySky, 'time'))) &&
  isObj(v.birth) &&
  isBool(v.birth.registered) &&
  isBool(v.birth.hasTime) &&
  isBool(v.birth.hasPlace) &&
  listOf(v.generations, (g) => isStr(g.kind) && isStr(g.status) && isStrOrNull(g, 'at')) &&
  (v.devices === undefined || v.devices === null || listOf(v.devices, (d) => isStr(d.platform) && isStrOrNull(d, 'appVersion') && isStrOrNull(d, 'lastSeenAt'))) &&
  listOf(v.inquiries, (i) => isStr(i.id) && isStr(i.category) && isStr(i.status) && isStr(i.createdAt) && optStr(i, 'excerpt')) &&
  listOf(v.recent, (r) => isStr(r.at) && isStr(r.action) && optStr(r, 'detail')) &&
  'suspension' in v &&
  (v.suspension === null || (isObj(v.suspension) && isStr(v.suspension.at) && 'by' in v.suspension && (v.suspension.by === null || isAdminRef(v.suspension.by)) && isStr(v.suspension.reason)));

/* ── 푸시 발송(결정 043 의 6) ── */
export const isAudience = (v: unknown): v is { count: number } => isObj(v) && isCount(v.count);

export const isSentPush = (v: unknown): v is { id: string; recipients: number } => isObj(v) && isStr(v.id) && isCount(v.recipients);

const isPushEvent: Guard<PushEvent> = (v): v is PushEvent =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.sentAt) &&
  isStr(v.title) &&
  isCount(v.recipients) &&
  (v.succeeded === null || isCount(v.succeeded)) &&
  (v.failed === null || isCount(v.failed)) &&
  isStrOrNull(v, 'sentBy');

export const isPushEventPage: Guard<PushEventPage> = (v): v is PushEventPage =>
  isObj(v) && arrayOf(isPushEvent)(v.items) && isCount(v.page) && isCount(v.size) && isCount(v.total);

export const isPushStatus: Guard<PushStatus> = (v): v is PushStatus =>
  isObj(v) &&
  isBool(v.canSend) &&
  isStrOrNull(v, 'reason') &&
  isStrOrNull(v, 'sentTodayAt') &&
  isStrOrNull(v, 'sentTodayBy') &&
  isStrOrNull(v, 'nextAvailableAt');
