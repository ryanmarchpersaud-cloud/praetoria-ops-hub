ALTER TABLE public.personal_funding_sources
  ADD COLUMN IF NOT EXISTS interest_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS minimum_payment NUMERIC;