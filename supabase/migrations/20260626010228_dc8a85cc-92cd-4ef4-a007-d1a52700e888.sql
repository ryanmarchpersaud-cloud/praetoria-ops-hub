
CREATE POLICY "Ops staff read proof-of-service reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proof-of-service-reports' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff upload proof-of-service reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proof-of-service-reports' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff update proof-of-service reports"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'proof-of-service-reports' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff delete proof-of-service reports"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'proof-of-service-reports' AND public.is_ops_staff(auth.uid()));
