
-- Table to track customer invoice views (like Jobber's read receipts)
CREATE TABLE public.invoice_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewer_ip TEXT,
  viewer_user_agent TEXT
);

-- Index for fast lookups by invoice
CREATE INDEX idx_invoice_views_invoice_id ON public.invoice_views (invoice_id);
CREATE INDEX idx_invoice_views_viewer ON public.invoice_views (viewer_user_id);

-- Enable RLS
ALTER TABLE public.invoice_views ENABLE ROW LEVEL SECURITY;

-- Admin/owner can read all view records
CREATE POLICY "Staff can view invoice view tracking"
ON public.invoice_views
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner(auth.uid()) OR public.is_ops_staff(auth.uid()));

-- Authenticated users can insert view records (portal customers logging their own views)
CREATE POLICY "Authenticated users can log invoice views"
ON public.invoice_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_user_id);
