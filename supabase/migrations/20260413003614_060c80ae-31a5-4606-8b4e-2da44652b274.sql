
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-attachments', 'invoice-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to invoice-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY "Allow public reads from invoice-attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'invoice-attachments');
