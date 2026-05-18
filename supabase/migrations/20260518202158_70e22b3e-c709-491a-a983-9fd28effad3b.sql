CREATE OR REPLACE FUNCTION public.is_worker_assigned_to_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.visits v
    LEFT JOIN public.jobs j ON j.id = v.job_id
    WHERE v.id = _visit_id
      AND (
        v.assigned_worker_id = _user_id
        OR j.assigned_to = _user_id
        OR EXISTS (
          SELECT 1 FROM public.visit_crew_members vcm
          WHERE vcm.visit_id = _visit_id
            AND vcm.worker_user_id = _user_id
        )
      )
  )
$function$;