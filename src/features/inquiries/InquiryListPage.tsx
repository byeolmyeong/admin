import { useCallback, useId } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, LoadError, Loading } from '../../components/Feedback';
import { strings } from '../../content/strings';
import { INQUIRY_CATEGORIES, INQUIRY_STATUSES } from '../../lib/api/types';
import type { InquiryPage } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatDateTime, oneLine } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel, statusLabel } from './labels';

const t = strings.inquiries;
/** 한 쪽의 개수(계약: 1~100, 기본 20) */
const PAGE_SIZE = 20;
/** 목록 한 줄 요약의 길이 */
const EXCERPT = 80;

const oneOf = (value: string | null, allowed: readonly string[]): string => (value !== null && allowed.includes(value) ? value : '');
const pageOf = (value: string | null): number => (value !== null && /^\d{1,6}$/.test(value) ? Number(value) : 0);

function Rows({ data }: { data: InquiryPage }) {
  const [params] = useSearchParams();
  return (
    <table className="table" aria-label={t.listLabel}>
      <thead>
        <tr>
          <th scope="col">{t.columns.category}</th>
          <th scope="col">{t.columns.status}</th>
          <th scope="col">{t.columns.excerpt}</th>
          <th scope="col">{t.columns.ownerRef}</th>
          <th scope="col">{t.columns.createdAt}</th>
          <th scope="col">{t.columns.handler}</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item) => (
          <tr key={item.id}>
            <td className="table__nowrap">{categoryLabel(item.category)}</td>
            <td className="table__nowrap">
              <span className={`badge badge--${item.status === 'NEW' ? 'new' : item.status === 'DONE' ? 'quiet' : 'plain'}`}>
                {statusLabel(item.status)}
              </span>
            </td>
            <td className="table__main">
              {/* 돌아올 때 같은 조건의 목록으로 오도록 지금의 조건을 들려 보낸다 */}
              <Link to={`/inquiries/${encodeURIComponent(item.id)}`} state={{ listSearch: params.toString() }}>
                {oneLine(item.body, EXCERPT)}
              </Link>
            </td>
            <td className="table__nowrap mono">{item.ownerRef}</td>
            <td className="table__nowrap mono">{formatDateTime(item.createdAt)}</td>
            <td className="table__nowrap">{item.handledBy ? item.handledBy.name : <span className="quiet">{t.notHandled}</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InquiryListPage() {
  const { api } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = oneOf(params.get('status'), INQUIRY_STATUSES);
  const category = oneOf(params.get('category'), INQUIRY_CATEGORIES);
  const page = pageOf(params.get('page'));
  const statusId = useId();
  const categoryId = useId();

  const { state, reload } = useLoad(
    useCallback(() => api.listInquiries({ status, category, page, size: PAGE_SIZE }), [api, status, category, page]),
  );

  const go = (next: { status: string; category: string; page: number }) => {
    const search = new URLSearchParams();
    if (next.status) search.set('status', next.status);
    if (next.category) search.set('category', next.category);
    if (next.page > 0) search.set('page', String(next.page));
    setParams(search);
  };

  const data = state.status === 'ready' ? state.data : null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">{t.title}</h1>
          {data && <p className="page__sub">{t.total(data.total)}</p>}
        </div>
        <div className="filters">
          <div className="filter">
            <label htmlFor={statusId}>{t.filterStatus}</label>
            <select id={statusId} className="select" value={status} onChange={(e) => go({ status: e.target.value, category, page: 0 })}>
              <option value="">{t.all}</option>
              {INQUIRY_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter">
            <label htmlFor={categoryId}>{t.filterCategory}</label>
            <select id={categoryId} className="select" value={category} onChange={(e) => go({ status, category: e.target.value, page: 0 })}>
              <option value="">{t.all}</option>
              {INQUIRY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {categoryLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error, t.errors)} onRetry={reload} />}
      {data && data.items.length === 0 && <Empty>{data.total === 0 ? t.empty : t.emptyPage}</Empty>}
      {data && data.items.length > 0 && <Rows data={data} />}
      {data && data.total > 0 && (
        <nav className="pager" aria-label={t.pagerLabel}>
          <button type="button" className="btn btn--secondary btn--small" disabled={data.page <= 0} onClick={() => go({ status, category, page: data.page - 1 })}>
            {t.prev}
          </button>
          <span className="mono">{t.position(data.page + 1, pages)}</span>
          <button type="button" className="btn btn--secondary btn--small" disabled={data.page + 1 >= pages} onClick={() => go({ status, category, page: data.page + 1 })}>
            {t.next}
          </button>
        </nav>
      )}
      {data && <p className="note note--quiet">{strings.common.timeZoneNote}</p>}
    </div>
  );
}
