import type { ReactNode } from 'react';
import { OverlayProvider } from './overlay';
import { ToastProvider } from './Toast';

/** 화면 전체가 함께 쓰는 것: 한 번에 하나만 열리는 메뉴 · 짧은 알림 */
export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <OverlayProvider>
      <ToastProvider>{children}</ToastProvider>
    </OverlayProvider>
  );
}
