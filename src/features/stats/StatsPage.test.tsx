import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin, stats } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { StatsPage } from './StatsPage';

const t = strings.stats;
const me = { status: 200, body: admin };
const tile = (name: string) => within(screen.getByRole('region', { name }));

describe('현황', () => {
  it('모든 묶음의 숫자를 보여 준다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() } });
    renderApp(<StatsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(strings.common.loading);
    expect(await screen.findByRole('region', { name: t.groups.accounts })).toBeInTheDocument();

    expect(tile(t.groups.accounts).getByText('120')).toBeInTheDocument();
    expect(tile(t.groups.accounts).getByText(t.last7Days).nextSibling).toHaveTextContent('7');
    expect(tile(t.groups.accounts).getByText(t.last30Days).nextSibling).toHaveTextContent('30');
    expect(tile(t.groups.profiles).getByText('101')).toBeInTheDocument();
    expect(tile(t.groups.readings).getByText('88')).toBeInTheDocument();
    expect(tile(t.groups.reports).getByText('45')).toBeInTheDocument();
    expect(tile(t.groups.reports).getByText(t.reportStatus.DONE).nextSibling).toHaveTextContent('40');
    expect(tile(t.groups.reports).getByText(t.reportStatus.WRITING).nextSibling).toHaveTextContent('3');
    expect(tile(t.groups.reports).getByText(t.reportStatus.FAILED).nextSibling).toHaveTextContent('2');
    expect(tile(t.groups.synastries).getByText('33')).toBeInTheDocument();
    expect(tile(t.groups.synastryReports).getByText('12')).toBeInTheDocument();
    expect(tile(t.groups.synastryReports).getByText(t.reportStatus.DONE).nextSibling).toHaveTextContent('10');
    expect(tile(t.groups.directions).getByText(t.topics.LOVE).nextSibling).toHaveTextContent('9');
    expect(tile(t.groups.inquiries).getByText('6')).toBeInTheDocument();
    expect(tile(t.groups.inquiries).getByText(strings.inquiryStatus.NEW).nextSibling).toHaveTextContent('3');
    expect(tile(t.groups.inquiries).getByText(strings.inquiryStatus.IN_PROGRESS).nextSibling).toHaveTextContent('2');
  });

  it('센 때와 "지금 남아 있는 것" 안내를 보여 준다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() } });
    renderApp(<StatsPage />);
    expect(await screen.findByText(t.generatedAt('2026-11-12 13:05'))).toBeInTheDocument();
    expect(screen.getByText(t.note)).toBeInTheDocument();
    expect(t.note).toContain('지금 남아 있는 것');
  });

  it('모르는 키는 받은 그대로 보여 주고, 빈 byTopic 도 그린다', async () => {
    const body = stats();
    body.directions = { total: 13, byTopic: { LOVE: 9, CAREER: 4 } };
    body.reports = { total: 1, byStatus: { DONE: 0, WRITING: 0, FAILED: 0, QUEUED: 1 } };
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body } });
    renderApp(<StatsPage />);
    expect(await screen.findByText('CAREER')).toBeInTheDocument();
    expect(tile(t.groups.directions).getByText('CAREER').nextSibling).toHaveTextContent('4');
    expect(tile(t.groups.reports).getByText('QUEUED').nextSibling).toHaveTextContent('1');

    const empty = stats();
    empty.directions = { total: 0, byTopic: {} };
    routes['GET /admin/stats'] = { status: 200, body: empty };
    await userEvent.click(screen.getByRole('button', { name: t.refresh }));
    expect(await screen.findByRole('region', { name: t.groups.directions })).toBeInTheDocument();
    expect(tile(t.groups.directions).queryByText(t.topics.LOVE)).not.toBeInTheDocument();
  });

  it('새로 고침은 다시 받아 온다', async () => {
    const { calls, routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: stats() } });
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.groups.accounts });
    const next = stats();
    next.accounts.total = 121;
    routes['GET /admin/stats'] = { status: 200, body: next };
    await userEvent.click(screen.getByRole('button', { name: t.refresh }));
    expect(await screen.findByText('121')).toBeInTheDocument();
    expect(callsTo(calls, 'GET /admin/stats')).toHaveLength(2);
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 500, body: { error: 'INTERNAL' } } });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/stats'] = { status: 200, body: stats() };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('region', { name: t.groups.accounts })).toBeInTheDocument();
  });

  it('모양이 틀린 응답은 숫자를 그리지 않는다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/stats': { status: 200, body: { ...stats(), readings: { total: '많음' } } } });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.INVALID_RESPONSE);
    expect(screen.queryByRole('region', { name: t.groups.accounts })).not.toBeInTheDocument();
  });
});
