REVOKE EXECUTE ON FUNCTION public.comms_user_divisions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comms_user_divisions(uuid) TO authenticated, service_role;