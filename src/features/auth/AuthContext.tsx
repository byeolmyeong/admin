import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createAdminApi } from '../../lib/api/admin';
import type { AdminApi } from '../../lib/api/admin';
import { createClient } from '../../lib/api/client';
import type { Admin } from '../../lib/api/types';
import { clearSession, loadSession, saveSession } from '../../lib/session';
import type { StoredSession } from '../../lib/session';

/** 로그인 화면에 보일 알림: 세션이 끝났다(401·만료) / 스스로 로그아웃했다 */
export type AuthNotice = 'expired' | 'signed_out';

interface AuthValue {
  api: AdminApi;
  signedIn: boolean;
  /** 로그인한 관리자. 새로 고친 직후에는 GET /admin/me 가 올 때까지 null 이다. */
  admin: Admin | null;
  /** 내 정보를 받지 못했다(401 말고). retryAdmin 으로 다시 받는다. */
  adminError: unknown;
  retryAdmin: () => void;
  notice: AuthNotice | null;
  /** 실패하면 ApiError 를 던진다. 비밀번호는 보관하지 않는다(임시 비밀번호로 들어온 경우만 아래 예외). */
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 임시 비밀번호로 들어왔다 — 비밀번호를 바꾸기 전엔 다른 화면으로 못 간다(결정 043 의 5 · D22) */
  mustChangePassword: boolean;
  /**
   * 첫 로그인에서 들고 있는 임시 비밀번호(메모리에만, 바꾸거나 로그아웃하면 지운다). 새로 고쳐 사라졌으면 null —
   * 그때는 화면이 임시 비밀번호를 다시 묻는다.
   */
  temporaryPassword: string | null;
  /** 첫 로그인 비밀번호 변경. 성공하면 임시 비밀번호를 지우고 막음을 푼다. */
  changeFirstPassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** setTimeout 이 받을 수 있는 가장 긴 시간(약 24.8일) */
const MAX_TIMEOUT = 2 ** 31 - 1;

export function AuthProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [adminError, setAdminError] = useState<unknown>(null);
  const [adminAttempt, setAdminAttempt] = useState(0);
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const tokenRef = useRef<string | null>(session?.token ?? null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  // 서버가 403 PASSWORD_CHANGE_REQUIRED 로 막았다 — 내 정보(mustChangePassword)를 받기 전이어도 첫 로그인 화면으로 간다.
  const [changeRequired, setChangeRequired] = useState(false);

  const end = useCallback((why: AuthNotice) => {
    clearSession();
    tokenRef.current = null;
    setSession(null);
    setAdmin(null);
    setAdminError(null);
    setTemporaryPassword(null);
    setChangeRequired(false);
    setNotice(why);
  }, []);

  const api = useMemo(
    () =>
      createAdminApi(
        createClient({
          baseUrl,
          getToken: () => tokenRef.current,
          onUnauthorized: () => end('expired'),
          // 서버가 비밀번호 변경을 먼저 요구하면(결정 043 의 5) 화면 틀 대신 첫 로그인 화면으로 간다.
          onPasswordChangeRequired: () => setChangeRequired(true),
        }),
      ),
    [baseUrl, end],
  );

  // expiresAt 이 되면 서버에 묻지 않고 끝낸다(갱신 경로가 없다).
  useEffect(() => {
    if (!session) return;
    const expiry = Date.parse(session.expiresAt);
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const left = expiry - Date.now();
      if (left <= 0) end('expired');
      else timer = setTimeout(arm, Math.min(left, MAX_TIMEOUT));
    };
    arm();
    return () => clearTimeout(timer);
  }, [session, end]);

  // 새로 고친 뒤에는 토큰만 있으므로 내 정보를 받는다.
  const needAdmin = session !== null && admin === null;
  useEffect(() => {
    if (!needAdmin) return;
    let stale = false;
    api.me().then(
      (me) => {
        if (!stale) setAdmin(me);
      },
      (error: unknown) => {
        if (!stale) setAdminError(error);
      },
    );
    return () => {
      stale = true;
    };
  }, [needAdmin, api, adminAttempt]);

  const login = useCallback(
    async (loginId: string, password: string) => {
      setNotice(null);
      const result = await api.login(loginId, password);
      const next = { token: result.token, expiresAt: result.expiresAt };
      saveSession(next);
      tokenRef.current = next.token;
      setAdmin(result.admin);
      setAdminError(null);
      // 임시 비밀번호로 들어왔으면 바로 다음 화면(D22)의 "현재 비밀번호" 로만 쓰려고 메모리에 잠깐 둔다.
      setTemporaryPassword(result.admin.mustChangePassword === true ? password : null);
      setSession(next);
    },
    [api],
  );

  const changeFirstPassword = useCallback(
    async (current: string, next: string) => {
      await api.changePassword(current, next);
      setTemporaryPassword(null);
      setChangeRequired(false);
      setAdmin((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
    },
    [api],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 서버에 닿지 못해도 이 브라우저의 토큰은 버린다.
    }
    end('signed_out');
  }, [api, end]);

  const retryAdmin = useCallback(() => {
    setAdminError(null);
    setAdminAttempt((n) => n + 1);
  }, []);

  const mustChangePassword = admin?.mustChangePassword === true || changeRequired;
  const value = useMemo<AuthValue>(
    () => ({ api, signedIn: session !== null, admin, adminError, retryAdmin, notice, login, logout, mustChangePassword, temporaryPassword, changeFirstPassword }),
    [api, session, admin, adminError, retryAdmin, notice, login, logout, mustChangePassword, temporaryPassword, changeFirstPassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider 안에서만 쓴다');
  return value;
};
