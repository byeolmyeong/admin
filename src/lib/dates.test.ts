import { describe, expect, it } from 'vitest';
import { MAX_RANGE_DAYS, addDays, addMonths, canPick, diffDays, formatDot, kstToday, monthCells, parseDot, pickDay, rangeLabel } from './dates';

describe('kstToday', () => {
  it('한국 날짜로 오늘을 센다(UTC 15시가 넘으면 다음 날)', () => {
    expect(kstToday(Date.parse('2026-11-20T14:59:59Z'))).toBe('2026-11-20');
    expect(kstToday(Date.parse('2026-11-20T15:00:00Z'))).toBe('2026-11-21');
  });
});

describe('formatDot · parseDot — 칸에 직접 적는 2026.11.01 꼴', () => {
  it('YYYY-MM-DD ↔ YYYY.MM.DD', () => {
    expect(formatDot('2026-11-01')).toBe('2026.11.01');
    expect(parseDot('2026.11.01')).toBe('2026-11-01');
    expect(parseDot(' 2026.1.5 ')).toBe('2026-01-05');
  });
  it('없는 날 · 다른 꼴은 null', () => {
    expect(parseDot('2026.02.30')).toBeNull();
    expect(parseDot('2026-11-01')).toBeNull();
    expect(parseDot('11.01')).toBeNull();
    expect(parseDot('')).toBeNull();
  });
});

describe('날짜 셈', () => {
  it('addDays · diffDays · addMonths', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-11-20')).toBe(19);
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  it('monthCells: 일요일부터, 앞쪽은 빈칸', () => {
    const cells = monthCells({ year: 2026, month: 11 }); // 2026-11-01 은 일요일
    expect(cells[0]).toBe('2026-11-01');
    expect(cells.filter(Boolean)).toHaveLength(30);
    const oct = monthCells({ year: 2026, month: 10 }); // 2026-10-01 은 목요일
    expect(oct.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
  });
});

describe('pickDay — 시작일 → 종료일 순서로 누른다(결정 003 의 5)', () => {
  it('처음 누르면 시작일, 다음에 누르면 종료일', () => {
    const a = pickDay({ start: null, end: null }, '2026-11-01');
    expect(a).toEqual({ start: '2026-11-01', end: null });
    expect(pickDay(a, '2026-11-20')).toEqual({ start: '2026-11-01', end: '2026-11-20' });
  });
  it('종료일을 시작일보다 앞에 누르면 둘이 바뀐다', () => {
    expect(pickDay({ start: '2026-11-20', end: null }, '2026-11-01')).toEqual({ start: '2026-11-01', end: '2026-11-20' });
  });
  it('둘 다 고른 뒤 다시 누르면 새 시작일', () => {
    expect(pickDay({ start: '2026-11-01', end: '2026-11-20' }, '2026-11-05')).toEqual({ start: '2026-11-05', end: null });
  });
  it('같은 날을 두 번 누르면 하루', () => {
    expect(pickDay({ start: '2026-11-05', end: null }, '2026-11-05')).toEqual({ start: '2026-11-05', end: '2026-11-05' });
  });
});

describe('canPick — 오늘 뒤는 못 고르고, 기간은 최대 1년', () => {
  const today = '2026-11-20';
  it('오늘 뒤 날짜는 못 고른다', () => {
    expect(canPick('2026-11-20', { start: null, end: null }, today)).toBe(true);
    expect(canPick('2026-11-21', { start: null, end: null }, today)).toBe(false);
  });
  it('시작일만 고른 동안에는 1년 밖을 못 고른다', () => {
    expect(MAX_RANGE_DAYS).toBe(365);
    const s = { start: '2025-11-20', end: null };
    expect(canPick('2026-11-20', s, today)).toBe(true);
    expect(canPick('2024-11-19', s, today)).toBe(false);
    expect(canPick('2024-11-20', s, today)).toBe(true);
  });
});

describe('rangeLabel — 버튼에 보이는 값', () => {
  const today = '2026-11-20';
  it('오늘 하루면 "오늘"', () => {
    expect(rangeLabel({ from: today, to: today }, today)).toBe('오늘');
  });
  it('같은 해면 끝은 월 · 일만', () => {
    expect(rangeLabel({ from: '2026-11-01', to: '2026-11-20' }, today)).toBe('2026.11.01 ~ 11.20');
  });
  it('해가 다르면 둘 다 연도까지', () => {
    expect(rangeLabel({ from: '2025-12-01', to: '2026-01-05' }, today)).toBe('2025.12.01 ~ 2026.01.05');
  });
});
