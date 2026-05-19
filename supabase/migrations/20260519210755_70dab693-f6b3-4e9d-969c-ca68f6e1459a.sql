REVOKE EXECUTE ON FUNCTION public.is_worker_assigned_to_job(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_worker_assigned_to_job(uuid, uuid) TO authenticated;