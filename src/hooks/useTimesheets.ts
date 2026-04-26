import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TimesheetStatus = 'pending' | 'approved' | 'rejected';

export function useTimesheets(dateRange?: { from: string; to: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['timesheets', user?.id, dateRange],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false });
      if (dateRange) {
        query = query.or(`and(clock_in.gte.${dateRange.from},clock_in.lte.${dateRange.to}),and(clock_out.gte.${dateRange.from},clock_out.lte.${dateRange.to})`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useActiveTimesheet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active_timesheet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('timesheets')
        .insert({ user_id: user.id, clock_in: new Date().toISOString() } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active_timesheet'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['admin_live_workforce'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('timesheets')
        .update({ clock_out: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active_timesheet'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['admin_live_workforce'] });
      qc.invalidateQueries({ queryKey: ['employee_timesheets_admin'] });
    },
  });
}

/**
 * Admin force clock-out: closes any worker's open timesheet.
 * Adds an audit note explaining who closed it.
 */
export function useAdminForceClockOut() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, workerName }: { id: string; workerName?: string }) => {
      const now = new Date().toISOString();
      // Get existing notes to append rather than overwrite
      const { data: existing } = await supabase
        .from('timesheets')
        .select('notes')
        .eq('id', id)
        .maybeSingle();
      const adminLabel = user?.email ?? 'admin';
      const stamp = new Date().toLocaleString();
      const auditLine = `[Force clock-out by ${adminLabel} on ${stamp}]`;
      const newNotes = existing?.notes ? `${existing.notes}\n${auditLine}` : auditLine;

      const { data, error } = await supabase
        .from('timesheets')
        .update({ clock_out: now, notes: newNotes } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active_timesheet'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['admin_live_workforce'] });
      qc.invalidateQueries({ queryKey: ['employee_timesheets_admin'] });
    },
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   ADMIN: Live workforce — currently clocked-in workers + today's hours summary
   ──────────────────────────────────────────────────────────────────────────── */
export function useAdminLiveWorkforce() {
  return useQuery({
    queryKey: ['admin_live_workforce'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Active sessions (clocked in, no clock_out)
      const { data: active, error: activeErr } = await supabase
        .from('timesheets')
        .select('id, user_id, clock_in, notes')
        .is('clock_out', null)
        .order('clock_in', { ascending: false });
      if (activeErr) throw activeErr;

      // Today's completed sessions
      const { data: today_done, error: doneErr } = await supabase
        .from('timesheets')
        .select('id, user_id, clock_in, clock_out, status')
        .gte('clock_in', todayIso)
        .not('clock_out', 'is', null);
      if (doneErr) throw doneErr;

      // Resolve worker names
      const userIds = Array.from(new Set([...(active ?? []), ...(today_done ?? [])].map((r: any) => r.user_id)));
      let nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('worker_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        (profiles ?? []).forEach((p: any) => nameMap.set(p.user_id, p.full_name));
      }

      const activeSessions = (active ?? []).map((a: any) => ({
        ...a,
        full_name: nameMap.get(a.user_id) ?? 'Unknown',
        elapsed_hours: (Date.now() - new Date(a.clock_in).getTime()) / 3_600_000,
      }));

      const totalCompletedTodayHours = (today_done ?? []).reduce((sum: number, r: any) => {
        return sum + (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3_600_000;
      }, 0);

      // Include in-progress hours from sessions that started today
      const totalActiveTodayHours = (active ?? []).reduce((sum: number, r: any) => {
        const start = new Date(r.clock_in).getTime();
        if (start < today.getTime()) return sum; // started before today; skip from "today" total
        return sum + (Date.now() - start) / 3_600_000;
      }, 0);

      const totalTodayHours = totalCompletedTodayHours + totalActiveTodayHours;

      return {
        active_sessions: activeSessions,
        completed_today: today_done?.length ?? 0,
        total_today_hours: Math.round(totalTodayHours * 100) / 100,
        active_count: activeSessions.length,
      };
    },
    refetchInterval: 60_000, // refresh every minute
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   HR: per-employee timesheet history (admin/HR view)
   ──────────────────────────────────────────────────────────────────────────── */
export function useEmployeeTimesheets(userId: string | undefined, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['employee_timesheets_admin', userId, dateRange],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userId)
        .order('clock_in', { ascending: false });
      if (dateRange) {
        q = q.gte('clock_in', dateRange.from).lte('clock_in', dateRange.to);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_timesheets_admin'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

export function useRejectTimesheet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_timesheets_admin'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   FINANCE: aggregator — approved hours by worker for a date range
   ──────────────────────────────────────────────────────────────────────────── */
export type ApprovedHoursRow = {
  user_id: string;
  full_name: string;
  hourly_rate: number;
  total_hours: number;
  entry_count: number;
};

export function useAggregatedApprovedHours(start: string | null, end: string | null) {
  return useQuery({
    queryKey: ['aggregated_approved_hours', start, end],
    queryFn: async () => {
      if (!start || !end) return [] as ApprovedHoursRow[];
      const { data, error } = await (supabase as any).rpc('aggregate_approved_hours', {
        _start_date: start,
        _end_date: end,
      });
      if (error) throw error;
      return (data ?? []) as ApprovedHoursRow[];
    },
    enabled: !!start && !!end,
  });
}
