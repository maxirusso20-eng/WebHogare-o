import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { CalendarDays, Truck, Package, Plus, MapPin, Trash2, GripVertical, CheckCircle, AlertCircle } from 'lucide-react';
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

// ════════════════════════════════════════════════════════════════
// COMPONENTE: Celda de Localidad Editable (inline)
// ════════════════════════════════════════════════════════════════
function CeldaLocalidadEditable({ item, colors, zoneColor, onSave }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.localidad);

  useEffect(() => { setValor(item.localidad); }, [item.localidad]);

  const confirmar = () => {
    setEditando(false);
    const limpio = valor.trim();
    if (limpio && limpio !== item.localidad) onSave(limpio);
    else setValor(item.localidad);
  };

  if (editando) {
    return (
      <input
        type="text"
        value={valor}
        autoFocus
        onChange={(e) => setValor(e.target.value.toUpperCase())}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') { setValor(item.localidad); setEditando(false); }
          if (e.key === 'Backspace' && valor === item.localidad) {
            e.preventDefault();
            setValor('');
          }
        }}
        style={{
          width: '100%', padding: '4px 8px', borderRadius: '6px',
          border: `2px solid ${zoneColor}`, backgroundColor: colors.inputFocusBg,
          color: colors.textPrimary, fontSize: '13px', fontWeight: '600',
          outline: 'none', boxShadow: `0 0 0 3px ${zoneColor}25`,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditando(true)}
      title="Clic para editar"
      style={{
        cursor: 'text', color: colors.textPrimary, fontWeight: '500',
        borderBottom: `1px dashed ${zoneColor}80`, paddingBottom: '1px',
        display: 'inline-block', transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { e.target.style.borderBottomColor = zoneColor; e.target.style.color = zoneColor; }}
      onMouseLeave={(e) => { e.target.style.borderBottomColor = `${zoneColor}80`; e.target.style.color = colors.textPrimary; }}
    >
      {item.localidad}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE: Fila Sortable
// ════════════════════════════════════════════════════════════════
function SortableFilaSabado({ item, idx, colors, zoneColor, theme, guardarCambioBD, guardarLocalidad, getPercentageColor, porcentajeStr, onEliminar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: isDragging
      ? (theme === 'light' ? '#dbeafe' : '#1e3a5f')
      : (idx % 2 === 0 ? colors.cardBg : colors.rowAlt),
    boxShadow: isDragging ? `0 8px 24px rgba(0,0,0,0.18), 0 0 0 2px ${zoneColor}` : 'none',
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative',
  };

  const inputStyle = {
    padding: '6px 8px', border: `1px solid ${colors.borderLight}`,
    borderRadius: '6px', backgroundColor: colors.inputBg,
    color: colors.textPrimary, fontSize: '13px', fontWeight: '500',
    outline: 'none', textAlign: 'center', transition: 'all 0.2s ease',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* DRAG HANDLE */}
      <td style={{ padding: '12px 8px 12px 12px', width: '32px' }}>
        <span
          {...attributes} {...listeners}
          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab', color: colors.textSecondary, opacity: 0.5, touchAction: 'none' }}
          title="Arrastrá para reordenar"
        >
          <GripVertical size={14} />
        </span>
      </td>

      {/* ID */}
      <td style={{ padding: '12px 10px', textAlign: 'center', width: '50px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '30px', height: '20px', borderRadius: '4px', fontSize: '11px',
          fontWeight: '700', fontFamily: 'monospace',
          backgroundColor: `${zoneColor}20`, color: zoneColor,
          border: `1px solid ${zoneColor}40`,
        }}>
          {item.id}
        </span>
      </td>

      {/* LOCALIDAD */}
      <td style={{ padding: '12px 16px', fontWeight: '500', color: colors.textPrimary }}>
        <CeldaLocalidadEditable
          item={item} colors={colors} zoneColor={zoneColor}
          onSave={(val) => guardarLocalidad(item.id, val)}
        />
      </td>

      {/* ID CHOFER (input numérico) */}
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.idChofer || ''}
          placeholder="ID"
          onChange={(e) => guardarCambioBD(item.id, 'idChofer', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.idChofer && String(e.target.value) === String(item.idChofer)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'idChofer', 0);
            }
          }}
          style={{ ...inputStyle, width: '70px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* PQTE DÍA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number" value={item.pqteDia || ''}
          onChange={(e) => guardarCambioBD(item.id, 'pqteDia', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.pqteDia && String(e.target.value) === String(item.pqteDia)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'pqteDia', 0);
            }
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* POR FUERA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number" value={item.porFuera || ''}
          onChange={(e) => guardarCambioBD(item.id, 'porFuera', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.porFuera && String(e.target.value) === String(item.porFuera)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'porFuera', 0);
            }
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* ENTREGADOS */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number" value={item.entregados || ''}
          onChange={(e) => guardarCambioBD(item.id, 'entregados', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && item.entregados && String(e.target.value) === String(item.entregados)) {
              e.preventDefault();
              guardarCambioBD(item.id, 'entregados', 0);
            }
          }}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* % */}
      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: getPercentageColor(porcentajeStr), fontSize: '14px' }}>
        {porcentajeStr}
      </td>

      {/* ELIMINAR */}
      <td style={{ padding: '12px 8px', textAlign: 'center', width: '36px' }}>
        <button
          onClick={onEliminar} title="Eliminar recorrido"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef444480', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', padding: '4px', transition: 'all 0.15s ease' }}
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
// COMPONENTE PRINCIPAL: Dashboard Sábados
// ════════════════════════════════════════════════════════════════
export function DashboardSabados({ theme, mostrarToast }) {
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevaLocalidad, setNuevaLocalidad] = useState('');
  const [guardando, setGuardando] = useState(false);

  // ── Colores según tema ───────────────────────────────────────
  const colors = {
    backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
    cardBg:          theme === 'light' ? '#ffffff'  : '#1e293b',
    headerBg:        theme === 'light' ? '#f1f5f9'  : '#0f172a',
    textPrimary:     theme === 'light' ? '#1e293b'  : '#f8fafc',
    textSecondary:   theme === 'light' ? '#64748b'  : '#cbd5e1',
    border:          theme === 'light' ? '#e2e8f0'  : '#334155',
    borderLight:     theme === 'light' ? '#cbd5e1'  : '#475569',
    rowAlt:          theme === 'light' ? '#f9fafb'  : '#141e2e',
    inputBg:         theme === 'light' ? '#f8fafc'  : '#0f172a',
    inputFocusBg:    theme === 'light' ? '#ffffff'  : '#1a2540',
  };

  // Color fijo para sábados: naranja/ámbar
  const ZONE_COLOR = '#f59e0b';

  // ── Fetch inicial ────────────────────────────────────────────
  const cargarRecorridos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recorridos_sabados')
        .select('*')
        .order('orden', { ascending: true });
      if (error) throw error;
      setRecorridos(data || []);
    } catch (err) {
      console.error('Error cargando recorridos_sabados:', err);
      mostrarToast('❌ Error al cargar recorridos del sábado', 'error');
    } finally {
      setLoading(false);
    }
  }, [mostrarToast]);

  useEffect(() => { cargarRecorridos(); }, [cargarRecorridos]);

  // ── DnD ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = recorridos.findIndex(r => r.id === active.id);
    const newIndex = recorridos.findIndex(r => r.id === over.id);
    const reordenado = arrayMove(recorridos, oldIndex, newIndex);
    setRecorridos(reordenado);

    // Persistir orden en Supabase
    try {
      const updates = reordenado.map((r, i) =>
        supabase.from('recorridos_sabados').update({ orden: i + 1 }).eq('id', r.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error guardando orden:', err);
      mostrarToast('❌ Error al guardar el orden', 'error');
    }
  };

  // ── Guardar campo numérico ───────────────────────────────────
  const guardarCambioBD = async (id, campo, valor) => {
    const num = parseInt(valor) || 0;
    setRecorridos(prev => prev.map(r => r.id === id ? { ...r, [campo]: num } : r));
    const { error } = await supabase
      .from('recorridos_sabados')
      .update({ [campo]: num })
      .eq('id', id);
    if (error) console.error('Error al sincronizar:', error.message);
  };

  // ── Guardar localidad editada inline ─────────────────────────
  const guardarLocalidad = async (id, nuevoValor) => {
    if (!nuevoValor?.trim()) return;
    const valorLimpio = nuevoValor.trim().toUpperCase();
    setRecorridos(prev => prev.map(r => r.id === id ? { ...r, localidad: valorLimpio } : r));
    const { error } = await supabase
      .from('recorridos_sabados')
      .update({ localidad: valorLimpio })
      .eq('id', id);
    if (error) console.error('Error al actualizar localidad:', error.message);
  };

  // ── Agregar nueva localidad ──────────────────────────────────
  const agregarLocalidad = async () => {
    if (!nuevaLocalidad.trim()) return;
    setGuardando(true);
    try {
      const maxOrden = recorridos.length > 0 ? Math.max(...recorridos.map(r => r.orden || 0)) : 0;
      const nuevaRuta = {
        localidad: nuevaLocalidad.trim().toUpperCase(),
        idChofer: 0,
        pqteDia: 0,
        porFuera: 0,
        entregados: 0,
        orden: maxOrden + 1,
      };
      const { data, error } = await supabase
        .from('recorridos_sabados')
        .insert([nuevaRuta])
        .select();
      if (error) throw error;
      if (data?.[0]) {
        setRecorridos(prev => [...prev, data[0]]);
        mostrarToast(`✅ ${nuevaLocalidad} agregada al sábado`, 'success');
        setNuevaLocalidad('');
        setModalOpen(false);
      }
    } catch (err) {
      console.error('Error agregando localidad:', err);
      mostrarToast(`❌ ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar recorrido ───────────────────────────────────────
  const eliminarRecorrido = async (id) => {
    if (!window.confirm('¿Eliminar este recorrido del sábado?')) return;
    try {
      const { error } = await supabase.from('recorridos_sabados').delete().eq('id', id);
      if (error) throw error;
      setRecorridos(prev => prev.filter(r => r.id !== id));
      mostrarToast('✅ Recorrido eliminado', 'success');
    } catch (err) {
      mostrarToast('❌ Error al eliminar', 'error');
    }
  };

  // ── Helpers de visualización ─────────────────────────────────
  const getPercentageColor = (pct) => {
    const n = parseFloat(pct);
    if (n >= 100) return '#10b981';
    if (n >= 80)  return '#06b6d4';
    if (n >= 50)  return '#f59e0b';
    return '#64748b';
  };

  // ── Stats ────────────────────────────────────────────────────
  const totalPaquetes   = recorridos.reduce((s, r) => s + (r.pqteDia || 0) + (r.porFuera || 0), 0);
  const totalEntregados = recorridos.reduce((s, r) => s + (r.entregados || 0), 0);
  const pctGlobal       = totalPaquetes > 0 ? ((totalEntregados / totalPaquetes) * 100).toFixed(1) : '0.0';
  const rutasSinChofer  = recorridos.filter(r => !r.idChofer || r.idChofer === 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: colors.textSecondary, backgroundColor: colors.backgroundColor }}>
        <div>⏳ Cargando sábados...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: colors.backgroundColor, minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={28} color={ZONE_COLOR} strokeWidth={2} />
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: colors.textPrimary }}>
                Dashboard Sábados
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: colors.textSecondary }}>
                Operaciones del fin de semana — tabla <code style={{ fontSize: '12px', backgroundColor: `${ZONE_COLOR}20`, color: ZONE_COLOR, padding: '1px 6px', borderRadius: '4px' }}>recorridos_sabados</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: ZONE_COLOR, color: '#000',
              border: 'none', padding: '8px 16px', borderRadius: '8px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Añadir Localidad
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Rutas', value: recorridos.length, icon: '🗺️', color: ZONE_COLOR },
          { label: 'Total paquetes', value: totalPaquetes, icon: '📦', color: '#3b82f6' },
          { label: 'Entregados', value: totalEntregados, icon: '✅', color: '#10b981' },
          { label: '% Global', value: pctGlobal + '%', icon: '📈', color: getPercentageColor(pctGlobal) },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ backgroundColor: colors.cardBg, borderRadius: '10px', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${color}`, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── ALERTA RUTAS SIN CHOFER ── */}
      {rutasSinChofer.length > 0 && (
        <div style={{
          backgroundColor: theme === 'light' ? '#fef2f2' : '#2d1515',
          border: '1px solid #ef444440', borderLeft: '4px solid #ef4444',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <AlertCircle size={18} color="#ef4444" />
          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
            {rutasSinChofer.length} ruta{rutasSinChofer.length > 1 ? 's' : ''} sin chofer asignado: {rutasSinChofer.map(r => r.localidad).join(', ')}
          </p>
        </div>
      )}

      {/* ── TABLA CON DnD ── */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.3)' }}>

        {/* Header de la sección */}
        <div style={{
          background: theme === 'light' ? `linear-gradient(135deg, ${ZONE_COLOR}15, ${ZONE_COLOR}08)` : `linear-gradient(135deg, ${ZONE_COLOR}40, ${ZONE_COLOR}20)`,
          borderBottom: `2px solid ${ZONE_COLOR}`, padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color={ZONE_COLOR} strokeWidth={2} />
            <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '15px', fontWeight: '600' }}>
              Recorridos del Sábado
            </h3>
            <span style={{ backgroundColor: `${ZONE_COLOR}25`, color: colors.textSecondary, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: `1px solid ${ZONE_COLOR}40` }}>
              {recorridos.length} rutas
            </span>
          </div>
        </div>

        {recorridos.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={recorridos.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.headerBg, borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: '12px 8px 12px 12px', width: '32px' }}></th>
                      {/* ID columna */}
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50px' }}>
                        ID
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSecondary, fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color={ZONE_COLOR} /> Localidad
                        </div>
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <Truck size={14} color={ZONE_COLOR} /> ID Chofer
                        </div>
                      </th>
                      {['Pqte Día', 'Por Fuera', 'Entregados'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <Package size={14} color={ZONE_COLOR} /> {h}
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% Día</th>
                      <th style={{ padding: '12px 8px', width: '36px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recorridos.map((item, idx) => {
                      const total = (item.pqteDia || 0) + (item.porFuera || 0);
                      const entregados = item.entregados || 0;
                      const pct = total > 0 ? ((entregados / total) * 100).toFixed(1) : '—';

                      return (
                        <SortableFilaSabado
                          key={item.id}
                          item={item}
                          idx={idx}
                          colors={colors}
                          zoneColor={ZONE_COLOR}
                          theme={theme}
                          guardarCambioBD={guardarCambioBD}
                          guardarLocalidad={guardarLocalidad}
                          getPercentageColor={getPercentageColor}
                          porcentajeStr={pct}
                          onEliminar={() => eliminarRecorrido(item.id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: colors.textSecondary }}>
            <CalendarDays size={48} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
            <p style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, margin: '0 0 6px' }}>
              No hay recorridos para el sábado
            </p>
            <p style={{ fontSize: '13px', margin: '0 0 20px' }}>
              Podés agregar rutas manualmente o cargar datos directamente en Supabase
            </p>
            <button
              onClick={() => setModalOpen(true)}
              style={{ backgroundColor: ZONE_COLOR, color: '#000', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              + Nueva ruta
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL AGREGAR LOCALIDAD ── */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{ backgroundColor: colors.cardBg, borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%', border: `1px solid ${colors.border}`, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px', color: colors.textPrimary, fontSize: '20px', fontWeight: '700' }}>
              🗓️ Agregar Localidad
            </h2>
            <p style={{ margin: '0 0 20px', color: colors.textSecondary, fontSize: '13px' }}>
              Nueva ruta para <span style={{ color: ZONE_COLOR, fontWeight: '600' }}>Sábados</span>
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Nombre de la localidad..."
              value={nuevaLocalidad}
              onChange={(e) => setNuevaLocalidad(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') agregarLocalidad(); if (e.key === 'Escape') setModalOpen(false); }}
              style={{
                width: '100%', padding: '12px 14px', border: `1px solid ${colors.borderLight}`,
                borderRadius: '10px', backgroundColor: colors.inputBg, color: colors.textPrimary,
                fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '20px',
              }}
              onFocus={(e) => { e.target.style.borderColor = ZONE_COLOR; e.target.style.boxShadow = `0 0 0 3px ${ZONE_COLOR}20`; }}
              onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ padding: '10px 16px', border: `1px solid ${colors.borderLight}`, borderRadius: '8px', backgroundColor: colors.cardBg, color: colors.textPrimary, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={agregarLocalidad}
                disabled={!nuevaLocalidad.trim() || guardando}
                style={{ padding: '10px 16px', border: 'none', borderRadius: '8px', backgroundColor: nuevaLocalidad.trim() ? ZONE_COLOR : '#64748b', color: '#000', fontSize: '14px', fontWeight: '700', cursor: nuevaLocalidad.trim() ? 'pointer' : 'not-allowed', opacity: nuevaLocalidad.trim() ? 1 : 0.6 }}
              >
                {guardando ? '...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}