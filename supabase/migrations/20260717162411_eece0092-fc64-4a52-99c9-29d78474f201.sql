CREATE POLICY "Ops staff can view subcontractors"
  ON public.subcontractors FOR SELECT
  USING (public.is_ops_staff(auth.uid()));