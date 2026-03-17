import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useActivities(filters?: { record_type?: string; limit?: number }) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => {
      let query = supabase.from('activities').select('*').order('created_at', { ascending: false });
      if (filters?.record_type) query = query.eq('record_type', filters.record_type);
      if (filters?.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
