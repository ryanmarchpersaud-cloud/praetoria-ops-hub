
-- Add attachment_url column to agreements
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS attachment_url text;

-- Create storage bucket for agreement PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreement-attachments', 'agreement-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload agreement files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agreement-attachments');

-- Authenticated users can read
CREATE POLICY "Authenticated users can read agreement files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agreement-attachments');

-- Public read for signing links (anon)
CREATE POLICY "Anon can read agreement files for signing"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'agreement-attachments');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete agreement files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agreement-attachments');
