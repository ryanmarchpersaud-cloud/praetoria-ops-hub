CREATE OR REPLACE FUNCTION public.is_worker_assigned_to_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = _job_id
      AND j.assigned_to = _user_id

    UNION ALL

    SELECT 1
    FROM public.visits v
    WHERE v.job_id = _job_id
      AND v.assigned_worker_id = _user_id

    UNION ALL

    SELECT 1
    FROM public.visit_crew_members vcm
    JOIN public.visits v ON v.id = vcm.visit_id
    WHERE v.job_id = _job_id
      AND vcm.worker_user_id = _user_id
  )
$function$;