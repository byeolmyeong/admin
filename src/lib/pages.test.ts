import { describe, expect, it } from 'vitest';
import { PAGE_SIZES, pageCountOf, pageGroup, sizeOf } from './pages';

describe('pageGroup — 페이지 번호는 10개 한 묶음(결정 003 의 5)', () => {
  it('첫 묶음: 1 ~ 10, 이전 묶음 없음, 다음 묶음은 11쪽', () => {
    expect(pageGroup(0, 25)).toEqual({ pages: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], prev: null, next: 10 });
    expect(pageGroup(9, 25).prev).toBeNull();
  });
  it('묶음 경계: 10번째 쪽(9)과 11번째 쪽(10)은 다른 묶음', () => {
    expect(pageGroup(9, 25).pages.at(-1)).toBe(9);
    expect(pageGroup(10, 25)).toEqual({ pages: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], prev: 0, next: 20 });
  });
  it('마지막 묶음은 남은 쪽만, 다음 묶음 없음', () => {
    expect(pageGroup(22, 25)).toEqual({ pages: [20, 21, 22, 23, 24], prev: 10, next: null });
  });
  it('쪽이 하나뿐이면 1 하나', () => {
    expect(pageGroup(0, 1)).toEqual({ pages: [0], prev: null, next: null });
  });
  it('딱 10쪽이면 다음 묶음이 없다', () => {
    expect(pageGroup(0, 10).next).toBeNull();
  });
});

describe('pageCountOf', () => {
  it('전체 수와 한 쪽 개수로 쪽 수를 센다(0건이어도 1쪽)', () => {
    expect(pageCountOf(0, 20)).toBe(1);
    expect(pageCountOf(20, 20)).toBe(1);
    expect(pageCountOf(21, 20)).toBe(2);
    expect(pageCountOf(412, 20)).toBe(21);
  });
});

describe('sizeOf — "20개씩" 은 10 · 20 · 50 · 100 가운데 하나', () => {
  it('고를 수 있는 값만 받고, 아니면 20', () => {
    expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
    expect(sizeOf('50')).toBe(50);
    expect(sizeOf('30')).toBe(20);
    expect(sizeOf(null)).toBe(20);
    expect(sizeOf('abc')).toBe(20);
  });
});
