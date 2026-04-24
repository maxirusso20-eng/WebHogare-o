import { useState, useEffect, useRef } from 'react';
import { Truck, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

// ── Canvas: premium logistics network ────────────────────────────────────────
function DeliveryCanvas({ isDark: themeIsDark }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(themeIsDark);
  themeRef.current = themeIsDark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const W = () => canvas.width, H = () => canvas.height;
    const rand = (a,b) => a + Math.random()*(b-a);

    const C_DARK = { bg0:'#020817',bg1:'#04112a',node:'#3b82f6',hub:'#60a5fa',pulse:'#93c5fd',
        truck0:'#60a5fa',truck1:'#2563eb',cab:'#1d4ed8',win:'#bfdbfe50',
        route:'#1e3a8a',routeGlow:'#3b82f618',pkg:'#f59e0b',label:'#ffffff',
        grid:'rgba(59,130,246,0.04)',star:'rgba(255,255,255,0.8)' };
    const C_LIGHT = { bg0:'#dbeafe',bg1:'#eff6ff',node:'#2563eb',hub:'#1d4ed8',pulse:'#3b82f6',
        truck0:'#3b82f6',truck1:'#1d4ed8',cab:'#1e40af',win:'#dbeafe80',
        route:'#93c5fd',routeGlow:'#3b82f612',pkg:'#d97706',label:'#94a3b8',
        grid:'rgba(37,99,235,0.05)',star:null };

    let isDark = themeRef.current;
    let C = isDark ? C_DARK : C_LIGHT;

    const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const qb  = (t,ax,ay,cx,cy,bx,by) => ({
      x:(1-t)**2*ax+2*(1-t)*t*cx+t**2*bx,
      y:(1-t)**2*ay+2*(1-t)*t*cy+t**2*by });
    const qba = (t,ax,ay,cx,cy,bx,by) => {
      const dx=2*(1-t)*(cx-ax)+2*t*(bx-cx), dy=2*(1-t)*(cy-ay)+2*t*(by-cy);
      return Math.atan2(dy,dx); };

    const NODE_DEF = [
      {rx:.45, ry:.70, type:'wh',  label:'Depósito'},
      {rx:.15, ry:.25, type:'hub', label:'Pilar'},
      {rx:.70, ry:.15, type:'hub', label:'Tigre'},
      {rx:.40, ry:.10, type:'stp', label:'Escobar'},
      {rx:.90, ry:.85, type:'stp', label:'Quilmes'},
      {rx:.65, ry:.85, type:'hub', label:'Lomas'},
      {rx:.20, ry:.60, type:'stp', label:'Morón'},
      {rx:.65, ry:.45, type:'wh',  label:'CABA'},
      {rx:.85, ry:.48, type:'hub', label:'Centro'},
      {rx:.88, ry:.65, type:'stp', label:'Avellaneda'},
      {rx:.25, ry:.38, type:'stp', label:'José C. Paz'},
    ];
    const nodes = NODE_DEF.map(n=>({...n,ph:rand(0,Math.PI*2),ps:.012+rand(0,.008),
      get x(){return n.rx*W();},get y(){return n.ry*H();},
      get r(){return n.type==='wh'?16:n.type==='hub'?11:8;}}));

    const PAIRS=[[8,7],[8,9],[9,4],[4,5],[5,0],[9,5],[0,7],[0,6],[6,7],[6,10],[10,1],[10,7],[7,2],[7,3],[1,3],[2,3]];
    const routes = PAIRS.map(([ai,bi])=>{
      const mx=(NODE_DEF[ai].rx+NODE_DEF[bi].rx)/2+rand(-.14,.14);
      const my=(NODE_DEF[ai].ry+NODE_DEF[bi].ry)/2+rand(-.14,.14);
      return {ai,bi,mx,my};
    });

    // ── Background ────────────────────────────────────────────────────────────
    function drawBg(perfTime) {
      const g=ctx.createLinearGradient(0,0,W(),H());
      g.addColorStop(0,C.bg0); g.addColorStop(1,C.bg1);
      ctx.fillStyle=g; ctx.fillRect(0,0,W(),H());
      // Subtle hex grid
      ctx.save(); ctx.strokeStyle=C.grid; ctx.lineWidth=1;
      const gs=120;
      for(let x=-gs;x<W()+gs;x+=gs*1.5){
        for(let y=-gs;y<H()+gs;y+=gs*.866*2){
          [[0,0],[gs*.75,gs*.866]].forEach(([ox,oy])=>{
            ctx.beginPath();
            for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(x+ox+gs*.45*Math.cos(a),y+oy+gs*.45*Math.sin(a));}
            ctx.closePath(); ctx.stroke();
          });
        }
      }
      ctx.restore();
      // Glow blobs
      [[.14,.2,300,C.node,'14'],[.84,.72,240,C.hub,'10'],[.48,.9,180,'#8b5cf6','10']].forEach(([bx,by,r,c,op])=>{
        const g2=ctx.createRadialGradient(bx*W(),by*H(),0,bx*W(),by*H(),r);
        g2.addColorStop(0,c+op); g2.addColorStop(1,'transparent');
        ctx.fillStyle=g2; ctx.fillRect(0,0,W(),H());
      });
      // Stars (dark mode only)
      if(isDark){
        for(let i=0;i<50;i++){
          const sx=(i*137.5+23)%W(), sy=(i*89.3+11)%(H()*.6);
          const sa=.08+.12*Math.abs(Math.sin(perfTime*.001+i*.4));
          ctx.save(); ctx.globalAlpha=sa; ctx.fillStyle='#fff';
          ctx.beginPath(); ctx.arc(sx,sy,.8,0,Math.PI*2); ctx.fill(); ctx.restore();
        }
      }
    }

    function drawRoute(r,off) {
      const a=nodes[r.ai],b=nodes[r.bi],cx=r.mx*W(),cy=r.my*H();
      ctx.save();
      ctx.strokeStyle=C.routeGlow; ctx.lineWidth=10; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(cx,cy,b.x,b.y); ctx.stroke();
      ctx.strokeStyle=C.route; ctx.lineWidth=2;
      ctx.globalAlpha = isDark ? 0.45 : 0.3; ctx.setLineDash([10,14]); ctx.lineDashOffset=-off;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(cx,cy,b.x,b.y); ctx.stroke();
      ctx.restore();
    }

    // ── Nodes ─────────────────────────────────────────────────────────────────
    function drawNode(n,t) {
      const pv=Math.sin(t*n.ps+n.ph),r=n.r;
      const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r*6);
      g.addColorStop(0, C.node + (isDark ? '28' : '1a')); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(n.x-r*6,n.y-r*6,r*12,r*12);
      if(n.type!=='stp'){
        ctx.save(); ctx.strokeStyle=C.pulse; ctx.lineWidth=1;
        ctx.globalAlpha = (.25+pv*.18) * (isDark ? 1 : 0.7);
        ctx.beginPath(); ctx.arc(n.x,n.y,r*(2.1+pv*.4),0,Math.PI*2); ctx.stroke(); ctx.restore();
      }
      const cg=ctx.createRadialGradient(n.x,n.y-r*.3,0,n.x,n.y,r);
      cg.addColorStop(0,C.hub); cg.addColorStop(1,C.node);
      ctx.save(); ctx.globalAlpha = isDark ? 0.9 : 0.85; ctx.fillStyle=cg;
      ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = isDark ? 0.4 : 0.45; ctx.fillStyle=C.label;
      ctx.font=`500 ${Math.round(r*.95)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(n.label,n.x,n.y+r+3); ctx.restore();
    }

    // ── Radar rings (warehouses) ───────────────────────────────────────────────
    class RadarRing {
      constructor(node){this.n=node; this.r=node.r; this.al=.6; this.sp=.9;}
      update(){this.r+=this.sp; this.al*=.975; return this.al>.01;}
      draw(){
        ctx.save(); ctx.strokeStyle=C.pulse; ctx.lineWidth=1;
        ctx.globalAlpha = this.al * (isDark ? 0.7 : 0.5);
        ctx.beginPath(); ctx.arc(this.n.x,this.n.y,this.r,0,Math.PI*2); ctx.stroke(); ctx.restore();
      }
    }
    const radarRings=[]; let radarTimer=0;

    // ── Route pulses ──────────────────────────────────────────────────────────
    class RoutePulse {
      constructor(){this.reset();}
      reset(){
        this.ri=Math.floor(Math.random()*routes.length);
        this.t=0; this.sp=.004+rand(0,.006);
        this.col=Math.random()>.5?C.node:C.pulse;
        this.sz=5+rand(0,4);
      }
      update(){this.t+=this.sp; return this.t<=1;}
      draw(){
        const r=routes[this.ri],a=nodes[r.ai],b=nodes[r.bi];
        const cx=r.mx*W(),cy=r.my*H();
        const et = easeInOut(this.t);
        const {x,y}=qb(et,a.x,a.y,cx,cy,b.x,b.y);
        const g=ctx.createRadialGradient(x,y,0,x,y,this.sz*2.5);
        g.addColorStop(0,this.col+'ff'); g.addColorStop(.5,this.col+'66'); g.addColorStop(1,'transparent');
        ctx.save(); ctx.globalAlpha=.9; ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(x,y,this.sz*2.5,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
    }
    const pulses=[]; let pulseTimer=0;

    // ── Package Drawer ────────────────────────────────────────────────────────
    function drawPkg(x, y, sz, al) {
      ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y);
      ctx.fillStyle = C.pkg; ctx.strokeStyle = isDark ? '#b45309' : '#92400e'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(-sz/2, -sz/2, sz, sz, 1.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, -sz/2); ctx.lineTo(0, sz/2);
      ctx.moveTo(-sz/2, 0); ctx.lineTo(sz/2, 0); ctx.stroke();
      ctx.restore();
    }

    // ── Couriers (personas repartiendo a casas) ───────────────────────────────
    class Courier {
      constructor(){this.reset(true);}
      reset(init=false){
        const stps = nodes.filter(n=>n.type==='stp' || n.type==='hub');
        this.n = stps[Math.floor(Math.random()*stps.length)];
        this.angle = rand(0, Math.PI*2);
        this.dist = rand(25, 55);
        this.t = init ? rand(0,1) : 0;
        this.sp = rand(0.003, 0.008);
        this.state = init && this.t > 0.5 ? 'return' : 'outward';
        this.wait = 0;
      }
      update(){
        this.hx = this.n.x + Math.cos(this.angle)*this.dist;
        this.hy = this.n.y + Math.sin(this.angle)*this.dist;
        if(this.state === 'outward'){
          this.t += this.sp;
          if(this.t >= 1) { this.t = 1; this.state = 'drop'; this.wait = 0; }
        } else if(this.state === 'drop') {
          this.wait++;
          if(this.wait > 50) { this.state = 'return'; }
        } else if(this.state === 'return') {
          this.t -= this.sp;
          if(this.t <= 0) { this.reset(); }
        }
      }
      draw(){
        const et = easeInOut(this.t);
        const cx = this.n.x + (this.hx - this.n.x) * et;
        const cy = this.n.y + (this.hy - this.n.y) * et;
        
        ctx.save(); ctx.translate(this.hx, this.hy);
        ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
        ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(9,-3); ctx.lineTo(9,6); ctx.lineTo(-9,6); ctx.lineTo(-9,-3); ctx.fill();
        ctx.fillStyle = isDark ? '#fbbf2455' : '#f59e0b88';
        ctx.fillRect(-4.5, 0, 3, 3); ctx.fillRect(1.5, 0, 3, 3);
        ctx.restore();

        if (this.state === 'drop' || this.state === 'return') {
           drawPkg(this.hx + 6, this.hy + 6, 6, 1);
        }

        ctx.save(); ctx.translate(cx, cy);
        const walkBounce = this.state !== 'drop' ? Math.abs(Math.sin(et * this.dist * 0.8)) * 2 : 0;
        ctx.translate(0, -walkBounce);
        ctx.fillStyle = C.truck1;
        ctx.beginPath(); ctx.roundRect(-2.2, -4.5, 4.5, 6, 1.5); ctx.fill();
        ctx.fillStyle = isDark ? '#fcd34d' : '#fbbf24';
        ctx.beginPath(); ctx.arc(0, -7.5, 2.7, 0, Math.PI*2); ctx.fill();
        if(this.state === 'outward' || (this.state === 'drop' && this.wait < 10)) {
           drawPkg(0, -3, 5, 1);
        }
        ctx.restore();
      }
    }
    const couriers = Array.from({length: 18}, () => new Courier());

    // ── Trucks ────────────────────────────────────────────────────────────────
    function drawTruck(x,y,ang,sc,al) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.scale(sc,sc); ctx.globalAlpha=al;
      const w=32,h=16;
      const gl=ctx.createRadialGradient(0,0,0,0,0,30);
      gl.addColorStop(0,C.truck0+'44'); gl.addColorStop(1,'transparent');
      ctx.fillStyle=gl; ctx.fillRect(-30,-30,60,60);
      const bg=ctx.createLinearGradient(-w/2,-h/2,-w/2,h/2);
      bg.addColorStop(0,C.truck0); bg.addColorStop(1,C.truck1);
      ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w*.64,h,3); ctx.fill();
      const cg=ctx.createLinearGradient(w*.13,-h/2,w*.13,h/2);
      cg.addColorStop(0,C.hub); cg.addColorStop(1,C.cab);
      ctx.fillStyle=cg; ctx.beginPath(); ctx.roundRect(w*.13,-h/2,w*.37,h,[3,6,6,3]); ctx.fill();
      ctx.fillStyle=C.win; ctx.beginPath(); ctx.roundRect(w*.15,-h*.36,w*.25,h*.48,2); ctx.fill();
      [[-w*.26,h*.45],[w*.36,h*.45]].forEach(([wx,wy])=>{
        ctx.fillStyle='#0f172a'; ctx.beginPath(); ctx.arc(wx,wy,4.2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#64748b'; ctx.beginPath(); ctx.arc(wx,wy,1.6,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle='#fef08a'; ctx.globalAlpha=al*.8;
      ctx.beginPath(); ctx.ellipse(w/2+1.5,0,3.5,2,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    class Truck {
      constructor(){this.reset(true);}
      reset(init=false){
        this.ri=Math.floor(Math.random()*routes.length);
        this.t=init?Math.random():0;
        this.sp=.0007+rand(0,.0013);
        this.sc=.65+rand(0,.5); this.al=.55+rand(0,.35);
        this.trail=[];
        this.hasPkg=Math.random()>.35; this.dlivT=0; this.delivering=false;
      }
      update(){
        const r=routes[this.ri],a=nodes[r.ai],b=nodes[r.bi];
        const cx=r.mx*W(),cy=r.my*H();
        const et = easeInOut(this.t);
        const pos=qb(et,a.x,a.y,cx,cy,b.x,b.y);
        this.trail.push({x:pos.x,y:pos.y,al:this.al});
        if(this.trail.length>12) this.trail.shift();
        this.t+=this.sp;
        if(this.t>=1){
          if(this.hasPkg){this.delivering=true;this.dlivT=0;}
          this.reset(); return;
        }
        if(this.delivering){this.dlivT++; if(this.dlivT>50)this.delivering=false;}
      }
      draw(){
        const r=routes[this.ri],a=nodes[r.ai],b=nodes[r.bi];
        const cx=r.mx*W(),cy=r.my*H();
        // Trail
        this.trail.forEach((p,i)=>{
          const ta=(i/this.trail.length)*this.al*.35;
          const tr=1.5*(i/this.trail.length);
          ctx.save(); ctx.globalAlpha=ta; ctx.fillStyle=C.truck0;
          ctx.beginPath(); ctx.arc(p.x,p.y,tr,0,Math.PI*2); ctx.fill(); ctx.restore();
        });
        const et = easeInOut(this.t);
        const {x,y}=qb(et,a.x,a.y,cx,cy,b.x,b.y);
        const ang=qba(et,a.x,a.y,cx,cy,b.x,b.y);
        drawTruck(x,y,ang,this.sc,this.al);
        if(this.delivering){
          const pa=Math.max(0,1-this.dlivT/50);
          drawPkg(b.x, b.y - 25, 13 * this.sc, pa * this.al);
        }
      }
    }
    const trucks=Array.from({length:10},()=>new Truck());

    let t=0,doff=0;
    function loop(perfTime){
      isDark = themeRef.current;
      C = isDark ? C_DARK : C_LIGHT;

      ctx.clearRect(0,0,W(),H()); drawBg(perfTime);
      doff=(doff+0.8)%24;
      routes.forEach(r=>drawRoute(r,doff));
      // Radar rings
      radarTimer++; if(radarTimer>55){radarTimer=0; const wh=nodes.filter(n=>n.type==='wh'); radarRings.push(new RadarRing(wh[Math.floor(Math.random()*wh.length)]));}
      for(let i=radarRings.length-1;i>=0;i--){radarRings[i].draw();if(!radarRings[i].update())radarRings.splice(i,1);}
      // Route pulses
      pulseTimer++; if(pulseTimer>25&&pulses.length<20){pulseTimer=0;pulses.push(new RoutePulse());}
      for(let i=pulses.length-1;i>=0;i--){pulses[i].draw();if(!pulses[i].update())pulses.splice(i,1);}
      nodes.forEach(n=>drawNode(n,t));
      // Couriers (personas)
      couriers.forEach(c=>{c.update();c.draw();});
      trucks.forEach(tr=>{tr.update();tr.draw();});
      t++; raf=requestAnimationFrame(loop);
    }
    loop(performance.now());
    return ()=>{cancelAnimationFrame(raf); window.removeEventListener('resize',resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}} />;
}
// ── Main login ────────────────────────────────────────────────────────────────
export function PantallaLogin({ theme = 'dark' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const isDark = theme === 'dark';

  const card      = isDark ? 'rgba(15,23,42,0.9)'  : 'rgba(255,255,255,0.97)';
  const border    = isDark ? 'rgba(59,130,246,0.2)' : '#e2e8f0';
  const text1     = isDark ? '#f1f5f9' : '#0f172a';
  const text2     = isDark ? '#94a3b8' : '#64748b';
  const text3     = isDark ? '#475569' : '#94a3b8';
  const inputBg   = isDark ? 'rgba(2,6,23,0.6)'    : '#f8fafc';
  const inputFocus= isDark ? 'rgba(15,23,42,0.95)'  : '#ffffff';
  const inputBord = isDark ? '#1e293b' : '#e2e8f0';
  const blue      = '#3b82f6';
  const blueDark  = '#2563eb';

  const inp = (field) => ({
    width: '100%',
    padding: '12px 14px',
    paddingRight: field === 'password' ? '44px' : '14px',
    backgroundColor: focused === field ? inputFocus : inputBg,
    border: `1.5px solid ${focused === field ? blue : inputBord}`,
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: '1',
    color: text1,
    outline: 'none',
    boxSizing: 'border-box',
    display: 'block',
    boxShadow: focused === field ? `0 0 0 3.5px ${blue}20` : 'none',
    transition: 'border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease',
    caretColor: blue,
  });

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

  const features = [
    { icon: '📦', text: 'Gestión de paquetes en tiempo real' },
    { icon: '🚚', text: 'Seguimiento de rutas y choferes'   },
    { icon: '📊', text: 'Dashboard operativo centralizado'  },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: isDark ? 'linear-gradient(135deg,#020617 0%,#0a1628 100%)' : 'linear-gradient(135deg,#e0f2fe 0%,#f0f9ff 100%)' }}>

      {/* Animated background */}
      <DeliveryCanvas isDark={isDark} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
        animation: 'loginSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <div style={{
          backgroundColor: card,
          borderRadius: '24px',
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? '0 0 0 1px rgba(59,130,246,0.08), 0 32px 80px rgba(0,0,0,0.75)'
            : '0 32px 80px rgba(0,0,0,0.09)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ height: '3px', background: `linear-gradient(90deg,${blue},#8b5cf6,#06b6d4)` }} />

          <div style={{ padding: '36px 36px 32px' }}>
            {/* LOGO */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{
                width: '66px', height: '66px', borderRadius: '18px',
                background: `linear-gradient(135deg,${blue}22,#8b5cf620)`,
                border: `1.5px solid ${blue}40`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: `0 8px 32px ${blue}28`,
                animation: 'loginPulse 4s ease-in-out infinite',
              }}>
                <Truck size={30} color={blue} strokeWidth={1.75} />
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: '23px', fontWeight: '800', color: text1, letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                Logística Hogareño
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: text2 }}>Sistema de gestión de entregas</p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* EMAIL */}
              <div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.5px',
                  textTransform: 'uppercase', marginBottom: '7px',
                  color: focused === 'email' ? blue : text2,
                  transition: 'color 140ms ease',
                }}>
                  <Mail size={11} strokeWidth={2.5} /> Correo electrónico
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required autoComplete="email"
                  style={inp('email')}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.5px',
                  textTransform: 'uppercase', marginBottom: '7px',
                  color: focused === 'password' ? blue : text2,
                  transition: 'color 140ms ease',
                }}>
                  <Lock size={11} strokeWidth={2.5} /> Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    style={inp('password')}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: text3, padding: '4px', display: 'flex', alignItems: 'center',
                      borderRadius: '6px', transition: 'color 120ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = blue}
                    onMouseLeave={e => e.currentTarget.style.color = text3}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', backgroundColor: '#ef444418',
                  border: '1px solid #ef444438', borderRadius: '10px',
                  fontSize: '13px', color: '#ef4444', fontWeight: '500',
                }}>
                  <span>⚠️</span>{error}
                </div>
              )}

              {/* SUBMIT */}
              <button type="submit" disabled={loading}
                style={{
                  marginTop: '4px', padding: '13px',
                  background: loading ? (isDark ? '#1e293b' : '#e2e8f0') : `linear-gradient(135deg,${blue},${blueDark})`,
                  border: 'none', borderRadius: '12px',
                  color: loading ? text3 : 'white',
                  fontSize: '14.5px', fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 150ms ease', width: '100%',
                  boxShadow: loading ? 'none' : `0 6px 24px ${blue}45`,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 32px ${blue}55`; } }}
                onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 24px ${blue}45`; } }}
              >
                {loading
                  ? <span style={{ width: '18px', height: '18px', border: `2px solid ${text3}50`, borderTopColor: text2, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : <LogIn size={16} strokeWidth={2.5} />}
                {loading ? 'Ingresando...' : 'Ingresar al sistema'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0 18px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: inputBord }} />
              <span style={{ fontSize: '10.5px', color: text3, fontWeight: '600', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>ACCESO RESTRINGIDO</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: inputBord }} />
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.04)',
                  border: `1px solid ${isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)'}`,
                }}>
                  <span style={{ fontSize: '13px' }}>{f.icon}</span>
                  <span style={{ fontSize: '12px', color: text2, fontWeight: '500' }}>{f.text}</span>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '18px', textAlign: 'center', fontSize: '11.5px', color: text3, lineHeight: 1.5 }}>
              ¿No tenés acceso?{' '}
              <span style={{ color: blue, fontWeight: '600' }}>Contactá al administrador</span>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '14px' }}>
          <span style={{ fontSize: '11px' }}>🔒</span>
          <span style={{ fontSize: '11px', color: isDark ? '#334155' : '#94a3b8', fontWeight: '500' }}>
            Conexión segura · Hogareño {new Date().getFullYear()}
          </span>
        </div>
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