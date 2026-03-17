
-- 1. Incident Reports (shared by workers and subcontractors)
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reporter_type TEXT NOT NULL DEFAULT 'worker', -- 'worker' or 'subcontractor'
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL DEFAULT 'Incident Report',
  date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  description TEXT,
  people_involved TEXT,
  witnesses TEXT,
  medical_attention BOOLEAN NOT NULL DEFAULT false,
  reported_to TEXT,
  follow_up_status TEXT NOT NULL DEFAULT 'open',
  photos TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own incident reports" ON public.incident_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Workers submit incident reports" ON public.incident_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all incident reports" ON public.incident_reports
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Worker Tax Documents
CREATE TABLE public.worker_tax_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'T4', -- T4, ROE, T4A, T5018, pay_summary
  tax_year INTEGER NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own tax documents" ON public.worker_tax_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all tax documents" ON public.worker_tax_documents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Worker Training Records
CREATE TABLE public.worker_training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_type TEXT NOT NULL DEFAULT 'other', -- whmis, first_aid, equipment_cert, ppe_ack, handbook, toolbox_talk
  training_name TEXT NOT NULL,
  completed_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own training records" ON public.worker_training_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Workers acknowledge training" ON public.worker_training_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all training records" ON public.worker_training_records
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Worker Equipment / PPE
CREATE TABLE public.worker_equipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'ppe', -- ppe, tool, device
  item_name TEXT NOT NULL,
  serial_number TEXT,
  issued_date DATE,
  return_date DATE,
  condition TEXT NOT NULL DEFAULT 'good', -- good, fair, damaged, returned
  replacement_requested BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own equipment" ON public.worker_equipment_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Workers request replacements" ON public.worker_equipment_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all equipment" ON public.worker_equipment_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Subcontractor Tax Documents (T4A, T5018, etc.)
CREATE TABLE public.subcontractor_tax_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'T4A', -- T4A, T5018, payout_summary
  tax_year INTEGER NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcontractors view own tax documents" ON public.subcontractor_tax_documents
  FOR SELECT USING (subcontractor_id IN (
    SELECT id FROM public.subcontractors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all subcontractor tax documents" ON public.subcontractor_tax_documents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
