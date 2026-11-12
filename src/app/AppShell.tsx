import { Link, NavLink, Outlet } from 'react-router-dom';
import { strings } from '../content/strings';
import { useAuth } from '../features/auth/AuthContext';
import { sections } from './sections';

const t = strings.shell;

/** 로그인한 뒤의 틀: 왼쪽 메뉴와 오른쪽 화면. */
export function AppShell() {
  const { admin, adminError, retryAdmin, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="shell__side">
        <p className="shell__brand">{strings.appName}</p>
        <nav className="nav" aria-label={t.navLabel}>
          {sections.map((section) => (
            <NavLink key={section.to} to={section.to} className="nav__link">
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="account" role="group" aria-label={t.accountLabel}>
          {admin && (
            <p className="account__name">
              {admin.name}
              <span className="account__id mono">{admin.loginId}</span>
            </p>
          )}
          {!admin && adminError !== null && (
            <p className="account__error">
              {t.meError}{' '}
              <button type="button" className="btn btn--text" onClick={retryAdmin}>
                {strings.common.retry}
              </button>
            </p>
          )}
          <Link className="btn btn--secondary btn--small btn--block" to="/password">
            {t.changePassword}
          </Link>
          <button type="button" className="btn btn--secondary btn--small btn--block" onClick={logout}>
            {t.logout}
          </button>
        </div>
      </aside>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
