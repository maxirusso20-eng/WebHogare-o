import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { CalendarDays, TrendingUp, Package, CheckCircle, ChevronDown, ChevronUp, Search, Download, Save, Trash2 } from 'lucide-react';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

export function PantallaHistorialRecorridos() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaAEliminar, setFechaAEliminar] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [guardando, setGuardando] = useState(false);

  const c = {
    bg: isDark ? '#020617' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    header: isDark ? '#0f172a' : '#f1f5f9',
    text1: isDark ? '#f8fafc' : '#1e293b',
    text2: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    input: isDark ? '#0f172a' : '#f8fafc',
    row: isDark ? '#141e2e' : '#f9fafb',
  };

  // Columnas reales: id, fecha, tipo_dia, id_ruta, zona, localidad, id_chofer,
  //                  pqte_dia, por_fuera, entregados, created_at
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('historial_recorridos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('zona', { ascending: true });
      if (!error) setRegistros(data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const zonas = useMemo(() => {
    const s = new Set(registros.map(r => r.zona).filter(Boolean));
    return [...s].sort();
  }, [registros]);

  // Agrupar por fecha
  const porFecha = useMemo(() => {
    const m = {};
    registros.forEach(r => {
      const k = r.fecha || 'Sin fecha';
      if (!m[k]) m[k] = [];
      m[k].push(r);
    });
    return m;
  }, [registros]);

  // Filtrar fechas
  const fechasFiltradas = useMemo(() => {
    let fechas = Object.keys(porFecha);
    if (fechaDesde) fechas = fechas.filter(f => f >= fechaDesde);
    if (fechaHasta) fechas = fechas.filter(f => f <= fechaHasta);
    if (filtroTipo) fechas = fechas.filter(f => porFecha[f].some(r => r.tipo_dia === filtroTipo));
    if (filtroZona) fechas = fechas.filter(f => porFecha[f].some(r => r.zona === filtroZona));
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      fechas = fechas.filter(f =>
        porFecha[f].some(r =>
          (r.localidad || '').toLowerCase().includes(q) ||
          (r.zona || '').toLowerCase().includes(q)
        )
      );
    }
    return fechas.sort((a, b) => b.localeCompare(a));
  }, [porFecha, fechaDesde, fechaHasta, filtroZona, filtroTipo, busqueda]);

  // Filas filtradas por zona/tipo dentro de cada fecha
  const filasDeFecha = (fecha) => {
    let rows = porFecha[fecha] || [];
    if (filtroZona) rows = rows.filter(r => r.zona === filtroZona);
    if (filtroTipo) rows = rows.filter(r => r.tipo_dia === filtroTipo);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      rows = rows.filter(r =>
        (r.localidad || '').toLowerCase().includes(q) ||
        (r.zona || '').toLowerCase().includes(q)
      );
    }
    return rows;
  };

  const stats = useMemo(() => {
    const todos = fechasFiltradas.flatMap(f => filasDeFecha(f));
    const total = todos.reduce((s, r) => s + (r.pqte_dia || 0) + (r.por_fuera || 0), 0);
    const entTotal = todos.reduce((s, r) => s + (r.entregados || 0), 0);
    const totTotal = todos.reduce((s, r) => s + (r.pqte_dia || 0) + (r.por_fuera || 0), 0);
    const pctGlobal = totTotal > 0 ? ((entTotal / totTotal) * 100).toFixed(1) : '0';
    return { total, entTotal, pctGlobal, dias: fechasFiltradas.length, rutas: todos.length };
  }, [fechasFiltradas]);

  const pctColor = p => p >= 90 ? '#10b981' : p >= 70 ? '#f59e0b' : '#ef4444';

  const formatFecha = (f) => {
    if (!f || f === 'Sin fecha') return 'Sin fecha';
    const d = new Date(f + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const toggle = (f) => setExpandidos(p => ({ ...p, [f]: !p[f] }));

  const eliminarGrupo = (fecha) => {
    setFechaAEliminar(fecha);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmEliminar = async () => {
    if (!fechaAEliminar) return;
    try {
      const { error } = await supabase
        .from('historial_recorridos')
        .delete()
        .eq('fecha', fechaAEliminar);
      if (error) throw error;
      setRegistros(prev => prev.filter(r => r.fecha !== fechaAEliminar));
    } catch (e) {
      alert('❌ Error al eliminar: ' + e.message);
    } finally {
      setIsConfirmModalOpen(false);
      setFechaAEliminar(null);
    }
  };

  const exportCSV = () => {
    const rows = [['Fecha', 'Tipo Día', 'Zona', 'Localidad', 'ID Ruta', 'Pqte Día', 'Por Fuera', 'Total', 'Entregados', '%']];
    fechasFiltradas.forEach(f => {
      filasDeFecha(f).forEach(r => {
        const tot = (r.pqte_dia || 0) + (r.por_fuera || 0);
        const p = tot > 0 ? ((r.entregados || 0) / tot * 100).toFixed(1) : '0';
        rows.push([f, r.tipo_dia || '', r.zona || '', r.localidad || '', r.id_ruta || '', r.pqte_dia || 0, r.por_fuera || 0, tot, r.entregados || 0, p + '%']);
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'historial_recorridos.csv';
    a.click();
  };

  // Guardar snapshot actual de Recorridos → historial_recorridos
  const guardarEnHistorial = async () => {
    setGuardando(true);
    try {
      const { data: recorridos, error: errR } = await supabase
        .from('Recorridos')
        .select('*');
      if (errR) throw errR;
      if (!recorridos?.length) { alert('No hay recorridos para guardar'); setGuardando(false); return; }

      const hoy = new Date().toISOString().split('T')[0];
      const tipoDia = new Date().getDay() === 6 ? 'SÁBADOS' : 'SEMANA';

      const rows = recorridos.map(r => ({
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

      const { error: errI } = await supabase
        .from('historial_recorridos')
        .upsert(rows, { onConflict: 'fecha,id_ruta' });

      if (errI) throw errI;

      // Recargar
      const { data: nuevo } = await supabase
        .from('historial_recorridos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('zona', { ascending: true });
      setRegistros(nuevo || []);
      alert(`✅ ${rows.length} recorridos guardados en historial (${hoy})`);
    } catch (e) {
      alert('❌ Error: ' + e.message);
    }
    setGuardando(false);
  };

  const inp = { padding: '8px 12px', backgroundColor: c.input, border: `1px solid ${c.border}`, borderRadius: '8px', color: c.text1, fontSize: '13px', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ padding: '24px', backgroundColor: c.bg, minHeight: '100vh' }}>
      <ModalConfirmarEliminar
        isOpen={isConfirmModalOpen}
        nombre={fechaAEliminar ? `todos los registros del ${formatFecha(fechaAEliminar)}` : ''}
        onConfirm={handleConfirmEliminar}
        onCancel={() => { setIsConfirmModalOpen(false); setFechaAEliminar(null); }}
        tema={theme}
      />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#3b82f620', padding: '10px', borderRadius: '12px' }}>
            <CalendarDays size={26} color="#3b82f6" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: c.text1 }}>Historial de Recorridos</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.text2 }}>Registro histórico agrupado por fecha</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={guardarEnHistorial} disabled={guardando}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', backgroundColor: guardando ? '#475569' : '#3b82f6', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer' }}>
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar hoy'}
          </button>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', backgroundColor: '#10b981', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Días', value: stats.dias, color: '#3b82f6', icon: <CalendarDays size={16} color="#3b82f6" /> },
          { label: 'Rutas', value: stats.rutas, color: '#6366f1', icon: <Package size={16} color="#6366f1" /> },
          { label: 'Total pkgs', value: stats.total.toLocaleString(), color: '#8b5cf6', icon: <Package size={16} color="#8b5cf6" /> },
          { label: 'Entregados', value: stats.entTotal.toLocaleString(), color: '#10b981', icon: <CheckCircle size={16} color="#10b981" /> },
          { label: 'Efectividad', value: stats.pctGlobal + '%', color: pctColor(parseFloat(stats.pctGlobal)), icon: <TrendingUp size={16} color={pctColor(parseFloat(stats.pctGlobal))} /> },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '14px 16px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {s.icon}
              <span style={{ fontSize: '10px', fontWeight: '700', color: c.text2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={14} color={c.text2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar localidad o zona..." style={{ ...inp, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: c.text2, fontWeight: '600', whiteSpace: 'nowrap' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: c.text2, fontWeight: '600', whiteSpace: 'nowrap' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inp} />
        </div>
        <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          <option value="">Todas las zonas</option>
          {zonas.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          <option value="">Todos los días</option>
          <option value="SEMANA">Lunes a Viernes</option>
          <option value="SÁBADOS">Sábados</option>
        </select>
        {(busqueda || fechaDesde || fechaHasta || filtroZona || filtroTipo) && (
          <button onClick={() => { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); setFiltroZona(''); setFiltroTipo(''); }}
            style={{ padding: '8px 12px', backgroundColor: '#ef444420', border: '1px solid #ef444440', borderRadius: '8px', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Limpiar
          </button>
        )}
      </div>

      {/* LISTA */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: c.text2 }}>⏳ Cargando historial...</div>
      ) : fechasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: c.text2 }}>
          <CalendarDays size={48} style={{ opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
          <p>No hay registros para los filtros seleccionados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fechasFiltradas.map(fecha => {
            const filas = filasDeFecha(fecha);
            const totDia = filas.reduce((s, r) => s + (r.pqte_dia || 0) + (r.por_fuera || 0), 0);
            const entDia = filas.reduce((s, r) => s + (r.entregados || 0), 0);
            const pctDia = totDia > 0 ? ((entDia / totDia) * 100).toFixed(1) : '0';
            const abierto = expandidos[fecha];
            const tipoDia = filas[0]?.tipo_dia || '';

            return (
              <div key={fecha} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                {/* Cabecera: toggle + botón eliminar grupo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <button onClick={() => toggle(fecha)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pctColor(parseFloat(pctDia)), flexShrink: 0 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: c.text1, textTransform: 'capitalize' }}>{formatFecha(fecha)}</p>
                          {tipoDia && (
                            <span style={{ padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', backgroundColor: tipoDia === 'SÁBADOS' ? '#f59e0b20' : '#3b82f620', color: tipoDia === 'SÁBADOS' ? '#f59e0b' : '#3b82f6' }}>
                              {tipoDia === 'SÁBADOS' ? 'Sábado' : 'L-V'}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.text2 }}>{filas.length} rutas · {totDia} paquetes</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: pctColor(parseFloat(pctDia)) }}>{pctDia}%</p>
                        <p style={{ margin: 0, fontSize: '11px', color: c.text2 }}>{entDia}/{totDia}</p>
                      </div>
                      {abierto ? <ChevronUp size={18} color={c.text2} /> : <ChevronDown size={18} color={c.text2} />}
                    </div>
                  </button>
                  <button
                    onClick={() => eliminarGrupo(fecha)}
                    title="Eliminar todos los recorridos de este día"
                    style={{ flexShrink: 0, background: 'none', border: '1px solid #ef444430', cursor: 'pointer', color: '#ef444470', padding: '7px 9px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', transition: 'all 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#ef444415'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ef444470'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#ef444430'; }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {abierto && (
                  <div style={{ borderTop: `1px solid ${c.border}`, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: c.header }}>
                          {['ID Ruta', 'Zona', 'Localidad', 'Pqte Día', 'Por Fuera', 'Total', 'Entregados', '%'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Zona' || h === 'Localidad' ? 'left' : 'center', color: c.text2, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((r, i) => {
                          const tot = (r.pqte_dia || 0) + (r.por_fuera || 0);
                          const pct = tot > 0 ? ((r.entregados || 0) / tot * 100).toFixed(1) : '0';
                          return (
                            <tr key={r.id || i} style={{ borderTop: `1px solid ${c.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : c.row }}>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: c.text2, fontFamily: 'monospace', fontSize: '12px' }}>#{r.id_ruta || r.id}</td>
                              <td style={{ padding: '9px 12px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: '#3b82f615', color: '#3b82f6' }}>{r.zona || '—'}</span>
                              </td>
                              <td style={{ padding: '9px 12px', color: c.text1, fontWeight: '600' }}>{r.localidad || '—'}</td>
                              <td style={{ padding: '9px 12px', color: c.text1, textAlign: 'center' }}>{r.pqte_dia || 0}</td>
                              <td style={{ padding: '9px 12px', color: c.text1, textAlign: 'center' }}>{r.por_fuera || 0}</td>
                              <td style={{ padding: '9px 12px', color: c.text1, textAlign: 'center', fontWeight: '700' }}>{tot}</td>
                              <td style={{ padding: '9px 12px', color: '#10b981', textAlign: 'center', fontWeight: '700' }}>{r.entregados || 0}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', backgroundColor: `${pctColor(parseFloat(pct))}20`, color: pctColor(parseFloat(pct)) }}>{pct}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Totales del día */}
                      <tfoot>
                        <tr style={{ borderTop: `2px solid ${c.border}`, backgroundColor: c.header }}>
                          <td colSpan={3} style={{ padding: '8px 12px', fontWeight: '700', color: c.text2, fontSize: '12px' }}>TOTAL DEL DÍA</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: c.text1 }}>{filas.reduce((s, r) => s + (r.pqte_dia || 0), 0)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: c.text1 }}>{filas.reduce((s, r) => s + (r.por_fuera || 0), 0)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: c.text1 }}>{totDia}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: '#10b981' }}>{entDia}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', backgroundColor: `${pctColor(parseFloat(pctDia))}20`, color: pctColor(parseFloat(pctDia)) }}>{pctDia}%</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}