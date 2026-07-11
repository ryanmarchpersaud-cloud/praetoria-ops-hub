
-- Remove broad self-read policy on role_permissions; replace with SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can view their own role permissions" ON public.role_permissions;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.permission_key::text
  FROM public.role_permissions rp
  JOIN public.user_roles ur
    ON ur.role = rp.role
  WHERE ur.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
