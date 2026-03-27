
-- Finance Accounts (payment sources)
CREATE TABLE public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'bank_operating',
  masked_account_number TEXT,
  institution_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_balance_manual NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view finance_accounts" ON public.finance_accounts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admins can manage finance_accounts" ON public.finance_accounts
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Finance Payments (unified payment records for bills and invoices)
CREATE TABLE public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type TEXT NOT NULL DEFAULT 'bill_payment',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  account_id UUID REFERENCES public.finance_accounts(id),
  reference_number TEXT,
  internal_note TEXT,
  bill_id UUID REFERENCES public.finance_bills(id),
  invoice_id UUID REFERENCES public.invoices(id),
  expense_id UUID REFERENCES public.finance_expenses(id),
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_reason TEXT,
  entered_by UUID,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view finance_payments" ON public.finance_payments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admins can manage finance_payments" ON public.finance_payments
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Reconciliation statements
CREATE TABLE public.finance_reconciliation_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  statement_opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  statement_closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculated_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_reconciliation_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reconciliation" ON public.finance_reconciliation_statements
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admins can manage reconciliation" ON public.finance_reconciliation_statements
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Add audit fields to finance_receipts
ALTER TABLE public.finance_receipts
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matched_by UUID,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- Add reimbursement fields to finance_expenses
ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS reimbursement_date DATE,
  ADD COLUMN IF NOT EXISTS reimbursement_method TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_reference TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_account_id UUID REFERENCES public.finance_accounts(id);
