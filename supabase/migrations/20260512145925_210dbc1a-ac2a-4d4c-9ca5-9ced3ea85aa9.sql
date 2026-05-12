
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complimentary_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS complimentary_reason text;

CREATE TABLE IF NOT EXISTS public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  uploaded_by uuid,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  notes text,
  file_path text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON public.customer_documents(customer_id);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage customer documents"
ON public.customer_documents FOR ALL
TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Customers view their own documents"
ON public.customer_documents FOR SELECT
TO authenticated
USING (customer_id = public.get_customer_id_for_user(auth.uid()));

CREATE TRIGGER update_customer_documents_updated_at
BEFORE UPDATE ON public.customer_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies on attachments bucket scoped to customer-documents/ folder
CREATE POLICY "Ops staff manage customer-documents storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = 'customer-documents' AND public.is_ops_staff(auth.uid()))
WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = 'customer-documents' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Customers read own customer-documents storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = 'customer-documents'
  AND (storage.foldername(name))[2] = public.get_customer_id_for_user(auth.uid())::text
);
