import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Notice } from '../components/Feedback';
import { UiProvider } from '../components/UiProvider';
import { strings } from '../content/strings';
import { AuthProvider } from '../features/auth/AuthContext';
import { FirstPasswordPage } from '../features/auth/FirstPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { FIRST_PASSWORD_PATH, RequireAuth } from '../features/auth/RequireAuth';
import { apiBaseUrl } from '../lib/config';
import { AppShell } from './AppShell';
import { visibleSections } from './sections';

/** 라우트 표. 구역의 화면은 sections 에서 온다. 로그인 말고는 모두 세션이 필요하다. */
export function AppRoutes() {
  const shown = visibleSections();
  const home = shown[0]?.to ?? '/login';
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path={FIRST_PASSWORD_PATH} element={<FirstPasswordPage />} />
        <Route element={<AppShell />}>
          {shown.flatMap((section) => section.routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />))}
          {/* 내 비밀번호 변경은 관리자 화면의 카드로 옮겼다(D9). 옛 주소는 그리로 보낸다. */}
          <Route path="/password" element={<Navigate to="/admins" replace />} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export function App() {
  const baseUrl = apiBaseUrl();
  if (baseUrl === null) {
    return (
      <main className="login">
        <Notice tone="error">{strings.config.missingApiUrl}</Notice>
      </main>
    );
  }
  return (
    <BrowserRouter>
      <AuthProvider baseUrl={baseUrl}>
        <UiProvider>
          <AppRoutes />
        </UiProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
