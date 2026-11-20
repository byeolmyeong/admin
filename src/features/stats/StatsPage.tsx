import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoadError, Loading } from '../../components/Feedback';
import { Icon } from '../../components/icons';
import type { IconName } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { strings } from '../../content/strings';
import type { Stats } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst, oneLine } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel } from '../inquiries/labels';
import { waitingOf } from '../inquiries/WaitingCount';

const t = strings.stats;
const count = strings.common.count;
/** 현황 아래 답변 대기 문의 수(D1 — 셋) */
const WAITING_SHOWN = 3;
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function Kpi({ label, icon, value, sub }: { label: string; icon: IconName; value: number; sub: ReactNode }) {
  return (
    <section className="card kpi" aria-label={label}>
      <span className="kpi__label">
        {label}
        <Icon name={icon} size={16} />
      </span>
      <span className="kpi__value">{count(value)}</span>
      <span className="kpi__sub">{sub}</span>
    </section>
  );
}

function Kpis({ stats }: { stats: Stats }) {
  const by = stats.inquiries.byStatus;
  return (
    <div className="kpis">
      <Kpi label={t.kpi.accounts} icon="user" value={stats.accounts.total} sub={t.accountsSub(stats.accounts.last7Days, stats.accounts.last30Days)} />
      <Kpi label={t.kpi.nicknames} icon="stats" value={stats.readings.total} sub={t.ratioSub(percent(stats.readings.total, stats.accounts.total))} />
      <Kpi label={t.kpi.profiles} icon="log" value={stats.profiles.total} sub={t.ratioSub(percent(stats.profiles.total, stats.accounts.total))} />
      <Kpi label={t.kpi.waiting} icon="inbox" value={waitingOf(stats)} sub={t.waitingSub(by.IN_PROGRESS ?? 0, by.DONE ?? 0)} />
    </div>
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
        <Link className="link-more" to="/inquiries?status=NEW">
          {t.waitingAll}
          <span aria-hidden="true"> ›</span>
        </Link>
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

/** 현황(D1): 지금 계약의 수치를 새 카드로. 1.0.0 지표 · 접속 차트는 서버 S⑪ 뒤(계획 D③). */
export function StatsPage() {
  const { api } = useAuth();
  const { state, reload } = useLoad(useCallback(() => api.getStats(), [api]));

  return (
    <>
      <PageHeader title={t.title}>
        {state.status === 'ready' && <span className="hide-tablet">{t.generatedAt(formatKst(state.data.generatedAt))}</span>}
        <button type="button" className="btn btn--secondary" onClick={reload} disabled={state.status === 'loading'}>
          {t.refresh}
        </button>
      </PageHeader>
      <div className="body">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {state.status === 'ready' && (
          <>
            <Kpis stats={state.data} />
            <Waiting />
            <p className="field__help">{t.note}</p>
          </>
        )}
      </div>
    </>
  );
}
