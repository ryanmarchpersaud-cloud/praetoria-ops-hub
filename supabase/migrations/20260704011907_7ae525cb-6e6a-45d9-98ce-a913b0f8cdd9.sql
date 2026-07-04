
-- ============================================================
-- Phase 14: In-App Notifications Center (PM Module)
-- Additive only. Dedicated table so we don't disturb the
-- existing notifications enum-based table used elsewhere.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_portal text NOT NULL CHECK (recipient_portal IN ('admin','pm_staff','tenant','owner')),
  recipient_role text,
  notification_type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  related_type text,
  related_id uuid,
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  owner_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_notifications_recipient
  ON public.pm_notifications(recipient_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_notifications_related
  ON public.pm_notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_pm_notifications_portal
  ON public.pm_notifications(recipient_portal, status);

GRANT SELECT, INSERT, UPDATE ON public.pm_notifications TO authenticated;
GRANT ALL ON public.pm_notifications TO service_role;

ALTER TABLE public.pm_notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "Users read their own pm notifications"
  ON public.pm_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

-- Users mark their own as read/archived
CREATE POLICY "Users update their own pm notifications"
  ON public.pm_notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()))
  WITH CHECK (recipient_user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

-- Any authenticated user can insert (helper function validates); ops full manage
CREATE POLICY "Authenticated can insert pm notifications"
  ON public.pm_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER trg_pm_notifications_updated_at
  BEFORE UPDATE ON public.pm_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Helper RPC: create_pm_notification with duplicate prevention
-- Prevents identical UNREAD notifications for same recipient +
-- type + related record. If found, bumps updated_at instead.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_pm_notification(
  p_recipient_user_id uuid,
  p_recipient_portal text,
  p_notification_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_related_type text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Duplicate check: same recipient + type + related record still unread
  SELECT id INTO v_existing
  FROM public.pm_notifications
  WHERE recipient_user_id = p_recipient_user_id
    AND notification_type = p_notification_type
    AND status = 'unread'
    AND COALESCE(related_type,'') = COALESCE(p_related_type,'')
    AND COALESCE(related_id::text,'') = COALESCE(p_related_id::text,'')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.pm_notifications
       SET updated_at = now(),
           title = p_title,
           message = p_message,
           action_url = COALESCE(p_action_url, action_url),
           metadata = p_metadata
     WHERE id = v_existing;
    RETURN v_existing;
  END IF;

  INSERT INTO public.pm_notifications (
    recipient_user_id, recipient_portal, notification_type,
    title, message, action_url, priority,
    related_type, related_id,
    property_id, unit_id, tenant_id, owner_id,
    metadata, created_by
  ) VALUES (
    p_recipient_user_id, p_recipient_portal, p_notification_type,
    p_title, p_message, p_action_url, COALESCE(p_priority,'normal'),
    p_related_type, p_related_id,
    p_property_id, p_unit_id, p_tenant_id, p_owner_id,
    COALESCE(p_metadata,'{}'::jsonb), auth.uid()
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pm_notification(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, jsonb
) TO authenticated;

-- Mark all as read helper
CREATE OR REPLACE FUNCTION public.pm_notifications_mark_all_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.pm_notifications
     SET status = 'read', read_at = now()
   WHERE recipient_user_id = auth.uid()
     AND status = 'unread';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_notifications_mark_all_read() TO authenticated;
