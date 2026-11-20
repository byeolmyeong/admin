import { useState } from 'react';
import { FormDialog } from '../../components/FormDialog';
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

/**
 * 다른 관리자의 비밀번호를 다시 정하는 창(지금 계약 — 결정 018). 규칙은 관리자 추가와 같다.
 * 서버 결정 043 의 "재발급"(서버가 임시 비밀번호를 만든다)이 생기면 계획 D③ 에서 바꾼다.
 */
export function ResetPasswordDialog({ target, onDone, onCancel }: Props) {
  const { api } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
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
    <FormDialog title={t.title(target.loginId)} note={t.note} submitLabel={t.submit} busy={busy} onSubmit={submit} onCancel={onCancel}>
      <TextField label={t.password} value={password} onChange={setPassword} type="password" help={strings.passwordRule.help} error={errors.password} autoComplete="new-password" />
      <TextField label={t.confirm} value={confirm} onChange={setConfirm} type="password" error={errors.confirm ?? errors.form} autoComplete="new-password" />
    </FormDialog>
  );
}
