import { useState, useCallback } from 'react';
import { supabase } from '../supabase';

// ── OpenRouteService config ────────────────────────────────────────────────
// La API key se lee de .env.local (VITE_ prefix → expuesta al navegador por Vite)
const ORS_KEY  = import.meta.env.VITE_OPENROUTE_API_KEY;
const ORS_BASE = 'https://api.openrouteservice.org';

// ── Geocodificación con ORS ────────────────────────────────────────────────
// Convierte una dirección de texto a coordenadas {lat, lng, displayName}.
// Usa el endpoint /geocode/search con boundary.country=AR para priorizar Argentina.
export async function geocodificarDireccion(direccion) {
  if (!ORS_KEY) throw new Error('API key de OpenRouteService no configurada (VITE_OPENROUTE_API_KEY)');

  const params = new URLSearchParams({
    text: `${direccion}, Buenos Aires, Argentina`,
    'boundary.country': 'AR',
    size: '1',
    layers: 'address,venue,street',
  });

  const res = await fetch(`${ORS_BASE}/geocode/search?${params}`, {
    headers: { Authorization: ORS_KEY },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error de geocodificación (${res.status})`);
  }

  const data = await res.json();
  if (!data.features?.length) throw new Error(`No se encontró: "${direccion}"`);

  const [lng, lat] = data.features[0].geometry.coordinates;
  return {
    lat,
    lng,
    displayName: data.features[0].properties.label,
  };
}

// ── Optimización de ruta con ORS (TSP / VROOM) ────────────────────────────
// Toma el array de paradas y un punto de inicio (ubicación del chofer).
// Consulta el endpoint /optimization (VROOM) y reordena las paradas según
// el camino más corto calculado sobre la red vial real.
export async function optimizarRutaORS(paradas, inicio = { lat: -34.65, lng: -58.65 }) {
  if (!ORS_KEY) throw new Error('API key de OpenRouteService no configurada');
  if (paradas.length <= 1) return paradas.map((p, i) => ({ ...p, orden_visita: i }));

  const jobs = paradas.map((p, i) => ({
    id: i + 1,                     // 1-indexed
    location: [p.lng, p.lat],      // ORS usa [lng, lat]
    service: 120,                  // 2 min de tiempo de servicio por parada
  }));

  const vehicles = [{
    id: 1,
    profile: 'driving-car',
    start: [inicio.lng, inicio.lat],
    // Sin 'end' → el chofer no necesita volver al origen
  }];

  const res = await fetch(`${ORS_BASE}/optimization`, {
    method: 'POST',
    headers: {
      Authorization: ORS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobs, vehicles }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error en optimización ORS (${res.status})`);
  }

  const data = await res.json();

  // Extraer pasos del tipo "job" (excluye start/end del vehículo)
  const steps = data.routes?.[0]?.steps?.filter(s => s.type === 'job') ?? [];
  if (!steps.length) throw new Error('ORS no devolvió una ruta optimizada');

  // Mapear de vuelta al array original usando el id del job (1-indexed)
  return steps.map((step, orden) => ({
    ...paradas[step.job - 1],
    orden_visita: orden,
  }));
}

// ── Fallback: vecino más cercano (cliente, sin API) ───────────────────────
// Se usa cuando ORS falla o no hay conexión.
export function optimizarRutaLocal(paradas, inicio = { lat: -34.65, lng: -58.65 }) {
  if (paradas.length <= 1) return paradas.map((p, i) => ({ ...p, orden_visita: i }));
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng);
  const pool = [...paradas];
  const result = [];
  let curr = inicio;
  while (pool.length) {
    let idx = 0, best = Infinity;
    pool.forEach((p, i) => { const d = dist(curr, p); if (d < best) { best = d; idx = i; } });
    const [next] = pool.splice(idx, 1);
    result.push({ ...next, orden_visita: result.length });
    curr = next;
  }
  return result;
}

// ── Hook principal ────────────────────────────────────────────────────────
export function useRuteador(choferId) {
  const [paradas,       setParadas]       = useState([]);
  const [cargando,      setCargando]      = useState(false);
  const [geocodificando, setGeo]          = useState(false);
  const [optimizando,   setOptimizando]   = useState(false);
  const [error,         setError]         = useState(null);
  const [sincronizado,  setSincronizado]  = useState(false);
  const [modoFallback,  setModoFallback]  = useState(false); // true si ORS falló

  // Geocodifica (ORS) y agrega la dirección a la lista local
  const agregarDireccion = useCallback(async (texto) => {
    if (!texto.trim()) return;
    setGeo(true);
    setError(null);
    setSincronizado(false);
    try {
      const { lat, lng, displayName } = await geocodificarDireccion(texto.trim());
      setParadas(prev => [
        ...prev,
        {
          id:           crypto.randomUUID(),
          direccion:    texto.trim(),
          displayName:  displayName,
          lat,
          lng,
          orden_visita: prev.length,
          estado:       'pendiente',
        },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setGeo(false);
    }
  }, []);

  // Elimina una parada y re-numera el orden
  const eliminarParada = useCallback((id) => {
    setParadas(prev =>
      prev.filter(p => p.id !== id).map((p, i) => ({ ...p, orden_visita: i }))
    );
    setSincronizado(false);
  }, []);

  // Alterna entregado ↔ pendiente
  const toggleEntregado = useCallback((id) => {
    setParadas(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, estado: p.estado === 'entregado' ? 'pendiente' : 'entregado' }
          : p
      )
    );
    setSincronizado(false);
  }, []);

  // Optimizar: intenta ORS → fallback a vecino más cercano si falla
  const aplicarOptimizacion = useCallback(async (inicio) => {
    if (paradas.length < 2) return;
    setOptimizando(true);
    setModoFallback(false);
    setError(null);
    setSincronizado(false);
    try {
      const ordenadas = await optimizarRutaORS(paradas, inicio);
      setParadas(ordenadas);
    } catch (e) {
      // Fallback silencioso al algoritmo local
      console.warn('ORS optimization falló, usando fallback local:', e.message);
      setParadas(optimizarRutaLocal(paradas, inicio));
      setModoFallback(true);
      setError(`ORS no disponible — ruta optimizada localmente. (${e.message})`);
    } finally {
      setOptimizando(false);
    }
  }, [paradas]);

  // Guarda la ruta completa en Supabase (reemplaza la anterior del chofer)
  const guardarRuta = useCallback(async () => {
    if (!choferId || !paradas.length) return;
    setCargando(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('rutas_activas')
        .delete()
        .eq('chofer_id', choferId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from('rutas_activas').insert(
        paradas.map(p => ({
          chofer_id:    choferId,
          direccion:    p.direccion,
          lat:          p.lat,
          lng:          p.lng,
          orden_visita: p.orden_visita,
          estado:       p.estado,
        }))
      );
      if (insErr) throw insErr;
      setSincronizado(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [choferId, paradas]);

  // Fin de jornada: elimina TODAS las paradas del chofer en Supabase
  const limpiarMapa = useCallback(async () => {
    if (!choferId) return;
    setCargando(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from('rutas_activas')
        .delete()
        .eq('chofer_id', choferId);
      if (e) throw e;
      setParadas([]);
      setSincronizado(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [choferId]);

  // Carga la ruta guardada del chofer al montar el componente
  const cargarRuta = useCallback(async () => {
    if (!choferId) return;
    setCargando(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('rutas_activas')
        .select('*')
        .eq('chofer_id', choferId)
        .order('orden_visita', { ascending: true });
      if (e) throw e;
      if (data?.length) {
        setParadas(
          data.map(r => ({
            id:           r.id,
            direccion:    r.direccion,
            displayName:  r.direccion,
            lat:          r.lat,
            lng:          r.lng,
            orden_visita: r.orden_visita,
            estado:       r.estado ?? 'pendiente',
          }))
        );
        setSincronizado(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [choferId]);

  return {
    paradas,
    cargando,
    geocodificando,
    optimizando,
    error,
    sincronizado,
    modoFallback,
    agregarDireccion,
    eliminarParada,
    toggleEntregado,
    aplicarOptimizacion,
    guardarRuta,
    limpiarMapa,
    cargarRuta,
    setError,
  };
}
