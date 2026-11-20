import { useCallback, useId, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LoadError, Loading } from '../../components/Feedback';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Select } from '../../components/Select';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import { INQUIRY_STATUSES } from '../../lib/api/types';
import type { Inquiry } from '../../lib/api/types';
import type { InquiryPatch } from '../../lib/api/admin';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatKst, mailtoHref } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel, statusLabel, statusTone } from './labels';
import { useWaitingCount } from './WaitingCount';

const t = strings.inquiries.detail;
const MEMO_MAX = 2000;
const STATUS_OPTIONS = INQUIRY_STATUSES.map((value) => ({ value, label: statusLabel(value) }));

/** 옛 문의(이메일로 답장받던 때)의 답장 이메일. 1.0.0 앱 안 문의에는 없다(앱 결정 058). */
function ReplyEmail({ email }: { email: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };
  return (
    <div className="inquiry__email">
      <span className="inquiry__label">{t.replyEmail}</span>
      <span className="mono selectable">{email}</span>
      <span className="inquiry__email-actions">
        <button type="button" className="btn btn--secondary" onClick={copy}>
          {t.copy}
        </button>
        <a className="btn btn--secondary" href={mailtoHref(email)}>
          {t.mailto}
        </a>
      </span>
      <p className="field__help">{t.mailNote}</p>
    </div>
  );
}

interface DetailProps {
  inquiry: Inquiry;
  onChanged: (next: Inquiry) => void;
  onGone: () => void;
}

function Detail({ inquiry, onChanged, onGone }: DetailProps) {
  const { api } = useAuth();
  const toast = useToast();
  const { refresh } = useWaitingCount();
  const bodyId = useId();
  const memoId = useId();
  const memoCountId = useId();
  const [memo, setMemo] = useState(inquiry.memo ?? '');
  const [busy, setBusy] = useState(false);
  const memoCount = codePointLength(memo.trim());

  const patch = async (change: InquiryPatch, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await api.patchInquiry(inquiry.id, change);
      onChanged(next);
      if ('memo' in change) setMemo(next.memo ?? '');
      if ('status' in change) refresh();
      toast.success(done);
    } catch (e) {
      // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
      if (errorCode(e) === 'NOT_FOUND') onGone();
      else toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split">
      <section className="card inquiry">
        <span className="inquiry__meta">
          <Pill tone="mute">{categoryLabel(inquiry.category)}</Pill>
          <Pill tone={statusTone(inquiry.status)}>{statusLabel(inquiry.status)}</Pill>
          <span className="mono muted">{formatKst(inquiry.createdAt)}</span>
        </span>
        {/* 사용자가 쓴 글이다: 글자로만 넣는다(React 가 이스케이프한다). dangerouslySetInnerHTML 을 쓰지 않는다. */}
        <p className="inquiry__body prewrap" id={bodyId} aria-label={t.body}>
          {inquiry.body}
        </p>
        <div className="inquiry__owner">
          <span className="inquiry__owner-text">
            <span className="inquiry__label">{t.owner}</span>
            <span className="mono selectable">{inquiry.ownerRef}</span>
            <span className="field__help">{t.ownerHelp}</span>
          </span>
          <Link className="link-more" to={`/audit-logs?actorType=USER&actorRef=${encodeURIComponent(inquiry.ownerRef)}`}>
            {t.ownerActions}
            <span aria-hidden="true"> ›</span>
          </Link>
        </div>
        {inquiry.replyEmail !== null && <ReplyEmail email={inquiry.replyEmail} />}
      </section>

      <div className="side-cards">
        <section className="card side-card">
          <h2 className="sec-title">{t.status}</h2>
          <Select
            variant="field"
            ariaLabel={t.status}
            value={inquiry.status}
            defaultValue={inquiry.status}
            options={STATUS_OPTIONS}
            disabled={busy}
            onChange={(value) => value !== '' && value !== inquiry.status && patch({ status: value }, t.statusSaved)}
          />
          <p className="field__help">
            {inquiry.handledBy ? t.handled(inquiry.handledBy.name, inquiry.handledAt === null ? '' : formatKst(inquiry.handledAt)) : t.notHandled}
          </p>
        </section>

        <section className="card side-card">
          <h2 className="sec-title">
            <label htmlFor={memoId}>{t.memo}</label>
            <small>{t.memoNote}</small>
          </h2>
          <textarea
            id={memoId}
            className="input input--multiline input--memo"
            placeholder={t.memoPlaceholder}
            value={memo}
            aria-describedby={memoCountId}
            aria-invalid={memoCount > MEMO_MAX ? true : undefined}
            onChange={(e) => setMemo(e.target.value)}
          />
          <div className="side-card__foot">
            <span className={memoCount > MEMO_MAX ? 'field__count field__count--over' : 'field__count'} id={memoCountId}>
              {strings.common.counter(memoCount, MEMO_MAX)}
            </span>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || memoCount > MEMO_MAX}
              onClick={() => patch({ memo: memo.trim() === '' ? null : memo.trim() }, t.memoSaved)}
            >
              {t.memoSave}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/** 문의 상세(D3): 지금 계약의 처리 상태 · 내부 메모. 답변 · 앱 미리보기는 서버 S⑧ 뒤(계획 D①). */
export function InquiryDetailPage() {
  const { api } = useAuth();
  const { id = '' } = useParams();
  const location = useLocation();
  const [gone, setGone] = useState(false);
  const { state, reload, setData } = useLoad(useCallback(() => api.getInquiry(id), [api, id]));

  const listSearch = (location.state as { listSearch?: unknown } | null)?.listSearch;
  const back = typeof listSearch === 'string' && listSearch !== '' ? `/inquiries?${listSearch}` : '/inquiries';
  const notFound = gone || (state.status === 'error' && errorCode(state.error) === 'NOT_FOUND');

  return (
    <>
      <PageHeader title={strings.inquiries.title} back={{ to: back }} />
      <div className="body">
        {notFound ? (
          <EmptyState title={t.gone} />
        ) : (
          <>
            {state.status === 'loading' && <Loading />}
            {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
            {state.status === 'ready' && <Detail key={state.data.id} inquiry={state.data} onChanged={setData} onGone={() => setGone(true)} />}
          </>
        )}
      </div>
    </>
  );
}
