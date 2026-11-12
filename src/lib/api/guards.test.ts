import { describe, expect, it } from 'vitest';
import { adminAccount, admin, appConfig, auditLog, faq, inquiry, loginResult, maintenance, platformConfig, stats } from '../../test/fixtures';
import {
  arrayOf,
  isAdmin,
  isAdminAccount,
  isAppConfig,
  isAuditLog,
  isAuditLogPage,
  isFaq,
  isInquiry,
  isInquiryPage,
  isLoginResult,
  isMaintenance,
  isPlatformConfig,
  isStats,
} from './guards';

describe('guards', () => {
  it('Admin · AdminAccount · LoginResult', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin({ ...admin, name: 1 })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdminAccount(adminAccount())).toBe(true);
    expect(isAdminAccount({ ...adminAccount(), active: 'true' })).toBe(false);
    expect(isAdminAccount(admin)).toBe(false);
    expect(isLoginResult(loginResult())).toBe(true);
    expect(isLoginResult({ ...loginResult(), token: '' })).toBe(false);
    expect(isLoginResult({ ...loginResult(), expiresAt: '내일' })).toBe(false);
    expect(isLoginResult({ ...loginResult(), admin: {} })).toBe(false);
  });

  it('Inquiry: 값이 없는 필드는 null 이어야 하고 키가 빠지면 틀리다', () => {
    expect(isInquiry(inquiry())).toBe(true);
    expect(
      isInquiry(inquiry({ memo: '메모', handledBy: { id: admin.id, name: '김관리' }, handledAt: '2026-11-12T05:00:00Z', replyEmail: null })),
    ).toBe(true);
    const { memo: _memo, ...withoutMemo } = inquiry();
    void _memo;
    expect(isInquiry(withoutMemo)).toBe(false);
    expect(isInquiry({ ...inquiry(), replyEmail: 3 })).toBe(false);
    expect(isInquiry({ ...inquiry(), handledBy: { id: admin.id } })).toBe(false);
    expect(isInquiry({ ...inquiry(), body: null })).toBe(false);
  });

  it('InquiryPage', () => {
    expect(isInquiryPage({ items: [inquiry()], page: 0, size: 20, total: 1 })).toBe(true);
    expect(isInquiryPage({ items: [], page: 0, size: 20, total: 0 })).toBe(true);
    expect(isInquiryPage({ items: [{}], page: 0, size: 20, total: 1 })).toBe(false);
    expect(isInquiryPage({ items: [], page: '0', size: 20, total: 0 })).toBe(false);
    expect(isInquiryPage([inquiry()])).toBe(false);
  });

  it('Stats: 모든 묶음과 0 이상의 정수', () => {
    expect(isStats(stats())).toBe(true);
    expect(isStats({ ...stats(), directions: { total: 0, byTopic: {} } })).toBe(true);
    expect(isStats({ ...stats(), directions: { total: 2, byTopic: { LOVE: 1, WORK: 1 } } })).toBe(true);
    expect(isStats({ ...stats(), profiles: undefined })).toBe(false);
    expect(isStats({ ...stats(), readings: { total: -1 } })).toBe(false);
    expect(isStats({ ...stats(), readings: { total: 1.5 } })).toBe(false);
    expect(isStats({ ...stats(), reports: { total: 1 } })).toBe(false);
    expect(isStats({ ...stats(), inquiries: { total: 1, byStatus: { NEW: '1' } } })).toBe(false);
    expect(isStats({ ...stats(), generatedAt: 0 })).toBe(false);
  });

  it('Faq 와 배열', () => {
    expect(isFaq(faq())).toBe(true);
    expect(isFaq({ ...faq(), published: 1 })).toBe(false);
    expect(isFaq({ ...faq(), sortOrder: '1' })).toBe(false);
    expect(arrayOf(isFaq)([faq(), faq()])).toBe(true);
    expect(arrayOf(isFaq)([])).toBe(true);
    expect(arrayOf(isFaq)([faq(), {}])).toBe(false);
    expect(arrayOf(isFaq)({})).toBe(false);
  });

  it('AuditLog: actor · 대상 · detail 은 값이 없으면 null 이고 키가 빠지면 틀리다', () => {
    expect(isAuditLog(auditLog())).toBe(true);
    expect(isAuditLog(auditLog({ actorType: 'SYSTEM', actor: null, outcome: 'FAILURE' }))).toBe(true);
    expect(isAuditLog(auditLog({ action: 'NEW_CODE', targetType: 'INQUIRY', targetId: 'x', detail: { status: 'DONE', memoChanged: true } }))).toBe(true);
    const { detail: _detail, ...withoutDetail } = auditLog();
    void _detail;
    expect(isAuditLog(withoutDetail)).toBe(false);
    const { actor: _actor, ...withoutActor } = auditLog();
    void _actor;
    expect(isAuditLog(withoutActor)).toBe(false);
    expect(isAuditLog({ ...auditLog(), actor: { ref: 'a' } })).toBe(false);
    expect(isAuditLog({ ...auditLog(), targetId: 3 })).toBe(false);
    expect(isAuditLog({ ...auditLog(), detail: [] })).toBe(false);
    expect(isAuditLog({ ...auditLog(), detail: 'x' })).toBe(false);
    expect(isAuditLog({ ...auditLog(), outcome: null })).toBe(false);
  });

  it('AuditLogPage', () => {
    expect(isAuditLogPage({ items: [auditLog()], page: 0, size: 20, total: 1 })).toBe(true);
    expect(isAuditLogPage({ items: [], page: 3, size: 20, total: 7 })).toBe(true);
    expect(isAuditLogPage({ items: [{}], page: 0, size: 20, total: 1 })).toBe(false);
    expect(isAuditLogPage({ items: [], page: 0, size: 20 })).toBe(false);
  });

  it('PlatformConfig · Maintenance · AppConfig', () => {
    expect(isPlatformConfig(platformConfig())).toBe(true);
    expect(
      isPlatformConfig(platformConfig({ minVersion: '1.2', storeUrl: 'https://a.example', message: '글', blockNow: true, updatedBy: { id: admin.id, name: '김관리' } })),
    ).toBe(true);
    expect(isPlatformConfig({ ...platformConfig(), blockNow: null })).toBe(false);
    expect(isPlatformConfig({ ...platformConfig(), minVersion: 1.2 })).toBe(false);
    const { storeUrl: _storeUrl, ...withoutUrl } = platformConfig();
    void _storeUrl;
    expect(isPlatformConfig(withoutUrl)).toBe(false);
    expect(isPlatformConfig({ ...platformConfig(), updatedBy: { id: admin.id } })).toBe(false);

    expect(isMaintenance(maintenance())).toBe(true);
    expect(isMaintenance(maintenance({ active: true, message: '점검해요' }))).toBe(true);
    expect(isMaintenance({ ...maintenance(), active: 'true' })).toBe(false);
    expect(isMaintenance({ ...maintenance(), message: undefined })).toBe(false);

    expect(isAppConfig(appConfig())).toBe(true);
    expect(isAppConfig({ ios: platformConfig(), android: platformConfig() })).toBe(false);
    expect(isAppConfig({ ...appConfig(), android: {} })).toBe(false);
  });
});
