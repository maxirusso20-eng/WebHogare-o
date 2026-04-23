import { useState } from 'react';
import { Truck, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

export function PantallaLogin({ theme = 'dark' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  const bg = isDark ? '#020617' : '#f1f5f9';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text1 = isDark ? '#f1f5f9' : '#1e293b';
  const text2 = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f8fafc';
  const inputFocus = isDark ? '#1a2540' : '#ffffff';
  const inputBord = isDark ? '#475569' : '#cbd5e1';
  const blue = '#3b82f6';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message
      );
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px 10px 38px',
    backgroundColor: inputBg,
    border: `1.5px solid ${inputBord}`,
    borderRadius: '10px',
    fontSize: '14px',
    color: text1,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 80ms ease, background-color 80ms ease',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: card,
        borderRadius: '20px',
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 25px 60px rgba(0,0,0,0.5)'
          : '0 25px 60px rgba(0,0,0,0.10)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* LOGO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '16px',
            backgroundColor: `${blue}20`,
            border: `1.5px solid ${blue}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <Truck size={32} color={blue} strokeWidth={1.75} />
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: text1, letterSpacing: '-0.5px' }}>
            Logística Hogareño
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: text2 }}>
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* EMAIL */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color={text2} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = blue; e.target.style.backgroundColor = inputFocus; }}
                onBlur={e => { e.target.style.borderColor = inputBord; e.target.style.backgroundColor = inputBg; }}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color={text2} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: '40px' }}
                onFocus={e => { e.target.style.borderColor = blue; e.target.style.backgroundColor = inputFocus; }}
                onBlur={e => { e.target.style.borderColor = inputBord; e.target.style.backgroundColor = inputBg; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: text2, padding: '2px',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <p style={{ margin: 0, padding: '10px 14px', backgroundColor: '#ef444420', border: '1px solid #ef444440', borderRadius: '8px', fontSize: '13px', color: '#ef4444', fontWeight: '500' }}>
              {error}
            </p>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              padding: '11px',
              backgroundColor: loading ? '#475569' : blue,
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 100ms ease, transform 80ms ease',
              width: '100%',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = blue; }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: text2 }}>
          ¿No tenés cuenta? Pedile acceso al administrador.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}