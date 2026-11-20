import { useCallback } from 'react';
import { LoadError, Loading } from '../../components/Feedback';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { Pill } from '../../components/Pill';
import { Segmented } from '../../components/Segmented';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { useIsPhone } from '../../components/overlay';
import { strings } from '../../content/strings';
import { INQUIRY_CATEGORIES, INQUIRY_STATUSES } from '../../lib/api/types';
import type { Inquiry } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst, oneLine } from '../../lib/text';
import { useListParams } from '../../lib/useListParams';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { CATEGORY_ORDER, SEGMENT_STATUS, categoryLabel, segmentOf, statusLabel, statusTone } from './labels';
import type { Segment } from './labels';
import { useWaitingCount } from './WaitingCount';

const t = strings.inquiries;
/** 목록 한 줄 요약의 길이 */
const EXCERPT = 60;

const oneOf = (value: string, allowed: readonly string[]): string => (allowed.includes(value) ? value : '');

const columns: Column<Inquiry>[] = [
  { key: 'category', header: t.columns.category, render: (i) => <Pill tone="mute">{categoryLabel(i.category)}</Pill> },
  { key: 'body', header: t.columns.body, render: (i) => oneLine(i.body, EXCERPT) },
  { key: 'owner', header: t.columns.owner, render: (i) => <span className="mono">{i.ownerRef}</span> },
  { key: 'createdAt', header: t.columns.createdAt, render: (i) => <span className="mono">{formatKst(i.createdAt)}</span>, className: 'nowrap' },
  { key: 'status', header: t.columns.status, render: (i) => <Pill tone={statusTone(i.status)}>{statusLabel(i.status)}</Pill> },
  { key: 'handler', header: t.columns.handler, render: (i) => i.handledBy?.name ?? <span className="muted">{t.none}</span> },
];

function InquiryCard({ item }: { item: Inquiry }) {
  return (
    <>
      <span className="row-card__meta">
        <Pill tone="mute">{categoryLabel(item.category)}</Pill>
        <Pill tone={statusTone(item.status)}>{statusLabel(item.status)}</Pill>
        <span className="mono">{formatKst(item.createdAt)}</span>
      </span>
      <span className="row-card__title">{oneLine(item.body, EXCERPT)}</span>
      <span className="mono">{item.ownerRef}</span>
    </>
  );
}

/** 문의 목록(D2 · D25): 답변 대기 · 답변 완료 · 전체 칸, 종류, 표(폰은 카드), 페이지 번호. */
export function InquiryListPage() {
  const { api } = useAuth();
  const { count } = useWaitingCount();
  const phone = useIsPhone();
  const list = useListParams();
  const status = oneOf(list.get('status'), INQUIRY_STATUSES);
  const category = oneOf(list.get('category'), INQUIRY_CATEGORIES);
  const { page, size } = list;
  const segment = segmentOf(status);

  const { state, reload } = useLoad(useCallback(() => api.listInquiries({ status, category, page, size }), [api, status, category, page, size]));

  const segmentOptions = (Object.keys(SEGMENT_STATUS) as Segment[]).map((key) => ({
    value: key,
    label: key === 'waiting' ? t.segments.waiting(count) : t.segments[key],
  }));
  const categoryOptions = CATEGORY_ORDER.map((value) => ({ value, label: categoryLabel(value) }));
  const data = state.status === 'ready' ? state.data : null;
  const empty = (() => {
    if (!data || data.items.length > 0) return null;
    if (data.total > 0) return <EmptyState title={t.empty.page.title} body={t.empty.page.body} />;
    if (category) return <EmptyState title={t.empty.filtered.title} body={t.empty.filtered.body} onReset={list.reset} />;
    const words = t.empty[segment ?? 'all'];
    return <EmptyState title={words.title} body={words.body} />;
  })();

  return (
    <>
      <PageHeader title={t.title} />
      <div className="body">
        <div className="tools">
          <Segmented label={t.segmentsLabel} value={segment ?? 'all'} options={segmentOptions} onChange={(s) => list.set({ status: SEGMENT_STATUS[s] })} />
          {phone ? (
            <Select variant="field" allLabel={t.allCategories} value={category} options={categoryOptions} onChange={(v) => list.set({ category: v })} />
          ) : (
            <span className="chips" role="group" aria-label={t.categoryLabel}>
              {[{ value: '', label: t.allCategories }, ...categoryOptions].map((o) => (
                <button key={o.value || 'all'} type="button" className="chip" aria-pressed={category === o.value} onClick={() => list.set({ category: o.value })}>
                  {o.label}
                </button>
              ))}
            </span>
          )}
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
                rowKey={(i) => i.id}
                linkColumn="body"
                // 돌아올 때 같은 조건의 목록으로 오도록 지금의 조건을 들려 보낸다
                rowLink={(i) => ({ to: `/inquiries/${encodeURIComponent(i.id)}`, state: { listSearch: list.search } })}
                card={(i) => <InquiryCard item={i} />}
              />
            )}
            <Pager total={data.total} page={page} size={size} onPage={list.setPage} onSize={list.setSize} />
          </div>
        )}
      </div>
    </>
  );
}
