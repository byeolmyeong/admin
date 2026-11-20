import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { strings } from '../content/strings';
import { admin, adminAccount, appConfig, auditLog, faq, inquiry, maintenance, stats } from '../test/fixtures';
import { callsTo, mockFetch } from '../test/mockFetch';
import type { Route } from '../test/mockFetch';
import { renderApp } from '../test/render';
import { App, AppRoutes } from './App';
import { sections, visibleSections } from './sections';

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
const inquiriesLink = new RegExp(`^${t.nav.inquiries}`);
const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

describe('화면 틀', () => {
  it('왼쪽 메뉴는 묶음 넷: 현황 / 고객 지원 — 문의 · 사용자 / 소식 · 글 — 푸시 발송 · 자주 묻는 질문 / 운영 설정 — 앱 설정 · 관리자 · 감사 로그', async () => {
    server();
    renderApp(<AppRoutes />);
    const menu = nav();
    expect(menu.getAllByRole('link').map((a) => a.querySelector('.nav__label')?.textContent)).toEqual([
      t.nav.stats,
      t.nav.inquiries,
      t.nav.users,
      t.nav.push,
      t.nav.faqs,
      t.nav.appConfig,
      t.nav.admins,
      t.nav.auditLogs,
    ]);
    expect(menu.getAllByText(/./, { selector: '.nav__group' }).map((g) => g.textContent)).toEqual([t.groups.support, t.groups.content, t.groups.operations]);
    const account = within(screen.getByRole('group', { name: t.accountLabel }));
    expect(await account.findByText(t.who(admin.loginId))).toBeInTheDocument();
    expect(account.getByRole('button', { name: t.logout })).toBeInTheDocument();
  });

  it('메뉴와 라우트는 구역 목록에서 나온다(보드 그대로 — 여덟 구역 모두 보인다)', () => {
    expect(sections.map((s) => s.to)).toEqual(['/stats', '/inquiries', '/users', '/push', '/faqs', '/app-config', '/admins', '/audit-logs']);
    expect(visibleSections()).toHaveLength(8);
    for (const section of visibleSections()) expect(section.routes.length).toBeGreaterThan(0);
  });

  it('VITE_HIDDEN_SECTIONS=users,push 면 사용자 · 푸시 발송이 메뉴와 라우트에서 빠지고, 그 주소는 현황으로 간다', async () => {
    vi.stubEnv('VITE_HIDDEN_SECTIONS', 'users,push');
    expect(visibleSections().map((s) => s.to)).toEqual(['/stats', '/inquiries', '/faqs', '/app-config', '/admins', '/audit-logs']);
    server();
    renderApp(<AppRoutes />, { route: '/users' });
    expect(await heading(strings.stats.title)).toBeInTheDocument();
    expect(nav().queryByText(t.nav.users)).not.toBeInTheDocument();
    expect(nav().queryByText(t.nav.push)).not.toBeInTheDocument();
  });

  it('문의 옆에 답변 대기 수(현황의 새 문의 수)를 보이고, 없으면 숫자를 감춘다', async () => {
    server({ 'GET /admin/stats': { status: 200, body: stats({ inquiries: { total: 9, byStatus: { NEW: 4, IN_PROGRESS: 2, DONE: 3 } } }) } });
    const view = renderApp(<AppRoutes />);
    const link = nav().getByRole('link', { name: new RegExp(`^${t.nav.inquiries}`) });
    expect(await within(link).findByText(t.waiting(4))).toBeInTheDocument();
    expect(link.querySelector('.nav__count [aria-hidden="true"]')?.textContent).toBe('4');
    view.unmount();

    server({ 'GET /admin/stats': { status: 200, body: stats({ inquiries: { total: 3, byStatus: { NEW: 0, IN_PROGRESS: 0, DONE: 3 } } }) } });
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await screen.findAllByText(strings.stats.kpi.waiting);
    expect(nav().queryByText(t.waiting(0))).not.toBeInTheDocument();
  });

  it('폰: 위 막대의 메뉴 버튼이 오른쪽 서랍을 열고, 항목을 누르면 그 화면으로 가며 닫힌다', async () => {
    server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await user.click(screen.getByRole('button', { name: t.menuOpen }));
    const drawer = within(screen.getByRole('dialog', { name: t.menuTitle }));
    expect(drawer.getAllByText(/./, { selector: '.nav__group' })).toHaveLength(3);
    expect(drawer.getByText(t.who(admin.loginId))).toBeInTheDocument();
    await user.click(drawer.getByRole('link', { name: t.nav.faqs }));
    expect(await heading(strings.faqs.title)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: t.menuTitle })).not.toBeInTheDocument();
  });

  it('폰 서랍은 닫기 · Esc · 어두운 곳 누르기로 닫힌다', async () => {
    server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    const open = screen.getByRole('button', { name: t.menuOpen });

    await user.click(open);
    await user.click(within(screen.getByRole('dialog', { name: t.menuTitle })).getByRole('button', { name: t.menuClose }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(open);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(open);
    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('폰 위 막대의 문의 바로 가기는 답변 대기 수와 함께 문의 목록으로 간다', async () => {
    server();
    renderApp(<AppRoutes />);
    const shortcut = await screen.findByRole('link', { name: `${t.nav.inquiries} ${t.waiting(3)}` });
    expect(shortcut).toHaveAttribute('href', '/inquiries');
  });

  it('첫 화면은 현황이고, 메뉴로 다른 구역에 간다', async () => {
    server();
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    expect(await heading(strings.stats.title)).toBeInTheDocument();
    expect(nav().getByRole('link', { name: t.nav.stats })).toHaveAttribute('aria-current', 'page');
    await user.click(nav().getByRole('link', { name: inquiriesLink }));
    expect(await heading(strings.inquiries.title)).toBeInTheDocument();
    await user.click(await screen.findByRole('link', { name: /리포트가 열리지 않아요/ }));
    expect(await screen.findByLabelText(strings.inquiries.detail.memo)).toBeInTheDocument();
    expect(nav().getByRole('link', { name: inquiriesLink })).toHaveAttribute('aria-current', 'page');
    await user.click(nav().getByRole('link', { name: t.nav.faqs }));
    expect(await heading(strings.faqs.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.admins }));
    expect(await heading(strings.admins.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.auditLogs }));
    expect(await heading(strings.audit.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.appConfig }));
    expect(await heading(strings.appConfig.title)).toBeInTheDocument();
  });

  it('주소로 바로 들어간다: 문의 상세', async () => {
    server();
    renderApp(<AppRoutes />, { route: `/inquiries/${one.id}` });
    expect(await heading(strings.inquiries.title)).toBeInTheDocument();
    expect(await screen.findByText('0123456789ab')).toBeInTheDocument();
    expect(screen.getByLabelText(strings.inquiries.detail.memo)).toBeInTheDocument();
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

  it('로그아웃: 서버에 알리고 토큰을 버리고 로그인 화면으로 간다(안내 문구 없음)', async () => {
    const { calls } = server();
    renderApp(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: t.logout }));
    expect(await screen.findByRole('heading', { name: strings.login.title })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
    expect(await account.findByText(t.who(admin.loginId))).toBeInTheDocument();
  });
});

describe('점검 알림', () => {
  const CONFIG = 'GET /admin/app-config';
  const PUT = 'PUT /admin/app-config/maintenance';
  const on = { status: 200, body: appConfig({ maintenance: maintenance({ active: true }) }) };
  const banner = () => screen.findByText(t.maintenance.title);

  it('띠에는 켠 시각(한국 시각)과 켠 관리자를 적는다(D24)', async () => {
    server({ [CONFIG]: { status: 200, body: appConfig({ maintenance: maintenance({ active: true, updatedAt: '2026-11-19T17:00:12Z', updatedBy: { id: admin.id, name: 'kim' } }) }) } });
    renderApp(<AppRoutes />);
    expect(await screen.findByText(t.maintenance.body)).toBeInTheDocument();
    expect(screen.getByText(t.maintenance.since('2026.11.20 02:00:12', 'kim'))).toBeInTheDocument();
  });

  it('점검이 켜져 있으면 어느 화면에서나 띠와 앱 설정으로 가는 링크를 보인다', async () => {
    const { calls } = server({ [CONFIG]: on });
    const user = userEvent.setup();
    renderApp(<AppRoutes />);
    expect(await banner()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.maintenance.link })).toHaveAttribute('href', '/app-config');
    await user.click(nav().getByRole('link', { name: inquiriesLink }));
    await heading(strings.inquiries.title);
    expect(screen.getByText(t.maintenance.title)).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.faqs }));
    await heading(strings.faqs.title);
    expect(screen.getByText(t.maintenance.title)).toBeInTheDocument();
    // 화면 틀은 로그인한 뒤 한 번만 받는다(현황 화면이 머리의 버전 표로 한 번 더 받는다). 화면을 옮겨도 다시 묻지 않는다.
    expect(callsTo(calls, CONFIG)).toHaveLength(2);
    await user.click(screen.getByRole('link', { name: t.maintenance.link }));
    expect(await heading(strings.appConfig.title)).toBeInTheDocument();
  });

  it('꺼져 있거나 받지 못했으면 띠가 없다', async () => {
    const { calls } = server();
    const view = renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await vi.waitFor(() => expect(callsTo(calls, CONFIG)).toHaveLength(2));
    expect(screen.queryByText(t.maintenance.title)).not.toBeInTheDocument();
    view.unmount();

    const failed = server({ [CONFIG]: { status: 500, body: { error: 'X' } } });
    renderApp(<AppRoutes />);
    await heading(strings.stats.title);
    await vi.waitFor(() => expect(callsTo(failed.calls, CONFIG)).toHaveLength(2));
    expect(screen.queryByText(t.maintenance.title)).not.toBeInTheDocument();
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
    const card = within(await screen.findByRole('region', { name: m.title }));
    expect(screen.queryByText(t.maintenance.title)).not.toBeInTheDocument();
    await user.click(card.getByRole('switch', { name: m.active }));
    await user.click(within(screen.getByRole('alertdialog', { name: m.confirmTitle })).getByRole('button', { name: m.confirmLabel }));
    expect(await banner()).toBeInTheDocument();
    await user.click(nav().getByRole('link', { name: t.nav.stats }));
    await heading(strings.stats.title);
    expect(screen.getByText(t.maintenance.title)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: t.maintenance.link }));
    const again = within(await screen.findByRole('region', { name: m.title }));
    await user.click(again.getByRole('switch', { name: m.active }));
    expect(await screen.findByText(m.savedOff)).toBeInTheDocument();
    expect(screen.queryByText(t.maintenance.title)).not.toBeInTheDocument();
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
