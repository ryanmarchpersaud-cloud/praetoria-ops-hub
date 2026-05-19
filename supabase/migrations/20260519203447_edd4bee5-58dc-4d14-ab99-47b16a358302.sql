REVOKE EXECUTE ON FUNCTION public.complete_assigned_visit(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_assigned_visit(uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_assigned_visit(uuid, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_sub_assigned_to_visit(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_sub_assigned_to_visit(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_sub_assigned_to_visit(uuid, uuid) TO authenticated;