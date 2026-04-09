import { useState, useEffect } from 'react';
import { Check, X, User, Truck, Phone, Clock, MapPin, Calendar } from 'lucide-react';
import { memo } from 'react';

const ModalAgregarClienteComponent = ({ isOpen, onClose, onConfirm, choferes = [], tabActiva }) => {
  const [formData, setFormData] = useState({
    cliente: '',
    chofer: '',
    celular: '',
    horario: '',
    direccion: '',
    tipo_dia: tabActiva === 'SÁBADOS' ? 'SÁBADOS' : 'SEMANA',
  });

  const [error, setError] = useState('');

  // Reset form al abrir/cerrar y establecer tipo_dia por defecto
  useEffect(() => {
    setFormData({
      cliente: '',
      chofer: '',
      celular: '',
      horario: '',
      direccion: '',
      tipo_dia: tabActiva === 'SÁBADOS' ? 'SÁBADOS' : 'SEMANA',
    });
    setError('');
  }, [isOpen, tabActiva]);

  // Cerrar al presionar Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleChoferChange = (e) => {
    const nombreChofer = e.target.value;
    const choferSeleccionado = choferes.find(c => c.nombre === nombreChofer);
    
    setFormData(prev => ({
      ...prev,
      chofer: nombreChofer,
      celular: choferSeleccionado?.celular || '',
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.cliente.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    if (!formData.chofer) {
      setError('Debe seleccionar un chofer');
      return;
    }

    onConfirm(formData);
  };

  const handleClose = () => {
    setFormData({
      cliente: '',
      chofer: '',
      celular: '',
      horario: '',
      direccion: '',
      tipo_dia: tabActiva === 'SÁBADOS' ? 'SÁBADOS' : 'SEMANA',
    });
    setError('');
    onClose();
  };

  const colors = {
    modalBg: '#1e293b',
    border: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    inputBg: '#0f172a',
    inputFocus: '#1a2540',
    inputBorder: '#475569',
    focusBorder: '#3b82f6',
    buttonBg: '#3b82f6',
    buttonHover: '#2563eb',
    errorColor: '#ef4444',
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      style={{ transition: 'opacity 100ms ease' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          handleClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-[#1e293b] rounded-xl shadow-2xl p-4 border border-slate-700 mt-20"
        style={{
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <style>{`
          .custom-select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
          }
          .custom-select:focus { outline: none; }
        `}</style>

        {/* HEADER */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: colors.textPrimary,
          }}>
            ➕ Nuevo Cliente
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: colors.textSecondary,
          }}>
            Completa todos los campos para agregar un nuevo cliente
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {/* CLIENTE */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nombre del Cliente *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                placeholder="Ej: Empresa ABC SRL"
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              />
            </div>
          </div>

          {/* CHOFER */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chofer Asignado *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Truck size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none', zIndex: 10 }} />
              <select
                name="chofer"
                value={formData.chofer}
                onChange={handleChoferChange}
                className="custom-select"
                disabled={choferes.length === 0}
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: choferes.length === 0 ? colors.inputBorder : colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: choferes.length === 0 ? 'not-allowed' : 'pointer' }}
                onFocus={(e) => { if (choferes.length > 0) { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; } }}
                onBlur={(e) => { e.target.style.backgroundColor = choferes.length === 0 ? colors.inputBorder : colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              >
                <option value="">Seleccionar chofer...</option>
                {choferes.length > 0 ? (
                  choferes.map((chofer) => (
                    <option key={chofer.id || chofer.nombre} value={chofer.nombre}>
                      {chofer.nombre}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Cargando choferes...</option>
                )}
              </select>
            </div>
          </div>

          {/* CELULAR */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Celular
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="tel"
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                placeholder="Ej: +54 9 1234567890"
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              />
            </div>
          </div>

          {/* HORARIO */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Horario de Recogida
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Clock size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="text"
                name="horario"
                value={formData.horario}
                onChange={handleChange}
                placeholder="Ej: 08:00 - 12:00"
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              />
            </div>
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dirección
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Ej: Av. Rivadavia 1234, CABA"
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              />
            </div>
          </div>

          {/* TIPO DE DÍA */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tipo de Día *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} color={colors.textSecondary} style={{ position: 'absolute', left: '10px', pointerEvents: 'none', zIndex: 10 }} />
              <select
                name="tipo_dia"
                value={formData.tipo_dia}
                onChange={handleChange}
                className="custom-select"
                style={{ width: '100%', padding: '8px 10px 8px 36px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              >
                <option value="SEMANA">LUNES A VIERNES</option>
                <option value="SÁBADOS">SÁBADOS</option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: colors.errorColor, fontSize: '13px', textAlign: 'center', marginTop: '-5px' }}>{error}</p>}

          {/* BOTONES */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{ padding: '8px 18px', border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', backgroundColor: 'transparent', color: colors.textSecondary, fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'border-color 80ms ease, background-color 80ms ease' }}
              onMouseEnter={(e) => e.target.style.borderColor = colors.focusBorder}
              onMouseLeave={(e) => e.target.style.borderColor = colors.inputBorder}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', backgroundColor: colors.buttonBg, border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'border-color 80ms ease, background-color 80ms ease' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = colors.buttonHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = colors.buttonBg}
            >
              <Check size={18} style={{ marginRight: '6px' }} />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalAgregarCliente = memo(ModalAgregarClienteComponent);