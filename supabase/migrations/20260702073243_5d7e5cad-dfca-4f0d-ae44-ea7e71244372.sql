
-- Ops staff manage all files in owner-documents bucket
CREATE POLICY "ops staff manage owner-documents storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'owner-documents' AND public.is_ops_staff(auth.uid()))
  WITH CHECK (bucket_id = 'owner-documents' AND public.is_ops_staff(auth.uid()));

-- Property owners can read files that belong to an owner-visible pm_owner_documents row they have access to
CREATE POLICY "property owners read owner-documents storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'owner-documents'
    AND EXISTS (
      SELECT 1 FROM public.pm_owner_documents d
      WHERE d.file_path = storage.objects.name
        AND d.is_owner_visible = true
        AND (
          d.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR d.property_id IN (
            SELECT property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners po ON po.id = op.owner_id
            WHERE po.user_id = auth.uid()
          )
        )
    )
  );
