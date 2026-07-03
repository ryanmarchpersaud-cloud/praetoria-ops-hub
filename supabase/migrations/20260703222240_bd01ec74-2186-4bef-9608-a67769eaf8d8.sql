
DO $$ BEGIN
  CREATE TYPE public.pm_document_visibility AS ENUM ('internal_only','tenant_visible','owner_visible','tenant_and_owner_visible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_document_status AS ENUM ('active','archived','expired','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  document_type text,
  category text,
  property_id uuid,
  unit_id uuid,
  owner_id uuid,
  tenant_id uuid,
  lease_id uuid,
  maintenance_request_id uuid,
  work_order_id uuid,
  expense_id uuid,
  owner_statement_id uuid,
  owner_approval_id uuid,
  owner_thread_id uuid,
  tenant_thread_id uuid,
  lease_renewal_id uuid,
  move_in_id uuid,
  move_out_id uuid,
  inspection_id uuid,
  notice_id uuid,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  visibility public.pm_document_visibility NOT NULL DEFAULT 'internal_only',
  status public.pm_document_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_documents_property_idx ON public.pm_documents(property_id);
CREATE INDEX IF NOT EXISTS pm_documents_unit_idx ON public.pm_documents(unit_id);
CREATE INDEX IF NOT EXISTS pm_documents_owner_idx ON public.pm_documents(owner_id);
CREATE INDEX IF NOT EXISTS pm_documents_tenant_idx ON public.pm_documents(tenant_id);
CREATE INDEX IF NOT EXISTS pm_documents_lease_idx ON public.pm_documents(lease_id);
CREATE INDEX IF NOT EXISTS pm_documents_visibility_idx ON public.pm_documents(visibility);
CREATE INDEX IF NOT EXISTS pm_documents_status_idx ON public.pm_documents(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_documents TO authenticated;
GRANT ALL ON public.pm_documents TO service_role;

ALTER TABLE public.pm_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage pm_documents"
  ON public.pm_documents FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Tenants view own pm_documents"
  ON public.pm_documents FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND visibility IN ('tenant_visible','tenant_and_owner_visible')
    AND (
      tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
      OR lease_id IN (
        SELECT l.id FROM public.pm_leases l
        JOIN public.pm_tenants t ON t.id = l.tenant_id
        WHERE t.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners view own pm_documents"
  ON public.pm_documents FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND visibility IN ('owner_visible','tenant_and_owner_visible')
    AND (
      owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
      OR property_id IN (
        SELECT op.property_id FROM public.pm_owner_properties op
        JOIN public.pm_property_owners o ON o.id = op.owner_id
        WHERE o.user_id = auth.uid()
      )
      OR property_id IN (
        SELECT p.id FROM public.pm_managed_properties p
        JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
        WHERE o.user_id = auth.uid()
      )
    )
  );

DROP TRIGGER IF EXISTS pm_documents_set_updated_at ON public.pm_documents;
CREATE TRIGGER pm_documents_set_updated_at
  BEFORE UPDATE ON public.pm_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS on pm-documents bucket
DROP POLICY IF EXISTS "Ops staff manage pm-documents objects" ON storage.objects;
CREATE POLICY "Ops staff manage pm-documents objects"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pm-documents' AND public.is_ops_staff(auth.uid()))
  WITH CHECK (bucket_id = 'pm-documents' AND public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Tenants read own pm-documents objects" ON storage.objects;
CREATE POLICY "Tenants read own pm-documents objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-documents'
    AND EXISTS (
      SELECT 1 FROM public.pm_documents d
      WHERE d.file_path = storage.objects.name
        AND d.status = 'active'
        AND d.visibility IN ('tenant_visible','tenant_and_owner_visible')
        AND (
          d.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
          OR d.lease_id IN (
            SELECT l.id FROM public.pm_leases l
            JOIN public.pm_tenants t ON t.id = l.tenant_id
            WHERE t.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Owners read own pm-documents objects" ON storage.objects;
CREATE POLICY "Owners read own pm-documents objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-documents'
    AND EXISTS (
      SELECT 1 FROM public.pm_documents d
      WHERE d.file_path = storage.objects.name
        AND d.status = 'active'
        AND d.visibility IN ('owner_visible','tenant_and_owner_visible')
        AND (
          d.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR d.property_id IN (
            SELECT op.property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners o ON o.id = op.owner_id
            WHERE o.user_id = auth.uid()
          )
          OR d.property_id IN (
            SELECT p.id FROM public.pm_managed_properties p
            JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
            WHERE o.user_id = auth.uid()
          )
        )
    )
  );
