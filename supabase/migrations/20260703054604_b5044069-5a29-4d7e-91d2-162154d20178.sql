-- PM-scoped Live Workforce: returns user_ids of staff whose roles are PM roles.
-- SECURITY DEFINER so callers with limited RLS on user_roles can still resolve the PM staff list,
-- but the function itself gates access to admin / ops_manager / property_manager only.

CREATE OR REPLACE FUNCTION public.pm_get_workforce_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access control: only admin, ops_manager, property_manager may see PM staff workforce
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN (
    'property_manager'::public.app_role,
    'leasing_agent'::public.app_role,
    'pm_staff'::public.app_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pm_get_workforce_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pm_get_workforce_user_ids() TO authenticated;
