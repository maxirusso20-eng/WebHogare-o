import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { fetchChoferesOrdered } from '../utils/supabaseOrderedLists';

/**
 * Custom Hook para manejar toda la lógica de Choferes
 * Maneja CRUD, filtros, búsqueda y validaciones
 */
export function useChoferes() {
  const [choferes, setChoferes] = useState([]);
  const [choferesFiltrados, setChoferesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState({
    condicion: null, // 'TITULAR' | 'SUPLENTE' | 'COLECTADOR'
    zona: null,
    search: '',
  });

  // ─── CARGAR CHOFERES ───────────────────────────────────
  const recargarChoferes = useCallback(async () => {
    const { data, error: err } = await fetchChoferesOrdered(supabase);
    if (!err && data) setChoferes(data);
  }, []);

  useEffect(() => {
    cargarChoferes();

    const channel = supabase
      .channel('hooks:Choferes:ordenado')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Choferes' },
        () => {
          void recargarChoferes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recargarChoferes]);

  // ─── FILTRAR CHOFERES ──────────────────────────────────
  useEffect(() => {
    filtrarChoferes();
  }, [choferes, filtro]);

  const cargarChoferes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await fetchChoferesOrdered(supabase);

      if (err) throw err;
      setChoferes(data || []);
    } catch (err) {
      console.error('Error cargando choferes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtrarChoferes = () => {
    let resultado = [...choferes];

    // Filtrar por condición
    if (filtro.condicion) {
      resultado = resultado.filter(c => c.condicion === filtro.condicion);
    }

    // Filtrar por zona
    if (filtro.zona) {
      resultado = resultado.filter(c =>
        c.zona && c.zona.includes(filtro.zona)
      );
    }

    // Buscar por nombre o teléfono
    if (filtro.search) {
      const search = filtro.search.toLowerCase();
      resultado = resultado.filter(c =>
        c.nombre.toLowerCase().includes(search) ||
        c.tel.includes(search)
      );
    }

    setChoferesFiltrados(resultado);
  };

  // ─── CREAR CHOFER ──────────────────────────────────────
  const crearChofer = async (datos) => {
    try {
      // Validaciones
      if (!datos.nombre || !datos.tel) {
        throw new Error('Nombre y teléfono son obligatorios');
      }

      if (isNaN(datos.choferIdAt)) {
        throw new Error('El ID debe ser un número');
      }

      // Validar duplicados
      const existe = choferes.find(c =>
        String(c.choferIdAt) === String(datos.choferIdAt)
      );
      if (existe) {
        throw new Error(`El ID ${datos.choferIdAt} ya pertenece a ${existe.nombre}`);
      }

      // Determinar condición según el ID
      const numId = parseInt(String(datos.choferIdAt).replace(/\D/g, ''), 10) || 0;
      let condicion = 'TITULAR';
      if (numId >= 1000) condicion = 'COLECTADOR';
      else if (numId >= 200) condicion = 'SUPLENTE';

      const nuevoChofer = {
        choferIdAt: datos.choferIdAt,
        nombre: datos.nombre,
        tel: datos.tel,
        dni: datos.dni || null,
        zona: datos.zona || 'Sin Zona',
        direccion: datos.direccion || null,
        ingreso: datos.ingreso || null,
        condicion: datos.condicion || condicion,
        vehiculo: datos.vehiculo || 'AUTO',
      };

      const { data, error: err } = await supabase
        .from('Choferes')
        .insert([nuevoChofer])
        .select();

      if (err) throw err;
      return data[0];
    } catch (err) {
      console.error('Error creando chofer:', err);
      throw err;
    }
  };

  // ─── ACTUALIZAR CHOFER ─────────────────────────────────
  const actualizarChofer = async (id, datos) => {
    try {
      const { data, error: err } = await supabase
        .from('Choferes')
        .update(datos)
        .eq('id', id)
        .select();

      if (err) throw err;
      return data[0];
    } catch (err) {
      console.error('Error actualizando chofer:', err);
      throw err;
    }
  };

  // ─── ELIMINAR CHOFER ────────────────────────────────────
  const eliminarChofer = async (id) => {
    try {
      const { error: err } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('Error eliminando chofer:', err);
      throw err;
    }
  };

  // ─── UTILIDADES ────────────────────────────────────────
  const formatearTelefono = (tel) => {
    return String(tel).replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2-$3');
  };

  const getChoferPorZona = (zona) => {
    return choferes.filter(c => c.zona === zona);
  };

  const getChoferPorCondicion = (condicion) => {
    return choferes.filter(c => c.condicion === condicion);
  };

  return {
    choferes,
    choferesFiltrados,
    loading,
    error,
    filtro,
    setFiltro,
    cargarChoferes,
    crearChofer,
    actualizarChofer,
    eliminarChofer,
    formatearTelefono,
    getChoferPorZona,
    getChoferPorCondicion,
  };
}
