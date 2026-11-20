import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin, adminAccount } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { AdminsPage } from './AdminsPage';

const t = strings.admins;
const me = { status: 200, body: admin };
const self = adminAccount({ lastLoginAt: '2026-11-19T23:01:12Z' });
const other = adminAccount({ id: '22222222-2222-4222-8222-222222222222', loginId: 'lee', name: '이운영', lastLoginAt: '2026-11-18T10:22:40Z' });
const off = adminAccount({ id: '33333333-3333-4333-8333-333333333333', loginId: 'park', name: '박운영', active: false });
const row = (loginId: string) => within(screen.getByRole('row', { name: new RegExp(`^${loginId}`) }));
const openMenu = async (loginId: string) => userEvent.click(screen.getByRole('button', { name: t.more(loginId) }));
const list = (items = [self, other, off]) => ({ status: 200, body: items });

describe('관리자(D9)', () => {
  it('표: 아이디("나" 표시 없음) · 역할(운영자) · 상태 · 마지막 로그인 · ⋯, 내 줄에는 ⋯ 가 없다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list() });
    renderApp(<AdminsPage />);
    const table = await screen.findByRole('table', { name: t.listLabel });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([t.columns.loginId, t.columns.role, t.columns.state, t.columns.lastLogin, t.columns.action]);
    expect(await row(self.loginId).findByText(self.loginId)).toBeInTheDocument();
    expect(row(self.loginId).queryByText('나')).not.toBeInTheDocument();
    expect(row(self.loginId).getByText('2026.11.20 08:01:12')).toBeInTheDocument();
    expect(row(self.loginId).queryByRole('button', { name: t.more(self.loginId) })).not.toBeInTheDocument();
    expect(row(other.loginId).getByText(t.role)).toBeInTheDocument();
    expect(row(other.loginId).getByText(t.active)).toBeInTheDocument();
    expect(row(off.loginId).getByText(t.inactive)).toBeInTheDocument();
    expect(row(off.loginId).getByText(t.none)).toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 500, body: { error: 'X' } } });
    renderApp(<AdminsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/admins'] = list([self]);
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('관리자 추가(D16 → D17): 아이디만 보내고, 임시 비밀번호를 한 번 보여 주며 복사할 수 있다', async () => {
    const made = adminAccount({ id: '44444444-4444-4444-8444-444444444444', loginId: 'lee2', name: 'lee2' });
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list([self]), 'POST /admin/admins': { status: 201, body: { admin: made, temporaryPassword: 'Kx7m-Q2pa-9Lrt' } } });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: t.create }));
    const create = within(screen.getByRole('dialog', { name: t.createTitle }));
    expect(create.getByText(t.loginIdHelp)).toBeInTheDocument();
    expect(create.getByText(t.createNote)).toBeInTheDocument();
    await user.type(create.getByLabelText(t.loginId), ' Lee2 ');
    await user.click(create.getByRole('button', { name: t.createSubmit }));
    const done = within(await screen.findByRole('dialog', { name: t.createdTitle('lee2') }));
    expect(callsTo(calls, 'POST /admin/admins')[0]?.body).toEqual({ loginId: 'lee2' });
    expect(done.getByLabelText(t.temporary)).toHaveValue('Kx7m-Q2pa-9Lrt');
    expect(done.getByText(t.temporaryWarn)).toBeInTheDocument();
    await user.click(done.getByRole('button', { name: t.copy }));
    expect(await navigator.clipboard.readText()).toBe('Kx7m-Q2pa-9Lrt');
    await user.click(done.getByRole('button', { name: t.confirm }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // 창을 닫으면 다시 볼 수 없다
    expect(screen.queryByDisplayValue('Kx7m-Q2pa-9Lrt')).not.toBeInTheDocument();
    expect(row('lee2').getByText(t.active)).toBeInTheDocument();
  });

  it('아이디 규칙(영문 소문자 · 숫자 4~20자)에 맞지 않으면 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list([self]) });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: t.create }));
    const create = within(screen.getByRole('dialog', { name: t.createTitle }));
    await user.type(create.getByLabelText(t.loginId), 'ab');
    await user.click(create.getByRole('button', { name: t.createSubmit }));
    expect(create.getByText(t.errors.INVALID_LOGIN_ID)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/admins')).toHaveLength(0);
  });

  it('LOGIN_ID_TAKEN 을 알리고 쓴 아이디는 그대로', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list([self]), 'POST /admin/admins': { status: 409, body: { error: 'LOGIN_ID_TAKEN' } } });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: t.create }));
    const create = within(screen.getByRole('dialog', { name: t.createTitle }));
    await user.type(create.getByLabelText(t.loginId), 'lee2');
    await user.click(create.getByRole('button', { name: t.createSubmit }));
    expect(await create.findByText(t.errors.LOGIN_ID_TAKEN)).toBeInTheDocument();
    expect(create.getByLabelText(t.loginId)).toHaveValue('lee2');
  });

  it('⋯ → 비밀번호 재발급(D27 → D27-1): 묻고, 확인하면 임시 비밀번호를 한 번 보여 준다', async () => {
    const POST = `POST /admin/admins/${other.id}/password-reset`;
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list(), [POST]: { status: 200, body: { temporaryPassword: 'Ab12-Cd34-Ef56' } } });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.reissue }));
    const ask = within(screen.getByRole('alertdialog', { name: t.reissueTitle('lee') }));
    expect(ask.getByText(t.reissueBody('lee'))).toBeInTheDocument();
    await user.click(ask.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, POST)).toHaveLength(0);
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.reissue }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.reissueSubmit }));
    const done = within(await screen.findByRole('dialog', { name: t.reissuedTitle('lee') }));
    expect(done.getByLabelText(t.temporary)).toHaveValue('Ab12-Cd34-Ef56');
  });

  it('⋯ → 비활성화는 먼저 묻고 active: false, 비활성 관리자는 ⋯ → 활성화', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': list(),
      [`PATCH /admin/admins/${other.id}`]: { status: 200, body: { ...other, active: false } },
      [`PATCH /admin/admins/${off.id}`]: { status: 200, body: { ...off, active: true } },
    });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.deactivate }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.deactivateTitle })).getByRole('button', { name: t.deactivate }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.deactivated('lee'));
    expect(callsTo(calls, `PATCH /admin/admins/${other.id}`)[0]?.body).toEqual({ active: false });
    await openMenu(off.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.reactivate }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.reactivateTitle })).getByRole('button', { name: t.reactivate }));
    expect(callsTo(calls, `PATCH /admin/admins/${off.id}`)[0]?.body).toEqual({ active: true });
  });

  it.each([
    ['CANNOT_DEACTIVATE_SELF', t.errors.CANNOT_DEACTIVATE_SELF],
    ['LAST_ACTIVE_ADMIN', t.errors.LAST_ACTIVE_ADMIN],
  ])('%s 를 알리고 목록은 그대로 둔다', async (code, text) => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list([self, other]), [`PATCH /admin/admins/${other.id}`]: { status: 409, body: { error: code } } });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.deactivate }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.deactivate }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(row(other.loginId).getByText(t.active)).toBeInTheDocument();
  });
});

describe('관리자 — 내 비밀번호 변경 카드(D9)', () => {
  const p = strings.password;
  const PUT = 'PUT /admin/me/password';
  const card = () => within(screen.getByRole('form', { name: p.title }));
  const setup = (reply = { status: 204 } as { status: number; body?: unknown }) => mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list([self]), [PUT]: reply });
  const fill = async (current: string, next: string) => {
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    if (current) await userEvent.type(card().getByLabelText(p.current), current);
    if (next) await userEvent.type(card().getByLabelText(p.next), next);
    await userEvent.click(card().getByRole('button', { name: p.submit }));
  };

  it('바꾸면 짧은 알림을 보이고 칸을 모두 비운다 · 규칙 안내(10자 이상, 영문 · 숫자 조합)', async () => {
    const { calls } = setup();
    await fill('old-password-1', 'new-password-12');
    expect(await screen.findByRole('status')).toHaveTextContent(p.done);
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ currentPassword: 'old-password-1', newPassword: 'new-password-12' });
    expect(card().getByLabelText(p.current)).toHaveValue('');
    expect(card().getByText(p.help)).toBeInTheDocument();
  });

  it('현재 비밀번호가 비었거나 새 비밀번호가 규칙(10자 · 영문 · 숫자)에 맞지 않으면 보내지 않는다', async () => {
    const { calls } = setup();
    await fill('', '1234567890');
    expect(card().getByText(p.required)).toBeInTheDocument();
    expect(card().getByText(strings.passwordRule.NO_MIX)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('INVALID_CURRENT_PASSWORD 는 알리고 칸을 비운다', async () => {
    setup({ status: 400, body: { error: 'INVALID_CURRENT_PASSWORD' } });
    await fill('wrong-password1', 'new-password-12');
    expect(await screen.findByRole('alert')).toHaveTextContent(p.errors.INVALID_CURRENT_PASSWORD);
    expect(card().getByLabelText(p.current)).toHaveValue('');
  });
});
