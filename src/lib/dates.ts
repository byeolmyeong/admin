import { strings } from '../content/strings';

/** 한국 날짜 `YYYY-MM-DD`(서버 조건 from · to 와 같은 꼴) */
export type Ymd = string;
export interface YearMonth {
  year: number;
  /** 1 ~ 12 */
  month: number;
}
export interface DaySelection {
  start: Ymd | null;
  end: Ymd | null;
}
export interface DateRange {
  from: Ymd;
  to: Ymd;
}

/** 기간 고르기의 최대 길이(시작일과 종료일 사이 날 수 — 1년, 결정 003 의 5) */
export const MAX_RANGE_DAYS = 365;

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const ymdOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dateOf = (ymd: Ymd) => new Date(`${ymd}T00:00:00Z`);

const seoulDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** 한국 날짜의 오늘 */
export const kstToday = (now: number = Date.now()): Ymd => seoulDay.format(now);

export const formatDot = (ymd: Ymd): string => ymd.replaceAll('-', '.');

/** 칸에 적은 `2026.11.01`(한 자리 달 · 날도 받는다)을 날짜로. 없는 날이면 null. */
export const parseDot = (text: string): Ymd | null => {
  const m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(text.trim());
  if (!m) return null;
  const ymd = `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  const d = dateOf(ymd);
  return Number.isNaN(d.getTime()) || ymdOf(d) !== ymd ? null : ymd;
};

export const addDays = (ymd: Ymd, n: number): Ymd => ymdOf(new Date(dateOf(ymd).getTime() + n * DAY));
export const diffDays = (a: Ymd, b: Ymd): number => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / DAY);

export const addMonths = ({ year, month }: YearMonth, n: number): YearMonth => {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const monthOf = (ymd: Ymd): YearMonth => ({ year: Number(ymd.slice(0, 4)), month: Number(ymd.slice(5, 7)) });

/** 달력 한 달의 칸: 일요일부터 시작하고 1일 앞은 빈칸(null) */
export const monthCells = ({ year, month }: YearMonth): (Ymd | null)[] => {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const blanks: null[] = Array.from({ length: first.getUTCDay() }, () => null);
  return [...blanks, ...Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`)];
};

/** 날을 누른다: 처음 → 시작일, 다음 → 종료일(앞을 누르면 둘이 바뀜), 둘 다 고른 뒤 → 새 시작일 */
export const pickDay = ({ start, end }: DaySelection, day: Ymd): DaySelection => {
  if (start === null || end !== null) return { start: day, end: null };
  return day < start ? { start: day, end: start } : { start, end: day };
};

/** 고를 수 있는 날: 오늘까지, 시작일만 고른 동안에는 그날에서 1년 안 */
export const canPick = (day: Ymd, { start, end }: DaySelection, today: Ymd): boolean => {
  if (day > today) return false;
  if (start !== null && end === null) return Math.abs(diffDays(start, day)) <= MAX_RANGE_DAYS;
  return true;
};

/** 버튼에 보이는 기간: 오늘 하루면 "오늘", 같은 해면 끝은 월 · 일만 */
export const rangeLabel = ({ from, to }: DateRange, today: Ymd): string => {
  if (from === today && to === today) return strings.picker.today;
  const end = from.slice(0, 4) === to.slice(0, 4) ? formatDot(to).slice(5) : formatDot(to);
  return `${formatDot(from)} ~ ${end}`;
};
