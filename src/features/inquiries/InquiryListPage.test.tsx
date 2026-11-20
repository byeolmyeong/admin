import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import { admin, inquiry } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { MockRequest } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { InquiryListPage } from './InquiryListPage';

const t = strings.inquiries;
const me = { status: 200, body: admin };
const page = (items = [inquiry()], total = items.length, pageNo = 0, size = 20) => ({ status: 200, body: { items, page: pageNo, size, total } });

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
const segments = () => within(screen.getByRole('group', { name: t.segmentsLabel }));

afterEach(() => vi.unstubAllGlobals());

describe('문의 목록(D2)', () => {
  it('표: 종류 · 내용 · 작성자 · 접수 일시 · 상태 · 처리자, 날짜는 2026.11.12 13:05:06', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/inquiries': page([
        inquiry(),
        inquiry({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', category: 'ACCOUNT', status: 'DONE', handledBy: { id: admin.id, name: '김관리' }, handledAt: '2026-11-12T05:00:00Z' }),
      ]),
    });
    renderApp(tree, { route: '/inquiries' });
    const table = await screen.findByRole('table', { name: t.listLabel });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      t.columns.category,
      t.columns.body,
      t.columns.owner,
      t.columns.createdAt,
      t.columns.status,
      t.columns.handler,
    ]);
    const [, first, second] = within(table).getAllByRole('row').map((r) => within(r));
    expect(first?.getByText(t.categories.BUG)).toBeInTheDocument();
    expect(first?.getByText(strings.inquiryStatus.NEW)).toBeInTheDocument();
    expect(first?.getByRole('link', { name: '리포트가 열리지 않아요. 두 번째 줄입니다.' })).toHaveAttribute('href', `/inquiries/${inquiry().id}`);
    expect(first?.getByText('2026.11.12 13:05:06')).toBeInTheDocument();
    expect(first?.getByText('0123456789ab')).toBeInTheDocument();
    expect(first?.getByText(t.none)).toBeInTheDocument();
    expect(second?.getByText(strings.inquiryStatus.DONE)).toBeInTheDocument();
    expect(second?.getByText('김관리')).toBeInTheDocument();
    expect(listCalls(calls)[0]?.query.toString()).toBe('page=0&size=20');
    expect(screen.getByText(strings.pager.range(2, 1, 2))).toBeInTheDocument();
  });

  it('줄 어디를 눌러도 상세로 가고, 지금 조건을 들고 간다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page() });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries?category=BUG' });
    await user.click(await screen.findByText('0123456789ab'));
    expect(screen.getByTestId('where')).toHaveTextContent(`/inquiries/${inquiry().id}`);
  });

  it('칸: 답변 대기(새 문의) · 답변 완료 · 전체 — 바꾸면 그 조건으로 1쪽부터', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry()], 45) });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries?page=2' });
    await screen.findByRole('table');
    expect(segments().getByRole('button', { name: t.segments.all })).toHaveAttribute('aria-pressed', 'true');
    await user.click(segments().getByRole('button', { name: t.segments.waiting(null) }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('status=NEW&page=0&size=20');
    await user.click(segments().getByRole('button', { name: t.segments.answered }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('status=DONE&page=0&size=20');
    expect(screen.getByTestId('where')).toHaveTextContent('/inquiries?status=DONE');
  });

  it('종류 칩: 고르면 그 종류만, 1쪽부터', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page() });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries?page=1' });
    await screen.findByRole('table');
    const chips = within(screen.getByRole('group', { name: t.categoryLabel }));
    expect(chips.getByRole('button', { name: t.allCategories })).toHaveAttribute('aria-pressed', 'true');
    await user.click(chips.getByRole('button', { name: t.categories.BUG }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('category=BUG&page=0&size=20');
    expect(chips.getByRole('button', { name: t.categories.BUG })).toHaveAttribute('aria-pressed', 'true');
  });

  it('폰: 종류는 선택 메뉴(아래 시트), 목록은 카드', async () => {
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q.includes('639'), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page() });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries' });
    const list = await screen.findByRole('list', { name: t.listLabel });
    expect(within(list).getByRole('link')).toHaveAttribute('href', `/inquiries/${inquiry().id}`);
    await user.click(screen.getByRole('button', { name: t.allCategories }));
    await user.click(within(screen.getByRole('dialog')).getByRole('option', { name: t.categories.ACCOUNT }));
    expect(listCalls(calls).at(-1)?.query.get('category')).toBe('ACCOUNT');
  });

  it('페이지 번호와 "20개씩": 쪽을 넘기면 그 쪽, 개수를 바꾸면 1쪽', async () => {
    const { calls, routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([inquiry()], 45) });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries' });
    await screen.findByRole('table');
    const pager = within(screen.getByRole('navigation', { name: strings.pager.label }));
    routes['GET /admin/inquiries'] = page([inquiry()], 45, 2);
    await user.click(pager.getByRole('button', { name: strings.pager.page(3) }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('page=2&size=20');
    routes['GET /admin/inquiries'] = page([inquiry()], 45, 0, 50);
    await user.click(screen.getByRole('button', { name: strings.pager.sizeLabel }));
    await user.click(screen.getByRole('option', { name: strings.pager.size(50) }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('page=0&size=50');
  });

  it('주소의 틀린 상태 · 종류 · 쪽 값은 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page() });
    renderApp(tree, { route: '/inquiries?status=new&category=X&page=abc&size=7' });
    await screen.findByRole('table');
    expect(listCalls(calls)[0]?.query.toString()).toBe('page=0&size=20');
  });

  it('처음부터 비면 안내만(D25)', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([], 0) });
    renderApp(tree, { route: '/inquiries?status=NEW' });
    expect(await screen.findByText(t.empty.waiting.title)).toBeInTheDocument();
    expect(screen.getByText(t.empty.waiting.body)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: strings.empty.reset })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('종류로 거른 결과가 비면 "검색 · 필터 초기화"', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([], 0) });
    const user = userEvent.setup();
    renderApp(tree, { route: '/inquiries?status=NEW&category=BUG' });
    expect(await screen.findByText(t.empty.filtered.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: strings.empty.reset }));
    expect(listCalls(calls).at(-1)?.query.toString()).toBe('page=0&size=20');
  });

  it('마지막 쪽을 넘었으면 알리고 페이지 번호로 돌아갈 수 있다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/inquiries': page([], 3, 5) });
    renderApp(tree, { route: '/inquiries?page=5' });
    expect(await screen.findByText(t.empty.page.title)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: strings.pager.label })).toBeInTheDocument();
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
