
-- Finance Categories
CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view finance categories" ON public.finance_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage finance categories" ON public.finance_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Finance Vendors
CREATE TABLE public.finance_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_line_1 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',
  default_expense_category TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  tax_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view finance vendors" ON public.finance_vendors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can manage finance vendors" ON public.finance_vendors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Finance Expenses
CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES public.finance_vendors(id),
  amount_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CAD',
  category TEXT,
  subcategory TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  notes_internal TEXT,
  notes_external TEXT,
  receipt_count INTEGER DEFAULT 0,
  entered_by UUID,
  approved_by UUID,
  linked_job_id UUID REFERENCES public.jobs(id),
  linked_visit_id UUID REFERENCES public.visits(id),
  linked_invoice_id UUID REFERENCES public.invoices(id),
  linked_customer_id UUID REFERENCES public.customers(id),
  linked_property_id UUID REFERENCES public.properties(id),
  linked_vehicle_id TEXT,
  linked_worker_user_id UUID,
  linked_subcontractor_user_id UUID,
  service_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view finance expenses" ON public.finance_expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert finance expenses" ON public.finance_expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update finance expenses" ON public.finance_expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete finance expenses" ON public.finance_expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-generate expense number
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 4) AS INTEGER)), 0) + 1 INTO next_num FROM public.finance_expenses WHERE expense_number IS NOT NULL;
  NEW.expense_number := 'EX-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_generate_expense_number BEFORE INSERT ON public.finance_expenses FOR EACH ROW WHEN (NEW.expense_number IS NULL) EXECUTE FUNCTION public.generate_expense_number();

-- Finance Receipts
CREATE TABLE public.finance_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.finance_expenses(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_date DATE,
  vendor_name_raw TEXT,
  total_raw NUMERIC(12,2),
  tax_raw NUMERIC(12,2),
  review_status TEXT NOT NULL DEFAULT 'unreviewed',
  notes TEXT
);
ALTER TABLE public.finance_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view finance receipts" ON public.finance_receipts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert finance receipts" ON public.finance_receipts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update finance receipts" ON public.finance_receipts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Finance Bills
CREATE TABLE public.finance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT,
  vendor_id UUID REFERENCES public.finance_vendors(id),
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  memo TEXT,
  internal_notes TEXT,
  attachment_count INTEGER DEFAULT 0,
  linked_job_id UUID REFERENCES public.jobs(id),
  linked_property_id UUID REFERENCES public.properties(id),
  linked_customer_id UUID REFERENCES public.customers(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view finance bills" ON public.finance_bills FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert finance bills" ON public.finance_bills FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update finance bills" ON public.finance_bills FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete finance bills" ON public.finance_bills FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-generate bill number
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 6) AS INTEGER)), 0) + 1 INTO next_num FROM public.finance_bills WHERE bill_number IS NOT NULL;
  NEW.bill_number := 'BILL-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_generate_bill_number BEFORE INSERT ON public.finance_bills FOR EACH ROW WHEN (NEW.bill_number IS NULL) EXECUTE FUNCTION public.generate_bill_number();

-- Finance Bill Attachments
CREATE TABLE public.finance_bill_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.finance_bills(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_bill_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view bill attachments" ON public.finance_bill_attachments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert bill attachments" ON public.finance_bill_attachments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Finance Job Cost Snapshots
CREATE TABLE public.finance_job_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  property_id UUID REFERENCES public.properties(id),
  service_category TEXT,
  revenue_total NUMERIC(12,2) DEFAULT 0,
  labor_total NUMERIC(12,2) DEFAULT 0,
  materials_total NUMERIC(12,2) DEFAULT 0,
  subcontractor_total NUMERIC(12,2) DEFAULT 0,
  equipment_total NUMERIC(12,2) DEFAULT 0,
  fuel_total NUMERIC(12,2) DEFAULT 0,
  other_total NUMERIC(12,2) DEFAULT 0,
  cost_total NUMERIC(12,2) DEFAULT 0,
  gross_margin NUMERIC(12,2) DEFAULT 0,
  gross_margin_percent NUMERIC(5,2) DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_job_cost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view job cost snapshots" ON public.finance_job_cost_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert job cost snapshots" ON public.finance_job_cost_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Storage bucket for finance receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-receipts', 'finance-receipts', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Staff can upload finance receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finance-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Staff can view finance receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'finance-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Seed finance categories
INSERT INTO public.finance_categories (name, sort_order) VALUES
  ('Fuel', 1), ('Salt / Ice Melt', 2), ('Equipment Repair', 3), ('PPE', 4),
  ('Vehicle Maintenance', 5), ('Tools', 6), ('Office / Admin', 7), ('Advertising / Marketing', 8),
  ('Software / Hosting', 9), ('Insurance', 10), ('Subcontractor Cost', 11), ('Labor Adjustment', 12),
  ('Materials', 13), ('Cleaning Supplies', 14), ('Landscaping Supplies', 15), ('Dump / Disposal Fees', 16),
  ('Property Maintenance Supplies', 17), ('Miscellaneous', 18)
ON CONFLICT (name) DO NOTHING;
