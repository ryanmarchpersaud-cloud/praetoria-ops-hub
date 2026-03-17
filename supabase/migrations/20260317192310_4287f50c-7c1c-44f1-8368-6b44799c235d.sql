
-- Make request-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'request-attachments';

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Public can view request attachments" ON storage.objects;

-- Create a policy so authenticated users can view their own uploads
CREATE POLICY "Users can view own request attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin/staff can view all request attachments
CREATE POLICY "Staff can view all request attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND public.has_role(auth.uid(), 'admin')
);
