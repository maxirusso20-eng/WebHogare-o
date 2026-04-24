import { ADMIN_EMAILS } from './AuthContext';

export function labelFromEmail(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

const PALETTE = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
export function colorFromEmail(email) {
  if (!email) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function esAdminEmail(email) {
  return ADMIN_EMAILS.some(a => a.toLowerCase() === email?.toLowerCase());
}

function formatHora(ts) {
  return ts ? new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function isUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function ContenidoMensaje({ m, esMio }) {
  const tipo = m.media_type || 'texto';
  const url = m.media_url;

  if (tipo === 'imagen' && url) return (
    <div>
      <img src={url} alt="imagen"
        style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '10px', display: 'block', cursor: 'pointer', objectFit: 'cover' }}
        onClick={() => window.open(url, '_blank')} />
      {m.texto && <p style={{ margin: '6px 0 0', fontSize: '13px' }}>{m.texto}</p>}
    </div>
  );

  if (tipo === 'audio' && url) return (
    <div>
      <audio controls src={url} style={{ maxWidth: '220px', height: '36px', display: 'block' }} />
      {m.texto && <p style={{ margin: '4px 0 0', fontSize: '12px', color: esMio ? '#ffffffcc' : '#64748b' }}>{m.texto}</p>}
    </div>
  );

  if (tipo === 'archivo' && url) {
    const nombre = m.texto || url.split('/').pop();
    return (
      <a href={url} target="_blank" rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: esMio ? '#fff' : '#1e293b' }}>
        <span style={{ fontSize: '22px' }}>📎</span>
        <span style={{ fontSize: '13px', textDecoration: 'underline', wordBreak: 'break-all' }}>{nombre}</span>
      </a>
    );
  }

  if (tipo === 'link' || isUrl(m.texto)) return (
    <a href={m.texto} target="_blank" rel="noreferrer"
      style={{ color: esMio ? '#bfdbfe' : '#3b82f6', fontSize: '13px', wordBreak: 'break-all' }}>
      🔗 {m.texto}
    </a>
  );

  return <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>{m.texto}</p>;
}

export function ChatBurbuja({ m, miEmail, esAdminUser, isDark, contactoColor }) {
  // esMio: si soy admin → mis mensajes tienen remitente='admin' y admin_id=miEmail
  //        si soy chofer → mis mensajes tienen remitente='chofer' y chofer_email=miEmail
  // Determinar si el mensaje es mío usando los campos de email
  const miEmailL = miEmail?.toLowerCase() ?? '';
  const esMio = esAdminUser
    ? m.admin_id?.toLowerCase() === miEmailL
    : m.chofer_email?.toLowerCase() === miEmailL;

  const bubbleBg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text1 = isDark ? '#f1f5f9' : '#1e293b';
  const text2 = isDark ? '#94a3b8' : '#64748b';

  // Email del remitente para avatar/color (usar el campo de email, no remitente)
  const senderEmail = esAdminUser
    ? (m.admin_id?.toLowerCase() === miEmailL ? m.admin_id : m.chofer_email)
    : (m.chofer_email?.toLowerCase() === miEmailL ? m.chofer_email : m.admin_id);
  const leido = esAdminUser ? m.visto_admin : m.visto_chofer;

  // Nombre a mostrar: usar el campo remitente (que ahora guardamos como nombre real)
  // Si es un mensaje viejo con remitente='admin'/'chofer', usar labelFromEmail
  const nombreMostrar = m.remitente === 'admin' || m.remitente === 'chofer'
    ? labelFromEmail(senderEmail)
    : (m.remitente || labelFromEmail(senderEmail));

  return (
    <div style={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start', marginBottom: '3px', alignItems: 'flex-end', gap: '6px' }}>
      {!esMio && (
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: `${colorFromEmail(senderEmail)}25`,
          border: `1.5px solid ${colorFromEmail(senderEmail)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', flexShrink: 0,
        }}>
          {m.remitente === 'admin' ? '🛡️' : '👤'}
        </div>
      )}
      <div style={{
        maxWidth: '68%', padding: '8px 12px',
        borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        backgroundColor: esMio ? contactoColor : bubbleBg,
        border: esMio ? 'none' : `1px solid ${border}`,
        color: esMio ? '#ffffff' : text1,
        boxShadow: esMio ? `0 2px 8px ${contactoColor}40` : isDark ? '0 2px 6px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Nombre del remitente (solo si no es mío) */}
        {!esMio && (
          <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: colorFromEmail(senderEmail) }}>
            {nombreMostrar}
          </p>
        )}
        <ContenidoMensaje m={m} esMio={esMio} />
        <p style={{ margin: '4px 0 0', fontSize: '10px', color: esMio ? 'rgba(255,255,255,0.6)' : text2, textAlign: 'right' }}>
          {formatHora(m.created_at)}
          {esMio && <span style={{ marginLeft: '4px' }}>{leido ? '✓✓' : '✓'}</span>}
        </p>
      </div>
    </div>
  );
}