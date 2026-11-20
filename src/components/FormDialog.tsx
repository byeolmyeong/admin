import { useEffect, useId, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { strings } from '../content/strings';

interface Props {
  title: string;
  note?: string;
  submitLabel: string;
  busy?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** 칸을 채워 보내는 창(관리자 추가 · 비밀번호 재설정). 열리면 첫 칸에 초점, Esc · 바깥 누르기는 취소. */
export function FormDialog({ title, note, submitLabel, busy, onSubmit, onCancel, children }: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) onSubmit();
  };

  return (
    <div className="dialog-layer">
      <div className="dialog-layer__backdrop" data-testid="dialog-backdrop" onClick={busy ? undefined : onCancel} />
      <form className="dialog card" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={formRef} onSubmit={submit} noValidate>
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {note && <p className="dialog__body">{note}</p>}
        {children}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            {strings.common.cancel}
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
