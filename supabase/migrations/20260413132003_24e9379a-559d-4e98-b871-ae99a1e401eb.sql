
-- Add customer lifecycle status
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
