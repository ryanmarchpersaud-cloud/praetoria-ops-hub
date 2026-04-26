-- Replace admin-only policy with one that includes owner and hr_admin
DROP POLICY IF EXISTS "Admins manage worker profiles" ON public.worker_profiles;

CREATE POLICY "Owners admins and HR manage worker profiles"
ON public.worker_profiles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr_admin'::public.app_role)
);