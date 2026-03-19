
-- Company Settings (single-row config)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text DEFAULT '',
  operating_name text DEFAULT '',
  display_name text DEFAULT '',
  description text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  support_email text DEFAULT '',
  billing_email text DEFAULT '',
  physical_address text DEFAULT '',
  mailing_address text DEFAULT '',
  business_number text DEFAULT '',
  gst_number text DEFAULT '',
  pst_number text DEFAULT '',
  logo_url text,
  primary_color text DEFAULT '#1e3a5f',
  secondary_color text DEFAULT '#2563eb',
  accent_color text DEFAULT '#f59e0b',
  invoice_header_name text DEFAULT '',
  quote_footer_text text DEFAULT '',
  email_signature text DEFAULT '',
  brand_notes text DEFAULT '',
  default_timezone text DEFAULT 'America/Edmonton',
  currency text DEFAULT 'CAD',
  date_format text DEFAULT 'YYYY-MM-DD',
  language text DEFAULT 'en',
  default_service_area text DEFAULT '',
  operating_hours text DEFAULT '7:00 AM - 6:00 PM',
  after_hours_enabled boolean DEFAULT false,
  weekend_service_enabled boolean DEFAULT true,
  emergency_service_enabled boolean DEFAULT true,
  quote_prefix text DEFAULT 'PQ',
  invoice_prefix text DEFAULT 'INV',
  request_prefix text DEFAULT 'SR',
  job_prefix text DEFAULT 'PJ',
  default_payment_terms text DEFAULT 'Net 30',
  default_due_days integer DEFAULT 30,
  deposit_required boolean DEFAULT false,
  default_tax_enabled boolean DEFAULT true,
  default_tax_rate numeric(5,4) DEFAULT 0.05,
  internal_notes_visible_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company settings" ON public.company_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view company settings" ON public.company_settings FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Payment Settings (single-row config)
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_enabled boolean DEFAULT true,
  etransfer_enabled boolean DEFAULT true,
  credit_card_enabled boolean DEFAULT true,
  cheque_enabled boolean DEFAULT true,
  other_method_name text DEFAULT '',
  other_method_enabled boolean DEFAULT false,
  cash_instructions text DEFAULT '',
  etransfer_instructions text DEFAULT '',
  credit_card_instructions text DEFAULT '',
  cheque_instructions text DEFAULT '',
  other_method_instructions text DEFAULT '',
  default_payment_terms text DEFAULT 'Net 30',
  custom_terms_days integer DEFAULT 30,
  late_fee_enabled boolean DEFAULT false,
  late_fee_type text DEFAULT 'percentage',
  late_fee_value numeric(10,2) DEFAULT 0,
  deposit_required boolean DEFAULT false,
  default_deposit_percentage numeric(5,2) DEFAULT 50,
  partial_payment_allowed boolean DEFAULT true,
  tax_enabled boolean DEFAULT true,
  default_tax_rate numeric(5,4) DEFAULT 0.05,
  tax_label_1 text DEFAULT 'GST',
  tax_rate_1 numeric(5,4) DEFAULT 0.05,
  tax_label_2 text DEFAULT '',
  tax_rate_2 numeric(5,4) DEFAULT 0,
  auto_mark_sent boolean DEFAULT false,
  overdue_reminder_days text DEFAULT '7,14,30',
  invoice_footer_text text DEFAULT '',
  manual_reminders_only boolean DEFAULT true,
  stripe_mode text DEFAULT 'test',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payment settings" ON public.payment_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view payment settings" ON public.payment_settings FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view vendors" ON public.vendors FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  category text NOT NULL DEFAULT 'Miscellaneous',
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name text DEFAULT '',
  description text DEFAULT '',
  payment_method text DEFAULT 'Other',
  receipt_url text,
  service_line text DEFAULT '',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Automation Rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  category text DEFAULT 'General',
  trigger_event text NOT NULL,
  conditions jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  scope text DEFAULT 'all',
  priority integer DEFAULT 0,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage automation rules" ON public.automation_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view automation rules" ON public.automation_rules FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Automation Logs
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name text NOT NULL,
  trigger_event text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage automation logs" ON public.automation_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view automation logs" ON public.automation_logs FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
