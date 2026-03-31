-- Allow workers to view customers linked to their assigned visits
CREATE POLICY "Workers view customers for assigned visits"
ON public.customers FOR SELECT TO authenticated
USING (
  is_worker_role(auth.uid())
  AND id IN (
    SELECT v.customer_id FROM public.visits v
    WHERE v.assigned_worker_id = auth.uid()
    AND v.customer_id IS NOT NULL
  )
);

-- Allow workers to view properties linked to their assigned visits
CREATE POLICY "Workers view properties for assigned visits"
ON public.properties FOR SELECT TO authenticated
USING (
  is_worker_role(auth.uid())
  AND id IN (
    SELECT v.property_id FROM public.visits v
    WHERE v.assigned_worker_id = auth.uid()
    AND v.property_id IS NOT NULL
  )
);