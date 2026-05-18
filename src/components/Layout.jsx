import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { sectionPath, topicPath } from '../lib/content';
import { SponbitLogo } from './SponbitLogo';

const PRIMARY_NAV_LIMIT = 6;
const MORE_KEY = '__more__';

export function Layout({ children }) {
  const [openSectionKey, setOpenSectionKey] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { navSections } = useSite();
  const { isAuthenticated, signout, user } = useAuth();

  const primarySections = navSections.slice(0, PRIMARY_NAV_LIMIT);
  const moreSections = navSections.slice(PRIMARY_NAV_LIMIT);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [userMenuOpen]);

  const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shopping', to: sectionPath('shopping') },
    { label: 'Food', to: sectionPath('food') },
    ...(user?.role === 'admin' ? [{ label: 'Admin', to: '/admin' }] : []),
  ];

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="header-top site-width">
          <button className="header-icon header-menu-btn" type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen((v) => !v)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link className="brand-lockup" to="/" aria-label="Sponbit – Home">
            <SponbitLogo className="brand-svg-logo" />
          </Link>
          <div className="header-tools">
            {searchOpen ? (
              <form className="header-search-form" onSubmit={handleSearchSubmit}>
                <input
                  ref={searchInputRef}
                  className="header-search-input"
                  type="search"
                  placeholder="Search stories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search"
                />
                <button className="header-icon" type="button" aria-label="Close search" onClick={closeSearch}>
                  <X size={18} />
                </button>
              </form>
            ) : (
              <button className="header-icon" type="button" aria-label="Search" onClick={openSearch}>
                <Search size={18} />
              </button>
            )}
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' ? (
                  <div className="user-menu" ref={userMenuRef}>
                    <button
                      type="button"
                      className="user-chip user-chip--button"
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      onClick={() => setUserMenuOpen((current) => !current)}
                    >
                      <span>{user.name} · {user.role}</span>
                      <ChevronDown size={14} strokeWidth={2.2} />
                    </button>
                    {userMenuOpen ? (
                      <div className="user-menu__panel" role="menu" aria-label="Admin menu">
                        <Link className="user-menu__link" to="/admin" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                          Content studio
                        </Link>
                        <Link className="user-menu__link" to="/admin/pinterest" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                          Pinterest dashboard
                        </Link>
                        <Link className="user-menu__link" to="/" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                          View site
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="user-chip">{user.name} · {user.role}</span>
                )}
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
            {primarySections.map((section) => (
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

            {moreSections.length > 0 && (
              <div
                className="nav-dropdown"
                onMouseEnter={() => setOpenSectionKey(MORE_KEY)}
                onMouseLeave={() => setOpenSectionKey((current) => (current === MORE_KEY ? null : current))}
                onFocus={() => setOpenSectionKey(MORE_KEY)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenSectionKey((current) => (current === MORE_KEY ? null : current));
                  }
                }}
              >
                <div className={openSectionKey === MORE_KEY ? 'nav-dropdown__trigger active' : 'nav-dropdown__trigger'}>
                  <button
                    className="primary-nav__item nav-dropdown__toggle"
                    type="button"
                    aria-label="More sections"
                    aria-expanded={openSectionKey === MORE_KEY}
                    onClick={() => setOpenSectionKey((current) => (current === MORE_KEY ? null : MORE_KEY))}
                  >
                    <span>More</span>
                    <ChevronDown size={14} strokeWidth={2.2} />
                  </button>
                </div>

                {openSectionKey === MORE_KEY && (
                  <div className="nav-dropdown__menu nav-dropdown__menu--more" aria-label="More sections">
                    {moreSections.map((section) => (
                      <div key={section.key} className="nav-dropdown__more-group">
                        <Link
                          className="nav-dropdown__link nav-dropdown__link--group-title"
                          to={section.path}
                          onClick={() => setOpenSectionKey(null)}
                        >
                          {section.label}
                        </Link>
                        {section.items.map((item) => (
                          <Link
                            key={item.slug}
                            className="nav-dropdown__link nav-dropdown__link--sub"
                            to={topicPath(section.key, item.slug)}
                            onClick={() => setOpenSectionKey(null)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

        {mobileMenuOpen && (
          <nav className="mobile-menu" aria-label="Mobile navigation">
            {navSections.map((section) => (
              <div key={section.key} className="mobile-menu__section">
                <Link
                  className="mobile-menu__section-link"
                  to={section.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {section.label}
                </Link>
                {section.items.map((item) => (
                  <Link
                    key={item.slug}
                    className="mobile-menu__topic-link"
                    to={topicPath(section.key, item.slug)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mobile-menu__divider" />
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                className="mobile-menu__section-link"
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-width footer-grid">
          <div>
            <SponbitLogo className="footer-svg-logo" />
            <p>Food, culture & modern lifestyle.</p>
            <Link to="/about">About</Link>
            <Link to="/editorial-policy">Editorial Policy</Link>
            <Link to="/privacy">Privacy Policy</Link>
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
            <Link to="/contact">Contact</Link>
            {user?.role === 'admin' ? <Link to="/admin">Admin</Link> : <Link to="/signin">Sign In</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}
