-- =============================================================
-- Phase 4: Property Owner Portal Foundation — RLS + helpers
-- External property_owner role gets READ-ONLY access strictly
-- scoped to properties they are linked to via pm_owner_properties.
-- The internal "owner" role (Praetoria staff) is untouched.
-- =============================================================

-- Helper: is this user an EXTERNAL property owner of a given property?
CREATE OR REPLACE FUNCTION public.is_property_owner_of(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pm_property_owners o
    JOIN public.pm_owner_properties op ON op.owner_id = o.id
    WHERE o.user_id = _user_id
      AND o.is_active = true
      AND op.property_id = _property_id
  );
$$;

-- Helper: list of property_ids this external owner is linked to
CREATE OR REPLACE FUNCTION public.get_owner_property_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT op.property_id
  FROM public.pm_property_owners o
  JOIN public.pm_owner_properties op ON op.owner_id = o.id
  WHERE o.user_id = _user_id
    AND o.is_active = true;
$$;

REVOKE EXECUTE ON FUNCTION public.is_property_owner_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_owner_property_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_property_owner_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_property_ids(uuid) TO authenticated;

-- ---------------- pm_owner_properties: self-read for external owner ---------
DROP POLICY IF EXISTS pm_owner_properties_self_read ON public.pm_owner_properties;
CREATE POLICY pm_owner_properties_self_read
  ON public.pm_owner_properties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_property_owners o
      WHERE o.id = pm_owner_properties.owner_id
        AND o.user_id = auth.uid()
        AND o.is_active = true
    )
  );

-- ---------------- pm_managed_properties: property_owner scoped read ---------
DROP POLICY IF EXISTS pm_properties_owner_scoped_read ON public.pm_managed_properties;
CREATE POLICY pm_properties_owner_scoped_read
  ON public.pm_managed_properties
  FOR SELECT
  TO authenticated
  USING (public.is_property_owner_of(auth.uid(), id));

-- ---------------- pm_units: property_owner scoped read ----------------------
DROP POLICY IF EXISTS pm_units_owner_scoped_read ON public.pm_units;
CREATE POLICY pm_units_owner_scoped_read
  ON public.pm_units
  FOR SELECT
  TO authenticated
  USING (public.is_property_owner_of(auth.uid(), property_id));

-- ---------------- pm_leases: property_owner scoped read ---------------------
DROP POLICY IF EXISTS pm_leases_owner_scoped_read ON public.pm_leases;
CREATE POLICY pm_leases_owner_scoped_read
  ON public.pm_leases
  FOR SELECT
  TO authenticated
  USING (public.is_property_owner_of(auth.uid(), property_id));

-- ---------------- pm_tenants: property_owner scoped read (limited) ----------
-- Owners see tenants of their properties for context (name/contact for
-- maintenance follow-up). Row is scoped; column-level trimming happens in UI.
DROP POLICY IF EXISTS pm_tenants_owner_scoped_read ON public.pm_tenants;
CREATE POLICY pm_tenants_owner_scoped_read
  ON public.pm_tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_leases l
      WHERE l.tenant_id = pm_tenants.id
        AND public.is_property_owner_of(auth.uid(), l.property_id)
    )
  );

-- ---------------- pm_maintenance_requests: property_owner scoped read -------
DROP POLICY IF EXISTS pm_maint_owner_scoped_read ON public.pm_maintenance_requests;
CREATE POLICY pm_maint_owner_scoped_read
  ON public.pm_maintenance_requests
  FOR SELECT
  TO authenticated
  USING (public.is_property_owner_of(auth.uid(), property_id));

-- ---------------- pm_work_orders: property_owner scoped read ----------------
DROP POLICY IF EXISTS pm_work_orders_owner_scoped_read ON public.pm_work_orders;
CREATE POLICY pm_work_orders_owner_scoped_read
  ON public.pm_work_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_maintenance_requests r
      WHERE r.id = pm_work_orders.maintenance_request_id
        AND public.is_property_owner_of(auth.uid(), r.property_id)
    )
    OR public.is_property_owner_of(auth.uid(), property_id)
  );