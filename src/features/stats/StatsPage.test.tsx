import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin, inquiry, stats } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { StatsPage } from './StatsPage';

const t = strings.stats;
const me = { status: 200, body: admin };
const card = (name: string) => within(screen.getByRole('region', { name }));
const waiting = { status: 200, body: { items: [inquiry()], page: 0, size: 3, total: 1 } };

describe('현황(D1 — 지금 계약의 수치를 새 카드로)', () => {
  it('카드 넷: 가입자 · 별명 생성 · 출생 정보 등록 · 답변 대기 문의', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.kpi.accounts });
    expect(card(t.kpi.accounts).getByText('120')).toBeInTheDocument();
    expect(card(t.kpi.accounts).getByText(t.accountsSub(7, 30))).toBeInTheDocument();
    expect(card(t.kpi.nicknames).getByText('88')).toBeInTheDocument();
    expect(card(t.kpi.nicknames).getByText(t.ratioSub(73))).toBeInTheDocument();
    expect(card(t.kpi.profiles).getByText('101')).toBeInTheDocument();
    expect(card(t.kpi.profiles).getByText(t.ratioSub(84))).toBeInTheDocument();
    expect(card(t.kpi.waiting).getByText('3')).toBeInTheDocument();
    expect(card(t.kpi.waiting).getByText(t.waitingSub(2, 1))).toBeInTheDocument();
  });

  it('1.0.0 에서 빠진 옛 지표(심층 리포트 · 궁합 · 방향성)는 보이지 않는다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.kpi.accounts });
    expect(screen.queryByText(/심층 리포트|궁합|방향성/)).not.toBeInTheDocument();
  });

  it('가입자가 0 이면 비율은 0%', async () => {
    const zero = stats({ accounts: { total: 0, last7Days: 0, last30Days: 0 }, readings: { total: 0 }, profiles: { total: 0 } });
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: zero }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.kpi.nicknames });
    expect(card(t.kpi.nicknames).getByText(t.ratioSub(0))).toBeInTheDocument();
  });

  it('머리에 센 때(한국 시각)와 새로 고침 · 아래에 안내', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    expect(await screen.findByText(t.generatedAt('2026.11.12 13:05:06'))).toBeInTheDocument();
    expect(screen.getByText(t.note)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.refresh }));
    await screen.findByRole('region', { name: t.kpi.accounts });
    expect(callsTo(calls, 'GET /admin/stats')).toHaveLength(2);
  });

  it('답변 대기 문의 셋: 새 문의 조건으로 받아 상세로 잇고, "전체" 는 답변 대기 목록', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    const list = await screen.findByRole('table', { name: t.waitingListLabel });
    expect(within(list).getByRole('link', { name: '리포트가 열리지 않아요. 두 번째 줄입니다.' })).toHaveAttribute('href', `/inquiries/${inquiry().id}`);
    expect(within(list).getByText('2026.11.12 13:05:06')).toBeInTheDocument();
    expect(callsTo(calls, 'GET /admin/inquiries')[0]?.query.toString()).toBe('status=NEW&page=0&size=3');
    expect(screen.getByRole('link', { name: t.waitingAll })).toHaveAttribute('href', '/inquiries?status=NEW');
  });

  it('답변 대기 문의가 없으면 한 줄로 알린다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() }, 'GET /admin/inquiries': { status: 200, body: { items: [], page: 0, size: 3, total: 0 } } });
    renderApp(<StatsPage />);
    expect(await screen.findByText(t.waitingEmpty)).toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 500, body: { error: 'X' } }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/stats'] = { status: 200, body: stats() };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('region', { name: t.kpi.accounts })).toBeInTheDocument();
  });

  it('모양이 틀린 응답은 숫자를 그리지 않는다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: { generatedAt: 'x' } }, 'GET /admin/inquiries': waiting });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.INVALID_RESPONSE);
    expect(screen.queryByRole('region', { name: t.kpi.accounts })).not.toBeInTheDocument();
  });
});
