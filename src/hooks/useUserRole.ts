import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'manager' | 'dispatcher' | 'supervisor' | 'lead_worker' | 'staff' | 'customer' | 'subcontractor';

export type PermissionKey =
  | 'can_create_jobs'
  | 'can_add_line_items'
  | 'can_select_catalog_items'
  | 'can_edit_prices'
  | 'can_submit_for_approval'
  | 'can_publish_to_customer'
  | 'can_manage_team'
  | 'can_manage_roles'
  | 'can_manage_catalog'
  | 'can_view_audit_log'
  | 'can_manage_equipment'
  | 'can_manage_training'
  | 'can_approve_certificates';

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
  const isStaff = !isCustomer && !roles.includes('subcontractor') && roles.length > 0;
  const isAdmin = roles.includes('admin');
  const isManager = roles.includes('manager');
  const isSubcontractor = roles.includes('subcontractor');
  const canManageWorkers = isAdmin || isManager;

  return { roles, isCustomer, isStaff, isAdmin, isManager, isSubcontractor, canManageWorkers, isLoading };
}

/** Fetch resolved permission keys for the current user */
export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user_permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      const userRoles = data.map((r: any) => r.role);
      if (userRoles.length === 0) return [];

      const { data: perms, error: permErr } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role', userRoles);
      if (permErr) throw permErr;
      // Deduplicate
      return [...new Set(perms.map((p: any) => p.permission_key as PermissionKey))];
    },
    enabled: !!user,
  });

  const hasPermission = (key: PermissionKey) => permissions.includes(key);

  return { permissions, hasPermission, isLoading };
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
