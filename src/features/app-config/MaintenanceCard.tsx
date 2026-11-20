import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pill } from '../../components/Pill';
import { Switch } from '../../components/Switch';
import { TextField } from '../../components/TextField';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import type { MaintenanceInput } from '../../lib/api/admin';
import type { Maintenance } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { codePointLength } from '../../lib/text';
import { APP_MESSAGE_MAX } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.appConfig.maintenance;

/** 점검(D6 아래 카드): 켜면 앱과 웹의 모든 요청이 막힌다. 켜기는 반드시 한 번 묻는다. */
export function MaintenanceCard({ maintenance, onSaved }: { maintenance: Maintenance; onSaved: (next: Maintenance) => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState(maintenance.active);
  const [message, setMessage] = useState(maintenance.message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<MaintenanceInput | null>(null);
  const [busy, setBusy] = useState(false);
  const messageCount = codePointLength(message.trim());

  const send = async (input: MaintenanceInput) => {
    setBusy(true);
    try {
      const next = await api.putMaintenance(input);
      setActive(next.active);
      setMessage(next.message ?? '');
      onSaved(next);
      toast.success(next.active === maintenance.active ? t.saved : next.active ? t.savedOn : t.savedOff);
    } catch (e) {
      // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(messageCount > APP_MESSAGE_MAX ? t.errors.INVALID_MESSAGE : null);
    if (messageCount > APP_MESSAGE_MAX) return;
    // 두 키를 모두 보낸다. 끌 때도 안내 문구는 그대로 보낸다(다음에 켤 때 쓴다).
    const input: MaintenanceInput = { active, message: message.trim() === '' ? null : message.trim() };
    if (input.active && !maintenance.active) setAsking(input);
    else void send(input);
  };

  return (
    <form className="card config-card" aria-label={t.title} onSubmit={submit} noValidate>
      <h2 className="sec-title">
        {t.title}
        <Pill tone={maintenance.active ? 'warn' : 'mute'} dot={maintenance.active}>
          {maintenance.active ? t.on : t.off}
        </Pill>
      </h2>
      <Switch label={t.active} help={t.activeHelp} checked={active} onChange={setActive} disabled={busy} />
      <TextField
        label={t.message}
        value={message}
        onChange={setMessage}
        placeholder={t.messagePlaceholder}
        help={t.messageHelp}
        error={error}
        counter={{ count: messageCount, max: APP_MESSAGE_MAX }}
      />
      <div className="config-card__foot">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {strings.common.save}
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
