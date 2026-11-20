import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import { AUDIT_ADMIN_ACTIONS, AUDIT_USER_ACTIONS } from '../../lib/api/types';
import type { AuditLog } from '../../lib/api/types';
import { admin, auditLog } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { MockRequest } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { AuditLogPage } from './AuditLogPage';

const t = strings.audit;
const chip = t.detail.chip;
const me = { status: 200, body: admin };
const LIST = 'GET /admin/audit-logs';
const page = (items: AuditLog[] = [auditLog()], total = items.length, pageNo = 0) => ({ status: 200, body: { items, page: pageNo, size: 20, total } });

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};
const tree = (
  <>
    <Routes>
      <Route path="/audit-logs" element={<AuditLogPage />} />
      <Route path="*" element={<p>다른 화면</p>} />
    </Routes>
    <Where />
  </>
);
const listCalls = (calls: MockRequest[]) => callsTo(calls, LIST);
const lastQuery = (calls: MockRequest[]) => listCalls(calls).at(-1)?.query.toString();
const rows = async () => within(await screen.findByRole('table', { name: t.listLabel })).getAllByRole('row');
const where = () => screen.getByTestId('where').textContent;

const inquiryId = '7c1d2e3f-0000-4000-8000-000000000001';
const updated = auditLog({
  id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  action: 'INQUIRY_UPDATED',
  targetType: 'INQUIRY',
  targetId: inquiryId,
  detail: { status: 'DONE', memoChanged: true },
});
const failedLogin = auditLog({
  id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  occurredAt: '2026-11-11T15:30:00Z',
  actorType: 'SYSTEM',
  actor: null,
  outcome: 'FAILURE',
});
const userRow = auditLog({
  id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  actorType: 'USER',
  actor: { ref: '0123456789ab', label: '사용자 0123' },
  action: 'SYNASTRY_CREATED',
  targetType: 'SYNASTRY',
  targetId: '5a5a5a5a-0000-4000-8000-000000000002',
  detail: { relation: 'LOVE' },
});

// 기간 고르기의 "오늘"(오늘 뒤 금지)을 고정한다. 타이머는 그대로 둔다.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const actorSeg = () => within(screen.getByRole('group', { name: t.actorTypeLabel }));

describe('감사 로그(D10)', () => {
  it('표: 일시(한국 시각) · 주체 · 계정 · 활동 · 내용(대상 · 자세히)', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([updated, failedLogin, userRow]) });
    renderApp(tree, { route: '/audit-logs' });
    const all = await rows();
    expect(all).toHaveLength(4);
    expect(within(all[0] as HTMLElement).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      t.columns.occurredAt,
      t.columns.actorType,
      t.columns.actor,
      t.columns.action,
      t.columns.detail,
    ]);

    const first = within(all[1] as HTMLElement);
    expect(first.getByText('2026.11.12 13:05:06')).toBeInTheDocument();
    expect(first.getByText(t.actorTypes.ADMIN)).toBeInTheDocument();
    expect(first.getByRole('button', { name: t.filterByActor('root-admin') })).toHaveTextContent('root-admin');
    expect(first.getByText(t.actions.INQUIRY_UPDATED)).toBeInTheDocument();
    expect(first.getByRole('link', { name: t.target(t.targets.INQUIRY, '7c1d2e3f') })).toHaveAttribute('href', `/inquiries/${inquiryId}`);
    expect(first.getByText(chip('상태', strings.inquiryStatus.DONE), { exact: false })).toBeInTheDocument();
    expect(first.queryByText(t.outcomes.FAILURE)).not.toBeInTheDocument();

    const second = within(all[2] as HTMLElement);
    expect(second.getByText('2026.11.12 00:30:00')).toBeInTheDocument();
    expect(second.getByText(t.actorTypes.SYSTEM)).toBeInTheDocument();
    expect(second.queryByRole('button')).not.toBeInTheDocument();
    expect(second.getByText(t.outcomes.FAILURE)).toBeInTheDocument();

    // 보여 줄 때는 label, 거를 때는 ref
    const third = within(all[3] as HTMLElement);
    expect(third.getByRole('button', { name: t.filterByActor('사용자 0123') })).toBeInTheDocument();
    expect(third.getByText(chip('관계', '연애'), { exact: false })).toBeInTheDocument();

    expect(lastQuery(calls)).toBe('from=2026-11-20&to=2026-11-20&page=0&size=20');
    expect(screen.getByText(t.range('오늘', 3, 1, 3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${t.dateLabel} · 오늘` })).toBeInTheDocument();
    expect(screen.getByText(t.headNote)).toBeInTheDocument();
  });

  it('대상: 관리자는 관리자 화면, 자주 묻는 질문은 그 화면으로 잇고, 앱 설정은 글자로만 보인다', async () => {
    mockFetch({
      'GET /admin/me': me,
      [LIST]: page([
        auditLog({ id: 'a1', action: 'ADMIN_CREATED', targetType: 'ADMIN', targetId: '22222222-2222-4222-8222-222222222222' }),
        auditLog({ id: 'a2', action: 'FAQ_DELETED', targetType: 'FAQ', targetId: 'ffffffff-ffff-4fff-8fff-fffffffffff1' }),
        auditLog({ id: 'a3', action: 'MAINTENANCE_UPDATED', targetType: 'APP_CONFIG', targetId: 'maintenance', detail: { active: true } }),
      ]),
    });
    renderApp(tree, { route: '/audit-logs' });
    const all = await rows();
    expect(within(all[1] as HTMLElement).getByRole('link', { name: t.target(t.targets.ADMIN, '22222222') })).toHaveAttribute('href', '/admins');
    expect(within(all[2] as HTMLElement).getByRole('link', { name: t.target(t.targets.FAQ, 'ffffffff') })).toHaveAttribute('href', '/faqs');
    const third = within(all[3] as HTMLElement);
    expect(third.getByText(t.target(t.targets.APP_CONFIG, 'maintena'))).toBeInTheDocument();
    expect(third.queryByRole('link')).not.toBeInTheDocument();
  });

  it('모르는 활동 · 대상 · 결과 · detail 키는 받은 그대로 보여 준다', async () => {
    mockFetch({
      'GET /admin/me': me,
      [LIST]: page([auditLog({ action: 'COUPON_ISSUED', targetType: 'COUPON', targetId: 'c-1', outcome: 'PARTIAL', detail: { tier: 'GOLD' } })]),
    });
    renderApp(tree, { route: '/audit-logs' });
    const row = within((await rows())[1] as HTMLElement);
    expect(row.getByText('COUPON_ISSUED')).toBeInTheDocument();
    expect(row.getByText(t.target('COUPON', 'c-1'), { exact: false })).toBeInTheDocument();
    expect(row.getByText('PARTIAL')).toBeInTheDocument();
    expect(row.getByText(chip('tier', 'GOLD'), { exact: false })).toBeInTheDocument();
  });

  it('활동 선택 메뉴에는 계약의 코드가 모두 있다(관리자 → 사용자 순)', async () => {
    mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs' });
    await rows();
    await userEvent.click(screen.getByRole('button', { name: t.actionLabel }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([t.all, ...[...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS].map((code) => t.actions[code])]);
  });

  it('주체 · 활동 · 날짜 · 계정으로 거르면 조건이 주소에 남고 1쪽부터 다시 받는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([auditLog()], 41, 0) });
    const user = userEvent.setup();
    renderApp(tree, { route: '/audit-logs?page=1' });
    await rows();

    await user.click(actorSeg().getByRole('button', { name: t.actorTypes.ADMIN }));
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&from=2026-11-20&to=2026-11-20&page=0&size=20');
    expect(where()).toBe('/audit-logs?actorType=ADMIN');

    await user.click(screen.getByRole('button', { name: t.actionLabel }));
    await user.click(screen.getByRole('option', { name: t.actions.INQUIRY_UPDATED }));
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-20&to=2026-11-20&page=0&size=20');

    await user.click(screen.getByRole('button', { name: `${t.dateLabel} · 오늘` }));
    await user.clear(screen.getByLabelText(strings.picker.start));
    await user.type(screen.getByLabelText(strings.picker.start), '2026.11.10');
    await user.clear(screen.getByLabelText(strings.picker.end));
    await user.type(screen.getByLabelText(strings.picker.end), '2026.11.12');
    await user.tab();
    await user.click(screen.getByRole('button', { name: strings.picker.apply }));
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&page=0&size=20');
    expect(screen.getByRole('button', { name: `${t.dateLabel} · 2026.11.10 ~ 11.12` })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: t.searchLabel }), ' 새벽별 ');
    await vi.waitFor(() => expect(lastQuery(calls)).toBe('q=%EC%83%88%EB%B2%BD%EB%B3%84&actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&page=0&size=20'));
  });

  it('한 계정을 찾을 때(찾기 · 활동 기록 링크)는 날짜를 오늘로 묶지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs?actorType=USER&actorRef=0123456789ab' });
    await rows();
    expect(lastQuery(calls)).toBe('actorType=USER&actorRef=0123456789ab&page=0&size=20');
    expect(screen.getByText(t.range(t.allDates, 1, 1, 1))).toBeInTheDocument();
  });

  it('주소의 조건으로 받고 버튼 · 칸에 그 값을 보인다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([userRow], 61, 2) });
    renderApp(tree, { route: '/audit-logs?actorType=USER&action=SYNASTRY_CREATED&from=2026-11-01&to=2026-11-12&actorRef=0123456789ab&page=2' });
    await rows();
    expect(lastQuery(calls)).toBe('actorType=USER&action=SYNASTRY_CREATED&from=2026-11-01&to=2026-11-12&actorRef=0123456789ab&page=2&size=20');
    expect(actorSeg().getByRole('button', { name: t.actorTypes.USER })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: `${t.actionLabel} · ${t.actions.SYNASTRY_CREATED}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${t.dateLabel} · 2026.11.01 ~ 11.12` })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: t.searchLabel })).toHaveValue('0123456789ab');
    expect(screen.getByRole('button', { name: strings.pager.page(3) })).toHaveAttribute('aria-current', 'page');
  });

  it('주소의 틀린 값(소문자 · 모르는 활동 · 없는 날 · 음수 쪽)은 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs?actorType=admin&action=NOPE&from=2026-02-30&to=2026-11-1&actorRef=%20&page=-1' });
    await rows();
    expect(lastQuery(calls)).toBe('from=2026-11-20&to=2026-11-20&page=0&size=20');
  });

  it('줄의 계정을 누르면 그 actor.ref 로 거른다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([userRow], 41, 1) });
    renderApp(tree, { route: '/audit-logs?from=2026-11-01&to=2026-11-20&page=1' });
    await rows();
    await userEvent.click(screen.getByRole('button', { name: t.filterByActor('사용자 0123') }));
    await rows();
    expect(lastQuery(calls)).toBe('from=2026-11-01&to=2026-11-20&actorRef=0123456789ab&page=0&size=20');
    expect(screen.getByRole('searchbox', { name: t.searchLabel })).toHaveValue('0123456789ab');
  });

  it('날짜를 고르지 않았으면 오늘 것만(D10 "날짜 · 오늘"), 처음부터 비면 안내만 · 거른 결과가 비면 초기화 버튼', async () => {
    const { routes, calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([]) });
    const view = renderApp(tree, { route: '/audit-logs' });
    expect(await screen.findByText(t.empty.title)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: strings.empty.reset })).not.toBeInTheDocument();
    view.unmount();
    routes[LIST] = page([]);
    renderApp(tree, { route: '/audit-logs?actorType=ADMIN' });
    expect(await screen.findByText(t.emptyFiltered.title)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: strings.empty.reset }));
    await vi.waitFor(() => expect(lastQuery(calls)).toBe('from=2026-11-20&to=2026-11-20&page=0&size=20'));
  });

  it.each([
    ['INVALID_ACTOR_TYPE', t.errors.INVALID_ACTOR_TYPE],
    ['INVALID_ACTION', t.errors.INVALID_ACTION],
    ['INVALID_DATE', t.errors.INVALID_DATE],
    ['INVALID_PAGE', t.errors.INVALID_PAGE],
  ])('%s 를 알리고 다시 시도할 수 있다', async (code, text) => {
    const { routes } = mockFetch({ 'GET /admin/me': me, [LIST]: { status: 400, body: { error: code } } });
    renderApp(tree, { route: '/audit-logs' });
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    routes[LIST] = page();
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
