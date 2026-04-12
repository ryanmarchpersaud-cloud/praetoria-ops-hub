
-- Form submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.form_templates(id),
  job_id UUID REFERENCES public.jobs(id),
  visit_id UUID REFERENCES public.visits(id),
  property_id UUID REFERENCES public.properties(id),
  customer_id UUID REFERENCES public.customers(id),
  submitted_by UUID NOT NULL,
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted',
  notes TEXT,
  materials_used TEXT,
  followup_required BOOLEAN NOT NULL DEFAULT false,
  quote_reference TEXT,
  invoice_reference TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_staff_manage_submissions" ON public.form_submissions FOR ALL
  USING (public.is_ops_staff(auth.uid()));

CREATE POLICY "workers_own_submissions_select" ON public.form_submissions FOR SELECT
  USING (public.is_worker_role(auth.uid()) AND submitted_by = auth.uid());

CREATE POLICY "workers_insert_submissions" ON public.form_submissions FOR INSERT
  WITH CHECK (public.is_worker_role(auth.uid()) AND submitted_by = auth.uid());

CREATE POLICY "subs_own_submissions_select" ON public.form_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'subcontractor') AND submitted_by = auth.uid());

CREATE POLICY "subs_insert_submissions" ON public.form_submissions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'subcontractor') AND submitted_by = auth.uid());

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_form_submissions_template ON public.form_submissions(template_id);
CREATE INDEX idx_form_submissions_job ON public.form_submissions(job_id);
CREATE INDEX idx_form_submissions_visit ON public.form_submissions(visit_id);
CREATE INDEX idx_form_submissions_submitted_by ON public.form_submissions(submitted_by);
