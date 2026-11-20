import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE_SIZE, sizeOf } from './pages';

const pageOf = (value: string | null): number => (value !== null && /^\d{1,6}$/.test(value) ? Number(value) : 0);

/**
 * 목록의 거르기 · 찾기 · 쪽 · 개수를 주소(쿼리)에 둔다 — 상세에서 돌아오면 그대로다(결정 003 의 5).
 * 거르기 · 찾기 · 개수를 바꾸면 1쪽(page 0)으로 간다. 쪽은 0 부터 세고, 0 쪽 · 20개씩은 주소에서 뺀다.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const write = useCallback(
    (change: (next: URLSearchParams) => void) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          change(next);
          for (const [key, value] of [...next.entries()]) if (value === '') next.delete(key);
          if (next.get('page') === '0') next.delete('page');
          if (next.get('size') === String(DEFAULT_PAGE_SIZE)) next.delete('size');
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  /** 거르기 · 찾기를 바꾼다(빈 글은 지움). 1쪽으로 간다. */
  const set = useCallback(
    (patch: Record<string, string>) =>
      write((next) => {
        for (const [key, value] of Object.entries(patch)) next.set(key, value);
        next.delete('page');
      }),
    [write],
  );
  const setPage = useCallback((page: number) => write((next) => next.set('page', String(page))), [write]);
  const setSize = useCallback(
    (size: number) =>
      write((next) => {
        next.set('size', String(size));
        next.delete('page');
      }),
    [write],
  );
  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  return {
    /** 쿼리의 글자 값(없으면 빈 글) */
    get: (key: string): string => params.get(key) ?? '',
    page: pageOf(params.get('page')),
    size: sizeOf(params.get('size')),
    /** 상세로 들고 가는 지금 조건(돌아올 때 쓴다) */
    search: params.toString(),
    set,
    setPage,
    setSize,
    reset,
  };
}
