
-- Create storage bucket for subcontractor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-documents', 'subcontractor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Subcontractors can upload to their own folder
CREATE POLICY "Subcontractors upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'subcontractor-documents'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.subcontractors WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Subcontractors can view their own documents
CREATE POLICY "Subcontractors view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'subcontractor-documents'
  AND (
    (storage.foldername(name))[1] = (SELECT id::text FROM public.subcontractors WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- RLS: Admins can manage all subcontractor documents
CREATE POLICY "Admins manage subcontractor documents"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'subcontractor-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'subcontractor-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);
