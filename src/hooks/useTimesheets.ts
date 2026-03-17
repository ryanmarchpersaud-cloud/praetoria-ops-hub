import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
        query = query.gte('clock_in', dateRange.from).lte('clock_in', dateRange.to);
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
    },
  });
}
