import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'pa_unlocked_at';
const SESSION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// SHA-256 with per-user salt (the user_id) — runs in browser via SubtleCrypto.
async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}::${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function usePersonalPinRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal-pin', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_account_pin')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSessionUnlock() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    const ts = sessionStorage.getItem(SESSION_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < SESSION_MS;
  });

  // Auto-relock on expiry
  useEffect(() => {
    if (!unlocked) return;
    const ts = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    const remaining = SESSION_MS - (Date.now() - ts);
    if (remaining <= 0) { setUnlocked(false); return; }
    const t = setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
      setUnlocked(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [unlocked]);

  const unlock = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    setUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }, []);

  return { unlocked, unlock, lock };
}

export function useSetPin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');
      if (!user?.id) throw new Error('Not signed in');
      const pin_hash = await hashPin(pin, user.id);
      const { error } = await supabase
        .from('personal_account_pin')
        .upsert({ user_id: user.id, pin_hash, failed_attempts: 0, locked_until: null }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-pin'] }),
  });
}

export function useVerifyPin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data: rec, error } = await supabase
        .from('personal_account_pin')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!rec) throw new Error('No PIN set');

      // Lockout check
      if (rec.locked_until && new Date(rec.locked_until) > new Date()) {
        const mins = Math.ceil((new Date(rec.locked_until).getTime() - Date.now()) / 60000);
        throw new Error(`Locked. Try again in ${mins} minute(s).`);
      }

      const candidate = await hashPin(pin, user.id);
      if (candidate === rec.pin_hash) {
        await supabase
          .from('personal_account_pin')
          .update({ failed_attempts: 0, locked_until: null, last_unlocked_at: new Date().toISOString() })
          .eq('user_id', user.id);
        return true;
      }

      const newAttempts = (rec.failed_attempts || 0) + 1;
      const willLock = newAttempts >= MAX_ATTEMPTS;
      await supabase
        .from('personal_account_pin')
        .update({
          failed_attempts: willLock ? 0 : newAttempts,
          locked_until: willLock ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
        })
        .eq('user_id', user.id);

      if (willLock) throw new Error(`Too many wrong attempts. Locked for 5 minutes.`);
      throw new Error(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-pin'] }),
  });
}
