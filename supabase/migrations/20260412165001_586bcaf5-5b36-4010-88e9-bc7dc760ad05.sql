
CREATE TABLE public.finance_refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  refund_type TEXT NOT NULL DEFAULT 'full' CHECK (refund_type IN ('full', 'partial', 'credit_note', 'duplicate')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  stripe_refund_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view refunds"
  ON public.finance_refunds FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can create refunds"
  ON public.finance_refunds FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update refunds"
  ON public.finance_refunds FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER update_finance_refunds_updated_at
  BEFORE UPDATE ON public.finance_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
