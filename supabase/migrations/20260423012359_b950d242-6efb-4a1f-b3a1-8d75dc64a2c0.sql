CREATE POLICY "Workers create customers from field"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  is_worker_role(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Subcontractors create customers from field"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'subcontractor'::app_role)
  AND created_by = auth.uid()
);