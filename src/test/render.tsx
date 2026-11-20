import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UiProvider } from '../components/UiProvider';
import { AuthProvider } from '../features/auth/AuthContext';
import { saveSession } from '../lib/session';

interface Options {
  route?: string;
  /** 기본은 로그인한 상태(토큰 tok-test). false 면 로그인 전. */
  signedIn?: boolean;
  expiresAt?: string;
}

/** 화면을 라우터와 세션 안에서 그린다. 로그인한 상태면 GET /admin/me 를 mockFetch 에 준비해 둔다. */
export const renderApp = (ui: ReactNode, { route = '/', signedIn = true, expiresAt = '2099-01-01T00:00:00Z' }: Options = {}) => {
  if (signedIn) saveSession({ token: 'tok-test', expiresAt });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider baseUrl="http://api.test">
        <UiProvider>{ui}</UiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};
