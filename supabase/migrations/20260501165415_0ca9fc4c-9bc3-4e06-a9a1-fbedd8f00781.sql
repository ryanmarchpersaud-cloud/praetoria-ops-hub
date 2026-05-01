
-- Personal Accounts: PRIVATE financial tracking, walled off from business books
-- Locked to specific owner user_ids (not just any admin)

CREATE TABLE IF NOT EXISTS public.personal_account_owners (
  user_id UUID PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_account_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can see themselves"
ON public.personal_account_owners FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_personal_account_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.personal_account_owners WHERE user_id = _user_id);
$$;

-- Funding source: which card/account the money comes from
CREATE TABLE IF NOT EXISTS public.personal_funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'bank' CHECK (source_type IN ('bank','credit_card','debit_card','line_of_credit','cash','other')),
  last4 TEXT,
  color TEXT DEFAULT '#0F172A',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_funding_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own funding sources"
ON public.personal_funding_sources FOR ALL
USING (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()))
WITH CHECK (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()));

-- Personal expenses (recurring monthly accounts)
CREATE TABLE IF NOT EXISTS public.personal_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('payment','bill','subscription','business_writeoff','other')),
  account_name TEXT NOT NULL,
  minimum_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  full_amount NUMERIC(12,2),
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  next_due_date DATE,
  funding_source_id UUID REFERENCES public.personal_funding_sources(id) ON DELETE SET NULL,
  is_business_writeoff BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own expenses"
ON public.personal_expenses FOR ALL
USING (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()))
WITH CHECK (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()));

CREATE INDEX idx_personal_expenses_owner ON public.personal_expenses(owner_id, is_active);

-- Payment history per expense
CREATE TABLE IF NOT EXISTS public.personal_expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.personal_expenses(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL,
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  funding_source_id UUID REFERENCES public.personal_funding_sources(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL DEFAULT 'full' CHECK (payment_type IN ('full','minimum','partial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own payment history"
ON public.personal_expense_payments FOR ALL
USING (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()))
WITH CHECK (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()));

CREATE INDEX idx_personal_payments_owner ON public.personal_expense_payments(owner_id, paid_date DESC);

-- Personal income (rent, side jobs, etc.)
CREATE TABLE IF NOT EXISTS public.personal_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  income_type TEXT NOT NULL DEFAULT 'recurring' CHECK (income_type IN ('recurring','one_time','business')),
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_day INT CHECK (expected_day BETWEEN 1 AND 31),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own income"
ON public.personal_income FOR ALL
USING (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()))
WITH CHECK (auth.uid() = owner_id AND public.is_personal_account_owner(auth.uid()));

-- Auto-update next_due_date trigger
CREATE OR REPLACE FUNCTION public.update_personal_expense_next_due()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate DATE;
  today DATE := CURRENT_DATE;
  yr INT; mo INT; day_in_month INT;
BEGIN
  yr := EXTRACT(YEAR FROM today);
  mo := EXTRACT(MONTH FROM today);
  day_in_month := LEAST(NEW.due_day, EXTRACT(DAY FROM (date_trunc('month', today) + interval '1 month' - interval '1 day'))::INT);
  candidate := make_date(yr, mo, day_in_month);
  IF candidate < today THEN
    candidate := (candidate + interval '1 month')::DATE;
    day_in_month := LEAST(NEW.due_day, EXTRACT(DAY FROM (date_trunc('month', candidate) + interval '1 month' - interval '1 day'))::INT);
    candidate := make_date(EXTRACT(YEAR FROM candidate)::INT, EXTRACT(MONTH FROM candidate)::INT, day_in_month);
  END IF;
  NEW.next_due_date := candidate;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_personal_expense_due
BEFORE INSERT OR UPDATE OF due_day ON public.personal_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_personal_expense_next_due();
