
-- Create HR documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-documents', 'hr-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to hr-documents
CREATE POLICY "Staff can upload HR documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hr-documents');

-- Allow authenticated users to read HR documents
CREATE POLICY "Staff can read HR documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'hr-documents');

-- Allow authenticated users to delete their own HR documents
CREATE POLICY "Staff can delete HR documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hr-documents');
