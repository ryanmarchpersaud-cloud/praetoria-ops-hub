import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Visit timer Pause/Resume log.
 *
 * IMPORTANT: `visit_pauses` records are INFORMATIONAL only.
 * They do NOT modify visits.arrival_time / completion_time,
 * timesheets, payroll, subcontractor payouts, invoices, or the
 * Job Cost Tracker. The gross visit time on the visit record
 * remains the source of truth for those calculations. Net-of-pauses
 * time is presented as an on-screen breakdown only.
 */

export interface VisitPause {
  id: string;
  visit_id: string;
  user_id: string;
  reason: string;
  note: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  billing_classification: string;
  created_at: string;
  created_by: string | null;
}

export const PAUSE_REASONS = [
  'Lunch',
  'Break',
  'Equipment Breakdown',
  'Equipment Repair',
  'Waiting for Materials',
  'Waiting for Customer or Site Access',
  'Meeting',
  'Weather Delay',
  'Travel',
  'Other',
] as const;

export type PauseReason = (typeof PAUSE_REASONS)[number];

export function useVisitPauses(visitId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['visit_pauses', visitId],
    queryFn: async () => {
      if (!visitId) return [] as VisitPause[];
      const { data, error } = await supabase
        .from('visit_pauses' as any)
        .select('*')
        .eq('visit_id', visitId)
        .order('started_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VisitPause[];
    },
    enabled: !!visitId,
    refetchOnWindowFocus: true,
  });

  // Realtime: refresh when a pause changes on this visit (multi-device safety).
  useEffect(() => {
    if (!visitId) return;
    const channel = supabase
      .channel(`visit_pauses_${visitId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visit_pauses', filter: `visit_id=eq.${visitId}` },
        () => qc.invalidateQueries({ queryKey: ['visit_pauses', visitId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [visitId, qc]);

  return query;
}

export function usePauseVisit(visitId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { reason: PauseReason | string; note?: string | null }) => {
      if (!visitId) throw new Error('No visit');
      if (!user) throw new Error('Not authenticated');

      // Guard against double-click: check for an existing open pause first.
      const { data: existing } = await supabase
        .from('visit_pauses' as any)
        .select('id')
        .eq('visit_id', visitId)
        .is('ended_at', null)
        .maybeSingle();
      if (existing) {
        throw new Error('Timer is already paused');
      }

      const { data, error } = await supabase
        .from('visit_pauses' as any)
        .insert({
          visit_id: visitId,
          user_id: user.id,
          reason: input.reason,
          note: input.note?.trim() || null,
          created_by: user.id,
        })
        .select('*')
        .single();
      if (error) throw error;

      // Best-effort activity log (do NOT fail the pause if this fails).
      await supabase.from('activities').insert({
        user_id: user.id,
        action_name: 'visit_timer.paused',
        record_type: 'visit',
        record_id: visitId,
        status: 'completed',
        payload_summary: { reason: input.reason, note: input.note ?? null } as any,
      } as any).then(() => undefined, () => undefined);

      return data as unknown as VisitPause;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit_pauses', visitId] });
    },
  });
}

export function useResumeVisit(visitId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!visitId) throw new Error('No visit');
      // Find the current open pause.
      const { data: open, error: findErr } = await supabase
        .from('visit_pauses' as any)
        .select('id')
        .eq('visit_id', visitId)
        .is('ended_at', null)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!open) throw new Error('Timer is not paused');

      const { error } = await supabase
        .from('visit_pauses' as any)
        .update({ ended_at: new Date().toISOString() })
        .eq('id', (open as any).id);
      if (error) throw error;

      if (user) {
        await supabase.from('activities').insert({
          user_id: user.id,
          action_name: 'visit_timer.resumed',
          record_type: 'visit',
          record_id: visitId,
          status: 'completed',
        } as any).then(() => undefined, () => undefined);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit_pauses', visitId] });
    },
  });
}

/**
 * Called by the Stop/Complete flow to close any lingering open pause
 * at the same timestamp the visit is being finalized at. Idempotent.
 */
export async function closeOpenPauseIfAny(visitId: string, atIso?: string) {
  const { data: open } = await supabase
    .from('visit_pauses' as any)
    .select('id, started_at')
    .eq('visit_id', visitId)
    .is('ended_at', null)
    .maybeSingle();
  if (!open) return;
  // Guard: ended_at must be > started_at (trigger enforces). If clock skewed,
  // add 1 second.
  const startMs = new Date((open as any).started_at).getTime();
  const at = atIso ? new Date(atIso) : new Date();
  const safe = at.getTime() > startMs ? at.toISOString() : new Date(startMs + 1000).toISOString();
  await supabase.from('visit_pauses' as any).update({ ended_at: safe }).eq('id', (open as any).id);
}

/** Sum pause seconds up to `nowMs`, including current open pause. */
export function sumPausedSeconds(pauses: VisitPause[], nowMs: number = Date.now()): number {
  let total = 0;
  for (const p of pauses) {
    const startMs = new Date(p.started_at).getTime();
    const endMs = p.ended_at ? new Date(p.ended_at).getTime() : nowMs;
    if (endMs > startMs) total += Math.floor((endMs - startMs) / 1000);
  }
  return total;
}

/** Returns the currently open pause, if any. */
export function findOpenPause(pauses: VisitPause[]): VisitPause | null {
  return pauses.find(p => !p.ended_at) ?? null;
}
