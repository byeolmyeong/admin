import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import { errorMessage } from '../../lib/errorMessage';
import { useAuth } from './AuthContext';

const t = strings.login;

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
      <form className="login__card" onSubmit={submit} noValidate>
        <p className="login__brand">{strings.appName}</p>
        <h1 className="login__title">{t.title}</h1>
        {notice && !error && <Notice tone="info">{notice === 'expired' ? t.noticeExpired : t.noticeSignedOut}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <TextField label={t.loginId} value={loginId} onChange={setLoginId} autoComplete="username" />
        <TextField label={t.password} value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? t.submitting : t.submit}
        </button>
      </form>
    </main>
  );
}
