-- Phase 1A: additive Communications Hub foundation (staging, read-only)

CREATE TABLE public.comms_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  polling_enabled BOOLEAN NOT NULL DEFAULT false,
  hub_enabled BOOLEAN NOT NULL DEFAULT true,
  poll_interval_seconds INTEGER NOT NULL DEFAULT 180,
  max_messages_per_run INTEGER NOT NULL DEFAULT 25,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comms_settings_singleton CHECK (id)
);

CREATE TABLE public.comms_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  email_address TEXT NOT NULL,
  imap_host TEXT NOT NULL DEFAULT 'imap.ionos.com',
  imap_port INTEGER NOT NULL DEFAULT 993,
  credential_secret_prefix TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'staging',
  division TEXT,
  assigned_rep_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comms_mailboxes_env_chk CHECK (environment IN ('staging','production'))
);

CREATE TABLE public.comms_sync_state (
  mailbox_id UUID PRIMARY KEY REFERENCES public.comms_mailboxes(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'INBOX',
  uid_validity BIGINT,
  last_seen_uid BIGINT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_error TEXT,
  is_running BOOLEAN NOT NULL DEFAULT false,
  lock_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.comms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES public.comms_mailboxes(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'INBOX',
  imap_uid BIGINT NOT NULL,
  uid_validity BIGINT,
  message_id_header TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  from_address TEXT,
  from_name TEXT,
  to_addresses TEXT,
  cc_addresses TEXT,
  subject TEXT,
  sent_at TIMESTAMPTZ,
  snippet TEXT,
  body_text TEXT,
  division TEXT,
  assigned_rep_user_id UUID,
  customer_id UUID,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comms_messages_direction_chk CHECK (direction IN ('inbound','outbound')),
  CONSTRAINT comms_messages_unique_uid UNIQUE (mailbox_id, folder, uid_validity, imap_uid)
);

CREATE INDEX idx_comms_messages_mailbox_sent ON public.comms_messages (mailbox_id, sent_at DESC);
CREATE INDEX idx_comms_messages_division ON public.comms_messages (division);
CREATE INDEX idx_comms_messages_rep ON public.comms_messages (assigned_rep_user_id);
CREATE INDEX idx_comms_messages_customer ON public.comms_messages (customer_id);

CREATE TABLE public.comms_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID REFERENCES public.comms_mailboxes(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  detail TEXT,
  metadata JSONB,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comms_audit_created ON public.comms_audit_log (created_at DESC);

GRANT SELECT ON public.comms_settings TO authenticated;
GRANT SELECT ON public.comms_mailboxes TO authenticated;
GRANT SELECT ON public.comms_sync_state TO authenticated;
GRANT SELECT ON public.comms_messages TO authenticated;
GRANT SELECT ON public.comms_audit_log TO authenticated;
GRANT ALL ON public.comms_settings TO service_role;
GRANT ALL ON public.comms_mailboxes TO service_role;
GRANT ALL ON public.comms_sync_state TO service_role;
GRANT ALL ON public.comms_messages TO service_role;
GRANT ALL ON public.comms_audit_log TO service_role;

ALTER TABLE public.comms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.comms_user_divisions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT m.division) FILTER (WHERE m.division IS NOT NULL), ARRAY[]::TEXT[])
  FROM public.comms_mailboxes m
  WHERE m.assigned_rep_user_id = _user_id
$$;

CREATE POLICY "comms_settings_admin_read" ON public.comms_settings
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "comms_mailboxes_scoped_read" ON public.comms_mailboxes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_owner(auth.uid())
    OR assigned_rep_user_id = auth.uid()
  );

CREATE POLICY "comms_sync_state_admin_read" ON public.comms_sync_state
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "comms_messages_scoped_read" ON public.comms_messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_owner(auth.uid())
    OR assigned_rep_user_id = auth.uid()
    OR (division IS NOT NULL AND division = ANY (public.comms_user_divisions(auth.uid())))
  );

CREATE POLICY "comms_audit_admin_read" ON public.comms_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

INSERT INTO public.comms_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;