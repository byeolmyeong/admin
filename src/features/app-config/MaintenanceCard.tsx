import { useState } from 'react';
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
const clean = (text: string): string | null => (text.trim() === '' ? null : text.trim());

/**
 * 점검(D6 아래 카드, 저장 버튼 없음): 스위치를 켜면 확인 창 뒤 바로 켜고, 끄면 바로 끈다.
 * 안내 문구는 칸을 떠날 때 바뀌었으면 저장한다. 켜면 앱과 웹의 모든 요청이 막힌다.
 */
export function MaintenanceCard({ maintenance, onSaved }: { maintenance: Maintenance; onSaved: (next: Maintenance) => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState(maintenance.message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const messageCount = codePointLength(message.trim());

  const send = async (input: MaintenanceInput, done: string) => {
    setBusy(true);
    try {
      const next = await api.putMaintenance(input);
      setMessage(next.message ?? '');
      onSaved(next);
      toast.success(done);
    } catch (e) {
      // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  const tooLong = () => {
    const over = messageCount > APP_MESSAGE_MAX;
    setError(over ? t.errors.INVALID_MESSAGE : null);
    return over;
  };

  const toggle = (on: boolean) => {
    if (busy || tooLong()) return;
    if (on) setAsking(true);
    else void send({ active: false, message: clean(message) }, t.savedOff);
  };

  const saveMessage = () => {
    if (busy || clean(message) === (maintenance.message ?? null) || tooLong()) return;
    void send({ active: maintenance.active, message: clean(message) }, t.saved);
  };

  return (
    <section className="card config-card" aria-label={t.title}>
      <h2 className="sec-title">
        {t.title}
        <Pill tone={maintenance.active ? 'warn' : 'mute'} dot={maintenance.active}>
          {maintenance.active ? t.on : t.off}
        </Pill>
      </h2>
      <Switch label={t.active} help={t.activeHelp} checked={maintenance.active} onChange={toggle} disabled={busy} />
      {/* 스위치로 옮겨 가는 길이면 저장하지 않는다 — 스위치가 문구까지 함께 보낸다 */}
      <div
        onBlur={(e) => {
          if (!(e.relatedTarget instanceof HTMLElement && e.relatedTarget.getAttribute('role') === 'switch')) saveMessage();
        }}
      >
        <TextField
          label={t.message}
          value={message}
          onChange={setMessage}
          placeholder={t.messagePlaceholder}
          help={t.messageHelp}
          error={error}
          counter={{ count: messageCount, max: APP_MESSAGE_MAX }}
        />
      </div>
      {asking && (
        <ConfirmDialog
          title={t.confirmTitle}
          body={t.confirmBody}
          confirmLabel={t.confirmLabel}
          danger
          busy={busy}
          onConfirm={() => void send({ active: true, message: clean(message) }, t.savedOn)}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}
