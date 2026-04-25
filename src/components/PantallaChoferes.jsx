import { useState, useCallback, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Plus, AlertCircle } from 'lucide-react';
import { TarjetaChofer } from './TarjetaChofer';
import { ModalAgregarChofer } from './ModalAgregarChofer';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

function PantallaChoferes() {
  const { choferes, mostrarToast, theme } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [choferEditando, setChoferEditando] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [choferAEliminar, setChoferAEliminar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroZona, setFiltroZona] = useState('Todas');
  const [loading, setLoading] = useState(false);

  const choferesFiltrados = useMemo(() => {
    return choferes.filter(chofer => {
      const matchBusqueda = (chofer.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chofer.tel || '').includes(searchTerm) ||
        (chofer.celular || '').includes(searchTerm) ||
        (chofer.choferIdAt || '').includes(searchTerm);
      const matchZona = filtroZona === 'Todas' || (chofer.zona && chofer.zona.includes(filtroZona));
      return matchBusqueda && matchZona;
    });
  }, [choferes, searchTerm, filtroZona]);

  const handleGuardarChofer = useCallback(async (formData) => {
    setLoading(true);
    try {
      if (choferEditando) {
        const { error } = await supabase
          .from('Choferes')
          .update(formData)
          .eq('id', choferEditando.id)
          .select();
        if (error) throw error;
        mostrarToast('✅ Chofer actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('Choferes')
          .insert([formData])
          .select();
        if (error) throw error;
        mostrarToast('✅ Chofer agregado correctamente', 'success');
      }
      setIsModalOpen(false);
      setChoferEditando(null);
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [choferEditando, mostrarToast]);

  const handleEliminarChofer = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      mostrarToast('✅ Chofer eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setChoferAEliminar(null);
    }
  }, [mostrarToast]);

  const handleConfirmDelete = useCallback((chofer) => {
    setChoferAEliminar(chofer);
    setIsConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDeleteConfirm = useCallback(() => {
    if (choferAEliminar) {
      handleEliminarChofer(choferAEliminar.id);
    }
  }, [choferAEliminar, handleEliminarChofer]);

  const handleConfirmDeleteCancel = useCallback(() => {
    setIsConfirmDeleteOpen(false);
    setChoferAEliminar(null);
  }, []);

  const handleAbrirModalNuevo = useCallback(() => {
    setChoferEditando(null);
    setIsModalOpen(true);
  }, []);

  const handleEditarChofer = useCallback((chofer) => {
    setChoferEditando(chofer);
    setIsModalOpen(true);
  }, []);

  const handleCerrarModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setChoferEditando(null);
    }, 300);
  }, []);

  return (
    <div className="w-full min-h-screen" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* Modales renderizados en la raíz para funcionar como fixed overlay */}
      <ModalAgregarChofer
        isOpen={isModalOpen}
        onClose={handleCerrarModal}
        onConfirm={handleGuardarChofer}
        choferEditar={choferEditando}
        tema={theme}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={choferAEliminar?.nombre || 'este chofer'}
        onConfirm={handleConfirmDeleteConfirm}
        onCancel={handleConfirmDeleteCancel}
        tema={theme}
      />

      {/* Contenido principal */}
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                👤 Gestión de Choferes
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                Total: {choferes.length} choferes registrados
              </p>
            </div>
            <button
              onClick={handleAbrirModalNuevo}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={18} strokeWidth={2.5} />
              Agregar Chofer
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="theme-input flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm outline-none"
            />
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="theme-input px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
            >
              <option value="Todas">Todas las zonas</option>
              <option value="OESTE">OESTE</option>
              <option value="SUR">SUR</option>
              <option value="NORTE">NORTE</option>
              <option value="CABA">CABA</option>
            </select>
          </div>
        </div>

        {choferesFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {choferesFiltrados.map(chofer => (
              <TarjetaChofer
                key={chofer.id}
                chofer={chofer}
                onEdit={handleEditarChofer}
                onConfirmDelete={handleConfirmDelete}
                tema={theme}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-5" style={{ color: 'var(--text-3)' }}>
            <AlertCircle size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium">
              {searchTerm || filtroZona !== 'Todas' ? 'No se encontraron choferes con los filtros aplicados' : 'No hay choferes registrados aún'}
            </p>
            {(searchTerm || filtroZona !== 'Todas') && (
              <button
                onClick={() => { setSearchTerm(''); setFiltroZona('Todas'); }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-150"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export { PantallaChoferes };