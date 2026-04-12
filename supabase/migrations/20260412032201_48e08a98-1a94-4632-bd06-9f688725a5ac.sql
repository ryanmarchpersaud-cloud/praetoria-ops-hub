-- ═══════════════════════════════════════════════════════
-- 1. Expand payroll_run_items with granular deduction & employer contribution columns
-- ═══════════════════════════════════════════════════════

-- Employee-paid deduction columns
ALTER TABLE public.payroll_run_items
  ADD COLUMN IF NOT EXISTS reimbursement_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_pay_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_method text DEFAULT 'direct_deposit',
  ADD COLUMN IF NOT EXISTS union_dues numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pension_rpp numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rrsp_prpp numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employee_health_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employee_dental_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employee_vision_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_life_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ltd_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eap_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voluntary_deductions numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS garnishments numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overpayment_recovery numeric DEFAULT 0;

-- Employer-paid contribution columns
ALTER TABLE public.payroll_run_items
  ADD COLUMN IF NOT EXISTS employer_cpp numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_ei numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_pension_match numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_health_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_dental_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_group_life numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_ltd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_benefit_contribution numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_retirement_match numeric DEFAULT 0;

-- ═══════════════════════════════════════════════════════
-- 2. Employee benefit enrollments (HR-managed)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.employee_benefit_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_name text NOT NULL,
  plan_type text NOT NULL DEFAULT 'other',
  plan_code text,
  provider_name text,
  eligibility_date date,
  employee_contribution_amount numeric DEFAULT 0,
  employee_contribution_percent numeric DEFAULT 0,
  employer_contribution_amount numeric DEFAULT 0,
  employer_contribution_percent numeric DEFAULT 0,
  is_taxable_benefit boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_benefit_enrollments ENABLE ROW LEVEL SECURITY;

-- Office staff can manage all enrollments
CREATE POLICY "ops_staff_manage_benefit_enrollments"
  ON public.employee_benefit_enrollments
  FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Workers can view their own enrollments
CREATE POLICY "workers_view_own_benefit_enrollments"
  ON public.employee_benefit_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_employee_benefit_enrollments_updated_at
  BEFORE UPDATE ON public.employee_benefit_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();