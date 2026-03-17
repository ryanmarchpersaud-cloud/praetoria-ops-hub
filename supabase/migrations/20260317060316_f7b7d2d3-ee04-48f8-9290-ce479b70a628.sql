ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS email_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_delivery_status text DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS follow_up_email_due_at timestamp with time zone;