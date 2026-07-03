REVOKE ALL ON FUNCTION public.pm_get_staff_activity_today() FROM anon;
REVOKE ALL ON FUNCTION public.pm_get_staff_activity_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_get_staff_activity_today() TO authenticated;