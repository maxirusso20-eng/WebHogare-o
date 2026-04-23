import { useState, useEffect, useRef, useContext } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { useAuth } from '../AuthContext';

// Los destinatarios fijos con los que puede chatear el viewer
const CONTACTOS = [
  { id: 'fede', nombre: 'Fede', emoji: '👤', color: '#3b82f6' },
  { id: 'maxi', nombre: 'Maxi', emoji: '👤', color: '#8b5cf6' },
  { id: 'lucas', nombre: 'Lucas', emoji: '👤', color: '#06b6d4' },
];

export function PantallaChat() {
  const { theme } = useContext(AppContext);
  const { session } = useAuth();
  const [contactoActivo, setContactoActivo] = useState(CONTACTOS[0]);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef(null);

  const isDark = theme === 'dark';
  const pageBg = isDark ? '#020617' : '#f1f5f9';
  const sidebarBg = isDark ? '#0f172a' : '#ffffff';
  const chatBg = isDark ? '#020617' : '#f8fafc';
  const bubbleBg = isDark ? '#1e293b' : '#ffffff';
  const myBubble = contactoActivo.color;
  const border = isDark ? '#334155' : '#e2e8f0';
  const text1 = isDark ? '#f1f5f9' : '#1e293b';
  const text2 = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#1e293b' : '#ffffff';

  const miEmail = session?.user?.email ?? '';

  // ── Cargar mensajes al cambiar de contacto ────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setMensajes([]);

    const fetchMensajes = async () => {
      const { data, error } = await supabase
        .from('mensajes_chat')
        .select('*')
        .or(`and(de.eq.${miEmail},para.eq.${contactoActivo.id}),and(de.eq.${contactoActivo.id},para.eq.${miEmail})`)
        .order('created_at', { ascending: true });

      if (!error) setMensajes(data || []);
      setLoading(false);
    };

    fetchMensajes();

    // Realtime
    const canal = supabase
      .channel(`chat:${miEmail}:${contactoActivo.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat' },
        (payload) => {
          const m = payload.new;
          const esRelevante =
            (m.de === miEmail && m.para === contactoActivo.id) ||
            (m.de === contactoActivo.id && m.para === miEmail);
          if (esRelevante) {
            setMensajes(prev => [...prev, m]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [contactoActivo.id, miEmail]);

  // ── Auto-scroll al último mensaje ─────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  const enviar = async () => {
    const textoLimpio = texto.trim();
    if (!textoLimpio || enviando) return;

    setEnviando(true);
    setTexto('');

    const { error } = await supabase
      .from('mensajes_chat')
      .insert([{
        de: miEmail,
        para: contactoActivo.id,
        contenido: textoLimpio,
      }]);

    if (error) {
      console.error('Error enviando mensaje:', error);
      setTexto(textoLimpio); // restaurar si falló
    }

    setEnviando(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const formatHora = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFecha = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Agrupar mensajes por fecha
  const mensajesConFecha = mensajes.reduce((acc, m, i) => {
    const fecha = new Date(m.created_at).toDateString();
    const anterior = i > 0 ? new Date(mensajes[i - 1].created_at).toDateString() : null;
    if (fecha !== anterior) {
      acc.push({ tipo: 'fecha', valor: formatFecha(m.created_at), key: `f-${i}` });
    }
    acc.push({ tipo: 'mensaje', data: m, key: m.id });
    return acc;
  }, []);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 56px)', // descontar header
      backgroundColor: pageBg,
      overflow: 'hidden',
    }}>

      {/* ── SIDEBAR DE CONTACTOS ── */}
      <div style={{
        width: '220px',
        flexShrink: 0,
        backgroundColor: sidebarBg,
        borderRight: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={16} color={text2} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mensajes
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {CONTACTOS.map(c => (
            <button
              key={c.id}
              onClick={() => setContactoActivo(c)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: contactoActivo.id === c.id
                  ? `${c.color}20`
                  : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 80ms ease',
                marginBottom: '2px',
              }}
              onMouseEnter={e => { if (contactoActivo.id !== c.id) e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9'; }}
              onMouseLeave={e => { if (contactoActivo.id !== c.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Avatar */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: `${c.color}25`,
                border: `2px solid ${contactoActivo.id === c.id ? c.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', flexShrink: 0,
              }}>
                {c.emoji}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: contactoActivo.id === c.id ? '700' : '600', color: contactoActivo.id === c.id ? c.color : text1 }}>
                  {c.nombre}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── ÁREA DE CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header del chat */}
        <div style={{
          padding: '14px 20px',
          backgroundColor: sidebarBg,
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            backgroundColor: `${contactoActivo.color}25`,
            border: `2px solid ${contactoActivo.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            {contactoActivo.emoji}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: text1 }}>{contactoActivo.nombre}</p>
            <p style={{ margin: 0, fontSize: '11px', color: text2 }}>Chat privado</p>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          backgroundColor: chatBg,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: text2, fontSize: '13px', marginTop: '40px' }}>
              ⏳ Cargando mensajes...
            </div>
          ) : mensajesConFecha.length === 0 ? (
            <div style={{ textAlign: 'center', color: text2, fontSize: '13px', marginTop: '60px' }}>
              <p style={{ fontSize: '32px', margin: '0 0 12px' }}>💬</p>
              Todavía no hay mensajes con {contactoActivo.nombre}.<br />¡Mandá el primero!
            </div>
          ) : (
            mensajesConFecha.map(item => {
              if (item.tipo === 'fecha') {
                return (
                  <div key={item.key} style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', color: text2,
                      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                      padding: '3px 10px', borderRadius: '20px',
                      textTransform: 'capitalize',
                    }}>{item.valor}</span>
                  </div>
                );
              }

              const m = item.data;
              const esMio = m.de === miEmail;

              return (
                <div key={item.key} style={{
                  display: 'flex',
                  justifyContent: esMio ? 'flex-end' : 'flex-start',
                  marginBottom: '2px',
                }}>
                  <div style={{
                    maxWidth: '68%',
                    padding: '8px 12px',
                    borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: esMio ? myBubble : bubbleBg,
                    border: esMio ? 'none' : `1px solid ${border}`,
                    color: esMio ? '#ffffff' : text1,
                    fontSize: '13px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    boxShadow: esMio
                      ? `0 2px 8px ${myBubble}40`
                      : isDark ? '0 2px 6px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <p style={{ margin: 0 }}>{m.contenido}</p>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '10px',
                      color: esMio ? 'rgba(255,255,255,0.65)' : text2,
                      textAlign: 'right',
                    }}>
                      {formatHora(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input de mensaje */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: sidebarBg,
          borderTop: `1px solid ${border}`,
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensaje para ${contactoActivo.nombre}...`}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: inputBg,
              border: `1.5px solid ${border}`,
              borderRadius: '12px',
              color: text1,
              fontSize: '13px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              maxHeight: '100px',
              overflowY: 'auto',
              transition: 'border-color 80ms ease',
            }}
            onFocus={e => e.target.style.borderColor = contactoActivo.color}
            onBlur={e => e.target.style.borderColor = border}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || enviando}
            style={{
              width: '40px', height: '40px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: texto.trim() ? contactoActivo.color : (isDark ? '#334155' : '#cbd5e1'),
              color: 'white',
              cursor: texto.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 80ms ease, transform 80ms ease',
            }}
            onMouseEnter={e => { if (texto.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Enviar (Enter)"
          >
            {enviando
              ? <span style={{ width: '14px', height: '14px', border: '2px solid #fff6', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : <Send size={16} strokeWidth={2.5} />
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}