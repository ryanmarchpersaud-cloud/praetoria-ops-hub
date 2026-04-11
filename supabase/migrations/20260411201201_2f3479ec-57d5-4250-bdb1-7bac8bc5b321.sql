
-- Banking info for subcontractors
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_institution_number text,
  ADD COLUMN IF NOT EXISTS bank_transit_number text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS e_transfer_email text,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text DEFAULT 'e-transfer',
  ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone;

-- Banking info for worker_profiles
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_institution_number text,
  ADD COLUMN IF NOT EXISTS bank_transit_number text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS e_transfer_email text,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text DEFAULT 'e-transfer',
  ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone;
