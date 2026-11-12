import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, LoadError, Loading } from '../../components/Feedback';
import { strings } from '../../content/strings';
import { AUDIT_ACTOR_TYPES, AUDIT_ADMIN_ACTIONS, AUDIT_USER_ACTIONS } from '../../lib/api/types';
import type { AuditLog, AuditLogPage as AuditLogPageData } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatDateTime } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { isValidDate } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';
import { actionLabel, actorTypeLabel, detailChips, outcomeLabel, targetLabel } from './labels';

const t = strings.audit;
/** 한 쪽의 개수(계약: 1~100, 기본 20) */
const PAGE_SIZE = 20;
/** 대상 id 의 앞 몇 글자만 보인다 */
const SHORT_ID = 8;
const ACTIONS: readonly string[] = [...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS];

/** 주소(쿼리)에 두는 조건. 빈 글자는 "조건 없음" 이다. */
interface Filters {
  actorType: string;
  action: string;
  from: string;
  to: string;
  actorRef: string;
  page: number;
}

const oneOf = (value: string | null, allowed: readonly string[]): string => (value !== null && allowed.includes(value) ? value : '');
const dateOf = (value: string | null): string => (value !== null && isValidDate(value) ? value : '');
const pageOf = (value: string | null): number => (value !== null && /^\d{1,6}$/.test(value) ? Number(value) : 0);

/** 주소의 틀린 값은 버린다(서버에 보내지 않는다). */
const readFilters = (params: URLSearchParams): Filters => ({
  actorType: oneOf(params.get('actorType'), AUDIT_ACTOR_TYPES),
  action: oneOf(params.get('action'), ACTIONS),
  from: dateOf(params.get('from')),
  to: dateOf(params.get('to')),
  actorRef: (params.get('actorRef') ?? '').trim(),
  page: pageOf(params.get('page')),
});

const toSearch = (filters: Filters): URLSearchParams => {
  const search = new URLSearchParams();
  if (filters.actorType) search.set('actorType', filters.actorType);
  if (filters.action) search.set('action', filters.action);
  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);
  if (filters.actorRef) search.set('actorRef', filters.actorRef);
  if (filters.page > 0) search.set('page', String(filters.page));
  return search;
};

/** 대상: 문의는 그 문의로, 관리자·자주 묻는 질문은 그 화면으로 잇는다. 대상은 그 뒤 지워졌을 수 있다. */
function Target({ type, id }: { type: string | null; id: string | null }) {
  if (type === null) return <span className="quiet">{strings.common.none}</span>;
  const text = id === null ? targetLabel(type) : t.target(targetLabel(type), [...id].slice(0, SHORT_ID).join(''));
  const to = type === 'INQUIRY' && id !== null ? `/inquiries/${encodeURIComponent(id)}` : type === 'ADMIN' ? '/admins' : type === 'FAQ' ? '/faqs' : null;
  return to === null ? <>{text}</> : <Link to={to}>{text}</Link>;
}

function Rows({ data, onActor }: { data: AuditLogPageData; onActor: (ref: string) => void }) {
  return (
    <table className="table" aria-label={t.listLabel}>
      <thead>
        <tr>
          <th scope="col">{t.columns.occurredAt}</th>
          <th scope="col">{t.columns.actor}</th>
          <th scope="col">{t.columns.action}</th>
          <th scope="col">{t.columns.target}</th>
          <th scope="col">{t.columns.outcome}</th>
          <th scope="col">{t.columns.detail}</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item: AuditLog) => {
          const actor = item.actor;
          return (
            <tr key={item.id}>
              <td className="table__nowrap mono">{formatDateTime(item.occurredAt)}</td>
              <td className="table__nowrap">
                {actor === null ? (
                  <span className="quiet">{actorTypeLabel(item.actorType)}</span>
                ) : (
                  // 보여 줄 때는 label, 거를 때는 ref(계약)
                  <button type="button" className="btn btn--text mono" aria-label={t.filterByActor(actor.label)} onClick={() => onActor(actor.ref)}>
                    {actor.label}
                  </button>
                )}
              </td>
              <td>{actionLabel(item.action)}</td>
              <td className="table__nowrap">
                <Target type={item.targetType} id={item.targetId} />
              </td>
              <td className="table__nowrap">
                <span className={item.outcome === 'FAILURE' ? 'badge badge--danger' : 'badge badge--quiet'}>{outcomeLabel(item.outcome)}</span>
              </td>
              <td>
                <span className="chips">
                  {detailChips(item.detail).map((text) => (
                    <span key={text} className="badge badge--plain">
                      {text}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 계정 조건은 다 쓴 뒤 "적용" 으로 보낸다(전체가 같은 것만 찾는 조건이라 글자마다 받지 않는다). */
function ActorRefForm({ value, onApply }: { value: string; onApply: (ref: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(draft.trim());
  };
  return (
    <form className="filter" onSubmit={submit}>
      <label htmlFor={id}>{t.filterActorRef}</label>
      <input id={id} className="input" type="text" value={draft} title={t.actorRefHelp} autoComplete="off" onChange={(e) => setDraft(e.target.value)} />
      <button type="submit" className="btn btn--secondary btn--small">
        {t.actorRefApply}
      </button>
    </form>
  );
}

export function AuditLogPage() {
  const { api } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { actorType, action, from, to, actorRef, page } = filters;
  const actorTypeId = useId();
  const actionId = useId();
  const fromId = useId();
  const toId = useId();

  const { state, reload } = useLoad(
    useCallback(
      () => api.listAuditLogs({ actorType, action, from, to, actorRef, page, size: PAGE_SIZE }),
      [api, actorType, action, from, to, actorRef, page],
    ),
  );

  /** 조건을 바꾸면 첫 쪽부터 다시 본다. */
  const filter = (change: Partial<Filters>) => setParams(toSearch({ ...filters, page: 0, ...change }));

  const data = state.status === 'ready' ? state.data : null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">{t.title}</h1>
          {data && <p className="page__sub">{t.total(data.total)}</p>}
        </div>
      </header>
      <p className="note">{t.note}</p>

      <div className="filters filters--wrap" role="group" aria-label={t.filtersLabel}>
        <div className="filter">
          <label htmlFor={actorTypeId}>{t.filterActorType}</label>
          <select id={actorTypeId} className="select" value={actorType} onChange={(e) => filter({ actorType: e.target.value })}>
            <option value="">{t.all}</option>
            {AUDIT_ACTOR_TYPES.map((value) => (
              <option key={value} value={value}>
                {actorTypeLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label htmlFor={actionId}>{t.filterAction}</label>
          <select id={actionId} className="select" value={action} onChange={(e) => filter({ action: e.target.value })}>
            <option value="">{t.all}</option>
            <optgroup label={t.actionGroups.admin}>
              {AUDIT_ADMIN_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {actionLabel(value)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t.actionGroups.user}>
              {AUDIT_USER_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {actionLabel(value)}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="filter">
          <label htmlFor={fromId}>{t.filterFrom}</label>
          <input id={fromId} className="input" type="date" value={from} onChange={(e) => filter({ from: e.target.value })} />
        </div>
        <div className="filter">
          <label htmlFor={toId}>{t.filterTo}</label>
          <input id={toId} className="input" type="date" value={to} onChange={(e) => filter({ to: e.target.value })} />
        </div>
        {/* 주소의 조건이 바뀌면(줄의 "누가" 를 눌렀을 때 등) 칸도 그 값으로 다시 시작한다 */}
        <ActorRefForm key={actorRef} value={actorRef} onApply={(ref) => filter({ actorRef: ref })} />
      </div>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error, t.errors)} onRetry={reload} />}
      {data && data.items.length === 0 && <Empty>{data.total === 0 ? t.empty : t.emptyPage}</Empty>}
      {data && data.items.length > 0 && <Rows data={data} onActor={(ref) => filter({ actorRef: ref })} />}
      {data && data.total > 0 && (
        <nav className="pager" aria-label={t.pagerLabel}>
          <button type="button" className="btn btn--secondary btn--small" disabled={data.page <= 0} onClick={() => filter({ page: data.page - 1 })}>
            {t.prev}
          </button>
          <span className="mono">{t.position(data.page + 1, pages)}</span>
          <button type="button" className="btn btn--secondary btn--small" disabled={data.page + 1 >= pages} onClick={() => filter({ page: data.page + 1 })}>
            {t.next}
          </button>
        </nav>
      )}
      {data && <p className="note note--quiet">{strings.common.timeZoneNote}</p>}
    </div>
  );
}
