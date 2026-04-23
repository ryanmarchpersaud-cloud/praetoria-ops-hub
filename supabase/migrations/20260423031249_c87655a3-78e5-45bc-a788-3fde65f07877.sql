-- 1. Broaden can_submit_field_lead to include team_type Worker/Subcontractor as a fallback
CREATE OR REPLACE FUNCTION public.can_submit_field_lead(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    public.is_worker_role(_user_id)
    OR public.has_role(_user_id, 'subcontractor'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = _user_id
        AND COALESCE(tm.is_active, false) = true
        AND COALESCE(tm.status, '') IN ('Active', 'Invited')
        AND (
          COALESCE(tm.portal_worker, false) = true
          OR COALESCE(tm.portal_subcontractor, false) = true
          OR tm.team_type IN ('Worker', 'Subcontractor')
        )
    )
  );
$function$;

-- 2. Backfill portal flags for active team members so they match team_type
UPDATE public.team_members
SET portal_worker = true
WHERE COALESCE(is_active, false) = true
  AND COALESCE(status, '') IN ('Active', 'Invited')
  AND team_type = 'Worker'
  AND COALESCE(portal_worker, false) = false;

UPDATE public.team_members
SET portal_subcontractor = true
WHERE COALESCE(is_active, false) = true
  AND COALESCE(status, '') IN ('Active', 'Invited')
  AND team_type = 'Subcontractor'
  AND COALESCE(portal_subcontractor, false) = false;