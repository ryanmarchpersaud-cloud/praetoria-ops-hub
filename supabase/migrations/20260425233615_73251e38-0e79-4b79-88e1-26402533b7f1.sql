-- Normalize existing customer_status values to canonical Active/Lost/Paused
UPDATE public.customers
SET customer_status = CASE
  WHEN LOWER(customer_status) IN ('active', '') THEN 'Active'
  WHEN LOWER(customer_status) = 'lost' THEN 'Lost'
  WHEN LOWER(customer_status) = 'paused' THEN 'Paused'
  ELSE 'Active'
END
WHERE customer_status IS NULL OR customer_status NOT IN ('Active', 'Lost', 'Paused');

-- Update default to canonical 'Active'
ALTER TABLE public.customers ALTER COLUMN customer_status SET DEFAULT 'Active';

-- Add a CHECK constraint to limit values to the three lifecycle states
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_customer_status_check
  CHECK (customer_status IN ('Active', 'Lost', 'Paused'));

-- Index for fast filtering by status on the Customers list
CREATE INDEX IF NOT EXISTS idx_customers_customer_status ON public.customers(customer_status);