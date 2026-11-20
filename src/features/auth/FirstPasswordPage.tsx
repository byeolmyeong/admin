import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import brandMark from '../../assets/brand-mark.svg';
import { Icon } from '../../components/icons';
import { TextField } from '../../components/TextField';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import { errorMessage } from '../../lib/errorMessage';
import { codePointLength, utf8ByteLength } from '../../lib/text';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN, hasLetterAndDigit } from '../../lib/validation';
import { useAuth } from './AuthContext';

const t = strings.password.first;

/**
 * 첫 로그인 비밀번호 변경(D22): 임시 비밀번호로 들어오면 여기부터. 규칙 넷(10자 이상 · 영문 · 숫자 조합 ·
 * 임시 비밀번호와 다름 · 비밀번호 일치)을 모두 채워야 "변경 후 시작" 이 켜진다.
 */
export function FirstPasswordPage() {
  const { temporaryPassword, changeFirstPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [temporary, setTemporary] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = temporaryPassword ?? temporary;

  const rules = [
    { key: 'length', ok: codePointLength(next) >= PASSWORD_MIN && utf8ByteLength(next) <= PASSWORD_MAX_BYTES },
    { key: 'mix', ok: hasLetterAndDigit(next) },
    { key: 'different', ok: next !== '' && current !== '' && next !== current },
    { key: 'match', ok: next !== '' && next === confirm },
  ] as const;
  const ready = rules.every((r) => r.ok) && current !== '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      await changeFirstPassword(current, next);
      toast.success(strings.password.done);
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e, strings.password.errors));
      setBusy(false);
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setNext('');
      setConfirm('');
      setTemporary('');
    }
  };

  return (
    <main className="login">
      <form className="card login__card" onSubmit={submit} noValidate>
        <h1 className="login__brand">
          <img src={brandMark} alt="" className="login__mark" />
          {strings.login.title}
        </h1>
        <p className="login__caption">{strings.login.caption}</p>
        <p className="info-box">{t.notice}</p>
        {temporaryPassword === null && <TextField label={t.temporary} value={temporary} onChange={setTemporary} type="password" autoComplete="current-password" />}
        <TextField label={t.next} value={next} onChange={setNext} type="password" autoComplete="new-password" />
        <TextField label={t.confirm} value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" error={error} />
        <ul className="rules" aria-label={t.rulesLabel}>
          {rules.map((rule) => (
            <li key={rule.key} className={rule.ok ? 'rules__item is-ok' : 'rules__item'}>
              <Icon name="check" size={16} />
              {t.rules[rule.key]}
              <span className="sr-only">{rule.ok ? t.met : t.unmet}</span>
            </li>
          ))}
        </ul>
        <button type="submit" className="btn btn--primary btn--large btn--block" disabled={busy || !ready}>
          {t.submit}
        </button>
      </form>
    </main>
  );
}
