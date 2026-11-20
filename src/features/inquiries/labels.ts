import type { PillTone } from '../../components/Pill';
import { strings } from '../../content/strings';
import { INQUIRY_CATEGORIES_V2 } from '../../lib/api/types';

type Labels = Readonly<Record<string, string | undefined>>;

/** 문구가 없는 값(계약에 새로 생긴 값)은 받은 그대로 보인다. */
export const categoryLabel = (category: string): string => (strings.inquiries.categories as Labels)[category] ?? category;
export const statusLabel = (status: string): string => (strings.inquiryStatus as Labels)[status] ?? status;

/** 상태 표의 색: 답변 대기는 주의, 처리 중은 보라, 답변 완료는 좋음 */
export const statusTone = (status: string): PillTone =>
  status === 'NEW' ? 'warn' : status === 'IN_PROGRESS' ? 'pri' : status === 'ANSWERED' || status === 'DONE' ? 'ok' : 'mute';

/**
 * 목록 칸(결정 003 의 2 — 답변 대기 · 답변 완료 · 전체)과 상태. 답변 완료는 S⑧ 의 ANSWERED —
 * 서버가 아직 모르면(INVALID_STATUS) 옛 끝남(DONE)으로 다시 묻는다(InquiryListPage).
 */
export const SEGMENT_STATUS = { waiting: 'NEW', answered: 'ANSWERED', all: '' } as const;
export type Segment = keyof typeof SEGMENT_STATUS;
export const segmentOf = (status: string): Segment | null =>
  status === '' ? 'all' : ((Object.keys(SEGMENT_STATUS) as Segment[]).find((k) => SEGMENT_STATUS[k] === status) ?? null);

/** 종류 칩 순서(보드 D2 — 오류 · 제안 · 계정 · 기타) */
export const CATEGORY_ORDER = INQUIRY_CATEGORIES_V2;

/** 로그인 수단 · 기기 이름. 모르는 값은 받은 그대로. */
export const providerLabel = (provider: string | null): string | null => (provider === null ? null : ((strings.providers as Labels)[provider] ?? provider));
export const platformLabel = (platform: string | null): string | null => (platform === null ? null : ((strings.platforms as Labels)[platform] ?? platform));
