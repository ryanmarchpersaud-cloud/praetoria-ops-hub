
DROP POLICY IF EXISTS "PM maint admins full access" ON storage.objects;
CREATE POLICY "PM maint admins full access" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'pm-maintenance-attachments' AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (bucket_id = 'pm-maintenance-attachments' AND public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "PM maint tenants read own" ON storage.objects;
CREATE POLICY "PM maint tenants read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-maintenance-attachments'
    AND (storage.foldername(name))[1] = public.get_pm_tenant_id_for_user(auth.uid())::text
  );

DROP POLICY IF EXISTS "PM maint tenants upload own" ON storage.objects;
CREATE POLICY "PM maint tenants upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pm-maintenance-attachments'
    AND (storage.foldername(name))[1] = public.get_pm_tenant_id_for_user(auth.uid())::text
  );

DROP POLICY IF EXISTS "PM docs tenants read own visible lease" ON storage.objects;
CREATE POLICY "PM docs tenants read own visible lease" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-management-documents'
    AND EXISTS (
      SELECT 1 FROM public.pm_leases l
      JOIN public.pm_tenants t ON t.id = l.tenant_id
      WHERE t.user_id = auth.uid()
        AND l.tenant_visible = true
        AND l.lease_document_path = name
    )
  );
