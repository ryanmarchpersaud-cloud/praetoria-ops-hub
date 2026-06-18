ALTER TABLE public.job_cost_meta
  ADD COLUMN IF NOT EXISTS fuel_calc_method text NOT NULL DEFAULT 'per_trip',
  ADD COLUMN IF NOT EXISTS manual_fuel_total numeric NOT NULL DEFAULT 0;

ALTER TABLE public.job_cost_meta
  DROP CONSTRAINT IF EXISTS job_cost_meta_fuel_calc_method_check;
ALTER TABLE public.job_cost_meta
  ADD CONSTRAINT job_cost_meta_fuel_calc_method_check
  CHECK (fuel_calc_method IN ('manual','per_trip','detailed'));