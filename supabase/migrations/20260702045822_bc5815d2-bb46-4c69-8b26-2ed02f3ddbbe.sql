
-- 1. Extend pm_tenants with business/billing fields
ALTER TABLE public.pm_tenants
  ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS billing_contact_name text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_phone text,
  ADD COLUMN IF NOT EXISTS mailing_address_line_1 text,
  ADD COLUMN IF NOT EXISTS mailing_city text,
  ADD COLUMN IF NOT EXISTS mailing_province text,
  ADD COLUMN IF NOT EXISTS mailing_postal_code text,
  ADD COLUMN IF NOT EXISTS po_reference text,
  ADD COLUMN IF NOT EXISTS business_notes text;

-- 2. Extend pm_leases with rent frequency + deposit
ALTER TABLE public.pm_leases
  ADD COLUMN IF NOT EXISTS rent_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS deposit_held_since date,
  ADD COLUMN IF NOT EXISTS deposit_notes text;

-- 3. Tenant ledger
CREATE TABLE IF NOT EXISTS public.pm_tenant_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('charge','payment','credit','refund','late_fee','deposit')),
  amount numeric(12,2) NOT NULL,
  description text,
  reference text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_tenant_ledger_tenant_idx ON public.pm_tenant_ledger(tenant_id, entry_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_ledger TO authenticated;
GRANT ALL ON public.pm_tenant_ledger TO service_role;
ALTER TABLE public.pm_tenant_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own ledger" ON public.pm_tenant_ledger
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_ledger.tenant_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Ops staff manage ledger" ON public.pm_tenant_ledger
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE TRIGGER pm_tenant_ledger_updated_at BEFORE UPDATE ON public.pm_tenant_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tenant notices
CREATE TABLE IF NOT EXISTS public.pm_tenant_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'announcement' CHECK (category IN ('announcement','notice','document','maintenance_update')),
  published_at timestamptz NOT NULL DEFAULT now(),
  requires_ack boolean NOT NULL DEFAULT false,
  ack_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_tenant_notices_tenant_idx ON public.pm_tenant_notices(tenant_id, published_at DESC);
CREATE INDEX IF NOT EXISTS pm_tenant_notices_property_idx ON public.pm_tenant_notices(property_id, published_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_notices TO authenticated;
GRANT ALL ON public.pm_tenant_notices TO service_role;
ALTER TABLE public.pm_tenant_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own or broadcast notices" ON public.pm_tenant_notices
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_notices.tenant_id AND t.user_id = auth.uid())
    OR (
      tenant_id IS NULL
      AND property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.pm_tenants t
        JOIN public.pm_leases l ON l.tenant_id = t.id
        WHERE t.user_id = auth.uid() AND l.property_id = pm_tenant_notices.property_id
      )
    )
  );
CREATE POLICY "Tenants can ack own notices" ON public.pm_tenant_notices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_notices.tenant_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_notices.tenant_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Ops staff manage notices" ON public.pm_tenant_notices
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE TRIGGER pm_tenant_notices_updated_at BEFORE UPDATE ON public.pm_tenant_notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Tenant documents
CREATE TABLE IF NOT EXISTS public.pm_tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_path text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  shared_at timestamptz NOT NULL DEFAULT now(),
  shared_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_tenant_documents_tenant_idx ON public.pm_tenant_documents(tenant_id, shared_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_documents TO authenticated;
GRANT ALL ON public.pm_tenant_documents TO service_role;
ALTER TABLE public.pm_tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own or property documents" ON public.pm_tenant_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_documents.tenant_id AND t.user_id = auth.uid())
    OR (
      tenant_id IS NULL
      AND property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.pm_tenants t
        JOIN public.pm_leases l ON l.tenant_id = t.id
        WHERE t.user_id = auth.uid() AND l.property_id = pm_tenant_documents.property_id
      )
    )
  );
CREATE POLICY "Ops staff manage tenant documents" ON public.pm_tenant_documents
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE TRIGGER pm_tenant_documents_updated_at BEFORE UPDATE ON public.pm_tenant_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
