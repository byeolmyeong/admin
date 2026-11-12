import { useState } from 'react';
import type { FormEvent } from 'react';
import { Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import { errorMessage } from '../../lib/errorMessage';
import { passwordProblem } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.password;
type Message = { tone: 'success' | 'error'; text: string };

export function PasswordPage() {
  const { api } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [message, setMessage] = useState<Message | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = passwordProblem(next);
    const found = {
      current: current === '' ? t.required : undefined,
      next: problem === null ? undefined : strings.passwordRule[problem],
      confirm: problem === null && next !== confirm ? t.mismatch : undefined,
    };
    setErrors(found);
    setMessage(null);
    if (found.current || found.next || found.confirm) return;

    setBusy(true);
    try {
      await api.changePassword(current, next);
      setMessage({ tone: 'success', text: t.done });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, t.errors) });
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setCurrent('');
      setNext('');
      setConfirm('');
      setBusy(false);
    }
  };

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1 className="page__title">{t.title}</h1>
      </header>
      <p className="note">{t.note}</p>
      <form className="card form" onSubmit={submit} noValidate>
        <TextField label={t.current} value={current} onChange={setCurrent} type="password" error={errors.current} autoComplete="current-password" />
        <TextField
          label={t.next}
          value={next}
          onChange={setNext}
          type="password"
          help={strings.passwordRule.help}
          error={errors.next}
          autoComplete="new-password"
        />
        <TextField label={t.confirm} value={confirm} onChange={setConfirm} type="password" error={errors.confirm} autoComplete="new-password" />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? strings.common.saving : t.submit}
        </button>
      </form>
    </div>
  );
}
