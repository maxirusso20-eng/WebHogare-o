/**
 * ⚠️ ARCHIVO DISPONIBLE PERO NO INTEGRADO (TODO)
 *
 * Este archivo contiene utilidades genéricas (Formateo, Zonas, WhatsApp, Fecha,
 * LocalStorage, Seguridad) cuya lógica actualmente está duplicada en múltiples
 * componentes:
 *   - Zonas hardcodeadas en PantallaRecorridos.jsx, PantallaDashboard.jsx y Modales.
 *   - URLs de wa.me/ hardcodeadas en TarjetaChofer.jsx y PantallaClientes.jsx.
 *   - toLocaleDateString('es-AR') duplicado en 9+ archivos.
 *
 * Pendiente: refactorizar los componentes para que importen de aquí en lugar
 * de tener la lógica duplicada.
 */
import { useState, useCallback } from 'react';

/**
 * Custom Hook para validaciones y utilidades de la app
 */
export function useValidaciones() {
  const [errores, setErrores] = useState({});

  // ─── VALIDAR CHOFER ────────────────────────────────────
  const validarChofer = useCallback((datos) => {
    const nuevosErrores = {};

    if (!datos.choferIdAt || datos.choferIdAt.trim() === '') {
      nuevosErrores.choferIdAt = 'El ID es obligatorio';
    } else if (isNaN(datos.choferIdAt)) {
      nuevosErrores.choferIdAt = 'El ID debe ser un número';
    }

    if (!datos.nombre || datos.nombre.trim() === '') {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    }

    if (!datos.tel || datos.tel.trim() === '') {
      nuevosErrores.tel = 'El teléfono es obligatorio';
    } else if (!/^\d{10}$/.test(datos.tel.replace(/\D/g, ''))) {
      nuevosErrores.tel = 'El teléfono debe tener 10 dígitos';
    }

    if (datos.dni && !/^\d{6,8}$/.test(datos.dni.replace(/\D/g, ''))) {
      nuevosErrores.dni = 'DNI inválido';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, []);

  // ─── VALIDAR COLECTA ───────────────────────────────────
  const validarColecta = useCallback((datos) => {
    const nuevosErrores = {};

    if (!datos.fecha) {
      nuevosErrores.fecha = 'La fecha es obligatoria';
    }

    if (!datos.chofer_id) {
      nuevosErrores.chofer_id = 'Debe seleccionar un chofer';
    }

    if (datos.monto && isNaN(datos.monto)) {
      nuevosErrores.monto = 'El monto debe ser un número';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, []);

  // ─── LIMPIAR ERRORES ───────────────────────────────────
  const limpiarErrores = useCallback(() => {
    setErrores({});
  }, []);

  return {
    errores,
    validarChofer,
    validarColecta,
    limpiarErrores,
  };
}

/**
 * Funciones de formateo y utilidades
 */
export const Formateo = {
  // Formatear teléfono: 1145678900 → 11 4567-8900
  telefono: (tel) => {
    const cleaned = String(tel).replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2-$3');
  },

  // Formatear DNI: 35123456 → 35.123.456
  dni: (dni) => {
    const cleaned = String(dni).replace(/\D/g, '');
    if (cleaned.length === 8) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
    }
    return cleaned;
  },

  // Formatear fecha: 2024-04-03 → 03/04/2024
  fecha: (fecha) => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  },

  // Formatear fecha inversa: 03/04/2024 → 2024-04-03
  fechaInversa: (fecha) => {
    if (!fecha) return '';
    const [day, month, year] = fecha.split('/');
    return `${year}-${month}-${day}`;
  },

  // Formatear dinero: 5000 → $5.000,00
  dinero: (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(monto);
  },

  // Escapar HTML para evitar XSS
  escHTML: (str) => {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // Encodeear URL
  encodeURL: (str) => {
    return encodeURIComponent(str);
  },
};

/**
 * Clasificación de zonas
 */
export const Zonas = {
  ZONAS: {
    'ZONA OESTE': ['SAN MIGUEL', '3 DE FEBRERO', 'MORON', 'TESEI', 'RAMOS', 'LUZURIAGA', 'SAN JUSTO', 'HAEDO', 'MATANZA', 'FERRERE', 'MERLO', 'MARCOS PAZ', 'PADUA', 'MORENO', 'LUJAN', 'ITUZAINGO', 'FEBRERO', 'OESTE'],
    'ZONA SUR': ['GLEW', 'LONGCHAMPS', 'GUERNICA', 'SAN VICENTE', 'LA PLATA', 'BERAZATEGUI', 'QUILMES', 'LOMAS', 'AVELLANEDA', 'LANUS', 'VARELA', 'BROWN', 'EZEIZA', 'CAÑUELAS', 'ESTEBAN ECHEVERRIA', '9 DE ABRIL', 'SUR'],
    'ZONA NORTE': ['CARDALES', 'ZARATE', 'CAMPANA', 'ESCOBAR', 'LOMA VERDE', 'MASCHWITZ', 'DIQUE', 'NORDELTA', 'TIGRE', 'SAN ISIDRO', 'VTE LOPEZ', 'SAN FERNANDO', 'MUNRO', 'BOULOGNE', 'TORCUATO', 'DEL VISO', 'VILLA ROSA', 'PILAR', 'JOSE C PAZ', 'DERQUI', 'MALVINAS', 'SAN MARTIN', 'NORTE'],
    'CABA': ['AV SAN MARTIN', '25 DE MAYO', 'ABAJO', 'ARRIBA', 'JUAN B JUSTO', 'LUGANO', 'BOYACA', 'LA BOCA', 'BARRACAS', 'PUERTO MADERO', 'RETIRO', 'VERSALLES', 'SAAVEDRA', 'TURNO 2', 'COMODIN', 'CABA'],
  },

  // Clasificar una localidad a una zona
  clasificar: (nombre, override = null) => {
    if (override) return override;
    if (!nombre) return null;

    const n = nombre.toUpperCase();
    for (const [zona, palabras] of Object.entries(Zonas.ZONAS)) {
      if (palabras.some(p => n.includes(p))) {
        return zona;
      }
    }
    return null;
  },

  // Obtener todas las zonas
  getTodasLasZonas: () => {
    return Object.keys(Zonas.ZONAS);
  },
};

/**
 * Generador de mensaje WhatsApp
 */
export const WhatsApp = {
  // Generar mensaje para WhatsApp
  generarMensaje: (chofer, esPlacidaRenderiza = false) => {
    if (!chofer.clientes || chofer.clientes.length === 0) {
      return null;
    }

    const lineas = chofer.clientes
      .map(cliente => {
        const horario = cliente.horario && cliente.horario !== '—' ? ` ${cliente.horario}` : '';
        const dir = cliente.dir && cliente.dir !== '—' ? `\n${cliente.dir}` : '';
        return `*${cliente.nombre}*${horario}${dir}`;
      })
      .join('\n\n');

    const isSabado = esPlacidaRenderiza || new Date().getDay() === 6;
    const greeting = isSabado
      ? 'Buenas tardes, cómo andás? Espero que muy bien!'
      : 'Buenos días, cómo andás? Espero que muy bien!';
    const body = isSabado
      ? 'Te dejo la colecta del día de mañana! Por favor recordá ser puntual para salir temprano en recorrido. Te lo agradezco mucho!\n'
      : 'Te dejo la colecta del día! Por favor recordá ser puntual para salir temprano en recorrido. Te lo agradezco mucho!\n';

    const msg = [greeting, body, lineas].join('\n');
    const tel = chofer.tel.replace(/\D/g, '');

    return {
      url: `https://wa.me/549${tel}?text=${encodeURIComponent(msg)}`,
      mensaje: msg,
      telefono: tel,
    };
  },

  // Enviar por WhatsApp (abre el navegador)
  enviar: (chofer) => {
    const wa = WhatsApp.generarMensaje(chofer);
    if (wa) {
      window.open(wa.url, '_blank');
    }
  },
};

/**
 * Utilidades de fecha
 */
export const Fecha = {
  // Obtener fecha de hoy (YYYY-MM-DD)
  hoy: () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  // Obtener fecha de mañana
  manana: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  },

  // Comparar fechas
  esHoy: (fecha) => {
    return fecha === Fecha.hoy();
  },

  esManana: (fecha) => {
    return fecha === Fecha.manana();
  },

  // Diferencia en días
  diasDiferencia: (fecha1, fecha2) => {
    const date1 = new Date(fecha1);
    const date2 = new Date(fecha2);
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },
};

/**
 * Almacenamiento local
 */
export const LocalStorage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.error('Error leyendo de localStorage:', err);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Error removiendo de localStorage:', err);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('Error limpiando localStorage:', err);
    }
  },
};

/**
 * Hash de contraseña (para admin)
 */
export const Seguridad = {
  hashPassword: async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  verificarPassword: async (password, hash) => {
    const calculado = await Seguridad.hashPassword(password);
    return calculado === hash;
  },
};
