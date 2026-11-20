import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin, inquiry } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { InquiryDetailPage } from './InquiryDetailPage';

const t = strings.inquiries.detail;
const me = { status: 200, body: admin };
const one = inquiry();
const GET = `GET /admin/inquiries/${one.id}`;
const PATCH = `PATCH /admin/inquiries/${one.id}`;
const tree = (
  <Routes>
    <Route path="/inquiries" element={<p>목록 화면</p>} />
    <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
  </Routes>
);
const open = () => renderApp(tree, { route: `/inquiries/${one.id}` });
const statusButton = () => screen.getByRole('button', { name: new RegExp(`^${t.status}`) });

describe('문의 상세(D3)', () => {
  it('머리는 "‹ 문의" 하나(목록으로), 종류 · 상태 · 접수 일시를 위에 보인다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    open();
    const back = await screen.findByRole('link', { name: strings.inquiries.title });
    expect(back).toHaveAttribute('href', '/inquiries');
    expect(screen.getByRole('heading', { level: 1, name: strings.inquiries.title })).toBeInTheDocument();
    expect(screen.getByText(strings.inquiries.categories.BUG)).toBeInTheDocument();
    expect(screen.getAllByText(strings.inquiryStatus.NEW).length).toBeGreaterThan(0);
    expect(screen.getByText('2026.11.12 13:05:06')).toBeInTheDocument();
  });

  it('글 전체를 줄바꿈 그대로, 글자로만 보여 준다(HTML 로 해석하지 않는다)', async () => {
    const body = '첫 줄\n<img src=x onerror="alert(1)"><b>굵게</b>\n\n끝';
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: inquiry({ body }) } });
    const { container } = open();
    const text = await screen.findByLabelText(t.body);
    expect(text.textContent).toBe(body);
    expect(text).toHaveClass('prewrap');
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('작성자 코드와 "활동 기록 ›"(그 계정으로 거른 감사 로그)', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    open();
    expect(await screen.findByText('0123456789ab')).toBeInTheDocument();
    expect(screen.getByText(t.ownerHelp)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(t.ownerActions) })).toHaveAttribute('href', '/audit-logs?actorType=USER&actorRef=0123456789ab');
  });

  it('옛 문의의 답장 이메일: 복사 · 메일 쓰기와 안내', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    const user = userEvent.setup();
    open();
    expect(await screen.findByRole('link', { name: t.mailto })).toHaveAttribute('href', 'mailto:user@example.com');
    expect(screen.getByText(t.mailNote)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.copy }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.copied);
    expect(await navigator.clipboard.readText()).toBe('user@example.com');
  });

  it('이메일이 없는 문의(1.0.0 앱 안 문의)는 답장 이메일 줄이 없다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: inquiry({ replyEmail: null }) } });
    open();
    await screen.findByLabelText(t.body);
    expect(screen.queryByText(t.replyEmail)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.mailto })).not.toBeInTheDocument();
  });

  it('처리 상태를 바꾸면 status 만 보내고, 짧은 알림과 마지막 처리를 보인다', async () => {
    const changed = inquiry({ status: 'IN_PROGRESS', handledBy: { id: admin.id, name: '김관리' }, handledAt: '2026-11-12T06:00:00Z' });
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 200, body: changed } });
    const user = userEvent.setup();
    open();
    expect(await screen.findByText(t.notHandled)).toBeInTheDocument();
    await user.click(statusButton());
    await user.click(screen.getByRole('option', { name: strings.inquiryStatus.IN_PROGRESS }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.statusSaved);
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ status: 'IN_PROGRESS' });
    expect(statusButton()).toHaveTextContent(strings.inquiryStatus.IN_PROGRESS);
    expect(screen.getByText(t.handled('김관리', '2026.11.12 15:00:00'))).toBeInTheDocument();
  });

  it('내부 메모를 저장하면 앞뒤 공백을 뗀 memo 만 보내고 "저장했습니다"', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      [GET]: { status: 200, body: one },
      [PATCH]: (req) => ({ status: 200, body: inquiry({ memo: (req.body as { memo: string | null }).memo }) }),
    });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.memo), '  환불 문의로 넘김  ');
    await user.click(screen.getByRole('button', { name: t.memoSave }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.memoSaved);
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ memo: '환불 문의로 넘김' });
    expect(screen.getByLabelText(t.memo)).toHaveValue('환불 문의로 넘김');
  });

  it('메모를 비우고 저장하면 null 을 보내 지운다', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      [GET]: { status: 200, body: inquiry({ memo: '예전 메모' }) },
      [PATCH]: { status: 200, body: inquiry({ memo: null }) },
    });
    const user = userEvent.setup();
    open();
    const memo = await screen.findByLabelText(t.memo);
    expect(memo).toHaveValue('예전 메모');
    await user.clear(memo);
    await user.click(screen.getByRole('button', { name: t.memoSave }));
    await screen.findByRole('status');
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ memo: null });
  });

  it('메모 글자 수는 코드 포인트로 세고 2000자를 넘으면 저장을 막는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    open();
    const memo = await screen.findByLabelText(t.memo);
    fireEvent.change(memo, { target: { value: '😀'.repeat(2000) } });
    expect(screen.getByText(strings.common.counter(2000, 2000))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.memoSave })).toBeEnabled();
    fireEvent.change(memo, { target: { value: '😀'.repeat(2001) } });
    expect(screen.getByRole('button', { name: t.memoSave })).toBeDisabled();
    expect(callsTo(calls, PATCH)).toHaveLength(0);
  });

  it('저장에 실패하면 짧은 알림(5초)으로 까닭을 알리고 적던 글은 그대로 둔다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 400, body: { error: 'INVALID_MEMO' } } });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.memo), '메모');
    await user.click(screen.getByRole('button', { name: t.memoSave }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.INVALID_MEMO);
    expect(screen.getByLabelText(t.memo)).toHaveValue('메모');
  });

  it('없는 문의(NOT_FOUND)는 계정과 함께 삭제됐을 수 있다고 알리고 목록으로 돌아간다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 404, body: { error: 'NOT_FOUND' } } });
    open();
    expect(await screen.findByText(t.gone)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: strings.inquiries.title }));
    expect(screen.getByText('목록 화면')).toBeInTheDocument();
  });

  it('고치는 사이에 삭제됐으면(NOT_FOUND) 같은 안내로 바꾼다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 404, body: { error: 'NOT_FOUND' } } });
    const user = userEvent.setup();
    open();
    await screen.findByLabelText(t.memo);
    await user.click(statusButton());
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: strings.inquiryStatus.DONE }));
    expect(await screen.findByText(t.gone)).toBeInTheDocument();
    expect(screen.queryByLabelText(t.memo)).not.toBeInTheDocument();
  });

  it('다른 오류는 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 500, body: { error: 'X' } } });
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes[GET] = { status: 200, body: one };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByLabelText(t.body)).toBeInTheDocument();
  });

  it('목록에서 들고 온 조건으로 돌아간다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    renderApp(
      <Routes>
        <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
      </Routes>,
      { route: `/inquiries/${one.id}` },
    );
    expect(await screen.findByRole('link', { name: strings.inquiries.title })).toHaveAttribute('href', '/inquiries');
  });
});
