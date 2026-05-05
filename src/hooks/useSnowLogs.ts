import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SnowLog = {
  id: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  property_id: string | null;
  customer_id: string | null;
  season: string | null;
  temperature_c: number | null;
  weather_conditions: string | null;
  snowfall_cm: number | null;
  services_performed: string[] | null;
  salt_kg: number | null;
  sand_kg: number | null;
  materials_notes: string | null;
  crew_names: string | null;
  total_hours: number | null;
  customer_summary: string | null;
  internal_notes: string | null;
  attachment_url: string | null;
  source: string | null;
  created_at: string;
  properties?: { id: string; property_name: string } | null;
  customers?: { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
};

export function useSnowLogs(filters?: { season?: string; customerId?: string; propertyId?: string }) {
  return useQuery({
    queryKey: ['snow_logs', filters],
    queryFn: async () => {
      let q = supabase
        .from('snow_logs')
        .select('*, properties(id, property_name), customers(id, first_name, last_name, company_name)')
        .order('service_date', { ascending: false });
      if (filters?.season) q = q.eq('season', filters.season);
      if (filters?.customerId) q = q.eq('customer_id', filters.customerId);
      if (filters?.propertyId) q = q.eq('property_id', filters.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SnowLog[];
    },
  });
}

export function useCreateSnowLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<SnowLog>[]) => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload = rows.map((r) => ({ ...r, created_by: userRes.user?.id ?? null }));
      const { data, error } = await supabase.from('snow_logs').insert(payload as any).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snow_logs'] }),
  });
}

export function useUpdateSnowLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SnowLog> }) => {
      const { error } = await supabase.from('snow_logs').update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snow_logs'] }),
  });
}

export function useDeleteSnowLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('snow_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snow_logs'] }),
  });
}
