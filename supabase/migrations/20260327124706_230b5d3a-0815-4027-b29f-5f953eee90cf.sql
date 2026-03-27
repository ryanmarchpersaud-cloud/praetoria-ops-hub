
-- =============================================
-- STEP 4: Payroll, Contractor Payouts, Remittances
-- =============================================

-- 1. Payroll Runs
CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager payroll_runs" ON public.payroll_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Auto-generate run number
CREATE OR REPLACE FUNCTION public.generate_payroll_run_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.payroll_runs WHERE run_number IS NOT NULL;
  NEW.run_number := 'PR-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payroll_run_number BEFORE INSERT ON public.payroll_runs
  FOR EACH ROW WHEN (NEW.run_number IS NULL) EXECUTE FUNCTION public.generate_payroll_run_number();

-- 2. Payroll Run Items
CREATE TABLE public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  user_id UUID,
  employee_name TEXT,
  regular_hours NUMERIC(8,2) DEFAULT 0,
  overtime_hours NUMERIC(8,2) DEFAULT 0,
  holiday_hours NUMERIC(8,2) DEFAULT 0,
  sick_hours NUMERIC(8,2) DEFAULT 0,
  vacation_hours NUMERIC(8,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  salary_override NUMERIC(12,2),
  bonus_amount NUMERIC(12,2) DEFAULT 0,
  allowance_amount NUMERIC(12,2) DEFAULT 0,
  gross_pay NUMERIC(12,2) DEFAULT 0,
  cpp_amount NUMERIC(10,2) DEFAULT 0,
  ei_amount NUMERIC(10,2) DEFAULT 0,
  income_tax_amount NUMERIC(10,2) DEFAULT 0,
  other_deductions_amount NUMERIC(10,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  payout_account_id UUID REFERENCES public.finance_accounts(id),
  memo TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager payroll_run_items" ON public.payroll_run_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 3. Payroll Deduction Rules
CREATE TABLE public.payroll_deduction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  calculation_mode TEXT DEFAULT 'fixed',
  fixed_amount NUMERIC(10,2) DEFAULT 0,
  percent_rate NUMERIC(6,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_deduction_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager deduction_rules" ON public.payroll_deduction_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 4. Payroll Remittances
CREATE TABLE public.payroll_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_number TEXT,
  remittance_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_date DATE,
  reference_number TEXT,
  account_id UUID REFERENCES public.finance_accounts(id),
  notes TEXT,
  created_by UUID,
  paid_by UUID,
  paid_at TIMESTAMPTZ,
  filed_by UUID,
  filed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_remittances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager remittances" ON public.payroll_remittances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Auto-generate remittance number
CREATE OR REPLACE FUNCTION public.generate_remittance_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(remittance_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM public.payroll_remittances WHERE remittance_number IS NOT NULL;
  NEW.remittance_number := 'REM-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_remittance_number BEFORE INSERT ON public.payroll_remittances
  FOR EACH ROW WHEN (NEW.remittance_number IS NULL) EXECUTE FUNCTION public.generate_remittance_number();

-- 5. Subcontractor Payout Runs
CREATE TABLE public.subcontractor_payout_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_run_number TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payout_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_payout_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager payout_runs" ON public.subcontractor_payout_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Auto-generate payout run number
CREATE OR REPLACE FUNCTION public.generate_payout_run_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payout_run_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.subcontractor_payout_runs WHERE payout_run_number IS NOT NULL;
  NEW.payout_run_number := 'PO-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payout_run_number BEFORE INSERT ON public.subcontractor_payout_runs
  FOR EACH ROW WHEN (NEW.payout_run_number IS NULL) EXECUTE FUNCTION public.generate_payout_run_number();

-- 6. Subcontractor Payout Items
CREATE TABLE public.subcontractor_payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_run_id UUID NOT NULL REFERENCES public.subcontractor_payout_runs(id) ON DELETE CASCADE,
  subcontractor_id UUID,
  subcontractor_name TEXT,
  company_name TEXT,
  linked_job_id UUID,
  linked_visit_id UUID,
  linked_invoice_id UUID,
  service_description TEXT,
  service_date DATE,
  amount_due NUMERIC(12,2) DEFAULT 0,
  holdback_amount NUMERIC(12,2) DEFAULT 0,
  adjustment_amount NUMERIC(12,2) DEFAULT 0,
  total_payable NUMERIC(12,2) DEFAULT 0,
  account_id UUID REFERENCES public.finance_accounts(id),
  reference_number TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_payout_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager payout_items" ON public.subcontractor_payout_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
