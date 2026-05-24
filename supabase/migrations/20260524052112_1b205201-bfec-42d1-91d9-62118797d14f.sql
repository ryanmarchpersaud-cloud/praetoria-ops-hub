-- Helper: is the user an owner?
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'
  )
$$;

-- Replace overly permissive user_roles management policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Owners can manage any role row (including granting/revoking owner)
CREATE POLICY "Owners manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_owner(auth.uid()))
WITH CHECK (public.is_owner(auth.uid()));

-- Admins can manage role rows EXCEPT those that grant the owner role,
-- and CANNOT modify rows belonging to existing owners (prevents demotion).
CREATE POLICY "Admins manage non-owner roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'owner'::public.app_role
  AND NOT public.is_owner(user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'owner'::public.app_role
  AND NOT public.is_owner(user_id)
);