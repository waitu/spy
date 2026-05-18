import { Link, NavLink, useLocation } from 'react-router-dom';
import { SponbitLogo } from './SponbitLogo';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin', label: 'Content Studio', exact: true },
  { to: '/admin/pinterest', label: 'Pinterest Dashboard' },
];

export function AdminShell({ children }) {
  const { signout, user } = useAuth();
  const location = useLocation();

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="admin-shell__brand">
          <Link className="admin-shell__brand-link" to="/admin" aria-label="Sponbit Admin Home">
            <SponbitLogo className="admin-shell__logo" />
          </Link>
          <div className="admin-shell__brand-copy">
            <span className="eyebrow">Admin Tool</span>
            <strong>Sponbit Control</strong>
          </div>
        </div>

        <nav className="admin-shell__nav" aria-label="Admin navigation">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => (isActive ? 'admin-shell__nav-link active' : 'admin-shell__nav-link')}
            >
              <span>{link.label}</span>
              {location.pathname === link.to ? <small>Current</small> : null}
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell__sidebar-footer">
          <div className="admin-shell__user-card">
            <span className="eyebrow">Signed in</span>
            <strong>{user?.name ?? 'Admin'}</strong>
            <span>{user?.role ?? 'admin'}</span>
          </div>
          <Link className="button-secondary admin-shell__site-link" to="/" style={{ textDecoration: 'none' }}>
            Back to site
          </Link>
        </div>
      </aside>

      <div className="admin-shell__main">
        <header className="admin-shell__topbar">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1>{location.pathname === '/admin/pinterest' ? 'Pinterest Dashboard' : 'Content Studio'}</h1>
          </div>
          <div className="admin-shell__topbar-actions">
            <Link className="button-secondary" to="/" style={{ textDecoration: 'none' }}>
              View site
            </Link>
            <button className="button-secondary" type="button" onClick={signout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="admin-shell__content">{children}</main>
      </div>
    </div>
  );
}
