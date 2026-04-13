import { useState, useContext } from 'react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { ShieldCheck, UserPlus, Trash2, Shield, AlertTriangle } from 'lucide-react';

export function PantallaRoles() {
  const { theme, subadmins, setSubadmins, isSuperAdmin, mostrarToast } = useContext(AppContext);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const cardBg = theme === 'light' ? '#ffffff' : '#1e293b';
  const textPrimary = theme === 'light' ? '#1e293b' : '#f8fafc';
  const textSecondary = theme === 'light' ? '#64748b' : '#94a3b8';
  const border = theme === 'light' ? '#e2e8f0' : '#334155';

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: '#ef4444' }} />
        <h2>Acceso Denegado</h2>
        <p>Solo el administrador principal puede gestionar permisos.</p>
      </div>
    );
  }

  const handleAddSubadmin = async (e) => {
    e.preventDefault();
    if (!nuevoEmail.trim() || !nuevoEmail.includes('@')) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Subadmins')
        .insert([{ email: nuevoEmail.toLowerCase().trim() }])
        .select();

      if (error) throw error;
      
      setSubadmins(prev => [...prev, data[0]]);
      setNuevoEmail('');
      mostrarToast('✅ Subadmin agregado con éxito', 'success');
    } catch (err) {
      console.error(err);
      if (err.message?.includes('does not exist')) {
         mostrarToast('⚠️ Error: Debes crear la tabla Subadmins en Supabase primero', 'error');
      } else {
         mostrarToast('❌ Error al agregar subadmin', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      const { error } = await supabase.from('Subadmins').delete().eq('id', id);
      if (error) throw error;
      setSubadmins(prev => prev.filter(s => s.id !== id));
      mostrarToast('🗑️ Subadmin eliminado', 'info');
    } catch (err) {
      console.error(err);
      mostrarToast('❌ Error al eliminar', 'error');
    }
  };

  return (
    <div className="animate-fade-slide" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: '#8b5cf620', padding: '12px', borderRadius: '16px' }}>
          <ShieldCheck size={32} color="#8b5cf6" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: textPrimary }}>Gestión de Roles</h1>
          <p style={{ margin: '4px 0 0', fontSize: '15px', color: textSecondary }}>Asignar privilegios de administrador a otros correos de choferes</p>
        </div>
      </div>

      <div style={{ 
        background: cardBg, 
        borderRadius: '20px', 
        border: `1px solid ${border}`,
        overflow: 'hidden',
        boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : '0 10px 25px -5px rgba(0,0,0,0.3)',
      }}>
        {/* Formulario de agregar */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${border}`, background: theme === 'light' ? '#f8fafc' : '#0f172a' }}>
          <form onSubmit={handleAddSubadmin} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: textSecondary, marginBottom: '8px' }}>
                NUEVO SUBADMINISTRADOR
              </label>
              <div style={{ position: 'relative' }}>
                <UserPlus size={18} color="#64748b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  required
                  placeholder="correo@ejemplo.com"
                  value={nuevoEmail}
                  onChange={e => setNuevoEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px 14px 44px',
                    background: theme === 'light' ? '#ffffff' : '#1e293b',
                    border: `1px solid ${border}`, borderRadius: '12px',
                    color: textPrimary, outline: 'none', fontSize: '15px'
                  }}
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: '#8b5cf6', color: 'white', border: 'none',
                padding: '0 24px', height: '50px', borderRadius: '12px',
                fontWeight: '600', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {loading ? 'Agregando...' : 'Asignar Rol'}
            </button>
          </form>
        </div>

        {/* Lista de subadmins */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#8b5cf6" />
            Usuarios con acceso total
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Super Admin Siempre Presente */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px', borderRadius: '12px', border: `1px solid ${border}`,
              background: theme === 'light' ? '#f1f5f9' : '#020617'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '700', color: textPrimary }}>maxirusso20@gmail.com</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8b5cf6', fontWeight: '800', letterSpacing: '0.5px' }}>OWNER / SUPER ADMIN</p>
              </div>
              <div style={{ color: textSecondary, fontSize: '13px', fontWeight: '600' }}>Inamovible</div>
            </div>

            {/* Lista Dinámica */}
            {subadmins.length === 0 ? (
              <p style={{ textAlign: 'center', color: textSecondary, padding: '20px 0', fontSize: '14px' }}>No hay subadministradores asignados.</p>
            ) : (
              subadmins.map(sub => (
                <div key={sub.id} className="animate-fade-slide" style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: '12px', border: `1px solid ${border}`,
                  background: cardBg
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', color: textPrimary }}>{sub.email}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>SUB-ADMIN</p>
                  </div>
                  <button
                    onClick={() => handleEliminar(sub.id)}
                    style={{
                      background: 'transparent', border: 'none', color: '#ef4444',
                      padding: '8px', cursor: 'pointer', borderRadius: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ef444415'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Revocar Rol"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
