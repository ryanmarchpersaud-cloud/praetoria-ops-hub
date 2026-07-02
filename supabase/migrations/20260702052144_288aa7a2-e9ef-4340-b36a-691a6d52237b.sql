ALTER TABLE public.pm_maintenance_requests
  ADD COLUMN IF NOT EXISTS issue_label text,
  ADD COLUMN IF NOT EXISTS issue_key text,
  ADD COLUMN IF NOT EXISTS is_urgent_safety boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_suggested_by_catalog text;

CREATE INDEX IF NOT EXISTS pm_maintenance_requests_issue_key_idx
  ON public.pm_maintenance_requests (issue_key);
CREATE INDEX IF NOT EXISTS pm_maintenance_requests_urgent_safety_idx
  ON public.pm_maintenance_requests (is_urgent_safety) WHERE is_urgent_safety = true;