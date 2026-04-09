/**
 * Orden canónico compartido entre Web y otras apps:
 * mismas columnas y desempate por `id` que en las queries `.order()` de Supabase.
 */

export function compareIds(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    const sa = String(a).trim();
    const sb = String(b).trim();
    if (sa === String(na) && sb === String(nb)) return na - nb;
  }
  return String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true });
}

export function sortChoferesRows(rows) {
  return [...rows].sort((x, y) => {
    const c = String(x.nombre ?? '').localeCompare(String(y.nombre ?? ''), 'es', {
      sensitivity: 'base',
      numeric: true,
    });
    if (c !== 0) return c;
    return compareIds(x.id, y.id);
  });
}

export function sortClientesRows(rows) {
  return [...rows].sort((x, y) => {
    const c = String(x.cliente ?? '').localeCompare(String(y.cliente ?? ''), 'es', {
      sensitivity: 'base',
      numeric: true,
    });
    if (c !== 0) return c;
    return compareIds(x.id, y.id);
  });
}

/** Orden de Recorridos: zona → `orden` (índice dentro de la zona) → id. Filas sin `orden` van al final de la zona. */
export function sortRecorridosRowsCanonical(rows) {
  return [...rows].sort((x, y) => {
    const z = String(x.zona ?? '').localeCompare(String(y.zona ?? ''), 'es', {
      sensitivity: 'base',
      numeric: true,
    });
    if (z !== 0) return z;
    const ox = Number.isFinite(Number(x.orden)) ? Number(x.orden) : 1e12;
    const oy = Number.isFinite(Number(y.orden)) ? Number(y.orden) : 1e12;
    if (ox !== oy) return ox - oy;
    return compareIds(x.id, y.id);
  });
}

export function mergeColectaOrdenado(prev, row) {
  return sortRecorridosRowsCanonical([...prev.filter((c) => c.id !== row.id), row]);
}

/** Siguiente `orden` (0-based) al agregar una fila al final de una zona. */
export function nextOrdenEnZona(colectas, zona) {
  const enZona = colectas.filter((c) => c.zona === zona);
  if (enZona.length === 0) return 0;
  return (
    Math.max(
      ...enZona.map((c) => (Number.isFinite(Number(c.orden)) ? Number(c.orden) : -1))
    ) + 1
  );
}

/**
 * Solo UPDATE de filas cuyo `orden` cambió. Paralelo con Promise.all.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ id: number|string, orden: number }[]} updates
 */
export async function updateRecorridosOrdenBatch(client, updates) {
  if (updates.length === 0) return;
  const results = await Promise.all(
    updates.map(({ id, orden }) =>
      client.from('Recorridos').update({ orden }).eq('id', id)
    )
  );
  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) throw firstErr;
}

export function fetchChoferesOrdered(client) {
  return client
    .from('Choferes')
    .select('*')
    .order('nombre', { ascending: true })
    .order('id', { ascending: true });
}

export function fetchRecorridosOrdered(client) {
  return client
    .from('Recorridos')
    .select('*')
    .order('zona', { ascending: true })
    .order('orden', { ascending: true })
    .order('id', { ascending: true });
}

export function fetchClientesOrdered(client) {
  return client
    .from('Clientes')
    .select('id, cliente, chofer, horario, direccion, tipo_dia, Choferes(celular)')
    .order('cliente', { ascending: true })
    .order('id', { ascending: true });
}
