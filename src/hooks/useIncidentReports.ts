import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useIncidentReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['incident_reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('date_time', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useSubcontractorIncidentReports(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['incident_reports_sub', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('date_time', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subcontractorId,
  });
}
