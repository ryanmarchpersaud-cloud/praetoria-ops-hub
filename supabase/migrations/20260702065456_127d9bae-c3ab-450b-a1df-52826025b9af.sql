CREATE OR REPLACE FUNCTION public.is_property_owner_of(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pm_property_owners o
    WHERE o.user_id = _user_id
      AND o.is_active = true
      AND (
        EXISTS (
          SELECT 1 FROM public.pm_owner_properties op
          WHERE op.owner_id = o.id AND op.property_id = _property_id
        )
        OR EXISTS (
          SELECT 1 FROM public.pm_managed_properties p
          WHERE p.id = _property_id AND p.primary_owner_id = o.id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_owner_property_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pid FROM (
    SELECT op.property_id AS pid
    FROM public.pm_property_owners o
    JOIN public.pm_owner_properties op ON op.owner_id = o.id
    WHERE o.user_id = _user_id AND o.is_active = true
    UNION
    SELECT p.id AS pid
    FROM public.pm_property_owners o
    JOIN public.pm_managed_properties p ON p.primary_owner_id = o.id
    WHERE o.user_id = _user_id AND o.is_active = true
  ) s;
$$;

REVOKE EXECUTE ON FUNCTION public.is_property_owner_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_owner_property_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_property_owner_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_property_ids(uuid) TO authenticated;