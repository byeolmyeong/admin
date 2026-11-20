import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import brandMark from '../assets/brand-mark.svg';
import { Icon } from '../components/icons';
import { strings } from '../content/strings';
import { MaintenanceBanner, MaintenanceProvider } from '../features/app-config/MaintenanceContext';
import { useAuth } from '../features/auth/AuthContext';
import { WaitingCountProvider, useWaitingCount } from '../features/inquiries/WaitingCount';
import { visibleSections } from './sections';
import type { Section, SectionGroup } from './sections';

const t = strings.shell;

/** 메뉴 옆 숫자. 숫자는 눈으로, 뜻은 읽어 주는 글로. 0 이거나 모르면 보이지 않는다. */
function Count({ count }: { count: number | null }) {
  if (count === null || count <= 0) return null;
  return (
    <span className="nav__count">
      <span aria-hidden="true">{count.toLocaleString('ko-KR')}</span>
      <span className="sr-only">{t.waiting(count)}</span>
    </span>
  );
}

/** 구역 목록을 묶음 머리와 함께 그린다. 같은 메뉴를 왼쪽 메뉴와 폰 서랍이 함께 쓴다. */
function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { count } = useWaitingCount();
  let group: SectionGroup | undefined;
  return (
    <>
      {visibleSections().flatMap((section: Section) => {
        const items = [];
        if (section.group && section.group !== group) {
          items.push(
            <p key={`g-${section.group}`} className="nav__group">
              {t.groups[section.group]}
            </p>,
          );
        }
        group = section.group;
        items.push(
          <NavLink key={section.to} to={section.to} className="nav__link" title={section.label} onClick={onNavigate}>
            <Icon name={section.icon} />
            <span className="nav__label">{section.label}</span>
            {section.badge === 'inquiriesWaiting' && <Count count={count} />}
          </NavLink>,
        );
        return items;
      })}
    </>
  );
}

/** 왼쪽 아래 "관리자 · 아이디" 와 로그아웃 */
function Account() {
  const { admin, adminError, retryAdmin, logout } = useAuth();
  return (
    <div className="account" role="group" aria-label={t.accountLabel}>
      {admin && <span className="account__who">{t.who(admin.loginId)}</span>}
      {!admin && adminError !== null && (
        <span className="account__error">
          {t.meError}{' '}
          <button type="button" className="btn-text" onClick={retryAdmin}>
            {strings.common.retry}
          </button>
        </span>
      )}
      <button type="button" className="btn-text account__logout" onClick={logout}>
        {t.logout}
      </button>
    </div>
  );
}

function Brand() {
  return (
    <span className="brand">
      <img src={brandMark} alt="" className="brand__mark" />
      <span className="brand__name">{t.brand}</span>
    </span>
  );
}

/** 640 아래의 오른쪽 서랍(D15). 닫기 · Esc · 어두운 곳 누르기 · 항목 누르기로 닫힌다. */
function Drawer({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer">
      <div className="drawer__backdrop" data-testid="drawer-backdrop" onClick={onClose} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer__head">
          <h2 className="drawer__title" id={titleId}>
            {t.menuTitle}
          </h2>
          <button type="button" className="icon-button icon-button--plain" ref={closeRef} aria-label={t.menuClose} onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <nav className="nav" aria-labelledby={titleId}>
          <NavItems onNavigate={onClose} />
        </nav>
        <Account />
      </div>
    </div>
  );
}

/** 640 아래의 위 막대: 로고 · 문의 바로 가기(답변 대기 수) · 메뉴 버튼 */
function MobileTop({ onMenu }: { onMenu: () => void }) {
  const { count } = useWaitingCount();
  const label = count !== null && count > 0 ? `${t.nav.inquiries} ${t.waiting(count)}` : t.nav.inquiries;
  return (
    <div className="mobile-top">
      <Brand />
      <span className="mobile-top__actions">
        <Link to="/inquiries" className="mobile-top__inbox" aria-label={label}>
          <Icon name="inbox" size={20} />
          {count !== null && count > 0 && (
            <span className="mobile-top__count" aria-hidden="true">
              {count.toLocaleString('ko-KR')}
            </span>
          )}
        </Link>
        <button type="button" className="icon-button icon-button--plain" aria-label={t.menuOpen} onClick={onMenu}>
          <Icon name="menu" size={22} />
        </button>
      </span>
    </div>
  );
}

function Shell() {
  const [drawer, setDrawer] = useState(false);
  const close = useCallback(() => setDrawer(false), []);
  const { pathname } = useLocation();
  // 주소가 바뀌면(뒤로 가기 포함) 서랍을 닫는다.
  useEffect(close, [pathname, close]);

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <nav className="nav" aria-label={t.navLabel}>
          <NavItems />
        </nav>
        <Account />
      </aside>
      <main className="main">
        <MaintenanceBanner />
        <MobileTop onMenu={() => setDrawer(true)} />
        <Outlet />
      </main>
      {drawer && <Drawer onClose={close} />}
    </div>
  );
}

/**
 * 로그인한 뒤의 틀(결정 003 의 1 · 4): 1024 이상 왼쪽 메뉴, 640 ~ 1023 아이콘 띠, 640 아래 위 막대 + 오른쪽 서랍.
 * 폭에 따른 모양은 app.css 의 미디어 쿼리가 정한다. 점검이 켜져 있으면 모든 화면 위에 띠를 보인다(결정 002).
 */
export function AppShell() {
  return (
    <MaintenanceProvider>
      <WaitingCountProvider>
        <Shell />
      </WaitingCountProvider>
    </MaintenanceProvider>
  );
}
