import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ═══════════════════════════════════════════════════════════════
// ROLES:
//   admin       → ve TODO, puede asignar roles
//   subadmin    → ve todo MENOS "Roles"  
//   coordinador → ve solo Chat, Recorridos, Dashboard, Maps
// ═══════════════════════════════════════════════════════════════

export const ADMIN_EMAILS = [
  'maxirusso20@gmail.com',
];

export const SUBADMIN_EMAILS = [
  'fedeavila@gmail.com',
  'lucas.figueredo092@gmail.com',
  // agregá más acá
];

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      resolveRoleAsync(session).then(setRole);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      resolveRoleAsync(session).then(setRole);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, role, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

async function resolveRoleAsync(session) {
  if (!session?.user) return null;
  const email = session.user.email?.toLowerCase() ?? '';

  if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) return 'admin';
  if (SUBADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) return 'subadmin';

  // Chequear roles dinámicos en Supabase
  try {
    const { data } = await supabase
      .from('roles_usuarios')
      .select('rol')
      .eq('email', email)
      .maybeSingle();
    if (data?.rol) return data.rol;
  } catch (_) { }

  return 'coordinador'; // acceso mínimo por defecto
}