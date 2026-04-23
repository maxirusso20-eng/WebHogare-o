import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ═══════════════════════════════════════════════════════════════
// EMAILS CON ACCESO ADMIN (ven TODO el menú)
// Agregá acá los emails de admins y subadmins.
// Cualquier otro mail autenticado es "viewer":
//   → ve: Dashboard, Recorridos, Maps, Chat
//   → NO ve: Choferes, Clientes
// ═══════════════════════════════════════════════════════════════
export const ADMIN_EMAILS = [
  'maxirusso20@gmail.com',
  'fedeavila@gmail.com',
  'lucas.figueredo092@gmail.com',
];

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [role, setRole] = useState(null);       // 'admin' | 'viewer' | null

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setRole(resolveRole(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setRole(resolveRole(session));
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

function resolveRole(session) {
  if (!session?.user) return null;
  const email = session.user.email?.toLowerCase() ?? '';
  if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) return 'admin';
  return 'viewer';
}