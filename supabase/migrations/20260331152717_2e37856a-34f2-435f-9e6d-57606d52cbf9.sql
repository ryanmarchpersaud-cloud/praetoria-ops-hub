
-- WCB Saskatchewan claim tracking
CREATE TABLE public.hr_wcb_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  claim_number TEXT,
  injury_date DATE NOT NULL,
  injury_type TEXT NOT NULL DEFAULT 'other',
  body_part TEXT,
  incident_report_id UUID REFERENCES public.incident_reports(id),
  claim_status TEXT NOT NULL DEFAULT 'pending',
  return_to_work_date DATE,
  modified_duties BOOLEAN DEFAULT false,
  restrictions TEXT,
  follow_up_notes TEXT,
  documents_reference TEXT,
  employer_account_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_wcb_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage WCB claims" ON public.hr_wcb_claims FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- SGI driver & fleet compliance
CREATE TABLE public.hr_sgi_driver_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  drivers_licence_number TEXT,
  licence_class TEXT DEFAULT '5',
  licence_expiry DATE,
  abstract_last_obtained DATE,
  abstract_status TEXT DEFAULT 'not_obtained',
  abstract_clear BOOLEAN,
  authorization_signed BOOLEAN DEFAULT false,
  authorization_date DATE,
  fleet_vehicle_assigned TEXT,
  violations_on_record TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_user_id)
);
ALTER TABLE public.hr_sgi_driver_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage SGI records" ON public.hr_sgi_driver_records FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));

-- Employee benefit enrollments per-provider
CREATE TABLE public.hr_benefit_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  provider_id UUID REFERENCES public.hr_insurance_providers(id),
  enrollment_status TEXT NOT NULL DEFAULT 'pending',
  effective_date DATE,
  termination_date DATE,
  plan_type TEXT,
  dependent_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_benefit_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff can manage enrollments" ON public.hr_benefit_enrollments FOR ALL TO authenticated USING (public.is_ops_staff(auth.uid()));
