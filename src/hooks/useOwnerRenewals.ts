import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerScope, scopeBlocksAll } from '@/hooks/useOwnerScope';

/**
 * Owner-visible lease renewals. RLS restricts to renewals where
 * owner_visible = true AND the owner is linked to the property.
 * Read-only view — no writes from the owner portal.
 */
export function useOwnerRenewals(propertyId?: string) {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: [
      'owner-portal', 'renewals', propertyId ?? 'all',
      scope.isPreview ? `preview:${scope.ownerId}` : user?.id,
      scope.propertyIds?.join(',') ?? null,
    ],
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = supabase
        .from('pm_lease_renewals' as any)
        .select(`
          id, status,
          current_lease_end_date, proposed_start_date, proposed_end_date,
          current_rent, proposed_rent, rent_frequency,
          tenant_response, tenant_responded_at, owner_visible_note,
          property_id, unit_id, tenant_id,
          property:pm_managed_properties(id, property_name),
          unit:pm_units(id, unit_label),
          tenant:pm_tenants(id, first_name, last_name)
        `)
        .eq('owner_visible', true)
        .order('current_lease_end_date', { ascending: true, nullsFirst: false });
      if (propertyId) q = q.eq('property_id', propertyId);
      else if (scope.isPreview && scope.propertyIds?.length) q = q.in('property_id', scope.propertyIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
    staleTime: 60_000,
  });
}
