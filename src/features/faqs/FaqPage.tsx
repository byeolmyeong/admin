import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadError, Loading } from '../../components/Feedback';
import { Icon } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { TextField } from '../../components/TextField';
import { useToast } from '../../components/Toast';
import seed from '../../content/faq-seed.json';
import { strings } from '../../content/strings';
import type { FaqPatch } from '../../lib/api/admin';
import type { Faq } from '../../lib/api/types';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatKst } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';

const t = strings.faqs;
const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

type Draft = { question: string; answer: string };

interface EditorProps {
  /** null 이면 새 질문 */
  target: Faq | null;
  busy: boolean;
  onSubmit: (draft: Draft) => void;
  onCancel: () => void;
  onPublish: (published: boolean) => void;
  onRemove: () => void;
}

/** 오른쪽 편집 카드(D8): 질문 · 답 · 글자 수, 삭제 · 공개/비공개 · 저장. 새 질문이면 취소 · 추가. */
function FaqEditor({ target, busy, onSubmit, onCancel, onPublish, onRemove }: EditorProps) {
  const [question, setQuestion] = useState(target?.question ?? '');
  const [answer, setAnswer] = useState(target?.answer ?? '');
  // 서버와 같이 앞뒤 공백을 뗀 코드 포인트 수로 센다.
  const questionCount = codePointLength(question.trim());
  const answerCount = codePointLength(answer.trim());
  const valid = questionCount >= 1 && questionCount <= QUESTION_MAX && answerCount >= 1 && answerCount <= ANSWER_MAX;
  const title = target ? t.editTitle : t.createTitle;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && valid) onSubmit({ question: question.trim(), answer: answer.trim() });
  };

  return (
    <form className="card side-card faq-editor" aria-label={title} onSubmit={submit} noValidate>
      <h2 className="sec-title">
        {title}
        {target && <Pill tone={target.published ? 'ok' : 'mute'}>{target.published ? t.published : t.unpublished}</Pill>}
      </h2>
      {!target && <p className="field__help">{t.createHelp}</p>}
      <TextField label={t.question} value={question} onChange={setQuestion} counter={{ count: questionCount, max: QUESTION_MAX }} />
      <TextField label={t.answer} value={answer} onChange={setAnswer} multiline rows={6} help={t.textHelp} counter={{ count: answerCount, max: ANSWER_MAX }} />
      {target && <p className="field__help">{t.updated(target.updatedBy?.name ?? null, formatKst(target.updatedAt))}</p>}
      <div className="faq-editor__actions">
        {target ? (
          <>
            <button type="button" className="btn btn--danger" disabled={busy} onClick={onRemove}>
              {t.remove}
            </button>
            <span className="faq-editor__end">
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => onPublish(!target.published)}>
                {target.published ? t.unpublish : t.publish}
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
                {t.save}
              </button>
            </span>
          </>
        ) : (
          <span className="faq-editor__end">
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={onCancel}>
              {strings.common.cancel}
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
              {t.add}
            </button>
          </span>
        )}
      </div>
    </form>
  );
}

/** 자주 묻는 질문(D8): 왼쪽 목록(번호 · 질문 · 공개 여부 · ⌃⌄ 순서), 오른쪽 편집. */
export function FaqPage() {
  const { api } = useAuth();
  const toast = useToast();
  const { state, reload, setData } = useLoad(useCallback(() => api.listFaqs(), [api]));
  /** 편집 중인 질문 id, 'new' 는 새 질문 */
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [removing, setRemoving] = useState<Faq | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const faqs = state.status === 'ready' ? state.data : null;
  const target = faqs && selected !== null && selected !== 'new' ? (faqs.find((f) => f.id === selected) ?? null) : null;

  /** 한 번에 하나씩만 보낸다. 지워졌거나(NOT_FOUND) 순서가 어긋났으면(INVALID_ORDER) 목록을 다시 받는다. */
  const run = async (work: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    try {
      toast.success(await work());
    } catch (e) {
      const code = errorCode(e);
      if (code === 'NOT_FOUND' || code === 'INVALID_ORDER') {
        toast.success(code === 'NOT_FOUND' ? t.goneReloaded : t.orderChanged);
        setSelected(null);
        reload();
      } else {
        // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
        toast.error(errorMessage(e, t.errors));
      }
    } finally {
      setBusy(false);
    }
  };

  const replace = (list: Faq[], next: Faq) => list.map((item) => (item.id === next.id ? next : item));

  const create = (draft: Draft) =>
    run(async () => {
      const made = await api.createFaq({ ...draft, published: false });
      setData([...(faqs ?? []), made]);
      setSelected(made.id);
      return t.done.created;
    });

  const save = (item: Faq, draft: Draft) =>
    run(async () => {
      const patch: FaqPatch = {};
      if (draft.question !== item.question) patch.question = draft.question;
      if (draft.answer !== item.answer) patch.answer = draft.answer;
      if (Object.keys(patch).length > 0 && faqs) setData(replace(faqs, await api.patchFaq(item.id, patch)));
      return t.done.saved;
    });

  const setPublished = (item: Faq, published: boolean) =>
    run(async () => {
      const next = await api.patchFaq(item.id, { published });
      if (faqs) setData(replace(faqs, next));
      return published ? t.done.published : t.done.unpublished;
    });

  const remove = (item: Faq) =>
    run(async () => {
      try {
        await api.deleteFaq(item.id);
      } finally {
        setRemoving(null);
      }
      if (faqs) setData(faqs.filter((f) => f.id !== item.id));
      setSelected(null);
      return t.done.removed;
    });

  const move = (list: Faq[], index: number, by: -1 | 1) =>
    run(async () => {
      const ids = list.map((item) => item.id);
      const [moved] = ids.splice(index, 1);
      if (moved !== undefined) ids.splice(index + by, 0, moved);
      setData(await api.orderFaqs(ids));
      return t.done.moved;
    });

  /** 기본 질문 가운데 같은 질문이 없는 것만 비공개로 만든다. 하나라도 실패하면 멈춘다. */
  const importSeed = async () => {
    if (busy || !faqs) return;
    const have = new Set(faqs.map((item) => item.question.trim()));
    const missing = seed.filter((entry) => !have.has(entry.question.trim()));
    if (missing.length === 0) {
      toast.success(t.seed.nothing);
      return;
    }
    setBusy(true);
    setSeeding(true);
    let created = 0;
    try {
      for (const entry of missing) {
        await api.createFaq({ question: entry.question, answer: entry.answer, published: false });
        created += 1;
      }
      toast.success(t.seed.done(created, seed.length - missing.length));
    } catch (e) {
      toast.error(`${t.seed.stopped(created)} ${errorMessage(e, t.errors)}`);
    } finally {
      setBusy(false);
      setSeeding(false);
      reload();
    }
  };

  return (
    <>
      <PageHeader title={t.title}>
        <button type="button" className="btn btn--secondary" onClick={importSeed} disabled={busy || !faqs}>
          {seeding ? t.seed.working : t.seed.button}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setSelected('new')} disabled={!faqs}>
          {t.create}
        </button>
      </PageHeader>
      <div className="body">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {faqs && faqs.length === 0 && selected !== 'new' && <EmptyState icon="help" title={t.empty.title} body={t.empty.body} />}
        {faqs && (faqs.length > 0 || selected === 'new') && (
          <div className="split split--faq">
            <section className="card faq-list" aria-labelledby="faq-list-title">
              <h2 className="sec-title faq-list__head" id="faq-list-title">
                {t.listTitle(faqs.length)}
                <small>{t.listNote}</small>
              </h2>
              <ol aria-label={t.listLabel}>
                {faqs.map((item, index) => (
                  <li key={item.id} className={item.id === selected ? 'faq-row is-selected' : 'faq-row'}>
                    <button type="button" className="faq-row__main" aria-pressed={item.id === selected} aria-label={item.question} onClick={() => setSelected(item.id)}>
                      <span className="faq-row__no" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="faq-row__q">{item.question}</span>
                    </button>
                    <Pill tone={item.published ? 'ok' : 'mute'}>{item.published ? t.published : t.unpublished}</Pill>
                    <button type="button" className="icon-button icon-button--plain" aria-label={t.moveUp(item.question)} disabled={busy || index === 0} onClick={() => move(faqs, index, -1)}>
                      <Icon name="up" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--plain"
                      aria-label={t.moveDown(item.question)}
                      disabled={busy || index === faqs.length - 1}
                      onClick={() => move(faqs, index, 1)}
                    >
                      <Icon name="down" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            {selected === 'new' ? (
              <FaqEditor key="new" target={null} busy={busy} onSubmit={create} onCancel={() => setSelected(null)} onPublish={() => undefined} onRemove={() => undefined} />
            ) : target ? (
              <FaqEditor
                key={target.id}
                target={target}
                busy={busy}
                onSubmit={(draft) => save(target, draft)}
                onCancel={() => setSelected(null)}
                onPublish={(published) => setPublished(target, published)}
                onRemove={() => setRemoving(target)}
              />
            ) : (
              <div className="card side-card">
                <p className="field__help">{t.pickHint}</p>
              </div>
            )}
          </div>
        )}
      </div>

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
    </>
  );
}
