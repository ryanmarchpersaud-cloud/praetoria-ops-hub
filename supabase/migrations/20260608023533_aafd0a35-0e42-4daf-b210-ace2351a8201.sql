DROP POLICY IF EXISTS "Staff can view refunds" ON public.finance_refunds;
DROP POLICY IF EXISTS "Staff can create refunds" ON public.finance_refunds;
DROP POLICY IF EXISTS "Staff can update refunds" ON public.finance_refunds;

CREATE POLICY "Ops staff can view refunds" ON public.finance_refunds
  FOR SELECT USING (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can create refunds" ON public.finance_refunds
  FOR INSERT WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can update refunds" ON public.finance_refunds
  FOR UPDATE USING (public.is_ops_staff(auth.uid()));