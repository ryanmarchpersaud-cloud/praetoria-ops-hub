import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProperties(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('*, customers(first_name, last_name, company_name)')
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.search) query = query.or(`property_name.ilike.%${filters.search}%,address_line_1.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('properties').select('*, customers(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePropertyJobs(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property_jobs', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase.from('jobs').select('*').eq('property_id', propertyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function usePropertyVisits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property_visits', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase.from('visits').select('*, jobs(id, job_title, job_number)').eq('property_id', propertyId).order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (property: any) => {
      const { data, error } = await supabase.from('properties').insert(property).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['property', data.id] });
    },
  });
}
