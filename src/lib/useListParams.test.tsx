import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounced } from './useDebounced';
import { useListParams } from './useListParams';

const wrapper =
  (route: string) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;

const useBoth = () => ({ list: useListParams(), location: useLocation() });

describe('useListParams — 거르기 · 쪽 · 개수는 주소에 둔다(상세에서 돌아와도 그대로)', () => {
  it('주소의 값을 읽는다(쪽은 0 부터, 개수는 10 · 20 · 50 · 100)', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/x?status=NEW&page=3&size=50') });
    expect(result.current.list.get('status')).toBe('NEW');
    expect(result.current.list.page).toBe(3);
    expect(result.current.list.size).toBe(50);
  });

  it('거르기를 바꾸면 1쪽으로 간다', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/x?page=4') });
    act(() => result.current.list.set({ status: 'DONE' }));
    expect(result.current.list.page).toBe(0);
    expect(result.current.location.search).toBe('?status=DONE');
  });

  it('찾기 · 개수를 바꿔도 1쪽으로 간다', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/x?page=4&q=a') });
    act(() => result.current.list.set({ q: 'ab' }));
    expect(result.current.list.page).toBe(0);
    act(() => result.current.list.setPage(2));
    act(() => result.current.list.setSize(100));
    expect(result.current.list.page).toBe(0);
    expect(result.current.list.size).toBe(100);
  });

  it('쪽만 바꾸면 거르기는 그대로', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/x?status=NEW') });
    act(() => result.current.list.setPage(2));
    expect(result.current.location.search).toBe('?status=NEW&page=2');
  });

  it('빈 값은 주소에서 뺀다 · reset 은 모두 지운다', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/x?status=NEW&q=a&size=50') });
    act(() => result.current.list.set({ q: '' }));
    expect(result.current.location.search).toBe('?status=NEW&size=50');
    act(() => result.current.list.reset());
    expect(result.current.location.search).toBe('');
  });
});

describe('useDebounced — 찾기는 입력을 멈추고 0.3초 뒤', () => {
  afterEach(() => vi.useRealTimers());

  it('0.3초 동안 바뀌지 않아야 새 값을 준다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounced(v), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 'abc' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('abc');
  });
});
