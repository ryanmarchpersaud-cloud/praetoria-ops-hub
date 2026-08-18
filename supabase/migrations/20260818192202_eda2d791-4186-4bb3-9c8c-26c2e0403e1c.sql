DROP POLICY IF EXISTS "Staff view all; users view related agreements" ON public.agreements;
CREATE POLICY "Staff view all; users view related agreements"
  ON public.agreements FOR SELECT
  TO authenticated
  USING (
    is_ops_staff(auth.uid())
    OR created_by = auth.uid()
    OR sent_by = auth.uid()
    OR recipient_user_id = auth.uid()
    OR (customer_id IS NOT NULL AND customer_id = get_customer_id_for_user(auth.uid()))
  );