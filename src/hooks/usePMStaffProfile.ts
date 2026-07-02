import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * PM Staff self-service: reads the signed-in user's own profile row.
 * Reuses existing `profiles` table (RLS already scopes each user to their own row).
 */
export function usePMStaffProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdatePMStaffProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { display_name?: string; avatar_url?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update(patch as any)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_staff_profile'] }),
  });
}
