
CREATE POLICY "pm_docs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-management-documents' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "pm_docs_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-management-documents' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "pm_docs_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-management-documents' AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (bucket_id = 'property-management-documents' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "pm_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-management-documents' AND public.is_admin_or_owner(auth.uid()));
