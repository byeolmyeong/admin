import { useCallback } from 'react';
import { DateRangeSelect } from '../../components/DateRangeSelect';
import { EmptyState } from '../../components/EmptyState';
import { LoadError, Loading } from '../../components/Feedback';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Pill } from '../../components/Pill';
import { SearchField } from '../../components/SearchField';
import { Segmented } from '../../components/Segmented';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { useIsPhone } from '../../components/overlay';
import { strings } from '../../content/strings';
import type { UserRow } from '../../lib/api/types';
import { kstToday } from '../../lib/dates';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst } from '../../lib/text';
import { useListParams } from '../../lib/useListParams';
import { useLoad } from '../../lib/useLoad';
import { isValidDate } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';
import { providerLabel } from '../inquiries/labels';
import { PROVIDERS, USER_STATUSES, initialOf, nicknameOf, reportsText, userStatusLabel, userStatusTone } from './labels';

const t = strings.users;
const oneOf = (value: string, allowed: readonly string[]): string => (allowed.includes(value) ? value : '');
const dateOf = (value: string): string => (isValidDate(value) ? value : '');
const n = (v: number | undefined): string => (v === undefined ? t.none : v.toLocaleString('ko-KR'));
const signed = (pct: number | null): string => (pct === null ? t.none : `${pct >= 0 ? '+' : ''}${pct}%`);

function Strip() {
  const { api } = useAuth();
  const today = useLoad(useCallback(() => api.getActiveStats('today'), [api]));
  const week = useLoad(useCallback(() => api.getActiveStats('week'), [api]));
  const month = useLoad(useCallback(() => api.getActiveStats('month'), [api]));
  const stats = useLoad(useCallback(() => api.getStats(), [api]));
  const d = (s: typeof today.state) => (s.status === 'ready' ? s.data : null);
  const td = d(today.state);
  const wk = d(week.state);
  const mo = d(month.state);
  const st = stats.state.status === 'ready' ? stats.state.data : null;
  const users = st?.users;
  const total = users?.total ?? st?.accounts.total;
  const change = wk && wk.previousTotal > 0 ? Math.round(((wk.total - wk.previousTotal) / wk.previousTotal) * 100) : null;
  const ratio = mo && total ? `${Math.round((mo.total / total) * 100)}%` : t.none;
  const items = [
    { label: t.strip.today, value: td ? t.people(n(td.total)) : t.none, sub: t.yesterday(n(td?.previousTotal)) },
    { label: t.strip.week, value: wk ? t.people(n(wk.total)) : t.none, sub: t.weekChange(signed(change)) },
    { label: t.strip.month, value: mo ? t.people(n(mo.total)) : t.none, sub: t.monthRatio(ratio) },
    { label: t.strip.joined, value: users ? t.people(n(users.joined7d)) : t.none, sub: t.joinedToday(n(users?.joinedToday)) },
  ];
  return (
    <div className="ustrip">
      {items.map((item) => (
        <section key={item.label} className="card ustrip__item" aria-label={item.label}>
          <span className="ustrip__label">{item.label}</span>
          <b className="ustrip__value">{item.value}</b>
          <span className="ustrip__sub">{item.sub}</span>
        </section>
      ))}
    </div>
  );
}

function Who({ user }: { user: UserRow }) {
  return (
    <span className="who">
      <span className="avatar" aria-hidden="true">
        {initialOf(user)}
      </span>
      <span className="who__id">{nicknameOf(user)}</span>
    </span>
  );
}

const columns: Column<UserRow>[] = [
  { key: 'nickname', header: t.columns.nickname, render: (u) => <Who user={u} /> },
  { key: 'email', header: t.columns.email, render: (u) => u.emailMasked ?? t.none },
  { key: 'provider', header: t.columns.provider, render: (u) => providerLabel(u.provider) },
  { key: 'joinedAt', header: t.columns.joinedAt, render: (u) => <span className="mono">{formatKst(u.joinedAt)}</span>, className: 'nowrap' },
  { key: 'lastSeen', header: t.columns.lastSeen, render: (u) => <span className="mono">{u.lastSeenAt ? formatKst(u.lastSeenAt) : t.none}</span>, className: 'nowrap' },
  { key: 'reports', header: t.columns.reports, render: (u) => reportsText(u.reports) },
  { key: 'status', header: t.columns.status, render: (u) => <Pill tone={userStatusTone(u.status)}>{userStatusLabel(u.status)}</Pill> },
];

/** 사용자 목록(D4 · D25-1): 접속 숫자 넷 · 찾기 · 상태 칸 · 로그인 수단 · 가입일, 표(폰은 카드), 페이지 번호. */
export function UserListPage() {
  const { api } = useAuth();
  const phone = useIsPhone();
  const list = useListParams();
  const q = list.get('q').trim();
  const status = oneOf(list.get('status'), USER_STATUSES);
  const provider = oneOf(list.get('provider'), PROVIDERS);
  const joinedFrom = dateOf(list.get('joinedFrom'));
  const joinedTo = dateOf(list.get('joinedTo'));
  const { page, size } = list;
  const filtered = q !== '' || status !== '' || provider !== '' || joinedFrom !== '' || joinedTo !== '';

  const { state, reload } = useLoad(
    useCallback(() => api.listUsers({ q, status, provider, joinedFrom, joinedTo, page, size }), [api, q, status, provider, joinedFrom, joinedTo, page, size]),
  );
  const data = state.status === 'ready' ? state.data : null;
  const empty = (() => {
    if (!data || data.items.length > 0) return null;
    if (data.total > 0) return <EmptyState icon="user" title={t.emptyPage.title} body={t.emptyPage.body} />;
    if (filtered) return <EmptyState icon="search" title={t.emptyFiltered.title} body={t.emptyFiltered.body} onReset={list.reset} />;
    return <EmptyState icon="user" title={t.empty.title} body={t.empty.body} />;
  })();

  const statusOptions = [{ value: '', label: t.statusAll(status === '' && data ? data.total : null) }, ...USER_STATUSES.map((value) => ({ value, label: userStatusLabel(value) }))];

  return (
    <>
      <PageHeader title={t.title}>
        <span className="hide-tablet">{t.headNote}</span>
      </PageHeader>
      <div className="body">
        <Strip />
        <div className="tools">
          <SearchField label={t.searchLabel} placeholder={t.searchPlaceholder} value={q} onCommit={(v) => list.set({ q: v.trim() })} />
          <Segmented label={t.statusLabel} value={status} options={statusOptions} onChange={(v) => list.set({ status: v })} />
          <span className="tools__group">
            <Select
              label={t.provider}
              allLabel={t.providerAll}
              value={provider}
              options={PROVIDERS.map((value) => ({ value, label: providerLabel(value) ?? value }))}
              onChange={(v) => list.set({ provider: v })}
            />
            <DateRangeSelect
              label={t.joined}
              today={kstToday()}
              value={joinedFrom && joinedTo ? { from: joinedFrom, to: joinedTo } : null}
              onChange={(range) => list.set({ joinedFrom: range.from, joinedTo: range.to })}
            />
          </span>
        </div>

        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {empty}
        {data && (data.items.length > 0 || data.total > 0) && (
          <div className={phone ? undefined : 'card list-card'}>
            {data.items.length > 0 && (
              <Table
                label={t.listLabel}
                columns={columns}
                rows={data.items}
                rowKey={(u) => u.id}
                linkColumn="nickname"
                rowLink={(u) => ({ to: `/users/${encodeURIComponent(u.id)}`, state: { listSearch: list.search } })}
                card={(u) => (
                  <span className="user-card">
                    <span className="avatar" aria-hidden="true">
                      {initialOf(u)}
                    </span>
                    <span className="user-card__text">
                      <span className="row-card__title">{nicknameOf(u)}</span>
                      <span>{[providerLabel(u.provider), t.joinedLine(formatKst(u.joinedAt)), u.lastSeenAt ? formatKst(u.lastSeenAt) : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Pill tone={userStatusTone(u.status)}>{userStatusLabel(u.status)}</Pill>
                  </span>
                )}
              />
            )}
            <Pager
              total={data.total}
              page={page}
              size={size}
              onPage={list.setPage}
              onSize={list.setSize}
              range={t.range(data.total, data.total === 0 ? 0 : page * size + 1, Math.min(data.total, (page + 1) * size))}
            />
          </div>
        )}
      </div>
    </>
  );
}
