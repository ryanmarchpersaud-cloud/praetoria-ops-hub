-- Add attachments column for documents (PDFs, images with category metadata)
ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create private bucket for incident attachments (sensitive: insurance, IDs, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for incident-attachments
-- Reporter can upload their own files (path prefix = user_id)
CREATE POLICY "Reporters upload own incident files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Reporter can read their own files
CREATE POLICY "Reporters read own incident files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin_or_owner(auth.uid())
  )
);

-- Reporter can delete their own files (before submit cleanup)
CREATE POLICY "Reporters delete own incident files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin_or_owner(auth.uid())
  )
);