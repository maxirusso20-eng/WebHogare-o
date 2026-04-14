import { useState, memo, useEffect, useCallback, useMemo, createContext, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import './index.css';
import { Truck, Package, Plus, MapPin, Map, TrendingUp, AlertCircle, CheckCircle, Grid3x3, Trash2, GripVertical, CalendarDays, MessageCircle, BookOpen, Archive, Download, Clock, ClipboardList, ChevronDown, MessageSquare, Bell } from 'lucide-react';
import { DashboardSabados } from './components/DashboardSabados';
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
import { ModalConfirmacion } from './components/ModalConfirmacion';
import { TarjetaChofer } from './components/TarjetaChofer';
import { PantallaMaps } from './components/PantallaMaps';
import { PantallaLogin } from './components/PantallaLogin';
import { PantallaRoles } from './components/PantallaRoles';
import { PantallaChat } from './components/PantallaChat';
import { PantallaDashboard } from './components/PantallaDashboard';

// ────────────────────────────────────────────────────────────────────────
// CONTEXTO GLOBAL
// ────────────────────────────────────────────────────────────────────────
export const AppContext = createContext();

function App() {
  // ─── ESTADO ───────────────────────────────────────────────
  const [session, setSession] = useState(undefined);
  const [subadmins, setSubadmins] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [colectas, setColectas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [toasts, setToasts] = useState([]);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // ─── APLICAR TEMA AL CARGAR ────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ─── AUTENTICACIÓN ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── SINCRONIZAR CON SUPABASE ─────────────────────────
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        try {
          const { data: subData, error: subError } = await supabase.from('Subadmins').select('*');
          if (!subError && subData) setSubadmins(subData);
        } catch (e) {
          console.warn('Tabla Subadmins no encontrada o sin acceso');
        }

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

    // Forzar el splash un mínimo de 1.5s para que se vea la animación fluida
    const minSplashPromise = new Promise(resolve => setTimeout(resolve, 1500));

    Promise.all([cargarDatos(), minSplashPromise]).then(() => {
      setShowSplash(false);
    });

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

  const isSuperAdmin = session?.user?.email === 'maxirusso20@gmail.com';
  const isAdmin = isSuperAdmin || subadmins.some(s => s.email === session?.user?.email);

  const contextValue = {
    session,
    isAdmin,
    isSuperAdmin,
    subadmins,
    setSubadmins,
    choferes,
    setChoferes,
    colectas,
    setColectas,
    clientes,
    setClientes,
    loading,
    setShowSplash,
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
  };

  // ─── RENDER ───────────────────────────────────────────
  return (
    <AppContext.Provider value={contextValue}>
      {showSplash && (
        <div className="splash-screen">
          <div className="splash-background"></div>
          <div className="splash-content">
            <div className="splash-icon-wrapper">
              <Truck size={64} strokeWidth={1.5} color="#ffffff" className="splash-truck" />
            </div>
            <h1 className="splash-title">Logistica Hogareño</h1>
            <p className="splash-subtitle">SISTEMA DE LOGÍSTICA</p>

            <div className="splash-progress-container">
              <div className="splash-progress-bar"></div>
            </div>
          </div>
        </div>
      )}

      {session === undefined ? null : !session ? (
        <div style={{ display: showSplash ? 'none' : 'block' }}>
          <PantallaLogin />
        </div>
      ) : (
        <AppShell
          theme={theme}
          showSplash={showSplash}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isSidebarMobileOpen={isSidebarMobileOpen}
          setIsSidebarMobileOpen={setIsSidebarMobileOpen}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          session={session}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} />
        ))}
      </div>
    </AppContext.Provider>
  );
}

function AppShell({ theme, showSplash, currentPage, setCurrentPage, isSidebarMobileOpen, setIsSidebarMobileOpen, isAdmin, isSuperAdmin, session, toggleTheme }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const soundRef = useRef(null);

  // Sonido de notificación (Web Audio API — sin archivos externos)
  const playNotifSound = useRef(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { }
  });

  // Cargar conteo inicial de no leídos
  useEffect(() => {
    if (!session?.user) return;
    const cargarUnread = async () => {
      let q = supabase.from('mensajes').select('id', { count: 'exact', head: true });
      if (isAdmin) {
        q = q.eq('admin_id', session.user.email).eq('visto_admin', false).neq('remitente', 'Administración');
      } else {
        q = q.eq('user_id', session.user.id).eq('remitente', 'Administración');
        // solo si tiene columna visto_chofer
        try { q = q.eq('visto_chofer', false); } catch (_) { }
      }
      const { count } = await q;
      setUnreadCount(count || 0);
    };
    cargarUnread();

    // Realtime: nuevo mensaje → sumar al badge y sonar
    const ch = supabase.channel(`unread_badge_${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, ({ new: m }) => {
        const esMio = isAdmin ? m.remitente === 'Administración' : m.remitente !== 'Administración';
        const esDeAdminCorrect = isAdmin ? m.admin_id === session.user.email : m.user_id === session.user.id;
        if (!esMio && esDeAdminCorrect) {
          setUnreadCount(prev => prev + 1);
          // Solo sonar si no estamos en la página de chat
          if (currentPage !== 'chat') playNotifSound.current();
        }
      }).subscribe();

    return () => supabase.removeChannel(ch);
  }, [session, isAdmin]);

  // Resetear badge al entrar al chat
  useEffect(() => {
    if (currentPage === 'chat') setUnreadCount(0);
  }, [currentPage]);

  return (
    <div className={`app theme-${theme}`} style={{ display: showSplash ? 'none' : 'flex' }}>
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
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          unreadCount={unreadCount}
        />
        <main className="main-content" style={{ position: 'relative' }}>
          <div key={currentPage} className="animate-fade-slide" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%' }}>
            {currentPage === 'dashboard' && <PantallaDashboard />}
            {currentPage === 'recorridos' && <PantallaRecorridos />}
            {currentPage === 'choferes' && <PantallaChoferes />}
            {currentPage === 'clientes' && <PantallaClientes />}
            {currentPage === 'historial' && <PantallaHistorial />}
            {currentPage === 'maps' && <PantallaMaps />}
            {currentPage === 'chat' && <PantallaChat />}
            {currentPage === 'roles' && <PantallaRoles />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════


function PantallaRecorridos() {
  const { mostrarToast, theme, choferes, setShowSplash } = useContext(AppContext);
  const [recorridoAEliminar, setRecorridoAEliminar] = useState(null);
  const [confirmDeleteRecorrido, setConfirmDeleteRecorrido] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, titulo: '', mensaje: '', textoConfirmar: '', isDanger: false, accion: null });
  const [selectedZona, setSelectedZona] = useState(null);
  const [tabActiva, setTabActiva] = useState('LUNES A VIERNES');
  const [colectasLocales, setColectasLocales] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(true);

  // Tabla dinámica según la pestaña activa
  const tablaActual = tabActiva === 'SÁBADOS' ? 'recorridos_sabados' : 'Recorridos';

  // Fetch dinámico al cambiar de tab
  useEffect(() => {
    const fetchRecorridos = async () => {
      setLoadingLocal(true);
      try {
        const { data, error } = await supabase
          .from(tablaActual)
          .select('*')
          .order('id', { ascending: true });
        if (error) throw error;
        setColectasLocales(data || []);
      } catch (err) {
        console.error('Error cargando recorridos:', err);
        mostrarToast('❌ Error al cargar recorridos', 'error');
      } finally {
        setLoadingLocal(false);
      }
    };

    // Carga inicial
    fetchRecorridos();

    // Suscripción Realtime — escucha INSERT, UPDATE, DELETE en la tabla activa
    const canal = supabase
      .channel(`realtime:${tablaActual}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tablaActual },
        (payload) => {
          // Re-fetch completo para mantener orden correcto desde BD
          fetchRecorridos();
        }
      )
      .subscribe();

    // Cleanup: remover canal al cambiar de pestaña o desmontar
    return () => {
      supabase.removeChannel(canal);
    };
  }, [tabActiva, tablaActual]);

  // FUNCIÓN PARA OBTENER NOMBRE DEL CHOFER POR ID
  const obtenerNombreChofer = useCallback((idChofer) => {
    if (!idChofer) return '—';
    const chofer = choferes.find(c => c.id === idChofer);
    return chofer ? chofer.nombre : 'No encontrado';
  }, [choferes]);

  // COLORES SEGÚN TEMA
  const colors = useMemo(() => ({
    backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
    cardBg: theme === 'light' ? '#ffffff' : '#1e293b',
    headerBg: theme === 'light' ? '#f1f5f9' : '#0f172a',
    textPrimary: theme === 'light' ? '#1e293b' : '#f8fafc',
    textSecondary: theme === 'light' ? '#64748b' : '#cbd5e1',
    border: theme === 'light' ? '#e2e8f0' : '#334155',
    borderLight: theme === 'light' ? '#cbd5e1' : '#475569',
    rowAlt: theme === 'light' ? '#f9fafb' : '#141e2e',
    rowHover: theme === 'light' ? '#f0f4f8' : '#263447',
    inputBg: theme === 'light' ? '#f8fafc' : '#0f172a',
    inputFocusBg: theme === 'light' ? '#ffffff' : '#1a2540'
  }), [theme]);

  // DND SENSORS
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event, zona) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // FASE 1: Actualizar estado local de forma síncrona e instantánea
    let reordenado = [];
    setColectasLocales(prev => {
      const zonasItems = prev.filter(c => c.zona === zona);
      const otherItems = prev.filter(c => c.zona !== zona);
      const oldIndex = zonasItems.findIndex(c => c.id === active.id);
      const newIndex = zonasItems.findIndex(c => c.id === over.id);
      reordenado = arrayMove(zonasItems, oldIndex, newIndex);
      return [...otherItems, ...reordenado];
    });

    // FASE 2: Persistir el nuevo orden en Supabase en background con Promise.all
    Promise.all(
      reordenado.map((item, idx) =>
        supabase.from(tablaActual).update({ orden: idx }).eq('id', item.id)
      )
    ).catch(err => console.error('Error al guardar orden en Supabase:', err));
  };

  // 1. ABRIR MODAL PARA AGREGAR FILA
  const abrirModal = (nombreZona) => {
    setSelectedZona(nombreZona);
    setIsModalOpen(true);
  };

  // 2. CONFIRMAR Y GUARDAR LA NUEVA LOCALIDAD
  const confirmarAgregarLocalidad = async (localidad) => {
    if (!selectedZona || !localidad) return;

    try {
      const nuevaRuta = {
        localidad: localidad.trim(),
        zona: selectedZona,
        idChofer: 0,
        pqteDia: 0,
        porFuera: 0,
        entregados: 0
      };

      console.log('📤 Intentando insertar nueva ruta:', nuevaRuta);

      const { data, error, status } = await supabase
        .from(tablaActual)
        .insert([nuevaRuta])
        .select();

      if (error) {
        const mensajeError = error.message || 'Error desconocido';
        const detalles = error.details ? `\n${error.details}` : '';
        console.error('❌ Error detallado en Supabase:', { mensaje: mensajeError, codigo: error.code, detalles: error.details, hint: error.hint, payload: nuevaRuta });
        mostrarToast(`❌ ${mensajeError}${detalles}`, 'error');
        throw error;
      }

      if (data && data[0]) {
        console.log('✅ Inserción exitosa (status: ' + status + '):', data);
        setColectasLocales(prev => [...prev, data[0]]);
        mostrarToast(`✅ ${localidad} agregada correctamente a ${selectedZona}`, 'success');
        setIsModalOpen(false);
        setSelectedZona(null);
      }
    } catch (err) {
      console.error('💥 Error completo:', err);
      mostrarToast(`❌ Error: ${err.message || 'No se pudo agregar la localidad'}`, 'error');
    }
  };

  // 3. FUNCIÓN PARA GUARDAR CAMBIOS AUTOMÁTICAMENTE (apunta a tablaActual)
  const guardarCambioBD = async (id, campo, valor) => {
    const num = parseInt(valor) || 0;
    setColectasLocales(prev => prev.map(item =>
      item.id === id ? { ...item, [campo]: num } : item
    ));
    // entregadosFuera también se persiste como campo numérico
    const { error } = await supabase
      .from(tablaActual)
      .update({ [campo]: num })
      .eq('id', id);
    if (error) console.error('Error al sincronizar:', error.message);
  };

  // 4. FUNCIÓN PARA GUARDAR LOCALIDAD EDITADA INLINE (apunta a tablaActual)
  const guardarLocalidad = async (id, nuevoValor) => {
    if (!nuevoValor || !nuevoValor.trim()) return;
    const valorLimpio = nuevoValor.trim().toUpperCase();
    setColectasLocales(prev => prev.map(item =>
      item.id === id ? { ...item, localidad: valorLimpio } : item
    ));
    const { error } = await supabase
      .from(tablaActual)
      .update({ localidad: valorLimpio })
      .eq('id', id);
    if (error) console.error('Error al actualizar localidad:', error.message);
  };

  // 5. ELIMINAR RECORRIDO DINÁMICO (apunta a tablaActual)
  const eliminarRecorridoLocal = async (id) => {
    try {
      const { error } = await supabase
        .from(tablaActual)
        .delete()
        .eq('id', id);
      if (error) throw error;
      setColectasLocales(prev => prev.filter(c => c.id !== id));
      mostrarToast('✅ Recorrido eliminado', 'success');
    } catch (err) {
      console.error('Error eliminando recorrido:', err);
      mostrarToast('❌ Error al eliminar recorrido', 'error');
    }
  };

  // FUNCIÓN PARA OBTENER COLOR DE PORCENTAJE
  const getPercentageColor = (pct) => {
    const num = parseFloat(pct);
    if (num === 100) return '#10b981';
    if (num >= 80) return '#06b6d4';
    if (num >= 50) return '#f59e0b';
    return '#64748b';
  };

  // FUNCIÓN PARA OBTENER COLOR DE ZONA
  const getZoneColor = (zona) => {
    const colors = {
      'ZONA OESTE': '#3b82f6',
      'ZONA SUR': '#8b5cf6',
      'ZONA NORTE': '#ec4899',
      'CABA': '#06b6d4'
    };
    return colors[zona] || '#64748b';
  };

  const ZONAS = ['ZONA OESTE', 'ZONA SUR', 'ZONA NORTE', 'CABA'];

  const totalPaquetes = colectasLocales.reduce((s, r) => s + (r.pqteDia || 0) + (r.porFuera || 0), 0);
  const totalEntregados = colectasLocales.reduce((s, r) => s + (r.entregados || 0), 0);
  const pctGlobal = totalPaquetes > 0 ? ((totalEntregados / totalPaquetes) * 100).toFixed(1) : '0.0';
  const colorStatsCards = tabActiva === 'SÁBADOS' ? '#f59e0b' : (theme === 'light' ? '#3b82f6' : '#64b5f6');
  const labelTabActiva = tabActiva === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes';
  if (loadingLocal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: colors.textSecondary, backgroundColor: colors.backgroundColor }}>
        <div>⏳ Cargando rutas...</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ padding: '24px 28px', backgroundColor: colors.backgroundColor, minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Grid3x3 size={28} color={theme === 'light' ? '#3b82f6' : '#64b5f6'} strokeWidth={2} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: colors.textPrimary }}>
              Gestión de Rutas y Paquetes
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* GUARDAR EN HISTORIAL */}
            <button
              onClick={async () => {
                setConfirmConfig({
                  isOpen: true,
                  titulo: 'Guardar Historial',
                  mensaje: `¿Guardar el estado actual (${tabActiva}) en el historial y resetear los números?`,
                  textoConfirmar: 'Guardar en Historial',
                  isDanger: false,
                  accion: async () => {
                    try {
                      const fecha = new Date().toISOString().split('T')[0];
                      const snapshot = colectasLocales.map(item => ({
                        fecha,
                        tipo_dia: tabActiva,
                        id_ruta: item.id,
                        zona: item.zona,
                        localidad: item.localidad,
                        id_chofer: item.idChofer || null,
                        pqte_dia: item.pqteDia || 0,
                        por_fuera: item.porFuera || 0,
                        entregados: item.entregados || 0,
                      }));
                      const { error } = await supabase.from('historial_recorridos').insert(snapshot);
                      if (error) throw error;

                      // Resetear todos los números a 0 en BD y estado local
                      const ids = colectasLocales.map(i => i.id);
                      await supabase
                        .from(tablaActual)
                        .update({ pqteDia: 0, porFuera: 0, entregados: 0, entregadosFuera: 0 })
                        .in('id', ids);

                      setColectasLocales(prev => prev.map(item => ({
                        ...item, pqteDia: 0, porFuera: 0, entregados: 0, entregadosFuera: 0,
                      })));

                      mostrarToast(`✅ Historial guardado y números reseteados (${fecha})`, 'success');
                    } catch (err) {
                      console.error(err);
                      mostrarToast(`❌ Error al guardar historial: ${err.message}`, 'error');
                    }
                  }
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-blue-600 active:scale-95 shadow-sm"
              title="Guarda el estado actual en historial y resetea los números a 0"
            >
              <Archive size={15} strokeWidth={2} />
              Guardar en Historial
            </button>

          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `2px solid ${colors.border}` }}>
        {[
          { label: 'LUNES A VIERNES', value: 'LUNES A VIERNES' },
          { label: 'SÁBADOS', value: 'SÁBADOS' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabActiva !== tab.value) {
                setShowSplash(true);
                setTabActiva(tab.value);
                setTimeout(() => setShowSplash(false), 1200);
              }
            }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px 8px 0 0',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '-2px',
              borderBottom: tabActiva === tab.value ? `2px solid var(--brand-blue)` : '2px solid transparent',
              background: tabActiva === tab.value ? 'var(--bg-raised)' : 'transparent',
              color: tabActiva === tab.value ? 'var(--brand-blue)' : 'var(--text-3)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={tabActiva} className="animate-fade-slide">
        {/* ── STATS CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: `Rutas ${labelTabActiva}`, value: colectasLocales.length, icon: '🗺️', color: colorStatsCards },
            { label: 'Total paquetes', value: totalPaquetes, icon: '📦', color: '#3b82f6' },
            { label: 'Entregados', value: totalEntregados, icon: '✅', color: '#10b981' },
            { label: '% Global', value: pctGlobal + '%', icon: '📈', color: getPercentageColor(pctGlobal) },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              backgroundColor: colors.cardBg,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${color}`,
              padding: '18px 20px',
              boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.06)' : '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{icon}</span> {label}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color, lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <>
          {/* ZONAS */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {ZONAS.map(zona => {
              const datosZona = colectasLocales.filter(c => c.zona === zona);
              const zoneColor = getZoneColor(zona);

              return (
                <div
                  key={zona}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '12px',
                    boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
                    overflow: 'visible',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {/* HEADER DE ZONA */}
                  <div
                    style={{
                      background: theme === 'light'
                        ? `linear-gradient(135deg, ${zoneColor}15 0%, ${zoneColor}08 100%)`
                        : `linear-gradient(135deg, ${zoneColor}40 0%, ${zoneColor}20 100%)`,
                      borderBottom: `2px solid ${zoneColor}`,
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <MapPin size={20} color={zoneColor} strokeWidth={2} />
                      <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
                        {zona}
                      </h3>
                      <span style={{
                        backgroundColor: `${zoneColor}${theme === 'light' ? '15' : '30'}`,
                        color: colors.textSecondary,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: `1px solid ${theme === 'light' ? `${zoneColor}30` : `${zoneColor}60`}`
                      }}>
                        {datosZona.length} rutas
                      </span>
                    </div>
                    <button
                      onClick={() => abrirModal(zona)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: `${zoneColor}20`,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.borderLight}`,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 100ms ease, transform 120ms ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${zoneColor}40`;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${zoneColor}20`;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Añadir
                    </button>
                  </div>

                  {/* TABLA */}
                  <div style={{ overflow: 'visible' }}>
                    {datosZona.length > 0 ? (
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                        tableLayout: 'fixed',
                      }}>
                        <colgroup>
                          <col style={{ width: '32px' }} />   {/* drag handle */}
                          <col style={{ width: '68px' }} />   {/* ID RUTA */}
                          <col />                             {/* LOCALIDAD — flexible */}
                          <col style={{ width: '72px' }} />   {/* ID CHOFER */}
                          <col style={{ width: '175px' }} />  {/* NOMBRE CHOFER */}
                          <col style={{ width: '88px' }} />   {/* PQTE DÍA */}
                          <col style={{ width: '88px' }} />   {/* POR FUERA */}
                          <col style={{ width: '88px' }} />   {/* ENTREGADOS */}
                          <col style={{ width: '88px' }} />   {/* ENT. FUERA */}
                          <col style={{ width: '88px' }} />   {/* % DÍA */}
                          <col style={{ width: '40px' }} />   {/* ACCIÓN */}
                        </colgroup>
                        <thead>
                          <tr style={{
                            backgroundColor: colors.headerBg,
                            borderBottom: `1px solid ${colors.border}`
                          }}>
                            <th style={{ padding: '10px 0', width: '36px' }}></th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              ID RUTA
                            </th>
                            <th style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MapPin size={13} color={zoneColor} />
                                Localidad
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              ID CHF
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <Truck size={13} color={zoneColor} />
                                Chofer
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <Package size={13} color={zoneColor} />
                                Pqte Día
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <Plus size={13} color={zoneColor} />
                                Por Fuera
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <CheckCircle size={13} color={zoneColor} />
                                Entregados
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <CheckCircle size={13} color='#f59e0b' />
                                Ent. Fuera
                              </div>
                            </th>
                            <th style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                <TrendingUp size={13} color={zoneColor} />
                                % Día
                              </div>
                            </th>
                            <th style={{ padding: '10px 0', width: '40px' }}></th>
                          </tr>
                        </thead>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, zona)}
                        >
                          <SortableContext
                            items={datosZona.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <tbody>
                              {datosZona.map((item, idx) => {
                                const total = (item.pqteDia || 0) + (item.porFuera || 0);
                                const entregadosTotales = (item.entregados || 0) + (item.entregadosFuera || 0);
                                const porcentaje = total > 0
                                  ? parseFloat(((entregadosTotales / total) * 100).toFixed(1))
                                  : 0;
                                const porcentajeStr = porcentaje + '%';

                                return (
                                  <SortableFilaLocalidad
                                    key={item.id}
                                    item={item}
                                    idx={idx}
                                    colors={colors}
                                    zoneColor={zoneColor}
                                    theme={theme}
                                    choferes={choferes}
                                    guardarCambioBD={guardarCambioBD}
                                    guardarLocalidad={guardarLocalidad}
                                    obtenerNombreChofer={obtenerNombreChofer}
                                    getPercentageColor={getPercentageColor}
                                    porcentajeStr={porcentajeStr}
                                    entregadosFuera={item.entregadosFuera || 0}
                                    onEliminar={() => { setRecorridoAEliminar(item); setConfirmDeleteRecorrido(true); }}
                                  />
                                );
                              })}
                            </tbody>
                          </SortableContext>
                        </DndContext>
                      </table>
                    ) : (
                      /* EMPTY STATE */
                      <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: colors.rowAlt
                      }}>
                        <AlertCircle size={40} color={colors.textSecondary} style={{ margin: '0 auto 12px' }} strokeWidth={1.5} />
                        <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '15px', fontWeight: '500' }}>
                          No hay rutas cargadas para esta zona
                        </p>
                        <p style={{ margin: '0 0 16px 0', color: colors.textSecondary, fontSize: '13px', opacity: '0.7' }}>
                          Crea tu primera ruta haciendo clic en el botón "Añadir" arriba
                        </p>
                        <button
                          onClick={() => abrirModal(zona)}
                          style={{
                            backgroundColor: zoneColor,
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: '0.8'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${zoneColor}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          + Nueva ruta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      </div>

      {/* MODAL PARA AGREGAR LOCALIDAD */}
      <ModalAgregar
        isOpen={isModalOpen}
        zona={selectedZona}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmarAgregarLocalidad}
      />

      {/* MODAL CONFIRMAR ELIMINAR RECORRIDO */}
      <ModalConfirmarEliminar
        isOpen={confirmDeleteRecorrido}
        nombre={recorridoAEliminar?.localidad || 'este recorrido'}
        onConfirm={() => {
          if (recorridoAEliminar) eliminarRecorridoLocal(recorridoAEliminar.id);
          setConfirmDeleteRecorrido(false);
          setRecorridoAEliminar(null);
        }}
        onCancel={() => { setConfirmDeleteRecorrido(false); setRecorridoAEliminar(null); }}
        tema={theme === 'dark' ? 'dark' : 'light'}
      />

      <ModalConfirmacion
        isOpen={confirmConfig.isOpen}
        titulo={confirmConfig.titulo}
        mensaje={confirmConfig.mensaje}
        textoConfirmar={confirmConfig.textoConfirmar}
        isDanger={confirmConfig.isDanger}
        tema={theme}
        onConfirm={() => {
          if (confirmConfig.accion) confirmConfig.accion();
          setConfirmConfig(p => ({ ...p, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}

function PantallaChoferes() {
  const { choferes, mostrarToast, theme } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [choferEditando, setChoferEditando] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [choferAEliminar, setChoferAEliminar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroZona, setFiltroZona] = useState('Todas');
  const [loading, setLoading] = useState(false);

  const choferesFiltrados = useMemo(() => {
    return choferes.filter(chofer => {
      const matchBusqueda = (chofer.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chofer.tel || '').includes(searchTerm) ||
        (chofer.celular || '').includes(searchTerm) ||
        (chofer.choferIdAt || '').includes(searchTerm);
      const matchZona = filtroZona === 'Todas' || (chofer.zona && chofer.zona.includes(filtroZona));
      return matchBusqueda && matchZona;
    });
  }, [choferes, searchTerm, filtroZona]);

  const handleGuardarChofer = useCallback(async (formData) => {
    setLoading(true);
    try {
      if (choferEditando) {
        const { error } = await supabase
          .from('Choferes')
          .update(formData)
          .eq('id', choferEditando.id)
          .select();
        if (error) throw error;
        mostrarToast('✅ Chofer actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('Choferes')
          .insert([formData])
          .select();
        if (error) throw error;
        mostrarToast('✅ Chofer agregado correctamente', 'success');
      }
      setIsModalOpen(false);
      setChoferEditando(null);
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [choferEditando, mostrarToast]);

  const handleEliminarChofer = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      mostrarToast('✅ Chofer eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setChoferAEliminar(null);
    }
  }, [mostrarToast]);

  const handleConfirmDelete = useCallback((chofer) => {
    setChoferAEliminar(chofer);
    setIsConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDeleteConfirm = useCallback(() => {
    if (choferAEliminar) {
      handleEliminarChofer(choferAEliminar.id);
    }
  }, [choferAEliminar, handleEliminarChofer]);

  const handleConfirmDeleteCancel = useCallback(() => {
    setIsConfirmDeleteOpen(false);
    setChoferAEliminar(null);
  }, []);

  const handleAbrirModalNuevo = useCallback(() => {
    setChoferEditando(null);
    setIsModalOpen(true);
  }, []);

  const handleEditarChofer = useCallback((chofer) => {
    setChoferEditando(chofer);
    setIsModalOpen(true);
  }, []);

  const handleCerrarModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setChoferEditando(null);
    }, 300);
  }, []);

  return (
    <div className="w-full min-h-screen" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* Modales renderizados en la raíz para funcionar como fixed overlay */}
      <ModalAgregarChofer
        isOpen={isModalOpen}
        onClose={handleCerrarModal}
        onConfirm={handleGuardarChofer}
        choferEditar={choferEditando}
        tema={theme}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={choferAEliminar?.nombre || 'este chofer'}
        onConfirm={handleConfirmDeleteConfirm}
        onCancel={handleConfirmDeleteCancel}
        tema={theme}
      />

      {/* Contenido principal */}
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                👤 Gestión de Choferes
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                Total: {choferes.length} choferes registrados
              </p>
            </div>
            <button
              onClick={handleAbrirModalNuevo}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={18} strokeWidth={2.5} />
              Agregar Chofer
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="theme-input flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm outline-none"
            />
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="theme-input px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
            >
              <option value="Todas">Todas las zonas</option>
              <option value="ZONA OESTE">ZONA OESTE</option>
              <option value="ZONA SUR">ZONA SUR</option>
              <option value="ZONA NORTE">ZONA NORTE</option>
              <option value="CABA">CABA</option>
            </select>
          </div>
        </div>

        {choferesFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {choferesFiltrados.map(chofer => (
              <TarjetaChofer
                key={chofer.id}
                chofer={chofer}
                onEdit={handleEditarChofer}
                onConfirmDelete={handleConfirmDelete}
                tema={theme}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-5" style={{ color: 'var(--text-3)' }}>
            <AlertCircle size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium">
              {searchTerm || filtroZona !== 'Todas' ? 'No se encontraron choferes con los filtros aplicados' : 'No hay choferes registrados aún'}
            </p>
            {(searchTerm || filtroZona !== 'Todas') && (
              <button
                onClick={() => { setSearchTerm(''); setFiltroZona('Todas'); }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-150"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMBOBOX DE CHOFER — Fila de tabla (autocomplete inline)
// ════════════════════════════════════════════════════════════════
const ChoferComboboxRow = memo(function ChoferComboboxRow({ value, choferes, onChange }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  const filtrados = choferes.filter(c =>
    c.nombre.toLowerCase().includes(inputVal.toLowerCase())
  );

  // Calcular posición fixed cuando se abre el dropdown
  const calcularPosicion = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 190),
      });
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setInputVal(value || '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  // Recalcular posición al hacer scroll o resize
  useEffect(() => {
    if (!open) return;
    const update = () => calcularPosicion();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const seleccionar = (nombre) => {
    onChange(nombre);
    setInputVal(nombre);
    setOpen(false);
  };

  const abrirDropdown = () => {
    calcularPosicion();
    setOpen(true);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={e => { setInputVal(e.target.value); if (!open) abrirDropdown(); }}
        onFocus={() => abrirDropdown()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && filtrados.length > 0) {
              seleccionar(filtrados[0].nombre);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
            setInputVal(value || '');
          } else if (e.key === 'Backspace' && value && inputVal === value) {
            e.preventDefault();
            setInputVal('');
            onChange('');
            abrirDropdown();
          }
        }}
        placeholder="Seleccionar chofer..."
        className="theme-input px-2.5 py-1.5 rounded text-sm outline-none"
        style={{ width: '162px' }}
        autoComplete="off"
      />
      {open && filtrados.length > 0 && createPortal(
        <div style={{
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 99999,
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-strong)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
          maxHeight: '220px',
          overflowY: 'auto',
          animation: 'fadeUp 0.12s ease-out forwards',
        }}>
          {filtrados.map(ch => (
            <button
              key={ch.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); seleccionar(ch.nombre); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                background: value === ch.nombre ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: value === ch.nombre ? 'var(--brand-blue)' : 'var(--text-2)',
                border: 'none', cursor: 'pointer', fontSize: '13px',
                fontWeight: value === ch.nombre ? '600' : '400',
                transition: 'background 0.1s',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={e => { if (value !== ch.nombre) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = value === ch.nombre ? 'rgba(59,130,246,0.1)' : 'transparent'; }}
            >
              {value === ch.nombre && <span style={{ fontSize: '10px', color: 'var(--brand-blue)' }}>✓</span>}
              {ch.nombre}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
});

// ════════════════════════════════════════════════════════════════
// DROPDOWN CUSTOM — Filtro de chofer con buscador (header filtros)
// ════════════════════════════════════════════════════════════════
function ChoferDropdown({ choferes, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtrados = choferes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = value === 'Todos' ? 'Todos los choferes' : value;
  const hasValue = value !== 'Todos';

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '200px' }}>
      <button
        type="button"
        onClick={() => { setIsOpen(o => !o); setSearch(''); }}
        className="theme-input w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          cursor: 'pointer', fontWeight: hasValue ? '600' : '400',
          color: hasValue ? 'var(--brand-blue)' : 'var(--text-2)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-surface)', border: '1.5px solid var(--border-strong)',
          borderRadius: '10px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          animation: 'fadeUp 0.15s ease-out forwards',
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              type="text"
              placeholder="Buscar chofer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="theme-input w-full px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px 4px 8px' }}>
            <button
              type="button"
              onClick={() => { onChange('Todos'); setIsOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '7px',
                background: value === 'Todos' ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: value === 'Todos' ? 'var(--brand-blue)' : 'var(--text-2)',
                border: 'none', cursor: 'pointer', fontSize: '13px',
                fontWeight: value === 'Todos' ? '700' : '500',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {value === 'Todos' && <span style={{ color: 'var(--brand-blue)', fontSize: '11px' }}>✓</span>}
              Todos los choferes
            </button>
            {filtrados.length > 0 && (
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 8px' }} />
            )}
            {filtrados.map(ch => (
              <button
                key={ch.id}
                type="button"
                onClick={() => { onChange(ch.nombre); setIsOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '7px',
                  background: value === ch.nombre ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: value === ch.nombre ? 'var(--brand-blue)' : 'var(--text-2)',
                  border: 'none', cursor: 'pointer', fontSize: '13px',
                  fontWeight: value === ch.nombre ? '700' : '500',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (value !== ch.nombre) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (value !== ch.nombre) e.currentTarget.style.background = 'transparent'; }}
              >
                {value === ch.nombre && <span style={{ color: 'var(--brand-blue)', fontSize: '11px' }}>✓</span>}
                {ch.nombre}
              </button>
            ))}
            {filtrados.length === 0 && (
              <p style={{ padding: '12px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                Sin resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Funciones puras fuera del componente — no se recrean en cada render
function parseHorario(horario) {
  if (!horario) return null;
  const match = horario.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [_, h, m] = match;
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}
function ordenarPorHorario(arr) {
  return [...arr].sort((a, b) => {
    const ha = parseHorario(a.horario);
    const hb = parseHorario(b.horario);
    if (ha === null && hb === null) return 0;
    if (ha === null) return 1;
    if (hb === null) return -1;
    return ha - hb;
  });
}

function PantallaClientes() {

  const { clientes, setClientes, mostrarToast, choferes, theme, setShowSplash } = useContext(AppContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, titulo: '', mensaje: '', textoConfirmar: '', isDanger: false, accion: null });
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState('SEMANA'); // 'SEMANA' o 'SÁBADOS'
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [filtroChofer, setFiltroChofer] = useState('Todos');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  // llegadas: { [clienteId]: 'HH:MM' | null }
  const [llegadas, setLlegadas] = useState({});

  // Tabs config
  const tabs = [
    { label: 'LUNES A VIERNES', value: 'SEMANA' },
    { label: 'SÁBADOS', value: 'SÁBADOS' }
  ];

  // Filtro ultra-flexible para tipo_dia + chofer + búsqueda
  const clientesFiltrados = useMemo(() => {
    return ordenarPorHorario(
      clientes.filter(c => {
        const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
        const matchTipo = tabActiva === 'SÁBADOS'
          ? tipo === 'SÁBADOS'
          : (tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null);
        const matchChofer = filtroChofer === 'Todos' || (c.chofer || '') === filtroChofer;
        const q = busquedaCliente.toLowerCase();
        const matchBusqueda = !busquedaCliente ||
          (c.cliente || '').toLowerCase().includes(q) ||
          (c.direccion || '').toLowerCase().includes(q) ||
          (c.chofer || '').toLowerCase().includes(q);
        return matchTipo && matchChofer && matchBusqueda;
      })
    );
  }, [clientes, tabActiva, filtroChofer, busquedaCliente]);

  const handleGuardarCliente = async (formData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Clientes')
        .insert([formData])
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');

      if (error) throw error;

      setClientes(prev => [data[0], ...prev]);
      setIsModalOpen(false);
      mostrarToast('✅ Cliente agregado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeChofer = async (clienteId, nuevoChofer) => {
    try {
      // Busco al chofer en el estado local para obtener su email
      const choferEncontrado = choferes.find(c => c.nombre === nuevoChofer);
      const emailParaGuardar = choferEncontrado?.email || null;

      const { data, error } = await supabase
        .from('Clientes')
        .update({
          chofer: nuevoChofer || null,
          email_chofer: emailParaGuardar, // null si no tiene email o si es "Sin asignar"
        })
        .eq('id', clienteId)
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');

      if (error) throw error;

      setClientes(prev =>
        prev.map(c => c.id === clienteId ? data[0] : c)
      );
      mostrarToast('✅ Chofer actualizado', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error al actualizar: ${err.message}`, 'error');
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

  const enviarWhatsApp = (nombreChofer, telefonoChofer) => {
    if (!telefonoChofer || !nombreChofer) {
      mostrarToast('❌ Chofer sin celular registrado', 'error');
      return;
    }

    // Filtrar usar estado global 'clientes' por tipo_dia y chofer
    const clientesChofer = clientes.filter(c => {
      const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
      const matchTipo = tabActiva === 'SÁBADOS'
        ? tipo === 'SÁBADOS'
        : (tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null);

      return matchTipo && c.chofer === nombreChofer;
    });

    if (clientesChofer.length === 0) {
      mostrarToast('❌ No hay colectas asignadas para este chofer', 'error');
      return;
    }

    const ordenados = ordenarPorHorario(clientesChofer);

    let mensaje = '';
    if (tabActiva === 'SÁBADOS') {
      mensaje += 'Buenas tardes! Cómo estás? Espero que muy bien.\nTe dejo asignadas las colectas para el sábado!\n\n';
    } else {
      mensaje += 'Buenos días! Cómo estás? Espero que muy bien.\nTe dejo asignadas las colectas del día de hoy!\n\n';
    }

    ordenados.forEach(c => {
      const clienteStr = c.cliente || 'CLIENTE';
      const horarioStr = c.horario || '';
      const direStr = c.direccion || '';
      mensaje += `${clienteStr} ${horarioStr}\n${direStr}\n\n`;
    });

    // Limpiar celular por las dudas (solo numeros)
    const telLimpio = telefonoChofer.replace(/\D/g, '');
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje.trim())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full min-h-screen p-6" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* MODALES */}
      <ModalAgregarCliente
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleGuardarCliente}
        choferes={choferes}
        tabActiva={tabActiva}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={itemAEliminar?.cliente || 'este cliente'}
        onConfirm={handleEliminarClienteConfirm}
        onCancel={handleEliminarClienteCancel}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>🏢 Gestión de Clientes</h1>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const conLlegada = clientesFiltrados.filter(c => llegadas[c.id]);
              if (conLlegada.length === 0) {
                mostrarToast('⚠️ No hay llegadas marcadas para guardar', 'warning');
                return;
              }
              setConfirmConfig({
                isOpen: true,
                titulo: 'Guardar Historial',
                mensaje: `¿Guardar ${conLlegada.length} llegada(s) en el historial?`,
                textoConfirmar: 'Guardar en Historial',
                isDanger: false,
                accion: async () => {
                  try {
                    const fecha = new Date().toISOString().split('T')[0];
                    const rows = conLlegada.map(c => ({
                      fecha,
                      tipo_dia: tabActiva,
                      cliente_id: c.id,
                      cliente_nombre: c.cliente,
                      chofer: c.chofer || null,
                      horario_programado: c.horario || null,
                      hora_llegada: llegadas[c.id],
                      direccion: c.direccion || null,
                    }));
                    const { error } = await supabase.from('historial_clientes').insert(rows);
                    if (error) throw error;
                    mostrarToast(`✅ ${conLlegada.length} llegada(s) guardadas en historial`, 'success');
                  } catch (err) {
                    mostrarToast(`❌ Error: ${err.message}`, 'error');
                  }
                }
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-blue-600 active:scale-95 shadow-sm"
            title="Guardar llegadas del día en el historial"
          >
            <Archive size={15} strokeWidth={2} />
            Guardar en Historial
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-blue-600 active:scale-95"
          >
            <Plus size={18} />
            Agregar Cliente
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Buscar por cliente, dirección o chofer..."
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          className="theme-input flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
        />
        <ChoferDropdown
          choferes={choferes}
          value={filtroChofer}
          onChange={setFiltroChofer}
        />
        {(filtroChofer !== 'Todos' || busquedaCliente) && (
          <button
            onClick={() => { setFiltroChofer('Todos'); setBusquedaCliente(''); }}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-80"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabActiva !== tab.value) {
                setShowSplash(true);
                setTabActiva(tab.value);
                setTimeout(() => setShowSplash(false), 1200);
              }
            }}
            className="px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-100 border-b-2 focus:outline-none"
            style={tabActiva === tab.value
              ? { background: 'var(--bg-raised)', borderColor: 'var(--brand-blue)', color: 'var(--brand-blue)' }
              : { background: 'var(--bg-hover)', borderColor: 'transparent', color: 'var(--text-3)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLA DINÁMICA CON ANIMACIÓN POR TABS */}
      <div key={tabActiva} className="animate-fade-slide card w-full overflow-hidden" style={{ background: 'var(--bg-surface)', padding: 0 }}>
        <div className="overflow-x-auto">
          {clientesFiltrados.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>CLIENTE</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>CHOFER</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>CELULAR</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>HORARIO</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>DIRECCIÓN</th>
                  <th className="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>LLEGADA</th>
                  <th className="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest text-[#a1a1aa] dark:text-[#a1a1aa]" style={{ letterSpacing: '1.2px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, idx) => (
                  <tr
                    key={cliente.id || idx}
                    className="table-row-animated group"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-6 py-4 text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>{cliente.cliente || 'N/A'}</td>
                    <td className="px-6 py-4 text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>
                      <ChoferComboboxRow
                        value={cliente.chofer || ''}
                        choferes={choferes}
                        onChange={(nombre) => handleChangeChofer(cliente.id, nombre)}
                      />
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium" style={{ color: 'var(--text-3)' }}>{cliente.Choferes?.celular || 'Sin celular'}</td>
                    <td className="px-6 py-4 text-[13px] font-bold" style={{ color: 'var(--brand-blue)' }}>{cliente.horario || 'N/A'}</td>
                    <td className="px-6 py-4 text-[13px] max-w-[250px] truncate font-medium" style={{ color: 'var(--text-2)' }} title={cliente.direccion}>{cliente.direccion || 'N/A'}</td>
                    {/* LLEGADA */}
                    <td className="px-4 py-4 text-sm text-center">
                      {llegadas[cliente.id] ? (
                        <span
                          onClick={() => setLlegadas(prev => { const n = { ...prev }; delete n[cliente.id]; return n; })}
                          title="Click para quitar"
                          className="badge badge-success cursor-pointer shadow-sm hover:scale-105 hover:badge-danger transition-all mx-auto"
                        >
                          <Clock size={12} strokeWidth={2.5} />
                          {llegadas[cliente.id]}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const ahora = new Date();
                            const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                            setLlegadas(prev => ({ ...prev, [cliente.id]: hora }));
                          }}
                          title="Marcar hora de llegada"
                          className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-[#a1a1aa] flex items-center justify-center transition-all duration-200 hover:border-[#10b981] hover:bg-[#10b98120] hover:text-[#10b981] mx-auto text-[var(--text-3)]"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex justify-center items-center gap-4">
                        {cliente.chofer && cliente.Choferes?.celular && (
                          <button
                            onClick={() => enviarWhatsApp(cliente.chofer, cliente.Choferes.celular)}
                            className="text-[#10b981] opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-200"
                            title="Enviar resumen de colectas por WhatsApp"
                          >
                            <MessageCircle size={18} strokeWidth={2.2} />
                          </button>
                        )}
                        <button
                          onClick={() => { setItemAEliminar(cliente); setIsConfirmDeleteOpen(true); }}
                          className="text-[#ef4444] opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-200"
                          title="Eliminar cliente"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '60px 40px' }}>
              <div className="empty-icon text-[var(--brand-blue)]">
                <Package size={54} strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>Padrón de clientes vacío</p>
              <p className="text-sm mb-6 max-w-sm text-center opacity-80" style={{ color: 'var(--text-3)' }}>Registrá a tus clientes con sus horarios habituales para integrarlos a las hojas de ruta y planillas de sábados.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary shadow-blue"
              >
                <Plus size={18} />
                Agregar tu primer cliente
              </button>
            </div>
          )}
        </div>
      </div>

      <ModalConfirmacion
        isOpen={confirmConfig.isOpen}
        titulo={confirmConfig.titulo}
        mensaje={confirmConfig.mensaje}
        textoConfirmar={confirmConfig.textoConfirmar}
        isDanger={confirmConfig.isDanger}
        tema={theme}
        onConfirm={() => {
          if (confirmConfig.accion) confirmConfig.accion();
          setConfirmConfig(p => ({ ...p, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}

function Toast({ mensaje, tipo }) {
  return (
    <div className={`toast toast-${tipo}`}>
      {mensaje}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════
// COMPONENTE: Celda de Localidad con Inline Editing
// ════════════════════════════════════════════════════════════════
function CeldaLocalidadEditable({ item, colors, zoneColor, onSave }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.localidad);
  const inputRef = useRef(null);

  useEffect(() => {
    setValor(item.localidad);
  }, [item.localidad]);

  const confirmar = () => {
    setEditando(false);
    const limpio = valor.trim();
    if (limpio && limpio !== item.localidad) {
      onSave(limpio);
    } else {
      setValor(item.localidad);
    }
  };

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={valor}
        autoFocus
        onChange={(e) => setValor(e.target.value.toUpperCase())}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.target.blur(); }
          if (e.key === 'Escape') { setValor(item.localidad); setEditando(false); }
          if (e.key === 'Backspace' && valor === item.localidad) {
            e.preventDefault();
            setValor('');
          }
        }}
        style={{
          width: '100%',
          padding: '4px 8px',
          borderRadius: '6px',
          border: `2px solid ${zoneColor}`,
          backgroundColor: colors.inputFocusBg,
          color: colors.textPrimary,
          fontSize: '13px',
          fontWeight: '600',
          outline: 'none',
          boxShadow: `0 0 0 3px ${zoneColor}25`,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditando(true)}
      title="Clic para editar la localidad"
      style={{
        cursor: 'text',
        color: colors.textPrimary,
        fontWeight: '500',
        borderBottom: `1px dashed ${zoneColor}80`,
        paddingBottom: '1px',
        transition: 'all 0.15s ease',
        display: 'inline-block',
      }}
      onMouseEnter={(e) => {
        e.target.style.borderBottomColor = zoneColor;
        e.target.style.color = zoneColor;
      }}
      onMouseLeave={(e) => {
        e.target.style.borderBottomColor = `${zoneColor}80`;
        e.target.style.color = colors.textPrimary;
      }}
    >
      {item.localidad}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE: Fila Sortable para Drag & Drop
// ════════════════════════════════════════════════════════════════
function SortableFilaLocalidad({
  item, idx, colors, zoneColor, theme,
  choferes, guardarCambioBD, guardarLocalidad,
  obtenerNombreChofer, getPercentageColor, porcentajeStr,
  entregadosFuera, onEliminar
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: isDragging
      ? (theme === 'light' ? '#dbeafe' : '#1e3a5f')
      : (idx % 2 === 0 ? colors.cardBg : colors.rowAlt),
    boxShadow: isDragging
      ? `0 8px 24px rgba(0,0,0,0.18), 0 0 0 2px ${zoneColor}`
      : 'none',
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative',
    willChange: 'transform',
  };

  const inputStyle = {
    padding: '6px 8px',
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '6px',
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: '13px',
    fontWeight: '500',
    outline: 'none',
    textAlign: 'center',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* HANDLE DE DRAG */}
      <td style={{ padding: '10px 0', textAlign: 'center', width: '36px' }}>
        <span
          {...attributes}
          {...listeners}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'grab',
            color: colors.textSecondary,
            opacity: 0.5,
            touchAction: 'none',
          }}
          title="Arrastrá para reordenar"
        >
          <GripVertical size={14} />
        </span>
      </td>

      {/* ID VISIBLE (Ruta) */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '32px',
          height: '22px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace',
          backgroundColor: `${zoneColor}20`,
          color: zoneColor,
          border: `1px solid ${zoneColor}40`,
          padding: '0 4px',
        }}>
          {item.id}
        </span>
      </td>

      {/* LOCALIDAD EDITABLE */}
      <td style={{ padding: '10px 12px', fontWeight: '500', color: colors.textPrimary }}>
        <CeldaLocalidadEditable
          item={item}
          colors={colors}
          zoneColor={zoneColor}
          onSave={(nuevoValor) => guardarLocalidad(item.id, nuevoValor)}
        />
      </td>

      {/* ID CHOFER — AHORA PROTEGIDO (INFO SENSIBLE) */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <div style={{
          padding: '6px 10px',
          backgroundColor: colors.rowAlt,
          color: colors.textSecondary,
          fontSize: '12px',
          fontWeight: '700',
          borderRadius: '6px',
          border: `1px solid ${colors.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '40px',
          opacity: 0.9,
          letterSpacing: '0.5px'
        }} title="ID del Chofer (Info Sensible - No editable manualmente)">
          {item.idChofer || '—'}
        </div>
      </td>

      {/* NOMBRE CHOFER CON AUTOCOMPLETE */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <ChoferComboboxRow
          value={obtenerNombreChofer(item.idChofer) === '—' ? '' : obtenerNombreChofer(item.idChofer)}
          choferes={choferes}
          onChange={(nombre) => {
            const ch = choferes.find(c => c.nombre === nombre);
            guardarCambioBD(item.id, 'idChofer', ch ? ch.id : 0);
          }}
        />
      </td>

      {/* PQTE DÍA */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.pqteDia || ''}
          onChange={(e) => guardarCambioBD(item.id, 'pqteDia', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.pqteDia && String(e.target.value) === String(item.pqteDia)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'pqteDia', 0);
            }
          }}
          style={{ ...inputStyle, width: '62px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* POR FUERA */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.porFuera || ''}
          onChange={(e) => guardarCambioBD(item.id, 'porFuera', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.porFuera && String(e.target.value) === String(item.porFuera)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'porFuera', 0);
            }
          }}
          style={{ ...inputStyle, width: '62px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* ENTREGADOS */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.entregados || ''}
          onChange={(e) => guardarCambioBD(item.id, 'entregados', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.entregados && String(e.target.value) === String(item.entregados)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'entregados', 0);
            }
          }}
          style={{ ...inputStyle, width: '62px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* ENTREGADOS POR FUERA — input editable, sumado al % */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <input
          type="number"
          value={entregadosFuera || ''}
          onChange={(e) => guardarCambioBD(item.id, 'entregadosFuera', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && entregadosFuera && String(e.target.value) === String(entregadosFuera)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'entregadosFuera', 0);
            }
          }}
          style={{ padding: '6px 8px', border: `1px solid ${colors.borderLight}`, borderRadius: '6px', backgroundColor: colors.inputBg, color: '#f59e0b', fontSize: '13px', fontWeight: '600', outline: 'none', textAlign: 'center', width: '62px' }}
          onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)'; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* % DÍA — ahora incluye entregados + entregadosFuera */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        {(() => {
          const total = (item.pqteDia || 0) + (item.porFuera || 0);
          const entTotales = (item.entregados || 0) + (entregadosFuera || 0);
          const pct = total > 0 ? parseFloat((entTotales / total * 100).toFixed(1)) : 0;
          const color = pct >= 100 ? '#10b981' : pct >= 80 ? '#06b6d4' : pct >= 50 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#64748b';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color, fontVariantNumeric: 'tabular-nums' }}>
                {total > 0 ? pct + '%' : '—'}
              </span>
              {total > 0 && (
                <div style={{ width: '50px', height: '4px', borderRadius: '2px', backgroundColor: `${color}25`, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              )}
              {(entregadosFuera || 0) > 0 && (
                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>
                  +{entregadosFuera} fuera
                </span>
              )}
            </div>
          );
        })()}
      </td>

      {/* ELIMINAR */}
      <td style={{ padding: '10px 0', textAlign: 'center', width: '40px' }}>
        <button
          onClick={onEliminar}
          title="Eliminar recorrido"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ef444480',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            padding: '4px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#ef444415'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#ef444480'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════
// PANTALLA: Historial Rec & Col
// ════════════════════════════════════════════════════════════════
function PantallaHistorial() {
  const { theme, choferes, setShowSplash } = useContext(AppContext);
  const [tabActiva, setTabActiva] = useState('recorridos');
  const [histRecorridos, setHistRecorridos] = useState([]);
  const [histClientes, setHistClientes] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, titulo: '', mensaje: '', textoConfirmar: '', isDanger: false, accion: null });
  const [filtroDia, setFiltroDia] = useState('TODOS');
  const [filtroFecha, setFiltroFecha] = useState('');

  const bg = theme === 'light' ? '#f8fafc' : '#020617';
  const cardBg = theme === 'light' ? '#ffffff' : '#1e293b';
  const border = theme === 'light' ? '#e2e8f0' : '#334155';
  const textPrimary = theme === 'light' ? '#1e293b' : '#f8fafc';
  const textSecondary = theme === 'light' ? '#64748b' : '#94a3b8';
  const headerBg = theme === 'light' ? '#f1f5f9' : '#0f172a';

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoadingHist(true);
      try {
        const [{ data: rec }, { data: cli }] = await Promise.all([
          supabase.from('historial_recorridos').select('*').order('fecha', { ascending: false }).order('zona').order('id_ruta'),
          supabase.from('historial_clientes').select('*').order('fecha', { ascending: false }).order('hora_llegada'),
        ]);
        setHistRecorridos(rec || []);
        setHistClientes(cli || []);
      } catch (err) {
        console.error('Error cargando historial:', err);
      } finally {
        setLoadingHist(false);
      }
    };
    fetchHistorial();
  }, []);

  // Agrupar recorridos por fecha
  const recAgrupadosPorFecha = useMemo(() => {
    let datos = histRecorridos;
    if (filtroDia !== 'TODOS') datos = datos.filter(r => r.tipo_dia === filtroDia);
    if (filtroFecha) datos = datos.filter(r => r.fecha === filtroFecha);
    const grupos = {};
    datos.forEach(r => {
      const key = `${r.fecha}__${r.tipo_dia}`;
      if (!grupos[key]) grupos[key] = { fecha: r.fecha, tipo_dia: r.tipo_dia, items: [] };
      grupos[key].items.push(r);
    });
    return Object.values(grupos).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [histRecorridos, filtroDia, filtroFecha]);

  // Agrupar clientes por fecha
  const cliAgrupadosPorFecha = useMemo(() => {
    let datos = histClientes;
    if (filtroDia !== 'TODOS') datos = datos.filter(r => r.tipo_dia === filtroDia);
    if (filtroFecha) datos = datos.filter(r => r.fecha === filtroFecha);
    const grupos = {};
    datos.forEach(r => {
      const key = `${r.fecha}__${r.tipo_dia}`;
      if (!grupos[key]) grupos[key] = { fecha: r.fecha, tipo_dia: r.tipo_dia, items: [] };
      grupos[key].items.push(r);
    });
    return Object.values(grupos).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [histClientes, filtroDia, filtroFecha]);

  const formatFecha = (f) => {
    if (!f) return '';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  };

  const getPctColor = (pct) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 80) return '#06b6d4';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // ── Generador de PDF (simple, via print CSS) ──
  const exportarPDF = (grupo) => {
    const w = window.open('', '_blank');
    const tipoLabel = grupo.tipo_dia === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes';
    const rows = grupo.items.map(r => {
      const total = (r.pqte_dia || 0) + (r.por_fuera || 0);
      const pct = total > 0 ? ((r.entregados / total) * 100).toFixed(1) : '0.0';
      return `<tr>
        <td>${r.id_ruta}</td><td>${r.zona}</td><td>${r.localidad}</td>
        <td>${r.id_chofer || '—'}</td><td>${r.pqte_dia || 0}</td>
        <td>${r.por_fuera || 0}</td><td>${r.entregados || 0}</td>
        <td><b>${pct}%</b></td>
      </tr>`;
    }).join('');
    const totalPqtes = grupo.items.reduce((s, r) => s + (r.pqte_dia || 0) + (r.por_fuera || 0), 0);
    const totalEnt = grupo.items.reduce((s, r) => s + (r.entregados || 0), 0);
    const pctGlobal = totalPqtes > 0 ? ((totalEnt / totalPqtes) * 100).toFixed(1) : '0.0';
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Historial ${formatFecha(grupo.fecha)} - ${tipoLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 11px; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f9fafb; }
      .footer { margin-top: 16px; font-size: 12px; color: #64748b; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>📦 Historial de Recorridos</h1>
    <p>${tipoLabel} — ${formatFecha(grupo.fecha)} | Total: ${totalEnt}/${totalPqtes} pqtes (${pctGlobal}%)</p>
    <table>
      <thead><tr><th>ID</th><th>Zona</th><th>Localidad</th><th>ID CHF</th><th>Pqte Día</th><th>Por Fuera</th><th>Entregados</th><th>% Día</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Generado el ${new Date().toLocaleString('es-AR')}</div>
    <br/><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </body></html>`);
    w.document.close();
  };

  const exportarPDFClientes = (grupo) => {
    const w = window.open('', '_blank');
    const tipoLabel = grupo.tipo_dia === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes';
    const rows = grupo.items.map(r => `<tr>
      <td>${r.cliente_nombre}</td><td>${r.chofer || '—'}</td>
      <td>${r.horario_programado || '—'}</td><td><b>${r.hora_llegada}</b></td>
      <td>${r.direccion || '—'}</td>
    </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Historial Clientes ${formatFecha(grupo.fecha)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 11px; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f9fafb; }
      .footer { margin-top: 16px; font-size: 12px; color: #64748b; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>🕐 Historial de Llegadas de Clientes</h1>
    <p>${tipoLabel} — ${formatFecha(grupo.fecha)} | ${grupo.items.length} registros</p>
    <table>
      <thead><tr><th>Cliente</th><th>Chofer</th><th>Horario Programado</th><th>Hora Llegada</th><th>Dirección</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Generado el ${new Date().toLocaleString('es-AR')}</div>
    <br/><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </body></html>`);
    w.document.close();
  };

  return (
    <div style={{ padding: '24px', backgroundColor: bg, minHeight: '100vh' }}>
      {/* TÍTULO */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={28} color={theme === 'light' ? '#8b5cf6' : '#a78bfa'} strokeWidth={2} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: textPrimary }}>
              Historial Rec & Col
            </h1>
          </div>
          {/* BORRAR HISTORIAL */}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-red-600 active:scale-95 shadow-sm"
            onClick={async () => {
              setConfirmConfig({
                isOpen: true,
                titulo: 'Borrar Historial',
                mensaje: '⚠️ ¿Borrar TODO el historial? Esta acción no se puede deshacer.',
                textoConfirmar: 'Borrar Historial',
                isDanger: true,
                accion: async () => {
                  try {
                    const [{ error: e1 }, { error: e2 }] = await Promise.all([
                      supabase.from('historial_recorridos').delete().neq('id', 0),
                      supabase.from('historial_clientes').delete().neq('id', 0),
                    ]);
                    if (e1) throw e1;
                    if (e2) throw e2;
                    setHistRecorridos([]);
                    setHistClientes([]);
                    mostrarToast('🗑️ Historial completo borrado', 'success');
                  } catch (err) {
                    mostrarToast(`❌ Error: ${err.message}`, 'error');
                  }
                }
              });
            }}
            title="Borrar todo el historial"
          >
            <Trash2 size={15} strokeWidth={2} />
            Borrar Historial
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: textSecondary }}>
          Registro histórico diario de recorridos y llegadas de clientes
        </p>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="flex gap-2 mb-6">
        {[
          { label: '📦 Recorridos', value: 'recorridos' },
          { label: '🕐 Clientes', value: 'clientes' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabActiva !== tab.value) {
                setShowSplash(true);
                setTabActiva(tab.value);
                setTimeout(() => setShowSplash(false), 1200);
              }
            }}
            className="px-5 py-2.5 rounded-t-lg font-semibold text-sm transition-all duration-100 border-b-2 focus:outline-none"
            style={tabActiva === tab.value
              ? { background: cardBg, borderColor: '#8b5cf6', color: '#8b5cf6', borderBottom: '2px solid #8b5cf6' }
              : { background: headerBg, borderColor: 'transparent', color: textSecondary }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={filtroDia}
          onChange={e => {
            if (filtroDia !== e.target.value) {
              setShowSplash(true);
              setFiltroDia(e.target.value);
              setTimeout(() => setShowSplash(false), 1200);
            }
          }}
          style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: cardBg, color: textPrimary, fontSize: '13px', cursor: 'pointer', outline: 'none' }}
        >
          <option value="TODOS">Todos los días</option>
          <option value="LUNES A VIERNES">Lunes a Viernes</option>
          <option value="SEMANA">Semana (Clientes)</option>
          <option value="SÁBADOS">Sábados</option>
        </select>
        <input
          type="date"
          value={filtroFecha}
          onChange={e => setFiltroFecha(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: cardBg, color: textPrimary, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
        />
        {filtroFecha && (
          <button
            onClick={() => setFiltroFecha('')}
            style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: cardBg, color: textSecondary, fontSize: '13px', cursor: 'pointer' }}
          >
            ✕ Limpiar fecha
          </button>
        )}
      </div>

      {loadingHist ? (
        <div style={{ textAlign: 'center', padding: '60px', color: textSecondary }}>⏳ Cargando historial...</div>
      ) : (
        <div key={`${tabActiva}-${filtroDia}`} className="animate-fade-slide">
          {tabActiva === 'recorridos' ? (
            /* ── TAB RECORRIDOS ── */
            recAgrupadosPorFecha.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: textSecondary }}>
                <Archive size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '16px', fontWeight: '500', color: textPrimary }}>No hay historial de recorridos aún</p>
                <p style={{ fontSize: '13px' }}>Guardá las tablas del día desde la pantalla de Recorridos</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {recAgrupadosPorFecha.map(grupo => {
                  const key = `${grupo.fecha}__${grupo.tipo_dia}`;
                  const totalPqtes = grupo.items.reduce((s, r) => s + (r.pqte_dia || 0) + (r.por_fuera || 0), 0);
                  const totalEnt = grupo.items.reduce((s, r) => s + (r.entregados || 0), 0);
                  const pctGlobal = totalPqtes > 0 ? ((totalEnt / totalPqtes) * 100).toFixed(1) : 0;
                  const tipoLabel = grupo.tipo_dia === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes';

                  return (
                    <div key={key} style={{ backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden', boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.07)' : '0 4px 12px rgba(0,0,0,0.25)' }}>
                      {/* CABECERA DEL BLOQUE */}
                      <div style={{ padding: '14px 20px', background: theme === 'light' ? '#f8fafc' : '#0f172a', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CalendarDays size={18} color="#8b5cf6" />
                          <span style={{ fontWeight: '700', fontSize: '15px', color: textPrimary }}>{formatFecha(grupo.fecha)}</span>
                          <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: grupo.tipo_dia === 'SÁBADOS' ? '#06b6d420' : '#f59e0b20', color: grupo.tipo_dia === 'SÁBADOS' ? '#06b6d4' : '#f59e0b', fontWeight: '600', border: `1px solid ${grupo.tipo_dia === 'SÁBADOS' ? '#06b6d440' : '#f59e0b40'}` }}>
                            {tipoLabel}
                          </span>
                          <span style={{ fontSize: '13px', color: textSecondary }}>{grupo.items.length} rutas</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: getPctColor(parseFloat(pctGlobal)) }}>{pctGlobal}% global</span>
                        </div>
                        <button
                          onClick={() => exportarPDF(grupo)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '7px', border: 'none', background: '#8b5cf6', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <Download size={14} />
                          Descargar PDF
                        </button>
                      </div>

                      {/* TABLA */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: headerBg, borderBottom: `1px solid ${border}` }}>
                              {['ID', 'Zona', 'Localidad', 'ID CHF', 'Pqte Día', 'Por Fuera', 'Entregados', '% Día'].map(h => (
                                <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Localidad' ? 'left' : 'center', color: textSecondary, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.items.map((r, i) => {
                              const total = (r.pqte_dia || 0) + (r.por_fuera || 0);
                              const pct = total > 0 ? parseFloat(((r.entregados || 0) / total * 100).toFixed(1)) : 0;
                              const pctColor = getPctColor(pct);
                              return (
                                <tr key={r.id || i} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? cardBg : (theme === 'light' ? '#f9fafb' : '#141e2e') }}>
                                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#8b5cf6', background: '#8b5cf620', padding: '2px 6px', borderRadius: '4px' }}>{r.id_ruta}</span>
                                  </td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: textSecondary }}>{r.zona}</td>
                                  <td style={{ padding: '9px 12px', fontWeight: '500', color: textPrimary }}>{r.localidad}</td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', color: textSecondary }}>{r.id_chofer || '—'}</td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: '600', color: textPrimary }}>{r.pqte_dia || 0}</td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: '600', color: textPrimary }}>{r.por_fuera || 0}</td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: '600', color: textPrimary }}>{r.entregados || 0}</td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontWeight: '700', fontSize: '13px', color: pctColor }}>{total > 0 ? pct + '%' : '—'}</span>
                                      {total > 0 && <div style={{ width: '44px', height: '3px', borderRadius: '2px', background: `${pctColor}25`, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pctColor, borderRadius: '2px' }} /></div>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* ── TAB CLIENTES ── */
            cliAgrupadosPorFecha.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: textSecondary }}>
                <ClipboardList size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '16px', fontWeight: '500', color: textPrimary }}>No hay historial de clientes aún</p>
                <p style={{ fontSize: '13px' }}>Marcá las llegadas con el checkbox en la pantalla de Clientes y guardá en historial</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {cliAgrupadosPorFecha.map(grupo => {
                  const key = `${grupo.fecha}__${grupo.tipo_dia}`;
                  const tipoLabel = grupo.tipo_dia === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes';
                  return (
                    <div key={key} style={{ backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden', boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.07)' : '0 4px 12px rgba(0,0,0,0.25)' }}>
                      <div style={{ padding: '14px 20px', background: theme === 'light' ? '#f8fafc' : '#0f172a', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Clock size={18} color="#10b981" />
                          <span style={{ fontWeight: '700', fontSize: '15px', color: textPrimary }}>{formatFecha(grupo.fecha)}</span>
                          <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: grupo.tipo_dia === 'SÁBADOS' ? '#06b6d420' : '#10b98120', color: grupo.tipo_dia === 'SÁBADOS' ? '#06b6d4' : '#10b981', fontWeight: '600', border: `1px solid ${grupo.tipo_dia === 'SÁBADOS' ? '#06b6d440' : '#10b98140'}` }}>
                            {tipoLabel}
                          </span>
                          <span style={{ fontSize: '13px', color: textSecondary }}>{grupo.items.length} llegadas</span>
                        </div>
                        <button
                          onClick={() => exportarPDFClientes(grupo)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '7px', border: 'none', background: '#10b981', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <Download size={14} />
                          Descargar PDF
                        </button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: headerBg, borderBottom: `1px solid ${border}` }}>
                              {['Cliente', 'Chofer', 'Horario Prog.', 'Hora Llegada', 'Dirección'].map(h => (
                                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: textSecondary, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.items.map((r, i) => (
                              <tr key={r.id || i} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? cardBg : (theme === 'light' ? '#f9fafb' : '#141e2e') }}>
                                <td style={{ padding: '9px 14px', fontWeight: '600', color: textPrimary }}>{r.cliente_nombre}</td>
                                <td style={{ padding: '9px 14px', color: textSecondary }}>{r.chofer || '—'}</td>
                                <td style={{ padding: '9px 14px', color: textSecondary }}>{r.horario_programado || '—'}</td>
                                <td style={{ padding: '9px 14px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '700', fontSize: '13px', color: '#10b981', background: '#10b98115', padding: '3px 10px', borderRadius: '20px', border: '1px solid #10b98130' }}>
                                    <Clock size={12} />
                                    {r.hora_llegada}
                                  </span>
                                </td>
                                <td style={{ padding: '9px 14px', color: textSecondary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.direccion || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      <ModalConfirmacion
        isOpen={confirmConfig.isOpen}
        titulo={confirmConfig.titulo}
        mensaje={confirmConfig.mensaje}
        textoConfirmar={confirmConfig.textoConfirmar}
        isDanger={confirmConfig.isDanger}
        tema={theme}
        onConfirm={() => {
          if (confirmConfig.accion) confirmConfig.accion();
          setConfirmConfig(p => ({ ...p, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
export default App;