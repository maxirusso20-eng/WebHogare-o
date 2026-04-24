import { useState, useEffect, useRef } from 'react';
import { Truck, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

// ── Canvas animation: trucks delivering to houses ────────────────────────────
function DeliveryCanvas({ isDark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const rand = (a, b) => a + Math.random() * (b - a);
    const lerp = (a, b, t) => a + (b - a) * t;

    // ── Draw functions ───────────────────────────────────────────────────────
    function drawHouse(ctx, x, y, scale = 1, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Body
      ctx.fillStyle = isDark ? '#1e3a5f' : '#bfdbfe';
      ctx.strokeStyle = isDark ? '#2563eb30' : '#93c5fd60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-18, -12, 36, 26);
      ctx.fill(); ctx.stroke();

      // Roof
      ctx.fillStyle = isDark ? '#1d4ed8' : '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.lineTo(0, -30);
      ctx.lineTo(22, -12);
      ctx.closePath();
      ctx.fill();

      // Door
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.rect(-5, 2, 10, 12);
      ctx.fill();

      // Window
      ctx.fillStyle = '#fbbf2430';
      ctx.strokeStyle = '#fbbf2460';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.rect(-14, -6, 10, 8);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.rect(4, -6, 10, 8);
      ctx.fill(); ctx.stroke();

      // Chimney
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.rect(8, -30, 5, 12);
      ctx.fill();

      ctx.restore();
    }

    function drawTruck(ctx, x, y, scale = 1, alpha = 1, flip = false) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(flip ? -scale : scale, scale);

      // Body
      ctx.fillStyle = isDark ? '#1d4ed8' : '#2563eb';
      ctx.strokeStyle = isDark ? '#3b82f630' : '#3b82f650';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-28, -14, 44, 20, 3);
      ctx.fill(); ctx.stroke();

      // Cab
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(16, -18, 16, 24, [3, 3, 0, 0]);
      ctx.fill();

      // Window
      ctx.fillStyle = '#bfdbfe40';
      ctx.strokeStyle = '#93c5fd60';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(18, -16, 12, 9, 2);
      ctx.fill(); ctx.stroke();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      [-18, 22].forEach(wx => {
        ctx.beginPath();
        ctx.arc(wx, 7, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Hubcap
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(wx, 7, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
      });

      // Headlight
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.ellipse(32, -4, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawPerson(ctx, x, y, scale = 1, alpha = 1, hasBox = false, armAngle = 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs (walk animation)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const legSwing = Math.sin(armAngle) * 6;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(-4 + legSwing, 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(4 - legSwing, 18);
      ctx.stroke();

      // Body
      ctx.fillStyle = isDark ? '#334155' : '#475569';
      ctx.beginPath();
      ctx.roundRect(-5, -2, 10, 12, 3);
      ctx.fill();

      // Arms
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      if (hasBox) {
        // Arms holding box out front
        ctx.beginPath();
        ctx.moveTo(-5, 2);
        ctx.lineTo(-10, 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, 2);
        ctx.lineTo(10, 8);
        ctx.stroke();
        // Box
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-10, 6, 20, 14, 2);
        ctx.fill(); ctx.stroke();
        // Box tape
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 6); ctx.lineTo(0, 20);
        ctx.moveTo(-10, 13); ctx.lineTo(10, 13);
        ctx.stroke();
      } else {
        const armSwing = Math.cos(armAngle) * 8;
        ctx.beginPath();
        ctx.moveTo(-5, 2); ctx.lineTo(-10, 2 + armSwing);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, 2); ctx.lineTo(10, 2 - armSwing);
        ctx.stroke();
      }

      // Head
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -8, 7, 0, Math.PI * 2);
      ctx.fill();

      // Cap
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.ellipse(0, -13, 7, 3, 0, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-9, -15, 18, 4);
      ctx.fill();

      ctx.restore();
    }

    function drawPackage(ctx, x, y, scale = 1, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-8, -8, 16, 16, 2);
      ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(0, 8);
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
      ctx.stroke();

      ctx.restore();
    }

    function drawStar(ctx, x, y, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', x, y);
      ctx.restore();
    }

    function drawSmoke(ctx, x, y, r, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.15;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Scene objects ─────────────────────────────────────────────────────────
    const W = () => canvas.width;
    const H = () => canvas.height;

    // Houses scattered in background
    const houses = Array.from({ length: 8 }, (_, i) => ({
      x: (W() / 8) * i + rand(20, 60),
      y: rand(H() * 0.55, H() * 0.85),
      scale: rand(0.6, 1.1),
      alpha: rand(0.25, 0.55),
    }));

    // Trucks
    class TruckObj {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.flip = Math.random() > 0.5;
        this.x = this.flip ? W() + 60 : -60;
        this.y = rand(H() * 0.6, H() * 0.88);
        this.speed = rand(0.6, 1.4);
        this.scale = rand(0.7, 1.2);
        this.alpha = rand(0.3, 0.6);
        this.smokeT = 0;
        this.smokes = [];
        if (initial) this.x = rand(0, W());
      }
      update() {
        this.x += this.flip ? -this.speed : this.speed;
        this.smokeT += 0.05;
        if (this.smokeT > 1) {
          this.smokeT = 0;
          this.smokes.push({ x: this.x + (this.flip ? 28 : -28), y: this.y - 18, r: 3, alpha: 0.8, age: 0 });
        }
        this.smokes = this.smokes.filter(s => s.age < 60);
        this.smokes.forEach(s => { s.y -= 0.4; s.r += 0.15; s.age++; s.alpha = 0.8 * (1 - s.age / 60); });
        if ((this.flip && this.x < -120) || (!this.flip && this.x > W() + 120)) this.reset();
      }
      draw(ctx) {
        this.smokes.forEach(s => drawSmoke(ctx, s.x, s.y, s.r, s.alpha));
        drawTruck(ctx, this.x, this.y, this.scale, this.alpha, this.flip);
      }
    }

    // Delivery people
    class PersonObj {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = rand(W() * 0.05, W() * 0.95);
        this.y = rand(H() * 0.65, H() * 0.9);
        this.scale = rand(0.55, 0.9);
        this.alpha = rand(0.3, 0.55);
        this.speed = rand(0.3, 0.8) * (Math.random() > 0.5 ? 1 : -1);
        this.hasBox = Math.random() > 0.4;
        this.armAngle = rand(0, Math.PI * 2);
        this.targetX = rand(0, W());
        this.delivering = false;
        this.deliverT = 0;
        this.starAlpha = 0;
        if (initial) { /* ok */ }
      }
      update() {
        this.armAngle += 0.08;
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < 5) {
          // Arrived — deliver
          if (this.hasBox && !this.delivering) {
            this.delivering = true;
            this.deliverT = 0;
          } else if (!this.delivering) {
            this.targetX = rand(0, W());
            this.speed = rand(0.3, 0.8) * (this.targetX > this.x ? 1 : -1);
          }
        } else {
          this.speed = (dx > 0 ? 1 : -1) * rand(0.4, 0.9);
          this.x += this.speed;
        }

        if (this.delivering) {
          this.deliverT++;
          this.starAlpha = Math.min(1, this.deliverT / 20);
          if (this.deliverT > 60) {
            this.hasBox = false;
            this.delivering = false;
            this.starAlpha = 0;
            this.targetX = rand(0, W());
          }
        }
        if (this.x < -40 || this.x > W() + 40) this.reset(true);
      }
      draw(ctx) {
        drawPerson(ctx, this.x, this.y, this.scale, this.alpha, this.hasBox && !this.delivering, this.armAngle);
        if (this.delivering && this.deliverT < 60) {
          drawPackage(ctx, this.x, this.y - 30 * this.scale, this.scale * 0.8, this.alpha * (1 - this.deliverT / 60));
          if (this.starAlpha > 0) drawStar(ctx, this.x + 20 * this.scale, this.y - 50 * this.scale, this.alpha * this.starAlpha);
        }
      }
    }

    // Floating packages
    class FloatPkg {
      constructor() { this.reset(); }
      reset() {
        this.x = rand(0, W());
        this.y = rand(H() * 0.1, H() * 0.5);
        this.scale = rand(0.4, 0.8);
        this.alpha = rand(0.05, 0.18);
        this.vy = rand(-0.3, -0.8);
        this.vx = rand(-0.2, 0.2);
        this.angle = rand(0, Math.PI * 2);
        this.va = rand(-0.01, 0.01);
      }
      update() {
        this.y += this.vy;
        this.x += this.vx;
        this.angle += this.va;
        this.alpha -= 0.0004;
        if (this.alpha <= 0 || this.y < -30) this.reset();
      }
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 16, 2);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(0, 8);
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Road line
    function drawRoad(ctx) {
      const roadY = H() * 0.92;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
      ctx.fillRect(0, roadY, W(), H() * 0.08);
      // Dashes
      ctx.setLineDash([30, 20]);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.moveTo(0, roadY + 10);
      ctx.lineTo(W(), roadY + 10);
      ctx.stroke();
      ctx.restore();
    }

    const trucks = Array.from({ length: 4 }, () => new TruckObj());
    const people = Array.from({ length: 7 }, () => new PersonObj());
    const pkgs = Array.from({ length: 14 }, () => new FloatPkg());

    // ── Main loop ─────────────────────────────────────────────────────────────
    let t = 0;
    function loop() {
      ctx.clearRect(0, 0, W(), H());

      // Background gradient — respeta tema
      const grad = ctx.createLinearGradient(0, 0, 0, H());
      if (isDark) {
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.6, '#0a1628');
        grad.addColorStop(1, '#0f1e35');
      } else {
        grad.addColorStop(0, '#e0f2fe');
        grad.addColorStop(0.5, '#f0f9ff');
        grad.addColorStop(1, '#e2e8f0');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W(), H());

      // Stars — solo en modo oscuro
      if (isDark) {
        for (let i = 0; i < 60; i++) {
          const sx = (i * 137.5 + 17) % W();
          const sy = (i * 93.7 + 11) % (H() * 0.55);
          const sa = 0.2 + 0.3 * Math.abs(Math.sin(t * 0.01 + i));
          ctx.globalAlpha = sa;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // Nubes suaves en modo claro
        for (let i = 0; i < 5; i++) {
          const cx = ((i * 200 + t * 0.3) % (W() + 120)) - 60;
          const cy = 60 + i * 40;
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#ffffff';
          [0, 22, -22, 36, -36].forEach(ox => {
            ctx.beginPath();
            ctx.arc(cx + ox, cy, 28 - Math.abs(ox) * 0.3, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // Glow blobs — adaptar colores según tema
      const blobColors = isDark
        ? ['#1d4ed8', '#7c3aed', '#0891b2']
        : ['#3b82f6', '#8b5cf6', '#0ea5e9'];
      [
        { x: W() * 0.2, y: H() * 0.3, c: blobColors[0], r: 180 },
        { x: W() * 0.8, y: H() * 0.5, c: blobColors[1], r: 140 },
        { x: W() * 0.5, y: H() * 0.8, c: blobColors[2], r: 120 },
      ].forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c + '18');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W(), H());
      });

      // Road
      drawRoad(ctx);

      // Houses (back)
      houses.forEach(h => {
        h.x = ((h.x + 0.05) % (W() + 80)) - 40; // very slow drift
        drawHouse(ctx, h.x, h.y, h.scale, h.alpha);
      });

      // Floating packages
      pkgs.forEach(p => { p.update(); p.draw(ctx); });

      // Trucks
      trucks.forEach(tr => { tr.update(); tr.draw(ctx); });

      // People
      people.forEach(p => { p.update(); p.draw(ctx); });

      t++;
      raf = requestAnimationFrame(loop);
    }

    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Main login ────────────────────────────────────────────────────────────────
export function PantallaLogin({ theme = 'dark' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  const bg = isDark ? '#020617' : '#f1f5f9';
  const card = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.9)';
  const border = isDark ? 'rgba(59,130,246,0.2)' : '#e2e8f0';
  const text1 = isDark ? '#f1f5f9' : '#1e293b';
  const text2 = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? 'rgba(2,6,23,0.7)' : '#f8fafc';
  const inputFocus = isDark ? 'rgba(30,58,138,0.25)' : '#ffffff';
  const inputBord = isDark ? '#334155' : '#cbd5e1';
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
    transition: 'border-color 80ms ease, background-color 80ms ease, box-shadow 80ms ease',
    backdropFilter: 'blur(4px)',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Animated background */}
      <DeliveryCanvas isDark={isDark} />

      {/* Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: card,
        borderRadius: '20px',
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 0 0 1px rgba(59,130,246,0.1), 0 25px 60px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.08)'
          : '0 25px 60px rgba(0,0,0,0.10)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
        backdropFilter: 'blur(20px)',
        animation: 'loginSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
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
            boxShadow: `0 0 24px ${blue}30`,
            animation: 'loginPulse 3s ease-in-out infinite',
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
                onFocus={e => { e.target.style.borderColor = blue; e.target.style.backgroundColor = inputFocus; e.target.style.boxShadow = `0 0 0 3px ${blue}20`; }}
                onBlur={e => { e.target.style.borderColor = inputBord; e.target.style.backgroundColor = inputBg; e.target.style.boxShadow = 'none'; }}
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
                onFocus={e => { e.target.style.borderColor = blue; e.target.style.backgroundColor = inputFocus; e.target.style.boxShadow = `0 0 0 3px ${blue}20`; }}
                onBlur={e => { e.target.style.borderColor = inputBord; e.target.style.backgroundColor = inputBg; e.target.style.boxShadow = 'none'; }}
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
              transition: 'background-color 100ms ease, transform 80ms ease, box-shadow 100ms ease',
              width: '100%',
              boxShadow: loading ? 'none' : `0 4px 20px ${blue}40`,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${blue}50`; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.backgroundColor = blue; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${blue}40`; } }}
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes loginPulse {
          0%, 100% { box-shadow: 0 0 24px #3b82f630; }
          50%       { box-shadow: 0 0 40px #3b82f660; }
        }
      `}</style>
    </div>
  );
}