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

export function useClockIn(timeClockContext: 'operations' | 'pm_staff' = 'operations') {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('timesheets')
        .insert({
          user_id: user.id,
          clock_in: new Date().toISOString(),
          time_clock_context: timeClockContext,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active_timesheet'] });
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['admin_live_workforce'] });
      qc.invalidateQueries({ queryKey: ['pm_dash_staff_activity'] });
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
      qc.invalidateQueries({ queryKey: ['pm_dash_staff_activity'] });
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
      qc.invalidateQueries({ queryKey: ['pm_dash_staff_activity'] });
      qc.invalidateQueries({ queryKey: ['employee_timesheets_admin'] });
    },
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   ADMIN: Live workforce — currently clocked-in workers + today's hours summary
   Shared shape used by both the main admin dashboard and the PM-scoped panel.
   ──────────────────────────────────────────────────────────────────────────── */
async function fetchLiveWorkforce(userIdFilter: string[] | null) {
  // If a filter is supplied but empty → return empty aggregate (no PM staff exists yet).
  if (userIdFilter && userIdFilter.length === 0) {
    return {
      active_sessions: [] as any[],
      completed_today: 0,
      total_today_hours: 0,
      active_count: 0,
      breakdown: {
        completed_today_hours: 0,
        completed_today_count: 0,
        active_today_hours: 0,
        active_today_count: 0,
        carryover_hours: 0,
        carryover_count: 0,
      },
      labor_cost: {
        total_today: 0,
        workers_without_rate: 0,
        per_worker: [] as any[],
      },
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Active sessions (clocked in, no clock_out)
  let activeQ = supabase
    .from('timesheets')
    .select('id, user_id, clock_in, notes')
    .is('clock_out', null)
    .order('clock_in', { ascending: false });
  if (userIdFilter) activeQ = activeQ.in('user_id', userIdFilter);
  const { data: active, error: activeErr } = await activeQ;
  if (activeErr) throw activeErr;

  // Today's completed sessions
  let doneQ = supabase
    .from('timesheets')
    .select('id, user_id, clock_in, clock_out, status')
    .gte('clock_in', todayIso)
    .not('clock_out', 'is', null);
  if (userIdFilter) doneQ = doneQ.in('user_id', userIdFilter);
  const { data: today_done, error: doneErr } = await doneQ;
  if (doneErr) throw doneErr;

  // Resolve worker names + hourly rates
  const userIds = Array.from(new Set([...(active ?? []), ...(today_done ?? [])].map((r: any) => r.user_id)));
  const nameMap = new Map<string, string>();
  const rateMap = new Map<string, number>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('worker_profiles')
      .select('user_id, full_name, hourly_rate')
      .in('user_id', userIds);
    (profiles ?? []).forEach((p: any) => {
      nameMap.set(p.user_id, p.full_name);
      rateMap.set(p.user_id, Number(p.hourly_rate ?? 0));
    });
  }

  const activeSessions = (active ?? []).map((a: any) => ({
    ...a,
    full_name: nameMap.get(a.user_id) ?? 'Unknown',
    hourly_rate: rateMap.get(a.user_id) ?? 0,
    elapsed_hours: (Date.now() - new Date(a.clock_in).getTime()) / 3_600_000,
  }));

  const perWorker = new Map<string, {
    user_id: string;
    full_name: string;
    hourly_rate: number;
    completed_hours: number;
    active_hours: number;
  }>();
  const ensure = (uid: string) => {
    let row = perWorker.get(uid);
    if (!row) {
      row = {
        user_id: uid,
        full_name: nameMap.get(uid) ?? 'Unknown',
        hourly_rate: rateMap.get(uid) ?? 0,
        completed_hours: 0,
        active_hours: 0,
      };
      perWorker.set(uid, row);
    }
    return row;
  };

  let totalCompletedTodayHours = 0;
  (today_done ?? []).forEach((r: any) => {
    const hrs = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3_600_000;
    totalCompletedTodayHours += hrs;
    ensure(r.user_id).completed_hours += hrs;
  });

  let totalActiveTodayHours = 0;
  let totalActiveCarryoverHours = 0;
  let activeStartedToday = 0;
  let activeCarryover = 0;
  (active ?? []).forEach((r: any) => {
    const start = new Date(r.clock_in).getTime();
    const elapsed = (Date.now() - start) / 3_600_000;
    if (start >= today.getTime()) {
      totalActiveTodayHours += elapsed;
      activeStartedToday += 1;
      ensure(r.user_id).active_hours += elapsed;
    } else {
      totalActiveCarryoverHours += elapsed;
      activeCarryover += 1;
    }
  });

  const totalTodayHours = totalCompletedTodayHours + totalActiveTodayHours;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const workerCosts = Array.from(perWorker.values())
    .map((w) => {
      const hours = w.completed_hours + w.active_hours;
      return {
        user_id: w.user_id,
        full_name: w.full_name,
        hourly_rate: w.hourly_rate,
        hours: round2(hours),
        completed_hours: round2(w.completed_hours),
        active_hours: round2(w.active_hours),
        cost: round2(hours * w.hourly_rate),
      };
    })
    .filter((w) => w.hours > 0)
    .sort((a, b) => b.cost - a.cost);

  const totalLaborCostToday = round2(workerCosts.reduce((s, w) => s + w.cost, 0));
  const workersWithoutRate = workerCosts.filter((w) => w.hourly_rate <= 0).length;

  return {
    active_sessions: activeSessions,
    completed_today: today_done?.length ?? 0,
    total_today_hours: round2(totalTodayHours),
    active_count: activeSessions.length,
    breakdown: {
      completed_today_hours: round2(totalCompletedTodayHours),
      completed_today_count: today_done?.length ?? 0,
      active_today_hours: round2(totalActiveTodayHours),
      active_today_count: activeStartedToday,
      carryover_hours: round2(totalActiveCarryoverHours),
      carryover_count: activeCarryover,
    },
    labor_cost: {
      total_today: totalLaborCostToday,
      workers_without_rate: workersWithoutRate,
      per_worker: workerCosts,
    },
  };
}

export function useAdminLiveWorkforce() {
  return useQuery({
    queryKey: ['admin_live_workforce'],
    queryFn: () => fetchLiveWorkforce(null),
    refetchInterval: 60_000,
  });
}

/* PM-scoped variant — same shape, filtered to Property Management staff only
   (roles: property_manager, leasing_agent, pm_staff). */
export function usePMLiveWorkforce(enabled: boolean = true) {
  return useQuery({
    queryKey: ['pm_live_workforce'],
    enabled,
    queryFn: async () => {
      const { data: ids, error } = await (supabase as any).rpc('pm_get_workforce_user_ids');
      if (error) throw error;
      const userIds = (ids ?? []).map((r: any) => r.user_id as string);
      return fetchLiveWorkforce(userIds);
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
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
