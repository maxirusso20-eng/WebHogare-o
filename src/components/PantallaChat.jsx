import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Send, MessageCircle, Users, Inbox, Paperclip, Mic, MicOff, X, Link } from 'lucide-react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { useAuth } from './AuthContext';
import { ADMIN_EMAILS } from './AuthContext';
import { labelFromEmail, colorFromEmail, esAdminEmail, ChatBurbuja } from './ChatBurbuja';

// ── Cargar mapa email→nombre desde tabla Choferes ─────────────────────────────
async function cargarMapaNombres() {
  const { data } = await supabase.from('Choferes').select('email, nombre');
  const mapa = {};
  (data || []).forEach(c => {
    if (c.email) mapa[c.email.toLowerCase()] = c.nombre;
  });
  return mapa;
}

function nombreDeEmail(email, mapa) {
  if (!email) return '?';
  return mapa[email.toLowerCase()] || labelFromEmail(email);
}

// ── Audio recorder ────────────────────────────────────────────────────────────
function useAudioRecorder() {
  const [grabando, setGrabando] = useState(false);
  const [seg, setSeg] = useState(0);
  const mr = useRef(null); const chunks = useRef([]); const timer = useRef(null);
  const iniciar = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = e => chunks.current.push(e.data);
    rec.start(); mr.current = rec; setGrabando(true); setSeg(0);
    timer.current = setInterval(() => setSeg(s => s + 1), 1000);
  };
  const detener = () => new Promise(resolve => {
    const rec = mr.current; if (!rec) return resolve(null);
    rec.onstop = () => { resolve(new Blob(chunks.current, { type: 'audio/webm' })); mr.current?.stream?.getTracks().forEach(t => t.stop()); };
    rec.stop(); clearInterval(timer.current); setGrabando(false); setSeg(0);
  });
  const cancelar = () => { mr.current?.stream?.getTracks().forEach(t => t.stop()); mr.current?.stop(); clearInterval(timer.current); setGrabando(false); setSeg(0); };
  return { grabando, seg, iniciar, detener, cancelar };
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function subirArchivo(file, tipo) {
  const ext = file.name?.split('.').pop() || 'bin';
  const path = `${tipo}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('chat-media').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}

function detectTipo(file) {
  if (!file) return 'texto';
  if (file.type.startsWith('image/')) return 'imagen';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'archivo';
}

// ── InputChat ─────────────────────────────────────────────────────────────────
function InputChat({ onEnviar, color, isDark, border, text1, inputBg, text2 }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [link, setLink] = useState('');
  const [modoLink, setModoLink] = useState(false);
  const fileRef = useRef(null);
  const { grabando, seg, iniciar, detener, cancelar } = useAudioRecorder();

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      if (grabando) {
        const blob = await detener();
        if (blob) { const url = await subirArchivo(new File([blob], 'audio.webm', { type: 'audio/webm' }), 'audio'); await onEnviar({ media_type: 'audio', media_url: url, texto: '' }); }
      } else if (preview) {
        const url = await subirArchivo(preview.file, preview.tipo);
        await onEnviar({ media_type: preview.tipo, media_url: url, texto: texto.trim() || preview.file.name });
        setPreview(null); setTexto('');
      } else if (modoLink && link.trim()) {
        await onEnviar({ media_type: 'link', media_url: null, texto: link.trim() });
        setLink(''); setModoLink(false);
      } else if (texto.trim()) {
        await onEnviar({ media_type: 'texto', media_url: null, texto: texto.trim() });
        setTexto('');
      }
    } finally { setEnviando(false); }
  };

  const elegirArchivo = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const tipo = detectTipo(f);
    setPreview({ file: f, tipo, url: tipo === 'imagen' ? URL.createObjectURL(f) : null });
    e.target.value = '';
  };

  const listo = grabando || preview || (modoLink && link.trim()) || texto.trim();

  return (
    <div style={{ padding: '10px 14px', backgroundColor: isDark ? '#0f172a' : '#fff', borderTop: `1px solid ${border}` }}>
      {preview && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px 10px', background: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '10px' }}>
          {preview.tipo === 'imagen' ? <img src={preview.url} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>{preview.tipo === 'audio' ? '🎵' : '📎'}</span>}
          <span style={{ flex: 1, fontSize: '12px', color: text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.file.name}</span>
          <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2 }}><X size={16} /></button>
        </div>
      )}
      {modoLink && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: `1.5px solid ${border}`, background: inputBg, color: text1, fontSize: '13px', outline: 'none' }} />
          <button onClick={() => { setModoLink(false); setLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2 }}><X size={16} /></button>
        </div>
      )}
      {grabando && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px 12px', background: '#ef444420', borderRadius: '10px', border: '1px solid #ef444440' }}>
          <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>⏺ {seg}s</span>
          <span style={{ flex: 1, color: text2, fontSize: '12px' }}>Grabando audio...</span>
          <button onClick={cancelar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2 }}><X size={16} /></button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        {!grabando && !modoLink && (
          <>
            <input ref={fileRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" style={{ display: 'none' }} onChange={elegirArchivo} />
            <button onClick={() => fileRef.current?.click()} title="Adjuntar" style={{ width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Paperclip size={17} /></button>
            <button onClick={() => setModoLink(true)} title="Link" style={{ width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Link size={16} /></button>
          </>
        )}
        {!grabando && !modoLink && (
          <textarea value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Mensaje..." rows={1}
            style={{ flex: 1, padding: '9px 14px', background: inputBg, border: `1.5px solid ${border}`, borderRadius: '12px', color: text1, fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5', maxHeight: '100px', overflowY: 'auto' }}
            onFocus={e => e.target.style.borderColor = color} onBlur={e => e.target.style.borderColor = border} />
        )}
        {modoLink && <div style={{ flex: 1 }} />}
        {!preview && !modoLink && texto === '' ? (
          <button onMouseDown={iniciar} onMouseUp={enviar} onTouchStart={iniciar} onTouchEnd={enviar}
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: 'none', background: grabando ? '#ef4444' : color, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {grabando ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        ) : (
          <button onClick={enviar} disabled={!listo || enviando}
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: 'none', background: listo ? color : isDark ? '#334155' : '#cbd5e1', color: '#fff', cursor: listo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {enviando ? <span style={{ width: '14px', height: '14px', border: '2px solid #fff6', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : <Send size={16} strokeWidth={2.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── PantallaChat ──────────────────────────────────────────────────────────────
export function PantallaChat() {
  const { theme } = useContext(AppContext);
  const { session, role } = useAuth();
  const miEmail = session?.user?.email ?? '';
  const esAdminUser = role === 'admin';

  const isDark = theme === 'dark';
  const pageBg = isDark ? '#020617' : '#f1f5f9';
  const sidebarBg = isDark ? '#0f172a' : '#ffffff';
  const chatBg = isDark ? '#020617' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text1 = isDark ? '#f1f5f9' : '#1e293b';
  const text2 = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#1e293b' : '#ffffff';

  const [contactoActivo, setContactoActivo] = useState(null);
  const [contactos, setContactos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingC, setLoadingC] = useState(true);
  const [nombresMap, setNombresMap] = useState({});
  const bottomRef = useRef(null);

  // ── Cargar contactos ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!miEmail) return;
    const cargar = async () => {
      setLoadingC(true);

      // Cargar mapa email→nombre desde Choferes
      const mapa = await cargarMapaNombres();
      // Agregar admins hardcodeados al mapa si tienen nombre
      setNombresMap(mapa);

      if (esAdminUser) {
        // Colegas admin (otros emails en ADMIN_EMAILS)
        const colegas = ADMIN_EMAILS
          .filter(e => e.toLowerCase() !== miEmail.toLowerCase())
          .map(e => ({
            email: e,
            nombre: nombreDeEmail(e, mapa),
            color: colorFromEmail(e),
            tipo: 'admin',
          }));

        // Todos los emails con quienes tuve conversación (por chofer_email o admin_id)
        const { data: comoAdmin } = await supabase
          .from('mensajes')
          .select('chofer_email')
          .eq('admin_id', miEmail)
          .not('chofer_email', 'is', null);

        const { data: comoChofer } = await supabase
          .from('mensajes')
          .select('admin_id')
          .eq('chofer_email', miEmail)
          .not('admin_id', 'is', null);

        const emailsSet = new Set();
        (comoAdmin || []).forEach(m => {
          if (m.chofer_email && m.chofer_email.toLowerCase() !== miEmail.toLowerCase())
            emailsSet.add(m.chofer_email.toLowerCase());
        });
        (comoChofer || []).forEach(m => {
          if (m.admin_id && m.admin_id.toLowerCase() !== miEmail.toLowerCase())
            emailsSet.add(m.admin_id.toLowerCase());
        });

        const adminSet = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()));
        const otrosEmails = [...emailsSet].filter(e => !colegas.some(c => c.email.toLowerCase() === e));
        const contactosExtra = otrosEmails.map(e => ({
          email: e,
          nombre: nombreDeEmail(e, mapa),
          color: colorFromEmail(e),
          tipo: adminSet.has(e) ? 'admin' : 'chofer',
        }));

        const todos = [...colegas, ...contactosExtra];
        setContactos(todos);
        if (todos.length && !contactoActivo) setContactoActivo(todos[0]);
      } else {
        // Coordinador/chofer → ve todos los admins
        const lista = ADMIN_EMAILS.map(e => ({
          email: e,
          nombre: nombreDeEmail(e, mapa),
          color: colorFromEmail(e),
          tipo: 'admin',
        }));

        // + otros admins que le escribieron
        const { data } = await supabase
          .from('mensajes')
          .select('admin_id')
          .eq('chofer_email', miEmail)
          .not('admin_id', 'is', null);

        const adminSet = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()));
        const extras = new Set();
        (data || []).forEach(m => {
          const e = m.admin_id?.toLowerCase();
          if (e && !adminSet.has(e)) extras.add(e);
        });
        const extraAdmins = [...extras].map(e => ({
          email: e,
          nombre: nombreDeEmail(e, mapa),
          color: colorFromEmail(e),
          tipo: 'admin',
        }));

        const todosLista = [...lista, ...extraAdmins];
        setContactos(todosLista);
        if (todosLista.length && !contactoActivo) setContactoActivo(todosLista[0]);
      }
      setLoadingC(false);
    };
    cargar();
  }, [miEmail, esAdminUser]);

  // ── Realtime inbox: nuevos contactos ─────────────────────────────────────
  useEffect(() => {
    if (!miEmail || !esAdminUser) return;
    const canal = supabase.channel(`inbox:${miEmail}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, payload => {
        const m = payload.new;
        if (m.admin_id !== miEmail || !m.chofer_email) return;
        setContactos(prev => {
          if (prev.some(c => c.email.toLowerCase() === m.chofer_email.toLowerCase())) return prev;
          const adminSet = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()));
          const tipo = adminSet.has(m.chofer_email.toLowerCase()) ? 'admin' : 'chofer';
          return [...prev, {
            email: m.chofer_email,
            nombre: nombreDeEmail(m.chofer_email, nombresMap),
            color: colorFromEmail(m.chofer_email),
            tipo,
          }];
        });
      }).subscribe();
    return () => supabase.removeChannel(canal);
  }, [miEmail, esAdminUser, nombresMap]);

  // ── Cargar mensajes del contacto activo ───────────────────────────────────
  useEffect(() => {
    if (!contactoActivo?.email || !miEmail) return;
    setLoading(true); setMensajes([]);

    const fetch = async () => {
      const emailA = miEmail.toLowerCase();
      const emailB = contactoActivo.email.toLowerCase();

      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .or(
          `and(chofer_email.eq.${emailA},admin_id.eq.${emailB}),` +
          `and(chofer_email.eq.${emailB},admin_id.eq.${emailA})`
        )
        .order('created_at', { ascending: true });

      if (!error) setMensajes(data || []);
      setLoading(false);
    };
    fetch();

    // Realtime bidireccional
    const emailA = miEmail.toLowerCase();
    const emailB = contactoActivo.email.toLowerCase();
    const canal = supabase.channel(`chat:${emailA}:${emailB}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, payload => {
        const m = payload.new;
        const ce = m.chofer_email?.toLowerCase();
        const ai = m.admin_id?.toLowerCase();
        const ok = (ce === emailA && ai === emailB) || (ce === emailB && ai === emailA);
        if (ok) setMensajes(prev => [...prev, m]);
      }).subscribe();
    return () => supabase.removeChannel(canal);
  }, [contactoActivo?.email, contactoActivo?.tipo, miEmail, esAdminUser]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const onEnviar = useCallback(async ({ texto, media_url, media_type }) => {
    if (!contactoActivo?.email) return;

    const adminSet = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()));
    const soyAdmin = esAdminUser || adminSet.has(miEmail.toLowerCase());

    // remitente = nombre real si lo tenemos, si no el email
    const miNombre = nombresMap[miEmail.toLowerCase()] || miEmail;

    const row = {
      texto,
      media_url,
      media_type,
      estado: 'enviado',
      remitente: miNombre,
      visto_admin: soyAdmin,
      visto_chofer: !soyAdmin,
    };

    if (soyAdmin) {
      row.admin_id = miEmail;
      row.chofer_email = contactoActivo.email;
    } else {
      row.chofer_email = miEmail;
      row.admin_id = contactoActivo.email;
    }

    const { error } = await supabase.from('mensajes').insert([row]);
    if (error) console.error('Error al enviar:', error);
  }, [miEmail, esAdminUser, contactoActivo, nombresMap]);

  // ── Agrupar por fecha ─────────────────────────────────────────────────────
  const formatFecha = ts => ts ? new Date(ts).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const grupos = mensajes.reduce((acc, m, i) => {
    const d = new Date(m.created_at).toDateString();
    const p = i > 0 ? new Date(mensajes[i - 1].created_at).toDateString() : null;
    if (d !== p) acc.push({ tipo: 'fecha', valor: formatFecha(m.created_at), key: `f${i}` });
    acc.push({ tipo: 'msg', data: m, key: m.id });
    return acc;
  }, []);

  const colegasAdmin = contactos.filter(c => c.tipo === 'admin');
  const choferes = contactos.filter(c => c.tipo === 'chofer');

  const renderContacto = c => {
    const activo = contactoActivo?.email?.toLowerCase() === c.email.toLowerCase();
    return (
      <button key={c.email} onClick={() => setContactoActivo(c)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', backgroundColor: activo ? `${c.color}20` : 'transparent', cursor: 'pointer', marginBottom: '2px', transition: 'background 80ms' }}
        onMouseEnter={e => { if (!activo) e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9'; }}
        onMouseLeave={e => { if (!activo) e.currentTarget.style.backgroundColor = 'transparent'; }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${c.color}25`, border: `2px solid ${activo ? c.color : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
          {c.tipo === 'admin' ? '🛡️' : '👤'}
        </div>
        <div style={{ textAlign: 'left', overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: activo ? '700' : '600', color: activo ? c.color : text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</p>

        </div>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', backgroundColor: pageBg, overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, backgroundColor: sidebarBg, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={15} color={text2} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensajes</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loadingC ? (
            <div style={{ padding: '20px', textAlign: 'center', color: text2, fontSize: '12px' }}>Cargando...</div>
          ) : (
            <>
              {esAdminUser && colegasAdmin.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px 4px' }}>
                    <Users size={11} color={text2} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipo</span>
                  </div>
                  {colegasAdmin.map(renderContacto)}
                </>
              )}
              {esAdminUser && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 10px 4px', borderTop: colegasAdmin.length > 0 ? `1px solid ${border}` : 'none', marginTop: '4px' }}>
                    <Inbox size={11} color={text2} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: text2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choferes</span>
                  </div>
                  {choferes.length === 0
                    ? <div style={{ padding: '8px 10px', fontSize: '12px', color: text2 }}>Ningún chofer escribió aún</div>
                    : choferes.map(renderContacto)}
                </>
              )}
              {!esAdminUser && contactos.map(renderContacto)}
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!contactoActivo ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: text2, gap: '12px' }}>
            <MessageCircle size={40} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: '14px' }}>Seleccioná un contacto</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 20px', backgroundColor: sidebarBg, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${contactoActivo.color}25`, border: `2px solid ${contactoActivo.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                {contactoActivo.tipo === 'admin' ? '🛡️' : '👤'}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: text1 }}>{contactoActivo.nombre}</p>
                <p style={{ margin: 0, fontSize: '11px', color: text2 }}>{contactoActivo.tipo === 'admin' ? 'Admin' : 'Coordinador'}</p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', backgroundColor: chatBg, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: text2, marginTop: '40px' }}>⏳ Cargando...</div>
              ) : grupos.length === 0 ? (
                <div style={{ textAlign: 'center', color: text2, marginTop: '60px' }}>
                  <p style={{ fontSize: '32px', margin: '0 0 10px' }}>💬</p>
                  No hay mensajes con {contactoActivo.nombre}.<br />¡Mandá el primero!
                </div>
              ) : grupos.map(item => {
                if (item.tipo === 'fecha') return (
                  <div key={item.key} style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: text2, background: isDark ? '#1e293b' : '#e2e8f0', padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>{item.valor}</span>
                  </div>
                );
                return <ChatBurbuja key={item.key} m={item.data} miEmail={miEmail} esAdminUser={esAdminUser} isDark={isDark} contactoColor={contactoActivo.color} />;
              })}
              <div ref={bottomRef} />
            </div>

            <InputChat onEnviar={onEnviar} color={contactoActivo.color} isDark={isDark} border={border} text1={text1} inputBg={inputBg} text2={text2} />
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}