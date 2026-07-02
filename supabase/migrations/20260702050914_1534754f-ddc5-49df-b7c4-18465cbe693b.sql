
-- 1) Ledger extensions (additive)
ALTER TABLE public.pm_tenant_ledger
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS paid_date date,
  ADD COLUMN IF NOT EXISTS tenant_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tenant_note text,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- 2) Emergency contacts
CREATE TABLE IF NOT EXISTS public.pm_tenant_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  relationship text,
  phone text,
  email text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_emergency_contacts TO authenticated;
GRANT ALL ON public.pm_tenant_emergency_contacts TO service_role;
ALTER TABLE public.pm_tenant_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage tenant emergency contacts"
  ON public.pm_tenant_emergency_contacts FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view own emergency contacts"
  ON public.pm_tenant_emergency_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_emergency_contacts.tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER pm_tec_updated BEFORE UPDATE ON public.pm_tenant_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Insurance
CREATE TABLE IF NOT EXISTS public.pm_tenant_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_provided',
  provider text,
  policy_number text,
  coverage_start date,
  coverage_expiry date,
  storage_path text,
  admin_verified boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pm_tenant_insurance_tenant_unique ON public.pm_tenant_insurance(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_insurance TO authenticated;
GRANT ALL ON public.pm_tenant_insurance TO service_role;
ALTER TABLE public.pm_tenant_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage tenant insurance"
  ON public.pm_tenant_insurance FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view own insurance"
  ON public.pm_tenant_insurance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_insurance.tenant_id AND t.user_id = auth.uid()));
CREATE POLICY "Tenants insert own insurance"
  ON public.pm_tenant_insurance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_insurance.tenant_id AND t.user_id = auth.uid()));
CREATE POLICY "Tenants update own insurance limited"
  ON public.pm_tenant_insurance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_insurance.tenant_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_insurance.tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER pm_ins_updated BEFORE UPDATE ON public.pm_tenant_insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent tenants from mutating admin-only fields on insurance
CREATE OR REPLACE FUNCTION public.pm_insurance_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR public.is_ops_staff(v_actor) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.admin_verified IS DISTINCT FROM OLD.admin_verified THEN
      RAISE EXCEPTION 'Only admins may change admin_verified' USING ERRCODE = '42501';
    END IF;
    IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'Only admins may change admin_notes' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('provided', 'requested', OLD.status) THEN
      RAISE EXCEPTION 'Only admins may change insurance status' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pm_ins_guard BEFORE INSERT OR UPDATE ON public.pm_tenant_insurance
  FOR EACH ROW EXECUTE FUNCTION public.pm_insurance_guard();

-- 4) Occupants
CREATE TABLE IF NOT EXISTS public.pm_tenant_occupants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  occupant_name text NOT NULL,
  relationship text,
  is_minor boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_occupants TO authenticated;
GRANT ALL ON public.pm_tenant_occupants TO service_role;
ALTER TABLE public.pm_tenant_occupants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage occupants"
  ON public.pm_tenant_occupants FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view own occupants"
  ON public.pm_tenant_occupants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_occupants.tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER pm_occ_updated BEFORE UPDATE ON public.pm_tenant_occupants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Vehicles
CREATE TABLE IF NOT EXISTS public.pm_tenant_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  make_model text NOT NULL,
  colour text,
  plate text,
  parking_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_vehicles TO authenticated;
GRANT ALL ON public.pm_tenant_vehicles TO service_role;
ALTER TABLE public.pm_tenant_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage vehicles"
  ON public.pm_tenant_vehicles FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view own vehicles"
  ON public.pm_tenant_vehicles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_vehicles.tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER pm_veh_updated BEFORE UPDATE ON public.pm_tenant_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Pets
CREATE TABLE IF NOT EXISTS public.pm_tenant_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  pet_name text NOT NULL,
  pet_type text,
  breed text,
  notes text,
  is_approved boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_pets TO authenticated;
GRANT ALL ON public.pm_tenant_pets TO service_role;
ALTER TABLE public.pm_tenant_pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage pets"
  ON public.pm_tenant_pets FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view own pets"
  ON public.pm_tenant_pets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_pets.tenant_id AND t.user_id = auth.uid()));
CREATE TRIGGER pm_pet_updated BEFORE UPDATE ON public.pm_tenant_pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Inspections (checklist/keys/meter/photos as JSON to keep migration bounded)
CREATE TABLE IF NOT EXISTS public.pm_tenant_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  inspection_type text NOT NULL DEFAULT 'move-in',
  inspection_date date,
  status text NOT NULL DEFAULT 'draft',
  general_notes text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  keys_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  meter_readings jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  tenant_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_inspections TO authenticated;
GRANT ALL ON public.pm_tenant_inspections TO service_role;
ALTER TABLE public.pm_tenant_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops staff manage inspections"
  ON public.pm_tenant_inspections FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));
CREATE POLICY "Tenants view shared inspections"
  ON public.pm_tenant_inspections FOR SELECT TO authenticated
  USING (
    tenant_visible = true AND status = 'shared'
    AND EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.id = pm_tenant_inspections.tenant_id AND t.user_id = auth.uid())
  );
CREATE TRIGGER pm_insp_updated BEFORE UPDATE ON public.pm_tenant_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
