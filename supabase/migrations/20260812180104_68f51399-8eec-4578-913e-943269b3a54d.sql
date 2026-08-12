DROP POLICY IF EXISTS "Only company owners may add personal owners" ON public.personal_account_owners;

CREATE POLICY "Only admin owners may add personal owners"
ON public.personal_account_owners
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_personal_account_owner(auth.uid())
  AND public.is_admin_or_owner(auth.uid())
);

DROP POLICY IF EXISTS "Company owners or self may remove personal owners" ON public.personal_account_owners;

CREATE POLICY "Admin owners or self may remove personal owners"
ON public.personal_account_owners
FOR DELETE
TO authenticated
USING (
  (public.is_personal_account_owner(auth.uid()) AND public.is_admin_or_owner(auth.uid()))
  OR user_id = auth.uid()
);
