import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { sectionPath, topicPath } from '../lib/content';
import { SponbitLogo } from './SponbitLogo';

export function Layout({ children }) {
  const [openSectionKey, setOpenSectionKey] = useState(null);
  const { navSections } = useSite();
  const { isAuthenticated, signout, user } = useAuth();
  const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shopping', to: sectionPath('shopping') },
    { label: 'Food', to: sectionPath('food') },
    ...(user?.role === 'admin' ? [{ label: 'Admin', to: '/admin' }] : []),
  ];

  return (
    <div className="page-shell">
      <div className="promo-bar">Free Trial for 120+ Creative Classes</div>
      <header className="site-header">
        <div className="header-top site-width">
          <button className="header-icon" type="button" aria-label="Open menu">
            <Menu size={18} />
          </button>
          <Link className="brand-lockup" to="/" aria-label="Sponbit – trang chủ">
            <SponbitLogo className="brand-svg-logo" />
          </Link>
          <div className="header-tools">
            <button className="header-icon" type="button" aria-label="Search">
              <Search size={18} />
            </button>
            {isAuthenticated ? (
              <>
                <span className="user-chip">{user.name} · {user.role}</span>
                <button className="sign-in-link button-link" type="button" onClick={signout}>
                  SIGN OUT
                </button>
              </>
            ) : (
              <Link className="sign-in-link" to="/signin">
                SIGN IN
              </Link>
            )}
          </div>
        </div>

        <div className="header-nav-wrap">
          <nav className="primary-nav site-width" aria-label="Sections">
            {navSections.map((section) => (
              <div
                key={section.key}
                className="nav-dropdown"
                onMouseEnter={() => setOpenSectionKey(section.key)}
                onMouseLeave={() => setOpenSectionKey((current) => (current === section.key ? null : current))}
                onFocus={() => setOpenSectionKey(section.key)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenSectionKey((current) => (current === section.key ? null : current));
                  }
                }}
              >
                <div className={openSectionKey === section.key ? 'nav-dropdown__trigger active' : 'nav-dropdown__trigger'}>
                  <Link
                    className="primary-nav__item"
                    to={section.path}
                    onClick={() => setOpenSectionKey(null)}
                  >
                    <span>{section.label}</span>
                  </Link>
                  <button
                    className="nav-dropdown__toggle"
                    type="button"
                    aria-label={`Toggle ${section.label} submenu`}
                    aria-expanded={openSectionKey === section.key}
                    onClick={() => setOpenSectionKey((current) => (current === section.key ? null : section.key))}
                  >
                    <ChevronDown size={14} strokeWidth={2.2} />
                  </button>
                </div>

                {openSectionKey === section.key && (
                  <div className="nav-dropdown__menu" aria-label={`${section.label} submenu`}>
                    <Link className="nav-dropdown__link nav-dropdown__link--all" to={section.path}>
                      All {section.label}
                    </Link>
                    {section.items.map((item) => (
                      <Link
                        key={item.slug}
                        className="nav-dropdown__link"
                        to={topicPath(section.key, item.slug)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <nav className="utility-nav site-width" aria-label="Quick pages">
            {quickLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'utility-link active' : 'utility-link')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-width footer-grid">
          <div>
            <SponbitLogo className="footer-svg-logo" />
            <p>Khám phá ẩm thực, phong cách sống và văn hóa đương đại.</p>
          </div>
          <div>
            <h4>Channels</h4>
            {navSections.slice(0, 4).map((section) => (
              <Link key={section.key} to={section.path}>
                {section.label}
              </Link>
            ))}
          </div>
          <div>
            <h4>Explore</h4>
            <Link to={sectionPath('food')}>Food</Link>
            <Link to={sectionPath('shopping')}>Shopping</Link>
            {user?.role === 'admin' ? <Link to="/admin">Admin</Link> : <Link to="/signin">Sign In</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}
