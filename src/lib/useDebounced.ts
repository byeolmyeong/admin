import { useEffect, useState } from 'react';

/** 찾기 입력을 늦춰 준다: 값이 ms 동안 바뀌지 않아야 새 값을 돌려준다(결정 003 의 5 — 0.3초). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
