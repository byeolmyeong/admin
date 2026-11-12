import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin, inquiry } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { MockRequest } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { InquiryListPage } from './InquiryListPage';

const t = strings.inquiries;
const me = { status: 200, body: admin };
const page = (items = [inquiry()], total = items.length, pageNo = 0) => ({ status: 200, body: { items, page: pageNo, size: 20, total } });

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};
const tree = (
  <>
    <Routes>
      <Route path="/inquiries" element={<InquiryListPage />} />
      <Route path="/inquiries/:id" element={<p>상세</p>} />
    </Routes>
    <Where />
  </>
);
const listCalls = (calls: MockRequest[]) => callsTo(calls, 'GET /admin/inquiries');

describe('문의 목록', () => {
  it('한 줄에 종류·상태·한 줄 요약·보낸 때·처리한 관리자를 보여 준다', async () => {
    const handled = inquiry({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      category: 'ACCOUNT',
      status: 'DONE',
      body: '계정을 옮기고 싶어요',
      handledBy: { id: admin.id, name: '김관리' },
      handledAt: '2026-11-12T06:00:00Z',
    });
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry(), handled]) });
    renderApp(tree, { route: '/inquiries' });

    const rows = within(await screen.findByRole('table', { name: t.listLabel })).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const first = within(rows[1] as HTMLElement);
    expect(first.getByText(t.categories.BUG)).toBeInTheDocument();
    expect(first.getByText(strings.inquiryStatus.NEW)).toBeInTheDocument();
    expect(first.getByRole('link', { name: '리포트가 열리지 않아요. 두 번째 줄입니다.' })).toHaveAttribute(
      'href',
      `/inquiries/${inquiry().id}`,
    );
    expect(first.getByText('2026-11-12 13:05')).toBeInTheDocument();
    expect(first.getByText(t.notHandled)).toBeInTheDocument();
    expect(first.getByText('0123456789ab')).toBeInTheDocument();
    const second = within(rows[2] as HTMLElement);
    expect(second.getByText(t.categories.ACCOUNT)).toBeInTheDocument();
    expect(second.getByText(strings.inquiryStatus.DONE)).toBeInTheDocument();
    expect(second.getByText('김관리')).toBeInTheDocument();

    expect(listCalls(calls)[0]?.query.toString()).toBe('page=0&size=20');
    expect(screen.getByText(t.total(2))).toBeInTheDocument();
  });

  it('긴 글은 잘라서 한 줄로 보여 준다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry({ body: '가'.repeat(200) })]) });
    renderApp(tree, { route: '/inquiries' });
    expect(await screen.findByRole('link', { name: `${'가'.repeat(80)}…` })).toBeInTheDocument();
  });

  it('상태·종류로 거르면 그 조건으로 첫 쪽부터 다시 받는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry()], 41, 0) });
    renderApp(tree, { route: '/inquiries?page=1' });
    await screen.findByRole('table');
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(t.filterStatus), 'IN_PROGRESS');
    await screen.findByRole('table');
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('status=IN_PROGRESS&page=0&size=20');
    await user.selectOptions(screen.getByLabelText(t.filterCategory), 'BUG');
    await screen.findByRole('table');
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('status=IN_PROGRESS&category=BUG&page=0&size=20');
    expect(screen.getByTestId('where')).toHaveTextContent('/inquiries?status=IN_PROGRESS&category=BUG');
    await user.selectOptions(screen.getByLabelText(t.filterStatus), '');
    await screen.findByRole('table');
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('category=BUG&page=0&size=20');
  });

  it('쪽을 넘긴다: total 과 size 로 쪽 수를 세고 처음·끝에서는 막는다', async () => {
    const { calls, routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry()], 41, 0) });
    renderApp(tree, { route: '/inquiries' });
    expect(await screen.findByText(t.position(1, 3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.prev })).toBeDisabled();
    routes['GET /admin/inquiries'] = page([inquiry()], 41, 1);
    await userEvent.click(screen.getByRole('button', { name: t.next }));
    expect(await screen.findByText(t.position(2, 3))).toBeInTheDocument();
    expect(listCalls(calls).at(-1)?.query.get('page')).toBe('1');
    routes['GET /admin/inquiries'] = page([inquiry()], 41, 2);
    await userEvent.click(screen.getByRole('button', { name: t.next }));
    expect(await screen.findByText(t.position(3, 3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.next })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.prev })).toBeEnabled();
  });

  it('주소의 틀린 상태·쪽 값은 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page() });
    renderApp(tree, { route: '/inquiries?status=new&page=-3' });
    await screen.findByRole('table');
    expect(listCalls(calls)[0]?.query.toString()).toBe('page=0&size=20');
  });

  it('비어 있으면 알린다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([]) });
    renderApp(tree, { route: '/inquiries' });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('마지막 쪽을 넘었으면 앞쪽으로 돌아갈 수 있다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([], 20, 1) });
    renderApp(tree, { route: '/inquiries?page=1' });
    expect(await screen.findByText(t.emptyPage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.prev })).toBeEnabled();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': { status: 400, body: { error: 'INVALID_PAGE' } } });
    renderApp(tree, { route: '/inquiries' });
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.INVALID_PAGE);
    routes['GET /admin/inquiries'] = page();
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
