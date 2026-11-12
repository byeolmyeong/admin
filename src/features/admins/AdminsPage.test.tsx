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
const row = (name: string) => within(screen.getByRole('row', { name: new RegExp(name) }));
const form = () => within(screen.getByRole('form', { name: t.createTitle }));

const fillCreate = async (loginId: string, name: string, password: string) => {
  const user = userEvent.setup();
  if (loginId) await user.type(form().getByLabelText(t.loginId), loginId);
  if (name) await user.type(form().getByLabelText(t.name), name);
  if (password) await user.type(form().getByLabelText(t.password), password);
  await user.click(form().getByRole('button', { name: t.createSubmit }));
};

describe('관리자', () => {
  it('목록: 이름·아이디·상태·만든 때. 나에게는 중지 버튼이 없다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self, other, off] } });
    renderApp(<AdminsPage />);
    await screen.findByRole('table', { name: t.listLabel });
    expect(row(other.name).getByText('park')).toBeInTheDocument();
    expect(row(other.name).getByText(t.active)).toBeInTheDocument();
    expect(row(other.name).getByText('2026-11-05 09:00')).toBeInTheDocument();
    expect(row(other.name).getByRole('button', { name: t.deactivate })).toBeInTheDocument();
    expect(row(off.name).getByText(t.inactive)).toBeInTheDocument();
    expect(row(off.name).getByRole('button', { name: t.reactivate })).toBeInTheDocument();
    expect(await row(self.name).findByText(t.me)).toBeInTheDocument();
    expect(row(self.name).queryByRole('button')).not.toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 500, body: { error: 'X' } } });
    renderApp(<AdminsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/admins'] = { status: 200, body: [self] };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('만들기: 아이디는 공백을 떼고 소문자로, 이름은 공백을 떼고 보내고, 비밀번호 칸을 비운다', async () => {
    const made = adminAccount({ id: '44444444-4444-4444-8444-444444444444', loginId: 'new.kim', name: '김새롬' });
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self] },
      'POST /admin/admins': { status: 201, body: made },
    });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await fillCreate(' New.Kim', ' 김새롬 ', ' pw 1234567 ');
    expect(await screen.findByText(t.done.created('김새롬'))).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/admins')[0]?.body).toEqual({ loginId: 'new.kim', name: '김새롬', password: ' pw 1234567 ' });
    expect(row('김새롬').getByText('new.kim')).toBeInTheDocument();
    expect(form().getByLabelText(t.password)).toHaveValue('');
    expect(form().getByLabelText(t.loginId)).toHaveValue('');
  });

  it('보내기 전에 규칙을 본다: 아이디 · 이름 · 10자 · 72바이트', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': { status: 200, body: [self] } });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    expect(form().getByText(strings.passwordRule.help)).toBeInTheDocument();
    await fillCreate('ab', '', 'short');
    expect(form().getByText(t.errors.INVALID_LOGIN_ID)).toBeInTheDocument();
    expect(form().getByText(t.errors.INVALID_NAME)).toBeInTheDocument();
    expect(form().getByText(strings.passwordRule.TOO_SHORT)).toBeInTheDocument();
    await fillCreate('c', '김', '가'.repeat(25));
    expect(form().queryByText(t.errors.INVALID_LOGIN_ID)).not.toBeInTheDocument();
    expect(form().queryByText(t.errors.INVALID_NAME)).not.toBeInTheDocument();
    expect(form().getByText(strings.passwordRule.TOO_LONG)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/admins')).toHaveLength(0);
  });

  it('LOGIN_ID_TAKEN 을 알리고 비밀번호 칸을 비운다', async () => {
    mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self] },
      'POST /admin/admins': { status: 409, body: { error: 'LOGIN_ID_TAKEN' } },
    });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await fillCreate('park', '박운영', 'pw-1234567890');
    expect(await form().findByRole('alert')).toHaveTextContent(t.errors.LOGIN_ID_TAKEN);
    expect(form().getByLabelText(t.password)).toHaveValue('');
    expect(form().getByLabelText(t.loginId)).toHaveValue('park');
  });

  it('사용 중지는 먼저 묻는다: 취소하면 부르지 않고, 확인하면 active: false 를 보낸다', async () => {
    const PATCH = `PATCH /admin/admins/${other.id}`;
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self, other] },
      [PATCH]: { status: 200, body: { ...other, active: false } },
    });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(row(other.name).getByRole('button', { name: t.deactivate }));
    const dialog = within(screen.getByRole('alertdialog', { name: t.deactivateTitle }));
    expect(dialog.getByText(t.deactivateBody(other.name))).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, PATCH)).toHaveLength(0);

    await user.click(row(other.name).getByRole('button', { name: t.deactivate }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.deactivate }));
    expect(await screen.findByText(t.done.deactivated(other.name))).toBeInTheDocument();
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ active: false });
    expect(row(other.name).getByText(t.inactive)).toBeInTheDocument();
    expect(row(other.name).getByRole('button', { name: t.reactivate })).toBeInTheDocument();
  });

  it('다시 켜기도 묻고 active: true 를 보낸다', async () => {
    const PATCH = `PATCH /admin/admins/${off.id}`;
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self, off] },
      [PATCH]: { status: 200, body: { ...off, active: true } },
    });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(row(off.name).getByRole('button', { name: t.reactivate }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.reactivateTitle })).getByRole('button', { name: t.reactivate }));
    expect(await screen.findByText(t.done.reactivated(off.name))).toBeInTheDocument();
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ active: true });
    expect(row(off.name).getByText(t.active)).toBeInTheDocument();
  });

  it.each([
    ['CANNOT_DEACTIVATE_SELF', t.errors.CANNOT_DEACTIVATE_SELF],
    ['LAST_ACTIVE_ADMIN', t.errors.LAST_ACTIVE_ADMIN],
  ])('%s 를 알리고 목록은 그대로 둔다', async (code, text) => {
    mockFetch({
      'GET /admin/me': me,
      'GET /admin/admins': { status: 200, body: [self, other] },
      [`PATCH /admin/admins/${other.id}`]: { status: 409, body: { error: code } },
    });
    const user = userEvent.setup();
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await user.click(row(other.name).getByRole('button', { name: t.deactivate }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.deactivate }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(row(other.name).getByText(t.active)).toBeInTheDocument();
  });
});

describe('관리자 — 비밀번호 재설정', () => {
  const r = t.reset;
  const PUT = `PUT /admin/admins/${other.id}/password`;
  const list = { status: 200, body: [self, other, off] };
  const dialog = () => within(screen.getByRole('dialog', { name: r.title(other.name) }));
  const openDialog = async () => {
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    await userEvent.click(row(other.name).getByRole('button', { name: r.button }));
  };
  const fill = async (password: string, confirm = password) => {
    if (password) await userEvent.type(dialog().getByLabelText(r.password), password);
    if (confirm) await userEvent.type(dialog().getByLabelText(r.confirm), confirm);
    await userEvent.click(dialog().getByRole('button', { name: r.submit }));
  };

  it('내 줄에는 버튼이 없고, 다른 관리자(중지된 관리자도)의 줄에는 있다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list });
    renderApp(<AdminsPage />);
    await screen.findByRole('table');
    expect(await row(self.name).findByText(t.me)).toBeInTheDocument();
    expect(row(self.name).queryByRole('button', { name: r.button })).not.toBeInTheDocument();
    expect(row(other.name).getByRole('button', { name: r.button })).toBeInTheDocument();
    expect(row(off.name).getByRole('button', { name: r.button })).toBeInTheDocument();
  });

  it('새 비밀번호를 두 번 받아 password 만 보내고, 세션이 끝났고 직접 전해야 한다고 알린다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list, [PUT]: { status: 204 } });
    await openDialog();
    expect(dialog().getByText(r.note)).toBeInTheDocument();
    expect(dialog().getByText(strings.passwordRule.help)).toBeInTheDocument();
    expect(dialog().getByLabelText(r.password)).toHaveAttribute('type', 'password');
    await fill(' new pw 12345 ');
    expect(await screen.findByText(r.done(other.name))).toBeInTheDocument();
    expect(r.done(other.name)).toMatch(/세션은 모두 끝났어요/);
    expect(r.done(other.name)).toMatch(/직접 전해/);
    expect(r.done(other.name)).toMatch(/로그인한 뒤 "비밀번호 변경" 에서 바꿔야/);
    expect(callsTo(calls, PUT)).toHaveLength(1);
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ password: ' new pw 12345 ' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // 알림에 비밀번호를 적지 않는다
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

  it('취소하면 보내지 않고 닫는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/admins': list });
    await openDialog();
    await userEvent.type(dialog().getByLabelText(r.password), 'pw-1234567890');
    await userEvent.click(dialog().getByRole('button', { name: strings.common.cancel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
    // 다시 열면 칸이 비어 있다
    await userEvent.click(row(other.name).getByRole('button', { name: r.button }));
    expect(dialog().getByLabelText(r.password)).toHaveValue('');
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
