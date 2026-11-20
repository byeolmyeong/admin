import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../../content/strings';
import { admin } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { Route } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { PushPage } from './PushPage';

const t = strings.push;
const ok = { canSend: true, reason: null, sentTodayAt: null, sentTodayBy: null, nextAvailableAt: null };
const history = { items: [{ id: 'p0', sentAt: '2026-11-15T09:00:00Z', title: '오늘의 하늘이 생겼어요', recipients: 198, succeeded: 196, failed: 2, sentBy: 'kim' }], page: 0, size: 10, total: 1 };
const server = (over: Record<string, Route> = {}) =>
  mockFetch({
    'GET /admin/me': { status: 200, body: admin },
    'GET /admin/push/audience': { status: 200, body: { count: 211 } },
    'GET /admin/push/status': { status: 200, body: ok },
    'GET /admin/push/events': { status: 200, body: history },
    'POST /admin/push/events': { status: 202, body: { id: 'p1', recipients: 211 } },
    ...over,
  });
const fill = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(t.titleLabel), '새 기능: 이번 달 눈여겨볼 날');
  await user.type(screen.getByLabelText(t.bodyLabel), '이번 달에 마음이 가는 날을 시기 탭에서 확인해 보세요.');
  return user;
};

afterEach(() => vi.useRealTimers());

describe('푸시 발송(D7 · D14 · D28)', () => {
  it('발송 대상 수 · 기기 미리보기((광고) 자동 표기) · 발송 내역', async () => {
    server();
    renderApp(<PushPage />);
    expect(await screen.findByText(t.audience('211'))).toBeInTheDocument();
    expect(screen.getByText(t.previewNote)).toBeInTheDocument();
    expect(await screen.findByText('오늘의 하늘이 생겼어요')).toBeInTheDocument();
    expect(screen.getByText(t.result('196', '2'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.send('211') })).toBeDisabled();
  });

  it('제목 · 본문을 쓰면 켜지고, 확인 창(미리보기 · 수신 거부 · 대상)에서 발송하면 세 키를 보낸다', async () => {
    const { calls } = server();
    renderApp(<PushPage />);
    await screen.findByText(t.audience('211'));
    const user = await fill();
    const preview = within(screen.getByRole('region', { name: t.preview }));
    expect(preview.getByText(`${t.adPrefix}새 기능: 이번 달 눈여겨볼 날`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.target }));
    await user.click(screen.getByRole('option', { name: t.targets.TIMING_MONTH }));
    await user.click(screen.getByRole('button', { name: t.send('211') }));
    const dialog = within(screen.getByRole('alertdialog', { name: t.confirmTitle }));
    expect(dialog.getByText(t.optOut)).toBeInTheDocument();
    expect(dialog.getByText(t.confirmNote('211'))).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: t.confirm }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.sent('211'));
    expect(callsTo(calls, 'POST /admin/push/events')[0]?.body).toEqual({ title: '새 기능: 이번 달 눈여겨볼 날', body: '이번 달에 마음이 가는 날을 시기 탭에서 확인해 보세요.', target: 'TIMING_MONTH' });
  });

  it('오늘 이미 보냈으면(D28) 까닭 · 다음 가능 시각을 보이고 버튼이 흐리다', async () => {
    server({ 'GET /admin/push/status': { status: 200, body: { canSend: false, reason: 'DAILY_LIMIT', sentTodayAt: '2026-11-20T01:00:00Z', sentTodayBy: 'kim', nextAvailableAt: '2026-11-20T23:00:00Z' } } });
    renderApp(<PushPage />);
    expect(await screen.findByText(t.blockedToday('2026.11.20 10:00:00', 'kim', '2026.11.21 08:00:00'))).toBeInTheDocument();
    expect(screen.getByText(t.dailyNote(true))).toBeInTheDocument();
    await fill();
    expect(screen.getByRole('button', { name: t.send('211') })).toBeDisabled();
  });

  it('서버 상태가 아직 없으면 화면이 야간(21:00 ~ 08:00)을 보고 막는다(D28-1)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T13:30:00Z')); // 한국 22:30
    server({ 'GET /admin/push/status': { status: 404, body: { error: 'NOT_FOUND' } }, 'GET /admin/push/audience': { status: 404, body: { error: 'NOT_FOUND' } } });
    renderApp(<PushPage />);
    expect(await screen.findByText(t.blockedNight('2026.11.21 08:00:00'))).toBeInTheDocument();
    expect(screen.getByText(t.audience(t.none))).toBeInTheDocument();
  });

  it('서버가 QUIET_HOURS 로 거절하면 알리고 적던 글은 그대로', async () => {
    server({ 'POST /admin/push/events': { status: 409, body: { error: 'QUIET_HOURS' } } });
    renderApp(<PushPage />);
    await screen.findByText(t.audience('211'));
    const user = await fill();
    await user.click(screen.getByRole('button', { name: t.send('211') }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.confirm }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.QUIET_HOURS);
    expect(screen.getByLabelText(t.titleLabel)).toHaveValue('새 기능: 이번 달 눈여겨볼 날');
  });
});
