-- Make lead_id nullable (quotes can be created without a lead)
ALTER TABLE public.quotes ALTER COLUMN lead_id DROP NOT NULL;

-- Make customer_id required (every quote needs a customer)
ALTER TABLE public.quotes ALTER COLUMN customer_id SET NOT NULL;