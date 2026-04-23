DROP POLICY IF EXISTS "Workers view customers for assigned visits" ON public.customers;
CREATE POLICY "Workers view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.is_worker_role(auth.uid()));

DROP POLICY IF EXISTS "Subcontractors view customers for assigned work" ON public.customers;
CREATE POLICY "Subcontractors view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'subcontractor'));

DROP POLICY IF EXISTS "Workers view own field leads" ON public.leads;
CREATE POLICY "Workers view own field leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.is_worker_role(auth.uid())
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Subcontractors view own field leads" ON public.leads;
CREATE POLICY "Subcontractors view own field leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'subcontractor')
  AND created_by = auth.uid()
);