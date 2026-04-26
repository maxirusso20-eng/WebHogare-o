import { useState, useEffect } from 'react';
import { Menu, X, UsersRound, CarFront, Route, Globe, Sun, Moon, LayoutDashboard, MessageCircle, LogOut, ShieldCheck, History, UserCheck } from 'lucide-react';
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

  const { session } = useAuth();
  const miEmail = session?.user?.email?.toLowerCase() || '';

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!miEmail || !role) return;

    // Primero contar los actuales
    const contarNoLeidos = async () => {
      const isAd = role === 'admin';
      const f = isAd ? 'visto_admin' : 'visto_chofer';
      const d = isAd ? 'admin_id' : 'chofer_email';
      const { count } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq(d, miEmail)
        .eq(f, false);
      setUnreadChatCount(count || 0);
    };

    contarNoLeidos();

    // Pedir permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Suscribirse a nuevos mensajes
    const canal = supabase.channel(`sidebar_chat:${miEmail}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, payload => {
        const m = payload.new;
        const isAd = role === 'admin';
        const dest = isAd ? m.admin_id : m.chofer_email;
        if (dest?.toLowerCase() === miEmail) {
          const visto = isAd ? m.visto_admin : m.visto_chofer;
          if (!visto) {
            setUnreadChatCount(prev => prev + 1);
            
            // ── ALERTA SONORA (Sintetizada) ──
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
              osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.5, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            } catch(e) {}

            if (Notification.permission === 'granted') {
              new Notification('Nuevo mensaje', {
                body: `${m.remitente || 'Alguien'}: ${m.texto ? m.texto : 'Mensaje adjunto'}`,
                icon: '/vite.svg'
              });
            }
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes' }, payload => {
        contarNoLeidos(); // Recalcular si alguien leyó
      })
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [miEmail, role]);

  // Permisos por rol:
  //   admin       → todo
  //   subadmin    → todo menos Roles
  //   coordinador → Dashboard, Recorridos, Maps, Chat
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'subadmin', 'coordinador'] },
    { id: 'clientes', label: 'Clientes', icon: UsersRound, roles: ['admin', 'subadmin'] },
    { id: 'choferes', label: 'Choferes', icon: CarFront, roles: ['admin', 'subadmin'] },
    { id: 'recorridos', label: 'Recorridos', icon: Route, roles: ['admin', 'subadmin', 'coordinador'] },
    { id: 'maps', label: 'Maps', icon: Globe, roles: ['admin', 'subadmin', 'coordinador'] },
    { id: 'historial-recorridos', label: 'Hist. Recorridos', icon: History, roles: ['admin', 'subadmin'] },
    { id: 'historial-clientes', label: 'Hist. Clientes', icon: UserCheck, roles: ['admin', 'subadmin'] },
    { id: 'roles', label: 'Roles', icon: ShieldCheck, roles: ['admin'] },
    { id: 'chat', label: 'Chat', icon: MessageCircle, roles: ['admin', 'subadmin', 'coordinador'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  const iconVolumeShadow =
    theme === 'light'
      ? 'drop-shadow(0px 3px 2px rgba(0, 0, 0, 0.22))'
      : 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.5))';

  const handleLogout = () => {
    sessionStorage.clear();
    supabase.auth.signOut();
  };

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
                  <span className="nav-icon inline-flex items-center justify-center" style={{ filter: iconVolumeShadow, position: 'relative' }}>
                    {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
                    {item.id === 'chat' && unreadChatCount > 0 && (
                      <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', lineHeight: 1, border: `2px solid ${theme === 'dark' ? '#0f172a' : '#ffffff'}` }}>
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
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
              <span className="nav-icon inline-flex items-center justify-center" style={{ filter: iconVolumeShadow, position: 'relative' }}>
                {NavIcon ? <NavIcon size={18} strokeWidth={2.25} /> : null}
                {item.id === 'chat' && unreadChatCount > 0 && (
                  <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', lineHeight: 1, border: `2px solid ${theme === 'dark' ? '#0f172a' : '#ffffff'}`, transform: isCollapsed ? 'scale(0.85)' : 'scale(1)', transition: 'transform 0.2s' }}>
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
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