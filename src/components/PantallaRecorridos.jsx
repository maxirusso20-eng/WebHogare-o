import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Grid3x3, CalendarDays, MapPin, Plus, Truck, Package, CheckCircle, TrendingUp, AlertCircle, GripVertical, Trash2, Smartphone, X, Users } from 'lucide-react';
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
import { ModalAgregar } from './ModalAgregar';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

function PantallaRecorridos() {
  const { mostrarToast, theme, choferes, triggerTabSplash } = useContext(AppContext);
  const [recorridoAEliminar, setRecorridoAEliminar] = useState(null);
  const [confirmDeleteRecorrido, setConfirmDeleteRecorrido] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardandoHistorial, setGuardandoHistorial] = useState(false);
  const [selectedZona, setSelectedZona] = useState(null);
  const [tabActiva, setTabActiva] = useState('LUNES A VIERNES');
  const [colectasLocales, setColectasLocales] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [modoConductor, setModoConductor] = useState(false);
  const [zonaAsigMasiva, setZonaAsigMasiva] = useState(null);
  const [choferMasivo, setChoferMasivo] = useState('');

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
          console.log(`🔴 Realtime [${tablaActual}]:`, payload.eventType, payload);
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
  const obtenerNombreChofer = (idChofer) => {
    if (!idChofer) return '—';
    const chofer = choferes.find(c => c.id === idChofer);
    return chofer ? chofer.nombre : 'No encontrado';
  };

  // COLORES SEGÚN TEMA
  const colors = {
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
  };

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

  // ─── GUARDAR EN HISTORIAL RECORRIDOS ──────────────────────────────────────
  const guardarEnHistorialRecorridos = async () => {
    setGuardandoHistorial(true);
    try {
      if (!colectasLocales.length) {
        mostrarToast('No hay recorridos para guardar', 'info');
        setGuardandoHistorial(false);
        return;
      }
      const hoy = new Date().toISOString().split('T')[0];
      const tipoDia = tabActiva === 'SÁBADOS' ? 'SÁBADOS' : 'SEMANA';
      const rows = colectasLocales.map(r => ({
        fecha: hoy,
        tipo_dia: tipoDia,
        id_ruta: r.id,
        zona: r.zona || '',
        localidad: r.localidad || '',
        id_chofer: r.idChofer || null,
        pqte_dia: r.pqteDia || 0,
        por_fuera: r.porFuera || 0,
        entregados: r.entregados || 0,
      }));
      const { error } = await supabase
        .from('historial_recorridos')
        .upsert(rows, { onConflict: 'fecha,id_ruta' });
      if (error) throw error;
      mostrarToast(`✅ ${rows.length} recorridos guardados en historial (${hoy})`, 'success');
    } catch (e) {
      mostrarToast(`❌ Error: ${e.message}`, 'error');
    }
    setGuardandoHistorial(false);
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

  if (loadingLocal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: colors.textSecondary, backgroundColor: colors.backgroundColor }}>
        <div>⏳ Cargando rutas...</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ padding: '20px', backgroundColor: colors.backgroundColor, minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Grid3x3 size={28} color={theme === 'light' ? '#3b82f6' : '#64b5f6'} strokeWidth={2} />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: colors.textPrimary }}>
            Gestión de Rutas y Paquetes
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Botón Modo Conduccion */}
          <button
            onClick={() => setModoConductor(v => !v)}
            title={modoConductor ? 'Salir de Modo Conducción' : 'Modo Conducción (pantalla táctil)'}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px',
              backgroundColor: modoConductor ? '#f59e0b' : (theme === 'light' ? '#f1f5f9' : '#1e293b'),
              color: modoConductor ? '#fff' : colors.textPrimary,
              borderRadius: '9px', fontWeight: '700', fontSize: '14px',
              border: `1px solid ${modoConductor ? '#f59e0b' : colors.border}`,
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            <Smartphone size={16} />
            {modoConductor ? 'Salir modo 🚚' : 'Modo Chofer'}
          </button>
          <button
            onClick={guardarEnHistorialRecorridos}
            disabled={guardandoHistorial}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: guardandoHistorial ? '#475569' : '#8b5cf6', color: 'white', borderRadius: '9px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: guardandoHistorial ? 'not-allowed' : 'pointer', transition: 'background 120ms ease', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}
            onMouseEnter={e => { if (!guardandoHistorial) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            onMouseLeave={e => { if (!guardandoHistorial) e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
          >
            <CalendarDays size={16} />
            {guardandoHistorial ? 'Guardando...' : 'Guardar en Historial'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'LUNES A VIERNES', value: 'LUNES A VIERNES' },
          { label: 'SÁBADOS', value: 'SÁBADOS' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabActiva !== tab.value) {
                triggerTabSplash(tab.label);
                setTabActiva(tab.value);
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

      <>
        {/* ZONAS */}
        <div style={{ display: 'grid', gap: '24px' }}>
          {ZONAS.map(zona => {
            const datosZona = colectasLocales.filter(c => c.zona === zona);
            const zoneColor = getZoneColor(zona);

            // Asignación masiva de chofer para esta zona
            const handleAsignarChoferMasivo = async () => {
              if (!choferMasivo) return;
              const choferIdNum = parseInt(choferMasivo);
              const ids = datosZona.map(d => d.id);
              await Promise.all(ids.map(id =>
                supabase.from(tablaActual).update({ idChofer: choferIdNum }).eq('id', id)
              ));
              setColectasLocales(prev => prev.map(item =>
                item.zona === zona ? { ...item, idChofer: choferIdNum } : item
              ));
              mostrarToast(`✅ Chofer asignado a toda la ${zona}`, 'success');
              setZonaAsigMasiva(null);
              setChoferMasivo('');
            };

            return (
              <div
                key={zona}
                style={{
                  backgroundColor: colors.cardBg,
                  borderRadius: '12px',
                  boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden',
                  border: `1px solid ${colors.border}`,
                  transition: 'all 0.2s ease'
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
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Botón Asignación Masiva */}
                    <button
                      onClick={() => setZonaAsigMasiva(zonaAsigMasiva === zona ? null : zona)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backgroundColor: zonaAsigMasiva === zona ? `${zoneColor}30` : `${zoneColor}15`,
                        color: zoneColor,
                        border: `1px solid ${zoneColor}50`,
                        padding: '6px 12px', borderRadius: '6px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Asignar chofer a todas las rutas de esta zona"
                    >
                      <Users size={14} /> Asig. masiva
                    </button>
                    <button
                      onClick={() => abrirModal(zona)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backgroundColor: `${zoneColor}20`,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.borderLight}`,
                        padding: '6px 12px', borderRadius: '6px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.target.style.backgroundColor = `${zoneColor}40`; }}
                      onMouseLeave={(e) => { e.target.style.backgroundColor = `${zoneColor}20`; }}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Añadir
                    </button>
                  </div>
                </div>

                {/* PANEL ASIGNACIÓN MASIVA */}
                {zonaAsigMasiva === zona && (
                  <div style={{
                    padding: '12px 20px',
                    background: theme === 'light' ? `${zoneColor}08` : `${zoneColor}12`,
                    borderBottom: `1px solid ${zoneColor}30`,
                    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>
                      🚚 Asignar chofer a las {datosZona.length} rutas de {zona}:
                    </span>
                    <select
                      value={choferMasivo}
                      onChange={e => setChoferMasivo(e.target.value)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                        border: `1px solid ${zoneColor}50`,
                        backgroundColor: colors.inputBg, color: colors.textPrimary,
                        outline: 'none', cursor: 'pointer', flex: 1, minWidth: '160px',
                      }}
                    >
                      <option value="">-- Elegir chofer --</option>
                      {choferes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAsignarChoferMasivo}
                      disabled={!choferMasivo}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                        fontWeight: '700', border: 'none', cursor: choferMasivo ? 'pointer' : 'not-allowed',
                        backgroundColor: choferMasivo ? zoneColor : '#64748b',
                        color: '#fff', opacity: choferMasivo ? 1 : 0.5,
                        transition: 'all 0.2s',
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setZonaAsigMasiva(null); setChoferMasivo(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* MODO CONDUCTOR: Cards grandes táctiles */}
                {modoConductor ? (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {datosZona.length === 0 ? (
                      <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '20px', fontSize: '14px' }}>
                        No hay rutas en esta zona
                      </p>
                    ) : datosZona.map((item) => {
                      const total = (item.pqteDia || 0) + (item.porFuera || 0);
                      const pct = total > 0 ? Math.round((item.entregados / total) * 100) : 0;
                      const choferNombre = obtenerNombreChofer(item.idChofer);
                      return (
                        <div key={item.id} style={{
                          backgroundColor: colors.cardBg,
                          border: `2px solid ${pct === 100 ? '#10b981' : zoneColor}40`,
                          borderRadius: '16px', padding: '16px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: '700', fontSize: '16px', color: colors.textPrimary }}>{item.localidad}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '13px', color: colors.textSecondary }}>
                                🚚 {choferNombre} &nbsp;·&nbsp; 📦 {total} pqtes
                              </p>
                            </div>
                            <span style={{
                              fontSize: '22px', fontWeight: '800',
                              color: pct === 100 ? '#10b981' : (pct >= 50 ? '#f59e0b' : '#ef4444'),
                            }}>{pct}%</span>
                          </div>
                          {/* Barra de progreso */}
                          <div style={{ height: '6px', borderRadius: '99px', backgroundColor: colors.border, marginBottom: '14px' }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              width: `${pct}%`,
                              backgroundColor: pct === 100 ? '#10b981' : zoneColor,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                          {/* Botones +/- grandes */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                            <button
                              onClick={() => guardarCambioBD(item.id, 'entregados', Math.max(0, (item.entregados || 0) - 1))}
                              style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                fontSize: '28px', fontWeight: '900', border: 'none',
                                backgroundColor: '#ef444420', color: '#ef4444',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.1s', userSelect: 'none',
                              }}
                              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >-</button>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '32px', fontWeight: '800', color: colors.textPrimary }}>
                                {item.entregados || 0}
                              </span>
                              <p style={{ margin: 0, fontSize: '11px', color: colors.textSecondary }}>entregados</p>
                            </div>
                            <button
                              onClick={() => guardarCambioBD(item.id, 'entregados', Math.min(total, (item.entregados || 0) + 1))}
                              style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                fontSize: '28px', fontWeight: '900', border: 'none',
                                backgroundColor: '#10b98120', color: '#10b981',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.1s', userSelect: 'none',
                              }}
                              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* TABLA ORIGINAL */
                  <div style={{ overflow: 'hidden' }}>
                  {datosZona.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, zona)}
                    >
                      <SortableContext
                        items={datosZona.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '14px'
                        }}>
                          <thead>
                            <tr style={{
                              backgroundColor: colors.headerBg,
                              borderBottom: `1px solid ${colors.border}`
                            }}>
                              <th style={{ padding: '12px 8px 12px 12px', width: '32px' }}></th>
                              <th style={{
                                padding: '12px 10px',
                                textAlign: 'center',
                                color: colors.textSecondary,
                                fontWeight: '600',
                                fontSize: '11px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                width: '70px',
                              }}>
                                ID RUTA
                              </th>
                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                color: colors.textSecondary,
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <MapPin size={14} color={zoneColor} />
                                  Localidad
                                </div>
                              </th>

                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: colors.textSecondary,
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <Truck size={14} color={zoneColor} />
                                  Nombre Chofer
                                </div>
                              </th>
                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: '#cbd5e1',
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <Package size={14} color={zoneColor} />
                                  Pqte Día
                                </div>
                              </th>
                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: '#cbd5e1',
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <Plus size={14} color={zoneColor} />
                                  Por Fuera
                                </div>
                              </th>
                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: '#cbd5e1',
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <CheckCircle size={14} color={zoneColor} />
                                  Entregados
                                </div>
                              </th>
                              <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: '#cbd5e1',
                                fontWeight: '600',
                                fontSize: '12px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                width: '70px',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <TrendingUp size={14} color={zoneColor} />
                                  %
                                </div>
                              </th>
                              <th style={{ padding: '12px 8px', width: '36px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {datosZona.map((item, idx) => {
                              const total = (item.pqteDia || 0) + (item.porFuera || 0);
                              const porcentaje = total > 0
                                ? parseFloat(((item.entregados / total) * 100).toFixed(1))
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
                                  onEliminar={() => { setRecorridoAEliminar(item); setConfirmDeleteRecorrido(true); }}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </SortableContext>
                    </DndContext>
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
                          transition: 'all 0.2s ease',
                          opacity: '0.8'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '1';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = `0 4px 12px ${zoneColor}40`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.8';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        + Nueva ruta
                      </button>
                    </div>
                  )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>

      {/* MODAL PARA AGREGAR LOCALIDAD */}
      <ModalAgregar
        isOpen={isModalOpen}
        zona={selectedZona}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmarAgregarLocalidad}
        theme={theme}
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
          transition: 'all 0.2s ease',
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
  onEliminar
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // Estado local — edición sin guardar en cada tecla
  const [localPqteDia, setLocalPqteDia] = useState(item.pqteDia ?? '');
  const [localPorFuera, setLocalPorFuera] = useState(item.porFuera ?? '');
  const [localEntregados, setLocalEntregados] = useState(item.entregados ?? '');

  // Sincronizar si el item cambia desde afuera (realtime de otro usuario)
  useEffect(() => { setLocalPqteDia(item.pqteDia ?? ''); }, [item.pqteDia]);
  useEffect(() => { setLocalPorFuera(item.porFuera ?? ''); }, [item.porFuera]);
  useEffect(() => { setLocalEntregados(item.entregados ?? ''); }, [item.entregados]);

  // % se actualiza solo cuando cambia entregados (usa pqteDia/porFuera de BD, no locales)
  const totalBD = (parseInt(item.pqteDia) || 0) + (parseInt(item.porFuera) || 0);
  const pctLocalNum = totalBD > 0
    ? parseFloat((((parseInt(localEntregados) || 0) / totalBD) * 100).toFixed(1))
    : 0;
  const pctLocalStr = totalBD > 0 ? pctLocalNum + '%' : '—';

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
    transition: 'all 0.2s ease',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* HANDLE DE DRAG */}
      <td style={{ padding: '12px 8px 12px 12px', width: '32px' }}>
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
      <td style={{ padding: '12px 10px', textAlign: 'center', width: '70px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '20px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace',
          backgroundColor: `${zoneColor}20`,
          color: zoneColor,
          border: `1px solid ${zoneColor}40`,
        }}>
          {item.id}
        </span>
      </td>

      {/* LOCALIDAD EDITABLE */}
      <td style={{ padding: '12px 16px', fontWeight: '500', color: colors.textPrimary }}>
        <CeldaLocalidadEditable
          item={item}
          colors={colors}
          zoneColor={zoneColor}
          onSave={(nuevoValor) => guardarLocalidad(item.id, nuevoValor)}
        />
      </td>

      {/* CHOFER — select desplegable */}
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <select
          value={item.idChofer || ''}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
            guardarCambioBD(item.id, 'idChofer', val);
          }}
          style={{
            padding: '5px 8px',
            border: `1px solid ${colors.borderLight}`,
            borderRadius: '6px',
            backgroundColor: colors.inputBg,
            color: item.idChofer ? colors.textPrimary : colors.textSecondary,
            fontSize: '13px',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer',
            maxWidth: '160px',
            transition: 'all 0.2s ease',
            appearance: 'auto',
          }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        >
          <option value="">— Sin chofer —</option>
          {choferes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </td>

      {/* PQTE DÍA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={localPqteDia}
          onChange={(e) => setLocalPqteDia(e.target.value)}
          onBlur={(e) => {
            guardarCambioBD(item.id, 'pqteDia', e.target.value);
            e.target.style.borderColor = colors.borderLight;
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = colors.inputBg;
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
        />
      </td>

      {/* POR FUERA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={localPorFuera}
          onChange={(e) => setLocalPorFuera(e.target.value)}
          onBlur={(e) => {
            guardarCambioBD(item.id, 'porFuera', e.target.value);
            e.target.style.borderColor = colors.borderLight;
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = colors.inputBg;
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
        />
      </td>

      {/* ENTREGADOS */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={localEntregados}
          onChange={(e) => setLocalEntregados(e.target.value)}
          onBlur={(e) => {
            guardarCambioBD(item.id, 'entregados', e.target.value);
            e.target.style.borderColor = colors.borderLight;
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = colors.inputBg;
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
        />
      </td>

      {/* PORCENTAJE */}
      <td style={{ padding: '12px 16px', textAlign: 'center', width: '70px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          backgroundColor: `${getPercentageColor(pctLocalStr)}20`,
          color: getPercentageColor(pctLocalStr),
          border: `1px solid ${getPercentageColor(pctLocalStr)}40`,
          minWidth: '52px',
        }}>
          {pctLocalStr}
        </span>
      </td>

      {/* ELIMINAR */}
      <td style={{ padding: '12px 8px', textAlign: 'center', width: '36px' }}>
        <button
          onClick={onEliminar}
          title="Eliminar recorrido"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ef4444',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            padding: '6px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

export { PantallaRecorridos };