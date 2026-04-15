// src/components/PantallaRuteador.jsx
// ─────────────────────────────────────────────────────────────────────────
// Panel de ruteo dinámico para choferes.
// • Escanear QR (html5-qrcode) o ingresar dirección manual → geocodificar (ORS)
// • Optimizar orden: ORS TSP (red vial real) con fallback a vecino más cercano
// • Guardar en Supabase (rutas_activas) → el admin las ve en PantallaMaps
// • Fin de jornada: DELETE en rutas_activas del chofer
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useContext, memo } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, ZoomControl, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppContext } from '../App';
import { useRuteador } from '../hooks/useRuteador';

// ── Bounds del AMBA ───────────────────────────────────────────────────────
const AMBA_BOUNDS  = [[-35.5, -59.5], [-33.7, -57.5]];
const AMBA_CENTER  = [-34.65, -58.65];

// ── Íconos Leaflet ────────────────────────────────────────────────────────
const crearIconoParada = (numero, estado) =>
  L.divIcon({
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${estado === 'entregado' ? '#10b981' : '#3b82f6'};
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:800;letter-spacing:-0.5px;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2.5px solid #fff;
      opacity:${estado === 'entregado' ? '0.65' : '1'};
    ">${numero}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });

const ICONO_GPS = L.divIcon({
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:#60a5fa;border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(96,165,250,0.35),0 2px 8px rgba(0,0,0,0.25);
  "></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ── AjustarVista: re-centra el mapa cuando cambia la lista de paradas ─────
function AjustarVista({ paradas }) {
  const map = useMap();
  useEffect(() => {
    if (!paradas.length) return;
    if (paradas.length === 1) {
      map.flyTo([paradas[0].lat, paradas[0].lng], 14, { duration: 0.8 });
      return;
    }
    map.flyToBounds(
      paradas.map(p => [p.lat, p.lng]),
      { padding: [48, 48], maxZoom: 15, duration: 0.8 }
    );
  }, [paradas.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Mapa de la ruta ───────────────────────────────────────────────────────
const MapaRuteador = memo(({ paradas, miUbicacion, isDark }) => {
  const coords = paradas.map(p => [p.lat, p.lng]);
  return (
    <MapContainer
      center={AMBA_CENTER}
      zoom={11}
      minZoom={9}
      maxBounds={AMBA_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>'
        url={
          isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        }
      />

      {/* Polilínea de la ruta */}
      {coords.length > 1 && (
        <Polyline
          positions={coords}
          color="#3b82f6"
          weight={3}
          opacity={0.75}
          dashArray="10, 7"
        />
      )}

      {/* Marcadores numerados */}
      {paradas.map((p, i) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={crearIconoParada(i + 1, p.estado)}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', padding: '2px', minWidth: '160px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                Parada {i + 1}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                {p.displayName || p.direccion}
              </div>
              <span style={{
                display: 'inline-block', marginTop: '8px', padding: '2px 10px',
                borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                background: p.estado === 'entregado' ? '#dcfce7' : '#dbeafe',
                color: p.estado === 'entregado' ? '#15803d' : '#1d4ed8',
              }}>
                {p.estado === 'entregado' ? '✓ Entregado' : '⏳ Pendiente'}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Ubicación actual del chofer */}
      {miUbicacion && (
        <Marker position={[miUbicacion.lat, miUbicacion.lng]} icon={ICONO_GPS}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
              📍 Tu ubicación actual
            </div>
          </Popup>
        </Marker>
      )}

      <AjustarVista paradas={paradas} />
      <ZoomControl position="bottomright" />
    </MapContainer>
  );
});

// ── Modal Escáner QR ──────────────────────────────────────────────────────
function ModalEscaner({ onCerrar, onDetectado }) {
  const scannerRef    = useRef(null);
  const [listo, setListo]         = useState(false);
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const iniciar = async () => {
      try {
        // Importación dinámica — falla limpiamente si no está instalado
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        if (!mounted) return;

        scannerRef.current = new Html5QrcodeScanner(
          'qr-ruteador-reader',
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          false
        );

        scannerRef.current.render(
          async (decoded) => {
            // El QR puede ser dirección directa o JSON con campo "direccion"
            let direccion = decoded;
            try {
              const parsed = JSON.parse(decoded);
              if (parsed.direccion) direccion = parsed.direccion;
              else if (parsed.address) direccion = parsed.address;
            } catch (_) { /* no es JSON — usar texto tal cual */ }

            if (scannerRef.current) {
              await scannerRef.current.clear().catch(() => {});
              scannerRef.current = null;
            }
            onDetectado(direccion);
          },
          () => {} // ignorar errores de frame (es normal durante escaneo)
        );
        if (mounted) setListo(true);
      } catch (e) {
        if (mounted) setScanError('Instalá la dependencia con: npm install html5-qrcode');
      }
    };

    iniciar();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '20px',
        padding: '24px', width: '340px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-1)' }}>
            📷 Escanear QR de paquete
          </h3>
          <button
            onClick={onCerrar}
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: '13px', fontWeight: 600,
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {scanError ? (
          <div style={{
            padding: '16px', background: 'rgba(239,68,68,0.08)',
            borderRadius: '10px', color: '#ef4444',
            fontSize: '13px', textAlign: 'center', lineHeight: 1.6,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {scanError}
          </div>
        ) : (
          <div id="qr-ruteador-reader" style={{ borderRadius: '12px', overflow: 'hidden' }} />
        )}

        {!listo && !scanError && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontSize: '13px' }}>
            ⏳ Iniciando cámara...
          </div>
        )}

        <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-3)', textAlign: 'center' }}>
          Apuntá la cámara al código QR del paquete
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export function PantallaRuteador() {
  const { theme, session } = useContext(AppContext);
  const isDark    = theme === 'dark';
  const choferId  = session?.user?.id ?? null;

  const {
    paradas, cargando, geocodificando, optimizando, error, sincronizado, modoFallback,
    agregarDireccion, eliminarParada, toggleEntregado,
    aplicarOptimizacion, guardarRuta, limpiarMapa,
    cargarRuta, setError,
  } = useRuteador(choferId);

  const [inputDir,           setInputDir]           = useState('');
  const [mostrandoScanner,   setMostrandoScanner]   = useState(false);
  const [confirmLimpiar,     setConfirmLimpiar]     = useState(false);
  const [miUbicacion,        setMiUbicacion]        = useState(null);
  const inputRef = useRef(null);

  // Cargar ruta existente y obtener GPS al montar
  useEffect(() => {
    cargarRuta();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMiUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // permiso denegado — sin problema
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAgregar = useCallback(async () => {
    if (!inputDir.trim()) return;
    await agregarDireccion(inputDir);
    setInputDir('');
    inputRef.current?.focus();
  }, [inputDir, agregarDireccion]);

  const handleOptimizar = () => {
    if (paradas.length < 2) return;
    aplicarOptimizacion(miUbicacion ?? { lat: -34.65, lng: -58.65 });
  };

  // Stats rápidas
  const entregados = paradas.filter(p => p.estado === 'entregado').length;
  const pendientes  = paradas.length - entregados;

  // Estilo del panel lateral según tema
  const panelBg = isDark
    ? 'linear-gradient(160deg, #0f172a 0%, #080e1a 100%)'
    : 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)';

  return (
    <div
      className="pantalla-ruteador"
      style={{ display: 'flex', height: '100%', overflow: 'hidden' }}
    >
      {/* ── Modal QR ─────────────────────────────────────────────── */}
      {mostrandoScanner && (
        <ModalEscaner
          onCerrar={() => setMostrandoScanner(false)}
          onDetectado={async (dir) => {
            setMostrandoScanner(false);
            await agregarDireccion(dir);
          }}
        />
      )}

      {/* ── Modal confirmar limpiar ───────────────────────────────── */}
      {confirmLimpiar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '20px',
            padding: '32px', width: '340px', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-1)', fontSize: '18px', fontWeight: 800 }}>
              ¿Terminar la jornada?
            </h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6 }}>
              Se eliminarán las {paradas.length} parada{paradas.length !== 1 ? 's' : ''} del panel del administrador. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmLimpiar(false)}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  color: 'var(--text-2)', fontWeight: 700, fontSize: '13px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await limpiarMapa(); setConfirmLimpiar(false); }}
                disabled={cargando}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
                  background: '#ef4444', border: 'none',
                  color: '#fff', fontWeight: 800, fontSize: '13px',
                  opacity: cargando ? 0.65 : 1,
                }}
              >
                {cargando ? 'Limpiando...' : '🗑️ Limpiar mapa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel lateral ─────────────────────────────────────────── */}
      <div style={{
        width: '300px', minWidth: '300px',
        background: panelBg,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 10,
      }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-1)' }}>
            🛻 Mi Ruta del Día
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {paradas.length > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '99px',
                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
              }}>
                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              </span>
            )}
            {entregados > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '99px',
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
              }}>
                {entregados} entregado{entregados !== 1 ? 's' : ''}
              </span>
            )}
            {paradas.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                Sin paradas aún
              </span>
            )}
          </div>
        </div>

        {/* Input de dirección */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Av. Corrientes 1234, CABA…"
              value={inputDir}
              onChange={e => setInputDir(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              style={{
                flex: 1, padding: '9px 10px', fontSize: '12px',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-1)', outline: 'none',
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={handleAgregar}
              disabled={geocodificando || !inputDir.trim()}
              title="Agregar parada"
              style={{
                padding: '9px 13px', borderRadius: '8px', border: 'none',
                background: '#3b82f6', color: '#fff',
                cursor: geocodificando || !inputDir.trim() ? 'not-allowed' : 'pointer',
                fontSize: '17px', fontWeight: 700, flexShrink: 0,
                opacity: geocodificando || !inputDir.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {geocodificando ? '⏳' : '+'}
            </button>
          </div>

          <button
            onClick={() => setMostrandoScanner(true)}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            📷 Escanear QR de paquete
          </button>

          {/* Error inline */}
          {error && (
            <div style={{
              marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '11px', lineHeight: 1.5,
              display: 'flex', gap: '6px', alignItems: 'flex-start',
            }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0, fontSize: '14px', lineHeight: 1 }}
              >✕</button>
            </div>
          )}
        </div>

        {/* Lista de paradas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {paradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>📦</div>
              <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-2)', fontSize: '13px' }}>
                Sin paradas aún
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                Ingresá una dirección o escaneá el QR de un paquete para empezar la ruta.
              </div>
            </div>
          ) : (
            paradas.map((parada, idx) => (
              <div
                key={parada.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '10px 8px', marginBottom: '4px',
                  borderRadius: '10px', border: '1px solid var(--border)',
                  background: parada.estado === 'entregado'
                    ? 'rgba(16,185,129,0.06)'
                    : 'var(--bg-raised)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Número */}
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  background: parada.estado === 'entregado' ? '#10b981' : '#3b82f6',
                  color: '#fff', fontSize: '11px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: parada.estado === 'entregado' ? 0.7 : 1,
                }}>
                  {idx + 1}
                </div>

                {/* Dirección */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, color: 'var(--text-1)',
                    textDecoration: parada.estado === 'entregado' ? 'line-through' : 'none',
                    opacity: parada.estado === 'entregado' ? 0.55 : 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {parada.direccion}
                  </div>
                  <div style={{
                    fontSize: '10px', color: 'var(--text-3)', marginTop: '2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {parada.displayName?.split(',').slice(0, 2).join(',') || ''}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleEntregado(parada.id)}
                    title={parada.estado === 'entregado' ? 'Desmarcar' : 'Marcar entregado'}
                    style={{
                      background: parada.estado === 'entregado'
                        ? 'rgba(16,185,129,0.15)' : 'var(--bg-hover)',
                      border: 'none', borderRadius: '6px',
                      padding: '4px 6px', cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    {parada.estado === 'entregado' ? '✅' : '⬜'}
                  </button>
                  <button
                    onClick={() => eliminarParada(parada.id)}
                    title="Eliminar parada"
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: 'none',
                      borderRadius: '6px', padding: '4px 6px',
                      cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer de acciones */}
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {/* Optimizar + Guardar */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleOptimizar}
              disabled={paradas.length < 2 || optimizando}
              title={paradas.length < 2 ? 'Necesitás al menos 2 paradas' : 'Reordenar por ruta más corta (OpenRouteService)'}
              style={{
                flex: 1, padding: '9px 8px', borderRadius: '9px',
                background: modoFallback ? 'rgba(245,158,11,0.1)' : 'var(--bg-raised)',
                border: `1px solid ${modoFallback ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                color: modoFallback ? '#f59e0b' : 'var(--text-2)',
                cursor: paradas.length < 2 || optimizando ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 700,
                opacity: paradas.length < 2 ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              {optimizando ? '⏳ Optimizando…' : modoFallback ? '⚡ Re-optimizar' : '⚡ Optimizar'}
            </button>
            <button
              onClick={guardarRuta}
              disabled={cargando || paradas.length === 0}
              title="Sincronizar ruta con el mapa del administrador"
              style={{
                flex: 1, padding: '9px 8px', borderRadius: '9px', border: 'none',
                background: sincronizado ? '#10b981' : '#3b82f6',
                color: '#fff',
                cursor: cargando || paradas.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 800,
                opacity: cargando || paradas.length === 0 ? 0.55 : 1,
                transition: 'background 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              {cargando ? '⏳' : sincronizado ? '✅ Guardado' : '☁️ Guardar'}
            </button>
          </div>

          {/* Estado de sincronización */}
          {sincronizado && (
            <div style={{
              fontSize: '11px', color: '#10b981', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Ruta visible en el mapa del administrador
            </div>
          )}

          {/* Limpiar mapa (botón de peligro) */}
          <button
            onClick={() => setConfirmLimpiar(true)}
            disabled={cargando || paradas.length === 0}
            style={{
              width: '100%', padding: '9px', borderRadius: '9px',
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#ef4444',
              cursor: cargando || paradas.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px', fontWeight: 700,
              opacity: paradas.length === 0 ? 0.35 : 1,
              transition: 'background 0.15s, border-color 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={e => {
              if (paradas.length > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            🗑️ Fin de jornada — Limpiar mapa
          </button>
        </div>
      </div>

      {/* ── Mapa ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapaRuteador paradas={paradas} miUbicacion={miUbicacion} isDark={isDark} />

        {/* Estado vacío sobre el mapa */}
        {paradas.length === 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000, textAlign: 'center',
            background: 'rgba(13,21,38,0.95)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '20px', padding: '32px 40px',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</div>
            <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '17px', fontWeight: 800 }}>
              Tu ruta aparecerá aquí
            </h3>
            <p style={{ margin: 0, color: '#4A6FA5', fontSize: '13px', maxWidth: '240px', lineHeight: 1.6 }}>
              Agregá paradas en el panel izquierdo para visualizar el recorrido en el mapa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
