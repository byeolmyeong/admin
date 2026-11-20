import { useId, useRef, useState } from 'react';
import { strings } from '../content/strings';
import { MAX_RANGE_DAYS, addMonths, canPick, diffDays, formatDot, monthCells, monthOf, parseDot, pickDay, rangeLabel } from '../lib/dates';
import type { DateRange, DaySelection, YearMonth, Ymd } from '../lib/dates';
import { Icon } from './icons';
import { useDismiss, useIsPhone, useOverlay } from './overlay';
import { Popover } from './Popover';
import { Sheet } from './Sheet';

const t = strings.picker;

interface Props {
  /** 버튼 이름(예: "가입일", "날짜") */
  label: string;
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  /** 한국 날짜의 오늘(테스트에서 정한다) */
  today: Ymd;
  align?: 'start' | 'end';
}

type Problem = 'invalid' | 'future' | 'tooLong' | null;

function Month({ month, draft, today, onPick }: { month: YearMonth; draft: DaySelection; today: Ymd; onPick: (day: Ymd) => void }) {
  const { start, end } = draft;
  return (
    <div className="cal">
      <p className="cal__title">{t.month(month.year, month.month)}</p>
      <div className="cal__grid">
        {t.weekdays.map((w, i) => (
          <span key={w} className={i === 0 ? 'cal__week cal__week--sun' : 'cal__week'} aria-hidden="true">
            {w}
          </span>
        ))}
        {monthCells(month).map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const inRange = start !== null && end !== null && day > start && day < end;
          const edge = day === start || day === end;
          const classes = [
            'cal__day',
            new Date(`${day}T00:00:00Z`).getUTCDay() === 0 ? 'cal__day--sun' : '',
            inRange ? 'is-in' : '',
            day === start && end !== null && end !== start ? 'is-start' : '',
            day === end && start !== end ? 'is-end' : '',
            edge ? 'is-edge' : '',
            day === today ? 'is-today' : '',
          ];
          return (
            <button
              key={day}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              aria-label={formatDot(day)}
              aria-pressed={edge}
              disabled={!canPick(day, draft, today)}
              onClick={() => onPick(day)}
            >
              <b>{Number(day.slice(8))}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 기간 고르기(결정 003 의 5): 데스크톱 두 달(이전 · 이번 달) · 폰 한 달 달력. 시작 → 종료 순서로 누르고,
 * 거꾸로 누르면 바뀐다. 오늘 뒤는 못 고르고 최대 1년. 칸에 직접 적을 수 있다. "적용" 전에는 바뀌지 않고,
 * 취소 · 바깥 누르기는 앞의 값으로 되돌린다.
 */
export function DateRangeSelect({ label, value, onChange, today, align = 'start' }: Props) {
  const { open, setOpen, close } = useOverlay();
  const phone = useIsPhone();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const startId = useId();
  const endId = useId();
  const [draft, setDraft] = useState<DaySelection>({ start: null, end: null });
  const [texts, setTexts] = useState({ start: '', end: '' });
  const [problem, setProblem] = useState<Problem>(null);
  const [month, setMonth] = useState<YearMonth>(monthOf(today));
  useDismiss(open && !phone, root, close, trigger);

  const begin = () => {
    if (open) return close();
    const start = value?.from ?? null;
    const end = value?.to ?? null;
    setDraft({ start, end });
    setTexts({ start: start ? formatDot(start) : '', end: end ? formatDot(end) : '' });
    setProblem(null);
    setMonth(monthOf(end ?? today));
    setOpen(true);
  };

  const pick = (day: Ymd) => {
    const next = pickDay(draft, day);
    setDraft(next);
    setTexts({ start: next.start ? formatDot(next.start) : '', end: next.end ? formatDot(next.end) : '' });
    setProblem(null);
  };

  /** 적은 글을 읽어 고른 값으로. 거꾸로 적으면 바꾼다. */
  const readTexts = (next = texts) => {
    const start = next.start.trim() === '' ? null : parseDot(next.start);
    const end = next.end.trim() === '' ? null : parseDot(next.end);
    if ((next.start.trim() !== '' && start === null) || (next.end.trim() !== '' && end === null)) return setProblem('invalid');
    if ((start !== null && start > today) || (end !== null && end > today)) return setProblem('future');
    const [a, b] = start !== null && end !== null && end < start ? [end, start] : [start, end];
    if (a !== null && b !== null && diffDays(a, b) > MAX_RANGE_DAYS) {
      setDraft({ start: a, end: b });
      return setProblem('tooLong');
    }
    setProblem(null);
    setDraft({ start: a, end: b });
    if (b ?? a) setMonth(monthOf((b ?? a) as Ymd));
  };

  const ready = draft.start !== null && draft.end !== null && problem === null;
  const apply = () => {
    if (!ready || draft.start === null || draft.end === null) return;
    onChange({ from: draft.start, to: draft.end });
    close();
    trigger.current?.focus();
  };

  const months = phone ? [month] : [addMonths(month, -1), month];
  const fields = (
    <div className="range__fields">
      <div className="field">
        <label className="field__label" htmlFor={startId}>
          {t.start}
        </label>
        <input
          id={startId}
          className="input"
          inputMode="numeric"
          placeholder={t.placeholder}
          value={texts.start}
          onChange={(e) => setTexts({ ...texts, start: e.target.value })}
          onBlur={() => readTexts()}
          onKeyDown={(e) => e.key === 'Enter' && readTexts()}
        />
      </div>
      <span className="range__tilde" aria-hidden="true">
        ~
      </span>
      <div className="field">
        <label className="field__label" htmlFor={endId}>
          {t.end}
        </label>
        <input
          id={endId}
          className="input"
          inputMode="numeric"
          placeholder={t.placeholder}
          value={texts.end}
          onChange={(e) => setTexts({ ...texts, end: e.target.value })}
          onBlur={() => readTexts()}
          onKeyDown={(e) => e.key === 'Enter' && readTexts()}
        />
      </div>
    </div>
  );
  const calendars = (
    <div className="range__months">
      <button type="button" className="icon-button icon-button--plain range__prev" aria-label={t.prevMonth} onClick={() => setMonth(addMonths(month, -1))}>
        <Icon name="left" />
      </button>
      {months.map((m) => (
        <Month key={`${m.year}-${m.month}`} month={m} draft={draft} today={today} onPick={pick} />
      ))}
      <button
        type="button"
        className="icon-button icon-button--plain range__next"
        aria-label={t.nextMonth}
        disabled={month.year * 12 + month.month >= monthOf(today).year * 12 + monthOf(today).month}
        onClick={() => setMonth(addMonths(month, 1))}
      >
        <Icon name="right" />
      </button>
    </div>
  );
  const message = problem && (
    <p className="field__error" role="alert">
      {t[problem]}
    </p>
  );
  const applyButton = (
    <button type="button" className={phone ? 'btn btn--primary btn--large btn--block' : 'btn btn--primary'} disabled={!ready} onClick={apply}>
      {t.apply}
    </button>
  );

  return (
    <span className="select" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={['select__button', 'select__button--chip', value ? 'is-set' : '', open ? 'is-open' : ''].filter(Boolean).join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={begin}
      >
        <span className="select__text">{value ? `${label} · ${rangeLabel(value, today)}` : label}</span>
        <Icon name={open ? 'down' : 'up'} size={14} />
      </button>
      {open && !phone && (
        <Popover trigger={trigger} align={align} className="range">
          <div role="dialog" aria-label={label} className="range__body">
            {calendars}
            {fields}
            {message}
            <div className="range__actions">
              <button type="button" className="btn btn--secondary" onClick={close}>
                {t.cancel}
              </button>
              {applyButton}
            </div>
          </div>
        </Popover>
      )}
      {open && phone && (
        <Sheet label={label} onClose={close}>
          <div className="range__body range__body--sheet">
            {fields}
            {message}
            {calendars}
            {applyButton}
          </div>
        </Sheet>
      )}
    </span>
  );
}
