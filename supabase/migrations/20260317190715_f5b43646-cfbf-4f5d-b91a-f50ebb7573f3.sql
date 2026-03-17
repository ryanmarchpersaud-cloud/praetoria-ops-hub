
-- Create storage bucket for service request attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to request-attachments
CREATE POLICY "Authenticated users can upload request attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

-- Allow authenticated users to view request attachments
CREATE POLICY "Anyone can view request attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'request-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own request attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'request-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
