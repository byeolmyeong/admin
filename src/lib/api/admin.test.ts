import { describe, expect, it, vi } from 'vitest';
import { adminAccount, admin, faq, inquiry, loginResult, stats } from '../../test/fixtures';
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
      'POST /admin/admins': { status: 201, body: adminAccount() },
      [`PATCH /admin/admins/${admin.id}`]: { status: 200, body: adminAccount({ active: false }) },
    });
    await expect(api().listAdmins()).resolves.toHaveLength(1);
    await api().createAdmin({ loginId: 'kim', name: '김', password: 'pw-1234567890' });
    expect(calls[1]?.body).toEqual({ loginId: 'kim', name: '김', password: 'pw-1234567890' });
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

  it('경로의 id 는 인코딩한다', async () => {
    const { calls } = mockFetch({ 'GET /admin/inquiries/a%2Fb': { status: 404, body: { error: 'NOT_FOUND' } } });
    await expect(api().getInquiry('a/b')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls[0]?.path).toBe('/admin/inquiries/a%2Fb');
  });
});
