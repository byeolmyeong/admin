import type { ReactNode } from 'react';
import type { IconName } from '../components/icons';
import { strings } from '../content/strings';
import { hiddenSections } from '../lib/config';
import { AdminsPage } from '../features/admins/AdminsPage';
import { AppConfigPage } from '../features/app-config/AppConfigPage';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { FaqPage } from '../features/faqs/FaqPage';
import { InquiryDetailPage } from '../features/inquiries/InquiryDetailPage';
import { InquiryListPage } from '../features/inquiries/InquiryListPage';
import { PushPage } from '../features/push/PushPage';
import { StatsPage } from '../features/stats/StatsPage';
import { UserDetailPage } from '../features/users/UserDetailPage';
import { UserListPage } from '../features/users/UserListPage';

/** 메뉴의 묶음(결정 003 의 1). 묶음이 없는 구역(현황)은 맨 위에 홀로 선다. */
export type SectionGroup = 'support' | 'content' | 'operations';

/** 왼쪽 메뉴의 한 구역. 메뉴(AppShell)와 라우트(App)가 모두 이 목록에서 나온다. */
export interface Section {
  /** 메뉴가 가리키는 주소. 이 주소로 시작하는 화면에서 메뉴가 켜진다. */
  to: string;
  label: string;
  icon: IconName;
  group?: SectionGroup;
  /** 서버 경로가 아직 없는 구역. 메뉴와 라우트에 나타나지 않는다(결정 003 결과 · 계획 D⓪). */
  hidden?: boolean;
  /** 메뉴 옆에 답변 대기 수를 보인다(문의). */
  badge?: 'inquiriesWaiting';
  routes: { path: string; element: ReactNode }[];
}

const nav = strings.shell.nav;

export const sections: Section[] = [
  { to: '/stats', label: nav.stats, icon: 'stats', routes: [{ path: '/stats', element: <StatsPage /> }] },
  {
    to: '/inquiries',
    label: nav.inquiries,
    icon: 'inbox',
    group: 'support',
    badge: 'inquiriesWaiting',
    routes: [
      { path: '/inquiries', element: <InquiryListPage /> },
      { path: '/inquiries/:id', element: <InquiryDetailPage /> },
    ],
  },
  // 서버 결정 043 의 사용자 경로는 S⑪ — 그 전에는 목록을 불러오지 못했다고 알린다(소유자 "보드 그대로 지금 다").
  {
    to: '/users',
    label: nav.users,
    icon: 'user',
    group: 'support',
    routes: [
      { path: '/users', element: <UserListPage /> },
      { path: '/users/:id', element: <UserDetailPage /> },
    ],
  },
  // 서버 결정 043 의 푸시 발송 경로는 S10-5 — 그 전에는 대상 수 · 내역이 "—" 이다.
  { to: '/push', label: nav.push, icon: 'bell', group: 'content', routes: [{ path: '/push', element: <PushPage /> }] },
  { to: '/faqs', label: nav.faqs, icon: 'help', group: 'content', routes: [{ path: '/faqs', element: <FaqPage /> }] },
  { to: '/app-config', label: nav.appConfig, icon: 'settings', group: 'operations', routes: [{ path: '/app-config', element: <AppConfigPage /> }] },
  { to: '/admins', label: nav.admins, icon: 'key', group: 'operations', routes: [{ path: '/admins', element: <AdminsPage /> }] },
  { to: '/audit-logs', label: nav.auditLogs, icon: 'log', group: 'operations', routes: [{ path: '/audit-logs', element: <AuditLogPage /> }] },
  // 새 구역은 여기에 한 줄을 더한다. 메뉴와 라우트에 함께 나타난다.
];

/** 메뉴와 라우트에 나타나는 구역. 코드의 hidden 과 환경 변수 VITE_HIDDEN_SECTIONS 둘 다 뺀다. */
export const visibleSections = (): Section[] => {
  const off = hiddenSections();
  return sections.filter((s) => !s.hidden && !off.includes(s.to));
};

/** 그 주소의 구역이 보이는지(다른 화면이 그리로 가는 링크를 그릴지 정할 때) */
export const isSectionShown = (to: string): boolean => visibleSections().some((s) => s.to === to);
