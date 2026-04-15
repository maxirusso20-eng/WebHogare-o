import { useState, useEffect, useMemo, memo } from 'react';
import { Menu, X, UsersRound, CarFront, Route, Globe, Sun, Moon, LayoutDashboard, CalendarDays, BookOpen, MessageSquare, LogOut, ShieldCheck, Navigation } from 'lucide-react';
import '../styles/sidebar.css';
import { supabase } from '../supabase';

// ── Los keyframes (badgePop, badgePulse, livePulse) están definidos
// ── en sidebar.css — no se inyectan dinámicamente.

// Constantes fuera del componente — no se recalculan en cada render
const SHADOW_DARK = 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.5))';
const SHADOW_LIGHT = 'drop-shadow(0px 3px 2px rgba(0, 0, 0, 0.22))';

function SidebarComponent({
  currentPage,
  setCurrentPage,
  theme,
  toggleTheme,
  isMobileOpen,
  setIsMobileOpen,
  isAdmin,
  isSuperAdmin,
  unreadCount = 0,
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Cargar estado del sidebar desde localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Guardar estado en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ESC: cerrar/minimizar el sidebar cuando está abierto
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isMobile && isMobileOpen) {
        setIsMobileOpen(false);
      } else if (!isMobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isMobileOpen, isCollapsed]);

  // navItems: solo se recalcula si cambia isAdmin o isSuperAdmin (raramente)
  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, alwaysVisible: true },
      { id: 'clientes', label: 'Clientes', icon: UsersRound, alwaysVisible: false },
      { id: 'choferes', label: 'Choferes', icon: CarFront, alwaysVisible: false },
      { id: 'recorridos', label: 'Recorridos', icon: Route, alwaysVisible: true },
      { id: 'historial', label: 'Historial', icon: BookOpen, alwaysVisible: false },
      { id: 'maps',     label: 'Maps',    icon: Globe,        alwaysVisible: true  },
      { id: 'ruteador', label: 'Mi Ruta', icon: Navigation,   alwaysVisible: true  },
      { id: 'chat',     label: 'Chat',    icon: MessageSquare, alwaysVisible: true  },
    ];
    if (isSuperAdmin) {
      items.push({ id: 'roles', label: 'Roles', icon: ShieldCheck, alwaysVisible: false });
    }
    return isAdmin ? items : items.filter(item => item.alwaysVisible);
  }, [isAdmin, isSuperAdmin]);

  const iconVolumeShadow = theme === 'light' ? SHADOW_LIGHT : SHADOW_DARK;

  // En móviles, mostrar como overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay oscuro cuando está abierto */}
        {isMobileOpen && (
          <div
            className="sidebar-overlay-backdrop"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar como overlay */}
        <nav className={`sidebar sidebar-mobile ${isMobileOpen ? 'mobile-open' : 'mobile-closed'} theme-${theme}`}>
          {/* HEADER DEL SIDEBAR MÓVIL */}
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

          {/* NAVEGACIÓN MÓVIL */}
          <div className="nav-links">
            {navItems.map((item) => {
              const NavIcon = item.icon;
              const showBadge = item.id === 'chat' && unreadCount > 0;
              return (
                <button
                  key={item.id}
                  className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileOpen(false);
                  }}
                  title={item.label}
                >
                  <span
                    className="nav-icon inline-flex items-center justify-center"
                    style={{ filter: iconVolumeShadow, position: 'relative' }}
                  >
                    {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
                    {showBadge && (
                      <span style={{
                        position: 'absolute', top: '-5px', right: '-6px',
                        background: '#ef4444', color: '#fff',
                        fontSize: '10px', fontWeight: '800',
                        borderRadius: '10px', padding: '1px 5px',
                        minWidth: '16px', textAlign: 'center', lineHeight: '14px',
                        border: `2px solid ${theme === 'light' ? '#fff' : '#0f172a'}`,
                        animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {currentPage === item.id && (
                    <span className="nav-indicator"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* FOOTER MÓVIL */}
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
              onClick={() => supabase.auth.signOut()}
              style={{
                marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${theme === 'light' ? '#ef444450' : '#ef444450'}`,
                color: '#ef4444', borderRadius: '12px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </nav>
      </>
    );
  }

  // VERSIÓN DESKTOP
  return (
    <nav
      className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'} theme-${theme}`}
    >
      {/* HEADER DEL SIDEBAR DESKTOP */}
      <div className="sidebar-toggle sidebar-header-open">
        <div className="sidebar-brand-text">
          <span className="brand-icon-desk">📦</span>
          <h2 className="brand-text-desk">Hogareño</h2>
        </div>
        <button
          className="hamburger-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle sidebar"
          title={isCollapsed ? 'Abrir menú' : 'Cerrar menú'}
        >
          <span className="icon-menu"><Menu size={24} /></span>
          <span className="icon-close"><X size={24} /></span>
        </button>
      </div>

      {/* NAVEGACIÓN */}
      <div className="nav-links">
        {navItems.map((item) => {
          const NavIcon = item.icon;
          const showBadge = item.id === 'chat' && unreadCount > 0;
          return (
            <button
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
              title={item.label}
            >
              <span
                className="nav-icon inline-flex items-center justify-center"
                style={{ filter: iconVolumeShadow, position: 'relative' }}
              >
                {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-7px',
                    background: '#ef4444', color: '#fff',
                    fontSize: '10px', fontWeight: '800',
                    borderRadius: '10px', padding: '1px 5px',
                    minWidth: '16px', textAlign: 'center', lineHeight: '14px',
                    border: `2px solid ${theme === 'light' ? '#fff' : '#0f172a'}`,
                    animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1), badgePulse 2s 0.3s ease-in-out infinite',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-indicator"></span>
            </button>
          );
        })}
      </div>

      {/* FOOTER DEL SIDEBAR DESKTOP */}
      <div className="sidebar-footer">
        <div className="theme-switcher theme-expanded">
          <button
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={toggleTheme}
            title="Modo claro"
            aria-label="Light mode"
          >
            <Sun size={20} />
          </button>
          <div className="theme-toggle-track">
            <div className={`toggle-circle theme-${theme}`}></div>
          </div>
          <button
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={toggleTheme}
            title="Modo oscuro"
            aria-label="Dark mode"
          >
            <Moon size={20} />
          </button>
        </div>
        <p className="theme-label" style={{ marginBottom: '16px' }}>{theme === 'light' ? 'Claro' : 'Oscuro'}</p>

        <button
          onClick={() => supabase.auth.signOut()}
          className="sidebar-logout-btn"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
          <span className="nav-label">Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}

// Memoizar el Sidebar: evita re-renders cuando cambia currentPage u otros
// estados del padre que no afectan la estructura del Sidebar.
export const Sidebar = memo(SidebarComponent);