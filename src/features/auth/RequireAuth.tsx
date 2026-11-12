import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** 로그인하지 않았으면(또는 세션이 끝났으면) 로그인 화면으로 보낸다. */
export function RequireAuth() {
  const { signedIn } = useAuth();
  return signedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
