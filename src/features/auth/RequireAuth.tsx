import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const FIRST_PASSWORD_PATH = '/first-password';

/**
 * 로그인하지 않았으면(또는 세션이 끝났으면) 로그인 화면으로 보낸다.
 * 임시 비밀번호로 들어왔으면 비밀번호를 바꾸기 전엔 다른 화면으로 못 간다(결정 003 의 2 · D22).
 */
export function RequireAuth() {
  const { signedIn, mustChangePassword } = useAuth();
  const { pathname } = useLocation();
  if (!signedIn) return <Navigate to="/login" replace />;
  if (mustChangePassword && pathname !== FIRST_PASSWORD_PATH) return <Navigate to={FIRST_PASSWORD_PATH} replace />;
  if (!mustChangePassword && pathname === FIRST_PASSWORD_PATH) return <Navigate to="/" replace />;
  return <Outlet />;
}
