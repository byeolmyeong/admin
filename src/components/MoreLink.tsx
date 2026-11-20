import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';

/** "전체 ›" · "감사 로그 ›" · "사용자 상세 ›" 같은 화살표 링크(시안 v184 — 13px 굵게, 16px 오른쪽 화살표 아이콘). */
export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="link-more" to={to}>
      {children}
      <Icon name="right" size={16} />
    </Link>
  );
}
