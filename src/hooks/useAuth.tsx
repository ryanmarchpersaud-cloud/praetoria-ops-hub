import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/auditLog';

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

  const lastLoggedAuthRef = useRef<string | null>(null);

  const lastUserIdRef = useRef<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;
    const nextUid = nextUser?.id ?? null;
    const prevUid = lastUserIdRef.current;
    const identityChanged = prevUid !== nextUid;

    // Always keep session token fresh (refresh tokens rotate), but only swap
    // the user object when the underlying identity actually changes. This
    // prevents every TOKEN_REFRESHED event from re-rendering every consumer
    // of useAuth() and flashing route guards between loading/loaded.
    setSession(nextSession);
    if (identityChanged) {
      lastUserIdRef.current = nextUid;
      setUser(nextUser);
      setMustChangePasswordChecked(false);
      setTimeout(() => { checkMustChangePassword(nextUid ?? undefined); }, 0);
    }
    setLoading(false);
    return { identityChanged, uid: nextUid };
  }, [checkMustChangePassword]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const { uid } = applySession(session);

      // Audit auth events (deferred so we don't block the auth callback)
      const dedupeKey = `${event}:${uid ?? 'anon'}`;
      if (lastLoggedAuthRef.current !== dedupeKey) {
        lastLoggedAuthRef.current = dedupeKey;
        setTimeout(() => {
          if (event === 'SIGNED_IN' && uid) {
            logAuditEvent({ action: 'auth.login', targetType: 'user', targetId: uid });
          } else if (event === 'SIGNED_OUT') {
            logAuditEvent({ action: 'auth.logout', targetType: 'user', targetId: uid });
          } else if (event === 'PASSWORD_RECOVERY' && uid) {
            logAuditEvent({ action: 'auth.password_reset_requested', targetType: 'user', targetId: uid });
          } else if (event === 'USER_UPDATED' && uid) {
            logAuditEvent({ action: 'auth.password_changed', targetType: 'user', targetId: uid });
          }
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
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
