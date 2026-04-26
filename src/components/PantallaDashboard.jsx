import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import { X, Map, MapPin, MessageCircle, Users, Truck, History, Shield, LayoutDashboard } from 'lucide-react';

function OverlayBienvenidaChofer({ onClose }) {
  const { theme, choferes, setCurrentPage } = useContext(AppContext);
  const { session } = useAuth();
  const [noMostrar, setNoMostrar] = useState(false);

  const miEmail = session?.user?.email?.toLowerCase();
  const miChofer = choferes.find(c => c.email?.toLowerCase() === miEmail);
  const nombre = miChofer ? miChofer.nombre : (miEmail ? miEmail.split('@')[0] : 'Usuario');

  const cardBg = theme === 'light' ? '#ffffff' : '#1e293b';
  const border = theme === 'light' ? '#e2e8f0' : '#334155';
  const textPrimary = theme === 'light' ? '#1e293b' : '#f8fafc';
  const textSecondary = theme === 'light' ? '#64748b' : '#94a3b8';

  const handleClose = () => {
    if (noMostrar) {
      localStorage.setItem(`ocultar_bienvenida_${miEmail}`, 'true');
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: theme === 'dark' ? 'rgba(2, 6, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(16px)',
      animation: 'fadeIn 0.3s ease-out forwards',
      padding: '24px'
    }}>
      <div style={{ position: 'relative', background: cardBg, padding: '40px', borderRadius: '32px', boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(59,130,246,0.15)', border: `1px solid ${border}`, maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary, padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px', animation: 'bounceFloat 2s infinite' }}>🚚</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: textPrimary, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            ¡Bienvenido, <span style={{ color: '#3b82f6' }}>{nombre}</span>!
          </h1>
          <p style={{ fontSize: '15px', color: textSecondary, lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
            Este es tu panel de inicio. Tienes acceso al dashboard para ver el resumen del día. Además, puedes acceder rápidamente a tus herramientas principales:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* Recorridos */}
          <div
            onClick={() => { handleClose(); setCurrentPage('recorridos'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#3b82f620', padding: '10px', borderRadius: '12px' }}>
                <Map size={24} color="#3b82f6" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', color: textPrimary, fontWeight: '700' }}>Recorridos</h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: textSecondary, lineHeight: '1.5' }}>
              Visualiza tus rutas asignadas, gestiona los paquetes y marca entregas.
            </p>
          </div>

          {/* Maps */}
          <div
            onClick={() => { handleClose(); setCurrentPage('maps'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#10b981'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#10b98120', padding: '10px', borderRadius: '12px' }}>
                <MapPin size={24} color="#10b981" />
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textPrimary, fontWeight: '700' }}>Maps</h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: textSecondary, lineHeight: '1.5' }}>
              Ubica tu posición en el mapa interactivo y coordina con exactitud.
            </p>
          </div>

          {/* Chat */}
          <div
            onClick={() => { handleClose(); setCurrentPage('chat'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#8b5cf620', padding: '10px', borderRadius: '12px' }}>
                <MessageCircle size={24} color="#8b5cf6" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', color: textPrimary, fontWeight: '700' }}>Chat</h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: textSecondary, lineHeight: '1.5' }}>
              Comunícate directo con la administración para reportar dudas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: theme === 'light' ? '#f1f5f9' : '#0f172a', borderRadius: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
            <input
              type="checkbox"
              checked={noMostrar}
              onChange={(e) => setNoMostrar(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            No mostrar este mensaje de bienvenida nuevamente
          </label>
          <button
            onClick={handleClose}
            style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PANTALLA: Overlay Bienvenida Administrador
// ════════════════════════════════════════════════════════════════
function OverlayBienvenidaAdmin({ onClose }) {
  const { theme, setCurrentPage } = useContext(AppContext);
  const { session } = useAuth();
  const [noMostrar, setNoMostrar] = useState(false);

  const miEmail = session?.user?.email?.toLowerCase();
  const nombre = miEmail ? miEmail.split('@')[0] : 'Administrador';

  const cardBg = theme === 'light' ? '#ffffff' : '#1e293b';
  const border = theme === 'light' ? '#e2e8f0' : '#334155';
  const textPrimary = theme === 'light' ? '#1e293b' : '#f8fafc';
  const textSecondary = theme === 'light' ? '#64748b' : '#94a3b8';

  const handleClose = () => {
    if (noMostrar) {
      localStorage.setItem(`ocultar_bienvenida_admin_${miEmail}`, 'true');
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: theme === 'dark' ? 'rgba(2, 6, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(16px)',
      animation: 'fadeIn 0.3s ease-out forwards',
      padding: '24px'
    }}>
      <div style={{ position: 'relative', background: cardBg, padding: '40px', borderRadius: '32px', boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(59,130,246,0.15)', border: `1px solid ${border}`, maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary, padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px', animation: 'bounceFloat 2s infinite' }}>👑</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: textPrimary, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            ¡Bienvenido, <span style={{ color: '#3b82f6' }}>{nombre}</span>!
          </h1>
          <p style={{ fontSize: '15px', color: textSecondary, lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
            Este es tu Panel de Control de Administrador. Desde aquí tienes control total sobre la logística de tu negocio. Conoce las secciones clave:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          
          {/* Dashboard */}
          <div
            onClick={() => { handleClose(); setCurrentPage('dashboard'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#0ea5e9'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#0ea5e920', padding: '8px', borderRadius: '10px' }}>
                <LayoutDashboard size={20} color="#0ea5e9" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Dashboard</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Vista principal con el resumen general de las operaciones del día.
            </p>
          </div>

          {/* Choferes */}
          <div
            onClick={() => { handleClose(); setCurrentPage('choferes'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#8b5cf620', padding: '8px', borderRadius: '10px' }}>
                <Truck size={20} color="#8b5cf6" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Choferes</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Administra tu flota, zonas asignadas y datos de contacto del personal.
            </p>
          </div>

          {/* Clientes */}
          <div
            onClick={() => { handleClose(); setCurrentPage('clientes'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#f59e0b'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#f59e0b20', padding: '8px', borderRadius: '10px' }}>
                <Users size={20} color="#f59e0b" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Clientes</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Organiza la cartera de clientes, horarios y asignación de colectas.
            </p>
          </div>

          {/* Recorridos */}
          <div
            onClick={() => { handleClose(); setCurrentPage('recorridos'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#3b82f620', padding: '8px', borderRadius: '10px' }}>
                <Map size={20} color="#3b82f6" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Recorridos</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Diseña las rutas del día y monitorea los paquetes en tiempo real.
            </p>
          </div>

          {/* Maps */}
          <div
            onClick={() => { handleClose(); setCurrentPage('maps'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#10b981'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#10b98120', padding: '8px', borderRadius: '10px' }}>
                <MapPin size={20} color="#10b981" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Live Maps</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Supervisa la ubicación en vivo de todos tus choferes coordinados.
            </p>
          </div>

          {/* Chat */}
          <div
            onClick={() => { handleClose(); setCurrentPage('chat'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#ec4899'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#ec489920', padding: '8px', borderRadius: '10px' }}>
                <MessageCircle size={20} color="#ec4899" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Chat & Soporte</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Canal de comunicación directa para resolver dudas del personal.
            </p>
          </div>

          {/* Roles */}
          <div
            onClick={() => { handleClose(); setCurrentPage('roles'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#6366f120', padding: '8px', borderRadius: '10px' }}>
                <Shield size={20} color="#6366f1" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Roles y Accesos</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Controla qué nivel de acceso tiene cada usuario del sistema.
            </p>
          </div>

          {/* Historiales */}
          <div
            onClick={() => { handleClose(); setCurrentPage('historial-recorridos'); }}
            style={{ backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#64748b'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = border; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#64748b20', padding: '8px', borderRadius: '10px' }}>
                <History size={20} color="#64748b" />
              </div>
              <h3 style={{ margin: '0', fontSize: '15px', color: textPrimary, fontWeight: '700' }}>Auditoría Histórica</h3>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary, lineHeight: '1.4' }}>
              Revisa estadísticas y métricas de operaciones de días anteriores.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: theme === 'light' ? '#f1f5f9' : '#0f172a', borderRadius: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
            <input
              type="checkbox"
              checked={noMostrar}
              onChange={(e) => setNoMostrar(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            No mostrar este mensaje de bienvenida nuevamente
          </label>
          <button
            onClick={handleClose}
            style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Empezar a Administrar
          </button>
        </div>

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PANTALLA: Dashboard
// ════════════════════════════════════════════════════════════════
function PantallaDashboard() {
  const { colectas, choferes, clientes, theme, setCurrentPage, triggerTabSplash } = useContext(AppContext);
  const { role, session } = useAuth();
  const [colectasSabados, setColectasSabados] = useState([]);
  const [tabDashboard, setTabDashboard] = useState('LUNES A VIERNES');
  const [mostrarOverlayChofer, setMostrarOverlayChofer] = useState(false);
  const [mostrarOverlayAdmin, setMostrarOverlayAdmin] = useState(false);

  useEffect(() => {
    const email = session?.user?.email?.toLowerCase();
    
    // Check para coordinador
    if (role === 'coordinador') {
      const oculto = localStorage.getItem(`ocultar_bienvenida_${email}`);
      if (!oculto) {
        setMostrarOverlayChofer(true);
      }
    } 
    // Check para admin o subadmin
    else if (['admin', 'subadmin'].includes(role)) {
      const oculto = localStorage.getItem(`ocultar_bienvenida_admin_${email}`);
      if (!oculto) {
        setMostrarOverlayAdmin(true);
      }
    }
  }, [role, session]);

  useEffect(() => {
    const fetchSabados = async () => {
      try {
        const { data, error } = await supabase
          .from('recorridos_sabados')
          .select('*')
          .order('orden', { ascending: true });
        if (error) throw error;
        setColectasSabados(data || []);
      } catch (err) {
        console.error('Error fetching sabados:', err);
      }
    };

    // Carga inicial
    fetchSabados();

    // Realtime: re-fetch cuando cambie recorridos_sabados
    const canalSabados = supabase
      .channel('dashboard:recorridos_sabados')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recorridos_sabados' },
        (payload) => {
          fetchSabados();
        }
      )
      .subscribe();

    // Cleanup: cerrar canal al desmontar el Dashboard
    return () => {
      supabase.removeChannel(canalSabados);
    };
  }, []);

  const clientesSemana = clientes.filter(c => c.tipo_dia !== 'SÁBADOS');
  const clientesSabados = clientes.filter(c => c.tipo_dia === 'SÁBADOS');

  // Lógica Dinámica
  const datosActivos = tabDashboard === 'SÁBADOS' ? colectasSabados : colectas;
  const totalPaquetes = datosActivos.reduce((s, c) => s + (c.pqteDia || 0) + (c.porFuera || 0), 0);
  const totalEntregados = datosActivos.reduce((s, c) => s + (c.entregados || 0), 0);
  const pctGlobal = totalPaquetes > 0 ? ((totalEntregados / totalPaquetes) * 100).toFixed(1) : 0;
  const rutasSinChoferActivas = datosActivos.filter(c => !c.idChofer || c.idChofer === 0);

  const ZONAS = ['ZONA OESTE', 'ZONA SUR', 'ZONA NORTE', 'CABA'];
  const coloresZona = {
    'ZONA OESTE': '#3b82f6',
    'ZONA SUR': '#8b5cf6',
    'ZONA NORTE': '#ec4899',
    'CABA': '#06b6d4',
  };

  const cardBg = theme === 'light' ? '#ffffff' : '#1e293b';
  const border = theme === 'light' ? '#e2e8f0' : '#334155';
  const textPrimary = theme === 'light' ? '#1e293b' : '#f8fafc';
  const textSecondary = theme === 'light' ? '#64748b' : '#94a3b8';
  const pageBg = theme === 'light' ? '#f8fafc' : '#020617';

  const getPctColor = (pct) => {
    const n = parseFloat(pct);
    if (n >= 100) return '#10b981';
    if (n >= 80) return '#06b6d4';
    if (n >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '24px', backgroundColor: pageBg, minHeight: '100vh', position: 'relative' }}>

      {/* OVERLAY DE BIENVENIDA (COORDINADOR) */}
      {mostrarOverlayChofer && (
        <OverlayBienvenidaChofer onClose={() => setMostrarOverlayChofer(false)} />
      )}

      {/* OVERLAY DE BIENVENIDA (ADMIN) */}
      {mostrarOverlayAdmin && (
        <OverlayBienvenidaAdmin onClose={() => setMostrarOverlayAdmin(false)} />
      )}

      {/* TÍTULO */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: textPrimary }}>
          📊 Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: textSecondary }}>
          Resumen del día — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* TABS DASHBOARD */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'LUNES A VIERNES', value: 'LUNES A VIERNES' },
          { label: 'SÁBADOS', value: 'SÁBADOS' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabDashboard !== tab.value) {
                triggerTabSplash(tab.label);
                setTabDashboard(tab.value);
              }
            }}
            className="px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-100 border-b-2 focus:outline-none"
            style={tabDashboard === tab.value
              ? { background: 'var(--bg-raised)', borderColor: 'var(--brand-blue)', color: 'var(--brand-blue)' }
              : { background: 'var(--bg-hover)', borderColor: 'transparent', color: 'var(--text-3)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* BLOQUE DINÁMICO */}
      <div style={{ borderBottom: `2px solid ${border}`, paddingBottom: '8px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b', letterSpacing: '1px' }}>
          📅 {tabDashboard}
        </h2>
      </div>

      {/* CARDS GLOBALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          ...(tabDashboard === 'SÁBADOS' ? [
            { label: 'Rutas activas', value: datosActivos.length, icon: '🗓️', color: '#06b6d4' }
          ] : [
            { label: 'Choferes activos', value: choferes.length, icon: '🚚', color: '#8b5cf6' }
          ]),
          { label: 'Total paquetes', value: totalPaquetes, icon: '📦', color: '#3b82f6' },
          { label: 'Entregados', value: totalEntregados, icon: '✅', color: '#10b981' },
          { label: '% Global', value: pctGlobal + '%', icon: '📈', color: getPctColor(pctGlobal) },
          { label: 'Clientes activos', value: tabDashboard === 'SÁBADOS' ? clientesSabados.length : clientesSemana.length, icon: tabDashboard === 'SÁBADOS' ? '🗓️' : '📅', color: tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b' },
          { label: 'Rutas sin chofer', value: rutasSinChoferActivas.length, icon: '⚠️', color: rutasSinChoferActivas.length > 0 ? '#ef4444' : '#10b981' }
        ].map(card => (
          <div key={card.label} style={{
            backgroundColor: cardBg,
            borderRadius: '12px',
            border: `1px solid ${border}`,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.07)' : '0 4px 12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: '24px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* RESUMEN POR ZONA DINÁMICO */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700', color: textPrimary }}>
          Resumen por zona
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {ZONAS.map(zona => {
            const items = datosActivos.filter(c => c.zona === zona);
            const pqtes = items.reduce((s, c) => s + (c.pqteDia || 0) + (c.porFuera || 0), 0);
            const entregados = items.reduce((s, c) => s + (c.entregados || 0), 0);
            const pct = pqtes > 0 ? ((entregados / pqtes) * 100).toFixed(1) : 0;
            const color = coloresZona[zona];
            const sinChofer = items.filter(c => !c.idChofer || c.idChofer === 0).length;
            return (
              <div
                key={zona}
                onClick={() => setCurrentPage('recorridos')}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: '10px',
                  border: `1px solid ${border}`,
                  borderLeft: `4px solid ${color}`,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${color}25`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color, textTransform: 'uppercase' }}>{zona}</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: getPctColor(pct) }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: getPctColor(pct), borderRadius: '3px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: textSecondary }}>
                  <span>{entregados}/{pqtes} pqtes</span>
                  <span>{items.length} rutas</span>
                </div>
                {sinChofer > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                    ⚠️ {sinChofer} ruta{sinChofer > 1 ? 's' : ''} sin chofer
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* CLIENTES ACTIVOS ESE DÍA */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700', color: textPrimary }}>
          Clientes registrados ({tabDashboard})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div
            onClick={() => setCurrentPage('clientes')}
            style={{
              backgroundColor: cardBg,
              borderRadius: '10px',
              border: `1px solid ${border}`,
              borderLeft: `4px solid ${tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b'}`,
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${tabDashboard === 'SÁBADOS' ? 'rgba(6,182,212,0.2)' : 'rgba(245,158,11,0.2)'}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b', textTransform: 'uppercase' }}>
                {tabDashboard === 'SÁBADOS' ? '🗓️ Sábados' : '📅 Lunes a Viernes'}
              </span>
              <span style={{ fontSize: '26px', fontWeight: '800', color: tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b' }}>
                {tabDashboard === 'SÁBADOS' ? clientesSabados.length : clientesSemana.length}
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155', marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: clientes.length > 0 ? `${((tabDashboard === 'SÁBADOS' ? clientesSabados.length : clientesSemana.length) / clientes.length) * 100}%` : '0%', backgroundColor: tabDashboard === 'SÁBADOS' ? '#06b6d4' : '#f59e0b', borderRadius: '3px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '12px', color: textSecondary }}>
              {clientes.length > 0 ? (((tabDashboard === 'SÁBADOS' ? clientesSabados.length : clientesSemana.length) / clientes.length) * 100).toFixed(0) : 0}% del padrón total de clientes
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS */}
      {rutasSinChoferActivas.length > 0 && (
        <div style={{
          backgroundColor: theme === 'light' ? '#fef2f2' : '#2d1515',
          border: `1px solid #ef444440`,
          borderLeft: '4px solid #ef4444',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
            ⚠️ {rutasSinChoferActivas.length} ruta{rutasSinChoferActivas.length > 1 ? 's' : ''} sin chofer asignado ({tabDashboard})
          </p>
          <p style={{ margin: '4px 0 8px', fontSize: '13px', color: textSecondary }}>
            {rutasSinChoferActivas.map(r => r.localidad).join(', ')}
          </p>
          <button
            onClick={() => setCurrentPage('recorridos')}
            style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444', background: 'none', border: '1px solid #ef444460', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}
          >
            Ir a Recorridos →
          </button>
        </div>
      )}
    </div>
  );
}


export { PantallaDashboard };