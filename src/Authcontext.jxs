import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ── Emails con acceso ADMIN completo ────────────────────────────────────────
// Agregá acá los emails que tienen acceso total (ven todo, editan todo).
// Cualquier otro email autenticado tendrá rol 'viewer':
//   Ve: Dashboard, Recorridos (puede editar números), Maps, Chat
//   No ve: Choferes ni Clientes
export const ADMIN_EMAILS = [
  // 'federicohogareño@gmail.com',
  // 'maximiliano@empresa.com',
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