import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const staleTime = 60_000;

export function useProspects() {
  return useQuery({
    queryKey: ['pm_prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_prospects' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useShowings() {
  return useQuery({
    queryKey: ['pm_showings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_showings' as any)
        .select('*, prospect:pm_prospects(name)')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ['pm_applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_applications' as any)
        .select('*, prospect:pm_prospects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useVacantUnits() {
  return useQuery({
    queryKey: ['pm_vacant_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_units' as any)
        .select('*, property:pm_managed_properties(id, property_name, address_line_1, city)')
        .eq('status', 'vacant');
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useStaffTasks(mineOnly = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_tasks', mineOnly ? user?.id : 'all'],
    queryFn: async () => {
      let q = supabase.from('pm_staff_tasks' as any).select('*').order('due_date', { ascending: true, nullsFirst: false });
      if (mineOnly && user?.id) q = q.eq('assigned_to', user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useMoveInChecklists() {
  return useQuery({
    queryKey: ['pm_move_in_checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_move_in_checklists' as any)
        .select('*, property:pm_managed_properties(property_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function useMoveOutChecklists() {
  return useQuery({
    queryKey: ['pm_move_out_checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_move_out_checklists' as any)
        .select('*, property:pm_managed_properties(property_name), unit:pm_units(unit_label), tenant:pm_tenants(first_name,last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime,
  });
}

export function usePMStaffUsers() {
  return useQuery({
    queryKey: ['pm_staff_users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles' as any)
        .select('user_id, role')
        .in('role', ['leasing_agent', 'property_manager']);
      if (error) throw error;
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles' as any)
        .select('user_id, display_name')
        .in('user_id', ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
      return (roles ?? []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        display_name: map.get(r.user_id) || r.user_id.slice(0, 8),
      }));
    },
    staleTime,
  });
}

export function useCreateRecord(table: string, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data, error } = await supabase.from(table as any).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate.forEach(k => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useUpdateRecord(table: string, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { data, error } = await supabase.from(table as any).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate.forEach(k => qc.invalidateQueries({ queryKey: [k] })),
  });
}
