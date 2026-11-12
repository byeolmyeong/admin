import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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

describe('감사 로그', () => {
  it('한 줄에 때(한국 시간)·누가·무엇을·대상·결과·자세히를 보여 준다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([updated, failedLogin, userRow]) });
    renderApp(tree, { route: '/audit-logs' });
    const all = await rows();
    expect(all).toHaveLength(4);

    const first = within(all[1] as HTMLElement);
    expect(first.getByText('2026-11-12 13:05')).toBeInTheDocument();
    expect(first.getByRole('button', { name: t.filterByActor('root-admin') })).toHaveTextContent('root-admin');
    expect(first.getByText(t.actions.INQUIRY_UPDATED)).toBeInTheDocument();
    expect(first.getByRole('link', { name: t.target(t.targets.INQUIRY, '7c1d2e3f') })).toHaveAttribute('href', `/inquiries/${inquiryId}`);
    expect(first.getByText(t.outcomes.SUCCESS)).not.toHaveClass('badge--danger');
    expect(first.getByText(chip('상태', '끝남'))).toBeInTheDocument();
    expect(first.getByText(chip('메모', '바뀜'))).toBeInTheDocument();

    const second = within(all[2] as HTMLElement);
    expect(second.getByText('2026-11-12 00:30')).toBeInTheDocument();
    expect(second.getByText(t.actorTypes.SYSTEM)).toBeInTheDocument();
    expect(second.queryByRole('button')).not.toBeInTheDocument();
    expect(second.getByText(t.actions.ADMIN_LOGIN)).toBeInTheDocument();
    expect(second.getByText(t.outcomes.FAILURE)).toHaveClass('badge--danger');
    expect(second.queryByRole('link')).not.toBeInTheDocument();

    // 보여 줄 때는 label, 거를 때는 ref
    const third = within(all[3] as HTMLElement);
    expect(third.getByRole('button', { name: t.filterByActor('사용자 0123') })).toBeInTheDocument();
    expect(third.getByText(t.target(t.targets.SYNASTRY, '5a5a5a5a'))).toBeInTheDocument();
    expect(third.queryByRole('link')).not.toBeInTheDocument();
    expect(third.getByText(chip('관계', '연애'))).toBeInTheDocument();

    expect(lastQuery(calls)).toBe('page=0&size=20');
    expect(screen.getByText(t.total(3))).toBeInTheDocument();
  });

  it('무엇을 남기는지 알린다: 누가 무엇을 언제만, 계정을 지워도 남는다', async () => {
    mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs' });
    expect(screen.getByText(t.note)).toBeInTheDocument();
    expect(t.note).toMatch(/누가 무엇을 언제/);
    expect(t.note).toMatch(/출생 정보/);
    expect(t.note).toMatch(/계정을 지워도/);
    await rows();
    expect(screen.getByText(strings.common.timeZoneNote)).toBeInTheDocument();
  });

  it('대상: 관리자는 관리자 목록, 자주 묻는 질문은 그 화면으로 잇고, 앱 설정은 글자로만 보인다', async () => {
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
    expect(third.getByText(chip('점검', '켬'))).toBeInTheDocument();
  });

  it('모르는 행동·대상·결과·detail 키는 받은 그대로 보여 준다', async () => {
    mockFetch({
      'GET /admin/me': me,
      [LIST]: page([auditLog({ action: 'COUPON_ISSUED', targetType: 'COUPON', targetId: 'c-1', outcome: 'PARTIAL', detail: { tier: 'GOLD' } })]),
    });
    renderApp(tree, { route: '/audit-logs' });
    const row = within((await rows())[1] as HTMLElement);
    expect(row.getByText('COUPON_ISSUED')).toBeInTheDocument();
    expect(row.getByText(t.target('COUPON', 'c-1'))).toBeInTheDocument();
    expect(row.getByText('PARTIAL')).toBeInTheDocument();
    expect(row.getByText(chip('tier', 'GOLD'))).toBeInTheDocument();
  });

  it('행동 고르기는 "관리자 행동"·"사용자 행동" 두 묶음이고 계약의 코드가 모두 있다', async () => {
    mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs' });
    const select = screen.getByLabelText(t.filterAction);
    const group = (name: string) => within(within(select).getByRole('group', { name })).getAllByRole('option') as HTMLOptionElement[];
    expect(group(t.actionGroups.admin).map((o) => o.value)).toEqual([...AUDIT_ADMIN_ACTIONS]);
    expect(group(t.actionGroups.user).map((o) => o.value)).toEqual([...AUDIT_USER_ACTIONS]);
    expect(group(t.actionGroups.user)[0]).toHaveTextContent(t.actions.USER_LOGIN);
    await rows();
  });

  it('누구·행동·날짜·계정으로 거르면 조건이 주소에 남고 그 조건으로 첫 쪽부터 다시 받는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([auditLog()], 41, 0) });
    const user = userEvent.setup();
    renderApp(tree, { route: '/audit-logs?page=1' });
    await rows();

    await user.selectOptions(screen.getByLabelText(t.filterActorType), 'ADMIN');
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&page=0&size=20');
    expect(where()).toBe('/audit-logs?actorType=ADMIN');

    await user.selectOptions(screen.getByLabelText(t.filterAction), 'INQUIRY_UPDATED');
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&action=INQUIRY_UPDATED&page=0&size=20');

    fireEvent.change(screen.getByLabelText(t.filterFrom), { target: { value: '2026-11-10' } });
    await rows();
    fireEvent.change(screen.getByLabelText(t.filterTo), { target: { value: '2026-11-12' } });
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&page=0&size=20');

    await user.type(screen.getByLabelText(t.filterActorRef), ' Root-Admin ');
    await user.click(screen.getByRole('button', { name: t.actorRefApply }));
    await rows();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&actorRef=Root-Admin&page=0&size=20');
    expect(where()).toBe('/audit-logs?actorType=ADMIN&action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&actorRef=Root-Admin');

    await user.selectOptions(screen.getByLabelText(t.filterActorType), '');
    await rows();
    await user.clear(screen.getByLabelText(t.filterActorRef));
    await user.click(screen.getByRole('button', { name: t.actorRefApply }));
    await rows();
    expect(lastQuery(calls)).toBe('action=INQUIRY_UPDATED&from=2026-11-10&to=2026-11-12&page=0&size=20');
  });

  it('주소의 조건으로 받고 칸에 그 값을 채운다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([userRow], 61, 2) });
    renderApp(tree, { route: '/audit-logs?actorType=USER&action=SYNASTRY_CREATED&from=2026-11-01&to=2026-11-12&actorRef=0123456789ab&page=2' });
    await rows();
    expect(lastQuery(calls)).toBe('actorType=USER&action=SYNASTRY_CREATED&from=2026-11-01&to=2026-11-12&actorRef=0123456789ab&page=2&size=20');
    expect(screen.getByLabelText(t.filterActorType)).toHaveValue('USER');
    expect(screen.getByLabelText(t.filterAction)).toHaveValue('SYNASTRY_CREATED');
    expect(screen.getByLabelText(t.filterFrom)).toHaveValue('2026-11-01');
    expect(screen.getByLabelText(t.filterTo)).toHaveValue('2026-11-12');
    expect(screen.getByLabelText(t.filterActorRef)).toHaveValue('0123456789ab');
    expect(screen.getByText(t.position(3, 4))).toBeInTheDocument();
  });

  it('주소의 틀린 값(소문자 · 모르는 행동 · 없는 날 · 음수 쪽)은 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page() });
    renderApp(tree, { route: '/audit-logs?actorType=admin&action=NOPE&from=2026-02-30&to=2026-11-1&actorRef=%20&page=-1' });
    await rows();
    expect(lastQuery(calls)).toBe('page=0&size=20');
  });

  it('줄의 "누가" 를 누르면 그 actor.ref 로 거른다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [LIST]: page([userRow], 41, 1) });
    renderApp(tree, { route: '/audit-logs?from=2026-11-01&page=1' });
    await rows();
    await userEvent.click(screen.getByRole('button', { name: t.filterByActor('사용자 0123') }));
    await rows();
    expect(lastQuery(calls)).toBe('from=2026-11-01&actorRef=0123456789ab&page=0&size=20');
    expect(where()).toBe('/audit-logs?from=2026-11-01&actorRef=0123456789ab');
    expect(screen.getByLabelText(t.filterActorRef)).toHaveValue('0123456789ab');
  });

  it('쪽을 넘긴다: 조건은 그대로 두고 처음·끝에서는 막는다', async () => {
    const { calls, routes } = mockFetch({ 'GET /admin/me': me, [LIST]: page([auditLog()], 41, 0) });
    renderApp(tree, { route: '/audit-logs?actorType=ADMIN' });
    expect(await screen.findByText(t.position(1, 3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.prev })).toBeDisabled();
    routes[LIST] = page([auditLog()], 41, 1);
    await userEvent.click(screen.getByRole('button', { name: t.next }));
    expect(await screen.findByText(t.position(2, 3))).toBeInTheDocument();
    expect(lastQuery(calls)).toBe('actorType=ADMIN&page=1&size=20');
    expect(where()).toBe('/audit-logs?actorType=ADMIN&page=1');
    routes[LIST] = page([auditLog()], 41, 2);
    await userEvent.click(screen.getByRole('button', { name: t.next }));
    expect(await screen.findByText(t.position(3, 3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.next })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.prev })).toBeEnabled();
  });

  it('비어 있으면 알리고, 마지막 쪽을 넘었으면 앞쪽으로 돌아갈 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, [LIST]: page([]) });
    const view = renderApp(tree, { route: '/audit-logs' });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    view.unmount();
    routes[LIST] = page([], 20, 1);
    renderApp(tree, { route: '/audit-logs?page=1' });
    expect(await screen.findByText(t.emptyPage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.prev })).toBeEnabled();
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
