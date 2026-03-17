
-- =============================================
-- PHASE 2 HR PORTAL — New tables
-- =============================================

-- 1. Expand worker_profiles with new fields
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS secondary_service_category text,
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- 2. Emergency contacts
CREATE TABLE public.employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  relationship text,
  phone_primary text,
  phone_secondary text,
  email text,
  address text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own emergency contacts"
  ON public.employee_emergency_contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Workers manage own emergency contacts"
  ON public.employee_emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers update own emergency contacts"
  ON public.employee_emergency_contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Workers delete own emergency contacts"
  ON public.employee_emergency_contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all emergency contacts"
  ON public.employee_emergency_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Pay stubs
CREATE TABLE public.employee_pay_stubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  pay_date date NOT NULL,
  gross_pay numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  ytd_gross numeric NOT NULL DEFAULT 0,
  ytd_net numeric NOT NULL DEFAULT 0,
  stub_pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_pay_stubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own pay stubs"
  ON public.employee_pay_stubs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all pay stubs"
  ON public.employee_pay_stubs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Time off requests
CREATE TABLE public.employee_time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'vacation',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_requested numeric NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own time off"
  ON public.employee_time_off_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Workers submit time off"
  ON public.employee_time_off_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all time off"
  ON public.employee_time_off_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Time off balances (stored on worker_profiles)
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS vacation_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sick_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_days_balance numeric DEFAULT 0;
