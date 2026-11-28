import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import { activeStats, admin, statsV2, userDetail, userRow } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { Route as MockRoute } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { UserDetailPage } from './UserDetailPage';
import { UserListPage } from './UserListPage';

const t = strings.users;
const d = t.detail;
const me = { status: 200, body: admin };
const USER = userRow();
const page = (items = [USER, userRow({ id: 'u2', nickname: '노을빛', provider: 'APPLE', status: 'SUSPENDED', reports: { me: 'NONE', timing: 'NONE' }, lastSeenAt: null })], total = items.length) => ({
  status: 200,
  body: { items, page: 0, size: 20, total },
});
const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};
const tree = (
  <>
    <Routes>
      <Route path="/users" element={<UserListPage />} />
      <Route path="/users/:id" element={<UserDetailPage />} />
    </Routes>
    <Where />
  </>
);
const server = (over: Record<string, MockRoute> = {}) =>
  mockFetch({
    'GET /admin/me': me,
    'GET /admin/users': page(),
    [`GET /admin/users/${USER.id}`]: { status: 200, body: userDetail() },
    'GET /admin/stats': { status: 200, body: statsV2() },
    'GET /admin/stats/active': (req) => ({ status: 200, body: { ...activeStats(req.query.get('range') ?? 'week'), previousTotal: req.query.get('range') === 'today' ? 171 : 911 } }),
    ...over,
  });

describe('사용자 목록(D4)', () => {
  it('접속 숫자 넷과 표(닉네임 · 이메일 · 로그인 · 가입일 · 마지막 접속 · 자세한 풀이 · 상태)', async () => {
    server();
    renderApp(tree, { route: '/users' });
    const table = await screen.findByRole('table', { name: t.listLabel });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(Object.values(t.columns));
    const [, first, second] = within(table).getAllByRole('row').map((r) => within(r));
    expect(first?.getByRole('link', { name: '새벽별' })).toHaveAttribute('href', `/users/${USER.id}`);
    expect(first?.getByText('dawn****@kakao.com')).toBeInTheDocument();
    expect(first?.getByText('카카오')).toBeInTheDocument();
    expect(first?.getByText('2026.11.08 14:20:05')).toBeInTheDocument();
    expect(first?.getByText(t.reports.both)).toBeInTheDocument();
    expect(second?.getByText(t.statuses.SUSPENDED)).toBeInTheDocument();
    expect(await screen.findByText(t.yesterday('171'))).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: t.strip.joined })).getByText(t.people('214'))).toBeInTheDocument();
    expect(screen.getByText(t.range(2, 1, 2))).toBeInTheDocument();
  });

  it('찾기 · 상태 · 로그인 수단으로 거르면 1쪽부터 그 조건으로 받는다', async () => {
    const { calls } = server();
    const user = userEvent.setup();
    renderApp(tree, { route: '/users?page=1' });
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', { name: t.searchLabel }), '새벽');
    await vi.waitFor(() => expect(callsTo(calls, 'GET /admin/users').at(-1)?.query.get('q')).toBe('새벽'));
    await user.click(within(screen.getByRole('group', { name: t.statusLabel })).getByRole('button', { name: t.statuses.SUSPENDED }));
    await user.click(screen.getByRole('button', { name: t.provider }));
    await user.click(screen.getByRole('option', { name: 'Apple' }));
    await vi.waitFor(() => expect(callsTo(calls, 'GET /admin/users').at(-1)?.query.toString()).toBe('q=%EC%83%88%EB%B2%BD&status=SUSPENDED&provider=APPLE&page=0&size=20'));
  });

  it('찾기 결과가 비면 "검색 · 필터 초기화"(D25-1)', async () => {
    const { calls } = server({ 'GET /admin/users': page([], 0) });
    renderApp(tree, { route: '/users?q=없음' });
    expect(await screen.findByText(t.emptyFiltered.title)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: strings.empty.reset }));
    await vi.waitFor(() => expect(callsTo(calls, 'GET /admin/users').at(-1)?.query.toString()).toBe('page=0&size=20'));
  });

  it('서버에 사용자 경로가 아직 없으면 알리고 다시 시도할 수 있다', async () => {
    server({ 'GET /admin/users': { status: 404, body: { error: 'NOT_FOUND' } } });
    renderApp(tree, { route: '/users' });
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.NOT_FOUND);
    expect(screen.getByRole('button', { name: strings.common.retry })).toBeInTheDocument();
  });
});

describe('사용자 상세(D5 · D12 · D13 · D26)', () => {
  const open = () => renderApp(tree, { route: `/users/${USER.id}` });

  it('프로필 · 계정 · 동의(출생 정보 값은 비공개) · 생성 내역 · 기기 · 문의 · 최근 활동', async () => {
    server();
    open();
    expect(await screen.findByText('새벽별')).toBeInTheDocument();
    expect(screen.getByText('카카오 · dawn****@kakao.com · 가입 2026.11.08 14:20:05 · 마지막 접속 2026.11.20 08:12:44')).toBeInTheDocument();
    const account = within(screen.getByRole('region', { name: d.account }));
    expect(account.getByText(d.agreed('2026.11.08 14:20:05'))).toBeInTheDocument();
    expect(account.getByText(d.notAgreed)).toBeInTheDocument();
    expect(account.getByText(d.on('오전 8:00'))).toBeInTheDocument();
    expect(account.getByText(d.hidden)).toBeInTheDocument();
    const gens = within(screen.getByRole('region', { name: d.generations }));
    expect(gens.getByText(d.genLine('실패', '2026.11.20 14:02:07'))).toBeInTheDocument();
    expect(gens.getAllByRole('button', { name: d.regenerate })).toHaveLength(1);
    expect(screen.getByRole('link', { name: '아침에 오늘의 하늘 알림이 오지 않아요.' })).toHaveAttribute('href', '/inquiries/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(screen.getByText(`${strings.audit.actions.INQUIRY_SUBMITTED} · 오류`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: strings.users.title })).toHaveAttribute('href', '/users');
  });

  it('문의 "전체" · "감사 로그" 링크는 그 사람의 닉네임으로 찾고, 감사 로그는 사용자 행만(관리자 아이디가 섞이지 않게)', async () => {
    server();
    open();
    const inquiries = within(await screen.findByRole('region', { name: new RegExp(`^${d.inquiries}`) }));
    expect(inquiries.getByRole('link', { name: d.all })).toHaveAttribute('href', `/inquiries?q=${encodeURIComponent('새벽별')}`);
    const recent = within(screen.getByRole('region', { name: new RegExp(`^${d.recent}`) }));
    expect(recent.getByRole('link', { name: d.auditLink })).toHaveAttribute('href', `/audit-logs?actorType=USER&q=${encodeURIComponent('새벽별')}`);
  });

  it('닉네임이 없는 사용자는 그 사람으로 거를 수 없어 링크를 두지 않는다(빈 찾기 = 전체 목록이 열리던 것)', async () => {
    server({ [`GET /admin/users/${USER.id}`]: { status: 200, body: userDetail({ nickname: null }) } });
    open();
    const inquiries = within(await screen.findByRole('region', { name: new RegExp(`^${d.inquiries}`) }));
    expect(inquiries.queryByRole('link', { name: d.all })).not.toBeInTheDocument();
    // 이 카드의 문의 줄은 그대로 보인다
    expect(inquiries.getByRole('link', { name: '아침에 오늘의 하늘 알림이 오지 않아요.' })).toBeInTheDocument();
    const recent = within(screen.getByRole('region', { name: new RegExp(`^${d.recent}`) }));
    expect(recent.queryByRole('link', { name: d.auditLink })).not.toBeInTheDocument();
  });

  it('서버 푸시 묶음 전(S⑪ 계약): 오늘의 하늘 · 기기 칸이 없어도 그리고 "—"', async () => {
    const withoutPush: Record<string, unknown> = { ...userDetail() };
    delete withoutPush.todaySky;
    delete withoutPush.devices;
    server({ [`GET /admin/users/${USER.id}`]: { status: 200, body: withoutPush } });
    open();
    const account = within(await screen.findByRole('region', { name: d.account }));
    expect(account.getByText(d.todaySky).nextElementSibling).toHaveTextContent(strings.users.none);
    expect(within(screen.getByRole('region', { name: d.devices })).getByText(strings.users.none)).toBeInTheDocument();
  });

  it('실패한 생성은 재생성을 보낸다', async () => {
    const { calls } = server({ [`POST /admin/users/${USER.id}/regenerate`]: { status: 204 } });
    open();
    await userEvent.click(await screen.findByRole('button', { name: d.regenerate }));
    expect(await screen.findByRole('status')).toHaveTextContent(d.regenerated);
    expect(callsTo(calls, `POST /admin/users/${USER.id}/regenerate`)[0]?.body).toEqual({ kind: 'REPORT_TIMING' });
  });

  it('이용 정지(D12): 사유를 적기 전엔 정지 버튼이 흐리고, 적으면 reason 을 보낸다', async () => {
    const { calls } = server({ [`POST /admin/users/${USER.id}/suspend`]: { status: 204 } });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('button', { name: d.suspend }));
    const dialog = within(screen.getByRole('alertdialog', { name: d.suspendDialog.title('새벽별') }));
    expect(dialog.getByRole('button', { name: d.suspendDialog.confirm })).toBeDisabled();
    await user.type(dialog.getByLabelText(d.suspendDialog.reason), ' 문의 도배 ');
    await user.click(dialog.getByRole('button', { name: d.suspendDialog.confirm }));
    expect(await screen.findByRole('status')).toHaveTextContent(d.suspendDialog.done);
    expect(callsTo(calls, `POST /admin/users/${USER.id}/suspend`)[0]?.body).toEqual({ reason: '문의 도배' });
  });

  it('정지된 사용자(D26): 정지 카드와 정지 해제(D26-1)', async () => {
    const { calls } = server({
      [`GET /admin/users/${USER.id}`]: { status: 200, body: userDetail({ status: 'SUSPENDED', suspension: { at: '2026-11-18T02:02:26Z', by: { id: '22222222-2222-4222-8222-222222222222', name: 'lee' }, reason: '문의 도배' } }) },
      [`POST /admin/users/${USER.id}/unsuspend`]: { status: 204 },
    });
    const user = userEvent.setup();
    open();
    const card = within(await screen.findByRole('region', { name: d.suspendedTitle }));
    expect(card.getByText(d.suspendedLine('2026.11.18 11:02:26', 'lee', '문의 도배'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: d.unsuspend }));
    const dialog = within(screen.getByRole('alertdialog', { name: d.unsuspendDialog.title('새벽별') }));
    await user.type(dialog.getByLabelText(d.unsuspendDialog.reason), '소명 확인');
    await user.click(dialog.getByRole('button', { name: d.unsuspendDialog.confirm }));
    await screen.findByRole('status');
    expect(callsTo(calls, `POST /admin/users/${USER.id}/unsuspend`)[0]?.body).toEqual({ reason: '소명 확인' });
  });

  it('계정 삭제(D13): 사유와 닉네임이 맞아야 켜지고, 지우면 목록으로', async () => {
    const { calls } = server({ [`DELETE /admin/users/${USER.id}`]: { status: 204 } });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('button', { name: d.delete }));
    const dialog = within(screen.getByRole('alertdialog', { name: d.deleteDialog.title('새벽별') }));
    const confirm = dialog.getByRole('button', { name: d.deleteDialog.confirm });
    await user.type(dialog.getByLabelText(d.deleteDialog.reason), '문의 #131 로 탈퇴 요청');
    await user.type(dialog.getByLabelText(d.deleteDialog.nickname), '새벽');
    expect(confirm).toBeDisabled();
    await user.type(dialog.getByLabelText(d.deleteDialog.nickname), '별');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(await screen.findByText(d.deleteDialog.done)).toBeInTheDocument();
    expect(callsTo(calls, `DELETE /admin/users/${USER.id}`)[0]?.body).toEqual({ reason: '문의 #131 로 탈퇴 요청', confirmNickname: '새벽별' });
    expect(screen.getByTestId('where')).toHaveTextContent('/users');
  });
});
