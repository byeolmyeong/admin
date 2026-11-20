import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import brandMark from '../../assets/brand-mark.svg';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import { errorMessage } from '../../lib/errorMessage';
import { useAuth } from './AuthContext';

const t = strings.login;

/**
 * 로그인(D11 · D23): 가운데 로고 · 아이디 · 비밀번호 · 로그인 버튼만. 틀리면 비밀번호 칸 아래 빨간 한 줄 —
 * 어느 쪽이 틀렸는지 알리지 않는다. 로그인 잠금 화면은 없다(소유자 결정).
 */
export function LoginPage() {
  const { signedIn, login, notice } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (signedIn) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (loginId.trim() === '' || password === '') {
      setError(t.required);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(loginId, password);
    } catch (e) {
      setError(errorMessage(e, t.errors));
      setBusy(false);
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setPassword('');
    }
  };

  return (
    <main className="login">
      <form className="card login__card" onSubmit={submit} noValidate>
        <h1 className="login__brand">
          <img src={brandMark} alt="" className="login__mark" />
          {t.title}
        </h1>
        <p className="login__caption">{t.caption}</p>
        {notice && !error && (
          <p className="login__notice" role="status">
            {notice === 'expired' ? t.noticeExpired : t.noticeSignedOut}
          </p>
        )}
        <TextField label={t.loginId} value={loginId} onChange={setLoginId} autoComplete="username" />
        <TextField label={t.password} value={password} onChange={setPassword} type="password" autoComplete="current-password" error={error} />
        <button type="submit" className="btn btn--primary btn--large btn--block" disabled={busy}>
          {busy ? t.submitting : t.submit}
        </button>
      </form>
    </main>
  );
}
