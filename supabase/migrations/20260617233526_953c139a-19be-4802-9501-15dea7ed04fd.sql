ALTER TABLE public.job_cost_meta
  ADD COLUMN IF NOT EXISTS tracker_override text CHECK (tracker_override IN ('include','exclude'));

COMMENT ON COLUMN public.job_cost_meta.tracker_override IS 'NULL = auto (routine/recurring jobs auto-excluded). include = force show. exclude = force hide.';