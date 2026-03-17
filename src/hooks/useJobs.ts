import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useJobs(filters?: { status?: string; priority?: string; search?: string }) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*, customers(first_name, last_name, company_name), properties(property_name)')
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.priority) query = query.eq('priority', filters.priority as any);
      if (filters?.search) query = query.or(`job_title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('jobs').select('*, customers(*), properties(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useJobVisits(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job_visits', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase.from('visits').select('*').eq('job_id', jobId).order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: any) => {
      const { data, error } = await supabase.from('jobs').insert(job).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', data.id] });
    },
  });
}
