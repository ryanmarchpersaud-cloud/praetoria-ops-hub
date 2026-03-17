
-- 1. Add 'subcontractor' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'subcontractor';

-- 2. Subcontractors core table
CREATE TABLE public.subcontractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  operating_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mailing_address TEXT,
  business_number TEXT,
  service_area_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  active_flag BOOLEAN NOT NULL DEFAULT false,
  insurance_status TEXT NOT NULL DEFAULT 'missing',
  insurance_expiry DATE,
  wcb_status TEXT NOT NULL DEFAULT 'missing',
  wcb_expiry DATE,
  business_license_status TEXT NOT NULL DEFAULT 'missing',
  business_license_expiry DATE,
  agreement_signed_status TEXT NOT NULL DEFAULT 'missing',
  safety_doc_status TEXT NOT NULL DEFAULT 'missing',
  notes_admin_only TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own record"
  ON public.subcontractors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Subcontractors update own profile fields"
  ON public.subcontractors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subcontractors"
  ON public.subcontractors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subcontractors_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Subcontractor service categories
CREATE TABLE public.subcontractor_service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own service categories"
  ON public.subcontractor_service_categories FOR SELECT TO authenticated
  USING (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage subcontractor service categories"
  ON public.subcontractor_service_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Subcontractor assignments
CREATE TABLE public.subcontractor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  assignment_status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own assignments"
  ON public.subcontractor_assignments FOR SELECT TO authenticated
  USING (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all assignments"
  ON public.subcontractor_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Subcontractor documents
CREATE TABLE public.subcontractor_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expiry_date DATE,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own documents"
  ON public.subcontractor_documents FOR SELECT TO authenticated
  USING (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Subcontractors upload own documents"
  ON public.subcontractor_documents FOR INSERT TO authenticated
  WITH CHECK (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all subcontractor documents"
  ON public.subcontractor_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Subcontractor invoices
CREATE TABLE public.subcontractor_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_period_start DATE,
  service_period_end DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL DEFAULT 'submitted',
  attachment_url TEXT,
  admin_review_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own invoices"
  ON public.subcontractor_invoices FOR SELECT TO authenticated
  USING (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Subcontractors submit own invoices"
  ON public.subcontractor_invoices FOR INSERT TO authenticated
  WITH CHECK (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all subcontractor invoices"
  ON public.subcontractor_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subcontractor_invoices_updated_at
  BEFORE UPDATE ON public.subcontractor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Subcontractor payments
CREATE TABLE public.subcontractor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.subcontractor_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own payments"
  ON public.subcontractor_payments FOR SELECT TO authenticated
  USING (subcontractor_id IN (SELECT id FROM public.subcontractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all subcontractor payments"
  ON public.subcontractor_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. Helper function to get subcontractor_id for a user
CREATE OR REPLACE FUNCTION public.get_subcontractor_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.subcontractors
  WHERE user_id = _user_id
  LIMIT 1
$$;
