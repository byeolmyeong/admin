import { describe, expect, it } from 'vitest';
import { adminAccount, admin, faq, inquiry, loginResult, stats } from '../../test/fixtures';
import {
  arrayOf,
  isAdmin,
  isAdminAccount,
  isFaq,
  isInquiry,
  isInquiryPage,
  isLoginResult,
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
});
