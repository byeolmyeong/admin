import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { strings } from '../content/strings';

interface Props {
  title: string;
  body?: string;
  /** 사유 · 닉네임 등 확인 창 안의 칸 */
  children?: ReactNode;
  confirmLabel: string;
  /** 되돌릴 수 없는 일이면 확인 버튼을 빨갛게 */
  danger?: boolean;
  busy?: boolean;
  /** 필요한 칸을 채우기 전엔 확인 버튼을 흐리게(결정 003 의 5) */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 실행 전에 한 번 묻는 창. 열리면 "취소" 에 초점이 가고, Esc · 바깥 누르기는 취소다. */
export function ConfirmDialog({ title, body, children, confirmLabel, danger, busy, confirmDisabled, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="dialog-layer">
      <div className="dialog-layer__backdrop" data-testid="dialog-backdrop" onClick={busy ? undefined : onCancel} />
      <div className="dialog card" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined}>
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {body && (
          <p className="dialog__body" id={bodyId}>
            {body}
          </p>
        )}
        {children}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>
            {strings.common.cancel}
          </button>
          <button type="button" className={danger ? 'btn btn--danger' : 'btn btn--primary'} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
