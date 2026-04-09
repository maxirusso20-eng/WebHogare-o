import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export function ModalAgregar({ isOpen, zona, onClose, onConfirm }) {
  const [localidad, setLocalidad] = useState('');

  // Cerrar al presionar Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (localidad.trim()) {
      onConfirm(localidad.trim());
      setLocalidad('');
    }
  };

  const handleClose = () => {
    setLocalidad('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        
        
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      {/* MODAL BOX */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid #334155',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TITLE */}
        <h2
          style={{
            margin: '0 0 12px 0',
            color: '#f8fafc',
            fontSize: '20px',
            fontWeight: '700',
            letterSpacing: '-0.5px',
          }}
        >
          Agregar Localidad
        </h2>

        {/* SUBTITLE */}
        <p
          style={{
            margin: '0 0 20px 0',
            color: '#cbd5e1',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Nueva ruta para <span style={{ color: '#64b5f6', fontWeight: '600' }}>{zona}</span>
        </p>

        {/* INPUT */}
        <input
          autoFocus
          type="text"
          placeholder="Nombre de la localidad..."
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid #475569',
            borderRadius: '10px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            transition: 'border-color 80ms ease, background-color 80ms ease',
            boxSizing: 'border-box',
            marginBottom: '20px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#64b5f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(100, 181, 246, 0.15)';
            e.target.style.backgroundColor = '#1a2540';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#475569';
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = '#0f172a';
          }}
        />

        {/* BUTTONS */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          {/* CANCELAR */}
          <button
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: '1px solid #475569',
              borderRadius: '8px',
              backgroundColor: '#334155',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'border-color 80ms ease, background-color 80ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#475569';
              e.target.style.borderColor = '#64748b';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#334155';
              e.target.style.borderColor = '#475569';
            }}
          >
            <X size={16} strokeWidth={2.5} />
            Cancelar
          </button>

          {/* CONFIRMAR */}
          <button
            onClick={handleConfirm}
            disabled={!localidad.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: localidad.trim() ? '#2196f3' : '#64748b',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: localidad.trim() ? 'pointer' : 'not-allowed',
              transition: 'border-color 80ms ease, background-color 80ms ease',
              opacity: localidad.trim() ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (localidad.trim()) {
                e.target.style.backgroundColor = '#1976d2';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(33, 150, 243, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              if (localidad.trim()) {
                e.target.style.backgroundColor = '#2196f3';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            Agregar
          </button>
        </div>

        {/* HINT */}
        <p
          style={{
            margin: '16px 0 0 0',
            color: '#64748b',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          💡 Presioná <kbd style={{ backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>Esc</kbd> para cerrar
        </p>
      </div>
    </div>
  );
}