
-- Manual link/exclude records (quotes, invoices) per job for the cost tracker
CREATE TABLE IF NOT EXISTS public.job_cost_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('quote','invoice')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'include' CHECK (action IN ('include','exclude')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (job_id, kind, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_cost_links TO authenticated;
GRANT ALL ON public.job_cost_links TO service_role;

ALTER TABLE public.job_cost_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage job cost links"
ON public.job_cost_links
FOR ALL
TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

-- Add revenue source override + manual revenue to job_cost_meta
ALTER TABLE public.job_cost_meta
  ADD COLUMN IF NOT EXISTS revenue_source TEXT NOT NULL DEFAULT 'auto'
    CHECK (revenue_source IN ('auto','invoices','quotes','manual')),
  ADD COLUMN IF NOT EXISTS manual_revenue NUMERIC NOT NULL DEFAULT 0;
