
-- ============ pm_owner_message_threads ============
CREATE TABLE IF NOT EXISTS public.pm_owner_message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES public.pm_property_owners(id) ON DELETE CASCADE,
  related_approval_id uuid REFERENCES public.pm_owner_approvals(id) ON DELETE SET NULL,
  related_maintenance_request_id uuid REFERENCES public.pm_maintenance_requests(id) ON DELETE SET NULL,
  related_work_order_id uuid REFERENCES public.pm_work_orders(id) ON DELETE SET NULL,
  related_expense_id uuid REFERENCES public.pm_expenses(id) ON DELETE SET NULL,
  related_statement_id uuid REFERENCES public.pm_owner_statements(id) ON DELETE SET NULL,
  related_lease_renewal_id uuid REFERENCES public.pm_lease_renewals(id) ON DELETE SET NULL,
  related_move_out_id uuid REFERENCES public.pm_move_out_checklists(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_owner_visible_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_owner_threads_status_check CHECK (status IN ('open','waiting_on_owner','waiting_on_praetoria','resolved','closed')),
  CONSTRAINT pm_owner_threads_category_check CHECK (category IN ('general','approval','maintenance','work_order','expense','statement','lease_renewal','move_out','document','other')),
  CONSTRAINT pm_owner_threads_priority_check CHECK (priority IN ('low','normal','high','urgent'))
);

CREATE INDEX IF NOT EXISTS idx_pm_owner_threads_owner ON public.pm_owner_message_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_pm_owner_threads_property ON public.pm_owner_message_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_owner_threads_status ON public.pm_owner_message_threads(status);
CREATE INDEX IF NOT EXISTS idx_pm_owner_threads_last ON public.pm_owner_message_threads(last_message_at DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_message_threads TO authenticated;
GRANT ALL ON public.pm_owner_message_threads TO service_role;
ALTER TABLE public.pm_owner_message_threads ENABLE ROW LEVEL SECURITY;

-- Ops/PM staff: full access
CREATE POLICY "pm_owner_threads_staff_all"
  ON public.pm_owner_message_threads FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- Owner: read threads for their own properties
CREATE POLICY "pm_owner_threads_owner_read"
  ON public.pm_owner_message_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_property_owners o
      WHERE o.id = pm_owner_message_threads.owner_id
        AND o.user_id = auth.uid()
        AND o.is_active = true
    )
  );

-- Owner: update (allowed only status; validated at RPC layer). Practically limit via app; column-level not needed here.
-- No direct INSERT/DELETE for owner on threads (owners create threads through RPC below).

-- ============ pm_owner_messages ============
CREATE TABLE IF NOT EXISTS public.pm_owner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.pm_owner_message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type text NOT NULL,
  body text NOT NULL,
  is_owner_visible boolean NOT NULL DEFAULT true,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_owner_messages_sender_type_check CHECK (sender_type IN ('admin','property_manager','owner','system'))
);

CREATE INDEX IF NOT EXISTS idx_pm_owner_messages_thread ON public.pm_owner_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_messages TO authenticated;
GRANT ALL ON public.pm_owner_messages TO service_role;
ALTER TABLE public.pm_owner_messages ENABLE ROW LEVEL SECURITY;

-- Ops/PM staff: full access to all messages (visible + internal notes)
CREATE POLICY "pm_owner_messages_staff_all"
  ON public.pm_owner_messages FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- Owner: read only owner-visible messages in their own threads
CREATE POLICY "pm_owner_messages_owner_read"
  ON public.pm_owner_messages FOR SELECT
  TO authenticated
  USING (
    is_owner_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_owner_message_threads t
      JOIN public.pm_property_owners o ON o.id = t.owner_id
      WHERE t.id = pm_owner_messages.thread_id
        AND o.user_id = auth.uid()
        AND o.is_active = true
    )
  );

-- Owner: reply (INSERT) — must set sender_type=owner, is_owner_visible=true, sender_id=self, thread must be theirs & not closed
CREATE POLICY "pm_owner_messages_owner_insert"
  ON public.pm_owner_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'owner'
    AND is_owner_visible = true
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.pm_owner_message_threads t
      JOIN public.pm_property_owners o ON o.id = t.owner_id
      WHERE t.id = thread_id
        AND o.user_id = auth.uid()
        AND o.is_active = true
        AND t.status <> 'closed'
    )
  );

-- ============ Attachments ============
CREATE TABLE IF NOT EXISTS public.pm_owner_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.pm_owner_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_owner_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_owner_msg_attach_message ON public.pm_owner_message_attachments(message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_message_attachments TO authenticated;
GRANT ALL ON public.pm_owner_message_attachments TO service_role;
ALTER TABLE public.pm_owner_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_owner_msg_attach_staff_all"
  ON public.pm_owner_message_attachments FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "pm_owner_msg_attach_owner_read"
  ON public.pm_owner_message_attachments FOR SELECT
  TO authenticated
  USING (
    is_owner_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_owner_messages m
      JOIN public.pm_owner_message_threads t ON t.id = m.thread_id
      JOIN public.pm_property_owners o ON o.id = t.owner_id
      WHERE m.id = pm_owner_message_attachments.message_id
        AND m.is_owner_visible = true
        AND o.user_id = auth.uid()
        AND o.is_active = true
    )
  );

-- ============ Triggers: keep last_message_at + updated_at fresh ============
CREATE OR REPLACE FUNCTION public.pm_owner_messages_touch_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pm_owner_message_threads
    SET last_message_at = NEW.created_at,
        last_owner_visible_message_at = CASE WHEN NEW.is_owner_visible THEN NEW.created_at ELSE last_owner_visible_message_at END,
        updated_at = now(),
        status = CASE
          WHEN status = 'closed' THEN status
          WHEN NEW.sender_type = 'owner' THEN 'waiting_on_praetoria'
          WHEN NEW.sender_type IN ('admin','property_manager') AND NEW.is_owner_visible THEN 'waiting_on_owner'
          ELSE status
        END
    WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_owner_messages_touch ON public.pm_owner_messages;
CREATE TRIGGER trg_pm_owner_messages_touch
AFTER INSERT ON public.pm_owner_messages
FOR EACH ROW EXECUTE FUNCTION public.pm_owner_messages_touch_thread();

CREATE OR REPLACE FUNCTION public.pm_owner_threads_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_pm_owner_threads_updated_at ON public.pm_owner_message_threads;
CREATE TRIGGER trg_pm_owner_threads_updated_at
BEFORE UPDATE ON public.pm_owner_message_threads
FOR EACH ROW EXECUTE FUNCTION public.pm_owner_threads_updated_at();

-- ============ Owner-initiated thread RPC ============
-- Owners cannot INSERT threads directly; they must go through this RPC which enforces ownership + safe defaults.
CREATE OR REPLACE FUNCTION public.owner_open_message_thread(
  _property_id uuid,
  _subject text,
  _body text,
  _category text DEFAULT 'general'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_thread_id uuid;
BEGIN
  IF _subject IS NULL OR length(trim(_subject)) = 0 THEN
    RAISE EXCEPTION 'subject required';
  END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'message body required';
  END IF;
  IF _category NOT IN ('general','approval','maintenance','work_order','expense','statement','lease_renewal','move_out','document','other') THEN
    _category := 'general';
  END IF;

  SELECT o.id INTO v_owner_id
  FROM public.pm_property_owners o
  JOIN public.pm_owner_properties op ON op.owner_id = o.id
  WHERE o.user_id = auth.uid()
    AND o.is_active = true
    AND op.property_id = _property_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    -- fallback: primary_owner_id relationship
    SELECT o.id INTO v_owner_id
    FROM public.pm_property_owners o
    JOIN public.pm_managed_properties p ON p.primary_owner_id = o.id
    WHERE o.user_id = auth.uid()
      AND o.is_active = true
      AND p.id = _property_id
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'not authorized for this property';
  END IF;

  INSERT INTO public.pm_owner_message_threads
    (subject, category, property_id, owner_id, created_by, status, priority)
  VALUES (_subject, _category, _property_id, v_owner_id, auth.uid(), 'waiting_on_praetoria', 'normal')
  RETURNING id INTO v_thread_id;

  INSERT INTO public.pm_owner_messages (thread_id, sender_id, sender_type, body, is_owner_visible)
  VALUES (v_thread_id, auth.uid(), 'owner', _body, true);

  RETURN v_thread_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_open_message_thread(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_open_message_thread(uuid, text, text, text) TO authenticated;

-- Mark owner-visible messages read (owner action)
CREATE OR REPLACE FUNCTION public.owner_mark_thread_read(_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_owner_message_threads t
    JOIN public.pm_property_owners o ON o.id = t.owner_id
    WHERE t.id = _thread_id AND o.user_id = auth.uid() AND o.is_active = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.pm_owner_messages
     SET read_at = COALESCE(read_at, now())
   WHERE thread_id = _thread_id
     AND is_owner_visible = true
     AND sender_type IN ('admin','property_manager','system')
     AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.owner_mark_thread_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_mark_thread_read(uuid) TO authenticated;
