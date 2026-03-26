
-- Make job_id nullable so standalone visits can be created
ALTER TABLE public.visits ALTER COLUMN job_id DROP NOT NULL;

-- Add scheduling columns
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS scheduled_start_time time without time zone,
  ADD COLUMN IF NOT EXISTS scheduled_end_time time without time zone,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS assigned_worker_id uuid,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS requires_photo_proof boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_completion_notes boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS safety_notes text,
  ADD COLUMN IF NOT EXISTS site_instructions text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_frequency text,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.visits(id);
