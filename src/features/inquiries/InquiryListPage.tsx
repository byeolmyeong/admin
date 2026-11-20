import { useCallback } from 'react';
import { LoadError, Loading } from '../../components/Feedback';
import { EmptyState } from '../../components/EmptyState';
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
import { ApiError } from '../../lib/api/client';
import { INQUIRY_CATEGORIES, INQUIRY_CATEGORIES_V2, INQUIRY_STATUSES } from '../../lib/api/types';
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
const CATEGORIES: readonly string[] = [...INQUIRY_CATEGORIES_V2, ...INQUIRY_CATEGORIES];
const DAY = 86_400_000;
/** 작성자: 닉네임(S⑧ 의 owner), 없으면 계정 코드 */
const ownerName = (i: Inquiry): string => i.owner?.nickname ?? i.ownerRef;

const columns: Column<Inquiry>[] = [
  { key: 'category', header: t.columns.category, render: (i) => <Pill tone="mute">{categoryLabel(i.category)}</Pill> },
  { key: 'body', header: t.columns.body, render: (i) => oneLine(i.body, EXCERPT) },
  { key: 'owner', header: t.columns.owner, render: (i) => (i.owner?.nickname ? i.owner.nickname : <span className="mono">{i.ownerRef}</span>) },
  { key: 'createdAt', header: t.columns.createdAt, render: (i) => <span className="mono">{formatKst(i.createdAt)}</span>, className: 'nowrap' },
  { key: 'status', header: t.columns.status, render: (i) => <Pill tone={statusTone(i.status)}>{statusLabel(i.status)}</Pill> },
  { key: 'answerer', header: t.columns.answerer, render: (i) => (i.answeredBy ?? i.handledBy)?.name ?? <span className="muted">{t.none}</span> },
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
      <span>{ownerName(item)}</span>
    </>
  );
}

/** 문의 목록(D2 · D25): 답변 대기 · 답변 완료 · 전체 칸, 종류, 표(폰은 카드), 페이지 번호. */
export function InquiryListPage() {
  const { api } = useAuth();
  const { count, oldestWaitingAt } = useWaitingCount();
  const phone = useIsPhone();
  const list = useListParams();
  const status = oneOf(list.get('status'), INQUIRY_STATUSES);
  const category = oneOf(list.get('category'), CATEGORIES);
  const q = list.get('q').trim();
  const { page, size } = list;
  const segment = segmentOf(status);

  const { state, reload } = useLoad(
    useCallback(async () => {
      try {
        return await api.listInquiries({ status, category, q, page, size });
      } catch (e) {
        // 답변 완료(ANSWERED)를 아직 모르는 서버(S⑧ 전)면 옛 끝남(DONE)으로 다시 묻는다.
        if (status === 'ANSWERED' && e instanceof ApiError && e.code === 'INVALID_STATUS') return api.listInquiries({ status: 'DONE', category, q, page, size });
        throw e;
      }
    }, [api, status, category, q, page, size]),
  );

  const segmentOptions = (Object.keys(SEGMENT_STATUS) as Segment[]).map((key) => ({
    value: key,
    label: key === 'waiting' ? t.segments.waiting(count) : t.segments[key],
  }));
  const categoryOptions = CATEGORY_ORDER.map((value) => ({ value, label: categoryLabel(value) }));
  const data = state.status === 'ready' ? state.data : null;
  const empty = (() => {
    if (!data || data.items.length > 0) return null;
    if (data.total > 0) return <EmptyState title={t.empty.page.title} body={t.empty.page.body} />;
    if (category || q) return <EmptyState title={t.empty.filtered.title} body={t.empty.filtered.body} onReset={list.reset} />;
    const words = t.empty[segment ?? 'all'];
    return <EmptyState title={words.title} body={words.body} />;
  })();

  return (
    <>
      <PageHeader title={t.title}>
        {oldestWaitingAt && <span>{t.oldest(Math.max(0, Math.floor((Date.now() - Date.parse(oldestWaitingAt)) / DAY)))}</span>}
      </PageHeader>
      <div className="body">
        <div className="tools">
          <Segmented label={t.segmentsLabel} value={segment ?? 'all'} options={segmentOptions} onChange={(s) => list.set({ status: SEGMENT_STATUS[s] })} />
          {phone ? (
            <span className="tools__row">
              <Select allLabel={t.allCategories} value={category} options={categoryOptions} onChange={(v) => list.set({ category: v })} />
              <SearchField label={t.searchLabel} placeholder={t.searchPlaceholder} value={q} onCommit={(v) => list.set({ q: v.trim() })} />
            </span>
          ) : (
            <span className="chips" role="group" aria-label={t.categoryLabel}>
              {[{ value: '', label: t.allCategories }, ...categoryOptions].map((o) => (
                <button key={o.value || 'all'} type="button" className="chip" aria-pressed={category === o.value} onClick={() => list.set({ category: o.value })}>
                  {o.label}
                </button>
              ))}
            </span>
          )}
          {!phone && (
            <span className="tools__end">
              <SearchField label={t.searchLabel} placeholder={t.searchPlaceholder} value={q} onCommit={(v) => list.set({ q: v.trim() })} />
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
