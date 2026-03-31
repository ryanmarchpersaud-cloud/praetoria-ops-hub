
-- Benefits & Insurance providers directory
CREATE TABLE public.hr_insurance_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'health',
  group_policy_number TEXT,
  account_number TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website_url TEXT,
  portal_url TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_insurance_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage providers" ON public.hr_insurance_providers FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- Employee lifecycle checklists (templates)
CREATE TABLE public.hr_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  checklist_type TEXT NOT NULL DEFAULT 'onboarding',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage templates" ON public.hr_checklist_templates FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- Employee checklist assignments (per-employee progress)
CREATE TABLE public.hr_checklist_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.hr_checklist_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  checklist_type TEXT NOT NULL DEFAULT 'onboarding',
  completed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  assigned_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_checklist_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage assignments" ON public.hr_checklist_assignments FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- HR case notes (private, per-employee)
CREATE TABLE public.hr_case_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  body TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage case notes" ON public.hr_case_notes FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- Compensation & review tracking
CREATE TABLE public.hr_compensation_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'pay_rate',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pay_rate NUMERIC(10,2),
  pay_type TEXT DEFAULT 'hourly',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_compensation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage compensation" ON public.hr_compensation_records FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

CREATE TABLE public.hr_review_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'annual',
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reviewer_user_id UUID,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_review_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage reviews" ON public.hr_review_schedules FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));
