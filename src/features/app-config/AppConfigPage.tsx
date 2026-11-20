import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadError, Loading } from '../../components/Feedback';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Switch } from '../../components/Switch';
import { TextField } from '../../components/TextField';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import type { PlatformConfigInput } from '../../lib/api/admin';
import { PLATFORMS } from '../../lib/api/types';
import type { Platform, PlatformConfig } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { useLoad } from '../../lib/useLoad';
import { compareVersions, isValidStoreUrl, isValidVersion } from '../../lib/validation';
import { useAuth } from '../auth/AuthContext';
import { MaintenanceCard } from './MaintenanceCard';
import { useMaintenance } from './MaintenanceContext';

const t = strings.appConfig;
/** 저장 전에 묻는 창: 묻는 까닭과 그대로 보낼 본문 */
interface Asking {
  title: string;
  body: string;
  confirmLabel: string;
  danger: boolean;
  input: PlatformConfigInput;
}

/**
 * 플랫폼 카드(D6): 최신 버전 · 최소 버전 · 스토어 주소 · 즉시 차단. 업데이트 안내 문구(message)는 화면에 두지 않고 받은 값을 그대로 보낸다.
 * 최신 버전(latestVersion)은 S⑧ — 옛 서버는 이 키를 무시한다.
 */
function PlatformCard({ platform, config, onSaved }: { platform: Platform; config: PlatformConfig; onSaved: (next: PlatformConfig) => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const name = t.platforms[platform];
  // 폼은 GET 으로 받은 값으로 채운다(저장은 네 값을 통째로 보낸다).
  const [latestVersion, setLatestVersion] = useState(config.latestVersion ?? '');
  const [minVersion, setMinVersion] = useState(config.minVersion ?? '');
  const [storeUrl, setStoreUrl] = useState(config.storeUrl ?? '');
  const [blockNow, setBlockNow] = useState(config.blockNow);
  const [errors, setErrors] = useState<{ latestVersion?: string; minVersion?: string; storeUrl?: string; blockNow?: string }>({});
  const [asking, setAsking] = useState<Asking | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (input: PlatformConfigInput) => {
    setBusy(true);
    try {
      const next = await api.putPlatformConfig(platform, input);
      setLatestVersion(next.latestVersion ?? input.latestVersion ?? '');
      setMinVersion(next.minVersion ?? '');
      setStoreUrl(next.storeUrl ?? '');
      setBlockNow(next.blockNow);
      onSaved(next);
      toast.success(t.saved(name));
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
    // 비운 칸은 null 로 보낸다(minVersion · storeUrl 의 빈 글은 틀린 값이다).
    const input: PlatformConfigInput = {
      latestVersion: latestVersion === '' ? null : latestVersion,
      minVersion: minVersion === '' ? null : minVersion,
      storeUrl: storeUrl === '' ? null : storeUrl,
      message: config.message,
      blockNow,
    };
    const latestBad = input.latestVersion !== null && !isValidVersion(input.latestVersion);
    const minBad = input.minVersion !== null && !isValidVersion(input.minVersion);
    const found = {
      latestVersion: latestBad
        ? t.errors.INVALID_VERSION
        : input.latestVersion !== null && input.minVersion !== null && !minBad && compareVersions(input.latestVersion, input.minVersion) < 0
          ? t.errors.LATEST_BELOW_MIN
          : undefined,
      minVersion: minBad ? t.errors.INVALID_VERSION : undefined,
      storeUrl: input.storeUrl !== null && !isValidStoreUrl(input.storeUrl) ? t.errors.INVALID_STORE_URL : undefined,
      blockNow: input.blockNow && input.minVersion === null ? t.errors.BLOCK_REQUIRES_MIN_VERSION : undefined,
    };
    setErrors(found);
    if (found.latestVersion || found.minVersion || found.storeUrl || found.blockNow) return;

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
    <form className="card config-card" aria-label={t.platformTitle(name)} onSubmit={submit} noValidate>
      <h2 className="sec-title">
        {name}
        <Pill tone={config.blockNow ? 'bad' : 'ok'}>{config.blockNow ? t.blocking : t.notBlocking}</Pill>
      </h2>
      <div className="f2">
        <TextField label={t.latestVersion} value={latestVersion} onChange={setLatestVersion} help={t.latestVersionHelp} error={errors.latestVersion} autoComplete="off" />
        <TextField label={t.minVersion} value={minVersion} onChange={setMinVersion} help={t.minVersionHelp} error={errors.minVersion} autoComplete="off" />
      </div>
      <TextField label={t.storeUrl} value={storeUrl} onChange={setStoreUrl} error={errors.storeUrl} autoComplete="off" />
      <div className="config-card__switch">
        <Switch label={t.blockNow} help={t.blockHelp} checked={blockNow} onChange={setBlockNow} disabled={busy} danger />
        {errors.blockNow && (
          <p className="field__error" role="alert">
            {errors.blockNow}
          </p>
        )}
      </div>
      <div className="config-card__foot">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {strings.common.save}
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

  // 받아 왔거나 저장한 점검 상태를 화면 틀의 띠에 알린다(결정 002).
  const { report } = useMaintenance();
  const maintenance = config?.maintenance;
  useEffect(() => {
    if (maintenance) report(maintenance);
  }, [maintenance, report]);

  return (
    <>
      <PageHeader title={t.title}>
        <span className="hide-tablet">{t.headNote}</span>
      </PageHeader>
      <div className="body">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
        {config && (
          <>
            <div className="cols-2">
              {PLATFORMS.map((platform) => (
                <PlatformCard key={platform} platform={platform} config={config[platform]} onSaved={(next) => setData({ ...config, [platform]: next })} />
              ))}
            </div>
            <MaintenanceCard maintenance={config.maintenance} onSaved={(next) => setData({ ...config, maintenance: next })} />
          </>
        )}
      </div>
    </>
  );
}
