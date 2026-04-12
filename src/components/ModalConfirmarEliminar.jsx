import { AlertCircle, Trash2, X } from 'lucide-react';
import { memo, useEffect } from 'react';

const ModalConfirmarEliminarComponent = ({
  isOpen,
  nombre = 'este chofer',
  onConfirm,
  onCancel,
  tema = 'dark'
}) => {
  const isDark = tema === 'dark';

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);
  const colors = {
    overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    modalBg: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '#334155' : '#e2e8f0',
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#cbd5e1' : '#64748b',
    buttonCancel: isDark ? '#334155' : '#e2e8f0',
    buttonCancelHover: isDark ? '#475569' : '#cbd5e1',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 120ms ease, transform 120ms ease',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      {/* BACKDROP */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: colors.overlay,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onCancel(); }}
      />

      {/* MODAL */}
      <div
        style={{
          position: 'relative',
          backgroundColor: colors.modalBg,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark
            ? '0 25px 50px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px rgba(0, 0, 0, 0.1)',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 120ms ease, transform 120ms ease',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ICONO DE ALERTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={32} color="#ef4444" strokeWidth={2} />
          </div>
        </div>

        {/* TÍTULO */}
        <h2
          style={{
            margin: '0 0 12px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: colors.textPrimary,
            textAlign: 'center',
          }}
        >
          ¿Estás seguro?
        </h2>

        {/* MENSAJE */}
        <p
          style={{
            margin: '0 0 28px 0',
            fontSize: '14px',
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          Esta acción eliminará permanentemente a <strong>{nombre}</strong> de la base de datos. No se puede deshacer.
        </p>

        {/* BOTONES */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {/* CANCELAR */}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: colors.buttonCancel,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.textPrimary,
              cursor: 'pointer',
              transition: 'border-color 80ms ease, background-color 80ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.buttonCancelHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.buttonCancel;
            }}
          >
            Cancelar
          </button>

          {/* ELIMINAR */}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#ef4444',
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
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ef4444';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <Trash2 size={16} strokeWidth={2} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModalConfirmarEliminar = memo(ModalConfirmarEliminarComponent);