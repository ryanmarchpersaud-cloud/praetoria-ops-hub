
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM (
  'Draft', 'Sent', 'Viewed', 'Paid', 'Partially Paid', 'Overdue', 'Failed', 'Voided'
);

-- Billing frequency enum
CREATE TYPE public.billing_frequency AS ENUM (
  'per-visit', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
);

-- Payment method enum
CREATE TYPE public.payment_method_type AS ENUM (
  'manual', 'card-on-file', 'auto-pay'
);

-- Customer billing profiles (safe payment metadata only)
CREATE TABLE public.customer_billing_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  payment_preference public.payment_method_type NOT NULL DEFAULT 'manual',
  billing_frequency public.billing_frequency NOT NULL DEFAULT 'monthly',
  processor_customer_id TEXT,
  payment_method_present BOOLEAN NOT NULL DEFAULT false,
  card_brand TEXT,
  card_last4 TEXT,
  autopay_enabled BOOLEAN NOT NULL DEFAULT false,
  autopay_consent_at TIMESTAMPTZ,
  billing_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  property_id UUID REFERENCES public.properties(id),
  job_id UUID REFERENCES public.jobs(id),
  status public.invoice_status NOT NULL DEFAULT 'Draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1300,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  processor_payment_id TEXT,
  internal_notes TEXT,
  customer_memo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice line items
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.visits(id),
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM public.invoices;
  NEW.invoice_number := 'INV-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

-- Auto-calc line item totals
CREATE TRIGGER trg_calc_invoice_line_total
  BEFORE INSERT OR UPDATE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_line_item_total();

-- Recalc invoice totals on line item change
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(5,4);
  v_amount_paid NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_invoice_id := OLD.invoice_id;
  ELSE v_invoice_id := NEW.invoice_id; END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.invoice_line_items WHERE invoice_id = v_invoice_id;

  SELECT tax_rate, amount_paid INTO v_tax_rate, v_amount_paid
  FROM public.invoices WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax = ROUND(v_subtotal * COALESCE(v_tax_rate, 0.13), 2),
      total = ROUND(v_subtotal + (v_subtotal * COALESCE(v_tax_rate, 0.13)), 2),
      balance_due = ROUND(v_subtotal + (v_subtotal * COALESCE(v_tax_rate, 0.13)), 2) - COALESCE(v_amount_paid, 0)
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_invoice_totals();

-- Updated_at triggers
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_customer_billing_profiles_updated_at
  BEFORE UPDATE ON public.customer_billing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_billing_profiles ENABLE ROW LEVEL SECURITY;

-- Staff full access
CREATE POLICY "Staff full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

CREATE POLICY "Staff full access to invoice_line_items" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

CREATE POLICY "Staff full access to billing_profiles" ON public.customer_billing_profiles
  FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

-- Customer read access
CREATE POLICY "Customers view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()));

CREATE POLICY "Customers view own invoice line items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'customer') AND invoice_id IN (
    SELECT id FROM public.invoices WHERE customer_id = get_customer_id_for_user(auth.uid())
  ));

CREATE POLICY "Customers view own billing profile" ON public.customer_billing_profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()));
