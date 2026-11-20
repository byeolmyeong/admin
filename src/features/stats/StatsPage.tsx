import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoadError, Loading } from '../../components/Feedback';
import { MoreLink } from '../../components/MoreLink';
import { Icon } from '../../components/icons';
import type { IconName } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Segmented } from '../../components/Segmented';
import { strings } from '../../content/strings';
import type { ActiveRange, AppConfig, Stats } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst, oneLine } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useMaintenance } from '../app-config/MaintenanceContext';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel } from '../inquiries/labels';
import { waitingOf } from '../inquiries/WaitingCount';

const t = strings.stats;
const DAY = 86_400_000;
/** 현황 아래 답변 대기 문의 수(D1 — 셋) */
const WAITING_SHOWN = 3;
const n = (v: number | undefined): string => (v === undefined ? t.none : v.toLocaleString('ko-KR'));
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
/** 막대 위 여유(가장 큰 막대가 칸의 87% — 캔버스 D1) */
const HEADROOM = 1.15;

function Kpi({ label, icon, value, sub, danger }: { label: string; icon: IconName; value: string; sub: ReactNode; danger?: boolean }) {
  return (
    <section className="card kpi" aria-label={label}>
      <span className="kpi__label">
        {label}
        <Icon name={icon} size={16} />
      </span>
      <span className="kpi__value">{value}</span>
      <span className={danger ? 'kpi__sub kpi__sub--bad' : 'kpi__sub'}>{sub}</span>
    </section>
  );
}

/**
 * 카드 여덟(D1). 결정 043 의 3 필드가 없으면(서버 S⑪ 전) 지금 계약의 값으로 채울 수 있는 것만 채우고 나머지는 "—".
 */
function Kpis({ stats, now }: { stats: Stats; now: number }) {
  const users = stats.users;
  const total = users?.total ?? stats.accounts.total;
  const nicknames = stats.nicknames?.total ?? stats.readings.total;
  const r = stats.reports;
  const reportsTotal = r.me !== undefined && r.timing !== undefined ? r.me + r.timing : undefined;
  const sky = stats.todaySky;
  const fail = stats.failuresToday;
  const push = stats.pushToday;
  const oldest = stats.inquiries.oldestWaitingAt;
  const consents = stats.consents;
  return (
    <div className="kpis">
      <Kpi
        label={t.kpi.accounts}
        icon="user"
        value={n(total)}
        sub={
          <>
            {/* 오늘 가입이 있으면 초록 굵게(캔버스 D1) */}
            {t.accountsToday}{' '}
            {users && users.joinedToday > 0 ? <b className="kpi__up">{t.joinedUp(n(users.joinedToday))}</b> : t.joinedUp(n(users?.joinedToday))}
            {' · '}
            {t.accountsWeek(n(users?.joined7d ?? stats.accounts.last7Days))}
          </>
        }
      />
      <Kpi label={t.kpi.nicknames} icon="stats" value={n(nicknames)} sub={t.ratioSub(percent(nicknames, total))} />
      <Kpi label={t.kpi.reports} icon="help" value={n(reportsTotal)} sub={t.reportsSub(n(r.me), n(r.timing), n(r.generating))} />
      <Kpi label={t.kpi.todaySky} icon="bell" value={n(sky?.today)} sub={t.todaySkySub(n(sky?.onDemand), n(sky?.prebuilt))} />
      <Kpi
        label={t.kpi.failures}
        icon="log"
        value={n(fail ? fail.nickname + fail.report : undefined)}
        sub={t.failuresSub(n(fail?.nickname), n(fail?.report))}
        danger={fail !== undefined && fail.nickname + fail.report > 0}
      />
      <Kpi
        label={t.kpi.push}
        icon="bell"
        value={n(push?.sent)}
        sub={
          <>
            {t.pushOk(n(push ? push.sent - push.failed : undefined))}
            {' · '}
            {/* 실패가 있으면 빨강 굵게(캔버스 D1) */}
            {push && push.failed > 0 ? <b className="kpi__down">{t.pushFailed(n(push.failed))}</b> : t.pushFailed(n(push?.failed))}
          </>
        }
      />
      <Kpi
        label={t.kpi.waiting}
        icon="inbox"
        value={n(stats.inquiries.waiting ?? waitingOf(stats))}
        sub={oldest ? t.waitingSub(Math.max(0, Math.floor((now - Date.parse(oldest)) / DAY))) : t.none}
      />
      <Kpi
        label={t.kpi.consents}
        icon="key"
        value={consents ? t.consentsValue(Math.round(consents.pushRate * 100), Math.round(consents.marketingRate * 100)) : t.none}
        sub={consents ? t.consentsSub(n(consents.adReachable)) : t.none}
      />
    </div>
  );
}

const RANGES: ActiveRange[] = ['today', 'week', 'month'];

/** 접속(D1): 오늘(시간대별) · 이번 주 · 이번 달(날짜별), 접속자 · 하루 평균 · 지난 기간보다. */
function Active() {
  const { api } = useAuth();
  const [range, setRange] = useState<ActiveRange>('week');
  const { state } = useLoad(useCallback(() => api.getActiveStats(range), [api, range]));
  const data = state.status === 'ready' ? state.data : null;
  const change = data && data.previousTotal > 0 ? Math.round(((data.total - data.previousTotal) / data.previousTotal) * 100) : null;
  const max = data ? Math.max(1, ...data.points.map((p) => p.value)) * HEADROOM : 1;
  const many = (data?.points.length ?? 0) > 12;
  const a = t.active;

  return (
    <section className="card active-card" aria-labelledby="active-title">
      <div className="active-card__head">
        <h2 className="sec-title" id="active-title">
          {a.title}
        </h2>
        <Segmented label={a.rangeLabel} value={range} options={RANGES.map((value) => ({ value, label: a.ranges[value] }))} onChange={setRange} />
      </div>
      <div className="active-card__nums">
        <span>
          <small>{a.total[range]}</small>
          <b>{data ? a.people(n(data.total)) : t.none}</b>
        </span>
        <span>
          <small>{a.average}</small>
          <b>{data ? a.people(n(Math.round(data.average))) : t.none}</b>
        </span>
        <span>
          <small>{a.compare[range]}</small>
          <b className={change === null ? undefined : change >= 0 ? 'is-up' : 'is-down'}>{change === null ? t.none : `${change >= 0 ? '+' : ''}${change}%`}</b>
        </span>
      </div>
      {data && data.points.length > 0 ? (
        <div className={many ? 'bars bars--many' : 'bars'} role="img" aria-label={a.chartLabel(a.ranges[range])}>
          {data.points.map((p, i) => (
            <span key={`${p.label}-${i}`} className={i === data.points.length - 1 ? 'bars__col is-last' : 'bars__col'}>
              {!many && <span className="bars__value">{n(p.value)}</span>}
              <span className="bars__track">
                <span className="bars__bar" style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }} />
              </span>
              <span className="bars__label">{!many || i % 3 === 0 || i === data.points.length - 1 ? p.label : ''}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="active-card__empty">{state.status === 'loading' ? strings.common.loading : a.failed}</p>
      )}
      <p className="field__help">{a.note}</p>
    </section>
  );
}

/** 답변 대기 문의 셋(D1 오른쪽 카드). 못 받으면 카드를 그리지 않는다(위 숫자는 따로 받는다). */
function Waiting() {
  const { api } = useAuth();
  const { state } = useLoad(useCallback(() => api.listInquiries({ status: 'NEW', page: 0, size: WAITING_SHOWN }), [api]));
  if (state.status !== 'ready') return null;
  const items = state.data.items;
  return (
    <section className="card waiting" aria-labelledby="waiting-title">
      <h2 className="sec-title waiting__head" id="waiting-title">
        {t.waitingTitle}
        <MoreLink to="/inquiries?status=NEW">{t.waitingAll}</MoreLink>
      </h2>
      {items.length === 0 ? (
        <p className="field__help waiting__empty">{t.waitingEmpty}</p>
      ) : (
        <table className="tbl" aria-label={t.waitingListLabel}>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Pill tone="mute">{categoryLabel(item.category)}</Pill>
                </td>
                <td>
                  <Link to={`/inquiries/${encodeURIComponent(item.id)}`}>{oneLine(item.body, 40)}</Link>
                </td>
                <td className="mono nowrap">{formatKst(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** 머리 오른쪽: 센 때 · 서비스 상태(점검 여부) · iOS 최신 · 최소 버전 */
function HeadSide({ generatedAt, config }: { generatedAt: string | null; config: AppConfig | null }) {
  const { active } = useMaintenance();
  const ios = config?.ios;
  return (
    <>
      {generatedAt && <span className="hide-tablet">{t.generatedAt(formatKst(generatedAt))}</span>}
      <Pill tone={active ? 'warn' : 'ok'} dot>
        {active ? t.serviceMaint : t.serviceOk}
      </Pill>
      {ios && <Pill tone="mute">{t.versions(strings.appConfig.platforms.ios, ios.latestVersion ?? t.none, ios.minVersion ?? t.none)}</Pill>}
    </>
  );
}

/** 현황(D1): 카드 여덟 · 접속 · 답변 대기 문의 셋. */
export function StatsPage() {
  const { api } = useAuth();
  const { state, reload } = useLoad(useCallback(() => api.getStats(), [api]));
  const config = useLoad(useCallback(() => api.getAppConfig(), [api]));

  return (
    <>
      <PageHeader title={t.title}>
        <HeadSide generatedAt={state.status === 'ready' ? state.data.generatedAt : null} config={config.state.status === 'ready' ? config.state.data : null} />
      </PageHeader>
      <div className="body">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {state.status === 'ready' && (
          <>
            <Kpis stats={state.data} now={Date.parse(state.data.generatedAt) || Date.now()} />
            <div className="grid-dash">
              <Active />
              <Waiting />
            </div>
          </>
        )}
      </div>
    </>
  );
}
