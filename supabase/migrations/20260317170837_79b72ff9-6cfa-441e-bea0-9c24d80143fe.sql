
-- Worker profiles: employment and personal details
CREATE TABLE public.worker_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  employee_id TEXT,
  role_title TEXT,
  team TEXT,
  work_email TEXT,
  phone TEXT,
  employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'seasonal', 'on-call', 'inactive')),
  hire_date DATE,
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'seasonal', 'contract')),
  primary_service_category TEXT,
  supervisor_name TEXT,
  pay_type TEXT DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'salary', 'per-job')),
  branch_location TEXT,
  -- License / certifications summary
  driver_license_class TEXT,
  driver_license_expiry DATE,
  license_verified BOOLEAN DEFAULT false,
  equipment_permissions TEXT[] DEFAULT '{}',
  -- Benefits placeholders
  benefits_status TEXT DEFAULT 'not-enrolled' CHECK (benefits_status IN ('enrolled', 'not-enrolled', 'pending', 'waived')),
  benefits_provider TEXT,
  benefits_plan_summary TEXT,
  benefits_effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

-- Workers can view their own profile only
CREATE POLICY "Workers view own profile"
  ON public.worker_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all worker profiles
CREATE POLICY "Admins manage worker profiles"
  ON public.worker_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_worker_profiles_updated_at
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Worker certifications (training records)
CREATE TABLE public.worker_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cert_name TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own certifications"
  ON public.worker_certifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage worker certifications"
  ON public.worker_certifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Worker documents (file uploads)
CREATE TABLE public.worker_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('certificate', 'policy', 'id', 'payroll', 'training', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;

-- Workers view own documents
CREATE POLICY "Workers view own documents"
  ON public.worker_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Workers can upload their own documents
CREATE POLICY "Workers upload own documents"
  ON public.worker_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins manage all worker documents
CREATE POLICY "Admins manage worker documents"
  ON public.worker_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for worker documents
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-documents', 'worker-documents', false);

-- Workers can upload to their own folder
CREATE POLICY "Workers upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'worker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Workers can view their own folder
CREATE POLICY "Workers view own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'worker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can manage all worker docs
CREATE POLICY "Admins manage worker docs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'worker-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'worker-documents' AND public.has_role(auth.uid(), 'admin'));
