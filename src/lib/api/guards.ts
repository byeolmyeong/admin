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

export const arrayOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard);

export const isAdmin: Guard<Admin> = (v): v is Admin => isObj(v) && isStr(v.id) && isStr(v.loginId) && isStr(v.name);

export const isAdminAccount: Guard<AdminAccount> = (v): v is AdminAccount =>
  isAdmin(v) && isBool((v as unknown as Obj).active) && isStr((v as unknown as Obj).createdAt);

export const isLoginResult: Guard<LoginResult> = (v): v is LoginResult =>
  isObj(v) &&
  isStr(v.token) &&
  v.token !== '' &&
  isStr(v.expiresAt) &&
  !Number.isNaN(Date.parse(v.expiresAt)) &&
  isAdmin(v.admin);

const isAdminRef = (v: unknown): v is AdminRef => isObj(v) && isStr(v.id) && isStr(v.name);
const isAdminRefOrNull = (o: Obj, key: string): boolean => key in o && (o[key] === null || isAdminRef(o[key]));

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
  isStr(v.ownerRef);

export const isInquiryPage: Guard<InquiryPage> = (v): v is InquiryPage =>
  isObj(v) && arrayOf(isInquiry)(v.items) && isCount(v.page) && isCount(v.size) && isCount(v.total);

const isCounts = (v: unknown): v is Counts => isObj(v) && Object.values(v).every(isCount);
const hasTotal = (v: unknown): v is Obj => isObj(v) && isCount(v.total);

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
  hasTotal(v.synastries) &&
  hasTotal(v.synastryReports) &&
  isCounts(v.synastryReports.byStatus) &&
  hasTotal(v.directions) &&
  isCounts(v.directions.byTopic) &&
  hasTotal(v.inquiries) &&
  isCounts(v.inquiries.byStatus);

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
  isStrOrNull(v, 'minVersion') &&
  isStrOrNull(v, 'storeUrl') &&
  isStrOrNull(v, 'message') &&
  isBool(v.blockNow) &&
  isStr(v.updatedAt) &&
  isAdminRefOrNull(v, 'updatedBy');

export const isMaintenance: Guard<Maintenance> = (v): v is Maintenance =>
  isObj(v) && isBool(v.active) && isStrOrNull(v, 'message') && isStr(v.updatedAt) && isAdminRefOrNull(v, 'updatedBy');

export const isAppConfig: Guard<AppConfig> = (v): v is AppConfig =>
  isObj(v) && isPlatformConfig(v.ios) && isPlatformConfig(v.android) && isMaintenance(v.maintenance);
