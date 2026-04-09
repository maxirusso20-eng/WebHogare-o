import { useState, useEffect } from 'react';
import { Menu, X, UsersRound, CarFront, Route, Globe, Sun, Moon, LayoutDashboard, CalendarDays, BookOpen } from 'lucide-react';
import '../styles/sidebar.css';

export function Sidebar({
  currentPage,
  setCurrentPage,
  theme,
  toggleTheme,
  isMobileOpen,
  setIsMobileOpen
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

  // Si estamos en móvil, mostrar antes de navItems

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: UsersRound },
    { id: 'choferes', label: 'Choferes', icon: CarFront },
    { id: 'recorridos', label: 'Recorridos', icon: Route },
    { id: 'historial', label: 'Historial', icon: BookOpen },
    { id: 'maps', label: 'Maps', icon: Globe },
  ];

  const iconVolumeShadow =
    theme === 'light'
      ? 'drop-shadow(0px 3px 2px rgba(0, 0, 0, 0.22))'
      : 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.5))';

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
                  <span
                    className="nav-icon inline-flex items-center justify-center"
                    style={{ filter: iconVolumeShadow }}
                  >
                    {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
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
          </div>
        </nav>
      </>
    );
  }

  // VERSIÓN DESKTOP
  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'} theme-${theme}`}>
      {/* HEADER DEL SIDEBAR DESKTOP - Abierto/Cerrado */}
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

      {/* NAVEGACIÓN */}
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
              <span
                className="nav-icon inline-flex items-center justify-center"
                style={{ filter: iconVolumeShadow }}
              >
                {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && currentPage === item.id && (
                <span className="nav-indicator"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* FOOTER DEL SIDEBAR DESKTOP */}
      <div className="sidebar-footer">
        <div className={`theme-switcher ${isCollapsed ? 'theme-collapsed' : 'theme-expanded'}`}>
          {isCollapsed ? (
            // Modo colapsado: Solo icono centrado del tema actual
            <button
              className="theme-icon-only"
              onClick={toggleTheme}
              title={`Cambiar a ${theme === 'light' ? 'Oscuro' : 'Claro'}`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          ) : (
            // Modo expandido: Botones + selector deslizable
            <>
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
            </>
          )}
        </div>
        {!isCollapsed && (
          <p className="theme-label">{theme === 'light' ? 'Claro' : 'Oscuro'}</p>
        )}
      </div>
    </nav>
  );
}