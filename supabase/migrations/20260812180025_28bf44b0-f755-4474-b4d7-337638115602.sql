-- 1) Restrict adding new personal-account owners to company Owners who are already personal owners
DROP POLICY IF EXISTS "Existing personal owners may add owners" ON public.personal_account_owners;

CREATE POLICY "Only company owners may add personal owners"
ON public.personal_account_owners
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_personal_account_owner(auth.uid())
  AND public.is_owner(auth.uid())
);

-- 2) Restrict removal to company Owners, or self-removal
DROP POLICY IF EXISTS "Personal owners manage owners" ON public.personal_account_owners;

CREATE POLICY "Company owners or self may remove personal owners"
ON public.personal_account_owners
FOR DELETE
TO authenticated
USING (
  (public.is_personal_account_owner(auth.uid()) AND public.is_owner(auth.uid()))
  OR user_id = auth.uid()
);
