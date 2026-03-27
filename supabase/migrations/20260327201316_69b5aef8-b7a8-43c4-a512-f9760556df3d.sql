-- Fix job_line_items INSERT: restrict to staff
DROP POLICY IF EXISTS "Authenticated users can insert job_line_items" ON public.job_line_items;
CREATE POLICY "Staff insert job_line_items"
  ON public.job_line_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Fix activities INSERT: restrict to staff (customers shouldn't create admin activity logs)
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Staff insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
