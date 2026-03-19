
-- Add quote_id to jobs for Quote→Job traceability
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);

-- Add request_id to jobs for Request→Job traceability  
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.service_requests(id);

-- Add request_id and customer_id linking on quotes for Request→Quote traceability
-- customer_id already exists on quotes, request_id does not
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.service_requests(id);
