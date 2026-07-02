
-- =========================================================================
-- PROPERTY MANAGEMENT — PHASE 1 FOUNDATION
-- =========================================================================

-- 1. Add new role enum values (safe: not yet referenced anywhere)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_owner';

-- 2. Domain enums
DO $$ BEGIN
  CREATE TYPE public.pm_property_type AS ENUM ('single_family','duplex','multi_unit','condo','commercial','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_unit_status AS ENUM ('vacant','occupied','pending','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_tenant_status AS ENUM ('active','pending','former');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_lease_status AS ENUM ('draft','active','ended','terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 3. TABLES (create → grant → RLS → policies)
-- =========================================================================

-- ── pm_property_owners ───────────────────────────────────────────────────
CREATE TABLE public.pm_property_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  mailing_address TEXT,
  notes TEXT,
  user_id UUID,               -- future: link to auth.users for portal login
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_property_owners TO authenticated;
GRANT ALL ON public.pm_property_owners TO service_role;
ALTER TABLE public.pm_property_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_owners_admin_all" ON public.pm_property_owners
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- Forward-compat: an owner can read their own record (does nothing until user_id is set)
CREATE POLICY "pm_owners_self_read" ON public.pm_property_owners
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());


-- ── pm_managed_properties ────────────────────────────────────────────────
CREATE TABLE public.pm_managed_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name TEXT NOT NULL,
  address_line_1 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  property_type public.pm_property_type NOT NULL DEFAULT 'single_family',
  primary_owner_id UUID REFERENCES public.pm_property_owners(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_managed_properties TO authenticated;
GRANT ALL ON public.pm_managed_properties TO service_role;
ALTER TABLE public.pm_managed_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_properties_admin_all" ON public.pm_managed_properties
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));


-- ── pm_owner_properties (join table; future multi-owner support) ─────────
CREATE TABLE public.pm_owner_properties (
  owner_id UUID NOT NULL REFERENCES public.pm_property_owners(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, property_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_properties TO authenticated;
GRANT ALL ON public.pm_owner_properties TO service_role;
ALTER TABLE public.pm_owner_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_owner_properties_admin_all" ON public.pm_owner_properties
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));


-- ── pm_units ─────────────────────────────────────────────────────────────
CREATE TABLE public.pm_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  unit_label TEXT NOT NULL,
  bedrooms NUMERIC(3,1),
  bathrooms NUMERIC(3,1),
  rent_amount NUMERIC(12,2),
  status public.pm_unit_status NOT NULL DEFAULT 'vacant',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_units TO authenticated;
GRANT ALL ON public.pm_units TO service_role;
ALTER TABLE public.pm_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX pm_units_property_idx ON public.pm_units(property_id);

CREATE POLICY "pm_units_admin_all" ON public.pm_units
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));


-- ── pm_tenants ───────────────────────────────────────────────────────────
CREATE TABLE public.pm_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status public.pm_tenant_status NOT NULL DEFAULT 'pending',
  user_id UUID,               -- future: link to auth.users for portal login
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenants TO authenticated;
GRANT ALL ON public.pm_tenants TO service_role;
ALTER TABLE public.pm_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_tenants_admin_all" ON public.pm_tenants
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "pm_tenants_self_read" ON public.pm_tenants
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());


-- ── pm_leases ────────────────────────────────────────────────────────────
CREATE TABLE public.pm_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  rent_due_day INT NOT NULL DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 31),
  status public.pm_lease_status NOT NULL DEFAULT 'draft',
  lease_document_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_leases TO authenticated;
GRANT ALL ON public.pm_leases TO service_role;
ALTER TABLE public.pm_leases ENABLE ROW LEVEL SECURITY;
CREATE INDEX pm_leases_tenant_idx ON public.pm_leases(tenant_id);
CREATE INDEX pm_leases_property_idx ON public.pm_leases(property_id);
CREATE INDEX pm_leases_unit_idx ON public.pm_leases(unit_id);

CREATE POLICY "pm_leases_admin_all" ON public.pm_leases
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- Forward-compat: a tenant can read only their own lease
CREATE POLICY "pm_leases_tenant_self_read" ON public.pm_leases
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pm_tenants t
    WHERE t.id = pm_leases.tenant_id
      AND t.user_id IS NOT NULL
      AND t.user_id = auth.uid()
  ));


-- =========================================================================
-- 4. updated_at triggers
-- =========================================================================
CREATE TRIGGER trg_pm_owners_updated       BEFORE UPDATE ON public.pm_property_owners    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pm_properties_updated   BEFORE UPDATE ON public.pm_managed_properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pm_units_updated        BEFORE UPDATE ON public.pm_units              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pm_tenants_updated      BEFORE UPDATE ON public.pm_tenants            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pm_leases_updated       BEFORE UPDATE ON public.pm_leases             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================================
-- 5. Permission key for the module
-- =========================================================================
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('owner', 'pm.manage'), ('admin', 'pm.manage')
ON CONFLICT DO NOTHING;
