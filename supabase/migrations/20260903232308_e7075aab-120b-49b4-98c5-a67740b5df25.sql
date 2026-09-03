-- Phase 1D.1 — Sent-copy status integrity columns
ALTER TABLE public.comms_outbound_messages
  ADD COLUMN IF NOT EXISTS sent_copy_last_retry_outcome text,
  ADD COLUMN IF NOT EXISTS sent_copy_last_retry_at timestamptz;

COMMENT ON COLUMN public.comms_outbound_messages.sent_copy_last_retry_outcome IS
  'Audit-only outcome of the most recent Sent-copy attempt. Never downgrades sent_copy_status.';
COMMENT ON COLUMN public.comms_outbound_messages.rfc822_message IS
  'Canonical RFC822 message retained solely for append-only Sent-copy retries. Service-role only; never exposed to the Data API.';

-- Phase 1D.2 — lock down the stored MIME body and the outbound table itself.
REVOKE ALL ON public.comms_outbound_messages FROM anon;
REVOKE ALL ON public.comms_outbound_messages FROM authenticated;
GRANT ALL ON public.comms_outbound_messages TO service_role;

-- Read-only, column-scoped access for authenticated users; rfc822_message and
-- smtp_result are deliberately excluded so the Data API can never return them.
GRANT SELECT (
  id, mailbox_id, requested_by, requested_by_email, from_address, to_address,
  subject, body_text, idempotency_key, in_reply_to_id, message_id_header,
  in_reply_to_header, references_header, status, error_text,
  created_at, approved_at, sent_at, failed_at, updated_at,
  sent_copy_status, sent_copy_attempts, sent_copy_last_error,
  sent_copy_appended_at, sent_copy_last_retry_outcome, sent_copy_last_retry_at
) ON public.comms_outbound_messages TO authenticated;