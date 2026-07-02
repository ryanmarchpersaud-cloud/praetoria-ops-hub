-- Restore table-level API grants for Property Management tables.
-- Existing RLS policies remain the source of row-level access control.

DO $$
DECLARE
  tbl text;
  pm_tables text[] := ARRAY[
    'pm_managed_properties',
    'pm_units',
    'pm_property_owners',
    'pm_owner_properties',
    'pm_tenants',
    'pm_leases',
    'pm_maintenance_requests',
    'pm_maintenance_request_attachments',
    'pm_maintenance_activity',
    'pm_work_orders',
    'pm_work_order_attachments',
    'pm_tenant_ledger',
    'pm_tenant_notices',
    'pm_tenant_documents',
    'pm_tenant_insurance',
    'pm_tenant_emergency_contacts',
    'pm_tenant_inspections',
    'pm_tenant_occupants',
    'pm_tenant_vehicles',
    'pm_tenant_pets',
    'pm_tenant_referrals'
  ];
BEGIN
  FOREACH tbl IN ARRAY pm_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    END IF;
  END LOOP;
END $$;

-- Re-grant helper function execution used by PM RLS policies and tenant portal queries.
GRANT EXECUTE ON FUNCTION public.get_pm_tenant_id_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_can_view_property(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_can_view_unit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_property_owner_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_owner_property_ids(uuid) TO authenticated, service_role;