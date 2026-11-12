import { strings } from '../../content/strings';

type Labels = Readonly<Record<string, string | undefined>>;

/** 문구가 없는 값(계약에 새로 생긴 값)은 받은 그대로 보인다. */
export const categoryLabel = (category: string): string => (strings.inquiries.categories as Labels)[category] ?? category;
export const statusLabel = (status: string): string => (strings.inquiryStatus as Labels)[status] ?? status;
