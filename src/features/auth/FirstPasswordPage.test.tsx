import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../../app/App';
import { strings } from '../../content/strings';
import { admin, appConfig, stats } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';

const t = strings.password.first;
const temp = { token: 'tok-temp', expiresAt: '2099-01-01T00:00:00Z', admin: { ...admin, mustChangePassword: true } };
const server = (over = {}) =>
  mockFetch({
    'POST /admin/auth/login': { status: 200, body: temp },
    'PUT /admin/me/password': { status: 204 },
    'GET /admin/me': { status: 200, body: admin },
    'GET /admin/stats': { status: 200, body: stats() },
    'GET /admin/stats/active': { status: 404, body: { error: 'NOT_FOUND' } },
    'GET /admin/app-config': { status: 200, body: appConfig() },
    'GET /admin/inquiries': { status: 200, body: { items: [], page: 0, size: 3, total: 0 } },
    ...over,
  });
const login = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(strings.login.loginId), 'lee2');
  await user.type(screen.getByLabelText(strings.login.password), 'Kx7m-Q2pa-9Lrt');
  await user.click(screen.getByRole('button', { name: strings.login.submit }));
};
const rule = (name: string) => within(screen.getByRole('list', { name: t.rulesLabel })).getByText(name).closest('li');

describe('첫 로그인 비밀번호 변경(D22)', () => {
  it('임시 비밀번호로 들어오면 다른 화면 대신 여기로 오고, 규칙 넷을 채워야 "변경 후 시작" 이 켜진다', async () => {
    const { calls } = server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />, { route: '/login', signedIn: false });
    await login();
    expect(await screen.findByText(t.notice)).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    // 임시 비밀번호는 로그인 때 받은 것을 쓰므로 다시 묻지 않는다
    expect(screen.queryByLabelText(t.temporary)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: t.submit });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(t.next), 'Kx7m-Q2pa-9Lrt');
    expect(rule(t.rules.different)).not.toHaveClass('is-ok');
    await user.clear(screen.getByLabelText(t.next));
    await user.type(screen.getByLabelText(t.next), 'new-pass-2026');
    await user.type(screen.getByLabelText(t.confirm), 'new-pass-2026');
    for (const name of Object.values(t.rules)) expect(rule(name)).toHaveClass('is-ok');
    await user.click(submit);
    expect(await screen.findByRole('heading', { level: 1, name: strings.stats.title })).toBeInTheDocument();
    expect(callsTo(calls, 'PUT /admin/me/password')[0]?.body).toEqual({ currentPassword: 'Kx7m-Q2pa-9Lrt', newPassword: 'new-pass-2026' });
  });

  it('비밀번호를 바꾸기 전엔 주소로 다른 화면에 가도 여기로 돌아온다', async () => {
    server({ 'GET /admin/me': { status: 200, body: { ...admin, mustChangePassword: true } } });
    renderApp(<AppRoutes />, { route: '/inquiries' });
    expect(await screen.findByText(t.notice)).toBeInTheDocument();
    // 새로 고쳐 임시 비밀번호가 메모리에 없으면 다시 묻는다
    expect(screen.getByLabelText(t.temporary)).toBeInTheDocument();
  });

  it('화면을 쓰는 중 서버가 403 PASSWORD_CHANGE_REQUIRED 로 막으면 여기로 온다', async () => {
    server({ 'GET /admin/stats': { status: 403, body: { error: 'PASSWORD_CHANGE_REQUIRED' } } });
    renderApp(<AppRoutes />, { route: '/stats' });
    expect(await screen.findByText(t.notice)).toBeInTheDocument();
  });

  it('SAME_AS_TEMPORARY 등 서버 거절은 알리고 칸을 비운다', async () => {
    server({ 'PUT /admin/me/password': { status: 400, body: { error: 'SAME_AS_TEMPORARY' } } });
    const user = userEvent.setup();
    renderApp(<AppRoutes />, { route: '/login', signedIn: false });
    await login();
    await user.type(await screen.findByLabelText(t.next), 'new-pass-2026');
    await user.type(screen.getByLabelText(t.confirm), 'new-pass-2026');
    await user.click(screen.getByRole('button', { name: t.submit }));
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.password.errors.SAME_AS_TEMPORARY);
    expect(screen.getByLabelText(t.next)).toHaveValue('');
  });
});
