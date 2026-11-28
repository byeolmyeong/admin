import { useCallback, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadError, Loading } from '../../components/Feedback';
import { MoreLink } from '../../components/MoreLink';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { useToast } from '../../components/Toast';
import { strings } from '../../content/strings';
import type { UserDetail } from '../../lib/api/types';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { codePointLength, formatKst, oneLine } from '../../lib/text';
import { useLoad } from '../../lib/useLoad';
import { actionLabel } from '../audit/labels';
import { useAuth } from '../auth/AuthContext';
import { categoryLabel, platformLabel, providerLabel, statusLabel, statusTone } from '../inquiries/labels';
import { REGENERATABLE, generationKind, generationStatus, generationTone, initialOf, nicknameOf, userStatusLabel, userStatusTone } from './labels';

const t = strings.users.detail;
const REASON_MAX = 200;

/** "오전 8:00" — 받는 시간(HH:mm)을 한국 표기로 */
const clock = (hhmm: string | null): string => {
  if (hhmm === null) return '';
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;
};

/** 사유 칸이 있는 확인 창(D12 이용 정지 · D26-1 정지 해제 · D13 계정 삭제) */
function ReasonDialog({
  title,
  body,
  reasonLabel,
  placeholder,
  confirmLabel,
  danger,
  nickname,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  reasonLabel: string;
  placeholder: string;
  confirmLabel: string;
  danger: boolean;
  /** 있으면 닉네임을 다시 적어야 켜진다(계정 삭제) */
  nickname?: string;
  busy: boolean;
  onConfirm: (reason: string, confirmNickname: string) => void;
  onCancel: () => void;
}) {
  const reasonId = useId();
  const nickId = useId();
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const count = codePointLength(reason.trim());
  const ready = count >= 1 && count <= REASON_MAX && (nickname === undefined || typed.trim() === nickname);
  return (
    <ConfirmDialog title={title} body={body} confirmLabel={confirmLabel} danger={danger} busy={busy} confirmDisabled={!ready} onConfirm={() => onConfirm(reason.trim(), typed.trim())} onCancel={onCancel}>
      <div className="field">
        <label className="field__label" htmlFor={reasonId}>
          {reasonLabel}
        </label>
        <div className="textarea-box">
          <textarea id={reasonId} className="textarea-box__input textarea-box__input--short" placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} />
          <span className={count > REASON_MAX ? 'field__count field__count--over' : 'field__count'}>{strings.common.counter(count, REASON_MAX)}</span>
        </div>
      </div>
      {nickname !== undefined && (
        <div className="field">
          <label className="field__label" htmlFor={nickId}>
            {strings.users.detail.deleteDialog.nickname}
          </label>
          <input id={nickId} className="input" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
    </ConfirmDialog>
  );
}

type Asking = 'suspend' | 'unsuspend' | 'delete' | null;

function Detail({ user, onReload }: { user: UserDetail; onReload: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [asking, setAsking] = useState<Asking>(null);
  const [busy, setBusy] = useState(false);
  const name = nicknameOf(user);
  const suspended = user.status === 'SUSPENDED';
  const c = user.consents;
  const birth = user.birth;
  const birthParts = birth.hasTime && birth.hasPlace ? t.birthParts.both : birth.hasTime ? t.birthParts.time : birth.hasPlace ? t.birthParts.place : t.birthParts.none;

  const run = async (work: () => Promise<void>, done: string, after: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      toast.success(done);
      after();
    } catch (e) {
      toast.error(errorMessage(e, t.errors));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  return (
    <>
      <section className="card profile">
        <span className="avatar avatar--large" aria-hidden="true">
          {initialOf(user)}
        </span>
        <span className="profile__text">
          <span className="profile__name">
            <b>{name}</b>
            <Pill tone={userStatusTone(user.status)}>{userStatusLabel(user.status)}</Pill>
          </span>
          <span className="muted">
            {[providerLabel(user.provider), user.emailMasked, strings.users.joinedLine(formatKst(user.joinedAt)), user.lastSeenAt ? t.lastSeen(formatKst(user.lastSeenAt)) : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="profile__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setAsking(suspended ? 'unsuspend' : 'suspend')}>
            {suspended ? t.unsuspend : t.suspend}
          </button>
          <button type="button" className="btn btn--danger" onClick={() => setAsking('delete')}>
            {t.delete}
          </button>
        </span>
      </section>

      {user.suspension && (
        <section className="card suspended" aria-label={t.suspendedTitle}>
          <p className="suspended__title">
            <span className="banner__dot suspended__dot" aria-hidden="true" />
            {t.suspendedTitle}
          </p>
          <p>{t.suspendedLine(formatKst(user.suspension.at), user.suspension.by?.name ?? strings.users.none, user.suspension.reason)}</p>
          <p className="field__help">{t.suspendedNote}</p>
        </section>
      )}

      <div className="cols-2 cols-2--user">
        <div className="side-cards">
          <section className="card side-card" aria-labelledby="account-title">
            <h2 className="sec-title" id="account-title">
              {t.account}
            </h2>
            <dl className="kv">
              <dt>{t.terms}</dt>
              <dd>{c.termsVersion ?? strings.users.none}</dd>
              <dt>{t.push}</dt>
              <dd>{c.pushAt ? t.agreed(formatKst(c.pushAt)) : t.notAgreed}</dd>
              <dt>{t.marketing}</dt>
              <dd>{c.marketingAt ? t.agreed(formatKst(c.marketingAt)) : t.notAgreed}</dd>
              <dt>{t.todaySky}</dt>
              <dd>{user.todaySky ? (user.todaySky.on ? t.on(clock(user.todaySky.time)) : t.off) : strings.users.none}</dd>
              <dt>{t.birth}</dt>
              <dd>
                {birth.registered ? (
                  <>
                    {t.birthRegistered(birthParts)} <span className="muted">{t.hidden}</span>
                  </>
                ) : (
                  t.birthNone
                )}
              </dd>
            </dl>
          </section>

          <section className="card side-card" aria-labelledby="gen-title">
            <h2 className="sec-title" id="gen-title">
              {t.generations}
            </h2>
            <ul className="gen-list">
              {user.generations.map((g) => (
                <li key={g.kind} className="gen-list__row">
                  <span>{generationKind(g.kind)}</span>
                  <span className="gen-list__end">
                    <Pill tone={generationTone(g.status)}>{t.genLine(generationStatus(g.status), g.at ? formatKst(g.at) : null)}</Pill>
                    {g.status === 'FAILED' && REGENERATABLE.includes(g.kind) && (
                      <button type="button" className="btn btn--secondary btn--compact" disabled={busy} onClick={() => run(() => api.regenerate(user.id, g.kind), t.regenerated, onReload)}>
                        {t.regenerate}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="side-cards">
          <section className="card side-card" aria-labelledby="devices-title">
            <h2 className="sec-title" id="devices-title">
              {t.devices}
            </h2>
            {/* 서버 푸시 묶음 전에는 devices 가 없다 — "—" */}
            {!user.devices ? (
              <p className="field__help">{strings.users.none}</p>
            ) : user.devices.length === 0 ? (
              <p className="field__help">{t.noDevices}</p>
            ) : (
              <ul className="plain-list">
                {user.devices.map((d, i) => (
                  <li key={`${d.platform}-${i}`}>
                    {[platformLabel(d.platform), d.appVersion ? t.appVersion(d.appVersion) : null].filter(Boolean).join(' · ')}
                    {d.lastSeenAt && <span className="muted"> · {formatKst(d.lastSeenAt)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card side-card" aria-labelledby="uinq-title">
            <h2 className="sec-title" id="uinq-title">
              {t.inquiries}
              {/* 서버 목록에 계정으로 거르는 조건이 없어 닉네임으로 찾는다. 닉네임이 없으면 빈 찾기(= 전체 목록)라 링크를 두지 않는다. */}
              {user.nickname !== null && <MoreLink to={`/inquiries?q=${encodeURIComponent(user.nickname)}`}>{t.all}</MoreLink>}
            </h2>
            {user.inquiries.length === 0 ? (
              <p className="field__help">{t.noInquiries}</p>
            ) : (
              <ul className="plain-list plain-list--rows">
                {user.inquiries.map((i) => (
                  <li key={i.id}>
                    <Link to={`/inquiries/${encodeURIComponent(i.id)}`}>{i.excerpt ? oneLine(i.excerpt, 40) : `${categoryLabel(i.category)} · ${formatKst(i.createdAt)}`}</Link>
                    <Pill tone={statusTone(i.status)}>{statusLabel(i.status)}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card side-card" aria-labelledby="recent-title">
            <h2 className="sec-title" id="recent-title">
              {t.recent}
              {/* 사용자 행만(q 는 관리자 행의 아이디에도 견준다). 그 사람에게 관리자가 한 일은 서버 조건이 없어 이 카드(recent)에만 있다. */}
              {user.nickname !== null && <MoreLink to={`/audit-logs?actorType=USER&q=${encodeURIComponent(user.nickname)}`}>{t.auditLink}</MoreLink>}
            </h2>
            {user.recent.length === 0 ? (
              <p className="field__help">{t.noRecent}</p>
            ) : (
              <dl className="kv kv--recent">
                {user.recent.map((r, i) => (
                  <div key={`${r.at}-${i}`} className="kv__row">
                    <dt className="mono">{formatKst(r.at)}</dt>
                    <dd>{r.detail ? `${actionLabel(r.action)} · ${r.detail}` : actionLabel(r.action)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      </div>

      {asking === 'suspend' && (
        <ReasonDialog
          title={t.suspendDialog.title(name)}
          body={t.suspendDialog.body}
          reasonLabel={t.suspendDialog.reason}
          placeholder={t.suspendDialog.placeholder}
          confirmLabel={t.suspendDialog.confirm}
          danger
          busy={busy}
          onConfirm={(reason) => run(() => api.suspendUser(user.id, reason), t.suspendDialog.done, onReload)}
          onCancel={() => setAsking(null)}
        />
      )}
      {asking === 'unsuspend' && (
        <ReasonDialog
          title={t.unsuspendDialog.title(name)}
          body={t.unsuspendDialog.body}
          reasonLabel={t.unsuspendDialog.reason}
          placeholder={t.unsuspendDialog.placeholder}
          confirmLabel={t.unsuspendDialog.confirm}
          danger={false}
          busy={busy}
          onConfirm={(reason) => run(() => api.unsuspendUser(user.id, reason), t.unsuspendDialog.done, onReload)}
          onCancel={() => setAsking(null)}
        />
      )}
      {asking === 'delete' && (
        <ReasonDialog
          title={t.deleteDialog.title(name)}
          body={t.deleteDialog.body}
          reasonLabel={t.deleteDialog.reason}
          placeholder={t.deleteDialog.placeholder}
          confirmLabel={t.deleteDialog.confirm}
          danger
          // 닉네임이 없는 옛 계정은 다시 적을 닉네임이 없다 — 칸을 두지 않고 confirmNickname 은 빈 글로 보낸다(서버 계약 변경과 함께).
          nickname={user.nickname ?? undefined}
          busy={busy}
          onConfirm={(reason, confirmNickname) => run(() => api.deleteUser(user.id, reason, confirmNickname), t.deleteDialog.done, () => navigate('/users', { replace: true }))}
          onCancel={() => setAsking(null)}
        />
      )}
    </>
  );
}

/** 사용자 상세(D5 · D26): 프로필 · 정지 카드 · 계정 · 동의 · 생성 내역(재생성) · 등록 기기 · 문의 · 최근 활동, 정지 · 해제 · 삭제. */
export function UserDetailPage() {
  const { api } = useAuth();
  const { id = '' } = useParams();
  const location = useLocation();
  const { state, reload } = useLoad(useCallback(() => api.getUser(id), [api, id]));
  const listSearch = (location.state as { listSearch?: unknown } | null)?.listSearch;
  const back = typeof listSearch === 'string' && listSearch !== '' ? `/users?${listSearch}` : '/users';
  const gone = state.status === 'error' && errorCode(state.error) === 'NOT_FOUND';

  return (
    <>
      <PageHeader title={strings.users.title} back={{ to: back }}>
        <span className="hide-tablet">{t.headNote}</span>
      </PageHeader>
      <div className="body">
        {gone ? (
          <EmptyState icon="user" title={t.gone} />
        ) : (
          <>
            {state.status === 'loading' && <Loading />}
            {state.status === 'error' && <LoadError message={errorMessage(state.error)} onRetry={reload} />}
            {state.status === 'ready' && <Detail user={state.data} onReload={reload} />}
          </>
        )}
      </div>
    </>
  );
}
