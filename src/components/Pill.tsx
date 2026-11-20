import type { ReactNode } from 'react';

export type PillTone = 'ok' | 'bad' | 'warn' | 'pri' | 'mute';

/** 작은 상태 표(답변 대기 · 활성 · 관리자 등). dot 은 앞에 점. */
export function Pill({ tone, dot, children }: { tone: PillTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`pill pill--${tone}`}>
      {dot && <span className="pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
