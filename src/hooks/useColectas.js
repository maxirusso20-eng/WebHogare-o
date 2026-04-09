import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { fetchRecorridosOrdered } from '../utils/supabaseOrderedLists';

/**
 * Custom Hook para manejar Colectas/Recorridos
 * Incluye CRUD, filtros por fecha, chofer y estado
 */
export function useColectas() {
  const [colectas, setColectas] = useState([]);
  const [colectasFiltradas, setColectasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState({
    fecha: null,
    chofer_id: null,
    estado: null, // 'pendiente' | 'entregado' | 'rechazado' | 'cancelado'
  });

  // ─── CARGAR COLECTAS ───────────────────────────────────
  const recargarColectas = useCallback(async () => {
    const { data, error: err } = await fetchRecorridosOrdered(supabase);
    if (!err && data) setColectas(data);
  }, []);

  useEffect(() => {
    cargarColectas();

    const channel = supabase
      .channel('hooks:Recorridos:ordenado')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Recorridos' },
        () => {
          void recargarColectas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recargarColectas]);

  // ─── FILTRAR COLECTAS ──────────────────────────────────
  useEffect(() => {
    filtrarColectas();
  }, [colectas, filtro]);

  const cargarColectas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await fetchRecorridosOrdered(supabase);

      if (err) throw err;
      setColectas(data || []);
    } catch (err) {
      console.error('Error cargando colectas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtrarColectas = () => {
    let resultado = [...colectas];

    // Filtrar por fecha
    if (filtro.fecha) {
      resultado = resultado.filter(c => c.fecha === filtro.fecha);
    }

    // Filtrar por chofer
    if (filtro.chofer_id) {
      resultado = resultado.filter(c => c.chofer_id === filtro.chofer_id);
    }

    // Filtrar por estado
    if (filtro.estado) {
      resultado = resultado.filter(c => c.estado === filtro.estado);
    }

    setColectasFiltradas(resultado);
  };

  // ─── CREAR COLECTA ─────────────────────────────────────
  const crearColecta = async (datos) => {
    try {
      if (!datos.fecha || !datos.chofer_id) {
        throw new Error('Fecha y chofer son obligatorios');
      }

      const nuevaColecta = {
        fecha: datos.fecha,
        chofer_id: datos.chofer_id,
        cliente_id: datos.cliente_id || null,
        monto: datos.monto || 0,
        estado: datos.estado || 'pendiente',
        notas: datos.notas || null,
      };

      const { data, error: err } = await supabase
        .from('Recorridos')
        .insert([nuevaColecta])
        .select();

      if (err) throw err;
      return data[0];
    } catch (err) {
      console.error('Error creando colecta:', err);
      throw err;
    }
  };

  // ─── ACTUALIZAR COLECTA ────────────────────────────────
  const actualizarColecta = async (id, datos) => {
    try {
      const { data, error: err } = await supabase
        .from('Recorridos')
        .update(datos)
        .eq('id', id)
        .select();

      if (err) throw err;
      return data[0];
    } catch (err) {
      console.error('Error actualizando colecta:', err);
      throw err;
    }
  };

  // ─── ELIMINAR COLECTA ───────────────────────────────────
  const eliminarColecta = async (id) => {
    try {
      const { error: err } = await supabase
        .from('Recorridos')
        .delete()
        .eq('id', id);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('Error eliminando colecta:', err);
      throw err;
    }
  };

  // ─── MARCAR COMO ENTREGADO ─────────────────────────────
  const marcarEntregado = async (id) => {
    return actualizarColecta(id, { estado: 'entregado' });
  };

  // ─── MARCAR COMO RECHAZADO ─────────────────────────────
  const marcarRechazado = async (id) => {
    return actualizarColecta(id, { estado: 'rechazado' });
  };

  // ─── ESTADÍSTICAS ──────────────────────────────────────
  const getEstadisticas = (fecha = null) => {
    let datos = colectas;
    
    if (fecha) {
      datos = datos.filter(c => c.fecha === fecha);
    }

    return {
      total: datos.length,
      pendientes: datos.filter(c => c.estado === 'pendiente').length,
      entregadas: datos.filter(c => c.estado === 'entregado').length,
      rechazadas: datos.filter(c => c.estado === 'rechazado').length,
      montoTotal: datos.reduce((sum, c) => sum + (c.monto || 0), 0),
      montoEntregado: datos
        .filter(c => c.estado === 'entregado')
        .reduce((sum, c) => sum + (c.monto || 0), 0),
    };
  };

  // ─── COLECTAS POR CHOFER ────────────────────────────────
  const getColectasPorChofer = (chofer_id, fecha = null) => {
    let resultado = colectas.filter(c => c.chofer_id === chofer_id);
    
    if (fecha) {
      resultado = resultado.filter(c => c.fecha === fecha);
    }
    
    return resultado;
  };

  // ─── COLECTAS POR FECHA ──────────────────────────────────
  const getColectasPorFecha = (fecha) => {
    return colectas.filter(c => c.fecha === fecha);
  };

  // ─── OBTENER FECHA ACTUAL ───────────────────────────────
  const getFechaHoy = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  return {
    colectas,
    colectasFiltradas,
    loading,
    error,
    filtro,
    setFiltro,
    cargarColectas,
    crearColecta,
    actualizarColecta,
    eliminarColecta,
    marcarEntregado,
    marcarRechazado,
    getEstadisticas,
    getColectasPorChofer,
    getColectasPorFecha,
    getFechaHoy,
  };
}
