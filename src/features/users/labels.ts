import type { PillTone } from '../../components/Pill';
import { strings } from '../../content/strings';
import type { UserRow } from '../../lib/api/types';

const t = strings.users;
type Labels = Readonly<Record<string, string | undefined>>;

export const userStatusLabel = (status: string): string => (t.statuses as Labels)[status] ?? status;
export const userStatusTone = (status: string): PillTone => (status === 'ACTIVE' ? 'ok' : status === 'SUSPENDED' ? 'bad' : 'mute');
export const nicknameOf = (user: { nickname: string | null }): string => user.nickname ?? t.noNickname;
export const initialOf = (user: { nickname: string | null }): string => [...(user.nickname ?? '?')][0] ?? '?';

/** 자세한 풀이 칸(D4): 나 · 시기 / 나 / 시기 / 생성 중 / — */
export const reportsText = (reports: UserRow['reports']): string => {
  const me = reports.me === 'DONE';
  const timing = reports.timing === 'DONE';
  if (me && timing) return t.reports.both;
  if (reports.me === 'GENERATING' || reports.timing === 'GENERATING') return t.reports.generating;
  if (me) return t.reports.me;
  if (timing) return t.reports.timing;
  return t.none;
};

export const generationKind = (kind: string): string => (t.detail.kinds as Labels)[kind] ?? kind;
export const generationStatus = (status: string): string => (t.detail.genStatus as Labels)[status] ?? status;
export const generationTone = (status: string): PillTone =>
  status === 'DONE' ? 'ok' : status === 'FAILED' ? 'bad' : status === 'GENERATING' || status === 'PREBUILT' || status === 'ON_DEMAND' ? 'pri' : 'mute';
/** 실패하면 다시 만들 수 있는 것(결정 043 의 1) */
export const REGENERATABLE = ['NICKNAME', 'REPORT_ME', 'REPORT_TIMING'];

/** 로그인 수단 거르기(결정 043 의 1) */
export const PROVIDERS = ['KAKAO', 'APPLE', 'GOOGLE'] as const;
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
