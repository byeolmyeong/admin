import { useRef } from 'react';
import { Icon } from './icons';
import { useDismiss, useIsPhone, useOverlay } from './overlay';
import { Popover } from './Popover';
import { Sheet } from './Sheet';

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** 버튼에 붙는 이름. 고른 값이 있으면 "이름 · 값" 으로 보인다. */
  label?: string;
  /** 이름이 없는 버튼(예: "20개씩")의 읽어 주는 이름 */
  ariaLabel?: string;
  value: T | '';
  options: Option<T>[];
  onChange: (value: T | '') => void;
  /** 고르지 않음('')의 항목 이름. 있으면 목록 맨 위에 나온다(예: "전체"). */
  allLabel?: string;
  /** 이 값이면 테두리를 칠하지 않는다(기본 '') */
  defaultValue?: T | '';
  /** chip: 둥근 거르기 버튼, field: 꽉 찬 입력칸 모양(글자 왼쪽 · 화살표 오른쪽) */
  variant?: 'chip' | 'field';
  align?: 'start' | 'end';
  disabled?: boolean;
}

/**
 * 선택 버튼 + 펼침(결정 003 의 5): 데스크톱은 버튼 아래 작은 목록, 폰은 아래 시트.
 * 한 번에 하나만 열리고, 항목을 누르면 바로 적용되고 닫힌다. 닫힘 ⌃ · 펼침 ⌄.
 */
export function Select<T extends string>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  allLabel,
  defaultValue = '',
  variant = 'chip',
  align = 'start',
  disabled,
}: Props<T>) {
  const { open, toggle, close } = useOverlay();
  const phone = useIsPhone();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDismiss(open && !phone, root, close, trigger);

  const items: Option<T | ''>[] = allLabel !== undefined ? [{ value: '', label: allLabel }, ...options] : options;
  const current = items.find((o) => o.value === value);
  const shown = value === '' ? (label ?? current?.label ?? '') : current ? (label ? `${label} · ${current.label}` : current.label) : value;
  const name = ariaLabel ?? label ?? shown;

  const list = (
    <div className={phone ? 'sheet__list' : 'pop__list'} role="listbox" aria-label={name}>
      {items.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value || '__all'}
            type="button"
            role="option"
            aria-selected={selected}
            className={phone ? 'sheet-item' : 'pop-item'}
            onClick={() => {
              onChange(option.value);
              close();
              if (!phone) trigger.current?.focus();
            }}
          >
            <span>{option.label}</span>
            {selected && <Icon name="check" size={16} />}
          </button>
        );
      })}
    </div>
  );

  return (
    <span className="select" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={['select__button', `select__button--${variant}`, value !== defaultValue ? 'is-set' : '', open ? 'is-open' : ''].filter(Boolean).join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
      >
        <span className="select__text">{shown}</span>
        <Icon name={open ? 'down' : 'up'} size={14} />
      </button>
      {open && !phone && (
        <Popover trigger={trigger} align={align}>
          {list}
        </Popover>
      )}
      {open && phone && (
        <Sheet label={name} onClose={close}>
          {list}
        </Sheet>
      )}
    </span>
  );
}
