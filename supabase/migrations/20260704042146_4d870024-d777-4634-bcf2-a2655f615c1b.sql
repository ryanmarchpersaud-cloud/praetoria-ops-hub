
-- ============================================================
-- Phase 16 hardening: force reminders through pm_create_reminder
-- ============================================================

-- 1) Remove the broad INSERT policy. Keep ops-only direct insert.
DROP POLICY IF EXISTS "Users insert reminders for themselves"
  ON public.pm_calendar_reminders;

CREATE POLICY "Only ops can directly insert reminders"
  ON public.pm_calendar_reminders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- 2) Harden pm_create_reminder:
--    - validate caller can see the event on their PM calendar
--    - sanitize action_url to safe in-app routes only
CREATE OR REPLACE FUNCTION public.pm_create_reminder(
  p_recipient_user_id uuid,
  p_recipient_portal text,
  p_event_source text,
  p_event_type text,
  p_event_ref text,
  p_related_id uuid,
  p_property_id uuid,
  p_unit_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_event_start_at timestamptz,
  p_lead_time_minutes integer,
  p_title text,
  p_message text,
  p_action_url text
) RETURNS TABLE(id uuid, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_recipient uuid := COALESCE(p_recipient_user_id, v_uid);
  v_existing uuid;
  v_new_id uuid;
  v_remind_at timestamptz;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_visible boolean;
  v_safe_url text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Non-ops users may only create reminders for themselves.
  IF v_recipient <> v_uid AND NOT public.is_ops_staff(v_uid) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Validate the event is actually visible to the caller on the PM calendar.
  -- pm_calendar_events already enforces per-role visibility (ops sees all,
  -- leasing agents only assigned, tenants/owners/workers/etc. see nothing).
  v_window_start := p_event_start_at - interval '1 day';
  v_window_end   := p_event_start_at + interval '1 day';

  SELECT EXISTS (
    SELECT 1
    FROM public.pm_calendar_events(v_window_start, v_window_end) AS e
    WHERE e.event_id = p_event_ref
  ) INTO v_visible;

  IF NOT v_visible THEN
    RAISE EXCEPTION 'event not accessible';
  END IF;

  -- Sanitize action_url: only allow in-app PM routes; drop anything else.
  v_safe_url := NULLIF(TRIM(COALESCE(p_action_url, '')), '');
  IF v_safe_url IS NOT NULL
     AND v_safe_url NOT LIKE '/property-management/%'
     AND v_safe_url NOT LIKE '/pm-staff/%' THEN
    v_safe_url := NULL;
  END IF;

  v_remind_at := p_event_start_at - make_interval(mins => COALESCE(p_lead_time_minutes, 0));

  -- Duplicate: same recipient + event_ref + lead_time still pending
  SELECT id INTO v_existing
  FROM public.pm_calendar_reminders
  WHERE recipient_user_id = v_recipient
    AND event_ref = p_event_ref
    AND lead_time_minutes = COALESCE(p_lead_time_minutes, 0)
    AND status = 'pending'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, true;
    RETURN;
  END IF;

  INSERT INTO public.pm_calendar_reminders (
    recipient_user_id, recipient_portal,
    event_source, event_type, event_ref, related_id,
    property_id, unit_id, tenant_id, owner_id,
    event_start_at, lead_time_minutes, remind_at,
    title, message, action_url, created_by
  ) VALUES (
    v_recipient, COALESCE(p_recipient_portal,'admin'),
    p_event_source, p_event_type, p_event_ref, p_related_id,
    p_property_id, p_unit_id, p_tenant_id, p_owner_id,
    p_event_start_at, COALESCE(p_lead_time_minutes,0), v_remind_at,
    p_title, p_message, v_safe_url, v_uid
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_create_reminder(
  uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid,
  timestamptz, integer, text, text, text
) TO authenticated;
