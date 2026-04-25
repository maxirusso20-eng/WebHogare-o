import { useState, useEffect, useCallback, useMemo, createContext, useRef, useContext } from 'react';
import { supabase } from './supabase';
import './index.css';
import { Truck, Package, Plus, MapPin, Map, TrendingUp, AlertCircle, CheckCircle, Grid3x3, Trash2, GripVertical, CalendarDays, MessageCircle, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { ModalAgregar } from './components/ModalAgregar';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ModalAgregarChofer } from './components/ModalAgregarChofer';
import { ModalConfirmarEliminar } from './components/ModalConfirmarEliminar';
import { ModalAgregarCliente } from './components/ModalAgregarCliente';
import { TarjetaChofer } from './components/TarjetaChofer';
import { useAuth } from './components/AuthContext';
import { PantallaLogin } from './components/PantallaLogin';
import { PantallaChat } from './components/PantallaChat';
import { PantallaMaps } from './components/PantallaMaps';
import { PantallaRoles } from './components/PantallaRoles';
import { ModalConfirmacion } from './components/ModalConfirmacion';
import { PantallaHistorialClientes } from './components/PantallaHistorialClientes';
import { PantallaHistorialRecorridos } from './components/PantallaHistorialRecorridos';

import { PantallaDashboard } from './components/PantallaDashboard';
import { PantallaRecorridos } from './components/PantallaRecorridos';
import { PantallaChoferes } from './components/PantallaChoferes';
import { PantallaClientes } from './components/PantallaClientes';
// ────────────────────────────────────────────────────────────────────────
// CONTEXTO GLOBAL
// ────────────────────────────────────────────────────────────────────────
export const AppContext = createContext();

function App() {
  const { session, role, loading: authLoading } = useAuth();

  // ─── ESTADO ───────────────────────────────────────────────
  const [choferes, setChoferes] = useState([]);
  const [colectas, setColectas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [toasts, setToasts] = useState([]);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [isTabSplashActive, setIsTabSplashActive] = useState(false);
  const [tabSplashText, setTabSplashText] = useState('');

  const triggerTabSplash = useCallback((text) => {
    setTabSplashText(text);
    setIsTabSplashActive(true);
    setTimeout(() => setIsTabSplashActive(false), 1200);
  }, []);

  // Splash mínimo de 2 segundos
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // ─── APLICAR TEMA AL CARGAR ────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ─── SINCRONIZAR CON SUPABASE ─────────────────────────
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar Choferes
        const { data: choferesData } = await supabase
          .from('Choferes')
          .select('*')
          .order('nombre', { ascending: true });

        setChoferes(choferesData || []);

        // Cargar Colectas — el orden lo dicta Supabase (columna `orden`)
        const { data: colectasData } = await supabase
          .from('Recorridos')
          .select('*')
          .order('id', { ascending: true });

        setColectas(colectasData || []);

        // Cargar Clientes
        const { data: clientesData } = await supabase
          .from('Clientes')
          .select('id, cliente, chofer, horario, direccion, tipo_dia, Choferes(celular)')
          .order('cliente', { ascending: true });

        setClientes(clientesData || []);
        console.log('Clientes cargados:', clientesData);
        console.log('✓ Datos cargados desde Supabase');
      } catch (err) {
        console.error('Error cargando datos:', err);
        mostrarToast('Error cargando datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('public:Choferes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'Choferes' },
        (payload) => {
          console.log('🔄 Cambio en Choferes:', payload);
          if (payload.eventType === 'INSERT') {
            setChoferes(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setChoferes(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setChoferes(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // ─── FUNCIONES AUXILIARES ─────────────────────────────
  const mostrarToast = (mensaje, tipo = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    // Apply synchronously before React re-render for instant visual switch
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.className = `theme-${newTheme}`;
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const guardarChofer = async (choferData) => {
    try {
      if (choferData.id) {
        // Actualizar
        const { error } = await supabase
          .from('Choferes')
          .update(choferData)
          .eq('id', choferData.id);

        if (error) throw error;
        mostrarToast('✓ Chofer actualizado', 'success');
      } else {
        // Crear
        const { data, error } = await supabase
          .from('Choferes')
          .insert([choferData])
          .select();

        if (error) throw error;
        setChoferes(prev => [data[0], ...prev]);
        mostrarToast('✓ Chofer registrado', 'success');
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al guardar', 'error');
    }
  };

  const eliminarChofer = async (id) => {
    if (!window.confirm('¿Eliminar este chofer?')) return;

    try {
      const { error } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setChoferes(prev => prev.filter(c => c.id !== id));
      mostrarToast('✓ Chofer eliminado', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al eliminar', 'error');
    }
  };

  const guardarColecta = async (colectaData) => {
    try {
      if (colectaData.id) {
        const { error } = await supabase
          .from('Recorridos')
          .update(colectaData)
          .eq('id', colectaData.id);

        if (error) throw error;
        mostrarToast('✓ Colecta actualizada', 'success');
      } else {
        const { data, error } = await supabase
          .from('Recorridos')
          .insert([colectaData])
          .select();

        if (error) throw error;
        setColectas(prev => [data[0], ...prev]);
        mostrarToast('✓ Colecta registrada', 'success');
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al guardar', 'error');
    }
  };

  const handleEliminarCliente = async (clienteId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== clienteId));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarClienteConfirm = async () => {
    if (!itemAEliminar) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', itemAEliminar.id);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== itemAEliminar.id));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setItemAEliminar(null);
    }
  };

  const handleEliminarClienteCancel = () => {
    setIsConfirmDeleteOpen(false);
    setItemAEliminar(null);
  };

  const handleOpenConfirmDeleteModal = (cliente) => {
    setItemAEliminar(cliente);
    setIsConfirmDeleteOpen(true);
  };

  // ─── CONTEXTO GLOBAL ───────────────────────────────────
  const eliminarRecorrido = async (id) => {
    try {
      const { error } = await supabase
        .from('Recorridos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setColectas(prev => prev.filter(c => c.id !== id));
      mostrarToast('✅ Recorrido eliminado', 'success');
    } catch (err) {
      console.error('Error eliminando recorrido:', err);
      mostrarToast('❌ Error al eliminar recorrido', 'error');
    }
  };

  const contextValue = {
    choferes,
    setChoferes,
    colectas,
    setColectas,
    clientes,
    setClientes,
    loading,
    currentPage,
    setCurrentPage,
    theme,
    toggleTheme,
    guardarChofer,
    eliminarChofer,
    guardarColecta,
    eliminarRecorrido,
    mostrarToast,
    handleEliminarCliente,
    handleEliminarClienteConfirm,
    handleEliminarClienteCancel,
    handleOpenConfirmDeleteModal,
    triggerTabSplash,
  };

  // ─── RENDER ───────────────────────────────────────────
  if (authLoading || loading || !splashDone) {
    const isDark = theme === 'dark';
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(145deg, #020617 0%, #0f172a 60%, #1e293b 100%)'
          : 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 60%, #bfdbfe 100%)',
        userSelect: 'none',
      }}>
        {/* Anillo decorativo */}
        <div style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Card central */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px',
          padding: '52px 64px', borderRadius: '28px',
          background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(59,130,246,0.2)',
          boxShadow: isDark
            ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 32px 80px rgba(59,130,246,0.15), 0 0 0 1px rgba(255,255,255,0.8)',
        }}>
          {/* Camión animado */}
          <div style={{
            fontSize: '72px', lineHeight: 1,
            animation: 'splashTruck 1.4s ease-in-out infinite',
            filter: isDark
              ? 'drop-shadow(0 4px 16px rgba(59,130,246,0.5))'
              : 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))',
          }}>🚚</div>

          {/* Texto */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              margin: 0, fontWeight: '900', fontSize: '30px', letterSpacing: '-0.8px',
              color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.1,
            }}>Logística Hogareño</h1>
            <p style={{
              margin: '8px 0 0', fontSize: '11px', fontWeight: '700',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: isDark ? '#334155' : '#94a3b8',
            }}>Sistema de Gestión</p>
          </div>

          {/* Barra de progreso */}
          <div style={{
            width: '220px', height: '5px', borderRadius: '99px',
            background: isDark ? '#1e293b' : '#dbeafe',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: isDark
                ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                : 'linear-gradient(90deg, #2563eb, #6d28d9)',
              animation: 'splashBar 2s cubic-bezier(0.4,0,0.2,1) forwards',
              width: '0%',
            }} />
          </div>
        </div>

        {/* Footer */}
        <p style={{
          position: 'absolute', bottom: '20px', margin: 0,
          fontSize: '11px', fontWeight: '500', letterSpacing: '0.05em',
          color: isDark ? '#1e293b' : '#bfdbfe',
        }}>Hogareño App — v2.0</p>
      </div>
    );
  }


  if (!session) {
    return <PantallaLogin theme={theme} />;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`app theme-${theme}`}>
        <Header
          onBrandClick={() => setCurrentPage('dashboard')}
          onMobileMenuClick={() => setIsSidebarMobileOpen(true)}
        />

        <div className="app-body">
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            theme={theme}
            toggleTheme={toggleTheme}
            isMobileOpen={isSidebarMobileOpen}
            setIsMobileOpen={setIsSidebarMobileOpen}
          />

          <main className="main-content">
            {currentPage === 'dashboard' && <PantallaDashboard />}
            {currentPage === 'recorridos' && <PantallaRecorridos />}
            {currentPage === 'choferes' && ['admin', 'subadmin'].includes(role) && <PantallaChoferes />}
            {currentPage === 'clientes' && ['admin', 'subadmin'].includes(role) && <PantallaClientes />}
            {currentPage === 'maps' && <PantallaMaps />}
            {currentPage === 'chat' && <PantallaChat />}
            {currentPage === 'roles' && role === 'admin' && <PantallaRoles />}
            {currentPage === 'historial-clientes' && ['admin', 'subadmin'].includes(role) && <PantallaHistorialClientes />}
            {currentPage === 'historial-recorridos' && ['admin', 'subadmin'].includes(role) && <PantallaHistorialRecorridos />}
          </main>
        </div>

        <div className="toast-container">
          {toasts.map(toast => (
            <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} />
          ))}
        </div>

        {/* OVERLAY SPLASH PREMIUM PARA TABS */}
        {isTabSplashActive && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: theme === 'dark' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
              padding: '40px 60px', borderRadius: '32px',
              background: theme === 'dark' ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'linear-gradient(145deg, #ffffff, #f1f5f9)',
              boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 20px 40px rgba(59,130,246,0.15), inset 0 1px 0 #ffffff',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.8)',
              animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
              <div style={{
                fontSize: '64px',
                filter: theme === 'dark' ? 'drop-shadow(0 0 20px rgba(59,130,246,0.5))' : 'drop-shadow(0 8px 16px rgba(59,130,246,0.3))',
                animation: 'bounceFloat 1.5s ease-in-out infinite',
              }}>
                🚚
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 4px', fontSize: '24px', fontWeight: '800',
                  background: theme === 'dark' ? 'linear-gradient(90deg, #60a5fa, #a78bfa)' : 'linear-gradient(90deg, #2563eb, #7c3aed)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>
                  Cargando {tabSplashText}
                </h2>
                <div style={{ width: '120px', height: '4px', borderRadius: '2px', background: theme === 'dark' ? '#334155' : '#e2e8f0', margin: '16px auto 0', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '100%',
                    background: theme === 'dark' ? '#60a5fa' : '#3b82f6',
                    borderRadius: '2px',
                    animation: 'shimmerBar 1.2s ease-in-out infinite'
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// PANTALLA: Overlay Bienvenida Chofer / Usuario
// ════════════════════════════════════════════════════════════════
function Toast({ mensaje, tipo }) {
  return (
    <div className={`toast toast-${tipo}`}>
      {mensaje}
    </div>
  );
}


export default App;