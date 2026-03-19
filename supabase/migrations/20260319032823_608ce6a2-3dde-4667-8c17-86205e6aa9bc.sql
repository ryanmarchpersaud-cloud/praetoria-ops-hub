
-- Fix worker_equipment_items: change public role policies to authenticated
DROP POLICY IF EXISTS "Admins manage all equipment" ON public.worker_equipment_items;
DROP POLICY IF EXISTS "Workers request replacements" ON public.worker_equipment_items;
DROP POLICY IF EXISTS "Workers view own equipment" ON public.worker_equipment_items;

CREATE POLICY "Admins manage all equipment"
ON public.worker_equipment_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Workers view own equipment"
ON public.worker_equipment_items FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Workers request replacements"
ON public.worker_equipment_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix worker_training_records: change public role policies to authenticated
DROP POLICY IF EXISTS "Admins manage all training records" ON public.worker_training_records;
DROP POLICY IF EXISTS "Workers acknowledge training" ON public.worker_training_records;
DROP POLICY IF EXISTS "Workers view own training records" ON public.worker_training_records;

CREATE POLICY "Admins manage all training records"
ON public.worker_training_records FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Workers view own training records"
ON public.worker_training_records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Workers acknowledge training"
ON public.worker_training_records FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add manager SELECT on worker-documents storage so they can review uploaded certs
CREATE POLICY "Managers view worker docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'worker-documents' AND has_role(auth.uid(), 'manager'::app_role));
