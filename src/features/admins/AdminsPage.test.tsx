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
const self = adminAccount();
const other = adminAccount({ id: '22222222-2222-4222-8222-222222222222', loginId: 'park', name: '박운영', createdAt: '2026-11-05T00:00:00Z' });
const off = adminAccount({ id: '33333333-3333-4333-8333-333333333333', loginId: 'lee', name: '이전임', active: false });
const row = (loginId: string) => within(screen.getByRole('row', { name: new RegExp(`^${loginId}`) }));
const createDialog = () => within(screen.getByRole('dialog', { name: t.createTitle }));
const openMenu = async (loginId: string) => userEvent.click(screen.getByRole('button', { name: t.more(loginId) }));

const fillCreate = async (loginId: string, name: string, password: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: t.create }));
  if (loginId) await user.type(createDialog().getByLabelText(t.loginId), loginId);
  if (name) await user.type(createDialog().getByLabelText(t.name), name);
  if (password) await user.type(createDialog().getByLabelText(t.password), password);
  await user.click(createDialog().getByRole('button', { name: t.createSubmit }));
};

describe('관리자(D9)', () => {
  it('표: 아이디(나 표시) · 이름 · 상태 · 등록 일시, 내 줄에는 ⋯ 가 없다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self, other, off] } });
    renderApp(<AdminsPage />);
    const table = await screen.findByRole('table', { name: t.listLabel });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([t.columns.loginId, t.columns.name, t.columns.state, t.columns.createdAt, t.columns.action]);
    expect(await row(self.loginId).findByText(t.me)).toBeInTheDocument();
    expect(row(self.loginId).queryByRole('button', { name: t.more(self.loginId) })).not.toBeInTheDocument();
    expect(row(other.loginId).getByText(t.active)).toBeInTheDocument();
    expect(row(other.loginId).getByText('2026.11.05 09:00:00')).toBeInTheDocument();
    expect(row(off.loginId).getByText(t.inactive)).toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 500, body: { error: 'X' } } });
    renderApp(<AdminsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/admins'] = { status: 200, body: [self] };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('관리자 추가: 아이디는 공백을 떼고 소문자로, 이름은 공백을 떼고 보내고 목록에 붙인다', async () => {
    const made = adminAccount({ id: '44444444-4444-4444-8444-444444444444', loginId: 'choi', name: '최신입' });
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self] }, 'POST /admin/admins': { status: 201, body: made } });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await fillCreate(' Choi ', ' 최신입 ', 'first-pass-1234');
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.created('choi'));
    expect(callsTo(calls, 'POST /admin/admins')[0]?.body).toEqual({ loginId: 'choi', name: '최신입', password: 'first-pass-1234' });
    expect(row('choi').getByText(t.active)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('보내기 전에 규칙을 본다: 아이디 · 이름 · 10자 · 72바이트', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self] } });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await fillCreate('A', '', 'short');
    expect(createDialog().getByText(t.errors.INVALID_LOGIN_ID)).toBeInTheDocument();
    expect(createDialog().getByText(t.errors.INVALID_NAME)).toBeInTheDocument();
    expect(createDialog().getByText(strings.passwordRule.TOO_SHORT)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/admins')).toHaveLength(0);
  });

  it('LOGIN_ID_TAKEN 을 알리고 비밀번호 칸을 비운다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self] }, 'POST /admin/admins': { status: 409, body: { error: 'LOGIN_ID_TAKEN' } } });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await fillCreate('park', '박', 'first-pass-1234');
    expect(await createDialog().findByText(t.errors.LOGIN_ID_TAKEN)).toBeInTheDocument();
    expect(createDialog().getByLabelText(t.password)).toHaveValue('');
    expect(createDialog().getByLabelText(t.loginId)).toHaveValue('park');
  });

  it('⋯ → 비활성화는 먼저 묻는다: 취소하면 부르지 않고, 확인하면 active: false', async () => {
    const PATCH = `PATCH /admin/admins/${other.id}`;
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self, other] },
      [PATCH]: { status: 200, body: { ...other, active: false } },
    });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.deactivate }));
    const ask = within(screen.getByRole('alertdialog', { name: t.deactivateTitle }));
    expect(ask.getByText(t.deactivateBody(other.loginId))).toBeInTheDocument();
    await user.click(ask.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, PATCH)).toHaveLength(0);
    await openMenu(other.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.deactivate }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.deactivate }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.deactivated(other.loginId));
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ active: false });
    expect(row(other.loginId).getByText(t.inactive)).toBeInTheDocument();
  });

  it('비활성 관리자는 ⋯ → 활성화(active: true)', async () => {
    const PATCH = `PATCH /admin/admins/${off.id}`;
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self, off] }, [PATCH]: { status: 200, body: { ...off, active: true } } });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(off.loginId);
    await user.click(screen.getByRole('menuitem', { name: t.reactivate }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.reactivateTitle })).getByRole('button', { name: t.reactivate }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.reactivated(off.loginId));
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ active: true });
  });

  it.each([
    ['CANNOT_DEACTIVATE_SELF', t.errors.CANNOT_DEACTIVATE_SELF],
    ['LAST_ACTIVE_ADMIN', t.errors.LAST_ACTIVE_ADMIN],
  ])('%s 를 알리고 목록은 그대로 둔다', async (code, text) => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self, other] }, [`PATCH /admin/admins/${other.id}`]: { status: 409, body: { error: code } } });
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

describe('관리자 — 비밀번호 재설정(⋯)', () => {
  const r = t.reset;
  const PUT = `PUT /admin/admins/${other.id}/password`;
  const list = { status: 200, body: [self, other, off] };
  const dialog = () => within(screen.getByRole('dialog', { name: r.title(other.loginId) }));
  const openDialog = async () => {
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(other.loginId);
    await userEvent.click(screen.getByRole('menuitem', { name: r.button }));
  };
  const fill = async (password: string, confirm = password) => {
    if (password) await userEvent.type(dialog().getByLabelText(r.password), password);
    if (confirm) await userEvent.type(dialog().getByLabelText(r.confirm), confirm);
    await userEvent.click(dialog().getByRole('button', { name: r.submit }));
  };

  it('비활성 관리자의 ⋯ 에도 있다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await openMenu(off.loginId);
    expect(screen.getByRole('menuitem', { name: r.button })).toBeInTheDocument();
  });

  it('새 비밀번호를 두 번 받아 password 만 보내고, 직접 전달하라고 알린다(알림에 비밀번호는 없다)', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list, [PUT]: { status: 204 } });
    await openDialog();
    expect(dialog().getByText(r.note)).toBeInTheDocument();
    expect(dialog().getByText(strings.passwordRule.help)).toBeInTheDocument();
    expect(dialog().getByLabelText(r.password)).toHaveAttribute('type', 'password');
    await fill(' new pw 12345 ');
    expect(await screen.findByRole('status')).toHaveTextContent(r.done(other.loginId));
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ password: ' new pw 12345 ' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/new pw 12345/)).not.toBeInTheDocument();
  });

  it('보내기 전에 규칙을 본다: 10자 · 72바이트 · 두 번이 같은지', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list });
    await openDialog();
    await fill('short');
    expect(dialog().getByText(strings.passwordRule.TOO_SHORT)).toBeInTheDocument();
    await userEvent.clear(dialog().getByLabelText(r.password));
    await userEvent.clear(dialog().getByLabelText(r.confirm));
    await fill('가'.repeat(25));
    expect(dialog().getByText(strings.passwordRule.TOO_LONG)).toBeInTheDocument();
    await userEvent.clear(dialog().getByLabelText(r.password));
    await userEvent.clear(dialog().getByLabelText(r.confirm));
    await fill('pw-1234567890', 'pw-1234567891');
    expect(dialog().getByText(r.mismatch)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('취소 · Esc 는 보내지 않고 닫는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list });
    await openDialog();
    await userEvent.type(dialog().getByLabelText(r.password), 'pw-1234567890');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it.each([
    ['USE_OWN_PASSWORD_CHANGE', 409, r.errors.USE_OWN_PASSWORD_CHANGE],
    ['INVALID_PASSWORD', 400, r.errors.INVALID_PASSWORD],
    ['NOT_FOUND', 404, r.errors.NOT_FOUND],
  ])('%s 를 알리고 비밀번호 칸을 비운다', async (code, status, text) => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list, [PUT]: { status, body: { error: code } } });
    await openDialog();
    await fill('pw-1234567890');
    expect(await dialog().findByRole('alert')).toHaveTextContent(text);
    expect(dialog().getByLabelText(r.password)).toHaveValue('');
    expect(dialog().getByLabelText(r.confirm)).toHaveValue('');
  });
});

describe('관리자 — 내 비밀번호 변경 카드(D9)', () => {
  const p = strings.password;
  const PUT = 'PUT /admin/me/password';
  const card = () => within(screen.getByRole('form', { name: p.title }));
  const setup = (reply = { status: 204 } as { status: number; body?: unknown }) =>
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self] }, [PUT]: reply });
  const fill = async (current: string, next: string) => {
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    if (current) await userEvent.type(card().getByLabelText(p.current), current);
    if (next) await userEvent.type(card().getByLabelText(p.next), next);
    await userEvent.click(card().getByRole('button', { name: p.submit }));
  };

  it('바꾸면 짧은 알림을 보이고 칸을 모두 비운다 · 다른 세션이 끝난다는 안내', async () => {
    const { calls } = setup();
    await fill('old-password-1', 'new-password-12');
    expect(await screen.findByRole('status')).toHaveTextContent(p.done);
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ currentPassword: 'old-password-1', newPassword: 'new-password-12' });
    expect(card().getByLabelText(p.current)).toHaveValue('');
    expect(card().getByLabelText(p.next)).toHaveValue('');
    expect(card().getByText(p.note)).toBeInTheDocument();
  });

  it('현재 비밀번호가 비었거나 새 비밀번호가 규칙에 맞지 않으면 보내지 않는다', async () => {
    const { calls } = setup();
    await fill('', 'short');
    expect(card().getByText(p.required)).toBeInTheDocument();
    expect(card().getByText(strings.passwordRule.TOO_SHORT)).toBeInTheDocument();
    await userEvent.clear(card().getByLabelText(p.next));
    await userEvent.type(card().getByLabelText(p.current), 'old-password-1');
    await userEvent.type(card().getByLabelText(p.next), '가'.repeat(25));
    await userEvent.click(card().getByRole('button', { name: p.submit }));
    expect(card().getByText(strings.passwordRule.TOO_LONG)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('INVALID_CURRENT_PASSWORD 는 알리고 칸을 비운다', async () => {
    setup({ status: 400, body: { error: 'INVALID_CURRENT_PASSWORD' } });
    await fill('wrong-password', 'new-password-12');
    expect(await screen.findByRole('alert')).toHaveTextContent(p.errors.INVALID_CURRENT_PASSWORD);
    expect(card().getByLabelText(p.current)).toHaveValue('');
  });
});
