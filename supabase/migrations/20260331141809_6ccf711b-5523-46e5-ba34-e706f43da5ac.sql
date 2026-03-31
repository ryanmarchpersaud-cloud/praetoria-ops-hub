ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS root_cause_category text,
  ADD COLUMN IF NOT EXISTS root_cause_description text,
  ADD COLUMN IF NOT EXISTS first_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;