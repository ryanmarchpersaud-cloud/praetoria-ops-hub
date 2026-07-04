
-- Remove permissive INSERT policy for regular authenticated users.
-- Triggers run as SECURITY DEFINER (owner=postgres) and bypass RLS,
-- so notification creation continues to work end-to-end.
DROP POLICY IF EXISTS "Authenticated can insert pm notifications" ON public.pm_notifications;

-- Revoke direct EXECUTE on the helper from ordinary users.
-- SECURITY DEFINER trigger functions call this helper as their
-- owner role, which retains EXECUTE, so triggers keep working.
REVOKE EXECUTE ON FUNCTION public.create_pm_notification(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, jsonb
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_pm_notification(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, jsonb
) FROM PUBLIC;

-- Also revoke direct INSERT table privilege from authenticated to prevent
-- bypassing the (now missing) policy via any future policy loophole.
REVOKE INSERT ON public.pm_notifications FROM authenticated;
