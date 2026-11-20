import { useCallback, useId, useState } from 'react';
import brandMark from '../../assets/brand-mark.svg';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import { PUSH_TARGETS } from '../../lib/api/types';
import type { PushEvent, PushStatus, PushTarget } from '../../lib/api/types';
import { errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatKst } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthContext';

const t = strings.push;
const TITLE_MAX = 40;
const BODY_MAX = 120;
const HISTORY_SIZE = 10;
const n = (v: number | null | undefined): string => (v === null || v === undefined ? t.none : v.toLocaleString('ko-KR'));

const seoulHour = (now: number): number => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }).format(now));
/** 다음 08:00(한국 시각)의 UTC 글자 */
const nextEight = (now: number): string => {
  const kst = new Date(now + 9 * 3_600_000);
  const day = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3_600_000 + 8 * 3_600_000;
  return new Date(seoulHour(now) < 8 ? day : day + 86_400_000).toISOString();
};

/**
 * 보낼 수 있는지(D28 · D28-1). 서버의 상태(결정 043 의 6)를 먼저 따르고, 아직 없으면 화면이 야간(21:00 ~ 08:00)만 본다.
 */
const blockOf = (status: PushStatus | null, now: number): { kind: 'today' | 'night' | null; at: string | null; by: string | null; next: string | null } => {
  if (status) {
    if (status.canSend) return { kind: null, at: null, by: null, next: null };
    if (status.reason === 'DAILY_LIMIT') return { kind: 'today', at: status.sentTodayAt, by: status.sentTodayBy, next: status.nextAvailableAt };
    return { kind: 'night', at: null, by: null, next: status.nextAvailableAt };
  }
  const hour = seoulHour(now);
  return hour >= 21 || hour < 8 ? { kind: 'night', at: null, by: null, next: nextEight(now) } : { kind: null, at: null, by: null, next: null };
};

const historyColumns: Column<PushEvent>[] = [
  { key: 'sentAt', header: t.columns.sentAt, render: (e) => <span className="mono">{formatKst(e.sentAt)}</span>, className: 'nowrap' },
  { key: 'title', header: t.columns.title, render: (e) => e.title },
  { key: 'recipients', header: t.columns.recipients, render: (e) => strings.users.people(n(e.recipients)) },
  { key: 'result', header: t.columns.result, render: (e) => (e.succeeded === null ? t.sending : t.result(n(e.succeeded), n(e.failed))) },
  { key: 'sentBy', header: t.columns.sentBy, render: (e) => e.sentBy ?? t.none },
];

function DevicePreview({ title, body }: { title: string; body: string }) {
  return (
    <section className="card side-card" aria-labelledby="device-title">
      <h2 className="sec-title" id="device-title">
        {t.preview}
      </h2>
      <div className="device">
        <div className="device__note">
          <img src={brandMark} alt="" className="device__icon" />
          <span className="device__text">
            <b>
              {t.adPrefix}
              {title.trim() || t.previewTitle}
            </b>
            <span>{body.trim() || t.previewBody}</span>
          </span>
        </div>
      </div>
      <p className="field__help">{t.previewNote}</p>
    </section>
  );
}

/** 푸시 발송(D7 · D14 · D28 · D28-1): 제목 · 본문 · 이동 화면 · 발송 대상 수 · 기기 미리보기 · 발송 내역. */
export function PushPage() {
  const { api } = useAuth();
  const toast = useToast();
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<PushTarget | ''>('HOME');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const audience = useLoad(useCallback(() => api.getPushAudience(), [api]));
  const status = useLoad(useCallback(() => api.getPushStatus(), [api]));
  const history = useLoad(useCallback(() => api.listPushEvents(0, HISTORY_SIZE), [api]));

  const count = audience.state.status === 'ready' ? audience.state.data : null;
  const block = blockOf(status.state.status === 'ready' ? status.state.data : null, Date.now());
  const titleCount = codePointLength(title.trim());
  const bodyCount = codePointLength(body.trim());
  const valid = titleCount >= 1 && titleCount <= TITLE_MAX && bodyCount >= 1 && bodyCount <= BODY_MAX && target !== '';
  const chosen: PushTarget | null = target === '' ? null : target;
  const canSend = valid && block.kind === null && !busy;
  const events = history.state.status === 'ready' ? history.state.data.items : [];

  const send = async () => {
    if (!canSend || chosen === null) return;
    setBusy(true);
    try {
      const sent = await api.sendPush({ title: title.trim(), body: body.trim(), target: chosen });
      toast.success(t.sent(n(sent.recipients)));
      setTitle('');
      setBody('');
      status.reload();
      history.reload();
    } catch (e) {
      // 실패해도 적던 내용은 그대로 둔다(결정 003 의 5).
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <PageHeader title={t.title} />
      <div className="body">
        <div className="split split--push">
          <div className="side-cards">
            <section className="card compose" aria-labelledby="compose-title">
              <h2 className="sec-title" id="compose-title">
                {t.compose}
              </h2>
              <div className="field">
                <label className="field__label" htmlFor={titleId}>
                  {t.titleLabel}
                </label>
                <input id={titleId} className="input" value={title} aria-invalid={titleCount > TITLE_MAX ? true : undefined} onChange={(e) => setTitle(e.target.value)} />
                <span className={titleCount > TITLE_MAX ? 'field__count field__count--over compose__count' : 'field__count compose__count'}>
                  {strings.common.counter(titleCount, TITLE_MAX)}
                </span>
              </div>
              <div className="field">
                <label className="field__label" htmlFor={bodyId}>
                  {t.bodyLabel}
                </label>
                <div className="textarea-box">
                  <textarea id={bodyId} className="textarea-box__input textarea-box__input--short" value={body} onChange={(e) => setBody(e.target.value)} />
                  <span className={bodyCount > BODY_MAX ? 'field__count field__count--over' : 'field__count'}>{strings.common.counter(bodyCount, BODY_MAX)}</span>
                </div>
              </div>
              <div className="field">
                <span className="field__label">{t.target}</span>
                <Select variant="field" ariaLabel={t.target} value={target} options={PUSH_TARGETS.map((value) => ({ value, label: t.targets[value] }))} onChange={setTarget} />
              </div>
              <p className="info-box">
                <b>{t.audience(n(count))}</b>
                <br />
                <span className="info-box__sub">{t.audienceNote}</span>
              </p>
              {block.kind === 'today' && (
                <p className="info-box info-box--warn" role="status">
                  {t.blockedToday(block.at ? formatKst(block.at) : t.none, block.by ?? t.none, block.next ? formatKst(block.next) : t.none)}
                </p>
              )}
              {block.kind === 'night' && (
                <p className="info-box info-box--warn" role="status">
                  {t.blockedNight(block.next ? formatKst(block.next) : t.none)}
                </p>
              )}
              <ul className="compose__notes">
                <li>{t.dailyNote(block.kind === 'today')}</li>
                <li>{t.nightNote}</li>
              </ul>
              <div className="compose__foot">
                <button type="button" className="btn btn--primary btn--large" disabled={!canSend} onClick={() => setConfirming(true)}>
                  {t.send(n(count))}
                </button>
              </div>
            </section>

            <section className="card list-card push-history" aria-labelledby="history-title">
              <h2 className="sec-title push-history__head" id="history-title">
                {t.history}
              </h2>
              {events.length === 0 ? (
                <p className="field__help push-history__empty">{t.historyEmpty}</p>
              ) : (
                <Table
                  label={t.historyLabel}
                  columns={historyColumns}
                  rows={events}
                  rowKey={(e) => e.id}
                  card={(e) => (
                    <>
                      <span className="row-card__title">{e.title}</span>
                      <span>{[formatKst(e.sentAt), strings.users.people(n(e.recipients)), e.failed === null ? t.sending : `${t.columns.result} ${t.result(n(e.succeeded), n(e.failed))}`].join(' · ')}</span>
                    </>
                  )}
                />
              )}
            </section>
          </div>

          <DevicePreview title={title} body={body} />
        </div>
      </div>

      {confirming && (
        <ConfirmDialog title={t.confirmTitle} confirmLabel={t.confirm} busy={busy} onConfirm={() => void send()} onCancel={() => setConfirming(false)}>
          <div className="push-confirm">
            <b>
              {t.adPrefix}
              {title.trim()}
            </b>
            <span>{body.trim()}</span>
            <span className="muted">{t.optOut}</span>
          </div>
          <p className="dialog__body">{t.confirmNote(n(count))}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
