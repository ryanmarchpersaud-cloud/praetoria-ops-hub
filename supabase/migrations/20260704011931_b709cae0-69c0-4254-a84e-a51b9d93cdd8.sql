
REVOKE ALL ON FUNCTION public.create_pm_notification(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pm_notifications_mark_all_read() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_pm_notification(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_notifications_mark_all_read() TO authenticated;
