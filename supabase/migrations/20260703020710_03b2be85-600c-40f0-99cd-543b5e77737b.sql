
-- Phase 6C: Lease Renewals Foundation

CREATE TABLE IF NOT EXISTS public.pm_lease_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.pm_leases(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_lease_end_date DATE,
  proposed_start_date DATE,
  proposed_end_date DATE,
  current_rent NUMERIC(12,2),
  proposed_rent NUMERIC(12,2),
  rent_frequency TEXT DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'not_started',
  admin_notes TEXT,
  tenant_visible_note TEXT,
  owner_visible_note TEXT,
  tenant_visible BOOLEAN NOT NULL DEFAULT false,
  owner_visible BOOLEAN NOT NULL DEFAULT false,
  tenant_response TEXT,
  tenant_contacted_at TIMESTAMPTZ,
  tenant_responded_at TIMESTAMPTZ,
  sent_to_tenant_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_lease_renewals_lease ON public.pm_lease_renewals(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_lease_renewals_tenant ON public.pm_lease_renewals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_lease_renewals_assigned ON public.pm_lease_renewals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pm_lease_renewals_status ON public.pm_lease_renewals(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_lease_renewals TO authenticated;
GRANT ALL ON public.pm_lease_renewals TO service_role;

ALTER TABLE public.pm_lease_renewals ENABLE ROW LEVEL SECURITY;

-- Ops / admin / property manager: full access
CREATE POLICY "renewals_ops_all" ON public.pm_lease_renewals
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

-- Leasing agent: only assigned renewals (read + update, no delete)
CREATE POLICY "renewals_leasing_agent_select" ON public.pm_lease_renewals
  FOR SELECT TO authenticated
  USING (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid());

CREATE POLICY "renewals_leasing_agent_update" ON public.pm_lease_renewals
  FOR UPDATE TO authenticated
  USING (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  WITH CHECK (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid());

-- Tenant: read own renewals only when marked tenant_visible
CREATE POLICY "renewals_tenant_select" ON public.pm_lease_renewals
  FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
  );

-- Property owner: read owner-visible renewals for owned properties
CREATE POLICY "renewals_owner_select" ON public.pm_lease_renewals
  FOR SELECT TO authenticated
  USING (
    owner_visible = true
    AND property_id IS NOT NULL
    AND public.is_property_owner_of(auth.uid(), property_id)
  );

-- Activity timeline
CREATE TABLE IF NOT EXISTS public.pm_lease_renewal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES public.pm_lease_renewals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_lease_renewal_activity_renewal ON public.pm_lease_renewal_activity(renewal_id);

GRANT SELECT, INSERT ON public.pm_lease_renewal_activity TO authenticated;
GRANT ALL ON public.pm_lease_renewal_activity TO service_role;

ALTER TABLE public.pm_lease_renewal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewal_activity_ops_all" ON public.pm_lease_renewal_activity
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

CREATE POLICY "renewal_activity_leasing_agent" ON public.pm_lease_renewal_activity
  FOR SELECT TO authenticated
  USING (
    public.is_leasing_agent(auth.uid())
    AND renewal_id IN (SELECT id FROM public.pm_lease_renewals WHERE assigned_to = auth.uid())
  );

CREATE POLICY "renewal_activity_leasing_agent_insert" ON public.pm_lease_renewal_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leasing_agent(auth.uid())
    AND renewal_id IN (SELECT id FROM public.pm_lease_renewals WHERE assigned_to = auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER pm_lease_renewals_updated_at
  BEFORE UPDATE ON public.pm_lease_renewals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
