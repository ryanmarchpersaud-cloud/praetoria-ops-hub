
CREATE POLICY renewals_tenant_update ON public.pm_lease_renewals
  FOR UPDATE TO authenticated
  USING (tenant_visible = true AND tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_visible = true AND tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid()));

CREATE POLICY renewal_activity_tenant_insert ON public.pm_lease_renewal_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    renewal_id IN (
      SELECT r.id FROM public.pm_lease_renewals r
      WHERE r.tenant_visible = true
        AND r.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY renewal_activity_tenant_select ON public.pm_lease_renewal_activity
  FOR SELECT TO authenticated
  USING (
    renewal_id IN (
      SELECT r.id FROM public.pm_lease_renewals r
      WHERE r.tenant_visible = true
        AND r.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
    )
  );
