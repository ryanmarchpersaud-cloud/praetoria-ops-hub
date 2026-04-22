DROP POLICY IF EXISTS "Authenticated can create agreements" ON public.agreements;
CREATE POLICY "Staff create agreements"
  ON public.agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
