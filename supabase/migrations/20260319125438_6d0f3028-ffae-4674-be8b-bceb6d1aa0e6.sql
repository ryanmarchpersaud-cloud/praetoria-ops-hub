
-- Create attachments storage bucket for messaging
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to attachments bucket
CREATE POLICY "Authenticated upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- RLS: anyone can read from public attachments bucket
CREATE POLICY "Public read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');
