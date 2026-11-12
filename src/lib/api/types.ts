/** 서버 계약(서버 저장소 docs/architecture.md "관리자 API")의 모양. 값이 없는 필드는 null 이다. */

export interface Admin {
  id: string;
  loginId: string;
  name: string;
}

export interface AdminAccount extends Admin {
  active: boolean;
  createdAt: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  admin: Admin;
}

/** 처리한(또는 마지막으로 고친) 관리자 */
export interface AdminRef {
  id: string;
  name: string;
}

export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_CATEGORIES = ['ACCOUNT', 'READING', 'SYNASTRY', 'BUG', 'OTHER'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export interface Inquiry {
  id: string;
  /** 계약의 다섯 값. 모르는 값이 와도 화면이 깨지지 않게 글자로 받는다. */
  category: string;
  body: string;
  replyEmail: string | null;
  createdAt: string;
  /** 계약의 세 값. 모르는 값이 와도 화면이 깨지지 않게 글자로 받는다. */
  status: string;
  memo: string | null;
  handledBy: AdminRef | null;
  handledAt: string | null;
  ownerRef: string;
}

export interface InquiryPage {
  items: Inquiry[];
  page: number;
  size: number;
  total: number;
}

export type Counts = Record<string, number>;

export interface Stats {
  generatedAt: string;
  accounts: { total: number; last7Days: number; last30Days: number };
  profiles: { total: number };
  readings: { total: number };
  reports: { total: number; byStatus: Counts };
  synastries: { total: number };
  synastryReports: { total: number; byStatus: Counts };
  directions: { total: number; byTopic: Counts };
  inquiries: { total: number; byStatus: Counts };
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
  updatedBy: AdminRef | null;
}
