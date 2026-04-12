import { AlertCircle, Archive, Trash2 } from 'lucide-react';
import { memo, useEffect } from 'react';

const ModalConfirmacionComponent = ({
  isOpen,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  isDanger = false,
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

  if (!isOpen) return null;

  const colors = {
    overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    modalBg: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '#334155' : '#e2e8f0',
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#cbd5e1' : '#64748b',
    buttonCancel: isDark ? '#334155' : '#e2e8f0',
    buttonCancelHover: isDark ? '#475569' : '#cbd5e1',
    primaryBg: isDanger ? '#ef4444' : '#3b82f6',
    primaryHover: isDanger ? '#dc2626' : '#2563eb',
    iconBg: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
    iconColor: isDanger ? '#ef4444' : '#3b82f6',
  };

  const Icono = isDanger ? Trash2 : Archive;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out forwards',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: colors.overlay }} 
        onMouseDown={(e) => { e.stopPropagation(); onCancel(); }}
      />

      <div
        style={{
          position: 'relative',
          backgroundColor: colors.modalBg,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? '0 25px 50px rgba(0, 0, 0, 0.5)' : '0 25px 50px rgba(0, 0, 0, 0.1)',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          animation: 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: colors.iconBg,
              border: `2px solid ${colors.iconColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDanger ? <AlertCircle size={32} color={colors.iconColor} strokeWidth={2} /> : <Icono size={32} color={colors.iconColor} strokeWidth={2} />}
          </div>
        </div>

        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
          {titulo}
        </h2>

        <p style={{ margin: '0 0 28px 0', fontSize: '14px', color: colors.textSecondary, textAlign: 'center', lineHeight: '1.5' }}>
          {mensaje}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onMouseDown={(e) => { e.stopPropagation(); onCancel(); }}
            style={{
              flex: 1, padding: '10px 16px', backgroundColor: colors.buttonCancel,
              border: `1px solid ${colors.border}`, borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', color: colors.textPrimary, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.buttonCancelHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.buttonCancel}
          >
            Cancelar
          </button>

          <button
            onMouseDown={(e) => { e.stopPropagation(); onConfirm(); }}
            style={{
              flex: 1, padding: '10px 16px', backgroundColor: colors.primaryBg, border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', color: '#ffffff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.primaryHover;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.primaryBg;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {isDanger ? <Trash2 size={16} strokeWidth={2} /> : null}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModalConfirmacion = memo(ModalConfirmacionComponent);
