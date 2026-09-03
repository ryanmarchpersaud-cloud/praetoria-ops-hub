ALTER TABLE public.comms_settings
  ADD COLUMN IF NOT EXISTS outbound_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS staging_recipient_allowlist TEXT[] NOT NULL DEFAULT ARRAY['admin@praetoriagroup.ca']::text[],
  ADD COLUMN IF NOT EXISTS max_sends_per_hour INTEGER NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.comms_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES public.comms_mailboxes(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requested_by_email TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  in_reply_to_id UUID REFERENCES public.comms_messages(id) ON DELETE SET NULL,
  message_id_header TEXT,
  in_reply_to_header TEXT,
  references_header TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  smtp_result TEXT,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comms_outbound_status_chk CHECK (status IN ('draft','sending','sent','failed')),
  CONSTRAINT comms_outbound_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_comms_outbound_created ON public.comms_outbound_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_outbound_reply ON public.comms_outbound_messages (in_reply_to_id);

GRANT SELECT ON public.comms_outbound_messages TO authenticated;
GRANT ALL ON public.comms_outbound_messages TO service_role;

ALTER TABLE public.comms_outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY comms_outbound_admin_read
ON public.comms_outbound_messages
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner(auth.uid()));

CREATE TRIGGER update_comms_outbound_updated_at
BEFORE UPDATE ON public.comms_outbound_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();