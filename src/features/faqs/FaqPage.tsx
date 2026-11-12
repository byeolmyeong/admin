import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Empty, LoadError, Loading, Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import seed from '../../content/faq-seed.json';
import { strings } from '../../content/strings';
import type { FaqPatch } from '../../lib/api/admin';
import type { Faq } from '../../lib/api/types';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatDateTime } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';

const t = strings.faqs;
const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

type Message = { tone: 'success' | 'info' | 'error'; text: string };
type Draft = { question: string; answer: string };

interface FormProps {
  title: string;
  submitLabel: string;
  help?: string;
  initial: Draft;
  /** 실패하면 던진다(폼이 문구로 바꿔 보인다). */
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}

function FaqForm({ title, submitLabel, help, initial, onSubmit, onCancel }: FormProps) {
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 서버와 같이 앞뒤 공백을 뗀 코드 포인트 수로 센다.
  const questionCount = codePointLength(question.trim());
  const answerCount = codePointLength(answer.trim());
  const valid = questionCount >= 1 && questionCount <= QUESTION_MAX && answerCount >= 1 && answerCount <= ANSWER_MAX;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ question: question.trim(), answer: answer.trim() });
    } catch (e) {
      setError(errorMessage(e, t.errors));
      setBusy(false);
    }
  };

  return (
    <form className="card form" aria-label={title} onSubmit={submit} noValidate>
      <h2 className="section-title">{title}</h2>
      {help && <p className="quiet">{help}</p>}
      <TextField label={t.question} value={question} onChange={setQuestion} counter={{ count: questionCount, max: QUESTION_MAX }} />
      <TextField
        label={t.answer}
        value={answer}
        onChange={setAnswer}
        multiline
        rows={8}
        help={t.textHelp}
        counter={{ count: answerCount, max: ANSWER_MAX }}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="row row--end">
        <button type="button" className="btn btn--secondary btn--small" onClick={onCancel} disabled={busy}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn btn--primary btn--small" disabled={busy || !valid}>
          {busy ? strings.common.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function FaqPage() {
  const { api } = useAuth();
  const { state, reload, setData } = useLoad(useCallback(() => api.listFaqs(), [api]));
  const [editing, setEditing] = useState<'new' | Faq | null>(null);
  const [removing, setRemoving] = useState<Faq | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const faqs = state.status === 'ready' ? state.data : null;

  /** 한 번에 하나씩만 보낸다. 지워진 글(NOT_FOUND)이면 목록을 다시 받는다. */
  const run = async (work: () => Promise<Message>) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await work());
    } catch (e) {
      const code = errorCode(e);
      if (code === 'NOT_FOUND' || code === 'INVALID_ORDER') {
        setMessage({ tone: 'info', text: code === 'NOT_FOUND' ? t.goneReloaded : t.orderChanged });
        reload();
      } else {
        setMessage({ tone: 'error', text: errorMessage(e, t.errors) });
      }
    } finally {
      setBusy(false);
    }
  };

  const replace = (list: Faq[], next: Faq) => list.map((item) => (item.id === next.id ? next : item));

  const create = async (draft: Draft) => {
    if (!faqs) return;
    const made = await api.createFaq({ ...draft, published: false });
    setData([...faqs, made]);
    setEditing(null);
    setMessage({ tone: 'success', text: t.done.created });
  };

  const save = async (target: Faq, draft: Draft) => {
    if (!faqs) return;
    const patch: FaqPatch = {};
    if (draft.question !== target.question) patch.question = draft.question;
    if (draft.answer !== target.answer) patch.answer = draft.answer;
    if (Object.keys(patch).length > 0) {
      try {
        setData(replace(faqs, await api.patchFaq(target.id, patch)));
      } catch (e) {
        if (errorCode(e) !== 'NOT_FOUND') throw e;
        setEditing(null);
        setMessage({ tone: 'info', text: t.goneReloaded });
        reload();
        return;
      }
    }
    setEditing(null);
    setMessage({ tone: 'success', text: t.done.saved });
  };

  const setPublished = (target: Faq, published: boolean) =>
    run(async () => {
      const next = await api.patchFaq(target.id, { published });
      if (faqs) setData(replace(faqs, next));
      return { tone: 'success', text: published ? t.done.published : t.done.unpublished };
    });

  const remove = (target: Faq) =>
    run(async () => {
      try {
        await api.deleteFaq(target.id);
      } finally {
        setRemoving(null);
      }
      if (faqs) setData(faqs.filter((item) => item.id !== target.id));
      return { tone: 'success', text: t.done.removed };
    });

  const move = (list: Faq[], index: number, by: -1 | 1) =>
    run(async () => {
      const ids = list.map((item) => item.id);
      const [moved] = ids.splice(index, 1);
      if (moved !== undefined) ids.splice(index + by, 0, moved);
      setData(await api.orderFaqs(ids));
      return { tone: 'success', text: t.done.moved };
    });

  /** 초안 가운데 같은 질문이 없는 것만 비공개로 만든다. 하나라도 실패하면 멈춘다. */
  const importSeed = async () => {
    if (busy || !faqs) return;
    const have = new Set(faqs.map((item) => item.question.trim()));
    const missing = seed.filter((entry) => !have.has(entry.question.trim()));
    if (missing.length === 0) {
      setMessage({ tone: 'info', text: t.seed.nothing });
      return;
    }
    setBusy(true);
    setMessage({ tone: 'info', text: t.seed.working });
    let created = 0;
    try {
      for (const entry of missing) {
        await api.createFaq({ question: entry.question, answer: entry.answer, published: false });
        created += 1;
      }
      setMessage({ tone: 'success', text: t.seed.done(created, seed.length - missing.length) });
    } catch (e) {
      setMessage({ tone: 'error', text: `${t.seed.stopped(created)} ${errorMessage(e, t.errors)}` });
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">{t.title}</h1>
        <div className="row">
          <button type="button" className="btn btn--secondary btn--small" onClick={importSeed} disabled={busy || !faqs}>
            {t.seed.button}
          </button>
          <button type="button" className="btn btn--primary btn--small" onClick={() => setEditing('new')} disabled={!faqs || editing !== null}>
            {t.create}
          </button>
        </div>
      </header>
      <p className="note">{t.cacheNote}</p>
      <p className="note note--quiet">{t.seed.help}</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {editing === 'new' && (
        <FaqForm
          title={t.createTitle}
          submitLabel={t.createSubmit}
          help={t.createHelp}
          initial={{ question: '', answer: '' }}
          onSubmit={create}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing !== null && editing !== 'new' && (
        <FaqForm
          key={editing.id}
          title={t.editTitle}
          submitLabel={t.editSubmit}
          initial={{ question: editing.question, answer: editing.answer }}
          onSubmit={(draft) => save(editing, draft)}
          onCancel={() => setEditing(null)}
        />
      )}

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
      {faqs && faqs.length === 0 && <Empty>{t.empty}</Empty>}
      {faqs && faqs.length > 0 && (
        <ol className="faq-list" aria-label={t.listLabel}>
          {faqs.map((item, index) => (
            <li key={item.id}>
              <article className="card faq" aria-label={item.question}>
                <div className="faq__head">
                  <h2 className="faq__question">{item.question}</h2>
                  <span className={item.published ? 'badge badge--new' : 'badge badge--quiet'}>
                    {item.published ? t.published : t.unpublished}
                  </span>
                </div>
                {/* 꾸밈 없는 글자다: HTML 로 해석하지 않는다. */}
                <p className="prewrap">{item.answer}</p>
                <p className="quiet">{t.updated(item.updatedBy?.name ?? null, formatDateTime(item.updatedAt))}</p>
                <div className="row">
                  <button type="button" className="btn btn--secondary btn--small" disabled={busy || index === 0} onClick={() => move(faqs, index, -1)}>
                    {t.moveUp}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    disabled={busy || index === faqs.length - 1}
                    onClick={() => move(faqs, index, 1)}
                  >
                    {t.moveDown}
                  </button>
                  <span className="row__gap" />
                  <button type="button" className="btn btn--secondary btn--small" disabled={busy || editing !== null} onClick={() => setEditing(item)}>
                    {t.edit}
                  </button>
                  <button type="button" className="btn btn--secondary btn--small" disabled={busy} onClick={() => setPublished(item, !item.published)}>
                    {item.published ? t.unpublish : t.publish}
                  </button>
                  <button type="button" className="btn btn--danger-quiet btn--small" disabled={busy} onClick={() => setRemoving(item)}>
                    {t.remove}
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      {removing && (
        <ConfirmDialog
          title={t.removeTitle}
          body={t.removeBody(removing.question)}
          confirmLabel={t.remove}
          danger
          busy={busy}
          onConfirm={() => remove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
