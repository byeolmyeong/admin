import { useCallback } from 'react';
import { LoadError, Loading } from '../../components/Feedback';
import { strings } from '../../content/strings';
import type { Counts, Stats } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatDateTime } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';

const t = strings.stats;
type Labels = Readonly<Record<string, string | undefined>>;

interface TileProps {
  label: string;
  total: number;
  /** 아래에 적는 작은 숫자들: [이름, 값] */
  rows?: [string, number][];
}

function Tile({ label, total, rows = [] }: TileProps) {
  return (
    <section className="tile" aria-label={label}>
      <h2 className="tile__label">{label}</h2>
      <p className="tile__number">{strings.common.count(total)}</p>
      {rows.length > 0 && (
        <dl className="tile__rows">
          {rows.map(([name, value]) => (
            <div key={name} className="tile__row">
              <dt>{name}</dt>
              <dd>{strings.common.count(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** 서버가 준 키를 돌면서 그린다. 문구가 없는 키는 받은 그대로 보인다. */
const rowsOf = (counts: Counts, labels: Labels): [string, number][] =>
  Object.entries(counts).map(([key, value]) => [labels[key] ?? key, value]);

function Tiles({ stats }: { stats: Stats }) {
  return (
    <div className="tiles">
      <Tile
        label={t.groups.accounts}
        total={stats.accounts.total}
        rows={[
          [t.last7Days, stats.accounts.last7Days],
          [t.last30Days, stats.accounts.last30Days],
        ]}
      />
      <Tile label={t.groups.profiles} total={stats.profiles.total} />
      <Tile label={t.groups.readings} total={stats.readings.total} />
      <Tile label={t.groups.reports} total={stats.reports.total} rows={rowsOf(stats.reports.byStatus, t.reportStatus)} />
      <Tile label={t.groups.synastries} total={stats.synastries.total} />
      <Tile
        label={t.groups.synastryReports}
        total={stats.synastryReports.total}
        rows={rowsOf(stats.synastryReports.byStatus, t.reportStatus)}
      />
      <Tile label={t.groups.directions} total={stats.directions.total} rows={rowsOf(stats.directions.byTopic, t.topics)} />
      <Tile label={t.groups.inquiries} total={stats.inquiries.total} rows={rowsOf(stats.inquiries.byStatus, strings.inquiryStatus)} />
    </div>
  );
}

export function StatsPage() {
  const { api } = useAuth();
  const { state, reload } = useLoad(useCallback(() => api.getStats(), [api]));

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">{t.title}</h1>
          {state.status === 'ready' && <p className="page__sub">{t.generatedAt(formatDateTime(state.data.generatedAt))}</p>}
        </div>
        <button type="button" className="btn btn--secondary btn--small" onClick={reload} disabled={state.status === 'loading'}>
          {t.refresh}
        </button>
      </header>
      <p className="note">{t.note}</p>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
      {state.status === 'ready' && (
        <>
          <Tiles stats={state.data} />
          <p className="note note--quiet">
            {t.noteReports} {strings.common.timeZoneNote}
          </p>
        </>
      )}
    </div>
  );
}
