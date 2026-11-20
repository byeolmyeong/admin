import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';

interface Props {
  trigger: RefObject<HTMLElement | null>;
  /** 버튼의 왼쪽(start)이나 오른쪽(end)에 맞춘다 */
  align?: 'start' | 'end';
  className?: string;
  children: ReactNode;
}

const GAP = 6;

/**
 * 데스크톱의 작은 목록: 버튼 아래에 열고, 화면 아래로 넘치면 위로 연다(결정 003 의 5).
 * 표 · 카드의 overflow 에 잘리지 않게 화면 기준(fixed)으로 놓고, 스크롤 · 크기 바뀜에 따라 다시 잰다.
 */
export function Popover({ trigger, align = 'start', className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const place = () => {
      const button = trigger.current?.getBoundingClientRect();
      const box = ref.current?.getBoundingClientRect();
      if (!button || !box || (button.width === 0 && button.height === 0)) return;
      const below = window.innerHeight - button.bottom;
      const up = below < box.height + GAP * 2 && button.top > below;
      const vertical = up ? { bottom: window.innerHeight - button.top + GAP } : { top: button.bottom + GAP };
      const horizontal = align === 'end' ? { right: Math.max(GAP, window.innerWidth - button.right) } : { left: Math.max(GAP, Math.min(button.left, window.innerWidth - box.width - GAP)) };
      setStyle({ position: 'fixed', ...vertical, ...horizontal });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [trigger, align]);

  return (
    <div ref={ref} style={style} className={['pop', `pop--${align}`, className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
