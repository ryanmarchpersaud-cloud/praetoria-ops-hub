
-- ============================================================
-- PHASE 9 — Tenant Communication Center (tables, policies, RPCs)
-- ============================================================

-- ============ pm_tenant_message_threads ============
CREATE TABLE IF NOT EXISTS public.pm_tenant_message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  related_maintenance_request_id uuid REFERENCES public.pm_maintenance_requests(id) ON DELETE SET NULL,
  related_work_order_id uuid REFERENCES public.pm_work_orders(id) ON DELETE SET NULL,
  related_notice_id uuid REFERENCES public.pm_tenant_notices(id) ON DELETE SET NULL,
  related_document_id uuid REFERENCES public.pm_tenant_documents(id) ON DELETE SET NULL,
  related_lease_renewal_id uuid REFERENCES public.pm_lease_renewals(id) ON DELETE SET NULL,
  related_move_in_id uuid REFERENCES public.pm_move_in_checklists(id) ON DELETE SET NULL,
  related_move_out_id uuid REFERENCES public.pm_move_out_checklists(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_tenant_visible_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_tenant_threads_status_check CHECK (status IN ('open','waiting_on_tenant','waiting_on_praetoria','resolved','closed')),
  CONSTRAINT pm_tenant_threads_category_check CHECK (category IN ('general','lease','maintenance','notice','document','renewal','move_in','move_out','payment_question','access','safety','other')),
  CONSTRAINT pm_tenant_threads_priority_check CHECK (priority IN ('low','normal','high','urgent'))
);

CREATE INDEX IF NOT EXISTS idx_pm_tenant_threads_tenant ON public.pm_tenant_message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_tenant_threads_property ON public.pm_tenant_message_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_tenant_threads_status ON public.pm_tenant_message_threads(status);
CREATE INDEX IF NOT EXISTS idx_pm_tenant_threads_last ON public.pm_tenant_message_threads(last_message_at DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_message_threads TO authenticated;
GRANT ALL ON public.pm_tenant_message_threads TO service_role;
ALTER TABLE public.pm_tenant_message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_tenant_threads_staff_all"
  ON public.pm_tenant_message_threads FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

CREATE POLICY "pm_tenant_threads_tenant_read"
  ON public.pm_tenant_message_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_tenants t
      WHERE t.id = pm_tenant_message_threads.tenant_id
        AND t.user_id = auth.uid()
    )
  );

-- ============ pm_tenant_messages ============
CREATE TABLE IF NOT EXISTS public.pm_tenant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.pm_tenant_message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type text NOT NULL,
  body text NOT NULL,
  is_tenant_visible boolean NOT NULL DEFAULT true,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_tenant_messages_sender_type_check CHECK (sender_type IN ('admin','property_manager','leasing_agent','tenant','system'))
);

CREATE INDEX IF NOT EXISTS idx_pm_tenant_messages_thread ON public.pm_tenant_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_messages TO authenticated;
GRANT ALL ON public.pm_tenant_messages TO service_role;
ALTER TABLE public.pm_tenant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_tenant_messages_staff_all"
  ON public.pm_tenant_messages FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

CREATE POLICY "pm_tenant_messages_tenant_read"
  ON public.pm_tenant_messages FOR SELECT
  TO authenticated
  USING (
    is_tenant_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_tenant_message_threads th
      JOIN public.pm_tenants t ON t.id = th.tenant_id
      WHERE th.id = pm_tenant_messages.thread_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "pm_tenant_messages_tenant_insert"
  ON public.pm_tenant_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'tenant'
    AND is_tenant_visible = true
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.pm_tenant_message_threads th
      JOIN public.pm_tenants t ON t.id = th.tenant_id
      WHERE th.id = thread_id
        AND t.user_id = auth.uid()
        AND th.status <> 'closed'
    )
  );

-- ============ pm_tenant_message_attachments ============
CREATE TABLE IF NOT EXISTS public.pm_tenant_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.pm_tenant_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_tenant_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_tenant_msg_attach_message ON public.pm_tenant_message_attachments(message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_message_attachments TO authenticated;
GRANT ALL ON public.pm_tenant_message_attachments TO service_role;
ALTER TABLE public.pm_tenant_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_tenant_msg_attach_staff_all"
  ON public.pm_tenant_message_attachments FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

CREATE POLICY "pm_tenant_msg_attach_tenant_read"
  ON public.pm_tenant_message_attachments FOR SELECT
  TO authenticated
  USING (
    is_tenant_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_tenant_messages m
      JOIN public.pm_tenant_message_threads th ON th.id = m.thread_id
      JOIN public.pm_tenants t ON t.id = th.tenant_id
      WHERE m.id = pm_tenant_message_attachments.message_id
        AND m.is_tenant_visible = true
        AND t.user_id = auth.uid()
    )
  );

-- ============ Triggers ============
CREATE OR REPLACE FUNCTION public.pm_tenant_messages_touch_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pm_tenant_message_threads
    SET last_message_at = NEW.created_at,
        last_tenant_visible_message_at = CASE WHEN NEW.is_tenant_visible THEN NEW.created_at ELSE last_tenant_visible_message_at END,
        updated_at = now(),
        status = CASE
          WHEN status = 'closed' THEN status
          WHEN NEW.sender_type = 'tenant' THEN 'waiting_on_praetoria'
          WHEN NEW.sender_type IN ('admin','property_manager','leasing_agent') AND NEW.is_tenant_visible THEN 'waiting_on_tenant'
          ELSE status
        END
    WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_tenant_messages_touch ON public.pm_tenant_messages;
CREATE TRIGGER trg_pm_tenant_messages_touch
AFTER INSERT ON public.pm_tenant_messages
FOR EACH ROW EXECUTE FUNCTION public.pm_tenant_messages_touch_thread();

CREATE OR REPLACE FUNCTION public.pm_tenant_threads_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_pm_tenant_threads_updated_at ON public.pm_tenant_message_threads;
CREATE TRIGGER trg_pm_tenant_threads_updated_at
BEFORE UPDATE ON public.pm_tenant_message_threads
FOR EACH ROW EXECUTE FUNCTION public.pm_tenant_threads_updated_at();

-- ============ Tenant-initiated thread RPC ============
CREATE OR REPLACE FUNCTION public.tenant_open_message_thread(
  _subject text,
  _body text,
  _category text DEFAULT 'general',
  _related_maintenance_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_lease_id uuid;
  v_unit_id uuid;
  v_property_id uuid;
  v_thread_id uuid;
BEGIN
  IF _subject IS NULL OR length(trim(_subject)) = 0 THEN
    RAISE EXCEPTION 'subject required';
  END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'message body required';
  END IF;
  IF _category NOT IN ('general','lease','maintenance','notice','document','renewal','move_in','move_out','payment_question','access','safety','other') THEN
    _category := 'general';
  END IF;

  SELECT t.id INTO v_tenant_id
  FROM public.pm_tenants t
  WHERE t.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'not a registered tenant';
  END IF;

  SELECT l.id, l.unit_id, u.property_id
    INTO v_lease_id, v_unit_id, v_property_id
  FROM public.pm_leases l
  LEFT JOIN public.pm_units u ON u.id = l.unit_id
  WHERE l.tenant_id = v_tenant_id
  ORDER BY (l.status = 'active') DESC, l.created_at DESC
  LIMIT 1;

  IF _related_maintenance_request_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pm_maintenance_requests r
      WHERE r.id = _related_maintenance_request_id
        AND r.tenant_id = v_tenant_id
    ) THEN
      _related_maintenance_request_id := NULL;
    END IF;
  END IF;

  INSERT INTO public.pm_tenant_message_threads
    (subject, category, tenant_id, lease_id, unit_id, property_id, created_by, status, priority, related_maintenance_request_id)
  VALUES (_subject, _category, v_tenant_id, v_lease_id, v_unit_id, v_property_id, auth.uid(), 'waiting_on_praetoria', 'normal', _related_maintenance_request_id)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.pm_tenant_messages (thread_id, sender_id, sender_type, body, is_tenant_visible)
  VALUES (v_thread_id, auth.uid(), 'tenant', _body, true);

  RETURN v_thread_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_open_message_thread(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_open_message_thread(text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_mark_thread_read(_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_tenant_message_threads th
    JOIN public.pm_tenants t ON t.id = th.tenant_id
    WHERE th.id = _thread_id AND t.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.pm_tenant_messages
     SET read_at = COALESCE(read_at, now())
   WHERE thread_id = _thread_id
     AND is_tenant_visible = true
     AND sender_type IN ('admin','property_manager','leasing_agent','system')
     AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.tenant_mark_thread_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_mark_thread_read(uuid) TO authenticated;
