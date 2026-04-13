import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { AppContext } from '../App';
import { MessageSquare, Send, Search, Truck } from 'lucide-react';
import { supabase } from '../supabase';

/* ─── Coordinadores fijos ─────────────────────────────────────── */
const COORDINADORES = [
  { id: 'maxi', nombre: 'Maxi', apellido: 'Russo', email: 'maxirusso20@gmail.com', rol: 'Coordinador General', color: '#3b82f6' },
  { id: 'fede', nombre: 'Fede', apellido: 'Avila', email: 'fedeavila@gmail.com', rol: 'Coordinador de Flota', color: '#8b5cf6' },
];

/* ─── SVG ticks estilo WhatsApp ───────────────────────────────── */
function Ticks({ estado, isMe }) {
  if (!isMe) return null;
  const color = estado === 'leido' ? '#53bdeb' : 'rgba(255,255,255,0.7)';
  if (estado === 'enviando') {
    // Reloj giratorio
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
        <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="8 6" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  if (estado === 'enviado') {
    // Un tick
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" style={{ flexShrink: 0 }}>
        <path d="M1 5.5L5 9.5L11 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // entregado o leido → doble tick
  return (
    <svg width="20" height="11" viewBox="0 0 20 11" style={{ flexShrink: 0 }}>
      <path d="M1 5.5L5 9.5L11 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5.5L11 9.5L17 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Indicador "escribiendo..." ──────────────────────────────── */
function TypingBubble({ isDark }) {
  return (
    <div style={{ alignSelf: 'flex-start', padding: '10px 16px', background: isDark ? '#1e293b' : '#ffffff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.08)' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: `waDot 1.3s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

export function PantallaChat() {
  const { theme, choferes, session, isAdmin, mostrarToast } = useContext(AppContext);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const [tick, setTick] = useState(0);
  const [mensajesChat, setMensajesChat] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chatActivo, setChatActivo] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [escribiendo, setEscribiendo] = useState({}); // { [chatId]: bool }
  const [onlineStatus, setOnlineStatus] = useState({}); // { [email]: bool }
  const scrollRef = useRef(null);
  const escribiendoTimerRef = useRef({});
  const alertasEnviadasRef = useRef(new Set());

  const isDark = theme === 'dark';

  /* ── Tick cada minuto para alertas ── */
  useEffect(() => {
    const int = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(int);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 60);
  }, []);

  /* ── Cargar mensajes ── */
  useEffect(() => {
    if (!session?.user) return;
    const cargar = async () => {
      try {
        let q = supabase.from('mensajes').select('*').order('created_at', { ascending: true });
        if (!isAdmin) q = q.eq('user_id', session.user.id);
        else q = q.eq('admin_id', session.user.email);
        const { data, error } = await q;
        if (error) { console.error('Carga:', error); return; }
        if (data) { setMensajesChat(data); scrollToBottom(); }
      } catch (e) { console.error(e); }
    };
    cargar();

    /* Realtime mensajes */
    const ch = supabase.channel(`mensajes_${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, ({ new: m }) => {
        if (!isAdmin && m.user_id !== session.user.id) return;
        if (isAdmin && m.admin_id !== session.user.email) return;
        setMensajesChat(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
        scrollToBottom();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes' }, ({ new: m }) => {
        // Actualizar estado (leido/entregado)
        if (!isAdmin && m.user_id !== session.user.id) return;
        if (isAdmin && m.admin_id !== session.user.email) return;
        setMensajesChat(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x));
      })
      .subscribe();

    /* Realtime presencia (online/escribiendo) */
    const presencia = supabase.channel('presencia_global', { config: { presence: { key: session.user.email } } })
      .on('presence', { event: 'sync' }, () => {
        const state = presencia.presenceState();
        const online = {};
        Object.values(state).flat().forEach(p => { online[p.email] = true; });
        setOnlineStatus(online);
      })
      .on('broadcast', { event: 'escribiendo' }, ({ payload }) => {
        const { email, chatId, activo } = payload;
        setEscribiendo(prev => ({ ...prev, [`${email}_${chatId}`]: activo }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presencia.track({ email: session.user.email, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(presencia);
    };
  }, [isAdmin, session, scrollToBottom]);

  /* Marcar mensajes como entregados cuando los ve el destinatario */
  useEffect(() => {
    if (!session?.user || !chatActivo) return;
    const marcarEntregados = async () => {
      // Mensajes recibidos (no míos) que todavía dicen 'enviado'
      const noLeidos = mensajesMostrados.filter(m => {
        const esMio = isAdmin ? m.remitente === 'Administración' : m.remitente !== 'Administración';
        return !esMio && m.estado === 'enviado';
      });
      if (noLeidos.length === 0) return;
      const ids = noLeidos.map(m => m.id);
      await supabase.from('mensajes').update({ estado: 'entregado' }).in('id', ids);
    };
    marcarEntregados();
  }, [chatActivo, mensajesChat]);

  /* Marcar como leído cuando el admin abre el chat */
  useEffect(() => {
    if (!session?.user || !chatActivo || !isAdmin) return;
    const marcarLeidos = async () => {
      await supabase.from('mensajes')
        .update({ estado: 'leido', visto_admin: true })
        .eq('user_id', chatActivo)
        .eq('admin_id', session.user.email)
        .neq('estado', 'leido');
    };
    marcarLeidos();
  }, [chatActivo, isAdmin, session]);

  /* Marcar leído para el chofer cuando abre el chat */
  useEffect(() => {
    if (!session?.user || !chatActivo || isAdmin) return;
    const coord = COORDINADORES.find(c => c.id === chatActivo);
    if (!coord) return;
    const marcarLeidos = async () => {
      await supabase.from('mensajes')
        .update({ estado: 'leido', visto_chofer: true })
        .eq('user_id', session.user.id)
        .eq('admin_id', coord.email)
        .eq('remitente', 'Administración')
        .neq('estado', 'leido');
    };
    marcarLeidos();
  }, [chatActivo, isAdmin, session]);

  useEffect(() => { if (chatActivo) scrollToBottom(); }, [chatActivo]);

  /* ── Alertas automáticas ── */
  const mensajesAlerta = useMemo(() => {
    if (!isAdmin) return [];
    return choferes
      .filter(c => c.latitud && c.ultima_actualizacion)
      .map(c => ({ ...c, diffMin: Math.floor((Date.now() - new Date(c.ultima_actualizacion).getTime()) / 60000) }))
      .filter(c => c.diffMin >= 10);
  }, [choferes, tick, isAdmin]);

  useEffect(() => {
    if (!isAdmin || mensajesAlerta.length === 0) return;
    mensajesAlerta.forEach(async (c) => {
      const key = `${c.id}-${Math.floor(Date.now() / 600000)}`;
      if (alertasEnviadasRef.current.has(key)) return;
      alertasEnviadasRef.current.add(key);
      const texto = `⚠️ ${c.nombre} lleva ${c.diffMin} min sin actualizar ubicación.`;
      for (const coord of COORDINADORES) {
        await supabase.from('mensajes').insert([{ user_id: null, remitente: '🤖 Sistema', texto, admin_id: coord.email, estado: 'leido' }]);
      }
    });
  }, [mensajesAlerta, isAdmin]);

  /* ── Agrupar chats (admin) ── */
  const chatsAgrupados = useMemo(() => {
    if (!isAdmin) return [];
    const agrupados = {};
    mensajesChat.forEach(m => {
      const key = m.user_id || '__sistema__';
      if (!agrupados[key]) {
        // Buscar nombre real en tabla choferes por email
        const choferReal = choferes.find(c => c.email === m.chofer_email);
        const nombreMostrar = key === '__sistema__'
          ? '🤖 Alertas'
          : choferReal?.nombre || (m.remitente !== 'Administración' ? m.remitente : 'Chofer');
        agrupados[key] = { id: key, nombre: nombreMostrar, email: m.chofer_email || '', ultimoMsj: '', unread: 0, esSistema: key === '__sistema__' };
      }
      agrupados[key].ultimoMsj = m.texto;
      // Actualizar nombre si encontramos el chofer real
      const choferReal = choferes.find(c => c.email === m.chofer_email);
      if (choferReal?.nombre) agrupados[key].nombre = choferReal.nombre;
      if (!m.visto_admin && m.remitente !== 'Administración') agrupados[key].unread++;
    });
    return Object.values(agrupados).sort((a, b) => a.esSistema ? 1 : -1);
  }, [mensajesChat, isAdmin, choferes]);

  /* ── Mensajes mostrados ── */
  const mensajesMostrados = useMemo(() => {
    if (!chatActivo) return [];
    if (isAdmin) {
      if (chatActivo === '__sistema__') return mensajesChat.filter(m => !m.user_id);
      return mensajesChat.filter(m => m.user_id === chatActivo);
    }
    const coord = COORDINADORES.find(c => c.id === chatActivo);
    if (!coord) return [];
    return mensajesChat.filter(m => m.admin_id === coord.email);
  }, [mensajesChat, isAdmin, chatActivo]);

  /* ── Unread por coordinador (chofer) ── */
  const unreadPorCoord = useMemo(() => {
    if (isAdmin) return {};
    const counts = {};
    COORDINADORES.forEach(coord => {
      counts[coord.id] = mensajesChat.filter(m => m.admin_id === coord.email && m.remitente === 'Administración' && m.estado !== 'leido').length;
    });
    return counts;
  }, [mensajesChat, isAdmin]);

  /* ── Broadcast "escribiendo" ── */
  const broadcastEscribiendo = useCallback(async (activo) => {
    if (!session?.user || !chatActivo) return;
    const chatId = isAdmin ? chatActivo : (COORDINADORES.find(c => c.id === chatActivo)?.email || chatActivo);
    try {
      await supabase.channel('presencia_global').send({
        type: 'broadcast', event: 'escribiendo',
        payload: { email: session.user.email, chatId, activo },
      });
    } catch (e) { }
  }, [session, chatActivo, isAdmin]);

  const handleInputChange = (e) => {
    setNuevoMensaje(e.target.value);
    broadcastEscribiendo(true);
    if (escribiendoTimerRef.current[chatActivo]) clearTimeout(escribiendoTimerRef.current[chatActivo]);
    escribiendoTimerRef.current[chatActivo] = setTimeout(() => broadcastEscribiendo(false), 2000);
  };

  /* ── Enviar mensaje ── */
  const enviarMensaje = async () => {
    const sess = sessionRef.current;
    const texto = nuevoMensaje.trim();
    const userId = sess?.user?.id;
    const userEmail = sess?.user?.email;

    console.log('[chat] enviarMensaje called', { texto, chatActivo, userId, isAdmin });

    if (!texto) { console.warn('[chat] sin texto'); return; }
    if (enviando) { console.warn('[chat] ya enviando'); return; }
    if (!chatActivo) { console.warn('[chat] sin chatActivo'); return; }
    if (!userId) { console.warn('[chat] sin userId — session:', sess); return; }

    setEnviando(true);
    setNuevoMensaje('');

    let adminId, choferUserId, choferEmail, remitente, vistoAdmin;

    if (isAdmin) {
      choferUserId = chatActivo;
      adminId = userEmail;
      remitente = 'Administración';
      const prev = mensajesChat.find(m => m.user_id === chatActivo && m.chofer_email);
      choferEmail = prev?.chofer_email || null;
      vistoAdmin = true;
    } else {
      const coord = COORDINADORES.find(c => c.id === chatActivo);
      if (!coord) {
        console.error('[chat] coordinador no encontrado:', chatActivo);
        setEnviando(false);
        setNuevoMensaje(texto);
        return;
      }
      choferUserId = userId;
      adminId = coord.email;
      // Buscar el nombre real del chofer en la tabla por su email de auth
      const choferData = choferes.find(c => c.email === userEmail);
      remitente = choferData?.nombre || userEmail?.split('@')[0] || 'Chofer';
      choferEmail = userEmail;
      vistoAdmin = false;
    }

    // Optimista
    const tempId = `temp_${Date.now()}`;
    setMensajesChat(prev => [...prev, {
      id: tempId, texto, estado: 'enviando',
      created_at: new Date().toISOString(),
      remitente, user_id: choferUserId, admin_id: adminId,
      chofer_email: choferEmail, visto_admin: vistoAdmin, visto_chofer: false,
    }]);
    scrollToBottom();

    try {
      const payload = { texto, remitente, user_id: choferUserId, chofer_email: choferEmail, visto_admin: vistoAdmin };
      // columnas opcionales — solo si la tabla las tiene
      try { payload.admin_id = adminId; } catch (_) { }
      try { payload.visto_chofer = false; } catch (_) { }
      try { payload.estado = 'enviado'; } catch (_) { }

      console.log('[chat] insert payload:', payload);
      const { data, error } = await supabase.from('mensajes').insert([payload]).select().single();

      if (error) throw error;
      console.log('[chat] OK id:', data.id);
      setMensajesChat(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err) {
      console.error('[chat] insert error:', err?.message, err?.details, err?.hint, err?.code);
      mostrarToast?.(`Error: ${err?.message || 'No se pudo enviar'}`, 'error');
      setMensajesChat(prev => prev.map(m => m.id === tempId ? { ...m, estado: 'error' } : m));
      setNuevoMensaje(texto);
    } finally {
      setEnviando(false);
    }
  };

  /* ── Helpers ── */
  const formatHora = (ts) => ts ? new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
  const getInitials = (n = '') => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const getAvatarColor = (n = '') => { const c = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']; let h = 0; for (const x of n) h = x.charCodeAt(0) + h * 31; return c[Math.abs(h) % c.length]; };

  const chatActivoAdmin = isAdmin ? chatsAgrupados.find(c => c.id === chatActivo) : null;
  const chatActivoCoord = !isAdmin ? COORDINADORES.find(c => c.id === chatActivo) : null;

  /* ── ¿Está escribiendo el otro? ── */
  const otroEscribiendo = useMemo(() => {
    if (!chatActivo) return false;
    if (isAdmin) {
      // Admin: ¿está escribiendo el chofer con user_id = chatActivo?
      const choferEmail = chatActivoAdmin?.email || '';
      return !!escribiendo[`${choferEmail}_${chatActivo}`];
    } else {
      // Chofer: ¿está escribiendo el coordinador?
      const coord = COORDINADORES.find(c => c.id === chatActivo);
      return coord ? !!escribiendo[`${coord.email}_${session?.user?.id}`] : false;
    }
  }, [escribiendo, chatActivo, isAdmin, chatActivoAdmin, session]);

  /* ── ¿Está online el otro? ── */
  const otroOnline = useMemo(() => {
    if (!chatActivo) return false;
    if (isAdmin) return !!onlineStatus[chatActivoAdmin?.email];
    if (chatActivoCoord) return !!onlineStatus[chatActivoCoord.email];
    return false;
  }, [onlineStatus, chatActivo, isAdmin, chatActivoAdmin, chatActivoCoord]);

  const inputPlaceholder = () => {
    if (!chatActivo) return isAdmin ? 'Seleccioná un chat...' : 'Seleccioná un coordinador...';
    if (!isAdmin && chatActivoCoord) return `Escribile a ${chatActivoCoord.nombre}...`;
    return 'Escribí un mensaje...';
  };

  return (
    <>
      <style>{`
        @keyframes waDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes msgIn { from{opacity:0;transform:scale(0.93) translateY(5px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .wa-contact:hover { background: var(--bg-hover) !important; }
        .wa-contact.active { background: ${isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)'} !important; }
        .msg-appear { animation: msgIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
        .chat-send-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.06); }
        .chat-send-btn:active:not(:disabled) { transform: scale(0.95); }
        .wa-input { transition: border-color .2s, box-shadow .2s; }
        .wa-input:focus { outline: none; border-color: #25D366 !important; box-shadow: 0 0 0 3px rgba(37,211,102,0.12) !important; }
        .wa-retry { cursor: pointer; font-size: 11px; color: #ef4444; background: none; border: none; padding: 0; text-decoration: underline; }
      `}</style>

      <div style={{ padding: '24px', backgroundColor: 'var(--bg-page)', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header página */}
        <div className="animate-fade-slide" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg,#25D36620,#128C7E20)', padding: '10px', borderRadius: '14px', border: '1px solid #25D36630', display: 'flex' }}>
            <MessageSquare size={22} color="#25D366" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>
              {isAdmin ? 'Central de Mensajes' : 'Contacto con Logística'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
              {isAdmin ? `${chatsAgrupados.length} conversaciones` : 'Hablá directo con Maxi o Fede'}
            </p>
          </div>
        </div>

        {/* Contenedor WhatsApp */}
        <div className="animate-fade-slide" style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', display: 'flex', minHeight: '540px', boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── Panel izquierdo ── */}
          <div style={{ width: '290px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: isDark ? '#0a1628' : '#f8fafc', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={14} color="var(--text-4)" />
              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {isAdmin ? 'Conversaciones' : 'Logística Hogareño'}
              </span>
            </div>

            {isAdmin && (
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} color="var(--text-4)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar..." style={{ width: '100%', padding: '7px 10px 7px 28px', boxSizing: 'border-box', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: isAdmin ? '0' : '8px' }}>
              {isAdmin ? (
                chatsAgrupados.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <MessageSquare size={28} style={{ margin: '0 auto 10px', opacity: 0.2, display: 'block', color: 'var(--text-4)' }} />
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>Sin mensajes aún</p>
                  </div>
                ) : chatsAgrupados.map(chat => {
                  const ac = getAvatarColor(chat.nombre);
                  const active = chatActivo === chat.id;
                  return (
                    <div key={chat.id} onClick={() => setChatActivo(chat.id)} className={`wa-contact${active ? ' active' : ''}`}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s', position: 'relative' }}>
                      {active && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '3px', background: '#25D366', borderRadius: '0 3px 3px 0' }} />}
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${ac}18`, border: `1.5px solid ${ac}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac, fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                        {getInitials(chat.nombre)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-1)', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.nombre}</p>
                          {chat.unread > 0 && <span style={{ background: '#25D366', color: '#fff', fontSize: '11px', fontWeight: '700', borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>{chat.unread}</span>}
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.ultimoMsj}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Chofer: dos coordinadores fijos
                COORDINADORES.map(coord => {
                  const active = chatActivo === coord.id;
                  const unread = unreadPorCoord[coord.id] || 0;
                  const online = !!onlineStatus[coord.email];
                  return (
                    <div key={coord.id} onClick={() => setChatActivo(coord.id)} className={`wa-contact${active ? ' active' : ''}`}
                      style={{ padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', marginBottom: '4px', border: active ? `1px solid ${coord.color}30` : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: `${coord.color}16`, border: `2px solid ${coord.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: coord.color, fontSize: '17px', fontWeight: '800' }}>
                          {coord.nombre[0]}
                        </div>
                        <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '11px', height: '11px', borderRadius: '50%', background: online ? '#25D366' : '#94a3b8', border: `2px solid ${isDark ? '#0a1628' : '#f8fafc'}`, transition: 'background 0.3s' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                          <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-1)', fontSize: '14px' }}>{coord.nombre} {coord.apellido}</p>
                          {unread > 0 && <span style={{ background: '#25D366', color: '#fff', fontSize: '11px', fontWeight: '700', borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>{unread}</span>}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: coord.color, fontWeight: '600' }}>{coord.rol}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Info usuario (chofer) */}
            {!isAdmin && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-3)', flexShrink: 0 }}>
                  {getInitials(session?.user?.email?.split('@')[0] || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {choferes.find(c => c.email === session?.user?.email)?.nombre || session?.user?.email?.split('@')[0] || 'Chofer'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366' }} />
                    <p style={{ margin: 0, fontSize: '10px', color: '#25D366', fontWeight: '600' }}>En línea</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Área de mensajes ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? '#111827' : '#ffffff', minWidth: 0 }}>

            {/* Header del chat activo */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: isDark ? '#0a1628' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '62px' }}>
              {!chatActivo ? (
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  {isAdmin ? 'Seleccioná un chofer' : 'Seleccioná un coordinador'}
                </p>
              ) : isAdmin && chatActivoAdmin ? (
                <>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${getAvatarColor(chatActivoAdmin.nombre)}18`, border: `1.5px solid ${getAvatarColor(chatActivoAdmin.nombre)}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: getAvatarColor(chatActivoAdmin.nombre), fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                    {getInitials(chatActivoAdmin.nombre)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--text-1)' }}>{chatActivoAdmin.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: otroEscribiendo ? '#25D366' : (otroOnline ? '#25D366' : 'var(--text-4)'), fontWeight: '500', transition: 'color 0.2s' }}>
                      {otroEscribiendo ? 'escribiendo...' : otroOnline ? 'en línea' : 'desconectado'}
                    </p>
                  </div>
                </>
              ) : !isAdmin && chatActivoCoord ? (
                <>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${chatActivoCoord.color}16`, border: `2px solid ${chatActivoCoord.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chatActivoCoord.color, fontSize: '16px', fontWeight: '800' }}>
                      {chatActivoCoord.nombre[0]}
                    </div>
                    <div style={{ position: 'absolute', bottom: '0px', right: '0px', width: '10px', height: '10px', borderRadius: '50%', background: otroOnline ? '#25D366' : '#94a3b8', border: `2px solid ${isDark ? '#0a1628' : '#f8fafc'}` }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--text-1)' }}>{chatActivoCoord.nombre} {chatActivoCoord.apellido}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: otroEscribiendo ? '#25D366' : (otroOnline ? '#25D366' : 'var(--text-4)'), fontWeight: '500', transition: 'color 0.2s' }}>
                      {otroEscribiendo ? 'escribiendo...' : otroOnline ? 'en línea' : chatActivoCoord.rol}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', background: isDark ? '#111827' : '#efeae2' }}>
              {!chatActivo ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-3)', padding: '32px' }}>
                  <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.1, display: 'block', color: 'var(--text-4)' }} />
                  <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 6px' }}>{isAdmin ? 'Bandeja Central' : 'Contacto con Logística'}</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{isAdmin ? 'Seleccioná un chofer para responder' : 'Elegí a Maxi o Fede para chatear'}</p>
                </div>
              ) : mensajesMostrados.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-3)', padding: '32px 20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(37,211,102,0.1)', border: '1.5px solid rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <MessageSquare size={26} color="#25D366" style={{ opacity: 0.7 }} />
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 5px' }}>
                    {isAdmin ? 'Sin mensajes aún' : `Chateá con ${chatActivoCoord?.nombre}`}
                  </p>
                  <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                    {isAdmin ? 'El chofer todavía no escribió.' : 'Podés reportar novedades o consultar rutas.'}
                  </p>
                </div>
              ) : (
                <>
                  {mensajesMostrados.map((msg, i) => {
                    const esSistema = msg.remitente === '🤖 Sistema';
                    const esAdmin = msg.remitente === 'Administración';
                    const isMe = esSistema ? false : (isAdmin ? esAdmin : !esAdmin);
                    const prev = mensajesMostrados[i - 1];
                    const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                    const prevSame = prev && (isAdmin ? (prev.remitente === 'Administración') === esAdmin : (prev.remitente !== 'Administración') === !esAdmin);
                    const bubbleColor = isMe ? (!isAdmin && chatActivoCoord ? chatActivoCoord.color : '#25D366') : undefined;
                    const isError = msg.estado === 'error';

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#667781', fontWeight: '500', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', padding: '3px 12px', borderRadius: '8px', boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.1)' }}>
                              {new Date(msg.created_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                          </div>
                        )}

                        {esSistema ? (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                            <div style={{ background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(255,251,235,0.95)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706', fontSize: '12px', fontWeight: '600', padding: '5px 14px', borderRadius: '12px', maxWidth: '80%', textAlign: 'center', lineHeight: 1.4 }}>
                              {msg.texto}
                            </div>
                          </div>
                        ) : (
                          <div className="msg-appear" style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: prevSame ? '2px' : '6px' }}>
                            <div style={{ maxWidth: '68%', position: 'relative' }}>
                              {/* Cola de la burbuja (solo primer mensaje del grupo) */}
                              <div style={{
                                padding: '8px 12px 6px',
                                background: isMe
                                  ? (isDark ? `${bubbleColor}dd` : bubbleColor)
                                  : (isDark ? '#1e293b' : '#ffffff'),
                                color: isMe ? '#ffffff' : 'var(--text-1)',
                                borderRadius: isMe
                                  ? (prevSame ? '18px 4px 4px 18px' : '18px 4px 18px 18px')
                                  : (prevSame ? '4px 18px 18px 4px' : '4px 18px 18px 18px'),
                                boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                                border: isMe ? 'none' : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                wordBreak: 'break-word', lineHeight: '1.45',
                              }}>
                                <span style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>{msg.texto}</span>
                                {/* Hora + ticks dentro de la burbuja */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '1px' }}>
                                  <span style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-4)', whiteSpace: 'nowrap' }}>
                                    {formatHora(msg.created_at)}
                                  </span>
                                  <Ticks estado={isError ? 'error' : (msg.estado || 'enviado')} isMe={isMe} />
                                  {isError && <button className="wa-retry" onClick={() => { setNuevoMensaje(msg.texto); setMensajesChat(p => p.filter(x => x.id !== msg.id)); setTimeout(() => enviarMensaje(), 50); }}>reintentar</button>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Indicador "escribiendo..." */}
                  {otroEscribiendo && (
                    <div className="msg-appear">
                      <TypingBubble isDark={isDark} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: isDark ? '#0a1628' : '#f0f2f5' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={inputPlaceholder()}
                  value={nuevoMensaje}
                  onChange={handleInputChange}
                  disabled={enviando || !chatActivo}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => { setInputFocused(false); broadcastEscribiendo(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensaje();
                    }
                  }}
                  className="wa-input"
                  style={{
                    flex: 1, padding: '11px 18px', borderRadius: '24px',
                    border: `1.5px solid ${inputFocused ? '#25D366' : 'var(--border)'}`,
                    background: isDark ? '#1e293b' : '#ffffff',
                    color: 'var(--text-1)', fontSize: '15px', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={enviando || !nuevoMensaje.trim() || !chatActivo}
                  onClick={enviarMensaje}
                  className="chat-send-btn"
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    border: 'none', cursor: (!chatActivo || !nuevoMensaje.trim()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: nuevoMensaje.trim() && chatActivo ? 'linear-gradient(135deg,#25D366,#1da851)' : isDark ? '#1e293b' : '#e2e8f0',
                    color: nuevoMensaje.trim() && chatActivo ? '#ffffff' : 'var(--text-4)',
                  }}>
                  <Send size={18} style={{ transform: 'translateX(-1px)' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}