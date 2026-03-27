-- Fix job_line_items: restrict to staff only
DROP POLICY IF EXISTS "Authenticated users can update job_line_items" ON public.job_line_items;
DROP POLICY IF EXISTS "Authenticated users can delete job_line_items" ON public.job_line_items;

CREATE POLICY "Staff update job_line_items"
  ON public.job_line_items FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff delete job_line_items"
  ON public.job_line_items FOR DELETE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
