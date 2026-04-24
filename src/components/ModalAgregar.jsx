import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export function ModalAgregar({ isOpen, zona, onClose, onConfirm, theme = 'dark' }) {
  const [localidad, setLocalidad] = useState('');
  const isDark = theme === 'dark';
  const modalBg = isDark ? '#1e293b' : '#ffffff';
  const borderCol = isDark ? '#334155' : '#e2e8f0';
  const textPrim = isDark ? '#f8fafc' : '#1e293b';
  const textSec = isDark ? '#cbd5e1' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f8fafc';
  const inputFocusBg = isDark ? '#1a2540' : '#ffffff';
  const inputBord = isDark ? '#475569' : '#cbd5e1';
  const accent = '#64b5f6';

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
        backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
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
          backgroundColor: modalBg,
          borderRadius: '16px',
          padding: '28px',
          boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 25px 50px -12px rgba(0,0,0,0.15)',
          maxWidth: '400px',
          width: '90%',
          border: `1px solid ${borderCol}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TITLE */}
        <h2
          style={{
            margin: '0 0 12px 0',
            color: textPrim,
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
            color: textSec,
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
            border: `1px solid ${inputBord}`,
            borderRadius: '10px',
            backgroundColor: '#0f172a',
            color: textPrim,
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            transition: 'border-color 80ms ease, background-color 80ms ease',
            boxSizing: 'border-box',
            marginBottom: '20px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = accent;
            e.target.style.boxShadow = '0 0 0 3px rgba(100, 181, 246, 0.15)';
            e.target.style.backgroundColor = inputFocusBg;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = inputBord;
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = inputBg;
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
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: textPrim,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'border-color 80ms ease, background-color 80ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isDark ? '#475569' : '#e2e8f0';
              e.target.style.borderColor = isDark ? '#64748b' : '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';
              e.target.style.borderColor = inputBord;
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
            color: textSec,
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          💡 Presioná <kbd style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: textSec }}>Esc</kbd> para cerrar
        </p>
      </div>
    </div>
  );
}