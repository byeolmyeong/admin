import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import type { AdminAccount } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { passwordProblem } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.admins.reset;

interface Props {
  target: AdminAccount;
  onDone: () => void;
  onCancel: () => void;
}

/** 다른 관리자의 비밀번호를 다시 정하는 창. 규칙은 관리자 만들기와 같다. 열리면 첫 칸에 초점이 가고 Esc 로 닫힌다. */
export function ResetPasswordDialog({ target, onDone, onCancel }: Props) {
  const { api } = useAuth();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = passwordProblem(password);
    const found = {
      password: problem === null ? undefined : strings.passwordRule[problem],
      confirm: problem === null && password !== confirm ? t.mismatch : undefined,
    };
    setErrors(found);
    if (found.password || found.confirm) return;

    setBusy(true);
    try {
      await api.resetAdminPassword(target.id, password);
      onDone();
    } catch (e) {
      setErrors({ form: errorMessage(e, t.errors) });
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다(성공하면 창이 닫히며 사라진다).
      setPassword('');
      setConfirm('');
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={formRef}
        onSubmit={submit}
        noValidate
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) onCancel();
        }}
      >
        <h2 className="dialog__title" id={titleId}>
          {t.title(target.name)}
        </h2>
        <p className="dialog__body">{t.note}</p>
        <TextField
          label={t.password}
          value={password}
          onChange={setPassword}
          type="password"
          help={strings.passwordRule.help}
          error={errors.password}
          autoComplete="new-password"
        />
        <TextField label={t.confirm} value={confirm} onChange={setConfirm} type="password" error={errors.confirm} autoComplete="new-password" />
        {errors.form && <Notice tone="error">{errors.form}</Notice>}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            {strings.common.cancel}
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? strings.common.saving : t.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
