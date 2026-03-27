
-- Add quote_id and visit_id to invoices for full revenue chain
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES public.visits(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'manual';

-- Add quote_id to visits for source chain
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.service_requests(id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'not_billable';

-- Add billing_status to jobs for billing readiness tracking
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'not_billable';

-- Add converted_job_id to quotes to track conversion
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS converted_job_id UUID REFERENCES public.jobs(id);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS converted_by TEXT;
