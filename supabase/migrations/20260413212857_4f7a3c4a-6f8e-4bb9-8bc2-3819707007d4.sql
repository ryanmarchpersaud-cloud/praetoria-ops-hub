
DROP POLICY IF EXISTS "Admins manage all subcontractor payments" ON public.subcontractor_payments;
CREATE POLICY "Admins and owners manage subcontractor payments" ON public.subcontractor_payments
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));
