-- Fix recursive PM RLS policies introduced by owner portal scoping.
-- The previous tenant owner policy referenced pm_leases directly from a policy on pm_tenants,
-- while pm_leases also had a policy that referenced pm_tenants. That caused infinite recursion.

CREATE OR REPLACE FUNCTION public.pm_property_owner_can_view_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pm_leases l
    WHERE l.tenant_id = _tenant_id
      AND public.is_property_owner_of(_user_id, l.property_id)
  )
$$;

REVOKE ALL ON FUNCTION public.pm_property_owner_can_view_tenant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_property_owner_can_view_tenant(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "pm_tenants_owner_scoped_read" ON public.pm_tenants;
CREATE POLICY "pm_tenants_owner_scoped_read"
ON public.pm_tenants
FOR SELECT
TO authenticated
USING (public.pm_property_owner_can_view_tenant(auth.uid(), id));

-- This duplicate lease policy queried pm_tenants directly and is covered by the safer
-- existing policy: "Tenants read own leases" using get_pm_tenant_id_for_user(auth.uid()).
DROP POLICY IF EXISTS "pm_leases_tenant_self_read" ON public.pm_leases;