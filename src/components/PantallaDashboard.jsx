import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import {
    Package, CheckCircle, TrendingUp, Users, AlertTriangle,
    MapPin, ArrowRight, Activity, Clock, Truck, BarChart2,
} from 'lucide-react';

const ZONAS = ['ZONA OESTE', 'ZONA SUR', 'ZONA NORTE', 'CABA'];
const ZONA_COLORS = {
    'ZONA OESTE': '#3b82f6',
    'ZONA SUR': '#8b5cf6',
    'ZONA NORTE': '#ec4899',
    'CABA': '#06b6d4',
};

function getPctColor(pct) {
    const n = parseFloat(pct);
    if (n >= 100) return '#10b981';
    if (n >= 80) return '#06b6d4';
    if (n >= 50) return '#f59e0b';
    return '#ef4444';
}

export function PantallaDashboard() {
    const { colectas, choferes, clientes, theme, setCurrentPage, setShowSplash } = useContext(AppContext);
    const [colectasSabados, setColectasSabados] = useState([]);
    const [tabDashboard, setTabDashboard] = useState('LUNES A VIERNES');
    const [choferesActivos, setChoferesActivos] = useState(0);
    const [historialSemana, setHistorialSemana] = useState([]);

    const isDark = theme === 'dark';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const pageBg = isDark ? '#020617' : '#f1f5f9';
    const border = isDark ? '#334155' : '#e2e8f0';
    const text1 = isDark ? '#f1f5f9' : '#0f172a';
    const text2 = isDark ? '#94a3b8' : '#64748b';
    const raisedBg = isDark ? '#0f172a' : '#f8fafc';

    // ── Cargar datos ─────────────────────────────────────────────
    useEffect(() => {
        const fetchSabados = async () => {
            const { data } = await supabase.from('recorridos_sabados').select('*').order('orden', { ascending: true });
            setColectasSabados(data || []);
        };
        fetchSabados();

        const canal = supabase.channel('dashboard:sabados')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recorridos_sabados' }, fetchSabados)
            .subscribe();
        return () => supabase.removeChannel(canal);
    }, []);

    // ── Choferes activos (última actualización < 30 min) ─────────
    useEffect(() => {
        const calcActivos = () => {
            const ahora = Date.now();
            const activos = choferes.filter(c => {
                if (!c.ultima_actualizacion) return false;
                const diff = (ahora - new Date(c.ultima_actualizacion).getTime()) / 60000;
                return diff < 30;
            }).length;
            setChoferesActivos(activos);
        };
        calcActivos();
        const int = setInterval(calcActivos, 30000);
        return () => clearInterval(int);
    }, [choferes]);

    // ── Historial últimos 7 días para el gráfico ─────────────────
    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const hace7 = new Date();
                hace7.setDate(hace7.getDate() - 6);
                const { data } = await supabase
                    .from('historial')
                    .select('fecha, entregados, pqte_dia, por_fuera')
                    .gte('fecha', hace7.toISOString().split('T')[0])
                    .order('fecha', { ascending: true });

                if (!data) return;

                // Agrupar por fecha
                const porFecha = {};
                data.forEach(r => {
                    if (!porFecha[r.fecha]) porFecha[r.fecha] = { entregados: 0, total: 0 };
                    porFecha[r.fecha].entregados += r.entregados || 0;
                    porFecha[r.fecha].total += (r.pqte_dia || 0) + (r.por_fuera || 0);
                });

                // Rellenar los 7 días aunque no haya data
                const dias = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
                    dias.push({ key, label, ...(porFecha[key] || { entregados: 0, total: 0 }) });
                }
                setHistorialSemana(dias);
            } catch (e) { }
        };
        fetchHistorial();
    }, []);

    // ── Métricas ─────────────────────────────────────────────────
    const datosActivos = tabDashboard === 'SÁBADOS' ? colectasSabados : colectas;
    const totalPaquetes = datosActivos.reduce((s, c) => s + (c.pqteDia || 0) + (c.porFuera || 0), 0);
    const totalEntregados = datosActivos.reduce((s, c) => s + (c.entregados || 0) + (c.entregadosFuera || 0), 0);
    const pctGlobal = totalPaquetes > 0 ? ((totalEntregados / totalPaquetes) * 100).toFixed(1) : 0;
    const rutasSinChofer = datosActivos.filter(c => !c.idChofer || c.idChofer === 0);
    const clientesSemana = clientes.filter(c => c.tipo_dia !== 'SÁBADOS');
    const clientesSabados = clientes.filter(c => c.tipo_dia === 'SÁBADOS');

    const maxHistorial = useMemo(() => Math.max(...historialSemana.map(d => d.total), 1), [historialSemana]);

    const statCards = [
        {
            label: 'Paquetes hoy',
            value: totalPaquetes,
            icon: Package,
            color: '#3b82f6',
            sub: `${totalEntregados} entregados`,
        },
        {
            label: 'Completado',
            value: pctGlobal + '%',
            icon: TrendingUp,
            color: getPctColor(pctGlobal),
            sub: tabDashboard,
        },
        {
            label: 'Choferes en ruta',
            value: choferesActivos,
            icon: Truck,
            color: '#10b981',
            sub: `de ${choferes.length} totales`,
            live: true,
        },
        {
            label: 'Clientes',
            value: tabDashboard === 'SÁBADOS' ? clientesSabados.length : clientesSemana.length,
            icon: Users,
            color: '#f59e0b',
            sub: tabDashboard === 'SÁBADOS' ? 'Sábados' : 'Lunes a Viernes',
        },
    ];

    return (
        <div style={{ padding: '24px', backgroundColor: pageBg, minHeight: '100vh' }}>
            <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.85); }
        }
        .dash-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .dash-card:hover { transform: translateY(-3px); }
        .zona-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .zona-card:hover { transform: translateY(-2px); }
        .bar-fill { transition: height 0.6s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: text1, letterSpacing: '-0.5px' }}>
                        Dashboard
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: text2 }}>
                        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '6px', background: raisedBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '4px' }}>
                    {['LUNES A VIERNES', 'SÁBADOS'].map(tab => (
                        <button key={tab} onClick={() => {
                            if (tabDashboard !== tab) {
                                setShowSplash(true);
                                setTabDashboard(tab);
                                setTimeout(() => setShowSplash(false), 1200);
                            }
                        }} style={{
                            padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: '700', transition: 'all 0.15s',
                            background: tabDashboard === tab ? (isDark ? '#1e293b' : '#fff') : 'transparent',
                            color: tabDashboard === tab ? '#3b82f6' : text2,
                            boxShadow: tabDashboard === tab ? (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.1)') : 'none',
                        }}>
                            {tab === 'LUNES A VIERNES' ? 'L-V' : 'Sábados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {statCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="dash-card" style={{
                            background: cardBg, border: `1px solid ${border}`,
                            borderRadius: '16px', padding: '20px',
                            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            {/* Accent top */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: card.color, borderRadius: '16px 16px 0 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={20} color={card.color} />
                                </div>
                                {card.live && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'livePulse 1.5s ease-in-out infinite' }} />
                                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: card.color, lineHeight: 1, marginBottom: '4px' }}>
                                {card.value}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: text1, marginBottom: '2px' }}>{card.label}</div>
                            <div style={{ fontSize: '11px', color: text2 }}>{card.sub}</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

                {/* Gráfico semanal */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <BarChart2 size={18} color="#3b82f6" />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: text1 }}>Entregas últimos 7 días</h3>
                    </div>
                    {historialSemana.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: text2, fontSize: '13px' }}>Sin datos de historial aún</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
                            {historialSemana.map((dia, i) => {
                                const pct = dia.total > 0 ? (dia.entregados / dia.total) : 0;
                                const heightPct = dia.total > 0 ? Math.max((dia.total / maxHistorial) * 100, 6) : 4;
                                const isHoy = i === historialSemana.length - 1;
                                return (
                                    <div key={dia.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }} title={`${dia.entregados}/${dia.total} paquetes`}>
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: `${heightPct}%`, position: 'relative' }}>
                                            {/* Barra total */}
                                            <div className="bar-fill" style={{ width: '100%', height: '100%', borderRadius: '6px 6px 0 0', background: isDark ? '#1e293b' : '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                                                {/* Barra entregados */}
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct * 100}%`, background: isHoy ? '#3b82f6' : getPctColor(pct * 100), borderRadius: '6px 6px 0 0', transition: 'height 0.6s ease' }} />
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '10px', color: isHoy ? '#3b82f6' : text2, fontWeight: isHoy ? '700' : '500', textAlign: 'center', lineHeight: 1.2 }}>{dia.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Leyenda */}
                    <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
                            <span style={{ fontSize: '11px', color: text2 }}>100%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
                            <span style={{ fontSize: '11px', color: text2 }}>50–80%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
                            <span style={{ fontSize: '11px', color: text2 }}>&lt;50%</span>
                        </div>
                    </div>
                </div>

                {/* Choferes en ruta ahora */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} color="#10b981" />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: text1 }}>En ruta ahora</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'livePulse 1.5s ease-in-out infinite' }} />
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>LIVE</span>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {choferes
                            .filter(c => c.ultima_actualizacion && (Date.now() - new Date(c.ultima_actualizacion).getTime()) / 60000 < 30)
                            .slice(0, 6)
                            .map(c => {
                                const diffMin = Math.floor((Date.now() - new Date(c.ultima_actualizacion).getTime()) / 60000);
                                const zColor = ZONA_COLORS[c.zona] || '#64748b';
                                return (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: raisedBg, border: `1px solid ${border}` }}>
                                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${zColor}18`, border: `1.5px solid ${zColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Truck size={15} color={zColor} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</p>
                                            <p style={{ margin: 0, fontSize: '11px', color: text2 }}>{c.zona || 'Sin zona'}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                            <Clock size={11} color={text2} />
                                            <span style={{ fontSize: '11px', color: text2 }}>{diffMin}m</span>
                                        </div>
                                    </div>
                                );
                            })}
                        {choferesActivos === 0 && (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: text2, fontSize: '13px' }}>
                                <Truck size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.2, color: text2 }} />
                                Sin choferes activos en este momento
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resumen por zona */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: text1 }}>Resumen por zona</h2>
                    <button onClick={() => setCurrentPage('recorridos')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        Ver recorridos <ArrowRight size={14} />
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {ZONAS.map(zona => {
                        const items = datosActivos.filter(c => c.zona === zona);
                        const pqtes = items.reduce((s, c) => s + (c.pqteDia || 0) + (c.porFuera || 0), 0);
                        const entregados = items.reduce((s, c) => s + (c.entregados || 0) + (c.entregadosFuera || 0), 0);
                        const pct = pqtes > 0 ? ((entregados / pqtes) * 100).toFixed(1) : 0;
                        const color = ZONA_COLORS[zona];
                        const sinChofer = items.filter(c => !c.idChofer || c.idChofer === 0).length;
                        return (
                            <div key={zona} className="zona-card" onClick={() => setCurrentPage('recorridos')} style={{
                                background: cardBg, border: `1px solid ${border}`,
                                borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '16px',
                                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{zona}</span>
                                    <span style={{ fontSize: '22px', fontWeight: '800', color: getPctColor(pct) }}>{pct}%</span>
                                </div>
                                <div style={{ height: '5px', borderRadius: '3px', background: isDark ? '#334155' : '#e2e8f0', marginBottom: '10px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: getPctColor(pct), borderRadius: '3px', transition: 'width 0.6s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: text2 }}>
                                    <span>{entregados}/{pqtes} pqtes</span>
                                    <span>{items.length} rutas</span>
                                </div>
                                {sinChofer > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle size={11} /> {sinChofer} sin chofer
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Alerta rutas sin chofer */}
            {rutasSinChofer.length > 0 && (
                <div style={{ background: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '4px solid #ef4444', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
                                {rutasSinChofer.length} ruta{rutasSinChofer.length > 1 ? 's' : ''} sin chofer asignado
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: text2 }}>
                                {rutasSinChofer.slice(0, 4).map(r => r.localidad).join(', ')}{rutasSinChofer.length > 4 ? ` y ${rutasSinChofer.length - 4} más` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setCurrentPage('recorridos')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        Ir a Recorridos <ArrowRight size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}