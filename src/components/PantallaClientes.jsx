import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Plus, CalendarDays, MessageCircle, Trash2, Package } from 'lucide-react';
import { ModalAgregarCliente } from './ModalAgregarCliente';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

function PantallaClientes() {
  const { clientes, setClientes, mostrarToast, choferes, triggerTabSplash } = useContext(AppContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState('SEMANA'); // 'SEMANA' o 'SÁBADOS'
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [filtroChofer, setFiltroChofer] = useState('Todos');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  // checksHora: { [clienteId]: 'HH:MM' } — persiste desde historial_clientes
  const [checksHora, setChecksHora] = useState({});

  // Limpiar/refiltrar clientes al cambiar de pestaña
  useEffect(() => {
  }, [tabActiva]);

  // Cargar checks desde Supabase (hora_llegada de hoy)
  useEffect(() => {
    const cargarChecks = async () => {
      const hoy = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('historial_clientes')
        .select('cliente_id, hora_llegada')
        .eq('fecha', hoy)
        .not('hora_llegada', 'is', null);
      if (data) {
        const mapa = {};
        data.forEach(r => { if (r.hora_llegada) mapa[r.cliente_id] = r.hora_llegada.slice(0, 5); });
        setChecksHora(mapa);
      }
    };
    cargarChecks();
  }, []);

  // Tabs config
  const tabs = [
    { label: 'LUNES A VIERNES', value: 'SEMANA' },
    { label: 'SÁBADOS', value: 'SÁBADOS' }
  ];

  // Ordenamiento inteligente por horario
  function parseHorario(horario) {
    if (!horario) return null;
    // Extrae HH:MM
    const match = horario.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const [_, h, m] = match;
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  }

  function ordenarPorHorario(arr) {
    return [...arr].sort((a, b) => {
      const ha = parseHorario(a.horario);
      const hb = parseHorario(b.horario);
      if (ha === null && hb === null) return 0;
      if (ha === null) return 1;
      if (hb === null) return -1;
      return ha - hb;
    });
  }

  // Filtro ultra-flexible para tipo_dia + chofer + búsqueda
  const clientesFiltrados = useMemo(() => {
    return ordenarPorHorario(
      clientes.filter(c => {
        const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
        const matchTipo = tabActiva === 'SÁBADOS'
          ? tipo === 'SÁBADOS'
          : (tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null);
        const matchChofer = filtroChofer === 'Todos' || (c.chofer || '') === filtroChofer;
        const matchBusqueda = !busquedaCliente ||
          (c.cliente || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
          (c.direccion || '').toLowerCase().includes(busquedaCliente.toLowerCase());
        return matchTipo && matchChofer && matchBusqueda;
      })
    );
  }, [clientes, tabActiva, filtroChofer, busquedaCliente]);

  // ─── CHECK: marcar/desmarcar llegada ─────────────────────────────────────
  const handleCheck = async (cliente, checked) => {
    const hoy = new Date().toISOString().split('T')[0];
    if (checked) {
      const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      setChecksHora(prev => ({ ...prev, [cliente.id]: hora }));
      await supabase.from('historial_clientes').upsert([{
        fecha: hoy,
        tipo_dia: tabActiva === 'SÁBADOS' ? 'SÁBADOS' : 'SEMANA',
        cliente_id: cliente.id,
        cliente_nombre: cliente.cliente || '',
        chofer: cliente.chofer || '',
        horario_programado: cliente.horario || '',
        hora_llegada: hora,
        direccion: cliente.direccion || '',
      }], { onConflict: 'fecha,cliente_id' });
    } else {
      setChecksHora(prev => { const n = { ...prev }; delete n[cliente.id]; return n; });
      await supabase.from('historial_clientes')
        .update({ hora_llegada: null })
        .eq('fecha', hoy)
        .eq('cliente_id', cliente.id);
    }
  };

  // ─── GUARDAR EN HISTORIAL CLIENTES (solo la pestaña activa) ──────────────
  const guardarEnHistorial = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const esSabado = tabActiva === 'SÁBADOS';
      const tipoDia = esSabado ? 'SÁBADOS' : 'SEMANA';

      // Filtrar clientes según la pestaña activa
      const { data: todosClientes, error: errC } = await supabase.from('Clientes').select('*');
      if (errC) throw errC;

      const clientesFiltradosGuardar = (todosClientes || []).filter(c => {
        const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
        return esSabado
          ? tipo === 'SÁBADOS'
          : (tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null);
      });

      if (!clientesFiltradosGuardar.length) {
        mostrarToast(`No hay clientes de ${tipoDia} para guardar`, 'info');
        setLoading(false);
        return;
      }

      const rows = clientesFiltradosGuardar.map(c => ({
        fecha: hoy,
        tipo_dia: tipoDia,
        cliente_id: c.id,
        cliente_nombre: c.cliente || '',
        chofer: c.chofer || '',
        horario_programado: c.horario || '',
        hora_llegada: checksHora[c.id] || null,
        direccion: c.direccion || '',
      }));

      const { error } = await supabase
        .from('historial_clientes')
        .upsert(rows, { onConflict: 'fecha,cliente_id' });
      if (error) throw error;

      // Las horas marcadas se mantienen guardadas en historial_clientes
      mostrarToast(`✅ ${rows.length} clientes (${tipoDia}) guardados en historial`, 'success');
    } catch (err) {
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarCliente = async (formData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Clientes')
        .insert([formData])
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');

      if (error) throw error;

      setClientes(prev => [data[0], ...prev]);
      setIsModalOpen(false);
      mostrarToast('✅ Cliente agregado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeChofer = async (clienteId, nuevoChofer) => {
    try {
      const { data, error } = await supabase
        .from('Clientes')
        .update({ chofer: nuevoChofer })
        .eq('id', clienteId)
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');

      if (error) throw error;

      setClientes(prev =>
        prev.map(c => c.id === clienteId ? data[0] : c)
      );
      mostrarToast('✅ Chofer actualizado', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error al actualizar: ${err.message}`, 'error');
    }
  };


  const handleEliminarClienteConfirm = async () => {
    if (!itemAEliminar) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', itemAEliminar.id);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== itemAEliminar.id));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setItemAEliminar(null);
    }
  };

  const handleEliminarClienteCancel = () => {
    setIsConfirmDeleteOpen(false);
    setItemAEliminar(null);
  };

  const handleOpenConfirmDeleteModal = (cliente) => {
    setItemAEliminar(cliente);
    setIsConfirmDeleteOpen(true);
  };

  const enviarWhatsApp = (nombreChofer, telefonoChofer) => {
    if (!telefonoChofer || !nombreChofer) {
      mostrarToast('❌ Chofer sin celular registrado', 'error');
      return;
    }

    // Filtrar usar estado global 'clientes' por tipo_dia y chofer
    const clientesChofer = clientes.filter(c => {
      const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
      const matchTipo = tabActiva === 'SÁBADOS'
        ? tipo === 'SÁBADOS'
        : (tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null);

      return matchTipo && c.chofer === nombreChofer;
    });

    if (clientesChofer.length === 0) {
      mostrarToast('❌ No hay colectas asignadas para este chofer', 'error');
      return;
    }

    const ordenados = ordenarPorHorario(clientesChofer);

    let mensaje = '';
    if (tabActiva === 'SÁBADOS') {
      mensaje += 'Buenas tardes! Cómo estás? Espero que muy bien.\nTe dejo asignadas las colectas para el sábado!\n\n';
    } else {
      mensaje += 'Buenos días! Cómo estás? Espero que muy bien.\nTe dejo asignadas las colectas del día de hoy!\n\n';
    }

    ordenados.forEach(c => {
      const clienteStr = c.cliente || 'CLIENTE';
      const horarioStr = c.horario || '';
      const direStr = c.direccion || '';
      mensaje += `${clienteStr} ${horarioStr}\n${direStr}\n\n`;
    });

    // Limpiar celular por las dudas (solo numeros)
    const telLimpio = telefonoChofer.replace(/\D/g, '');
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje.trim())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full min-h-screen p-6" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* MODALES */}
      <ModalAgregarCliente
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleGuardarCliente}
        choferes={choferes}
        tabActiva={tabActiva}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={itemAEliminar?.cliente || 'este cliente'}
        onConfirm={handleEliminarClienteConfirm}
        onCancel={handleEliminarClienteCancel}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>🏢 Gestión de Clientes</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '9px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'background 120ms ease', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <Plus size={18} />
            Agregar Cliente
          </button>
          <button
            onClick={guardarEnHistorial}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', backgroundColor: loading ? '#475569' : '#8b5cf6', color: 'white', borderRadius: '9px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 120ms ease', boxShadow: '0 2px 8px rgba(139,92,246,0.25)', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
          >
            <CalendarDays size={16} />
            Guardar en Historial
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Buscar cliente o dirección..."
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          className="theme-input flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
        />
        <select
          value={filtroChofer}
          onChange={(e) => setFiltroChofer(e.target.value)}
          className="theme-input px-3 py-2 rounded-lg text-sm cursor-pointer outline-none"
        >
          <option value="Todos">Todos los choferes</option>
          {choferes.map(ch => (
            <option key={ch.id} value={ch.nombre}>{ch.nombre}</option>
          ))}
        </select>
        {(filtroChofer !== 'Todos' || busquedaCliente) && (
          <button
            onClick={() => { setFiltroChofer('Todos'); setBusquedaCliente(''); }}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-80"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              if (tabActiva !== tab.value) {
                triggerTabSplash(tab.label);
                setTabActiva(tab.value);
              }
            }}
            className="px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-100 border-b-2 focus:outline-none"
            style={tabActiva === tab.value
              ? { background: 'var(--bg-raised)', borderColor: 'var(--brand-blue)', color: 'var(--brand-blue)' }
              : { background: 'var(--bg-hover)', borderColor: 'transparent', color: 'var(--text-3)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          {clientesFiltrados.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CLIENTE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CHOFER</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CELULAR</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>HORARIO</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>DIRECCIÓN</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)', minWidth: '80px' }}>CHECK</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, idx) => (
                  <tr
                    key={cliente.id || idx}
                    className="clientes-row"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{cliente.cliente || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={cliente.chofer || ''}
                        onChange={(e) => handleChangeChofer(cliente.id, e.target.value)}
                        className="theme-input px-2.5 py-1.5 rounded text-sm cursor-pointer outline-none"
                      >
                        <option value="">Seleccionar chofer...</option>
                        {choferes.map(chofer => (
                          <option key={chofer.id || chofer.nombre} value={chofer.nombre}>
                            {chofer.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* CELULAR — clickeable a WhatsApp */}
                    <td className="px-6 py-4 text-sm">
                      {cliente.Choferes?.celular
                        ? (
                          <a
                            href={`https://wa.me/${cliente.Choferes.celular.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#25d366', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'opacity 120ms' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            📱 {cliente.Choferes.celular}
                          </a>
                        )
                        : <span style={{ color: 'var(--text-3)' }}>Sin celular</span>
                      }
                    </td>
                    {/* HORARIO — solo texto */}
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{cliente.horario || '—'}</td>
                    {/* DIRECCIÓN */}
                    <td className="px-6 py-4 text-sm max-w-xs truncate" style={{ color: 'var(--text-3)' }}>{cliente.direccion || '—'}</td>
                    {/* CHECK — checkbox con hora inline */}
                    <td className="px-6 py-4 text-sm text-center">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={!!checksHora[cliente.id]}
                          onChange={(e) => handleCheck(cliente, e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                        />
                        {checksHora[cliente.id] && (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', letterSpacing: '0.5px' }}>
                            {checksHora[cliente.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* ACCIONES */}
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex justify-center items-center gap-3">
                        {cliente.chofer && cliente.Choferes?.celular && (
                          <button
                            onClick={() => enviarWhatsApp(cliente.chofer, cliente.Choferes.celular)}
                            title="Enviar resumen de colectas por WhatsApp"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', padding: '6px', borderRadius: '6px', transition: 'all 120ms' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = '#10b981'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <MessageCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => { setItemAEliminar(cliente); setIsConfirmDeleteOpen(true); }}
                          title="Eliminar cliente"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: '6px', borderRadius: '6px', transition: 'all 120ms' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6" style={{ color: 'var(--text-3)' }}>
              <Package size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-1)' }}>No hay clientes registrados aún</p>
              <p className="text-sm mb-6">Agrega tu primer cliente para comenzar</p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                <Plus size={18} />
                Agregar Cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export { PantallaClientes };