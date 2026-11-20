import type { PillTone } from '../../components/Pill';
import { strings } from '../../content/strings';
import { INQUIRY_CATEGORIES } from '../../lib/api/types';

type Labels = Readonly<Record<string, string | undefined>>;

/** 문구가 없는 값(계약에 새로 생긴 값)은 받은 그대로 보인다. */
export const categoryLabel = (category: string): string => (strings.inquiries.categories as Labels)[category] ?? category;
export const statusLabel = (status: string): string => (strings.inquiryStatus as Labels)[status] ?? status;

/** 상태 표의 색: 답변 대기는 주의, 처리 중은 보라, 답변 완료는 좋음 */
export const statusTone = (status: string): PillTone => (status === 'NEW' ? 'warn' : status === 'IN_PROGRESS' ? 'pri' : status === 'DONE' ? 'ok' : 'mute');

/**
 * 목록 칸(결정 003 의 2 — 답변 대기 · 답변 완료 · 전체)과 지금 계약의 상태.
 * 서버 결정 039(ANSWERED)가 생기면 answered 를 그 값으로 바꾼다(계획 D①).
 */
export const SEGMENT_STATUS = { waiting: 'NEW', answered: 'DONE', all: '' } as const;
export type Segment = keyof typeof SEGMENT_STATUS;
export const segmentOf = (status: string): Segment | null =>
  status === '' ? 'all' : ((Object.keys(SEGMENT_STATUS) as Segment[]).find((k) => SEGMENT_STATUS[k] === status) ?? null);

/** 종류 칩 순서(지금 계약의 다섯) */
export const CATEGORY_ORDER = ['BUG', 'ACCOUNT', 'READING', 'SYNASTRY', 'OTHER'] as const satisfies readonly (typeof INQUIRY_CATEGORIES)[number][];
