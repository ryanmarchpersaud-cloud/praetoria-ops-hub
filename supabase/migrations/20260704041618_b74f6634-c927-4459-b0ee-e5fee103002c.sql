
-- ============================================================
-- Phase 16 — Calendar Reminders + Add-to-Calendar foundation
-- Additive only. Uses existing pm_notifications inbox.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pm_calendar_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_portal text NOT NULL DEFAULT 'admin'
    CHECK (recipient_portal IN ('admin','pm_staff')),
  event_source text NOT NULL,
  event_type text NOT NULL,
  event_ref text NOT NULL,           -- opaque calendar event id (source-specific)
  related_id uuid,                   -- parsed uuid of underlying record when available
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  owner_id uuid,
  event_start_at timestamptz NOT NULL,
  lead_time_minutes integer NOT NULL DEFAULT 60
    CHECK (lead_time_minutes >= 0 AND lead_time_minutes <= 60*24*30),
  remind_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','triggered','cancelled','dismissed')),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  triggered_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_reminders_recipient
  ON public.pm_calendar_reminders(recipient_user_id, status, remind_at);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_due
  ON public.pm_calendar_reminders(status, remind_at);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_event
  ON public.pm_calendar_reminders(recipient_user_id, event_ref, lead_time_minutes, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_calendar_reminders TO authenticated;
GRANT ALL ON public.pm_calendar_reminders TO service_role;

ALTER TABLE public.pm_calendar_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own pm reminders"
  ON public.pm_calendar_reminders FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

CREATE POLICY "Users insert reminders for themselves"
  ON public.pm_calendar_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid())
  );

CREATE POLICY "Users update their own pm reminders"
  ON public.pm_calendar_reminders FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()))
  WITH CHECK (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

CREATE POLICY "Users delete their own pm reminders"
  ON public.pm_calendar_reminders FOR DELETE
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

CREATE TRIGGER trg_pm_calendar_reminders_updated_at
  BEFORE UPDATE ON public.pm_calendar_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPC: create reminder (duplicate-safe)
-- ============================================================
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Non-ops users may only create reminders for themselves.
  IF v_recipient <> v_uid AND NOT public.is_ops_staff(v_uid) THEN
    RAISE EXCEPTION 'not allowed';
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
    p_title, p_message, p_action_url, v_uid
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_create_reminder(
  uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid,
  timestamptz, integer, text, text, text
) TO authenticated;

-- ============================================================
-- RPC: cancel reminder
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_cancel_reminder(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT recipient_user_id INTO v_owner
  FROM public.pm_calendar_reminders WHERE id = p_id;
  IF v_owner IS NULL THEN RETURN false; END IF;
  IF v_owner <> v_uid AND NOT public.is_ops_staff(v_uid) THEN
    RETURN false;
  END IF;

  UPDATE public.pm_calendar_reminders
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_cancel_reminder(uuid) TO authenticated;

-- ============================================================
-- RPC: process due reminders for current user
-- Called client-side when PM users load the calendar or
-- notifications center. Creates a pm_notification for each
-- pending reminder whose remind_at has passed. Idempotent.
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_process_due_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;

  FOR r IN
    SELECT * FROM public.pm_calendar_reminders
    WHERE recipient_user_id = v_uid
      AND status = 'pending'
      AND remind_at <= now()
    ORDER BY remind_at ASC
    LIMIT 100
  LOOP
    PERFORM public.create_pm_notification(
      r.recipient_user_id,
      r.recipient_portal,
      'calendar_reminder',
      r.title,
      r.message,
      r.action_url,
      'normal',
      'pm_calendar_reminder',
      r.id,
      r.property_id,
      r.unit_id,
      r.tenant_id,
      r.owner_id,
      jsonb_build_object(
        'event_source', r.event_source,
        'event_type', r.event_type,
        'event_ref', r.event_ref,
        'lead_time_minutes', r.lead_time_minutes,
        'event_start_at', r.event_start_at
      )
    );

    UPDATE public.pm_calendar_reminders
       SET status = 'triggered', triggered_at = now()
     WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_process_due_reminders() TO authenticated;
