import type { ReactNode } from 'react';
import { strings } from '../content/strings';

/** 불러오는 중 */
export function Loading() {
  return (
    <p className="state" role="status">
      {strings.common.loading}
    </p>
  );
}

/** 불러오지 못함. onRetry 가 있으면 다시 시도 버튼을 보인다. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {strings.common.retry}
        </button>
      )}
    </div>
  );
}

/** 화면 위의 한 줄 알림. error 는 바로 읽어 준다(alert), 나머지는 조용히(status). */
export function Notice({ tone, children }: { tone: 'info' | 'success' | 'error'; children: ReactNode }) {
  return (
    <p className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
