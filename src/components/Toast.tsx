import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** 성공 3초 · 실패 5초(결정 003 의 5) */
export const TOAST_MS = { success: 3000, error: 5000 } as const;

type Tone = keyof typeof TOAST_MS;
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => undefined, error: () => undefined });

/** 짧은 알림: 화면 아래 가운데에 하나만. 새 알림은 앞의 것을 바꾸고 시간을 새로 센다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setItem(null), TOAST_MS[item.tone]);
    return () => clearTimeout(timer);
  }, [item]);

  const show = useCallback((tone: Tone, text: string) => setItem((prev) => ({ id: (prev?.id ?? 0) + 1, tone, text })), []);
  const api = useMemo<ToastApi>(() => ({ success: (text) => show('success', text), error: (text) => show('error', text) }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {item && (
        <div key={item.id} className={`toast toast--${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
          {item.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastApi => useContext(ToastContext);
