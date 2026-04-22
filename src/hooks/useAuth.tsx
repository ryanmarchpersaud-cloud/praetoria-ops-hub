import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mustChangePassword: boolean;
  mustChangePasswordChecked: boolean;
  refreshMustChangePassword: () => Promise<void>;
  clearMustChangePassword: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mustChangePassword: false,
  mustChangePasswordChecked: false,
  refreshMustChangePassword: async () => {},
  clearMustChangePassword: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mustChangePasswordChecked, setMustChangePasswordChecked] = useState(false);

  const checkMustChangePassword = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setMustChangePassword(false);
      setMustChangePasswordChecked(true);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('user_id', uid)
      .maybeSingle();
    setMustChangePassword(!!data?.must_change_password);
    setMustChangePasswordChecked(true);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Defer to avoid potential deadlocks inside the auth callback
      setMustChangePasswordChecked(false);
      setTimeout(() => { checkMustChangePassword(session?.user?.id); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkMustChangePassword(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [checkMustChangePassword]);

  const refreshMustChangePassword = useCallback(async () => {
    await checkMustChangePassword(user?.id);
  }, [user?.id, checkMustChangePassword]);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
    setMustChangePasswordChecked(true);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        mustChangePassword,
        mustChangePasswordChecked,
        refreshMustChangePassword,
        clearMustChangePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
