import { useRef } from 'react';
import { Icon } from './icons';
import { useDismiss, useIsPhone, useOverlay } from './overlay';
import { Popover } from './Popover';
import { Sheet } from './Sheet';

export interface MoreItem {
  label: string;
  onSelect: () => void;
  /** 되돌리기 어려운 조치(비활성화 · 삭제)는 빨간 글자 */
  danger?: boolean;
}

/** 줄 단위 조치는 버튼을 늘어놓지 않고 ⋯ 메뉴 하나(결정 003 의 6). 데스크톱은 작은 목록, 폰은 아래 시트. */
export function MoreMenu({ label, items }: { label: string; items: MoreItem[] }) {
  const { open, toggle, close } = useOverlay();
  const phone = useIsPhone();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDismiss(open && !phone, root, close, trigger);

  const menu = (
    <div className={phone ? 'sheet__list' : 'pop__list'} role="menu" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={[phone ? 'sheet-item' : 'pop-item', item.danger ? 'is-danger' : ''].filter(Boolean).join(' ')}
          onClick={() => {
            close();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <span className="select" ref={root}>
      <button ref={trigger} type="button" className={open ? 'icon-button is-open' : 'icon-button'} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <Icon name="more" />
      </button>
      {open && !phone && (
        <Popover trigger={trigger} align="end">
          {menu}
        </Popover>
      )}
      {open && phone && (
        <Sheet label={label} onClose={close}>
          {menu}
        </Sheet>
      )}
    </span>
  );
}
