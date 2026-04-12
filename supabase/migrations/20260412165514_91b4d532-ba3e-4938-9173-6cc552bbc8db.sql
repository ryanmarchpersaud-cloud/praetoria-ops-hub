
ALTER TABLE public.customer_billing_profiles
  ADD COLUMN IF NOT EXISTS card_exp_month smallint,
  ADD COLUMN IF NOT EXISTS card_exp_year smallint,
  ADD COLUMN IF NOT EXISTS default_payment_method_id text;

ALTER TABLE public.subcontractor_billing_profiles
  ADD COLUMN IF NOT EXISTS card_exp_month smallint,
  ADD COLUMN IF NOT EXISTS card_exp_year smallint,
  ADD COLUMN IF NOT EXISTS default_payment_method_id text;
