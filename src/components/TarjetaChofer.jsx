import { Edit2, Trash2, MapPin, Truck, FileText, Calendar, Phone, User } from 'lucide-react';
import { memo } from 'react';

const ZONE_STYLES = {
  'OESTE': { bg: 'rgba(59,130,246,0.10)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  'SUR': { bg: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  'NORTE': { bg: 'rgba(236,72,153,0.10)', color: '#f472b6', border: 'rgba(236,72,153,0.25)' },
  'CABA': { bg: 'rgba(16,185,129,0.10)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  'OESTESUR': { bg: 'rgba(99,102,241,0.10)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
};

const CONDICION_STYLES = {
  'TITULAR': { dot: '#3b82f6', label: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  'SEMITITULAR': { dot: '#f59e0b', label: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  'SUPLENTE': { dot: '#64748b', label: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
};

const TarjetaChoferComponent = ({ chofer, onEdit, onConfirmDelete }) => {
  const zona = String(chofer.zona || '').toUpperCase().trim();
  const condicion = String(chofer.condicion || '').toUpperCase().trim();
  const zoneStyle = ZONE_STYLES[zona] || { bg: 'rgba(100,116,139,0.10)', color: '#94a3b8', border: 'rgba(100,116,139,0.2)' };
  const condStyle = CONDICION_STYLES[condicion] || CONDICION_STYLES['SUPLENTE'];
  const zonaLabel = zona === 'OESTESUR' ? 'OESTE / SUR' : zona || 'N/A';

  // Iniciales para avatar
  const initials = (chofer.nombre || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`
        .tarjeta-chofer {
          position: relative;
          border-radius: 16px;
          padding: 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease), border-color 0.2s var(--ease);
          overflow: hidden;
        }
        .tarjeta-chofer::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--tc-accent-a), var(--tc-accent-b));
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tarjeta-chofer:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-strong);
        }
        .tarjeta-chofer:hover::before { opacity: 1; }
        .tc-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-4);
          transition: background 0.15s, color 0.15s, transform 0.1s;
        }
        .tc-btn:hover { transform: scale(1.1); }
        .tc-btn.edit:hover { background: rgba(59,130,246,0.12); color: #60a5fa; }
        .tc-btn.delete:hover { background: rgba(239,68,68,0.12); color: #f87171; }
        .tc-phone-link {
          display: flex; align-items: center; gap: 5px;
          text-decoration: none;
          color: var(--text-3);
          font-size: 12px;
          transition: color 0.15s;
          margin-top: 4px;
        }
        .tc-phone-link:hover { color: #4ade80; text-decoration: underline; }
        .tc-map-link {
          display: flex; align-items: flex-start; gap: 5px;
          text-decoration: none;
          color: var(--text-3);
          font-size: 11px;
          line-height: 1.45;
          transition: color 0.15s;
        }
        .tc-map-link:hover { color: #60a5fa; text-decoration: underline; }
        .tc-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-4);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin: 0 0 5px;
          display: flex; align-items: center; gap: 4px;
        }
      `}</style>

      <div
        className="tarjeta-chofer"
        style={{ '--tc-accent-a': zoneStyle.color, '--tc-accent-b': condStyle.dot }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {/* Avatar */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: `${zoneStyle.color}20`, border: `1.5px solid ${zoneStyle.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: zoneStyle.color, fontWeight: '800', fontSize: '15px',
              letterSpacing: '-0.5px',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chofer.nombre}
              </h3>
              {chofer.celular ? (
                <a href={`https://wa.me/${chofer.celular.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="tc-phone-link">
                  <Phone size={11} />
                  {chofer.celular}
                </a>
              ) : (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-4)' }}>Sin celular</p>
              )}
            </div>
          </div>
          {/* Botones */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(chofer); }} className="tc-btn edit" title="Editar">
              <Edit2 size={15} strokeWidth={2} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onConfirmDelete(chofer); }} className="tc-btn delete" title="Eliminar">
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Grid de datos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>

          {/* Zona */}
          <div>
            <p className="tc-label"><MapPin size={10} /> Zona</p>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
              background: zoneStyle.bg, color: zoneStyle.color, border: `1px solid ${zoneStyle.border}`,
              letterSpacing: '0.3px',
            }}>
              {zonaLabel}
            </span>
          </div>

          {/* Condición */}
          <div>
            <p className="tc-label">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: condStyle.dot, display: 'inline-block', flexShrink: 0 }} />
              Condición
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
              background: condStyle.label, color: condStyle.color, border: `1px solid ${condStyle.color}30`,
              letterSpacing: '0.3px',
            }}>
              {chofer.condicion || 'N/A'}
            </span>
          </div>

          {/* Vehículo */}
          <div>
            <p className="tc-label"><Truck size={10} /> Vehículo</p>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>{chofer.vehiculo || 'N/A'}</p>
          </div>

          {/* DNI */}
          <div>
            <p className="tc-label"><FileText size={10} /> DNI</p>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{chofer.dni || 'N/A'}</p>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 12px' }} />

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {chofer.direccion && (
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(chofer.direccion)}`} target="_blank" rel="noopener noreferrer" className="tc-map-link">
              <MapPin size={11} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--text-4)' }} />
              <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{chofer.direccion}</span>
            </a>
          )}
          {chofer.fecha_ingreso && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={11} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Ingreso: {new Date(chofer.fecha_ingreso).toLocaleDateString('es-AR')}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const TarjetaChofer = memo(TarjetaChoferComponent);