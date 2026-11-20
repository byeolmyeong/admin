import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DateRangeSelect } from '../../components/DateRangeSelect';
import { EmptyState } from '../../components/EmptyState';
import { LoadError, Loading } from '../../components/Feedback';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Pill } from '../../components/Pill';
import type { PillTone } from '../../components/Pill';
import { SearchField } from '../../components/SearchField';
import { Segmented } from '../../components/Segmented';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { useIsPhone } from '../../components/overlay';
import { strings } from '../../content/strings';
import { AUDIT_ACTOR_TYPES, AUDIT_ADMIN_ACTIONS, AUDIT_USER_ACTIONS } from '../../lib/api/types';
import type { AuditLog } from '../../lib/api/types';
import { kstToday } from '../../lib/dates';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst } from '../../lib/text';
import { useListParams } from '../../lib/useListParams';
import { useLoad } from '../../lib/useLoad';
import { isValidDate } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';
import { actionLabel, actorTypeLabel, detailChips, outcomeLabel, targetLabel } from './labels';

const t = strings.audit;
/** 대상 id 의 앞 몇 글자만 보인다 */
const SHORT_ID = 8;
const ACTIONS: readonly string[] = [...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS];
const ACTION_OPTIONS = ACTIONS.map((code) => ({ value: code, label: actionLabel(code) }));
const ACTOR_OPTIONS = [{ value: '', label: t.all }, ...AUDIT_ACTOR_TYPES.map((value) => ({ value, label: actorTypeLabel(value) }))];

const oneOf = (value: string, allowed: readonly string[]): string => (allowed.includes(value) ? value : '');
const dateOf = (value: string): string => (isValidDate(value) ? value : '');
const actorTone = (type: string): PillTone => (type === 'ADMIN' ? 'pri' : type === 'USER' ? 'ok' : 'mute');

/** 대상: 문의는 그 문의로, 관리자 · 자주 묻는 질문은 그 화면으로 잇는다. 대상은 그 뒤 지워졌을 수 있다. */
function Target({ type, id }: { type: string | null; id: string | null }) {
  if (type === null) return null;
  const text = id === null ? targetLabel(type) : t.target(targetLabel(type), [...id].slice(0, SHORT_ID).join(''));
  const to = type === 'INQUIRY' && id !== null ? `/inquiries/${encodeURIComponent(id)}` : type === 'ADMIN' ? '/admins' : type === 'FAQ' ? '/faqs' : null;
  return to === null ? <span>{text}</span> : <Link to={to}>{text}</Link>;
}

/** 내용: 대상 · 자세히를 " · " 로 잇고, 실패면 끝에 실패 표. */
function Detail({ item }: { item: AuditLog }) {
  const parts = [
    ...(item.targetType === null ? [] : [<Target key="target" type={item.targetType} id={item.targetId} />]),
    ...detailChips(item.detail).map((text) => <span key={text}>{text}</span>),
  ];
  return (
    <span className="audit-detail">
      {parts.flatMap((part, i) =>
        i === 0
          ? [part]
          : [
              <span key={`sep${i}`} className="audit-detail__sep" aria-hidden="true">
                ·
              </span>,
              part,
            ],
      )}
      {item.outcome !== 'SUCCESS' && <Pill tone="bad">{outcomeLabel(item.outcome)}</Pill>}
      {parts.length === 0 && item.outcome === 'SUCCESS' && <span className="muted">{strings.inquiries.none}</span>}
    </span>
  );
}

/** 감사 로그(D10): 주체 칸 · 활동 · 날짜(기간 고르기) · 계정 찾기, 표(폰은 카드), 페이지 번호. */
export function AuditLogPage() {
  const { api } = useAuth();
  const phone = useIsPhone();
  const list = useListParams();
  const actorType = oneOf(list.get('actorType'), AUDIT_ACTOR_TYPES);
  const action = oneOf(list.get('action'), ACTIONS);
  const from = dateOf(list.get('from'));
  const to = dateOf(list.get('to'));
  const actorRef = list.get('actorRef').trim();
  const { page, size } = list;
  const filtered = actorType !== '' || action !== '' || from !== '' || to !== '' || actorRef !== '';

  const { state, reload } = useLoad(
    useCallback(() => api.listAuditLogs({ actorType, action, from, to, actorRef, page, size }), [api, actorType, action, from, to, actorRef, page, size]),
  );

  const onActor = (ref: string) => list.set({ actorRef: ref });
  const actorCell = (item: AuditLog) =>
    item.actor === null ? (
      <span className="muted">{strings.inquiries.none}</span>
    ) : (
      // 보여 줄 때는 label, 거를 때는 ref(계약)
      <button type="button" className="btn-text mono" aria-label={t.filterByActor(item.actor.label)} onClick={() => item.actor && onActor(item.actor.ref)}>
        {item.actor.label}
      </button>
    );

  const columns: Column<AuditLog>[] = [
    { key: 'occurredAt', header: t.columns.occurredAt, render: (item) => <span className="mono">{formatKst(item.occurredAt)}</span>, className: 'nowrap' },
    { key: 'actorType', header: t.columns.actorType, render: (item) => <Pill tone={actorTone(item.actorType)}>{actorTypeLabel(item.actorType)}</Pill> },
    { key: 'actor', header: t.columns.actor, render: actorCell },
    { key: 'action', header: t.columns.action, render: (item) => <b className="audit-action">{actionLabel(item.action)}</b> },
    { key: 'detail', header: t.columns.detail, render: (item) => <Detail item={item} /> },
  ];

  const data = state.status === 'ready' ? state.data : null;
  const empty = (() => {
    if (!data || data.items.length > 0) return null;
    if (data.total > 0) return <EmptyState icon="log" title={t.emptyPage.title} body={t.emptyPage.body} />;
    if (filtered) return <EmptyState icon="log" title={t.emptyFiltered.title} body={t.emptyFiltered.body} onReset={list.reset} />;
    return <EmptyState icon="log" title={t.empty.title} body={t.empty.body} />;
  })();

  return (
    <>
      <PageHeader title={t.title}>
        <span className="hide-tablet">{t.headNote}</span>
      </PageHeader>
      <div className="body">
        <div className="tools">
          <Segmented label={t.actorTypeLabel} value={actorType} options={ACTOR_OPTIONS} onChange={(value) => list.set({ actorType: value })} />
          <span className="tools__group">
            <Select label={t.actionLabel} allLabel={t.all} value={action} options={ACTION_OPTIONS} variant={phone ? 'field' : 'chip'} onChange={(value) => list.set({ action: value })} />
            <DateRangeSelect label={t.dateLabel} today={kstToday()} value={from && to ? { from, to } : null} onChange={(range) => list.set({ from: range.from, to: range.to })} />
          </span>
          <span className="tools__end">
            <SearchField label={t.searchLabel} placeholder={t.searchPlaceholder} value={actorRef} onCommit={(value) => list.set({ actorRef: value.trim() })} />
          </span>
        </div>

        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error, t.errors)} onRetry={reload} />}
        {empty}
        {data && (data.items.length > 0 || data.total > 0) && (
          <div className={phone ? undefined : 'card list-card'}>
            {data.items.length > 0 && (
              <Table
                label={t.listLabel}
                columns={columns}
                rows={data.items}
                rowKey={(item) => item.id}
                card={(item) => (
                  <>
                    <span className="row-card__meta">
                      <Pill tone={actorTone(item.actorType)}>{actorTypeLabel(item.actorType)}</Pill>
                      <span className="mono">{formatKst(item.occurredAt)}</span>
                    </span>
                    <span className="row-card__title">{actionLabel(item.action)}</span>
                    <span className="row-card__meta">
                      {actorCell(item)}
                      <Detail item={item} />
                    </span>
                  </>
                )}
              />
            )}
            <Pager total={data.total} page={page} size={size} onPage={list.setPage} onSize={list.setSize} />
          </div>
        )}
      </div>
    </>
  );
}
