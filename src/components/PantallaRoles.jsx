import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { useAuth } from './AuthContext';
import { ShieldCheck, UserPlus, Trash2, Shield, Crown, Users } from 'lucide-react';

const ROLES_INFO = {
  subadmin: { label: 'Subadmin', color: '#8b5cf6', desc: 'Ve todo menos Roles' },
  coordinador: { label: 'Coordinador', color: '#06b6d4', desc: 'Chat, Recorridos, Dashboard, Maps' },
};

export function PantallaRoles() {
  const { theme, mostrarToast } = useContext(AppContext);
  const { session } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState('subadmin');
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const pageBg = isDark ? '#020617' : '#f8fafc';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';
  const inputBg = isDark ? '#0f172a' : '#f8fafc';

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data } = await supabase.from('roles_usuarios').select('*').order('created_at', { ascending: false });
      setUsuarios(data || []);
      setCargando(false);
    };
    cargar();
  }, []);

  const handleAgregar = async (e) => {
    e.preventDefault();
    const emailLimpio = nuevoEmail.trim().toLowerCase();
    if (!emailLimpio || !emailLimpio.includes('@')) return;

    setLoading(true);
    try {
      // Upsert — si ya existe, actualiza el rol
      const { data, error } = await supabase
        .from('roles_usuarios')
        .upsert([{ email: emailLimpio, rol: nuevoRol }], { onConflict: 'email' })
        .select();

      if (error) throw error;

      setUsuarios(prev => {
        const sinEste = prev.filter(u => u.email !== emailLimpio);
        return [data[0], ...sinEste];
      });
      setNuevoEmail('');
      mostrarToast(`✅ ${emailLimpio} → ${ROLES_INFO[nuevoRol].label}`, 'success');
    } catch (err) {
      console.error(err);
      mostrarToast('❌ Error al guardar. ¿Existe la tabla roles_usuarios?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, email) => {
    try {
      const { error } = await supabase.from('roles_usuarios').delete().eq('id', id);
      if (error) throw error;
      setUsuarios(prev => prev.filter(u => u.id !== id));
      mostrarToast(`🗑️ ${email} sin rol asignado`, 'info');
    } catch (err) {
      mostrarToast('❌ Error al eliminar', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%', backgroundColor: pageBg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ background: '#8b5cf620', padding: '12px', borderRadius: '16px' }}>
          <ShieldCheck size={30} color="#8b5cf6" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: textPrimary }}>Gestión de Roles</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: textSecondary }}>Asigná permisos a los miembros del equipo</p>
        </div>
      </div>

      {/* LEYENDA DE ROLES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[
          { rol: 'admin', color: '#f59e0b', icon: '👑', label: 'Admin', desc: 'Acceso total + gestión de roles', emails: ['maxirusso20@gmail.com'] },
          { rol: 'subadmin', color: '#8b5cf6', icon: '🛡️', label: 'Subadmin', desc: 'Ve todo menos Roles' },
          { rol: 'coordinador', color: '#06b6d4', icon: '📋', label: 'Coordinador', desc: 'Chat, Recorridos, Dashboard, Maps' },
        ].map(r => (
          <div key={r.rol} style={{ backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${border}`, borderLeft: `4px solid ${r.color}`, padding: '14px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: r.color }}>{r.icon} {r.label}</p>
            <p style={{ margin: 0, fontSize: '11px', color: textSecondary, lineHeight: '1.4' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Asignar nuevo rol
          </h3>
          <form onSubmit={handleAgregar} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: textSecondary, marginBottom: '6px' }}>EMAIL</label>
              <div style={{ position: 'relative' }}>
                <UserPlus size={15} color={textSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="email" required
                  placeholder="correo@ejemplo.com"
                  value={nuevoEmail}
                  onChange={e => setNuevoEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', boxSizing: 'border-box',
                    backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '10px',
                    color: textPrimary, fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: textSecondary, marginBottom: '6px' }}>ROL</label>
              <select
                value={nuevoRol}
                onChange={e => setNuevoRol(e.target.value)}
                style={{
                  padding: '10px 12px', backgroundColor: inputBg, border: `1px solid ${border}`,
                  borderRadius: '10px', color: textPrimary, fontSize: '14px', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="subadmin">Subadmin</option>
                <option value="coordinador">Coordinador</option>
              </select>
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                padding: '10px 20px', backgroundColor: '#8b5cf6', border: 'none',
                borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Guardando...' : 'Asignar'}
            </button>
          </form>
        </div>

        {/* LISTA DE USUARIOS */}
        <div style={{ padding: '20px' }}>
          {/* Admin fijo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${border}`, marginBottom: '8px', backgroundColor: isDark ? '#0f172a' : '#fefce8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>👑</span>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: textPrimary }}>maxirusso20@gmail.com</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>OWNER / ADMIN — inamovible</p>
              </div>
            </div>
          </div>

          {cargando ? (
            <p style={{ textAlign: 'center', color: textSecondary, padding: '20px', fontSize: '13px' }}>⏳ Cargando...</p>
          ) : usuarios.length === 0 ? (
            <p style={{ textAlign: 'center', color: textSecondary, padding: '20px', fontSize: '13px' }}>No hay usuarios con roles asignados.</p>
          ) : (
            usuarios.map(u => {
              const info = ROLES_INFO[u.rol] || { label: u.rol, color: '#64748b' };
              return (
                <div key={u.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: '10px', border: `1px solid ${border}`,
                  marginBottom: '8px', backgroundColor: cardBg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${info.color}20`, border: `1.5px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {u.rol === 'subadmin' ? '🛡️' : '📋'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: textPrimary }}>{u.email}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: info.color, fontWeight: '700' }}>{info.label.toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEliminar(u.id, u.email)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '6px', cursor: 'pointer', borderRadius: '6px', transition: 'background 0.15s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ef444415'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Quitar rol"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}