
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS hidden_from_schedule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

CREATE INDEX IF NOT EXISTS visits_hidden_from_schedule_idx
  ON public.visits(hidden_from_schedule)
  WHERE hidden_from_schedule = true;

CREATE INDEX IF NOT EXISTS visits_archived_at_idx
  ON public.visits(archived_at)
  WHERE archived_at IS NOT NULL;
