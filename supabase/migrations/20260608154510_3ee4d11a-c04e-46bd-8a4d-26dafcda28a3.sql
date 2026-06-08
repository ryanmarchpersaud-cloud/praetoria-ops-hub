ALTER TABLE public.customer_recurring_requests
  ADD COLUMN IF NOT EXISTS billing_setup_status text,
  ADD COLUMN IF NOT EXISTS actioned_by uuid,
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz;