import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Komunikaty Supabase po angielsku -> po polsku, bez szczegółów technicznych
// (właściciel sklepu nigdy nie powinien zobaczyć "AuthApiError").
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.';
  if (m.includes('email not confirmed')) return 'Potwierdź adres e-mail przed zalogowaniem.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  if (m.includes('network') || m.includes('fetch')) return 'Brak połączenia z serwerem.';
  return 'Nie udało się zalogować. Spróbuj ponownie.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  async function refreshRoles(userId: string | undefined) {
    if (!userId) {
      setIsStaff(false);
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const roles = (data || []).map((r) => r.role as string);
    setIsStaff(roles.includes('admin') || roles.includes('manager'));
    setIsAdmin(roles.includes('admin'));
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await refreshRoles(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await refreshRoles(newSession?.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(translateAuthError(error.message));
      throw error;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, isStaff, isAdmin, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>');
  return ctx;
}
