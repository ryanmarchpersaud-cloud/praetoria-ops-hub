CREATE POLICY "Workers can view own enrollments"
ON public.hr_benefit_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = employee_user_id);