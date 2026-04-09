import { useState, useEffect } from 'react';
import { Check, X, Phone } from 'lucide-react';
import { memo } from 'react';

const ModalAgregarChoferComponent = ({ isOpen, onClose, onConfirm, choferEditar = null, tema = 'dark' }) => {
  const [formData, setFormData] = useState({
    zona: '',
    vehiculo: '',
    nombre: '',
    dni: '',
    condicion: '',
    direccion: '',
    fecha_ingreso: '',
    celular: '',
  });

  const [error, setError] = useState('');

  // Cargar datos si estamos editando
  useEffect(() => {
    if (choferEditar) {
      setFormData({
        zona: choferEditar.zona || '',
        vehiculo: choferEditar.vehiculo || '',
        nombre: choferEditar.nombre || '',
        dni: choferEditar.dni || '',
        condicion: choferEditar.condicion || '',
        direccion: choferEditar.direccion || '',
        fecha_ingreso: choferEditar.fecha_ingreso || '',
        celular: choferEditar.celular || '',
      });
    } else {
      setFormData({
        zona: '',
        vehiculo: '',
        nombre: '',
        dni: '',
        condicion: '',
        direccion: '',
        fecha_ingreso: '',
        celular: '',
      });
    }
    setError('');
  }, [choferEditar, isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!formData.dni.trim()) {
      setError('El DNI es obligatorio');
      return;
    }

    if (!formData.zona) {
      setError('Debe seleccionar una zona');
      return;
    }

    if (!formData.vehiculo) {
      setError('Debe seleccionar un vehículo');
      return;
    }

    if (!formData.condicion) {
      setError('Debe seleccionar una condición');
      return;
    }

    onConfirm(formData);
  };

  const handleClose = () => {
    setFormData({
      zona: '',
      vehiculo: '',
      nombre: '',
      dni: '',
      condicion: '',
      direccion: '',
      fecha_ingreso: '',
      celular: '',
    });
    setError('');
    onClose();
  };

  const isDark = tema === 'dark';
  const colors = {
    modalBg: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '#334155' : '#e2e8f0',
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#cbd5e1' : '#64748b',
    inputBg: isDark ? '#0f172a' : '#f8fafc',
    inputFocus: isDark ? '#1a2540' : '#f0f4f8',
    inputBorder: isDark ? '#475569' : '#cbd5e1',
    selectBg: isDark ? '#0f172a' : '#f8fafc',
    selectText: isDark ? '#f1f5f9' : '#1e293b',
    selectBorder: isDark ? '#475569' : '#cbd5e1',
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
        className="relative w-full max-w-lg bg-[#1e293b] rounded-xl shadow-2xl p-4 border border-slate-700 mt-20"
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
            {choferEditar ? '✏️ Editar Chofer' : '➕ Nuevo Chofer'}
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: colors.textSecondary,
          }}>
            {choferEditar ? 'Actualiza los datos del chofer' : 'Completa todos los campos para agregar un nuevo chofer'}
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {/* ROW 1: ZONA + VEHÍCULO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* ZONA */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Zona *
              </label>
              <select
                name="zona"
                value={formData.zona}
                onChange={handleChange}
                className="custom-select"
                style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.selectBg, border: `1.5px solid ${colors.selectBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.selectText, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.selectBg; e.target.style.borderColor = colors.selectBorder; }}
              >
                <option value="">Selecciona...</option>
                <option value="Oeste">Oeste</option>
                <option value="Sur">Sur</option>
                <option value="Norte">Norte</option>
                <option value="CABA">CABA</option>
              </select>
            </div>

            {/* VEHÍCULO */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vehículo *
              </label>
              <select
                name="vehiculo"
                value={formData.vehiculo}
                onChange={handleChange}
                className="custom-select"
                style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.selectBg, border: `1.5px solid ${colors.selectBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.selectText, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.selectBg; e.target.style.borderColor = colors.selectBorder; }}
              >
                <option value="">Selecciona...</option>
                <option value="SUV">SUV</option>
                <option value="UTILITARIO">UTILITARIO</option>
                <option value="AUTO">AUTO</option>
              </select>
            </div>
          </div>

          {/* NOMBRE */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
              onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
            />
          </div>

          {/* ROW 2: DNI + CONDICIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* DNI */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DNI *
              </label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder="Ej: 12345678"
                inputMode="numeric"
                style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
              />
            </div>

            {/* CONDICIÓN */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Condición *
              </label>
              <select
                name="condicion"
                value={formData.condicion}
                onChange={handleChange}
                className="custom-select"
                style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.selectBg, border: `1.5px solid ${colors.selectBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.selectText, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
                onBlur={(e) => { e.target.style.backgroundColor = colors.selectBg; e.target.style.borderColor = colors.selectBorder; }}
              >
                <option value="">Selecciona...</option>
                <option value="Titular">Titular</option>
                <option value="Semititular">Semititular</option>
                <option value="Suplente">Suplente</option>
              </select>
            </div>
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Av. Principal 123, Apto 4B"
              style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
              onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
            />
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

          {/* FECHA INGRESO */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Fecha de Ingreso
            </label>
            <input
              type="date"
              name="fecha_ingreso"
              value={formData.fecha_ingreso}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 10px', backgroundColor: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 80ms ease, background-color 80ms ease', boxSizing: 'border-box', cursor: 'pointer' }}
              onFocus={(e) => { e.target.style.backgroundColor = colors.inputFocus; e.target.style.borderColor = colors.focusBorder; }}
              onBlur={(e) => { e.target.style.backgroundColor = colors.inputBg; e.target.style.borderColor = colors.inputBorder; }}
            />
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div style={{
              backgroundColor: `${colors.errorColor}15`,
              border: `1px solid ${colors.errorColor}`,
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
              color: colors.errorColor,
              fontWeight: '500',
            }}>
              ❌ {error}
            </div>
          )}

          {/* BUTTONS */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '6px',
          }}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                backgroundColor: colors.inputBg,
                border: `1.5px solid ${colors.inputBorder}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'border-color 80ms ease, background-color 80ms ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.inputFocus;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.inputBg;
              }}
            >
              <X size={16} strokeWidth={2} />
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px 14px',
                backgroundColor: colors.buttonBg,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'border-color 80ms ease, background-color 80ms ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.buttonBg;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Check size={16} strokeWidth={2} />
              {choferEditar ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ModalAgregarChofer = memo(ModalAgregarChoferComponent);