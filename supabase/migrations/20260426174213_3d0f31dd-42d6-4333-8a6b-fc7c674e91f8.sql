ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS workmanship_warranty TEXT,
  ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS default_workmanship_warranty TEXT,
  ADD COLUMN IF NOT EXISTS default_terms_conditions TEXT,
  ADD COLUMN IF NOT EXISTS default_quote_notes TEXT;