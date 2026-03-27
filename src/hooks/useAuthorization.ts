import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { AppRole } from './useUserRole';

/**
 * Canonical authorization model — v1
 *
 * Roles (from user_roles):
 *   admin        → full admin dashboard access
 *   manager      → operational admin access (limited settings)
 *   staff        → worker portal only
 *   subcontractor→ subcontractor portal only
 *   customer     → customer portal only
 *
 * Portal flags (from team_members):
 *   portal_admin, portal_worker, portal_subcontractor
 *   These are SWITCHES within the allowed role class, NOT elevators.
 *   They cannot grant access above what the role permits.
 *
 * Access truth table:
 *   Inactive / Archived users are blocked from all protected areas.
 */

export interface AuthorizationState {
  /** Raw roles from user_roles table */
  roles: AppRole[];

  /** Derived booleans */
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isSubcontractor: boolean;
  isCustomer: boolean;

  /** Portal access flags (from team_members or role fallback) */
  canAccessAdminPortal: boolean;
  canAccessWorkerPortal: boolean;
  canAccessSubcontractorPortal: boolean;
  canAccessCustomerPortal: boolean;

  /** Whether the user account is active (non-blocked) */
  isActiveUser: boolean;

  /** Loading state */
  isLoading: boolean;
}

export function useAuthorization(): AuthorizationState {
  const { user } = useAuth();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
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
    staleTime: 5 * 60 * 1000,
  });

  // Fetch team_members record (if exists — customers won't have one)
  const { data: teamMember, isLoading: teamLoading } = useQuery({
    queryKey: ['team_member_auth', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('team_members')
        .select('is_active, status, portal_admin, portal_worker, portal_subcontractor')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isOwner = roles.includes('owner' as AppRole);
  const isAdmin = roles.includes('admin');
  const isManager = roles.includes('manager');
  const isAccountant = roles.includes('accountant' as AppRole);
  const isHrAdmin = roles.includes('hr_admin' as AppRole);
  const isOpsManager = roles.includes('ops_manager' as AppRole);
  const isCustomer = roles.includes('customer');
  const isSubcontractor = roles.includes('subcontractor');
  // staff = any non-customer, non-subcontractor role holder with at least one role
  const isStaff = !isCustomer && !isSubcontractor && roles.length > 0;

  // Active status: customers don't have team_members records so default true
  // For team members: must be is_active AND status in (Active, Invited)
  const isActiveUser = isCustomer
    ? true // customers gated by their own customer record
    : teamMember
      ? teamMember.is_active && ['Active', 'Invited'].includes(teamMember.status)
      : roles.length === 0 // no roles = no access anyway
        ? true
        : true; // no team_member record but has roles (legacy) = allow

  // Portal access: role sets the ceiling, portal flags act as switches within that ceiling
  const canAccessAdminPortal = isOwner || isAdmin || isManager || isAccountant || isHrAdmin || isOpsManager;
  // Worker portal: staff by role, OR admin/manager always, OR explicit flag
  const canAccessWorkerPortal = isStaff || isOwner || isAdmin || isManager || isOpsManager || (teamMember?.portal_worker ?? false);
  // Subcontractor portal: subcontractor by role, OR admin (for oversight)
  const canAccessSubcontractorPortal = isSubcontractor || isOwner || isAdmin;
  // Customer portal: customer by role, OR admin/manager for preview — plain staff CANNOT access
  const canAccessCustomerPortal = isCustomer || isOwner || isAdmin || isManager;

  return {
    roles,
    isAdmin,
    isManager,
    isStaff,
    isSubcontractor,
    isCustomer,
    canAccessAdminPortal,
    canAccessWorkerPortal,
    canAccessSubcontractorPortal,
    canAccessCustomerPortal,
    isActiveUser,
    isLoading: rolesLoading || teamLoading,
  };
}
