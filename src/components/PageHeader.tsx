import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';

interface Props {
  title: string;
  /** 상세의 뒤로: "‹ 문의" 처럼 화면 이름이 곧 제목이다(결정 003 의 4 — 닉네임을 제목에 쓰지 않는다). */
  back?: { to: string; state?: unknown };
  /** 오른쪽(기준 시각 · 버튼 등) */
  children?: ReactNode;
}

/** 모든 화면의 머리: 제목 하나와 오른쪽 자리 */
export function PageHeader({ title, back, children }: Props) {
  return (
    <header className="top">
      {back ? (
        <Link className="top__back" to={back.to} state={back.state}>
          <Icon name="left" size={20} />
          <h1 className="top__title">{title}</h1>
        </Link>
      ) : (
        <h1 className="top__title">{title}</h1>
      )}
      {children && <div className="top__side">{children}</div>}
    </header>
  );
}
