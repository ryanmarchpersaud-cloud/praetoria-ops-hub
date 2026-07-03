
CREATE POLICY "Ops staff read prospect docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pm-prospect-docs' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff upload prospect docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pm-prospect-docs' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff update prospect docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pm-prospect-docs' AND public.is_ops_staff(auth.uid()))
  WITH CHECK (bucket_id = 'pm-prospect-docs' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff delete prospect docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pm-prospect-docs' AND public.is_ops_staff(auth.uid()));
