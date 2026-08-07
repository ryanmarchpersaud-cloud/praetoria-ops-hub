ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS equipment_used text[],
  ADD COLUMN IF NOT EXISTS labour_hours numeric,
  ADD COLUMN IF NOT EXISTS equipment_hours numeric,
  ADD COLUMN IF NOT EXISTS snowfall_cm numeric,
  ADD COLUMN IF NOT EXISTS snowfall_trigger text;