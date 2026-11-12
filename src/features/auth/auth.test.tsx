import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import { loadSession } from '../../lib/session';
import { admin, loginResult } from '../../test/fixtures';
import { mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { RequireAuth } from './RequireAuth';

const Inside = () => {
  const { admin: me } = useAuth();
  return <p>안쪽 화면 {me?.name}</p>;
};

const tree = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/" element={<Inside />} />
    </Route>
  </Routes>
);

const fill = async (id: string, pw: string) => {
  const user = userEvent.setup();
  if (id) await user.type(screen.getByLabelText(strings.login.loginId), id);
  if (pw) await user.type(screen.getByLabelText(strings.login.password), pw);
  await user.click(screen.getByRole('button', { name: strings.login.submit }));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('로그인', () => {
  it('로그인 전에는 안쪽 화면 대신 로그인 화면이 보인다', () => {
    mockFetch({});
    renderApp(tree, { signedIn: false });
    expect(screen.getByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(screen.queryByText(/안쪽 화면/)).not.toBeInTheDocument();
  });

  it('성공하면 토큰을 sessionStorage 에 두고 안쪽 화면으로 간다', async () => {
    const { calls } = mockFetch({ 'POST /admin/auth/login': { status: 200, body: loginResult('2099-01-01T00:00:00Z') } });
    renderApp(tree, { route: '/login', signedIn: false });
    await fill('owner', 'pw-1234567890');
    expect(await screen.findByText(`안쪽 화면 ${admin.name}`)).toBeInTheDocument();
    expect(calls[0]?.body).toEqual({ loginId: 'owner', password: 'pw-1234567890' });
    expect(loadSession()).toEqual({ token: 'tok-test', expiresAt: '2099-01-01T00:00:00Z' });
    expect(window.sessionStorage.getItem('byeolmyeong-admin.session')).not.toContain('pw-1234567890');
  });

  it('INVALID_CREDENTIALS: 안내하고, 비밀번호 칸을 비우고, 토큰을 두지 않는다', async () => {
    mockFetch({ 'POST /admin/auth/login': { status: 401, body: { error: 'INVALID_CREDENTIALS' } } });
    renderApp(tree, { route: '/login', signedIn: false });
    await fill('owner', 'wrong-password');
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.login.errors.INVALID_CREDENTIALS);
    expect(screen.getByLabelText(strings.login.password)).toHaveValue('');
    expect(screen.getByLabelText(strings.login.loginId)).toHaveValue('owner');
    expect(loadSession()).toBeNull();
  });

  it('RATE_LIMITED 와 연결 실패를 구분해 안내한다', async () => {
    const { routes } = mockFetch({ 'POST /admin/auth/login': { status: 429, body: { error: 'RATE_LIMITED' } } });
    renderApp(tree, { route: '/login', signedIn: false });
    await fill('owner', 'pw-1234567890');
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.login.errors.RATE_LIMITED);
    delete routes['POST /admin/auth/login'];
    await fill('', 'pw-1234567890');
    expect(await screen.findByText(strings.errors.NETWORK)).toBeInTheDocument();
  });

  it('빈 칸이면 서버를 부르지 않는다', async () => {
    const { fn } = mockFetch({});
    renderApp(tree, { route: '/login', signedIn: false });
    await fill('', '');
    expect(screen.getByRole('alert')).toHaveTextContent(strings.login.required);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('세션', () => {
  it('보관된 세션이 있으면 내 정보를 받아 안쪽 화면을 보여 준다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': { status: 200, body: admin } });
    renderApp(tree);
    expect(await screen.findByText(`안쪽 화면 ${admin.name}`)).toBeInTheDocument();
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok-test');
  });

  it('어느 호출이든 401 이면 토큰을 버리고 로그인 화면에서 알린다', async () => {
    mockFetch({ 'GET /admin/me': { status: 401, body: { error: 'UNAUTHORIZED' } } });
    renderApp(tree);
    expect(await screen.findByText(strings.login.noticeExpired)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('expiresAt 이 되면 토큰을 버리고 로그인 화면으로 보낸다', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], now: Date.parse('2026-11-12T00:00:00Z') });
    mockFetch({ 'GET /admin/me': { status: 200, body: admin } });
    renderApp(tree, { expiresAt: '2026-11-12T00:01:00Z' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000);
    });
    expect(screen.getByText(`안쪽 화면 ${admin.name}`)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByText(strings.login.noticeExpired)).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('이미 끝난 세션이 보관돼 있으면 서버를 부르지 않고 로그인 화면이다', () => {
    const { fn } = mockFetch({});
    renderApp(tree, { expiresAt: '2000-01-01T00:00:00Z' });
    expect(screen.getByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(fn).not.toHaveBeenCalled();
  });
});
