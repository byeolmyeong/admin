import { useRef } from 'react';
import type { ReactNode } from 'react';

/** 이만큼 끌어내리면 닫는다(px) */
const DRAG_CLOSE = 80;

interface Props {
  /** 읽어 주는 이름(화면에 제목은 없다 — 결정 003 의 5) */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** 폰의 아래 시트: 제목 없음, 어두운 곳 누르기 · 손잡이를 아래로 끌면 닫힌다. */
export function Sheet({ label, onClose, children }: Props) {
  const startY = useRef<number | null>(null);
  return (
    <div className="sheet-layer">
      <div className="sheet-layer__backdrop" data-testid="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div
          className="sheet__grab"
          data-testid="sheet-grab"
          aria-hidden="true"
          onPointerDown={(e) => {
            startY.current = e.clientY;
          }}
          onPointerMove={(e) => {
            if (startY.current !== null && e.clientY - startY.current > DRAG_CLOSE) {
              startY.current = null;
              onClose();
            }
          }}
          onPointerUp={() => {
            startY.current = null;
          }}
        />
        {children}
      </div>
    </div>
  );
}
