CREATE OR REPLACE FUNCTION public.comms_my_divisions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT m.division
      FROM public.comms_mailboxes m
      WHERE m.division IS NOT NULL
        AND m.assigned_rep_user_id = auth.uid()
    ),
    ARRAY[]::text[]
  )
$$;

REVOKE ALL ON FUNCTION public.comms_my_divisions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comms_my_divisions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.comms_my_divisions() TO service_role;

DROP POLICY IF EXISTS comms_messages_scoped_read ON public.comms_messages;

CREATE POLICY comms_messages_scoped_read
ON public.comms_messages
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_owner(auth.uid())
  OR assigned_rep_user_id = auth.uid()
  OR (division IS NOT NULL AND division = ANY (public.comms_my_divisions()))
);

DROP FUNCTION IF EXISTS public.comms_user_divisions(uuid);