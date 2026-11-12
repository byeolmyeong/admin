import { useEffect, useId, useRef } from 'react';
import { strings } from '../content/strings';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  /** 되돌릴 수 없는 일이면 확인 버튼을 빨갛게 */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 실행 전에 한 번 묻는 창. 열리면 "취소" 에 초점이 가고 Esc 로 닫힌다. */
export function ConfirmDialog({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="dialog__body" id={bodyId}>
          {body}
        </p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>
            {strings.common.cancel}
          </button>
          <button type="button" className={danger ? 'btn btn--danger' : 'btn btn--primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
