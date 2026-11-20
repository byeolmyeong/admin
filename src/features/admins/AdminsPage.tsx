import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadError, Loading } from '../../components/Feedback';
import { FormDialog } from '../../components/FormDialog';
import { Icon } from '../../components/icons';
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
import { ADMIN_LOGIN_ID_PATTERN, normalizeLoginId, passwordProblem } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.admins;

/** 관리자 추가(D16): 아이디만 적으면 서버가 임시 비밀번호를 만든다(결정 043 의 5). */
function CreateDialog({ onCreated, onCancel }: { onCreated: (made: AdminAccount, temporaryPassword: string) => void; onCancel: () => void }) {
  const { api } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const id = normalizeLoginId(loginId);
    if (!ADMIN_LOGIN_ID_PATTERN.test(id)) {
      setError(t.errors.INVALID_LOGIN_ID);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const made = await api.createAdmin(id);
      onCreated(made.admin, made.temporaryPassword);
    } catch (e) {
      setError(errorMessage(e, t.errors));
      setBusy(false);
    }
  };

  return (
    <FormDialog title={t.createTitle} submitLabel={t.createSubmit} busy={busy} onSubmit={submit} onCancel={onCancel}>
      <TextField label={t.loginId} value={loginId} onChange={setLoginId} help={t.loginIdHelp} error={error} autoComplete="off" />
      <p className="info-box info-box--mute">{t.createNote}</p>
    </FormDialog>
  );
}

/** 임시 비밀번호 한 번 보이기(D17 · D27-1): 복사 버튼, 창을 닫으면 다시 못 본다. */
function TemporaryDialog({ title, password, onClose }: { title: string; password: string; onClose: () => void }) {
  const toast = useToast();
  const fieldId = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };
  return (
    <div className="dialog-layer">
      <div className="dialog-layer__backdrop" data-testid="dialog-backdrop" />
      <div className="dialog card" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="dialog__title">{title}</h2>
        <div className="field">
          <label className="field__label" htmlFor={fieldId}>
            {t.temporary}
          </label>
          <div className="copy-row">
            <input id={fieldId} className="input mono selectable" value={password} readOnly />
            <button type="button" className="btn btn--secondary copy-row__button" onClick={copy}>
              <Icon name="log" size={14} />
              {t.copy}
            </button>
          </div>
        </div>
        <p className="info-box info-box--warn">{t.temporaryWarn}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
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
      <TextField label={p.next} value={next} onChange={setNext} type="password" help={p.help} error={errors.next} autoComplete="new-password" />
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

type Temporary = { title: string; password: string };

/** 관리자(D9): 목록(⋯ 메뉴: 비밀번호 재발급 · 비활성화/활성화), 관리자 추가, 내 비밀번호 변경. */
export function AdminsPage() {
  const { api, admin: me } = useAuth();
  const toast = useToast();
  const { state, reload, setData } = useLoad(useCallback(() => api.listAdmins(), [api]));
  const [creating, setCreating] = useState(false);
  const [asking, setAsking] = useState<AdminAccount | null>(null);
  const [reissuing, setReissuing] = useState<AdminAccount | null>(null);
  const [temporary, setTemporary] = useState<Temporary | null>(null);
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

  const reissue = async (target: AdminAccount) => {
    if (busy) return;
    setBusy(true);
    try {
      const password = await api.reissuePassword(target.id);
      setTemporary({ title: t.reissuedTitle(target.loginId), password });
    } catch (e) {
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setReissuing(null);
    }
  };

  const actions = (item: AdminAccount) =>
    me?.id === item.id ? null : (
      <MoreMenu
        label={t.more(item.loginId)}
        items={[
          { label: t.reissue, onSelect: () => setReissuing(item) },
          { label: item.active ? t.deactivate : t.reactivate, danger: item.active, onSelect: () => setAsking(item) },
        ]}
      />
    );

  const who = (item: AdminAccount) => (
    <span className="who">
      <Avatar loginId={item.loginId} />
      <span className="who__id">{item.loginId}</span>
    </span>
  );

  const columns: Column<AdminAccount>[] = [
    { key: 'loginId', header: t.columns.loginId, render: who },
    { key: 'role', header: t.columns.role, render: () => t.role },
    { key: 'state', header: t.columns.state, render: (item) => <Pill tone={item.active ? 'ok' : 'mute'}>{item.active ? t.active : t.inactive}</Pill> },
    { key: 'lastLogin', header: t.columns.lastLogin, render: (item) => <span className="mono">{item.lastLoginAt ? formatKst(item.lastLoginAt) : t.none}</span> },
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
                  <span className="admin-card__text">
                    {who(item)}
                    <span className="admin-card__last">{t.lastLoginLine(item.lastLoginAt ? formatKst(item.lastLoginAt) : t.none)}</span>
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
          onCreated={(made, password) => {
            if (admins) setData([...admins, made]);
            setCreating(false);
            setTemporary({ title: t.createdTitle(made.loginId), password });
          }}
        />
      )}
      {temporary && <TemporaryDialog title={temporary.title} password={temporary.password} onClose={() => setTemporary(null)} />}
      {reissuing && (
        <ConfirmDialog
          title={t.reissueTitle(reissuing.loginId)}
          body={t.reissueBody(reissuing.loginId)}
          confirmLabel={t.reissueSubmit}
          busy={busy}
          onConfirm={() => void reissue(reissuing)}
          onCancel={() => setReissuing(null)}
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
    </>
  );
}
