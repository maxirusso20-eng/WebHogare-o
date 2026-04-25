import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { Users, Clock, Search, Download, ChevronDown, ChevronUp, Phone, CalendarDays, Save, Trash2 } from 'lucide-react';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

export function PantallaHistorialClientes() {
    const { theme } = useContext(AppContext);
    const isDark = theme === 'dark';

    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
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

    // Columnas reales: id, fecha, tipo_dia, cliente_id, cliente_nombre,
    //                  chofer, horario_programado, hora_llegada, direccion, created_at
    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('historial_clientes')
                .select('*')
                .order('fecha', { ascending: false })
                .order('cliente_nombre', { ascending: true });
            if (!error) setRegistros(data || []);
            setLoading(false);
        };
        cargar();
    }, []);

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

    const filasDeFecha = (fecha) => {
        let rows = porFecha[fecha] || [];
        if (filtroTipo) rows = rows.filter(r => r.tipo_dia === filtroTipo);
        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            rows = rows.filter(r =>
                (r.cliente_nombre || '').toLowerCase().includes(q) ||
                (r.chofer || '').toLowerCase().includes(q) ||
                (r.direccion || '').toLowerCase().includes(q) ||
                (r.horario_programado || '').toLowerCase().includes(q)
            );
        }
        return rows;
    };

    const fechasFiltradas = useMemo(() => {
        let fechas = Object.keys(porFecha);
        if (fechaDesde) fechas = fechas.filter(f => f >= fechaDesde);
        if (fechaHasta) fechas = fechas.filter(f => f <= fechaHasta);
        if (filtroTipo) fechas = fechas.filter(f => porFecha[f].some(r => r.tipo_dia === filtroTipo));
        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            fechas = fechas.filter(f =>
                porFecha[f].some(r =>
                    (r.cliente_nombre || '').toLowerCase().includes(q) ||
                    (r.chofer || '').toLowerCase().includes(q) ||
                    (r.direccion || '').toLowerCase().includes(q)
                )
            );
        }
        return fechas.sort((a, b) => b.localeCompare(a));
    }, [porFecha, fechaDesde, fechaHasta, filtroTipo, busqueda]);

    const formatFecha = (f) => {
        if (!f || f === 'Sin fecha') return 'Sin fecha';
        const d = new Date(f + 'T12:00:00');
        return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatHora = (h) => {
        if (!h) return '—';
        // Si viene como HH:MM:SS, recortar
        return h.length > 5 ? h.slice(0, 5) : h;
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
                .from('historial_clientes')
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
        const rows = [['Fecha', 'Tipo Día', 'Cliente ID', 'Cliente Nombre', 'Chofer', 'Horario Programado', 'Hora Llegada', 'Dirección']];
        fechasFiltradas.forEach(f => {
            filasDeFecha(f).forEach(r => {
                rows.push([f, r.tipo_dia || '', r.cliente_id || '', r.cliente_nombre || '', r.chofer || '', r.horario_programado || '', r.hora_llegada || '', `"${r.direccion || ''}"`]);
            });
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'historial_clientes.csv';
        a.click();
    };

    // Guardar snapshot de Clientes → historial_clientes
    const guardarEnHistorial = async () => {
        setGuardando(true);
        try {
            const { data: clientes, error: errC } = await supabase
                .from('Clientes')
                .select('*');
            if (errC) throw errC;
            if (!clientes?.length) { alert('No hay clientes para guardar'); setGuardando(false); return; }

            const hoy = new Date().toISOString().split('T')[0];
            const tipoDia = new Date().getDay() === 6 ? 'SÁBADOS' : 'SEMANA';

            const rows = clientes.map(c => ({
                fecha: hoy,
                tipo_dia: c.tipo_dia || tipoDia,
                cliente_id: c.id,
                cliente_nombre: c.cliente || '',
                chofer: c.chofer || '',
                horario_programado: c.horario || '',
                hora_llegada: null,
                direccion: c.direccion || '',
            }));

            const { error: errI } = await supabase
                .from('historial_clientes')
                .upsert(rows, { onConflict: 'fecha,cliente_id' });

            if (errI) throw errI;

            const { data: nuevo } = await supabase
                .from('historial_clientes')
                .select('*')
                .order('fecha', { ascending: false })
                .order('cliente_nombre', { ascending: true });
            setRegistros(nuevo || []);
            alert(`✅ ${rows.length} clientes guardados en historial (${hoy})`);
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
                    <div style={{ background: '#8b5cf620', padding: '10px', borderRadius: '12px' }}>
                        <Users size={26} color="#8b5cf6" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: c.text1 }}>Historial de Clientes</h1>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.text2 }}>Registro de visitas y horarios por fecha</p>
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

            {/* FILTROS */}
            <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={14} color={c.text2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente, chofer, dirección..." style={{ ...inp, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: c.text2, fontWeight: '600', whiteSpace: 'nowrap' }}>Desde</label>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inp} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: c.text2, fontWeight: '600', whiteSpace: 'nowrap' }}>Hasta</label>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inp} />
                </div>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">Todos los días</option>
                    <option value="SEMANA">Lunes a Viernes</option>
                    <option value="SÁBADOS">Sábados</option>
                </select>
                {(busqueda || fechaDesde || fechaHasta || filtroTipo) && (
                    <button onClick={() => { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); setFiltroTipo(''); }}
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
                    <Users size={48} style={{ opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
                    <p>No hay registros para los filtros seleccionados</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fechasFiltradas.map(fecha => {
                        const filas = filasDeFecha(fecha);
                        if (!filas.length) return null;
                        const abierto = expandidos[fecha];
                        const tipoDia = filas[0]?.tipo_dia || '';

                        return (
                            <div key={fecha} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                                {/* Cabecera: toggle + botón eliminar grupo */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                                    <button onClick={() => toggle(fecha)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <CalendarDays size={18} color="#8b5cf6" />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: c.text1, textTransform: 'capitalize' }}>{formatFecha(fecha)}</p>
                                                    {tipoDia && (
                                                        <span style={{ padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', backgroundColor: tipoDia === 'SÁBADOS' ? '#f59e0b20' : '#3b82f620', color: tipoDia === 'SÁBADOS' ? '#f59e0b' : '#3b82f6' }}>
                                                            {tipoDia === 'SÁBADOS' ? 'Sábado' : 'L-V'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.text2 }}>{filas.length} clientes registrados</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '12px' }}>
                                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#8b5cf6' }}>{filas.length}</span>
                                            {abierto ? <ChevronUp size={18} color={c.text2} /> : <ChevronDown size={18} color={c.text2} />}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => eliminarGrupo(fecha)}
                                        title="Eliminar todos los registros de este día"
                                        style={{ flexShrink: 0, background: 'none', border: '1px solid #ef444430', cursor: 'pointer', color: '#ef444470', padding: '7px 9px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', transition: 'all 150ms' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#ef444415'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = '#ef444470'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#ef444430'; }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>

                                {/* Tabla */}
                                {abierto && (
                                    <div style={{ borderTop: `1px solid ${c.border}`, overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: c.header }}>
                                                    {['ID', 'Cliente', 'Chofer', 'Horario Prog.', 'Hora Llegada', 'Dirección'].map(h => (
                                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.text2, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filas.map((r, i) => {
                                                    const llegó = r.hora_llegada;
                                                    const prog = r.horario_programado;
                                                    // Detectar si llegó tarde (simple comparación de strings HH:MM)
                                                    const tarde = llegó && prog && llegó.slice(0, 5) > prog.slice(0, 5);
                                                    return (
                                                        <tr key={r.id || i} style={{ borderTop: `1px solid ${c.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : c.row }}>
                                                            <td style={{ padding: '9px 12px', color: c.text2, fontFamily: 'monospace', fontSize: '11px' }}>#{r.cliente_id || '—'}</td>
                                                            <td style={{ padding: '9px 12px', fontWeight: '700', color: c.text1, whiteSpace: 'nowrap' }}>{r.cliente_nombre || '—'}</td>
                                                            <td style={{ padding: '9px 12px', color: c.text2, whiteSpace: 'nowrap' }}>{r.chofer || '—'}</td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {prog
                                                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: c.text2 }}><Clock size={11} /> {formatHora(prog)}</span>
                                                                    : <span style={{ color: c.text2 }}>—</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {llegó
                                                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: tarde ? '#ef4444' : '#10b981' }}>
                                                                        <Clock size={11} /> {formatHora(llegó)}
                                                                        {tarde && <span style={{ fontSize: '10px', fontWeight: '700' }}>↑ tarde</span>}
                                                                    </span>
                                                                    : <span style={{ color: c.text2 }}>—</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: '9px 12px', color: c.text2, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.direccion || ''}>
                                                                {r.direccion || '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
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