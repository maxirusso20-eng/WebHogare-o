import { useState, useEffect } from 'react';
import { Menu, X, UsersRound, CarFront, Route, Globe, Sun, Moon, LayoutDashboard, MessageCircle, LogOut, ShieldCheck } from 'lucide-react';
import '../styles/sidebar.css';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';

export function Sidebar({
  currentPage,
  setCurrentPage,
  theme,
  toggleTheme,
  isMobileOpen,
  setIsMobileOpen
}) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Admin/subadmin → todo. Viewer → solo Dashboard, Recorridos, Maps, Chat
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'clientes', label: 'Clientes', icon: UsersRound, adminOnly: true },
    { id: 'choferes', label: 'Choferes', icon: CarFront, adminOnly: true },
    { id: 'recorridos', label: 'Recorridos', icon: Route, adminOnly: false },
    { id: 'maps', label: 'Maps', icon: Globe, adminOnly: false },
    { id: 'chat', label: 'Chat', icon: MessageCircle, adminOnly: false },
    { id: 'roles', label: 'Roles', icon: ShieldCheck, adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => isAdmin || !item.adminOnly);

  const iconVolumeShadow =
    theme === 'light'
      ? 'drop-shadow(0px 3px 2px rgba(0, 0, 0, 0.22))'
      : 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.5))';

  const handleLogout = () => supabase.auth.signOut();

  // ── MÓVIL ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {isMobileOpen && (
          <div
            className="sidebar-overlay-backdrop"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <nav className={`sidebar sidebar-mobile ${isMobileOpen ? 'mobile-open' : 'mobile-closed'} theme-${theme}`}>
          <div className="sidebar-header-mobile">
            <div className="sidebar-brand-mobile">
              <span className="brand-icon-mobile">📦</span>
              <h2 className="brand-text-mobile">Hogareño</h2>
            </div>
            <button
              className="close-btn-mobile"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Cerrar sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <div className="nav-links">
            {navItems.map((item) => {
              const NavIcon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-link transition-all duration-200 hover:scale-105 ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileOpen(false);
                  }}
                  title={item.label}
                >
                  <span className="nav-icon inline-flex items-center justify-center" style={{ filter: iconVolumeShadow }}>
                    {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {currentPage === item.id && <span className="nav-indicator"></span>}
                </button>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="theme-switcher-mobile">
              <button
                className={`theme-btn-mobile ${theme === 'light' ? 'active' : ''}`}
                onClick={toggleTheme}
                title="Cambiar tema"
              >
                {theme === 'light' ? <Sun size={22} /> : <Moon size={22} />}
              </button>
              <span className="theme-label-mobile">
                {theme === 'light' ? 'Claro' : 'Oscuro'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ef4444', fontSize: '13px', fontWeight: '600', padding: '6px 0',
              }}
            >
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </nav>
      </>
    );
  }

  // ── DESKTOP ────────────────────────────────────────────────────────────────
  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'} theme-${theme}`}>
      <div className={`sidebar-toggle ${!isCollapsed ? 'sidebar-header-open' : ''}`}>
        {!isCollapsed && (
          <div className="sidebar-brand-text">
            <span className="brand-icon-desk">📦</span>
            <h2 className="brand-text-desk">Hogareño</h2>
          </div>
        )}
        <button
          className="hamburger-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle sidebar"
          title={isCollapsed ? 'Abrir menú' : 'Cerrar menú'}
        >
          {isCollapsed ? <Menu size={24} /> : <X size={24} />}
        </button>
      </div>

      <div className="nav-links">
        {navItems.map((item) => {
          const NavIcon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-link transition-all duration-200 hover:scale-105 ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
              title={item.label}
            >
              <span className="nav-icon inline-flex items-center justify-center" style={{ filter: iconVolumeShadow }}>
                {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && currentPage === item.id && <span className="nav-indicator"></span>}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className={`theme-switcher ${isCollapsed ? 'theme-collapsed' : 'theme-expanded'}`}>
          {isCollapsed ? (
            <button
              className="theme-icon-only"
              onClick={toggleTheme}
              title={`Cambiar a ${theme === 'light' ? 'Oscuro' : 'Claro'}`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          ) : (
            <>
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme} title="Modo claro">
                <Sun size={20} />
              </button>
              <div className="theme-toggle-track">
                <div className={`toggle-circle theme-${theme}`}></div>
              </div>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme} title="Modo oscuro">
                <Moon size={20} />
              </button>
            </>
          )}
        </div>
        {!isCollapsed && (
          <p className="theme-label">{theme === 'light' ? 'Claro' : 'Oscuro'}</p>
        )}

        {/* CERRAR SESIÓN */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            marginTop: '8px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '8px',
            padding: isCollapsed ? '8px' : '8px 12px',
            background: 'none',
            border: 'none',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 80ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={17} />
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </nav>
  );
}