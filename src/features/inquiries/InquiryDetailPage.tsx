import { useCallback, useId, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LoadError, Loading, Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import { INQUIRY_STATUSES } from '../../lib/api/types';
import type { Inquiry } from '../../lib/api/types';
import type { InquiryPatch } from '../../lib/api/admin';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatDateTime, mailtoHref } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel, statusLabel } from './labels';

const t = strings.inquiries.detail;
const MEMO_MAX = 2000;

type Message = { tone: 'success' | 'error'; text: string };

function ReplyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState<Message | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied({ tone: 'success', text: t.copied });
    } catch {
      setCopied({ tone: 'error', text: t.copyFailed });
    }
  };
  return (
    <>
      <p className="mono selectable">{email}</p>
      <div className="row">
        <button type="button" className="btn btn--secondary btn--small" onClick={copy}>
          {t.copy}
        </button>
        <a className="btn btn--secondary btn--small" href={mailtoHref(email)}>
          {t.mailto}
        </a>
      </div>
      {copied && <Notice tone={copied.tone}>{copied.text}</Notice>}
      <p className="quiet">{t.mailNote}</p>
    </>
  );
}

interface DetailProps {
  inquiry: Inquiry;
  onChanged: (next: Inquiry) => void;
  onGone: () => void;
}

function Detail({ inquiry, onChanged, onGone }: DetailProps) {
  const { api } = useAuth();
  const bodyId = useId();
  const statusId = useId();
  const [memo, setMemo] = useState(inquiry.memo ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const memoCount = codePointLength(memo.trim());

  const patch = async (change: InquiryPatch, done: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await api.patchInquiry(inquiry.id, change);
      onChanged(next);
      if ('memo' in change) setMemo(next.memo ?? '');
      setMessage({ tone: 'success', text: done });
    } catch (e) {
      if (errorCode(e) === 'NOT_FOUND') onGone();
      else setMessage({ tone: 'error', text: errorMessage(e, t.errors) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail">
      <section className="card detail__main">
        <dl className="facts">
          <div>
            <dt>{t.category}</dt>
            <dd>{categoryLabel(inquiry.category)}</dd>
          </div>
          <div>
            <dt>{t.createdAt}</dt>
            <dd className="mono">{formatDateTime(inquiry.createdAt)}</dd>
          </div>
          <div>
            <dt>{t.ownerRef}</dt>
            <dd className="mono selectable">{inquiry.ownerRef}</dd>
          </div>
        </dl>
        <p className="quiet">
          {t.ownerRefHelp}{' '}
          <Link to={`/audit-logs?actorType=USER&actorRef=${encodeURIComponent(inquiry.ownerRef)}`}>{t.ownerActions}</Link>
        </p>

        <h2 className="section-title" id={bodyId}>
          {t.body}
        </h2>
        {/* 사용자가 쓴 글이다: 글자로만 넣는다(React 가 이스케이프한다). dangerouslySetInnerHTML 을 쓰지 않는다. */}
        <p className="prewrap" aria-labelledby={bodyId}>
          {inquiry.body}
        </p>

        <h2 className="section-title">{t.replyEmail}</h2>
        {inquiry.replyEmail === null ? <p className="quiet">{t.noReplyEmail}</p> : <ReplyEmail email={inquiry.replyEmail} />}
      </section>

      <section className="card detail__side">
        <h2 className="section-title" id={statusId}>
          {t.status}
        </h2>
        <div className="segments" role="group" aria-labelledby={statusId}>
          {INQUIRY_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              className="segment"
              aria-pressed={inquiry.status === value}
              disabled={busy}
              onClick={() => patch({ status: value }, t.statusSaved)}
            >
              {statusLabel(value)}
            </button>
          ))}
        </div>

        <TextField
          label={t.memo}
          value={memo}
          onChange={setMemo}
          multiline
          rows={6}
          help={t.memoHelp}
          counter={{ count: memoCount, max: MEMO_MAX }}
        />
        <button
          type="button"
          className="btn btn--primary btn--small"
          disabled={busy || memoCount > MEMO_MAX}
          onClick={() => patch({ memo: memo.trim() === '' ? null : memo.trim() }, t.memoSaved)}
        >
          {t.memoSave}
        </button>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <h2 className="section-title">{t.handled}</h2>
        {inquiry.handledBy ? (
          <p>{t.handledBy(inquiry.handledBy.name, inquiry.handledAt === null ? '' : formatDateTime(inquiry.handledAt))}</p>
        ) : (
          <p className="quiet">{t.notHandled}</p>
        )}
        <p className="quiet">{strings.common.timeZoneNote}</p>
      </section>
    </div>
  );
}

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
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">{t.title}</h1>
        <Link className="btn btn--secondary btn--small" to={back}>
          {t.back}
        </Link>
      </header>
      {notFound ? (
        <Notice tone="info">{t.gone}</Notice>
      ) : (
        <>
          {state.status === 'loading' && <Loading />}
          {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
          {state.status === 'ready' && (
            <Detail key={state.data.id} inquiry={state.data} onChanged={setData} onGone={() => setGone(true)} />
          )}
        </>
      )}
    </div>
  );
}
