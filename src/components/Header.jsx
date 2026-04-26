import { Truck, Menu, Bell, CheckCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import '../styles/header.css';

export function Header({ onBrandClick, onMobileMenuClick }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const { session, role } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Suscribirse a nuevos mensajes como notificaciones
  useEffect(() => {
    if (!session?.user?.email) return;
    const miEmail = session.user.email.toLowerCase();
    const isAdmin = ['admin', 'subadmin'].includes(role);

    const cargarNoLeidos = async () => {
      const campo = isAdmin ? 'admin_id' : 'chofer_email';
      const campoVisto = isAdmin ? 'visto_admin' : 'visto_chofer';
      const { data } = await supabase
        .from('mensajes')
        .select('id, texto, remitente, created_at')
        .eq(campo, miEmail)
        .eq(campoVisto, false)
        .order('created_at', { ascending: false })
        .limit(8);
      if (data) setNotifs(data);
    };

    cargarNoLeidos();

    const canal = supabase.channel('header-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' },
        () => cargarNoLeidos()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes' },
        () => cargarNoLeidos()
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [session, role]);

  const marcarTodasLeidas = async () => {
    if (!session?.user?.email || notifs.length === 0) return;
    const miEmail = session.user.email.toLowerCase();
    const isAdmin = ['admin', 'subadmin'].includes(role);
    const campo = isAdmin ? 'visto_admin' : 'visto_chofer';
    const ids = notifs.map(n => n.id);
    await supabase.from('mensajes').update({ [campo]: true }).in('id', ids);
    setNotifs([]);
  };

  const formatHora = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleBrandClick = () => {
    onBrandClick();
    window.open(window.location.pathname, '_blank');
  };

  return (
    <header className="app-header">
      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={onMobileMenuClick}
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
      )}

      <button
        className="brand-button"
        onClick={handleBrandClick}
        title="Ir a Dashboard"
      >
        <Truck size={28} strokeWidth={2} className="brand-icon" />
        <h1 className="brand-text">Logística Hogareño</h1>
      </button>

      {/* CAMPANITA */}
      <div ref={dropdownRef} style={{ marginLeft: 'auto', position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(v => !v)}
          title="Notificaciones"
          style={{
            position: 'relative', background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '8px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={22} />
          {notifs.length > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              background: '#ef4444', color: 'white',
              fontSize: '10px', fontWeight: '800',
              width: '17px', height: '17px',
              borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-surface)',
              animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {notifs.length > 9 ? '9+' : notifs.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: '320px', zIndex: 99999,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            animation: 'fadeIn 0.18s ease-out',
          }}>
            {/* Header dropdown */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-1)' }}>
                🔔 Notificaciones {notifs.length > 0 && `(${notifs.length})`}
              </span>
              {notifs.length > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: '#3b82f6', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <CheckCheck size={14} /> Marcar leídas
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center',
                  color: 'var(--text-3)', fontSize: '13px',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  Sin notificaciones pendientes
                </div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    background: 'var(--bg-raised)',
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#3b82f6', marginTop: '5px', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: 'var(--text-2)' }}>
                        {n.remitente || 'Soporte'}
                      </p>
                      <p style={{
                        margin: '2px 0 0', fontSize: '13px', color: 'var(--text-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.texto || '📎 Archivo adjunto'}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                      {formatHora(n.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
