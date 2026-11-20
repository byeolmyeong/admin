import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadError, Loading } from '../../components/Feedback';
import { FormDialog } from '../../components/FormDialog';
import { MoreMenu } from '../../components/MoreMenu';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { TextField } from '../../components/TextField';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import type { AdminAccount } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { formatKst } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { isValidLoginId, isValidName, normalizeLoginId, passwordProblem } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';
import { ResetPasswordDialog } from './ResetPasswordDialog';

const t = strings.admins;

/**
 * 관리자 추가(지금 계약: 아이디 · 이름 · 임시 비밀번호 — 결정 014).
 * 서버 결정 043 의 "아이디만 적고 서버가 임시 비밀번호를 만든다"(D16 · D17)는 계획 D③ 에서 바꾼다.
 */
function CreateDialog({ onCreated, onCancel }: { onCreated: (made: AdminAccount) => void; onCancel: () => void }) {
  const { api } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ loginId?: string; name?: string; password?: string; form?: string }>({});

  const submit = async () => {
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
      onCreated(await api.createAdmin({ loginId: id, name: name.trim(), password }));
    } catch (e) {
      setErrors({ form: errorMessage(e, t.errors) });
      setBusy(false);
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setPassword('');
    }
  };

  return (
    <FormDialog title={t.createTitle} submitLabel={t.createSubmit} busy={busy} onSubmit={submit} onCancel={onCancel}>
      <TextField label={t.loginId} value={loginId} onChange={setLoginId} help={t.loginIdHelp} error={errors.loginId ?? errors.form} autoComplete="off" />
      <TextField label={t.name} value={name} onChange={setName} help={t.nameHelp} error={errors.name} autoComplete="off" />
      <TextField label={t.password} value={password} onChange={setPassword} type="password" help={t.passwordHelp} error={errors.password} autoComplete="new-password" />
    </FormDialog>
  );
}

/** 내 비밀번호 변경(D9 왼쪽 아래 카드) */
function PasswordCard() {
  const { api } = useAuth();
  const toast = useToast();
  const p = strings.password;
  const titleId = useId();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = passwordProblem(next);
    const found = { current: current === '' ? p.required : undefined, next: problem === null ? undefined : strings.passwordRule[problem] };
    setErrors(found);
    if (found.current || found.next) return;
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast.success(p.done);
    } catch (e) {
      toast.error(errorMessage(e, p.errors));
    } finally {
      // 비밀번호는 요청 뒤 화면 상태에 남기지 않는다.
      setCurrent('');
      setNext('');
      setBusy(false);
    }
  };

  return (
    <form className="card side-card password-card" aria-labelledby={titleId} onSubmit={submit} noValidate>
      <h2 className="sec-title" id={titleId}>
        {p.title}
      </h2>
      <TextField label={p.current} value={current} onChange={setCurrent} type="password" error={errors.current} autoComplete="current-password" />
      <TextField label={p.next} value={next} onChange={setNext} type="password" help={strings.passwordRule.help} error={errors.next} autoComplete="new-password" />
      <p className="field__help">{p.note}</p>
      <div className="side-card__foot side-card__foot--end">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {p.submit}
        </button>
      </div>
    </form>
  );
}

function Avatar({ loginId }: { loginId: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {loginId.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** 관리자(D9): 목록(⋯ 메뉴: 비밀번호 재설정 · 비활성화/활성화)과 내 비밀번호 변경. */
export function AdminsPage() {
  const { api, admin: me } = useAuth();
  const toast = useToast();
  const { state, reload, setData } = useLoad(useCallback(() => api.listAdmins(), [api]));
  const [creating, setCreating] = useState(false);
  const [asking, setAsking] = useState<AdminAccount | null>(null);
  const [resetting, setResetting] = useState<AdminAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const admins = state.status === 'ready' ? state.data : null;

  const setActive = async (target: AdminAccount, active: boolean) => {
    if (!admins || busy) return;
    setBusy(true);
    try {
      const next = await api.setAdminActive(target.id, active);
      setData(admins.map((item) => (item.id === next.id ? next : item)));
      toast.success(active ? t.done.reactivated(next.loginId) : t.done.deactivated(next.loginId));
    } catch (e) {
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  const actions = (item: AdminAccount) =>
    me?.id === item.id ? null : (
      <MoreMenu
        label={t.more(item.loginId)}
        items={[
          { label: t.reset.button, onSelect: () => setResetting(item) },
          { label: item.active ? t.deactivate : t.reactivate, danger: item.active, onSelect: () => setAsking(item) },
        ]}
      />
    );

  const columns: Column<AdminAccount>[] = [
    {
      key: 'loginId',
      header: t.columns.loginId,
      render: (item) => (
        <span className="who">
          <Avatar loginId={item.loginId} />
          {item.loginId}
          {me?.id === item.id && <Pill tone="pri">{t.me}</Pill>}
        </span>
      ),
    },
    { key: 'name', header: t.columns.name, render: (item) => item.name },
    { key: 'state', header: t.columns.state, render: (item) => <Pill tone={item.active ? 'ok' : 'mute'}>{item.active ? t.active : t.inactive}</Pill> },
    { key: 'createdAt', header: t.columns.createdAt, render: (item) => <span className="mono">{formatKst(item.createdAt)}</span> },
    { key: 'action', header: t.columns.action, render: actions },
  ];

  return (
    <>
      <PageHeader title={t.title}>
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)} disabled={!admins}>
          {t.create}
        </button>
      </PageHeader>
      <div className="body">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {admins && (
          <div className="card list-card">
            <Table
              label={t.listLabel}
              columns={columns}
              rows={admins}
              rowKey={(item) => item.id}
              card={(item) => (
                <span className="admin-card">
                  <span className="who">
                    <Avatar loginId={item.loginId} />
                    <span className="row-card__title">{item.loginId}</span>
                    {me?.id === item.id && <Pill tone="pri">{t.me}</Pill>}
                  </span>
                  <Pill tone={item.active ? 'ok' : 'mute'}>{item.active ? t.active : t.inactive}</Pill>
                  {actions(item)}
                </span>
              )}
            />
          </div>
        )}
        <div className="cols-2">
          <PasswordCard />
        </div>
      </div>

      {creating && (
        <CreateDialog
          onCancel={() => setCreating(false)}
          onCreated={(made) => {
            if (admins) setData([...admins, made]);
            setCreating(false);
            toast.success(t.done.created(made.loginId));
          }}
        />
      )}
      {asking && (
        <ConfirmDialog
          title={asking.active ? t.deactivateTitle : t.reactivateTitle}
          body={asking.active ? t.deactivateBody(asking.loginId) : t.reactivateBody(asking.loginId)}
          confirmLabel={asking.active ? t.deactivate : t.reactivate}
          danger={asking.active}
          busy={busy}
          onConfirm={() => setActive(asking, !asking.active)}
          onCancel={() => setAsking(null)}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          target={resetting}
          onCancel={() => setResetting(null)}
          onDone={() => {
            toast.success(t.reset.done(resetting.loginId));
            setResetting(null);
          }}
        />
      )}
    </>
  );
}
