import { useState, useEffect, memo } from 'react';
import { Check, X, Phone, User, FileText, Truck, MapPin, Calendar, Shield } from 'lucide-react';

const ModalAgregarChoferComponent = ({ isOpen, onClose, onConfirm, choferEditar = null, tema = 'dark' }) => {
  const EMPTY = { zona: '', vehiculo: '', nombre: '', dni: '', condicion: '', direccion: '', fecha_ingreso: '', celular: '' };
  const [formData, setFormData] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(choferEditar ? {
      zona: choferEditar.zona || '', vehiculo: choferEditar.vehiculo || '',
      nombre: choferEditar.nombre || '', dni: choferEditar.dni || '',
      condicion: choferEditar.condicion || '', direccion: choferEditar.direccion || '',
      fecha_ingreso: choferEditar.fecha_ingreso || '', celular: choferEditar.celular || '',
    } : EMPTY);
    setError('');
  }, [choferEditar, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return setError('El nombre es obligatorio');
    if (!formData.dni.trim()) return setError('El DNI es obligatorio');
    if (!formData.zona) return setError('Debe seleccionar una zona');
    if (!formData.vehiculo) return setError('Debe seleccionar un vehículo');
    if (!formData.condicion) return setError('Debe seleccionar una condición');
    onConfirm(formData);
  };

  const handleClose = () => { setFormData(EMPTY); setError(''); onClose(); };

  const isDark = tema === 'dark';

  return (
    <>
      <style>{`
        .mac-input {
          width: 100%;
          padding: 9px 12px;
          background: ${isDark ? 'rgba(2,6,23,0.6)' : 'rgba(248,250,252,0.8)'};
          border: 1.5px solid ${isDark ? 'rgba(51,65,85,0.8)' : '#e2e8f0'};
          border-radius: 10px;
          font-size: 14px;
          color: ${isDark ? '#f1f5f9' : '#0f172a'};
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .mac-input::placeholder { color: ${isDark ? '#475569' : '#94a3b8'}; }
        .mac-input:focus {
          border-color: #3b82f6;
          background: ${isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)'};
          box-shadow: 0 0 0 3px rgba(59,130,246,0.14);
        }
        .mac-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%233b82f6' d='M5 7L1 3h8z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          cursor: pointer;
        }
        .mac-field { display: flex; flex-direction: column; gap: 5px; }
        .mac-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: ${isDark ? '#64748b' : '#94a3b8'};
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .mac-icon-input { position: relative; }
        .mac-icon-input .icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: ${isDark ? '#475569' : '#94a3b8'}; }
        .mac-icon-input .mac-input { padding-left: 36px; }
        .mac-btn {
          flex: 1; padding: 10px 16px;
          border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all 0.15s; font-family: inherit; border: none;
        }
        .mac-btn-cancel {
          background: ${isDark ? 'rgba(30,41,59,0.8)' : '#f1f5f9'};
          border: 1.5px solid ${isDark ? '#334155' : '#e2e8f0'} !important;
          color: ${isDark ? '#cbd5e1' : '#475569'};
        }
        .mac-btn-cancel:hover { background: ${isDark ? '#1e293b' : '#e2e8f0'}; }
        .mac-btn-confirm {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 4px 14px rgba(59,130,246,0.3);
        }
        .mac-btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
        .mac-btn-confirm:active { transform: translateY(0); }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) { e.stopPropagation(); handleClose(); } }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%', maxWidth: '480px',
            maxHeight: '90vh', overflow: 'auto',
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(51,65,85,0.8)' : '#e2e8f0'}`,
            borderRadius: '20px',
            padding: '28px',
            boxShadow: isDark ? '0 32px 64px rgba(0,0,0,0.7)' : '0 24px 48px rgba(0,0,0,0.12)',
            transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >

          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: isDark ? 'rgba(51,65,85,0.6)' : '#f1f5f9',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? '#94a3b8' : '#64748b',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(51,65,85,0.6)' : '#f1f5f9'; e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b'; }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>

          {/* Header */}
          <div style={{ marginBottom: '24px', paddingRight: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {choferEditar ? <User size={16} color="#60a5fa" /> : <User size={16} color="#60a5fa" />}
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.5px' }}>
                {choferEditar ? 'Editar Chofer' : 'Nuevo Chofer'}
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#64748b' : '#94a3b8' }}>
              {choferEditar ? 'Actualizá los datos del chofer en el sistema' : 'Completá los campos para registrar un nuevo chofer'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Nombre */}
            <div className="mac-field">
              <label className="mac-label"><User size={10} /> Nombre completo *</label>
              <div className="mac-icon-input">
                <User size={15} className="icon" />
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" autoFocus className="mac-input" />
              </div>
            </div>

            {/* Zona + Vehículo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="mac-field">
                <label className="mac-label"><MapPin size={10} /> Zona *</label>
                <select name="zona" value={formData.zona} onChange={handleChange} className="mac-input mac-select">
                  <option value="">Seleccionar...</option>
                  <option value="OESTE">ZONA OESTE</option>
                  <option value="SUR">ZONA SUR</option>
                  <option value="NORTE">ZONA NORTE</option>
                  <option value="CABA">CABA</option>
                  <option value="OESTESUR">OESTE / SUR</option>
                </select>
              </div>
              <div className="mac-field">
                <label className="mac-label"><Truck size={10} /> Vehículo *</label>
                <select name="vehiculo" value={formData.vehiculo} onChange={handleChange} className="mac-input mac-select">
                  <option value="">Seleccionar...</option>
                  <option value="Moto">Moto</option>
                  <option value="Auto">Auto</option>
                  <option value="Camioneta">Camioneta</option>
                  <option value="Furgón">Furgón</option>
                  <option value="Camión">Camión</option>
                </select>
              </div>
            </div>

            {/* DNI + Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="mac-field">
                <label className="mac-label"><FileText size={10} /> DNI *</label>
                <input type="text" name="dni" value={formData.dni} onChange={handleChange} placeholder="Ej: 12345678" inputMode="numeric" className="mac-input" />
              </div>
              <div className="mac-field">
                <label className="mac-label"><Shield size={10} /> Condición *</label>
                <select name="condicion" value={formData.condicion} onChange={handleChange} className="mac-input mac-select">
                  <option value="">Seleccionar...</option>
                  <option value="Titular">Titular</option>
                  <option value="Semititular">Semititular</option>
                  <option value="Suplente">Suplente</option>
                </select>
              </div>
            </div>

            {/* Celular */}
            <div className="mac-field">
              <label className="mac-label"><Phone size={10} /> Celular</label>
              <div className="mac-icon-input">
                <Phone size={15} className="icon" />
                <input type="tel" name="celular" value={formData.celular} onChange={handleChange} placeholder="+54 9 11 1234-5678" className="mac-input" />
              </div>
            </div>

            {/* Dirección */}
            <div className="mac-field">
              <label className="mac-label"><MapPin size={10} /> Dirección</label>
              <div className="mac-icon-input">
                <MapPin size={15} className="icon" />
                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Av. Principal 123, Ciudad" className="mac-input" />
              </div>
            </div>

            {/* Fecha ingreso */}
            <div className="mac-field">
              <label className="mac-label"><Calendar size={10} /> Fecha de ingreso</label>
              <div className="mac-icon-input">
                <Calendar size={15} className="icon" />
                <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="mac-input" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: '13px', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" onMouseDown={e => { e.stopPropagation(); handleClose(); }} className="mac-btn mac-btn-cancel" style={{ border: '1.5px solid' }}>
                <X size={15} strokeWidth={2} /> Cancelar
              </button>
              <button type="submit" className="mac-btn mac-btn-confirm">
                <Check size={15} strokeWidth={2.5} />
                {choferEditar ? 'Actualizar' : 'Guardar chofer'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export const ModalAgregarChofer = memo(ModalAgregarChoferComponent);