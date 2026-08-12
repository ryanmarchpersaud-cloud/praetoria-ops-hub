DROP POLICY IF EXISTS "Authenticated can view own or created agreements" ON public.agreements;

CREATE POLICY "Staff view all; users view related agreements"
ON public.agreements
FOR SELECT
TO authenticated
USING (
  public.is_ops_staff(auth.uid())
  OR created_by = auth.uid()
  OR sent_by = auth.uid()
  OR recipient_user_id = auth.uid()
);