import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import type { Inquiry } from '../../lib/api/types';
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

  it('작성자 줄: 서버가 owner 를 주면 닉네임 · 로그인 수단 · 기기 · 가입과 "사용자 상세 ›"', async () => {
    const owned = inquiry({ owner: { userId: 'u1', nickname: '새벽별', provider: 'KAKAO', platform: 'ios', appVersion: '1.0.2', joinedAt: '2026-11-08T05:20:05Z' } });
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: owned } });
    open();
    expect(await screen.findByText('새벽별')).toBeInTheDocument();
    // 데스크톱은 한 줄, 폰은 두 줄로 나뉜다(같은 글, 사이 " · " 는 폰에서 숨김)
    expect(screen.getByText('카카오 · iOS 1.0.2')).toBeInTheDocument();
    expect(screen.getByText('가입 2026.11.08 14:20:05')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.userDetail })).toHaveAttribute('href', '/users/u1');
  });

  it('사용자 구역을 숨긴 운영(VITE_HIDDEN_SECTIONS=users)에서는 작성자를 링크 없이 글로만', async () => {
    vi.stubEnv('VITE_HIDDEN_SECTIONS', 'users');
    const owned = inquiry({ owner: { userId: 'u1', nickname: '새벽별', provider: 'KAKAO', platform: 'ios', appVersion: '1.0.2', joinedAt: '2026-11-08T05:20:05Z' } });
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: owned } });
    open();
    expect(await screen.findByText('새벽별')).toBeInTheDocument();
    expect(screen.getByText('카카오 · iOS 1.0.2')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.userDetail })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.ownerActions })).not.toBeInTheDocument();
  });

  it('owner 가 아직 없으면(서버 S⑧ 전) 계정 코드와 "활동 기록 ›"(그 계정으로 거른 감사 로그)', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    open();
    expect(await screen.findByText('0123456789ab')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.ownerActions })).toHaveAttribute('href', '/audit-logs?actorType=USER&actorRef=0123456789ab');
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
  });

  it('답변 전송: 앞뒤 공백을 뗀 answer 만 보내고 "답변을 전송했습니다", 안내 문구가 있다', async () => {
    const answered = inquiry({ status: 'ANSWERED', answer: '확인해 주세요.', answeredAt: '2026-11-12T07:00:00Z', answeredBy: { id: admin.id, name: 'kim' } });
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 200, body: answered } });
    const user = userEvent.setup();
    open();
    expect(await screen.findByText(t.answerHelp)).toBeInTheDocument();
    const send = screen.getByRole('button', { name: t.send });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(t.answer), '  확인해 주세요.  ');
    await user.click(send);
    expect(await screen.findByRole('status')).toHaveTextContent(t.sent);
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ answer: '확인해 주세요.' });
    expect(screen.getByText(t.answered('kim', '2026.11.12 16:00:00'))).toBeInTheDocument();
    expect(screen.getAllByText(strings.inquiryStatus.ANSWERED).length).toBeGreaterThan(0);
  });

  it('임시 저장은 answerDraft 로 보낸다(알림 없음)', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 200, body: inquiry({ answerDraft: '초안' }) } });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.answer), '초안');
    await user.click(screen.getByRole('button', { name: t.draft }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.drafted);
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ answerDraft: '초안' });
  });

  it('답변 글자 수는 코드 포인트로 세고 2000자를 넘으면 보낼 수 없다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    open();
    const box = await screen.findByLabelText(t.answer);
    fireEvent.change(box, { target: { value: '😀'.repeat(2000) } });
    expect(screen.getByText(strings.common.counter(2000, 2000))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.send })).toBeEnabled();
    fireEvent.change(box, { target: { value: '😀'.repeat(2001) } });
    expect(screen.getByRole('button', { name: t.send })).toBeDisabled();
  });

  it('앱 미리보기: 내 문의와 적는 중인 답변을 보인다', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one } });
    const user = userEvent.setup();
    open();
    const preview = within(await screen.findByRole('region', { name: t.preview }));
    expect(preview.getByText(t.previewMine(strings.inquiries.categories.BUG))).toBeInTheDocument();
    expect(preview.getByText(t.previewEmpty)).toBeInTheDocument();
    await user.type(screen.getByLabelText(t.answer), '휴대폰 설정을 확인해 주세요.');
    expect(preview.getByText('휴대폰 설정을 확인해 주세요.')).toBeInTheDocument();
  });

  it('서버가 답변을 아직 못 받으면(INVALID_REQUEST) 알리고 적던 글은 그대로', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 400, body: { error: 'INVALID_REQUEST' } } });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.answer), '답');
    await user.click(screen.getByRole('button', { name: t.send }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.INVALID_REQUEST);
    expect(screen.getByLabelText(t.answer)).toHaveValue('답');
  });

  it('내부 메모는 칸을 떠날 때 바뀌었으면 앞뒤 공백을 떼고 저장한다(저장 버튼 없음)', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      [GET]: { status: 200, body: one },
      [PATCH]: (req) => ({ status: 200, body: inquiry({ memo: (req.body as { memo: string | null }).memo }) }),
    });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.memo), '  환불 문의로 넘김  ');
    await user.tab();
    expect(await screen.findByRole('status')).toHaveTextContent(t.memoSaved);
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ memo: '환불 문의로 넘김' });
    // 바뀌지 않았으면 다시 보내지 않는다
    await user.click(screen.getByLabelText(t.memo));
    await user.tab();
    expect(callsTo(calls, PATCH)).toHaveLength(1);
  });

  /** 서버처럼 받은 차례대로 바꾸고, 그때의 문의를 돌려준다(늦게 닿을 수 있다). */
  const serverInquiry = (hold?: { memo?: Promise<void> }) => {
    let current: Inquiry = one;
    return (req: { body: unknown }) => {
      const change = req.body as { memo?: string | null; answer?: string };
      if ('memo' in change) current = { ...current, memo: change.memo ?? null };
      if (change.answer !== undefined)
        current = { ...current, status: 'ANSWERED', answer: change.answer, answerDraft: null, answeredAt: '2026-11-12T07:00:00Z', answeredBy: { id: admin.id, name: 'kim' } };
      const snapshot = current;
      const wait = 'memo' in change && hold?.memo ? hold.memo : Promise.resolve();
      return wait.then(() => ({ status: 200, body: snapshot }));
    };
  };

  it('메모를 고친 채 바로 "보내기" 를 눌러도 메모 저장이 버튼을 막지 않고 답변이 전송된다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: serverInquiry() });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.answer), '확인해 주세요.');
    await user.type(screen.getByLabelText(t.memo), '환불 문의');
    // 메모 칸에서 바로 보내기를 누른다: 칸을 떠나며 메모 저장이 먼저 나간다
    await user.click(screen.getByRole('button', { name: t.send }));
    expect(await screen.findByText(t.answered('kim', '2026.11.12 16:00:00'))).toBeInTheDocument();
    expect(callsTo(calls, PATCH).map((c) => c.body)).toEqual([{ memo: '환불 문의' }, { answer: '확인해 주세요.' }]);
    expect(screen.getByLabelText(t.memo)).toHaveValue('환불 문의');
  });

  it('메모를 고친 채 바로 "임시 저장" 을 눌러도 임시 저장이 나간다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: serverInquiry() });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.answer), '초안');
    await user.type(screen.getByLabelText(t.memo), '메모');
    await user.click(screen.getByRole('button', { name: t.draft }));
    await vi.waitFor(() => expect(callsTo(calls, PATCH).map((c) => c.body)).toEqual([{ memo: '메모' }, { answerDraft: '초안' }]));
  });

  it('메모 저장의 답이 늦게 와도 먼저 받은 답변 전송 결과를 되돌리지 않는다', async () => {
    let release: () => void = () => undefined;
    const memoHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: serverInquiry({ memo: memoHeld }) });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.answer), '확인해 주세요.');
    await user.type(screen.getByLabelText(t.memo), '환불 문의');
    await user.click(screen.getByRole('button', { name: t.send }));
    release();
    expect(await screen.findByText(t.answered('kim', '2026.11.12 16:00:00'))).toBeInTheDocument();
    await vi.waitFor(() => expect(callsTo(calls, PATCH)).toHaveLength(2));
    // 모든 답이 닿은 뒤에도 답변 완료 그대로(늦은 메모 답의 "답변 대기" 로 덮이지 않는다)
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByText(t.answered('kim', '2026.11.12 16:00:00'))).toBeInTheDocument();
    expect(screen.queryByText(strings.inquiryStatus.NEW)).not.toBeInTheDocument();
  });

  it('메모를 비우고 떠나면 null 로 지운다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: inquiry({ memo: '예전 메모' }) }, [PATCH]: { status: 200, body: inquiry({ memo: null }) } });
    const user = userEvent.setup();
    open();
    await user.clear(await screen.findByLabelText(t.memo));
    await user.tab();
    await screen.findByRole('status');
    expect(callsTo(calls, PATCH)[0]?.body).toEqual({ memo: null });
  });

  it('메모 저장이 거절되면(INVALID_MEMO) 알리고 글은 그대로', async () => {
    mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: one }, [PATCH]: { status: 400, body: { error: 'INVALID_MEMO' } } });
    const user = userEvent.setup();
    open();
    await user.type(await screen.findByLabelText(t.memo), '메모');
    await user.tab();
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
    await user.type(await screen.findByLabelText(t.answer), '답');
    await user.click(screen.getByRole('button', { name: t.send }));
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
