import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const APPROVAL_STATUSES = [
  'draft',
  'sent_to_owner',
  'owner_reviewing',
  'approved',
  'declined',
  'more_info_requested',
  'cancelled',
  'expired',
  'completed',
] as const;

export const APPROVAL_CATEGORIES = [
  'repair',
  'maintenance',
  'replacement',
  'expense',
  'estimate',
  'lease_renewal',
  'move_out',
  'capital_improvement',
  'other',
] as const;

export const APPROVAL_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type OwnerApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type OwnerApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];
export type OwnerApprovalPriority = (typeof APPROVAL_PRIORITIES)[number];

const KEY = ['pm_owner_approvals'];

const SELECT = `*,
  owner:pm_property_owners(id,owner_name,company_name,email),
  property:pm_managed_properties(id,property_name,address_line_1,city),
  unit:pm_units(id,unit_label)`;

/** Staff / admin — list approvals visible to the current staff member (RLS filters). */
export function useOwnerApprovals() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .select(SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

export function useOwnerApproval(id?: string) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCreateOwnerApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('pm_owner_approval_activity' as any).insert({
        approval_id: (data as any).id,
        event_type: 'created',
        message: 'Owner approval request created.',
        actor_id: user?.id,
        is_owner_visible: false,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateOwnerApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      activityMessage,
      activityOwnerVisible = false,
    }: {
      id: string;
      patch: any;
      activityMessage?: string;
      activityOwnerVisible?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (activityMessage) {
        await supabase.from('pm_owner_approval_activity' as any).insert({
          approval_id: id,
          event_type: 'admin_updated',
          message: activityMessage,
          actor_id: user?.id,
          is_owner_visible: activityOwnerVisible,
        });
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] });
      qc.invalidateQueries({ queryKey: ['pm_owner_approval_activity', vars.id] });
    },
  });
}

export function useSendOwnerApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .update({ status: 'sent_to_owner', sent_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await supabase.from('pm_owner_approval_activity' as any).insert({
        approval_id: id,
        event_type: 'sent_to_owner',
        message: 'Approval request sent to owner.',
        actor_id: user?.id,
        is_owner_visible: true,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useOwnerApprovalActivity(approvalId?: string, opts?: { ownerOnly?: boolean }) {
  return useQuery({
    queryKey: ['pm_owner_approval_activity', approvalId, opts?.ownerOnly ?? false],
    enabled: !!approvalId,
    queryFn: async () => {
      let q = supabase
        .from('pm_owner_approval_activity' as any)
        .select('*')
        .eq('approval_id', approvalId!)
        .order('created_at', { ascending: false });
      if (opts?.ownerOnly) q = q.eq('is_owner_visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ── Owner-side ────────────────────────────────────────────────

const OWNER_KEY = ['owner_approvals_mine'];

/** Owner portal — approvals for properties the logged-in owner is linked to. */
export function useMyOwnerApprovals() {
  return useQuery({
    queryKey: OWNER_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_approvals' as any)
        .select(SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

export function useOwnerRespondToApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      response,
      note,
    }: {
      id: string;
      response: 'approved' | 'declined' | 'more_info';
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc('owner_respond_to_approval' as any, {
        _approval_id: id,
        _response: response,
        _note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OWNER_KEY });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useOwnerMarkApprovalViewed() {
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.rpc('owner_mark_approval_viewed' as any, { _approval_id: id });
    },
  });
}
