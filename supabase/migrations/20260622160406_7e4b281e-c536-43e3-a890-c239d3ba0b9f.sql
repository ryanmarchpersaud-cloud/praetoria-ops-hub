DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Subcontractors can read own pay stub PDFs'
  ) THEN
    CREATE POLICY "Subcontractors can read own pay stub PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'subcontractor-pay-stubs'
      AND (storage.foldername(name))[1] = 'subcontractors'
      AND (storage.foldername(name))[2] = public.get_subcontractor_id_for_user(auth.uid())::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Ops staff can read subcontractor pay stub PDFs'
  ) THEN
    CREATE POLICY "Ops staff can read subcontractor pay stub PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'subcontractor-pay-stubs'
      AND public.is_ops_staff(auth.uid())
    );
  END IF;
END $$;