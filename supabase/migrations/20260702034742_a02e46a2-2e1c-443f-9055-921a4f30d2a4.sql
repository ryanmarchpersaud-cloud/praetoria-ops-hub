
ALTER TABLE public.pm_leases
  ADD COLUMN IF NOT EXISTS tenant_visible boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_pm_tenant_id_for_user(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.pm_tenants WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_view_property(_user_id uuid, _property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pm_leases l
    JOIN public.pm_tenants t ON t.id = l.tenant_id
    WHERE t.user_id = _user_id AND l.property_id = _property_id
  )
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_view_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pm_leases l
    JOIN public.pm_tenants t ON t.id = l.tenant_id
    WHERE t.user_id = _user_id AND l.unit_id = _unit_id
  )
$$;

DROP POLICY IF EXISTS "Tenants read own tenant record" ON public.pm_tenants;
CREATE POLICY "Tenants read own tenant record" ON public.pm_tenants
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Tenants read own leases" ON public.pm_leases;
CREATE POLICY "Tenants read own leases" ON public.pm_leases
  FOR SELECT TO authenticated USING (tenant_id = public.get_pm_tenant_id_for_user(auth.uid()));

DROP POLICY IF EXISTS "Tenants read linked units" ON public.pm_units;
CREATE POLICY "Tenants read linked units" ON public.pm_units
  FOR SELECT TO authenticated USING (public.tenant_can_view_unit(auth.uid(), id));

DROP POLICY IF EXISTS "Tenants read linked properties" ON public.pm_managed_properties;
CREATE POLICY "Tenants read linked properties" ON public.pm_managed_properties
  FOR SELECT TO authenticated USING (public.tenant_can_view_property(auth.uid(), id));

CREATE TABLE IF NOT EXISTS public.pm_maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  contact_notes text,
  permission_to_enter boolean NOT NULL DEFAULT false,
  preferred_contact_time text,
  internal_notes text,
  tenant_facing_update text,
  submitted_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_mr_priority_chk CHECK (priority IN ('low','normal','urgent')),
  CONSTRAINT pm_mr_status_chk   CHECK (status IN ('new','reviewed','in_progress','completed','cancelled')),
  CONSTRAINT pm_mr_category_chk CHECK (category IN ('plumbing','electrical','heating_cooling','appliance','lock_door','general','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_maintenance_requests TO authenticated;
GRANT ALL ON public.pm_maintenance_requests TO service_role;
ALTER TABLE public.pm_maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all maintenance requests" ON public.pm_maintenance_requests
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Tenants read own maintenance requests" ON public.pm_maintenance_requests
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_pm_tenant_id_for_user(auth.uid()));

CREATE POLICY "Tenants create own maintenance requests" ON public.pm_maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_pm_tenant_id_for_user(auth.uid())
    AND public.tenant_can_view_property(auth.uid(), property_id)
    AND (unit_id IS NULL OR public.tenant_can_view_unit(auth.uid(), unit_id))
  );

CREATE OR REPLACE FUNCTION public.pm_mr_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pm_mr_touch_updated_at ON public.pm_maintenance_requests;
CREATE TRIGGER pm_mr_touch_updated_at
BEFORE UPDATE ON public.pm_maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.pm_mr_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.pm_maintenance_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.pm_maintenance_requests(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  content_type text,
  uploaded_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.pm_maintenance_request_attachments TO authenticated;
GRANT ALL  ON public.pm_maintenance_request_attachments TO service_role;
ALTER TABLE public.pm_maintenance_request_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all maintenance attachments"
  ON public.pm_maintenance_request_attachments
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Tenants read own request attachments"
  ON public.pm_maintenance_request_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_maintenance_requests r
      WHERE r.id = request_id
        AND r.tenant_id = public.get_pm_tenant_id_for_user(auth.uid())
    )
  );

CREATE POLICY "Tenants add attachments to own requests"
  ON public.pm_maintenance_request_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pm_maintenance_requests r
      WHERE r.id = request_id
        AND r.tenant_id = public.get_pm_tenant_id_for_user(auth.uid())
    )
  );
