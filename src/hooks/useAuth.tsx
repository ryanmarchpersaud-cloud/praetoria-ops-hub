import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useRef } from 'react';
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

  const fetchMustChangePassword = useCallback(async (uid: string | undefined) => {
    if (!uid) return false;
    const { data } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('user_id', uid)
      .maybeSingle();
    return !!data?.must_change_password;
  }, []);

  const lastLoggedAuthRef = useRef<string | null>(null);

  const lastUserIdRef = useRef<string | null>(null);
  const liveSessionRef = useRef<Session | null>(null);
  const initialSessionResolvedRef = useRef(false);
  const passwordCheckSeqRef = useRef(0);
  const passwordCheckPendingRef = useRef(false);

  const runMustChangePasswordCheck = useCallback((uid: string | undefined, finishLoading: boolean) => {
    const seq = ++passwordCheckSeqRef.current;
    passwordCheckPendingRef.current = true;
    setMustChangePasswordChecked(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        fetchMustChangePassword(uid)
          .then((mustChange) => {
            if (seq !== passwordCheckSeqRef.current) return;
            setMustChangePassword(mustChange);
            setMustChangePasswordChecked(true);
          })
          .catch(() => {
            if (seq !== passwordCheckSeqRef.current) return;
            setMustChangePassword(false);
            setMustChangePasswordChecked(true);
          })
          .finally(() => {
            if (seq === passwordCheckSeqRef.current) {
              passwordCheckPendingRef.current = false;
              if (finishLoading) setLoading(false);
            }
            resolve();
          });
      }, 0);
    });
  }, [fetchMustChangePassword]);

  const applySession = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;
    const nextUid = nextUser?.id ?? null;
    const prevUid = lastUserIdRef.current;
    const isInitialResolution = !initialSessionResolvedRef.current;
    const identityChanged = prevUid !== nextUid;

    liveSessionRef.current = nextSession;

    if (isInitialResolution) {
      initialSessionResolvedRef.current = true;
      lastUserIdRef.current = nextUid;
      setSession(nextSession);
      setUser(nextUser);
      void runMustChangePasswordCheck(nextUid ?? undefined, true);
      return { identityChanged: true, uid: nextUid };
    }

    // Always keep session token fresh (refresh tokens rotate), but only swap
    // React state/context when the underlying identity actually changes. This
    // prevents every TOKEN_REFRESHED / duplicate INITIAL_SESSION event from
    // re-rendering every useAuth() consumer and flashing route guards over an
    // already-mounted dashboard. Fresh tokens remain available from
    // supabase.auth.getSession(); the ref is intentionally kept in sync here.
    if (identityChanged) {
      lastUserIdRef.current = nextUid;
      setSession(nextSession);
      setUser(nextUser);
      if (nextUid) setLoading(true);
      void runMustChangePasswordCheck(nextUid ?? undefined, true);
      return { identityChanged, uid: nextUid };
    }

    if (passwordCheckPendingRef.current) {
      return { identityChanged, uid: nextUid };
    }
    setLoading(false);
    return { identityChanged, uid: nextUid };
  }, [runMustChangePasswordCheck]);

  useEffect(() => {
    let cancelled = false;
    let initialFallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const { uid } = applySession(session);

      // Audit auth events (deferred so we don't block the auth callback)
      if (!['SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY', 'USER_UPDATED'].includes(event)) return;
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

    // Supabase emits INITIAL_SESSION on page boot. Only fall back to getSession
    // if that event is delayed/missed, avoiding the old double-getSession +
    // INITIAL_SESSION race that briefly remounted protected desktop routes.
    initialFallbackTimer = setTimeout(() => {
      if (initialSessionResolvedRef.current || cancelled) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && !initialSessionResolvedRef.current) applySession(session);
      });
    }, 500);

    return () => {
      cancelled = true;
      if (initialFallbackTimer) clearTimeout(initialFallbackTimer);
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshMustChangePassword = useCallback(async () => {
    await checkMustChangePassword(user?.id);
  }, [user?.id, checkMustChangePassword]);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
    setMustChangePasswordChecked(true);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    mustChangePassword,
    mustChangePasswordChecked,
    refreshMustChangePassword,
    clearMustChangePassword,
    signOut,
  }), [
    user,
    session,
    loading,
    mustChangePassword,
    mustChangePasswordChecked,
    refreshMustChangePassword,
    clearMustChangePassword,
    signOut,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
