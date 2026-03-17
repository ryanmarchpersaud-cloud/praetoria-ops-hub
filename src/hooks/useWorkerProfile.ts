import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useWorkerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['worker_profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useWorkerCertifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['worker_certifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_certifications')
        .select('*')
        .eq('user_id', user.id)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useWorkerDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['worker_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
