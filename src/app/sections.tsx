import type { ReactNode } from 'react';
import { strings } from '../content/strings';
import { AdminsPage } from '../features/admins/AdminsPage';
import { AppConfigPage } from '../features/app-config/AppConfigPage';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { FaqPage } from '../features/faqs/FaqPage';
import { InquiryDetailPage } from '../features/inquiries/InquiryDetailPage';
import { InquiryListPage } from '../features/inquiries/InquiryListPage';
import { StatsPage } from '../features/stats/StatsPage';

/** 왼쪽 메뉴의 한 구역. 메뉴(AppShell)와 라우트(App)가 모두 이 목록에서 나온다. */
export interface Section {
  /** 메뉴가 가리키는 주소. 이 주소로 시작하는 화면에서 메뉴가 켜진다. */
  to: string;
  label: string;
  routes: { path: string; element: ReactNode }[];
}

export const sections: Section[] = [
  { to: '/stats', label: strings.shell.nav.stats, routes: [{ path: '/stats', element: <StatsPage /> }] },
  {
    to: '/inquiries',
    label: strings.shell.nav.inquiries,
    routes: [
      { path: '/inquiries', element: <InquiryListPage /> },
      { path: '/inquiries/:id', element: <InquiryDetailPage /> },
    ],
  },
  { to: '/faqs', label: strings.shell.nav.faqs, routes: [{ path: '/faqs', element: <FaqPage /> }] },
  { to: '/admins', label: strings.shell.nav.admins, routes: [{ path: '/admins', element: <AdminsPage /> }] },
  { to: '/audit-logs', label: strings.shell.nav.auditLogs, routes: [{ path: '/audit-logs', element: <AuditLogPage /> }] },
  { to: '/app-config', label: strings.shell.nav.appConfig, routes: [{ path: '/app-config', element: <AppConfigPage /> }] },
  // 새 구역은 여기에 한 줄을 더한다. 메뉴와 라우트에 함께 나타난다.
];
