import { describe, expect, it, vi } from 'vitest';
import { adminAccount, admin, appConfig, auditLog, faq, inquiry, loginResult, maintenance, platformConfig, stats } from '../../test/fixtures';
import { mockFetch } from '../../test/mockFetch';
import { createAdminApi } from './admin';
import { createClient } from './client';

const api = () =>
  createAdminApi(createClient({ baseUrl: 'http://api.test', getToken: () => 'tok-test', onUnauthorized: vi.fn() }));

describe('createAdminApi — 계약의 경로·메서드·본문', () => {
  it('로그인은 토큰 없이 부른다', async () => {
    const { calls } = mockFetch({ 'POST /admin/auth/login': { status: 200, body: loginResult() } });
    await expect(api().login('owner', 'pw-1234567890')).resolves.toEqual(loginResult());
    expect(calls[0]?.body).toEqual({ loginId: 'owner', password: 'pw-1234567890' });
    expect(calls[0]?.headers.get('Authorization')).toBeNull();
  });

  it('로그아웃 · 내 정보 · 비밀번호 변경', async () => {
    const { calls } = mockFetch({
      'POST /admin/auth/logout': { status: 204 },
      'GET /admin/me': { status: 200, body: admin },
      'PUT /admin/me/password': { status: 204 },
    });
    await api().logout();
    await expect(api().me()).resolves.toEqual(admin);
    await api().changePassword('old-password', 'new-password');
    expect(calls[2]?.body).toEqual({ currentPassword: 'old-password', newPassword: 'new-password' });
  });

  it('관리자 목록 · 만들기 · 끄고 켜기', async () => {
    const { calls } = mockFetch({
      'GET /admin/admins': { status: 200, body: [adminAccount()] },
      'POST /admin/admins': { status: 201, body: { admin: adminAccount(), temporaryPassword: 'Kx7m-Q2pa-9Lrt' } },
      [`PATCH /admin/admins/${admin.id}`]: { status: 200, body: adminAccount({ active: false }) },
    });
    await expect(api().listAdmins()).resolves.toHaveLength(1);
    await expect(api().createAdmin('lee2')).resolves.toMatchObject({ temporaryPassword: 'Kx7m-Q2pa-9Lrt' });
    expect(calls[1]?.body).toEqual({ loginId: 'lee2' });
    await expect(api().setAdminActive(admin.id, false)).resolves.toMatchObject({ active: false });
    expect(calls[2]?.body).toEqual({ active: false });
  });

  it('문의 목록: 빈 조건은 쿼리에 넣지 않는다', async () => {
    const page = { items: [inquiry()], page: 2, size: 20, total: 41 };
    const { calls } = mockFetch({ 'GET /admin/inquiries': { status: 200, body: page } });
    await expect(api().listInquiries({ status: 'NEW', category: '', page: 2, size: 20 })).resolves.toEqual(page);
    expect(calls[0]?.query.toString()).toBe('status=NEW&page=2&size=20');
    await api().listInquiries({});
    expect(calls[1]?.query.toString()).toBe('');
  });

  it('문의 한 건 · 고치기(보낸 키만)', async () => {
    const one = inquiry();
    const { calls } = mockFetch({
      [`GET /admin/inquiries/${one.id}`]: { status: 200, body: one },
      [`PATCH /admin/inquiries/${one.id}`]: { status: 200, body: one },
    });
    await expect(api().getInquiry(one.id)).resolves.toEqual(one);
    await api().patchInquiry(one.id, { status: 'DONE' });
    await api().patchInquiry(one.id, { memo: null });
    expect(calls[1]?.body).toEqual({ status: 'DONE' });
    expect(calls[2]?.body).toEqual({ memo: null });
  });

  it('현황', async () => {
    mockFetch({ 'GET /admin/stats': { status: 200, body: stats() } });
    await expect(api().getStats()).resolves.toEqual(stats());
  });

  it('FAQ 목록 · 만들기 · 고치기 · 지우기 · 순서', async () => {
    const one = faq();
    const { calls } = mockFetch({
      'GET /admin/faqs': { status: 200, body: [one] },
      'POST /admin/faqs': { status: 201, body: one },
      [`PATCH /admin/faqs/${one.id}`]: { status: 200, body: one },
      [`DELETE /admin/faqs/${one.id}`]: { status: 204 },
      'PUT /admin/faqs/order': { status: 200, body: [one] },
    });
    await expect(api().listFaqs()).resolves.toEqual([one]);
    await api().createFaq({ question: 'q', answer: 'a', published: false });
    expect(calls[1]?.body).toEqual({ question: 'q', answer: 'a', published: false });
    await api().patchFaq(one.id, { published: true });
    expect(calls[2]?.body).toEqual({ published: true });
    await expect(api().deleteFaq(one.id)).resolves.toBeUndefined();
    await expect(api().orderFaqs([one.id])).resolves.toEqual([one]);
    expect(calls[4]?.body).toEqual({ ids: [one.id] });
  });

  it('다른 관리자의 비밀번호 다시 정하기: password 만 보낸다', async () => {
    const { calls } = mockFetch({ [`PUT /admin/admins/${admin.id}/password`]: { status: 204 } });
    await expect(api().resetAdminPassword(admin.id, 'pw-1234567890')).resolves.toBeUndefined();
    expect(calls[0]?.body).toEqual({ password: 'pw-1234567890' });
  });

  it('감사 기록: 빈 조건은 쿼리에 넣지 않는다', async () => {
    const page = { items: [auditLog()], page: 1, size: 20, total: 21 };
    const { calls } = mockFetch({ 'GET /admin/audit-logs': { status: 200, body: page } });
    await expect(
      api().listAuditLogs({ actorType: 'ADMIN', action: '', from: '2026-11-10', to: '2026-11-12', actorRef: 'root-admin', page: 1, size: 20 }),
    ).resolves.toEqual(page);
    expect(calls[0]?.query.toString()).toBe('actorType=ADMIN&from=2026-11-10&to=2026-11-12&actorRef=root-admin&page=1&size=20');
    await api().listAuditLogs({});
    expect(calls[1]?.query.toString()).toBe('');
  });

  it('앱 설정: 받기 · 플랫폼 고치기(네 키 모두) · 점검 고치기(두 키 모두)', async () => {
    const saved = platformConfig({ minVersion: '1.2.0', blockNow: true });
    const { calls } = mockFetch({
      'GET /admin/app-config': { status: 200, body: appConfig() },
      'PUT /admin/app-config/ios': { status: 200, body: saved },
      'PUT /admin/app-config/maintenance': { status: 200, body: maintenance({ active: true }) },
    });
    await expect(api().getAppConfig()).resolves.toEqual(appConfig());
    await expect(api().putPlatformConfig('ios', { latestVersion: '1.3.0', minVersion: '1.2.0', storeUrl: null, message: null, blockNow: true })).resolves.toEqual(saved);
    expect(calls[1]?.body).toEqual({ latestVersion: '1.3.0', minVersion: '1.2.0', storeUrl: null, message: null, blockNow: true });
    await expect(api().putMaintenance({ active: true, message: null })).resolves.toMatchObject({ active: true });
    expect(calls[2]?.body).toEqual({ active: true, message: null });
  });

  it('v2 — 비밀번호 재발급 · 접속 차트 · 문의 찾기 · 감사 로그 찾기(결정 043)', async () => {
    const { calls } = mockFetch({
      [`POST /admin/admins/${admin.id}/password-reset`]: { status: 200, body: { temporaryPassword: 'Ab12-Cd34-Ef56' } },
      'GET /admin/stats/active': { status: 200, body: { range: 'week', points: [{ label: '월', value: 3 }], total: 3, average: 3, previousTotal: 2 } },
      'GET /admin/inquiries': { status: 200, body: { items: [], page: 0, size: 20, total: 0 } },
      'GET /admin/audit-logs': { status: 200, body: { items: [], page: 0, size: 20, total: 0 } },
    });
    await expect(api().reissuePassword(admin.id)).resolves.toBe('Ab12-Cd34-Ef56');
    await expect(api().getActiveStats('week')).resolves.toMatchObject({ total: 3 });
    expect(calls[1]?.query.get('range')).toBe('week');
    await api().listInquiries({ q: '알림', page: 0, size: 20 });
    expect(calls[2]?.query.toString()).toBe('q=%EC%95%8C%EB%A6%BC&page=0&size=20');
    await api().listAuditLogs({ q: '새벽별' });
    expect(calls[3]?.query.get('q')).toBe('새벽별');
  });

  it('v2 — 사용자 목록 · 상세 · 정지 · 해제 · 삭제 · 재생성(결정 043 · 044)', async () => {
    const user = { id: 'u1', nickname: '새벽별', profileNo: 1, emailMasked: 'dawn****@kakao.com', provider: 'KAKAO', joinedAt: '2026-11-08T05:20:05Z', lastSeenAt: null, reports: { me: 'DONE', timing: 'FAILED' }, status: 'ACTIVE' };
    const { calls } = mockFetch({
      'GET /admin/users': { status: 200, body: { items: [user], page: 0, size: 20, total: 1 } },
      'POST /admin/users/u1/suspend': { status: 204 },
      'POST /admin/users/u1/unsuspend': { status: 204 },
      'DELETE /admin/users/u1': { status: 204 },
      'POST /admin/users/u1/regenerate': { status: 204 },
    });
    await expect(api().listUsers({ q: '새벽', status: '', provider: 'KAKAO', page: 0, size: 20 })).resolves.toMatchObject({ total: 1 });
    expect(calls[0]?.query.toString()).toBe('q=%EC%83%88%EB%B2%BD&provider=KAKAO&page=0&size=20');
    await api().suspendUser('u1', '문의 도배');
    expect(calls[1]?.body).toEqual({ reason: '문의 도배' });
    await api().unsuspendUser('u1', '소명 확인');
    await api().deleteUser('u1', '문의 #131 로 탈퇴 요청', '새벽별');
    expect(calls[3]?.body).toEqual({ reason: '문의 #131 로 탈퇴 요청', confirmNickname: '새벽별' });
    await api().regenerate('u1', 'REPORT_TIMING');
    expect(calls[4]?.body).toEqual({ kind: 'REPORT_TIMING' });
  });

  it('v2 — 푸시: 대상 수 · 상태 · 내역 · 발송(결정 043 의 6)', async () => {
    const { calls } = mockFetch({
      'GET /admin/push/audience': { status: 200, body: { count: 211 } },
      'GET /admin/push/status': { status: 200, body: { canSend: true, reason: null, sentTodayAt: null, sentTodayBy: null, nextAvailableAt: null } },
      'GET /admin/push/events': { status: 200, body: { items: [], page: 0, size: 10, total: 0 } },
      'POST /admin/push/events': { status: 202, body: { id: 'p1', recipients: 211 } },
    });
    await expect(api().getPushAudience()).resolves.toBe(211);
    await expect(api().getPushStatus()).resolves.toMatchObject({ canSend: true });
    await api().listPushEvents(0, 10);
    expect(calls[2]?.query.toString()).toBe('page=0&size=10');
    await expect(api().sendPush({ title: '새 기능', body: '본문', target: 'TIMING_MONTH' })).resolves.toEqual({ id: 'p1', recipients: 211 });
    expect(calls[3]?.body).toEqual({ title: '새 기능', body: '본문', target: 'TIMING_MONTH' });
  });

  it('경로의 id 는 인코딩한다', async () => {
    const { calls } = mockFetch({ 'GET /admin/inquiries/a%2Fb': { status: 404, body: { error: 'NOT_FOUND' } } });
    await expect(api().getInquiry('a/b')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls[0]?.path).toBe('/admin/inquiries/a%2Fb');
  });
});
