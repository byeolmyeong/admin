/** 페이지 번호 한 묶음의 크기(결정 003 의 5 — 1 2 3 … 10, 말줄임 없음) */
export const PAGE_GROUP = 10;

/** "20개씩" 에서 고를 수 있는 값 */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export interface PageGroup {
  /** 이 묶음의 쪽 번호(0 부터) */
  pages: number[];
  /** 이전 묶음의 첫 쪽. 첫 묶음이면 null(‹ 를 흐리게) */
  prev: number | null;
  /** 다음 묶음의 첫 쪽. 마지막 묶음이면 null */
  next: number | null;
}

export const pageCountOf = (total: number, size: number): number => Math.max(1, Math.ceil(total / size));

export const pageGroup = (page: number, pageCount: number): PageGroup => {
  const first = Math.floor(page / PAGE_GROUP) * PAGE_GROUP;
  const last = Math.min(first + PAGE_GROUP, pageCount) - 1;
  const pages = Array.from({ length: Math.max(1, last - first + 1) }, (_, i) => first + i);
  return {
    pages,
    prev: first > 0 ? first - PAGE_GROUP : null,
    next: first + PAGE_GROUP < pageCount ? first + PAGE_GROUP : null,
  };
};

export const sizeOf = (value: string | null): number => {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
};
