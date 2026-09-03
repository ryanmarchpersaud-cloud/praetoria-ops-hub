-- Phase 1C: staging hardening + production mailbox preparation (no production credentials)

-- 1. Mailbox configuration structure
ALTER TABLE public.comms_mailboxes
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS inbound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outbound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_start_mode text NOT NULL DEFAULT 'future_only',
  ADD COLUMN IF NOT EXISTS baseline_uid bigint,
  ADD COLUMN IF NOT EXISTS baseline_established_at timestamptz,
  ADD COLUMN IF NOT EXISTS backfill_from_date timestamptz,
  ADD COLUMN IF NOT EXISTS backfill_to_date timestamptz,
  ADD COLUMN IF NOT EXISTS backfill_from_uid bigint,
  ADD COLUMN IF NOT EXISTS backfill_to_uid bigint,
  ADD COLUMN IF NOT EXISTS backfill_approved_by uuid,
  ADD COLUMN IF NOT EXISTS backfill_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS backfill_estimated_count integer,
  ADD COLUMN IF NOT EXISTS smtp_host text NOT NULL DEFAULT 'smtp.ionos.com',
  ADD COLUMN IF NOT EXISTS smtp_port integer NOT NULL DEFAULT 587,
  ADD COLUMN IF NOT EXISTS sent_folder text NOT NULL DEFAULT 'Sent';

UPDATE public.comms_mailboxes SET display_name = COALESCE(display_name, label);
UPDATE public.comms_mailboxes SET inbound_enabled = true WHERE environment = 'staging' AND is_active = true;

DO $$ BEGIN
  ALTER TABLE public.comms_mailboxes
    ADD CONSTRAINT comms_mailboxes_sync_mode_chk CHECK (sync_start_mode IN ('future_only','approved_backfill'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.comms_mailboxes
    ADD CONSTRAINT comms_mailboxes_env_chk CHECK (environment IN ('staging','production'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Production mailboxes must default to future_only and may only move to
-- approved_backfill with an explicit recorded owner approval.
CREATE OR REPLACE FUNCTION public.comms_guard_mailbox_sync_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.environment = 'production' THEN
    NEW.sync_start_mode := 'future_only';
    NEW.is_active := false;              -- placeholder only, inactive by default
    NEW.inbound_enabled := false;
    NEW.outbound_enabled := false;
  END IF;

  IF NEW.sync_start_mode = 'approved_backfill'
     AND (NEW.backfill_approved_by IS NULL OR NEW.backfill_approved_at IS NULL) THEN
    RAISE EXCEPTION 'approved_backfill requires a recorded owner approval';
  END IF;

  IF NEW.sync_start_mode = 'approved_backfill'
     AND NEW.backfill_from_date IS NULL AND NEW.backfill_from_uid IS NULL THEN
    RAISE EXCEPTION 'approved_backfill requires a date range or a UID range';
  END IF;

  -- Passwords are never stored in table rows; only a secret-name reference.
  IF NEW.credential_secret_prefix IS NOT NULL
     AND NEW.credential_secret_prefix !~ '^[A-Z][A-Z0-9_]{3,60}$' THEN
    RAISE EXCEPTION 'credential_secret_prefix must be a secret name reference, not a value';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comms_guard_mailbox_sync_mode_trg ON public.comms_mailboxes;
CREATE TRIGGER comms_guard_mailbox_sync_mode_trg
  BEFORE INSERT OR UPDATE ON public.comms_mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.comms_guard_mailbox_sync_mode();

-- 2. Global feature gates (all closed)
ALTER TABLE public.comms_settings
  ADD COLUMN IF NOT EXISTS attachments_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_copy_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS html_render_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remote_images_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_processing_enabled boolean NOT NULL DEFAULT false;

-- 3. Sent-folder consistency tracking on outbound records
ALTER TABLE public.comms_outbound_messages
  ADD COLUMN IF NOT EXISTS sent_copy_status text NOT NULL DEFAULT 'not_attempted',
  ADD COLUMN IF NOT EXISTS sent_copy_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_copy_last_error text,
  ADD COLUMN IF NOT EXISTS sent_copy_appended_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.comms_outbound_messages
    ADD CONSTRAINT comms_outbound_sent_copy_chk
    CHECK (sent_copy_status IN ('not_attempted','sent_copy_pending','appended','skipped_duplicate','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Attachment foundation (built, disabled)
CREATE TABLE IF NOT EXISTS public.comms_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.comms_messages(id) ON DELETE CASCADE,
  outbound_message_id uuid REFERENCES public.comms_outbound_messages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  sanitized_filename text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text,
  scan_status text NOT NULL DEFAULT 'pending',
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comms_attachments_scan_chk CHECK (scan_status IN ('pending','clean','quarantined','blocked')),
  CONSTRAINT comms_attachments_parent_chk CHECK (num_nonnulls(message_id, outbound_message_id) = 1)
);

GRANT SELECT ON public.comms_attachments TO authenticated;
GRANT ALL ON public.comms_attachments TO service_role;
ALTER TABLE public.comms_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comms_attachments_admin_read ON public.comms_attachments;
CREATE POLICY comms_attachments_admin_read ON public.comms_attachments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.comms_messages m
      WHERE m.id = comms_attachments.message_id
        AND m.assigned_rep_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_comms_attachments_message ON public.comms_attachments(message_id);
