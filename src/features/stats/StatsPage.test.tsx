import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { activeStats, admin, appConfig, inquiry, platformConfig, stats, statsV2 } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { Route } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { StatsPage } from './StatsPage';

const t = strings.stats;
const me = { status: 200, body: admin };
const card = (name: string) => within(screen.getByRole('region', { name }));
const waiting = { status: 200, body: { items: [inquiry()], page: 0, size: 3, total: 1 } };
const server = (over: Record<string, Route> = {}) =>
  mockFetch({
    'GET /admin/me': me,
    'GET /admin/stats': { status: 200, body: statsV2() },
    'GET /admin/stats/active': (req) => ({ status: 200, body: activeStats(req.query.get('range') ?? 'week') }),
    'GET /admin/inquiries': waiting,
    'GET /admin/app-config': { status: 200, body: appConfig({ ios: platformConfig({ latestVersion: '1.0.2', minVersion: '1.0.0' }) }) },
    ...over,
  });

describe('현황(D1)', () => {
  it('카드 여덟을 보드대로 채운다', async () => {
    server();
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.kpi.accounts });
    expect(card(t.kpi.accounts).getByText('1,284')).toBeInTheDocument();
    expect(card(t.kpi.accounts).getByText(t.accountsSub('32', '214'))).toBeInTheDocument();
    expect(card(t.kpi.nicknames).getByText('1,201')).toBeInTheDocument();
    expect(card(t.kpi.nicknames).getByText(t.ratioSub(94))).toBeInTheDocument();
    expect(card(t.kpi.reports).getByText('386')).toBeInTheDocument();
    expect(card(t.kpi.reports).getByText(t.reportsSub('214', '172', '4'))).toBeInTheDocument();
    expect(card(t.kpi.todaySky).getByText(t.todaySkySub('132', '280'))).toBeInTheDocument();
    expect(card(t.kpi.failures).getByText('3')).toBeInTheDocument();
    expect(card(t.kpi.failures).getByText(t.failuresSub('1', '2'))).toHaveClass('kpi__sub--bad');
    expect(card(t.kpi.push).getByText(t.pushSub('1,908', '12'))).toBeInTheDocument();
    expect(card(t.kpi.waiting).getByText('5')).toBeInTheDocument();
    expect(card(t.kpi.waiting).getByText(t.waitingSub(2))).toBeInTheDocument();
    expect(card(t.kpi.consents).getByText(t.consentsValue(62, 18))).toBeInTheDocument();
    expect(card(t.kpi.consents).getByText(t.consentsSub('211'))).toBeInTheDocument();
  });

  it('서버가 v2 값을 아직 주지 않으면 지금 값으로 채울 수 있는 것만 채우고 나머지는 "—"', async () => {
    server({ 'GET /admin/stats': { status: 200, body: stats() } });
    renderApp(<StatsPage />);
    await screen.findByRole('region', { name: t.kpi.accounts });
    expect(card(t.kpi.accounts).getByText('120')).toBeInTheDocument();
    expect(card(t.kpi.nicknames).getByText('88')).toBeInTheDocument();
    expect(card(t.kpi.waiting).getByText('3')).toBeInTheDocument();
    expect(card(t.kpi.reports).getAllByText(t.none).length).toBeGreaterThan(0);
    expect(card(t.kpi.consents).getAllByText(t.none)).toHaveLength(2);
  });

  it('머리: 센 때 · 서비스 정상 · iOS 최신 · 최소 버전', async () => {
    server();
    renderApp(<StatsPage />);
    expect(await screen.findByText(t.generatedAt('2026.11.12 13:05:06'))).toBeInTheDocument();
    expect(screen.getByText(t.serviceOk)).toBeInTheDocument();
    expect(await screen.findByText(t.versions('iOS', '1.0.2', '1.0.0'))).toBeInTheDocument();
  });

  it('접속: 이번 주가 기본, 오늘 · 이번 달로 바꾸면 그 기간을 받는다 · 전주 대비', async () => {
    const { calls } = server();
    renderApp(<StatsPage />);
    const region = within(await screen.findByRole('region', { name: t.active.title }));
    expect(await region.findByText(t.active.people('1,020'))).toBeInTheDocument();
    expect(region.getByText('+12%')).toHaveClass('is-up');
    expect(region.getByRole('img', { name: t.active.chartLabel(t.active.ranges.week) })).toBeInTheDocument();
    await userEvent.click(region.getByRole('button', { name: t.active.ranges.month }));
    expect(await region.findByText(t.active.total.month)).toBeInTheDocument();
    expect(callsTo(calls, 'GET /admin/stats/active').map((c) => c.query.get('range'))).toEqual(['week', 'month']);
  });

  it('접속 기록을 못 받으면(서버 전) 카드는 두고 "—" 와 안내', async () => {
    server({ 'GET /admin/stats/active': { status: 404, body: { error: 'NOT_FOUND' } } });
    renderApp(<StatsPage />);
    const region = within(await screen.findByRole('region', { name: t.active.title }));
    expect(await region.findByText(t.active.failed)).toBeInTheDocument();
  });

  it('답변 대기 문의 셋: 새 문의 조건으로 받아 상세로 잇고, "전체" 는 답변 대기 목록', async () => {
    const { calls } = server();
    renderApp(<StatsPage />);
    const list = await screen.findByRole('table', { name: t.waitingListLabel });
    expect(within(list).getByRole('link', { name: '리포트가 열리지 않아요. 두 번째 줄입니다.' })).toHaveAttribute('href', `/inquiries/${inquiry().id}`);
    expect(callsTo(calls, 'GET /admin/inquiries')[0]?.query.toString()).toBe('status=NEW&page=0&size=3');
    expect(screen.getByRole('link', { name: t.waitingAll })).toHaveAttribute('href', '/inquiries?status=NEW');
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = server({ 'GET /admin/stats': { status: 500, body: { error: 'X' } } });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/stats'] = { status: 200, body: statsV2() };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('region', { name: t.kpi.accounts })).toBeInTheDocument();
  });

  it('모양이 틀린 응답은 숫자를 그리지 않는다', async () => {
    server({ 'GET /admin/stats': { status: 200, body: { generatedAt: 'x' } } });
    renderApp(<StatsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.INVALID_RESPONSE);
    expect(screen.queryByRole('region', { name: t.kpi.accounts })).not.toBeInTheDocument();
  });
});
