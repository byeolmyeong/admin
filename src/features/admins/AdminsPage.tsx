import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Empty, LoadError, Loading, Notice } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import type { AdminAccount } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatDateTime } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { isValidLoginId, isValidName, normalizeLoginId, passwordProblem } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.admins;
type Message = { tone: 'success' | 'error'; text: string };

function CreateForm({ onCreated }: { onCreated: (made: AdminAccount) => void }) {
  const { api } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ loginId?: string; name?: string; password?: string; form?: string }>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const id = normalizeLoginId(loginId);
    const problem = passwordProblem(password);
    const found = {
      loginId: isValidLoginId(id) ? undefined : t.errors.INVALID_LOGIN_ID,
      name: isValidName(name) ? undefined : t.errors.INVALID_NAME,
      password: problem === null ? undefined : strings.passwordRule[problem],
    };
    setErrors(found);
    if (found.loginId || found.name || found.password) return;

    setBusy(true);
    try {
      const made = await api.createAdmin({ loginId: id, name: name.trim(), password });
      setLoginId('');
      setName('');
      onCreated(made);
    } catch (e) {
      setErrors({ form: errorMessage(e, t.errors) });
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <form className="card form" aria-label={t.createTitle} onSubmit={submit} noValidate>
      <h2 className="section-title">{t.createTitle}</h2>
      <TextField label={t.loginId} value={loginId} onChange={setLoginId} help={t.loginIdHelp} error={errors.loginId} autoComplete="off" />
      <TextField label={t.name} value={name} onChange={setName} help={t.nameHelp} error={errors.name} autoComplete="off" />
      <TextField
        label={t.password}
        value={password}
        onChange={setPassword}
        type="password"
        help={strings.passwordRule.help}
        error={errors.password}
        autoComplete="new-password"
      />
      <p className="quiet">{t.passwordHelp}</p>
      {errors.form && <Notice tone="error">{errors.form}</Notice>}
      <div className="row row--end">
        <button type="submit" className="btn btn--primary btn--small" disabled={busy}>
          {busy ? strings.common.saving : t.createSubmit}
        </button>
      </div>
    </form>
  );
}

export function AdminsPage() {
  const { api, admin: me } = useAuth();
  const { state, reload, setData } = useLoad(useCallback(() => api.listAdmins(), [api]));
  const [asking, setAsking] = useState<AdminAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const admins = state.status === 'ready' ? state.data : null;

  const setActive = async (target: AdminAccount, active: boolean) => {
    if (busy || !admins) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await api.setAdminActive(target.id, active);
      setData(admins.map((item) => (item.id === next.id ? next : item)));
      setMessage({ tone: 'success', text: active ? t.done.reactivated(next.name) : t.done.deactivated(next.name) });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, t.errors) });
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">{t.title}</h1>
      </header>
      <p className="note">{t.note}</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
      {admins && admins.length === 0 && <Empty>{t.empty}</Empty>}
      {admins && admins.length > 0 && (
        <table className="table" aria-label={t.listLabel}>
          <thead>
            <tr>
              <th scope="col">{t.columns.name}</th>
              <th scope="col">{t.columns.loginId}</th>
              <th scope="col">{t.columns.state}</th>
              <th scope="col">{t.columns.createdAt}</th>
              <th scope="col">{t.columns.action}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name} {me?.id === item.id && <span className="badge badge--plain">{t.me}</span>}
                </td>
                <td className="mono">{item.loginId}</td>
                <td>
                  <span className={item.active ? 'badge badge--new' : 'badge badge--quiet'}>{item.active ? t.active : t.inactive}</span>
                </td>
                <td className="mono table__nowrap">{formatDateTime(item.createdAt)}</td>
                <td className="table__nowrap">
                  {/* 자기 자신은 끌 수 없다(계약: CANNOT_DEACTIVATE_SELF). 내 정보를 받기 전에는 서버가 막는다. */}
                  {me?.id !== item.id && (
                    <button type="button" className="btn btn--secondary btn--small" disabled={busy} onClick={() => setAsking(item)}>
                      {item.active ? t.deactivate : t.reactivate}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {admins && <p className="note note--quiet">{strings.common.timeZoneNote}</p>}

      {admins && (
        <CreateForm
          onCreated={(made) => {
            setData([...admins, made]);
            setMessage({ tone: 'success', text: t.done.created(made.name) });
          }}
        />
      )}

      {asking && (
        <ConfirmDialog
          title={asking.active ? t.deactivateTitle : t.reactivateTitle}
          body={asking.active ? t.deactivateBody(asking.name) : t.reactivateBody(asking.name)}
          confirmLabel={asking.active ? t.deactivate : t.reactivate}
          danger={asking.active}
          busy={busy}
          onConfirm={() => setActive(asking, !asking.active)}
          onCancel={() => setAsking(null)}
        />
      )}
    </div>
  );
}
