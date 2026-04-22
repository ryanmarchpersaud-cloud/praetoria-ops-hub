CREATE POLICY "Subcontractors view customers for assigned work"
  ON public.customers FOR SELECT
  USING (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND (
      id IN (
        SELECT v.customer_id
        FROM public.visits v
        JOIN public.subcontractor_assignments sa ON sa.visit_id = v.id
        JOIN public.subcontractors s ON s.id = sa.subcontractor_id
        WHERE s.user_id = auth.uid() AND v.customer_id IS NOT NULL
      )
      OR id IN (
        SELECT j.customer_id
        FROM public.jobs j
        JOIN public.subcontractor_assignments sa ON sa.job_id = j.id
        JOIN public.subcontractors s ON s.id = sa.subcontractor_id
        WHERE s.user_id = auth.uid() AND j.customer_id IS NOT NULL
      )
      OR created_by = auth.uid()
    )
  );