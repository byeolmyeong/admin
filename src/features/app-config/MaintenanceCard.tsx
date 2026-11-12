import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Notice } from '../../components/Feedback';
import { Switch } from '../../components/Switch';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import type { MaintenanceInput } from '../../lib/api/admin';
import type { Maintenance } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatDateTime } from '../../lib/text';
import { APP_MESSAGE_MAX } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.appConfig.maintenance;
type Message = { tone: 'success' | 'error'; text: string };

/** 점검: 켜면 앱과 웹의 모든 요청이 막힌다. 켜기는 반드시 한 번 묻는다. */
export function MaintenanceCard({ maintenance, onSaved }: { maintenance: Maintenance; onSaved: (next: Maintenance) => void }) {
  const { api } = useAuth();
  const [active, setActive] = useState(maintenance.active);
  const [message, setMessage] = useState(maintenance.message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<MaintenanceInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Message | null>(null);
  const messageCount = codePointLength(message.trim());

  const send = async (input: MaintenanceInput) => {
    setBusy(true);
    try {
      const next = await api.putMaintenance(input);
      setActive(next.active);
      setMessage(next.message ?? '');
      onSaved(next);
      setResult({ tone: 'success', text: next.active === maintenance.active ? t.saved : next.active ? t.savedOn : t.savedOff });
    } catch (e) {
      setResult({ tone: 'error', text: errorMessage(e, t.errors) });
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setResult(null);
    setError(messageCount > APP_MESSAGE_MAX ? t.errors.INVALID_MESSAGE : null);
    if (messageCount > APP_MESSAGE_MAX) return;
    // 두 키를 모두 보낸다. 끌 때도 안내 문구는 그대로 보낸다(다음에 켤 때 쓴다).
    const input: MaintenanceInput = { active, message: message.trim() === '' ? null : message.trim() };
    if (input.active && !maintenance.active) setAsking(input);
    else void send(input);
  };

  return (
    <form className={maintenance.active ? 'card card--alert form' : 'card card--strong form'} aria-label={t.title} onSubmit={submit} noValidate>
      <div className="row">
        <h2 className="section-title">{t.title}</h2>
        <span className={maintenance.active ? 'badge badge--danger' : 'badge badge--quiet'}>{maintenance.active ? t.on : t.off}</span>
      </div>
      <p className="quiet">{t.note}</p>
      <Switch label={t.active} checked={active} onChange={setActive} disabled={busy} danger />
      <TextField
        label={t.message}
        value={message}
        onChange={setMessage}
        multiline
        rows={3}
        help={t.messageHelp}
        error={error}
        counter={{ count: messageCount, max: APP_MESSAGE_MAX }}
      />
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <div className="row">
        <p className="quiet">{strings.appConfig.updated(maintenance.updatedBy?.name ?? null, formatDateTime(maintenance.updatedAt))}</p>
        <span className="row__gap" />
        <button type="submit" className="btn btn--primary btn--small" disabled={busy}>
          {busy ? strings.common.saving : strings.common.save}
        </button>
      </div>
      {asking && (
        <ConfirmDialog
          title={t.confirmTitle}
          body={t.confirmBody}
          confirmLabel={t.confirmLabel}
          danger
          busy={busy}
          onConfirm={() => void send(asking)}
          onCancel={() => setAsking(null)}
        />
      )}
    </form>
  );
}
