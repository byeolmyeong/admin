import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Stats } from '../../lib/api/types';
import { useAuth } from '../auth/AuthContext';

/**
 * 답변 대기 문의 수 — 지금 계약에서는 현황(`GET /admin/stats`)의 새 문의(NEW) 수다.
 * 서버 결정 043 의 3(`inquiries.waiting`)이 생기면 그 값으로 바꾼다.
 */
export const waitingOf = (stats: Stats): number => stats.inquiries.byStatus.NEW ?? 0;

interface WaitingValue {
  /** 받지 못했으면 null(숫자를 보이지 않는다) */
  count: number | null;
  /** 문의 상태를 바꾼 화면이 다시 세게 한다. */
  refresh: () => void;
}

const WaitingContext = createContext<WaitingValue>({ count: null, refresh: () => undefined });

/** 메뉴의 답변 대기 수. 화면을 옮길 때마다 다시 센다(현황은 늘 DB 에서 새로 센다). */
export function WaitingCountProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const { pathname } = useLocation();
  const [count, setCount] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    api.getStats().then(
      (stats) => {
        if (!stale) setCount(waitingOf(stats));
      },
      () => {
        // 받지 못하면 숫자만 감춘다. 화면 자체의 오류는 각 화면이 알린다.
      },
    );
    return () => {
      stale = true;
    };
  }, [api, pathname, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <WaitingContext.Provider value={value}>{children}</WaitingContext.Provider>;
}

export const useWaitingCount = (): WaitingValue => useContext(WaitingContext);
