import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const KEY = ['pm_lease_renewals'];

export type LeaseRenewalStatus =
  | 'not_started'
  | 'review_needed'
  | 'renewal_prepared'
  | 'sent_to_tenant'
  | 'tenant_reviewing'
  | 'tenant_accepted'
  | 'tenant_declined'
  | 'month_to_month'
  | 'non_renewal'
  | 'completed'
  | 'cancelled';

export const RENEWAL_STATUSES: LeaseRenewalStatus[] = [
  'not_started','review_needed','renewal_prepared','sent_to_tenant',
  'tenant_reviewing','tenant_accepted','tenant_declined','month_to_month',
  'non_renewal','completed','cancelled',
];

export function useLeaseRenewals(opts?: { mineOnly?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, opts?.mineOnly ? user?.id : 'all'],
    queryFn: async () => {
      let q = supabase.from('pm_lease_renewals' as any)
        .select('*, lease:pm_leases(id,start_date,end_date,monthly_rent,rent_frequency), property:pm_managed_properties(id,property_name,address_line_1,city), unit:pm_units(id,unit_label), tenant:pm_tenants(id,first_name,last_name,email)')
        .order('current_lease_end_date', { ascending: true, nullsFirst: false });
      if (opts?.mineOnly && user?.id) q = q.eq('assigned_to', user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

export function useLeasesEndingSoon(days = 90) {
  return useQuery({
    queryKey: ['pm_leases_ending_soon', days],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0,10);
      const until = new Date(Date.now() + days*86400_000).toISOString().slice(0,10);
      const { data, error } = await supabase.from('pm_leases' as any)
        .select('*, tenant:pm_tenants(id,first_name,last_name), property:pm_managed_properties(id,property_name), unit:pm_units(id,unit_label)')
        .in('status', ['active'])
        .or(`end_date.gte.${today},end_date.is.null`)
        .lte('end_date', until)
        .order('end_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export const RENEWAL_FOLLOWUP_TITLE = 'Contact tenant about renewal';

async function ensureRenewalFollowUpTask(renewal: any, actorId?: string) {
  if (!renewal?.id || !renewal?.assigned_to) return;
  // Dedup: skip if an open follow-up task already exists for this renewal
  const { data: existing } = await supabase
    .from('pm_staff_tasks' as any)
    .select('id,status')
    .eq('renewal_id', renewal.id)
    .eq('title', RENEWAL_FOLLOWUP_TITLE)
    .not('status', 'in', '("completed","cancelled")')
    .limit(1);
  if (existing && existing.length > 0) return;

  const due = addBusinessDays(new Date(), 3).toISOString().slice(0, 10);
  const { error: taskErr } = await supabase.from('pm_staff_tasks' as any).insert({
    title: RENEWAL_FOLLOWUP_TITLE,
    description: 'Auto-created from lease renewal record. Reach out to the tenant regarding their upcoming lease renewal.',
    assigned_to: renewal.assigned_to,
    property_id: renewal.property_id ?? null,
    unit_id: renewal.unit_id ?? null,
    renewal_id: renewal.id,
    due_date: due,
    priority: 'normal',
    status: 'pending',
    created_by: actorId ?? null,
  });
  if (taskErr) return;
  await supabase.from('pm_lease_renewal_activity' as any).insert({
    renewal_id: renewal.id,
    event_type: 'task_created',
    message: 'Renewal follow-up task created and assigned.',
    actor_id: actorId,
  });
}

export function useCreateLeaseRenewal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('pm_lease_renewals' as any)
        .insert({ ...payload, created_by: user?.id })
        .select().single();
      if (error) throw error;
      await supabase.from('pm_lease_renewal_activity' as any).insert({
        renewal_id: (data as any).id,
        event_type: 'created',
        message: 'Renewal record created',
        actor_id: user?.id,
      });
      await ensureRenewalFollowUpTask(data, user?.id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['pm_staff_tasks'] });
    },
  });
}

export function useUpdateLeaseRenewal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch, activityMessage }: { id: string; patch: any; activityMessage?: string }) => {
      const { data, error } = await supabase.from('pm_lease_renewals' as any)
        .update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (activityMessage) {
        await supabase.from('pm_lease_renewal_activity' as any).insert({
          renewal_id: id,
          event_type: 'updated',
          message: activityMessage,
          actor_id: user?.id,
        });
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); },
  });
}

export function useRenewalActivity(renewalId?: string) {
  return useQuery({
    queryKey: ['pm_lease_renewal_activity', renewalId],
    enabled: !!renewalId,
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_lease_renewal_activity' as any)
        .select('*').eq('renewal_id', renewalId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useTenantRenewal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tenant_renewal', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_lease_renewals' as any)
        .select('*, property:pm_managed_properties(property_name,address_line_1,city), unit:pm_units(unit_label)')
        .eq('tenant_visible', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useTenantRespondRenewal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, response }: { id: string; response: 'interested' | 'questions' | 'not_renewing' }) => {
      const status = response === 'interested' ? 'tenant_accepted'
                   : response === 'not_renewing' ? 'tenant_declined'
                   : 'tenant_reviewing';
      const { data, error } = await supabase.from('pm_lease_renewals' as any)
        .update({
          tenant_response: response,
          tenant_responded_at: new Date().toISOString(),
          status,
        })
        .eq('id', id).select().single();
      if (error) throw error;
      await supabase.from('pm_lease_renewal_activity' as any).insert({
        renewal_id: id,
        event_type: 'tenant_response',
        message: `Tenant responded: ${response.replace('_', ' ')}`,
        actor_id: user?.id,
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant_renewal', user?.id] }); },
  });
}
