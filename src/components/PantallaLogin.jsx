import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import '../index.css';

export function PantallaLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  /* ── Canvas: mapa de rutas con camiones animados ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodesPct = [
      { x: 0.12, y: 0.18 }, { x: 0.28, y: 0.08 }, { x: 0.55, y: 0.14 },
      { x: 0.78, y: 0.22 }, { x: 0.88, y: 0.45 }, { x: 0.72, y: 0.70 },
      { x: 0.50, y: 0.82 }, { x: 0.25, y: 0.75 }, { x: 0.08, y: 0.55 },
      { x: 0.40, y: 0.40 }, { x: 0.62, y: 0.48 }, { x: 0.18, y: 0.38 },
    ];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0],
      [9, 10], [9, 11], [2, 9], [10, 5], [11, 7], [1, 9], [3, 10], [4, 10],
    ];

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      alpha: Math.random() * 0.35 + 0.05,
    }));

    const trucks = edges.map(([a, b]) => ({
      from: a, to: b,
      t: Math.random(),
      speed: 0.0007 + Math.random() * 0.0007,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    let frame = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const nodes = nodesPct.map(n => ({ x: n.x * W, y: n.y * H }));

      /* Rutas */
      edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(nodes[a].x, nodes[a].y);
        ctx.lineTo(nodes[b].x, nodes[b].y);
        ctx.strokeStyle = 'rgba(59,130,246,0.09)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      /* Nodos */
      nodes.forEach((n, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.022 + i * 0.9);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(96,165,250,0.4)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59,130,246,${0.05 + pulse * 0.07})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /* Camiones */
      trucks.forEach(tr => {
        tr.t += tr.speed * tr.dir;
        if (tr.t > 1) { tr.t = 0; }
        if (tr.t < 0) { tr.t = 1; }

        const na = nodes[tr.from], nb = nodes[tr.to];
        const tx = na.x + (nb.x - na.x) * tr.t;
        const ty = na.y + (nb.y - na.y) * tr.t;
        const angle = Math.atan2((nb.y - na.y) * tr.dir, (nb.x - na.x) * tr.dir);

        /* Estela */
        const tailT = Math.max(0, tr.t - 0.10 * tr.dir);
        const tailX = na.x + (nb.x - na.x) * tailT;
        const tailY = na.y + (nb.y - na.y) * tailT;
        const grad = ctx.createLinearGradient(tailX, tailY, tx, ty);
        grad.addColorStop(0, 'rgba(59,130,246,0)');
        grad.addColorStop(1, 'rgba(96,165,250,0.35)');
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        /* Cuerpo */
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(96,165,250,0.75)';
        ctx.beginPath();
        ctx.roundRect(-8, -3.5, 13, 7, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(186,230,253,0.9)';
        ctx.beginPath();
        ctx.roundRect(3.5, -3, 5, 6, 1);
        ctx.fill();
        ctx.fillStyle = 'rgba(15,40,100,0.7)';
        [-3.5, 3.5].forEach(wx => {
          ctx.beginPath();
          ctx.arc(wx, 3.8, 1.6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });

      /* Partículas */
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${p.alpha})`;
        ctx.fill();
      });

      frame++;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verificá email y contraseña.'
          : 'Error al iniciar sesión. Intentá nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #020617 0%, #0c1c3a 55%, #030b19 100%)',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes lgCardIn {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes lgLogoIn {
          0%  { opacity:0; transform:scale(0.5) rotate(-12deg); }
          70% { transform:scale(1.07) rotate(2deg); }
          100%{ opacity:1; transform:scale(1) rotate(0deg); }
        }
        @keyframes lgFieldIn {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes lgScanline {
          from { transform:translateY(-100%); }
          to   { transform:translateY(600%); }
        }
        @keyframes lgOrbFloat1 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%     { transform:translate(45px,-35px) scale(1.1); }
        }
        @keyframes lgOrbFloat2 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%     { transform:translate(-35px,45px) scale(1.08); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        .lg-card  { animation: lgCardIn  0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .lg-logo  { animation: lgLogoIn  0.72s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; }
        .lg-f1    { animation: lgFieldIn 0.50s cubic-bezier(0.16,1,0.3,1) 0.30s both; }
        .lg-f2    { animation: lgFieldIn 0.50s cubic-bezier(0.16,1,0.3,1) 0.40s both; }
        .lg-f3    { animation: lgFieldIn 0.50s cubic-bezier(0.16,1,0.3,1) 0.50s both; }

        .lg-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #f1f5f9;
          font-size: 16px;
          outline: none;
          font-family: inherit;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .lg-input::placeholder { color: #334155; }
        .lg-input:focus {
          border-color: #3b82f6;
          background: rgba(59,130,246,0.07);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.14);
        }
        .lg-input.err { border-color: rgba(239,68,68,0.45); }

        .lg-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg,#3b82f6,#1d4ed8);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          letter-spacing: -.2px;
          position: relative;
          overflow: hidden;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 20px rgba(59,130,246,.4), inset 0 1px 0 rgba(255,255,255,.1);
        }
        .lg-btn::after {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(180deg, rgba(255,255,255,.1) 0%, transparent 55%);
          pointer-events:none;
        }
        .lg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(59,130,246,.5), inset 0 1px 0 rgba(255,255,255,.12);
        }
        .lg-btn:active:not(:disabled) { transform: translateY(0); }
        .lg-btn:disabled { opacity:.55; cursor:not-allowed; }

        .lg-label {
          display: block;
          font-size: 12px; font-weight: 700;
          letter-spacing: .9px; text-transform: uppercase;
          color: #475569; margin-bottom: 8px;
        }
        .lg-icon-wrap { position: relative; }
        .lg-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          transition: color .2s;
        }
        .lg-scanline {
          position: absolute; left:0; right:0;
          height: 80px;
          background: linear-gradient(to bottom, transparent, rgba(59,130,246,.025), transparent);
          animation: lgScanline 5s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      {/* Canvas fondo */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Orbes */}
      <div style={{ position: 'absolute', top: '-8%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle,rgba(29,78,216,.18) 0%,transparent 65%)', borderRadius: '50%', animation: 'lgOrbFloat1 9s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-12%', right: '-6%', width: '700px', height: '700px', background: 'radial-gradient(circle,rgba(109,40,217,.12) 0%,transparent 65%)', borderRadius: '50%', animation: 'lgOrbFloat2 13s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Card */}
      <div className="lg-card" style={{
        width: '100%', maxWidth: '480px', position: 'relative', zIndex: 10,
        background: 'rgba(8,18,38,0.84)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '24px',
        padding: '52px 48px 44px',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,.85), inset 0 0 0 1px rgba(255,255,255,.04)',
        overflow: 'hidden',
      }}>
        {/* Borde top brillante */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(59,130,246,.65),rgba(139,92,246,.45),transparent)', pointerEvents: 'none' }} />
        {/* Scanline */}
        <div className="lg-scanline" />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="lg-logo" style={{
            width: '100px', height: '100px', margin: '0 auto 22px',
            background: 'linear-gradient(145deg,#1e3a8a,#3b82f6 55%,#60a5fa)',
            borderRadius: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(59,130,246,.45), inset 0 1px 1px rgba(255,255,255,.15)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-25%', left: '-15%', width: '55%', height: '55%', background: 'rgba(255,255,255,.15)', borderRadius: '50%', filter: 'blur(6px)' }} />
            {/* Camión SVG — versión grande y clara */}
            <svg width="70" height="52" viewBox="0 0 70 52" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              {/* Carrocería principal */}
              <rect x="2" y="12" width="38" height="26" rx="4" fill="rgba(255,255,255,0.95)" />
              {/* Cabina */}
              <path d="M40 20 L40 38 L62 38 L62 30 L54 20 Z" fill="rgba(255,255,255,0.85)" />
              {/* Parabrisas cabina */}
              <path d="M43 22 L43 30 L54 30 L54 22 L49 16 Z" fill="rgba(147,197,253,0.75)" />
              {/* Ventana lateral carrocería */}
              <rect x="6" y="16" width="14" height="10" rx="2" fill="rgba(147,197,253,0.65)" />
              {/* Puerta carrocería */}
              <line x1="20" y1="16" x2="20" y2="38" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              {/* Manija puerta */}
              <rect x="21" y="26" width="5" height="2" rx="1" fill="rgba(59,130,246,0.5)" />
              {/* Parrilla frontal */}
              <rect x="56" y="24" width="5" height="10" rx="1" fill="rgba(255,255,255,0.4)" />
              {/* Faro delantero */}
              <rect x="57" y="22" width="5" height="4" rx="1" fill="rgba(255,235,100,0.9)" />
              {/* Chasis / piso */}
              <rect x="2" y="37" width="62" height="3" rx="1" fill="rgba(255,255,255,0.5)" />
              {/* Rueda trasera izq */}
              <circle cx="13" cy="43" r="7" fill="#1e3a8a" />
              <circle cx="13" cy="43" r="4" fill="rgba(255,255,255,0.15)" />
              <circle cx="13" cy="43" r="1.5" fill="rgba(255,255,255,0.4)" />
              {/* Rueda trasera der */}
              <circle cx="28" cy="43" r="7" fill="#1e3a8a" />
              <circle cx="28" cy="43" r="4" fill="rgba(255,255,255,0.15)" />
              <circle cx="28" cy="43" r="1.5" fill="rgba(255,255,255,0.4)" />
              {/* Rueda delantera */}
              <circle cx="51" cy="43" r="7" fill="#1e3a8a" />
              <circle cx="51" cy="43" r="4" fill="rgba(255,255,255,0.15)" />
              <circle cx="51" cy="43" r="1.5" fill="rgba(255,255,255,0.4)" />
              {/* Línea lateral decorativa */}
              <line x1="2" y1="28" x2="40" y2="28" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* Espejo retrovisor */}
              <rect x="38" y="21" width="4" height="3" rx="1" fill="rgba(255,255,255,0.6)" />
            </svg>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-.8px' }}>
            Logística Hogareño
          </h1>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px', fontWeight: '500', letterSpacing: '.5px' }}>
            Sistema de gestión de flota
          </p>
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)', margin: '0 0 24px' }} />

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMsg && (
            <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(239,68,68,.09)', border: '1px solid rgba(239,68,68,.22)', color: '#fca5a5', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.45, animation: 'lgFieldIn .3s ease both' }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>{errorMsg}
            </div>
          )}

          <div className="lg-f1">
            <label className="lg-label">Correo electrónico</label>
            <div className="lg-icon-wrap">
              <Mail size={16} className="lg-icon" color={focused === 'email' ? '#60a5fa' : '#475569'} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" className={`lg-input${errorMsg ? ' err' : ''}`} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
            </div>
          </div>

          <div className="lg-f2">
            <label className="lg-label">Contraseña</label>
            <div className="lg-icon-wrap">
              <Lock size={16} className="lg-icon" color={focused === 'password' ? '#60a5fa' : '#475569'} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={`lg-input${errorMsg ? ' err' : ''}`} style={{ letterSpacing: '3px' }} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
            </div>
          </div>

          <div className="lg-f3" style={{ marginTop: '4px' }}>
            <button type="submit" disabled={loading} className="lg-btn">
              {loading ? (<><Loader2 size={17} className="spin" />Autenticando...</>) : (<>Ingresar al sistema<ArrowRight size={16} /></>)}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#1e293b', letterSpacing: '.3px' }}>
          Acceso restringido · Personal autorizado
        </p>
      </div>
    </div>
  );
}