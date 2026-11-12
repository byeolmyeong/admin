import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { strings } from '../content/strings';
import { admin, adminAccount, appConfig, auditLog, faq, inquiry, maintenance, stats } from '../test/fixtures';
import { callsTo, mockFetch } from '../test/mockFetch';
import type { Route } from '../test/mockFetch';
import { renderApp } from '../test/render';
import { App, AppRoutes } from './App';
import { sections } from './sections';

const t = strings.shell;
const one = inquiry();
const server = (over: Record<string, Route> = {}) =>
  mockFetch({
    'GET /admin/me': { status: 200, body: admin },
    'GET /admin/stats': { status: 200, body: stats() },
    'GET /admin/inquiries': { status: 200, body: { items: [one], page: 0, size: 20, total: 1 } },
    [`GET /admin/inquiries/${one.id}`]: { status: 200, body: one },
    'GET /admin/faqs': { status: 200, body: [faq()] },
    'GET /admin/admins': { status: 200, body: [adminAccount()] },
    'GET /admin/audit-logs': { status: 200, body: { items: [auditLog()], page: 0, size: 20, total: 1 } },
    'GET /admin/app-config': { status: 200, body: appConfig() },
    'POST /admin/auth/logout': { status: 204 },
    ...over,
  });
const nav = () => within(screen.getByRole('navigation', { name: t.navLabel }));
const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

describe('화면 틀', () => {
  it('왼쪽 메뉴: 현황 · 문의 · 자주 묻는 질문 · 관리자 · 감사 로그 · 앱 설정, 그리고 내 이름 · 비밀번호 변경 · 로그아웃', async () => {
    server();
    renderApp(<AppRoutes />);
    expect(nav().getAllByRole('link').map((a) => a.textContent)).toEqual([t.nav.stats, t.nav.inquiries, t.nav.faqs, t.nav.admins, t.nav.auditLogs, t.nav.appConfig]);
    const account = within(screen.getByRole('group', { name: t.accountLabel }));
    expect(await account.findByText(admin.name)).toBeInTheDocument();
    expect(account.getByRole('link', { name: t.changePassword })).toHaveAttribute('href', '/password');
    expect(account.getByRole('button', { name: t.logout })).toBeInTheDocument();
  });

  it('메뉴와 라우트는 구역 목록에서 나온다(새 구역은 sections 에 한 줄)', () => {
    expect(sections.map((s) => s.to)).toEqual(['/stats', '/inquiries', '/faqs', '/admins', '/audit-logs', '/app-config']);
    for (const section of sections) expect(section.routes.length).toBeGreaterThan(0);
  });

  it('첫 화면은 현황이고, 메뉴로 다른 구역에 간다', async () => {
    server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    expect(await heading(strings.stats.title)).toBeInTheDocument();
    expect(nav().getByRole('link', { name: t.nav.stats })).toHaveAttribute('aria-current', 'page');
    await user.click(nav().getByRole('link', { name: t.nav.inquiries }));
    expect(await heading(strings.inquiries.title)).toBeInTheDocument();
    await user.click(await screen.findByRole('link', { name: /리포트가 열리지 않아요/ }));
    expect(await heading(strings.inquiries.detail.title)).toBeInTheDocument();
    expect(nav().getByRole('link', { name: t.nav.inquiries })).toHaveAttribute('aria-current', 'page');
    await user.click(nav().getByRole('link', { name: t.nav.faqs }));
    expect(await heading(strings.faqs.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.admins }));
    expect(await heading(strings.admins.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.auditLogs }));
    expect(await heading(strings.audit.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.appConfig }));
    expect(await heading(strings.appConfig.title)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: t.changePassword }));
    expect(await heading(strings.password.title)).toBeInTheDocument();
  });

  it('주소로 바로 들어간다: 문의 상세', async () => {
    server();
    renderApp(<AppRoutes />, { route: `/inquiries/${one.id}` });
    expect(await heading(strings.inquiries.detail.title)).toBeInTheDocument();
    expect(await screen.findByText('0123456789ab')).toBeInTheDocument();
  });

  it('문의 상세의 "이 계정의 행동 보기" 는 그 계정으로 거른 감사 로그를 연다', async () => {
    const { calls } = server();
    renderApp(<AppRoutes />, { route: `/inquiries/${one.id}` });
    await userEvent.click(await screen.findByRole('link', { name: strings.inquiries.detail.ownerActions }));
    expect(await heading(strings.audit.title)).toBeInTheDocument();
    await screen.findByRole('table', { name: strings.audit.listLabel });
    expect(callsTo(calls, 'GET /admin/audit-logs')[0]?.query.toString()).toBe('actorType=USER&actorRef=0123456789ab&page=0&size=20');
  });

  it('없는 주소는 현황으로 보낸다', async () => {
    server();
    renderApp(<AppRoutes />, { route: '/nowhere' });
    expect(await heading(strings.stats.title)).toBeInTheDocument();
  });

  it('로그인하지 않았으면 어느 주소든 로그인 화면이다', () => {
    const { fn } = server();
    renderApp(<AppRoutes />, { route: '/inquiries', signedIn: false });
    expect(screen.getByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(fn).not.toHaveBeenCalled();
  });

  it('로그아웃: 서버에 알리고 토큰을 버리고 로그인 화면으로 간다', async () => {
    const { calls } = server();
    renderApp(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: t.logout }));
    expect(await screen.findByText(strings.login.noticeSignedOut)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/auth/logout')[0]?.headers.get('Authorization')).toBe('Bearer tok-test');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('로그아웃 호출이 실패해도 이 브라우저의 토큰은 버린다', async () => {
    server({ 'POST /admin/auth/logout': { status: 500, body: { error: 'X' } } });
    renderApp(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: t.logout }));
    expect(await screen.findByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('화면의 어느 호출이든 401 이면 로그인 화면으로 보내고 알린다', async () => {
    const { routes } = server();
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    routes['GET /admin/faqs'] = { status: 401, body: { error: 'UNAUTHORIZED' } };
    await userEvent.click(nav().getByRole('link', { name: t.nav.faqs }));
    expect(await screen.findByText(strings.login.noticeExpired)).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('내 정보를 받지 못하면 알리고 다시 받을 수 있다', async () => {
    const { routes } = server({ 'GET /admin/me': { status: 500, body: { error: 'X' } } });
    renderApp(<AppRoutes />);
    const account = within(screen.getByRole('group', { name: t.accountLabel }));
    expect(await account.findByText(t.meError)).toBeInTheDocument();
    routes['GET /admin/me'] = { status: 200, body: admin };
    await userEvent.click(account.getByRole('button', { name: strings.common.retry }));
    expect(await account.findByText(admin.name)).toBeInTheDocument();
  });
});

describe('점검 알림', () => {
  const CONFIG = 'GET /admin/app-config';
  const PUT = 'PUT /admin/app-config/maintenance';
  const on = { status: 200, body: appConfig({ maintenance: maintenance({ active: true }) }) };
  const banner = () => screen.findByText(t.maintenanceBanner);

  it('점검이 켜져 있으면 어느 화면에서나 띠와 앱 설정으로 가는 링크를 보인다', async () => {
    const { calls } = server({ [CONFIG]: on });
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    expect(await banner()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.maintenanceLink })).toHaveAttribute('href', '/app-config');
    await user.click(nav().getByRole('link', { name: t.nav.inquiries }));
    await heading(strings.inquiries.title);
    expect(screen.getByText(t.maintenanceBanner)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: t.changePassword }));
    await heading(strings.password.title);
    expect(screen.getByText(t.maintenanceBanner)).toBeInTheDocument();
    // 로그인한 뒤 한 번만 받는다(화면을 옮겨도 다시 묻지 않는다)
    expect(callsTo(calls, CONFIG)).toHaveLength(1);
    await user.click(screen.getByRole('link', { name: t.maintenanceLink }));
    expect(await heading(strings.appConfig.title)).toBeInTheDocument();
  });

  it('꺼져 있거나 받지 못했으면 띠가 없다', async () => {
    const { calls } = server();
    const view = renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await vi.waitFor(() => expect(callsTo(calls, CONFIG)).toHaveLength(1));
    expect(screen.queryByText(t.maintenanceBanner)).not.toBeInTheDocument();
    view.unmount();

    const failed = server({ [CONFIG]: { status: 500, body: { error: 'X' } } });
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await vi.waitFor(() => expect(callsTo(failed.calls, CONFIG)).toHaveLength(1));
    expect(screen.queryByText(t.maintenanceBanner)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('앱 설정에서 켜면 띠가 바로 나타나고, 끄면 사라진다', async () => {
    const m = strings.appConfig.maintenance;
    // 저장한 값이 다음 GET 에도 나오는 서버
    const mock = server({
      [PUT]: (req) => {
        const saved = maintenance(req.body as { active: boolean; message: string | null });
        mock.routes[CONFIG] = { status: 200, body: appConfig({ maintenance: saved }) };
        return { status: 200, body: saved };
      },
    });
    const user = userEvent.setup();
    renderApp(<AppRoutes />, { route: '/app-config' });
    const card = within(await screen.findByRole('form', { name: m.title }));
    expect(screen.queryByText(t.maintenanceBanner)).not.toBeInTheDocument();
    await user.click(card.getByRole('switch', { name: m.active }));
    await user.click(card.getByRole('button', { name: strings.common.save }));
    await user.click(within(screen.getByRole('alertdialog', { name: m.confirmTitle })).getByRole('button', { name: m.confirmLabel }));
    expect(await banner()).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.stats }));
    await heading(strings.stats.title);
    expect(screen.getByText(t.maintenanceBanner)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: t.maintenanceLink }));
    const again = within(await screen.findByRole('form', { name: m.title }));
    await user.click(again.getByRole('switch', { name: m.active }));
    await user.click(again.getByRole('button', { name: strings.common.save }));
    expect(await again.findByText(m.savedOff)).toBeInTheDocument();
    expect(screen.queryByText(t.maintenanceBanner)).not.toBeInTheDocument();
  });

  it('다른 관리자가 켠 점검은 앱 설정 화면을 열 때 띠에도 반영된다', async () => {
    const { routes } = server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    routes[CONFIG] = on;
    await user.click(nav().getByRole('link', { name: t.nav.appConfig }));
    expect(await banner()).toBeInTheDocument();
  });
});

describe('App', () => {
  it('서버 주소(VITE_API_URL)가 없으면 까닭을 알린다', () => {
    vi.stubEnv('VITE_API_URL', '');
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(strings.config.missingApiUrl);
  });

  it('서버 주소가 있으면 로그인 화면부터 보인다', () => {
    mockFetch({});
    render(<App />);
    expect(screen.getByRole('heading', { name: strings.login.title })).toBeInTheDocument();
  });
});
