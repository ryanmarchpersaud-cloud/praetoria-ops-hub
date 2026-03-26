
-- Add billing columns to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'on_completion',
  ADD COLUMN IF NOT EXISTS invoice_reminder boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_notes text,
  ADD COLUMN IF NOT EXISTS customer_billing_notes text,
  ADD COLUMN IF NOT EXISTS estimated_total numeric(12,2) DEFAULT 0;

-- Create job_line_items table
CREATE TABLE IF NOT EXISTS public.job_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id uuid REFERENCES public.products_services(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage job line items
CREATE POLICY "Authenticated users can view job_line_items"
  ON public.job_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert job_line_items"
  ON public.job_line_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update job_line_items"
  ON public.job_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job_line_items"
  ON public.job_line_items FOR DELETE TO authenticated USING (true);

-- Auto-calc line total trigger
CREATE TRIGGER calc_job_line_item_total
  BEFORE INSERT OR UPDATE ON public.job_line_items
  FOR EACH ROW EXECUTE FUNCTION public.calc_line_item_total();
