-- Allow authenticated users to upload to the attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete their own uploads in attachments
CREATE POLICY "Authenticated users can delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND (auth.uid())::text = owner_id::text);