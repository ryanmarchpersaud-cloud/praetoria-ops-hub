
-- Add new visit statuses: Planned, Skipped, Rescheduled
ALTER TYPE public.visit_status ADD VALUE IF NOT EXISTS 'Planned' BEFORE 'Scheduled';
ALTER TYPE public.visit_status ADD VALUE IF NOT EXISTS 'Skipped' AFTER 'Completed';
ALTER TYPE public.visit_status ADD VALUE IF NOT EXISTS 'Rescheduled' AFTER 'Skipped';

-- Add service frequency enum
CREATE TYPE public.service_frequency AS ENUM (
  'one-time', 'weekly', 'biweekly', 'monthly', 'on-snowfall', 'custom-seasonal'
);

-- Add recurring plan fields to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS service_frequency public.service_frequency DEFAULT 'one-time',
  ADD COLUMN IF NOT EXISTS season_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS minimum_included_visits INTEGER,
  ADD COLUMN IF NOT EXISTS additional_visit_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS service_instructions TEXT;
