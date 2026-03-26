import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useVisits(filters?: { visit_status?: string; visit_type?: string; search?: string }) {
  return useQuery({
    queryKey: ['visits', filters],
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select('*, jobs(id, job_title, job_number), properties(id, property_name), customers(first_name, last_name, company_name), visit_photos(id)')
        .order('service_date', { ascending: false });
      if (filters?.visit_status) query = query.eq('visit_status', filters.visit_status as any);
      if (filters?.visit_type) query = query.eq('visit_type', filters.visit_type as any);
      if (filters?.search) query = query.or(`visit_number.ilike.%${filters.search}%,service_summary.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useVisit(id: string | undefined) {
  return useQuery({
    queryKey: ['visit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('visits').select('*, jobs(*), properties(*), customers(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: any) => {
      // Clean "none" sentinel values to null
      const cleaned = { ...visit };
      if (cleaned.job_id === 'none' || cleaned.job_id === '') cleaned.job_id = null;
      if (cleaned.assigned_worker_id === 'none' || cleaned.assigned_worker_id === '') cleaned.assigned_worker_id = null;
      const { data, error } = await supabase.from('visits').insert(cleaned).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });
      qc.invalidateQueries({ queryKey: ['property_visits'] });
      qc.invalidateQueries({ queryKey: ['employees_admin'] });
    },
  });
}

export function useUpdateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('visits').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['visit', data.id] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });
      qc.invalidateQueries({ queryKey: ['property_visits'] });
    },
  });
}
