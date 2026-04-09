import { Edit2, Trash2, MapPin, Truck, FileText, Calendar, Phone } from 'lucide-react';
import { memo } from 'react';

const TarjetaChoferComponent = ({ chofer, onEdit, onConfirmDelete }) => {
  
  // 🎨 1. Colores dinámicos a prueba de fallos
  const getZoneBadge = (zona) => {
    if (!zona) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    
    // ESCUDO: Forzamos a que sea String sí o sí antes de usar toUpperCase
    const z = String(zona).toUpperCase().trim();
    
    const badges = {
      'OESTE': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      'SUR': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      'NORTE': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      'CABA': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'OESTESUR': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    };
    
    return badges[z] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  };

  // ✂️ 2. Formateador de texto visual 
  const formatZona = (zona) => {
    if (!zona) return 'N/A';
    // ESCUDO: Forzamos a String
    const z = String(zona).toUpperCase().trim();
    if (z === 'OESTESUR') return 'OESTE / SUR';
    return z;
  };

  // 🟢 3. Puntos de color para la Condición
  const getCondicionDot = (condicion) => {
    if (!condicion) return 'bg-slate-400';
    // ESCUDO: Forzamos a String
    const c = String(condicion).toUpperCase().trim();
    switch (c) {
      case 'TITULAR': return 'bg-blue-500';
      case 'SEMITITULAR': return 'bg-amber-500';
      case 'SUPLENTE': return 'bg-slate-400';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      
      {/* CABECERA */}
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-base font-bold truncate" style={{ color: 'var(--text-1)' }}>
            {chofer.nombre}
          </h3>
          {chofer.celular && (
            <a
              href={`https://wa.me/${chofer.celular.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-1.5 transition-all duration-150 hover:text-green-400 hover:underline cursor-pointer"
            >
              <Phone size={12} className="text-slate-500 flex-shrink-0 group-hover:text-green-400" />
              <p className="m-0 text-xs" style={{ color: 'var(--text-3)' }}>
                {chofer.celular}
              </p>
            </a>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(chofer); }}
            className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-blue-500/15 hover:text-blue-400 p-0"
            title="Editar"
          >
            <Edit2 size={16} strokeWidth={2} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirmDelete(chofer); }}
            className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-red-500/15 hover:text-red-400 p-0"
            title="Eliminar"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* GRID DE DATOS */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* ZONA */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            <p className="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zona</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border w-fit ${getZoneBadge(chofer.zona)}`}>
            {formatZona(chofer.zona)}
          </span>
        </div>

        {/* VEHÍCULO */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Truck size={14} className="text-slate-400" />
            <p className="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehículo</p>
          </div>
          <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{chofer.vehiculo || 'N/A'}</p>
        </div>

        {/* DNI */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            <p className="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DNI</p>
          </div>
          <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{chofer.dni || 'N/A'}</p>
        </div>

        {/* CONDICIÓN */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${getCondicionDot(chofer.condicion)}`} />
            <p className="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condición</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border w-fit" style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}>
            {chofer.condicion || 'N/A'}
          </span>
        </div>
      </div>

      <div className="h-px my-3" style={{ background: 'var(--border)' }} />

      {/* FOOTER */}
      <div className="flex flex-col gap-2">
        {chofer.direccion && (
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(chofer.direccion)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-1.5 items-start transition-all duration-150 hover:text-blue-400 hover:underline cursor-pointer block"
          >
            <MapPin size={12} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="m-0 text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-3)' }}>
              {chofer.direccion}
            </p>
          </a>
        )}
        {chofer.fecha_ingreso && (
          <div className="flex gap-1.5 items-center">
            <Calendar size={12} className="text-slate-500 shrink-0" />
            <p className="m-0 text-[11px]" style={{ color: 'var(--text-3)' }}>
              {new Date(chofer.fecha_ingreso).toLocaleDateString('es-AR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const TarjetaChofer = memo(TarjetaChoferComponent);