import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const staleTime = 60_000;

function monthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
  return { start, nextStart };
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/* ─── Row 1 — Business KPIs ─────────────────────────────────────────── */
export function usePMBusinessKPIs() {
  return useQuery({
    queryKey: ['pm_dash_business_kpis'],
    queryFn: async () => {
      const { start, nextStart } = monthWindow();
      const today = todayISO();
      const in60 = inDays(60);

      const [units, chargesMTD, arRows, overdueRows, activeLeases, expiringSoon] = await Promise.all([
        supabase.from('pm_units' as any).select('id,status'),
        supabase.from('pm_charges' as any).select('amount,amount_paid,status,charge_type,due_date')
          .gte('due_date', start).lt('due_date', nextStart),
        supabase.from('pm_charges' as any).select('balance,status')
          .in('status', ['open', 'partial', 'overdue']),
        supabase.from('pm_charges' as any).select('balance,due_date,status')
          .in('status', ['open', 'partial', 'overdue']).lt('due_date', today),
        supabase.from('pm_leases' as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('pm_leases' as any).select('id', { count: 'exact', head: true })
          .eq('status', 'active').gte('end_date', today).lte('end_date', in60),
      ]);

      const unitRows = (units.data ?? []) as any[];
      const totalUnits = unitRows.length;
      const occupied = unitRows.filter((u) => u.status === 'occupied').length;

      const chargeRows = (chargesMTD.data ?? []) as any[];
      const rentBilled = chargeRows
        .filter((c) => c.charge_type === 'rent')
        .reduce((s, c) => s + Number(c.amount || 0), 0);
      const rentCollected = chargeRows
        .filter((c) => c.charge_type === 'rent')
        .reduce((s, c) => s + Number(c.amount_paid || 0), 0);

      const outstandingAR = ((arRows.data ?? []) as any[])
        .reduce((s, r) => s + Number(r.balance || 0), 0);
      const overdueBalance = ((overdueRows.data ?? []) as any[])
        .reduce((s, r) => s + Number(r.balance || 0), 0);

      return {
        occupancyPct: totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0,
        occupiedUnits: occupied,
        totalUnits,
        rentBilled,
        rentCollected,
        outstandingAR,
        overdueBalance,
        activeLeases: activeLeases.count ?? 0,
        expiringSoon: expiringSoon.count ?? 0,
      };
    },
    staleTime,
  });
}

/* ─── Row 2 — Leasing Pipeline ──────────────────────────────────────── */
export function useLeasingPipeline() {
  return useQuery({
    queryKey: ['pm_dash_leasing_pipeline'],
    queryFn: async () => {
      const today = todayISO();
      const in14 = inDays(14);
      const [prospects, showings, appsSubmitted, appsReview, appsApproved] = await Promise.all([
        supabase.from('pm_prospects' as any).select('id', { count: 'exact', head: true })
          .in('status', ['new', 'active', 'contacted']),
        supabase.from('pm_showings' as any).select('id', { count: 'exact', head: true })
          .gte('scheduled_at', today).lte('scheduled_at', in14 + 'T23:59:59Z')
          .in('status', ['scheduled', 'confirmed']),
        supabase.from('pm_applications' as any).select('id', { count: 'exact', head: true })
          .eq('status', 'submitted'),
        supabase.from('pm_applications' as any).select('id', { count: 'exact', head: true })
          .in('admin_review_status', ['in_review', 'pending']),
        supabase.from('pm_applications' as any).select('id', { count: 'exact', head: true })
          .eq('admin_review_status', 'approved'),
      ]);
      return {
        prospects: prospects.count ?? 0,
        showings: showings.count ?? 0,
        appsSubmitted: appsSubmitted.count ?? 0,
        appsInReview: appsReview.count ?? 0,
        appsApproved: appsApproved.count ?? 0,
      };
    },
    staleTime,
  });
}

/* ─── Row 3 — Today's Ops ──────────────────────────────────────────── */
export function useShowingsToday() {
  return useQuery({
    queryKey: ['pm_dash_showings_today'],
    queryFn: async () => {
      const today = todayISO();
      const { data, error } = await supabase.from('pm_showings' as any)
        .select('id,scheduled_at,status,assigned_to,prospect:pm_prospects(name),unit:pm_units(unit_label),property:pm_managed_properties(property_name)')
        .gte('scheduled_at', today + 'T00:00:00Z')
        .lte('scheduled_at', today + 'T23:59:59Z')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useStaffTasksToday() {
  return useQuery({
    queryKey: ['pm_dash_staff_tasks_today'],
    queryFn: async () => {
      const today = todayISO();
      const { data, error } = await supabase.from('pm_staff_tasks' as any)
        .select('id,title,priority,status,due_date,assigned_to')
        .lte('due_date', today)
        .not('status', 'in', '(done,completed,cancelled)')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

/* ─── Row 4 — Renewals & Maintenance ───────────────────────────────── */
export function useRenewalsAttention() {
  return useQuery({
    queryKey: ['pm_dash_renewals_attention'],
    queryFn: async () => {
      const in60 = inDays(60);
      const today = todayISO();
      const { data, error } = await supabase.from('pm_lease_renewals' as any)
        .select('id,status,current_lease_end_date,proposed_rent,current_rent,tenant:pm_tenants(first_name,last_name),property:pm_managed_properties(property_name),unit:pm_units(unit_label)')
        .or(`status.in.(draft,sent,negotiating,tenant_review),current_lease_end_date.lte.${in60}`)
        .order('current_lease_end_date', { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const overdue = rows.filter((r) => r.current_lease_end_date && r.current_lease_end_date < today).length;
      return { rows: rows.slice(0, 5), total: rows.length, overdue };
    },
    staleTime,
  });
}

export function useMaintenanceByPriority() {
  return useQuery({
    queryKey: ['pm_dash_maintenance_priority'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_maintenance_requests' as any)
        .select('id,priority,status,is_urgent_safety')
        .not('status', 'in', '(completed,cancelled,closed)');
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const bucket = (p: string) => rows.filter((r) => (r.priority ?? 'normal').toLowerCase() === p).length;
      return {
        emergency: rows.filter((r) => r.is_urgent_safety || (r.priority ?? '').toLowerCase() === 'emergency').length,
        high: bucket('high'),
        normal: bucket('normal') + bucket('medium'),
        low: bucket('low'),
        total: rows.length,
      };
    },
    staleTime,
  });
}

/* ─── Row 5 — Staff Activity (admin only) ──────────────────────────── */
export function usePMStaffActivity(enabled: boolean) {
  return useQuery({
    queryKey: ['pm_dash_staff_activity'],
    enabled,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startISO = startOfDay.toISOString();

      // Fetch PM staff role holders
      const { data: roleRows } = await supabase.from('user_roles' as any)
        .select('user_id, role')
        .in('role', ['leasing_agent', 'property_manager', 'pm_staff']);
      const roleMap = new Map<string, string>();
      (roleRows ?? []).forEach((r: any) => { if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role); });
      const pmIds = Array.from(roleMap.keys());

      if (pmIds.length === 0) {
        return { clockedIn: [], clockedOutToday: [], hoursTodayTotal: 0, appsWaiting: 0 };
      }

      const [tsRows, appsWaiting, profs] = await Promise.all([
        supabase.from('timesheets' as any)
          .select('user_id, clock_in, clock_out, status')
          .in('user_id', pmIds)
          .gte('clock_in', startISO)
          .order('clock_in', { ascending: false }),
        supabase.from('pm_applications' as any).select('id', { count: 'exact', head: true })
          .in('admin_review_status', ['in_review', 'pending']),
        supabase.from('profiles' as any).select('user_id, display_name').in('user_id', pmIds),
      ]);

      const nameMap = new Map<string, string>();
      (profs.data ?? []).forEach((p: any) => nameMap.set(p.user_id, p.display_name || 'PM Staff'));

      const rows = (tsRows.data ?? []) as any[];
      const clockedIn: any[] = [];
      const clockedOutToday: any[] = [];
      let hoursTodayTotal = 0;

      // Track most recent shift per user
      const seen = new Set<string>();
      for (const r of rows) {
        const name = nameMap.get(r.user_id) || 'PM Staff';
        const role = roleMap.get(r.user_id) || 'pm_staff';
        if (r.clock_out) {
          const hrs = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3_600_000;
          hoursTodayTotal += Math.max(0, hrs);
          if (!seen.has(r.user_id)) {
            clockedOutToday.push({ user_id: r.user_id, name, role, hours: hrs, clock_out: r.clock_out });
          }
        } else {
          const elapsed = (Date.now() - new Date(r.clock_in).getTime()) / 3_600_000;
          hoursTodayTotal += Math.max(0, elapsed);
          if (!seen.has(r.user_id)) {
            clockedIn.push({ user_id: r.user_id, name, role, clock_in: r.clock_in, elapsed });
          }
        }
        seen.add(r.user_id);
      }

      return {
        clockedIn,
        clockedOutToday,
        hoursTodayTotal,
        appsWaiting: appsWaiting.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
