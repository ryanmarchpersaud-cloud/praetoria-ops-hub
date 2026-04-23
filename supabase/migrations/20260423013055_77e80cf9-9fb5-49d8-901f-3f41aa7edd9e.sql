DROP POLICY IF EXISTS "Workers create customers from field" ON public.customers;
DROP POLICY IF EXISTS "Subcontractors create customers from field" ON public.customers;

CREATE POLICY "Workers create leads from field"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  is_worker_role(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Subcontractors create leads from field"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'subcontractor'::app_role)
  AND created_by = auth.uid()
);