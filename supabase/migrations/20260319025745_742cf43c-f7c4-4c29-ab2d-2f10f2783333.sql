
-- Add manager access to worker_equipment_items
CREATE POLICY "Managers manage all equipment"
ON public.worker_equipment_items
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Add manager access to worker_training_records
CREATE POLICY "Managers manage all training records"
ON public.worker_training_records
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Add manager access to worker_certifications
CREATE POLICY "Managers manage worker certifications"
ON public.worker_certifications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Add permission keys for PPE and training management
INSERT INTO public.role_permissions (role, permission_key)
VALUES
  ('admin', 'can_manage_equipment'),
  ('manager', 'can_manage_equipment'),
  ('admin', 'can_manage_training'),
  ('manager', 'can_manage_training'),
  ('admin', 'can_approve_certificates'),
  ('manager', 'can_approve_certificates')
ON CONFLICT DO NOTHING;
