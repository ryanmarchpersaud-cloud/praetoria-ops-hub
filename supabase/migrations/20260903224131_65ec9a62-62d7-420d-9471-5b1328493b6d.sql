ALTER TABLE public.comms_mailboxes
  ADD COLUMN IF NOT EXISTS sent_folder_source text,
  ADD COLUMN IF NOT EXISTS sent_folder_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_folder_candidates jsonb,
  ADD COLUMN IF NOT EXISTS folder_list_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS sent_folder_selection_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.comms_mailboxes ALTER COLUMN sent_folder DROP DEFAULT;
ALTER TABLE public.comms_mailboxes ALTER COLUMN sent_folder DROP NOT NULL;
UPDATE public.comms_mailboxes SET sent_folder = NULL WHERE sent_folder_verified_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_mailboxes_sent_folder_source_chk') THEN
    ALTER TABLE public.comms_mailboxes
      ADD CONSTRAINT comms_mailboxes_sent_folder_source_chk
      CHECK (sent_folder_source IS NULL OR sent_folder_source IN ('special_use','owner_selected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_mailboxes_sent_folder_verified_chk') THEN
    ALTER TABLE public.comms_mailboxes
      ADD CONSTRAINT comms_mailboxes_sent_folder_verified_chk
      CHECK ((sent_folder IS NULL) = (sent_folder_verified_at IS NULL));
  END IF;
END $$;