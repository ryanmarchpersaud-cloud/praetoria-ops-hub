ALTER TABLE public.personal_funding_sources
  ADD COLUMN IF NOT EXISTS last_paid_date date,
  ADD COLUMN IF NOT EXISTS last_paid_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS last_payment_type text,
  ADD COLUMN IF NOT EXISTS current_balance numeric(12,2),
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2),
  ADD COLUMN IF NOT EXISTS notes text;