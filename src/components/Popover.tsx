import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

interface Props {
  trigger: RefObject<HTMLElement | null>;
  /** 버튼의 왼쪽(start)이나 오른쪽(end)에 맞춘다 */
  align?: 'start' | 'end';
  className?: string;
  children: ReactNode;
}

/** 데스크톱의 작은 목록: 버튼 아래에 열고, 화면 아래로 넘치면 위로 연다(결정 003 의 5). */
export function Popover({ trigger, align = 'start', className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);

  useLayoutEffect(() => {
    const button = trigger.current?.getBoundingClientRect();
    const box = ref.current?.getBoundingClientRect();
    if (!button || !box || box.height === 0) return;
    const below = window.innerHeight - button.bottom;
    setUp(below < box.height + 12 && button.top > below);
  }, [trigger]);

  return (
    <div ref={ref} className={['pop', `pop--${align}`, up ? 'pop--up' : '', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
