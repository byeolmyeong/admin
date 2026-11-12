import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadError, Loading, Notice } from '../../components/Feedback';
import { Switch } from '../../components/Switch';
import { TextField } from '../../components/TextField';
import { strings } from '../../content/strings';
import type { PlatformConfigInput } from '../../lib/api/admin';
import { PLATFORMS } from '../../lib/api/types';
import type { Platform, PlatformConfig } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatDateTime } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { APP_MESSAGE_MAX, compareVersions, isValidStoreUrl, isValidVersion } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';

const t = strings.appConfig;
type Message = { tone: 'success' | 'error'; text: string };
/** 저장 전에 묻는 창: 묻는 까닭과 그대로 보낼 본문 */
interface Asking {
  title: string;
  body: string;
  confirmLabel: string;
  danger: boolean;
  input: PlatformConfigInput;
}

function PlatformCard({ platform, config, onSaved }: { platform: Platform; config: PlatformConfig; onSaved: (next: PlatformConfig) => void }) {
  const { api } = useAuth();
  const name = t.platforms[platform];
  // 폼은 GET 으로 받은 값으로 채운다(저장은 네 값을 통째로 보낸다).
  const [minVersion, setMinVersion] = useState(config.minVersion ?? '');
  const [storeUrl, setStoreUrl] = useState(config.storeUrl ?? '');
  const [message, setMessage] = useState(config.message ?? '');
  const [blockNow, setBlockNow] = useState(config.blockNow);
  const [errors, setErrors] = useState<{ minVersion?: string; storeUrl?: string; message?: string; blockNow?: string }>({});
  const [asking, setAsking] = useState<Asking | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Message | null>(null);
  const messageCount = codePointLength(message.trim());

  const send = async (input: PlatformConfigInput) => {
    setBusy(true);
    try {
      const next = await api.putPlatformConfig(platform, input);
      setMinVersion(next.minVersion ?? '');
      setStoreUrl(next.storeUrl ?? '');
      setMessage(next.message ?? '');
      setBlockNow(next.blockNow);
      onSaved(next);
      setResult({ tone: 'success', text: t.saved(name) });
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
    // 비운 칸은 null 로 보낸다(minVersion · storeUrl 의 빈 글은 틀린 값이다). 안내 문구만 앞뒤 공백을 뗀다.
    const input: PlatformConfigInput = {
      minVersion: minVersion === '' ? null : minVersion,
      storeUrl: storeUrl === '' ? null : storeUrl,
      message: message.trim() === '' ? null : message.trim(),
      blockNow,
    };
    const found = {
      minVersion: input.minVersion !== null && !isValidVersion(input.minVersion) ? t.errors.INVALID_VERSION : undefined,
      storeUrl: input.storeUrl !== null && !isValidStoreUrl(input.storeUrl) ? t.errors.INVALID_STORE_URL : undefined,
      message: messageCount > APP_MESSAGE_MAX ? t.errors.INVALID_MESSAGE : undefined,
      blockNow: input.blockNow && input.minVersion === null ? t.errors.BLOCK_REQUIRES_MIN_VERSION : undefined,
    };
    setErrors(found);
    setResult(null);
    if (found.minVersion || found.storeUrl || found.message || found.blockNow) return;

    const version = input.minVersion;
    const raised = version !== null && (config.minVersion === null || !isValidVersion(config.minVersion) || compareVersions(version, config.minVersion) > 0);
    const blockTurnedOn = input.blockNow && !config.blockNow;
    if (version !== null && (raised || blockTurnedOn)) {
      const body = [raised && t.confirm.versionBody(name, version), input.blockNow && t.confirm.blockBody(version)].filter(Boolean).join(' ');
      setAsking({
        title: blockTurnedOn ? t.confirm.blockTitle : t.confirm.versionTitle,
        body,
        confirmLabel: blockTurnedOn ? t.confirm.blockConfirm : t.confirm.versionConfirm,
        danger: input.blockNow,
        input,
      });
      return;
    }
    void send(input);
  };

  return (
    <form className="card form" aria-label={t.platformTitle(name)} onSubmit={submit} noValidate>
      <h2 className="section-title">{t.platformTitle(name)}</h2>
      <TextField label={t.minVersion} value={minVersion} onChange={setMinVersion} help={t.minVersionHelp} error={errors.minVersion} autoComplete="off" />
      <TextField label={t.storeUrl} value={storeUrl} onChange={setStoreUrl} help={t.storeUrlHelp} error={errors.storeUrl} autoComplete="off" />
      <TextField
        label={t.message}
        value={message}
        onChange={setMessage}
        multiline
        rows={3}
        help={t.messageHelp}
        error={errors.message}
        counter={{ count: messageCount, max: APP_MESSAGE_MAX }}
      />
      <Switch label={t.blockNow} checked={blockNow} onChange={setBlockNow} disabled={busy} />
      {errors.blockNow && <p className="field__error">{errors.blockNow}</p>}
      <p className="quiet">{t.blockNote}</p>
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <div className="row">
        <p className="quiet">{t.updated(config.updatedBy?.name ?? null, formatDateTime(config.updatedAt))}</p>
        <span className="row__gap" />
        <button type="submit" className="btn btn--primary btn--small" disabled={busy}>
          {busy ? strings.common.saving : strings.common.save}
        </button>
      </div>
      {asking && (
        <ConfirmDialog
          title={asking.title}
          body={asking.body}
          confirmLabel={asking.confirmLabel}
          danger={asking.danger}
          busy={busy}
          onConfirm={() => void send(asking.input)}
          onCancel={() => setAsking(null)}
        />
      )}
    </form>
  );
}

export function AppConfigPage() {
  const { api } = useAuth();
  const { state, reload, setData } = useLoad(useCallback(() => api.getAppConfig(), [api]));
  const config = state.status === 'ready' ? state.data : null;

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">{t.title}</h1>
      </header>
      <p className="note">{t.delayNote}</p>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
      {config && (
        <>
          <div className="cards">
            {PLATFORMS.map((platform) => (
              <PlatformCard key={platform} platform={platform} config={config[platform]} onSaved={(next) => setData({ ...config, [platform]: next })} />
            ))}
          </div>
          <p className="note note--quiet">{strings.common.timeZoneNote}</p>
        </>
      )}
    </div>
  );
}
