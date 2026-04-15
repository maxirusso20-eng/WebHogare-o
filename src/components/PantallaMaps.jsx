// src/components/PantallaMaps.jsx
// ──────────────────────────────────────────────────────────────────
// Mapa en tiempo real — Rastreo de camiones de la flota
// Usa: React Leaflet + MarkerClusterGroup + OpenStreetMap + Supabase Realtime
// Lee: tabla Choferes (columnas: latitud, longitud, ultima_actualizacion)
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState, useContext, memo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabase';
import { AppContext } from '../App';

// ── Los estilos del mapa (pulseGPS, spin, .icono-camion, etc.) viven
// ── en index.css — no se inyectan dinámicamente para no crear capas extra.

// ── Límites del AMBA (Área Metropolitana de Buenos Aires) ──────────────
// Cubre desde Zárate/Campana al norte hasta La Plata al sur,
// y todo el corredor Oeste hasta Luján. El usuario no puede salir de aquí.
const AMBA_BOUNDS = [[-35.5, -59.5], [-33.7, -57.5]]; // Cubre Zárate/Campana al norte
const AMBA_CENTER = [-34.65, -58.65]; // Zona Oeste — centro visual ideal
const AMBA_MIN_ZOOM = 9;              // Permite ver todo el AMBA + Zárate en una sola vista

// ──────────────────────────────────────────────────────────────────
// FIX: Leaflet pierde sus íconos default con bundlers (Vite/Webpack)
// ──────────────────────────────────────────────────────────────────
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// ──────────────────────────────────────────────────────────────────
// ÍCONOS SVG de camión — verde=activo, amarillo=lento, rojo=sin señal
// ──────────────────────────────────────────────────────────────────
const crearIconoCamion = (color = '#34D399') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="20" fill="${color}" opacity="0.2" filter="url(#sombra)"/>
      <circle cx="22" cy="22" r="16" fill="${color}"/>
      <g transform="translate(22,22)">
        <rect x="-10" y="-7" width="9" height="8" rx="2" fill="white" opacity="0.95"/>
        <rect x="1" y="-5" width="9" height="6" rx="1" fill="white" opacity="0.95"/>
        <circle cx="-7" cy="2" r="2.5" fill="rgba(0,0,0,0.7)"/>
        <circle cx="7" cy="2" r="2.5" fill="rgba(0,0,0,0.7)"/>
        <rect x="-9" y="-6" width="3" height="4" rx="1" fill="${color}" opacity="0.8"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: 'icono-camion',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Cache de íconos por estado — evita crear objetos Leaflet en cada render
// Con 100 choferes, sin esto se crearían 100 objetos nuevos por re-render.
const ICON_CACHE = {
  activo: crearIconoCamion('#34D399'),
  lento: crearIconoCamion('#F59E0B'),
  offline: crearIconoCamion('#EF4444'),
};

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
const formatTiempo = (iso) => {
  if (!iso) return 'Sin datos';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `Hace ${diff}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  return `Hace ${Math.floor(diff / 3600)} h`;
};

const getEstado = (latitud, ultimaActualizacion) => {
  if (latitud == null || !ultimaActualizacion) return 'offline';
  const diffMin = (Date.now() - new Date(ultimaActualizacion).getTime()) / 60000;
  if (diffMin > 10) return 'offline';
  if (diffMin > 3) return 'lento';
  return 'activo';
};

const COLORES_ESTADO = {
  activo: '#34D399',
  lento: '#F59E0B',
  offline: '#EF4444',
};

const LABELS_ESTADO = {
  activo: 'En ruta',
  lento: 'Sin mover',
  offline: 'Sin señal',
};

// ──────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Mueve el mapa cuando el usuario hace clic en un chofer
// ──────────────────────────────────────────────────────────────────
function FlyToMarker({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.latitud, target.longitud], 14, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// ──────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Fuerza redibujo del mapa tras colapsar/expandir panel
// ──────────────────────────────────────────────────────────────────
function MapResizer({ panelExpandido }) {
  const map = useMap();
  useEffect(() => {
    // Esperamos 250ms a que termine la transición CSS del panel (220ms)
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timeout);
  }, [map, panelExpandido]);
  return null;
}

// ──────────────────────────────────────────────────────────────────
// SUBCOMPONENTE MEMOIZADO: Ítem de la lista del panel lateral
// Sin memo → se re-renderiza 100 veces cuando cambia tick o choferSeleccionado
// Con memo → solo re-renderiza si cambian sus props
// ──────────────────────────────────────────────────────────────────
const ChoferItem = memo(({ chofer, esSeleccionado, onClick }) => {
  const estado = getEstado(chofer.latitud, chofer.ultima_actualizacion);
  const color = COLORES_ESTADO[estado];
  const tieneGPS = chofer.latitud != null;

  return (
    <button
      onClick={() => onClick(chofer)}
      style={{
        width: '100%', textAlign: 'left', padding: '10px 12px',
        marginBottom: '4px', borderRadius: '10px', border: 'none',
        background: esSeleccionado ? `${color}15` : 'transparent',
        outline: esSeleccionado ? `1.5px solid ${color}50` : 'none',
        cursor: tieneGPS ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'background 0.18s ease',
        opacity: tieneGPS ? 1 : 0.55,
      }}
      onMouseEnter={e => tieneGPS && !esSeleccionado && (e.currentTarget.style.background = `${color}10`)}
      onMouseLeave={e => !esSeleccionado && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 6px ${color}80`,
        animation: estado === 'activo' ? 'pulseGPS 2s ease-in-out infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {chofer.nombre}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color }}>{LABELS_ESTADO[estado]}</span>
          {chofer.ultima_actualizacion && (
            <span>· {formatTiempo(chofer.ultima_actualizacion)}</span>
          )}
        </div>
      </div>
      {tieneGPS && (
        <span style={{ fontSize: '12px', color: 'var(--text-3)', flexShrink: 0 }}>📍</span>
      )}
    </button>
  );
});

// ──────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────────
export function PantallaMaps() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const [choferes, setChoferes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [panelExpandido, setPanelExpandido] = useState(true);
  const [choferSeleccionado, setChoferSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // Temporizador para re-renderizar los indicadores de tiempo cada 30s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const int = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(int);
  }, []);

  // ── Carga inicial ──────────────────────────────────────────────
  const fetchChoferes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Choferes')
        .select('id, nombre, condicion, zona, latitud, longitud, ultima_actualizacion')
        .order('orden', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setChoferes(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando choferes para el mapa:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  // Refresh manual — con feedback visual en el botón
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('Choferes')
        .select('id, nombre, condicion, zona, latitud, longitud, ultima_actualizacion')
        .order('orden', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setChoferes(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error al actualizar choferes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // ── Realtime: actualización incremental ───────────────────────
  // Actualiza solo el chofer que cambió — no refetchea los 100.
  const handleRealtimeUpdate = useCallback((payload) => {
    const updated = payload.new;
    setChoferes(prev => {
      const existe = prev.find(c => c.id === updated.id);
      if (!existe) return [...prev, updated];
      return prev.map(c => c.id === updated.id ? { ...c, ...updated } : c);
    });
    setChoferSeleccionado(prev =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
    setLastUpdated(new Date()); // timestamp en cada cambio realtime
  }, []);

  useEffect(() => {
    fetchChoferes();

    const channel = supabase
      .channel('mapa-web-realtime')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Choferes' },
        handleRealtimeUpdate
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Choferes' },
        fetchChoferes
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchChoferes, handleRealtimeUpdate]);

  // ── Datos derivados ────────────────────────────────────────────
  const choferesConGPS = useMemo(() =>
    choferes.filter(c => c.latitud != null && c.longitud != null),
    [choferes]
  );

  // Búsqueda en panel — filtra sin tocar el array original
  const choferesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return choferes;
    const q = busqueda.toLowerCase();
    return choferes.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (Array.isArray(c.zona) ? c.zona.join(' ') : (c.zona || '')).toLowerCase().includes(q)
    );
  }, [choferes, busqueda]);

  const stats = useMemo(() => ({
    activos: choferes.filter(c => getEstado(c.latitud, c.ultima_actualizacion) === 'activo').length,
    lentos: choferes.filter(c => getEstado(c.latitud, c.ultima_actualizacion) === 'lento').length,
    offline: choferes.filter(c => getEstado(c.latitud, c.ultima_actualizacion) === 'offline').length,
    total: choferes.length,
  }), [choferes, tick]);

  // ── Marcadores memorizados ─────────────────────────────────────
  // Con 100 choferes, sin useMemo se recrearían 100 <Marker> en cada tick
  // o cada vez que uno solo cambia. Así solo se recalcula si cambia la lista.
  const marcadores = useMemo(() =>
    choferesConGPS.map(chofer => {
      const estado = getEstado(chofer.latitud, chofer.ultima_actualizacion);
      const color = COLORES_ESTADO[estado];
      const icono = ICON_CACHE[estado]; // ícono reutilizado del cache, no recreado
      const zonaStr = Array.isArray(chofer.zona)
        ? chofer.zona.join(', ')
        : (chofer.zona || '—');

      return (
        <Marker
          key={chofer.id}
          position={[Number(chofer.latitud), Number(chofer.longitud)]}
          icon={icono}
          eventHandlers={{
            click: () => setChoferSeleccionado(chofer),
          }}
        >
          <Popup>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              minWidth: '180px', padding: '4px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: color, boxShadow: `0 0 6px ${color}`,
                  flexShrink: 0,
                }} />
                <strong style={{ fontSize: '14px' }}>{chofer.nombre}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                <div>🚦 {LABELS_ESTADO[estado]}</div>
                <div>📦 {chofer.condicion || '—'}</div>
                <div>📍 {zonaStr}</div>
                <div>⏱️ {formatTiempo(chofer.ultima_actualizacion)}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '4px', color: '#94a3b8' }}>
                  {Number(chofer.latitud).toFixed(5)}°S, {Number(chofer.longitud).toFixed(5)}°O
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [choferesConGPS] // tick no está acá a propósito: los popups no necesitan actualizarse cada 30s
  );

  const handleClickChofer = useCallback((chofer) => {
    setChoferSeleccionado(chofer);
    if (chofer.latitud != null && chofer.longitud != null) {
      setFlyTarget({ latitud: chofer.latitud, longitud: chofer.longitud });
    }
  }, []);

  if (cargando) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', minHeight: '400px',
        background: 'var(--bg-page)', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', border: '3px solid var(--border)',
          borderTop: '3px solid #3b82f6', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>Conectando con la flota...</p>
      </div>
    );
  }

  return (
    <div className="pantalla-maps" style={{
      display: 'flex', height: '100%',
      background: 'var(--bg-page)', position: 'relative', overflow: 'hidden',
    }}>
      {/* ── PANEL LATERAL IZQUIERDO ── */}
      <div style={{
        width: panelExpandido ? '300px' : '56px',
        minWidth: panelExpandido ? '300px' : '56px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1)',
        zIndex: 10,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Header del panel */}
        <div style={{
          padding: panelExpandido ? '16px' : '12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: panelExpandido ? 'space-between' : 'center',
          gap: '8px',
        }}>
          {panelExpandido && (
            <div>
              <h2 style={{
                margin: 0, fontSize: '16px', fontWeight: '700',
                color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                🚛 Flota en vivo
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
                {choferes.length} choferes registrados
              </p>
            </div>
          )}
          <button
            onClick={() => setPanelExpandido(!panelExpandido)}
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: 'var(--text-2)', display: 'flex', alignItems: 'center',
              transition: 'opacity 120ms ease, transform 120ms ease', flexShrink: 0,
            }}
            title={panelExpandido ? 'Colapsar panel' : 'Expandir panel'}
          >
            {panelExpandido ? '◀' : '▶'}
          </button>
        </div>

        {/* Stats rápidas */}
        {panelExpandido && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px', padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            {[
              { label: 'En ruta', valor: stats.activos, color: '#34D399' },
              { label: 'Sin mover', valor: stats.lentos, color: '#F59E0B' },
              { label: 'Sin señal', valor: stats.offline, color: '#EF4444' },
            ].map(({ label, valor, color }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '10px 4px',
                background: 'var(--bg-raised)', borderRadius: '10px',
                border: `1px solid ${color}30`,
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color, lineHeight: 1 }}>
                  {valor}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontWeight: '600' }}>
                  {label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buscador — aparece solo cuando hay más de 10 choferes */}
        {panelExpandido && choferes.length > 10 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Buscar chofer o zona..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', boxSizing: 'border-box',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-1)', fontSize: '12px',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        )}

        {/* Lista de choferes */}
        {panelExpandido && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {choferesFiltrados.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px',
                color: 'var(--text-3)', fontSize: '13px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {busqueda ? '🔍' : '📡'}
                </div>
                {busqueda
                  ? `Sin resultados para "${busqueda}"`
                  : 'Ningún chofer ha compartido su ubicación aún'
                }
              </div>
            ) : (
              choferesFiltrados.map(chofer => (
                <ChoferItem
                  key={chofer.id}
                  chofer={chofer}
                  esSeleccionado={choferSeleccionado?.id === chofer.id}
                  onClick={handleClickChofer}
                />
              ))
            )}
          </div>
        )}

        {/* Botón de refresh */}
        {panelExpandido && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                width: '100%', padding: '8px',
                background: isRefreshing ? '#3b82f6' : 'var(--bg-raised)',
                border: `1px solid ${isRefreshing ? '#3b82f6' : 'var(--border)'}`,
                borderRadius: '8px',
                color: isRefreshing ? '#fff' : 'var(--text-2)',
                fontSize: '12px', fontWeight: '600',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.2s',
                opacity: isRefreshing ? 0.85 : 1,
              }}
              onMouseEnter={e => { if (!isRefreshing) e.currentTarget.style.borderColor = '#3b82f6'; }}
              onMouseLeave={e => { if (!isRefreshing) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{
                display: 'inline-block',
                animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                fontSize: '14px',
              }}>🔄</span>
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </button>

            {/* Timestamp de última actualización */}
            {lastUpdated && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '5px', marginTop: '8px',
                fontSize: '11px', color: 'var(--text-3)',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#34D399', flexShrink: 0,
                  boxShadow: '0 0 4px #34D399',
                  animation: 'pulseGPS 2s ease-in-out infinite',
                }} />
                Actualizado {formatTiempo(lastUpdated.toISOString())}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MAPA ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Header flotante sobre el mapa */}
        <div style={{
          position: 'absolute', top: '16px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none',
          background: 'rgba(13, 21, 38, 0.98)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '16px', padding: '8px 20px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#34D399', boxShadow: '0 0 8px #34D399',
            animation: 'pulseGPS 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
            {stats.activos} camión{stats.activos !== 1 ? 'es' : ''} en ruta
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            · Mapa en tiempo real
          </span>
        </div>

        <MapContainer
          center={AMBA_CENTER}
          zoom={11}
          minZoom={AMBA_MIN_ZOOM}
          maxBounds={AMBA_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url={isDark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />

          {/* ClusterGroup agrupa pines cercanos al hacer zoom out */}
          <MarkerClusterGroup
            chunkedLoading            // carga los 100 markers sin bloquear el hilo
            maxClusterRadius={60}     // píxeles de radio para agrupar
            showCoverageOnHover={false}
          >
            {marcadores}
          </MarkerClusterGroup>

          {/* Zoom control en la esquina inferior derecha — lejos del sidebar */}
          <ZoomControl position="bottomright" />

          {flyTarget && <FlyToMarker target={flyTarget} />}
          <MapResizer panelExpandido={panelExpandido} />
        </MapContainer>

        {/* Badge sin GPS eliminado — la info ya se refleja en el panel lateral */}

        {/* Estado vacío */}
        {choferesConGPS.length === 0 && !cargando && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000, textAlign: 'center',
            background: 'rgba(13,21,38,0.98)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '20px', padding: '32px 40px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📡</div>
            <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '18px' }}>
              Sin camiones en el mapa
            </h3>
            <p style={{ margin: 0, color: '#4A6FA5', fontSize: '13px', maxWidth: '260px' }}>
              Cuando un chofer abra la app en su celular y comparta su ubicación, aparecerá aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}