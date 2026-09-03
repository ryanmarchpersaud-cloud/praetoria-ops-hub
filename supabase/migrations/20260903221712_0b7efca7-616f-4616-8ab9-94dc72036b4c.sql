-- Phase 1B.1: capture threading headers on inbound staging messages and link replies to outbound sends
ALTER TABLE public.comms_messages
  ADD COLUMN IF NOT EXISTS in_reply_to_header text,
  ADD COLUMN IF NOT EXISTS references_header text,
  ADD COLUMN IF NOT EXISTS reply_to_outbound_id uuid REFERENCES public.comms_outbound_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comms_messages_reply_to_outbound
  ON public.comms_messages(reply_to_outbound_id);
