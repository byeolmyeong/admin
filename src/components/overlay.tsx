import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';

/**
 * 선택 메뉴 · 목록 · ⋯ 메뉴 · 기간 고르기는 화면에서 한 번에 하나만 열린다(결정 003 의 5).
 * 열린 것의 id 하나만 이 컨텍스트가 가진다 — 다른 것을 열면 앞의 것은 저절로 닫힌다.
 */
interface OverlayState {
  openId: string | null;
  setOpenId: Dispatch<SetStateAction<string | null>>;
}

const OverlayContext = createContext<OverlayState | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const value = useMemo(() => ({ openId, setOpenId }), [openId]);
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

/** 열림 상태 하나. 공급자가 없으면(부품 하나만 그릴 때) 혼자 열고 닫는다. */
export function useOverlay() {
  const id = useId();
  const shared = useContext(OverlayContext);
  const [alone, setAlone] = useState(false);
  const open = shared ? shared.openId === id : alone;

  const setOpen = useCallback(
    (next: boolean) => {
      if (shared) shared.setOpenId((current) => (next ? id : current === id ? null : current));
      else setAlone(next);
    },
    [shared, id],
  );
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  return { open, setOpen, toggle, close };
}

/**
 * 열려 있는 동안 바깥 누르기 · Esc 로 닫는다. root 안(버튼 · 목록 · 시트)을 누른 것은 바깥이 아니다.
 * Esc 로 닫으면 초점을 버튼에 돌려준다.
 */
export function useDismiss(open: boolean, root: RefObject<HTMLElement | null>, onDismiss: () => void, trigger?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onDismiss();
      trigger?.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, root, onDismiss, trigger]);
}

const PHONE = '(max-width: 639px)';

/** 640 아래(폰)인지. 폰은 아래 시트, 데스크톱 · 태블릿은 버튼 아래 작은 목록(결정 003 의 5). */
export function useIsPhone(): boolean {
  const query = () => (typeof window.matchMedia === 'function' ? window.matchMedia(PHONE) : null);
  const [phone, setPhone] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (!list) return;
    const onChange = () => setPhone(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  return phone;
}
