import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'staff' | 'customer';

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user_roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map((r: any) => r.role as AppRole);
    },
    enabled: !!user,
  });

  const isCustomer = roles.includes('customer');
  const isStaff = roles.includes('staff') || roles.includes('admin');
  const isAdmin = roles.includes('admin');

  return { roles, isCustomer, isStaff, isAdmin, isLoading };
}

export function useCustomerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer_profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
