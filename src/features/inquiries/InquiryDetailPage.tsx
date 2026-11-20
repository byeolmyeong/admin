import { useCallback, useId, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { LoadError, Loading } from '../../components/Feedback';
import { EmptyState } from '../../components/EmptyState';
import { isSectionShown } from '../../app/sections';
import { MoreLink } from '../../components/MoreLink';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import type { Inquiry } from '../../lib/api/types';
import type { InquiryPatch } from '../../lib/api/admin';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatKst, mailtoHref, oneLine } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel, platformLabel, providerLabel, statusLabel, statusTone } from './labels';
import { useWaitingCount } from './WaitingCount';

const t = strings.inquiries.detail;
const MEMO_MAX = 2000;
const ANSWER_MAX = 2000;

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

/** 작성자 줄(D3): 닉네임 · 로그인 수단 · 기기 · 가입, "사용자 상세 ›". 서버가 owner 를 주기 전엔 계정 코드 · 활동 기록. */
function Owner({ inquiry }: { inquiry: Inquiry }) {
  const owner = inquiry.owner ?? null;
  const name = owner?.nickname ?? inquiry.ownerRef;
  const device = owner && [platformLabel(owner.platform), owner.appVersion].filter(Boolean).join(' ');
  const via = owner ? [providerLabel(owner.provider), device || null].filter((x): x is string => Boolean(x)) : [];
  const joined = owner?.joinedAt ? t.joined(formatKst(owner.joinedAt)) : null;
  // 시안 v184: 데스크톱은 "카카오 · iOS 1.0.2 · 가입 …" 한 줄, 폰은 닉네임 줄 아래로 두 줄(수단 · 기기 / 가입).
  return (
    <div className="inquiry__owner">
      <span className="avatar" aria-hidden="true">
        {[...name][0]}
      </span>
      <span className={owner?.nickname ? 'inquiry__owner-name' : 'inquiry__owner-name mono'}>{name}</span>
      {(via.length > 0 || joined) && (
        <span className="inquiry__owner-meta muted">
          {via.length > 0 && <span>{t.ownerMeta(via)}</span>}
          {via.length > 0 && joined && (
            <span className="inquiry__owner-sep" aria-hidden="true">
              {' · '}
            </span>
          )}
          {joined && <span>{joined}</span>}
        </span>
      )}
      {/* 사용자 구역을 숨긴 운영(VITE_HIDDEN_SECTIONS=users)에서는 링크 없이 글로만(소유자 2026-11-20) */}
      {owner ? (
        isSectionShown('/users') && (
          <span className="inquiry__owner-link">
            <MoreLink to={`/users/${encodeURIComponent(owner.userId)}`}>{t.userDetail}</MoreLink>
          </span>
        )
      ) : (
        <span className="inquiry__owner-link">
          <MoreLink to={`/audit-logs?actorType=USER&actorRef=${encodeURIComponent(inquiry.ownerRef)}`}>{t.ownerActions}</MoreLink>
        </span>
      )}
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
  const answerId = useId();
  const answerCountId = useId();
  const memoId = useId();
  const [answer, setAnswer] = useState(inquiry.answer ?? inquiry.answerDraft ?? '');
  const [memo, setMemo] = useState(inquiry.memo ?? '');
  const [busy, setBusy] = useState(false);
  const answerCount = codePointLength(answer.trim());
  const memoCount = codePointLength(memo.trim());

  const patch = async (change: InquiryPatch, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await api.patchInquiry(inquiry.id, change);
      onChanged(next);
      if ('memo' in change) setMemo(next.memo ?? '');
      if ('answer' in change) refresh();
      toast.success(done);
    } catch (e) {
      // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
      if (errorCode(e) === 'NOT_FOUND') onGone();
      else toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
    }
  };

  /** 내부 메모는 칸을 떠날 때 바뀌었으면 저장한다(D3 — 저장 버튼 없음). */
  const saveMemo = () => {
    const next = memo.trim() === '' ? null : memo.trim();
    if (next === (inquiry.memo ?? null)) return;
    if (memoCount > MEMO_MAX) {
      toast.error(t.errors.INVALID_MEMO);
      return;
    }
    void patch({ memo: next }, t.memoSaved);
  };

  const answerOk = answerCount >= 1 && answerCount <= ANSWER_MAX;
  const answered = inquiry.answeredAt ?? null;

  return (
    <div className="split">
      <div className="side-cards">
        <section className="card inquiry">
          <span className="inquiry__meta">
            <Pill tone="mute">{categoryLabel(inquiry.category)}</Pill>
            <Pill tone={statusTone(inquiry.status)}>{statusLabel(inquiry.status)}</Pill>
            <span className="mono muted">{formatKst(inquiry.createdAt)}</span>
          </span>
          {/* 사용자가 쓴 글이다: 글자로만 넣는다(React 가 이스케이프한다). dangerouslySetInnerHTML 을 쓰지 않는다. */}
          <p className="inquiry__body prewrap" aria-label={t.body}>
            {inquiry.body}
          </p>
          <Owner inquiry={inquiry} />
          {inquiry.replyEmail !== null && <ReplyEmail email={inquiry.replyEmail} />}
        </section>

        <section className="card answer">
          <h2 className="sec-title">
            <label htmlFor={answerId}>{t.answer}</label>
          </h2>
          <div className="textarea-box">
            <textarea
              id={answerId}
              className="textarea-box__input"
              value={answer}
              aria-describedby={answerCountId}
              aria-invalid={answerCount > ANSWER_MAX ? true : undefined}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <span className={answerCount > ANSWER_MAX ? 'field__count field__count--over' : 'field__count'} id={answerCountId}>
              {strings.common.counter(answerCount, ANSWER_MAX)}
            </span>
          </div>
          <p className="field__help">{t.answerHelp}</p>
          {answered && <p className="field__help">{t.answered((inquiry.answeredBy ?? inquiry.handledBy)?.name ?? '', formatKst(answered))}</p>}
          <div className="answer__actions">
            <button type="button" className="btn btn--secondary" disabled={busy || answerCount > ANSWER_MAX} onClick={() => patch({ answerDraft: answer.trim() === '' ? null : answer.trim() }, t.drafted)}>
              {t.draft}
            </button>
            <button type="button" className="btn btn--primary" disabled={busy || !answerOk} onClick={() => patch({ answer: answer.trim() }, t.sent)}>
              {t.send}
            </button>
          </div>
        </section>
      </div>

      <div className="side-cards">
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
            aria-invalid={memoCount > MEMO_MAX ? true : undefined}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={saveMemo}
          />
        </section>

        <section className="card side-card" aria-labelledby="preview-title">
          <h2 className="sec-title" id="preview-title">
            {t.preview}
          </h2>
          <div className="app-preview">
            <div className="app-preview__bubble">
              <span className="app-preview__label">{t.previewMine(categoryLabel(inquiry.category))}</span>
              {oneLine(inquiry.body, 40)}
            </div>
            <div className="app-preview__bubble app-preview__bubble--answer">
              <span className="app-preview__label">{t.previewAnswer}</span>
              {answer.trim() === '' ? t.previewEmpty : oneLine(answer, 40)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** 문의 상세(D3): 문의 · 작성자 · 답변(임시 저장 · 전송), 오른쪽 내부 메모 · 앱 미리보기. */
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
