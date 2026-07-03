
-- =========================================================
-- Phase 7A · Migration 1/9 — pm_charges
-- =========================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.pm_charge_type AS ENUM (
    'rent','late_fee','deposit','utility','adjustment_charge','other','nsf_fee','parking','pet_fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_charge_status AS ENUM (
    'open','partially_paid','paid','waived','cancelled','written_off'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Numbering sequence
CREATE SEQUENCE IF NOT EXISTS public.pm_charge_number_seq START 1;

-- 3. Table
CREATE TABLE IF NOT EXISTS public.pm_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_number TEXT UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE RESTRICT,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  charge_type public.pm_charge_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance NUMERIC(12,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  status public.pm_charge_status NOT NULL DEFAULT 'open',
  due_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  description TEXT,
  internal_notes TEXT,
  source_ref TEXT,
  source_table TEXT,
  source_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_charges_tenant ON public.pm_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_charges_lease  ON public.pm_charges(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_charges_property ON public.pm_charges(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_charges_due    ON public.pm_charges(due_date);
CREATE INDEX IF NOT EXISTS idx_pm_charges_status ON public.pm_charges(status);

-- 4. GRANTS (before RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_charges TO authenticated;
GRANT ALL ON public.pm_charges TO service_role;
GRANT USAGE ON SEQUENCE public.pm_charge_number_seq TO authenticated, service_role;

-- 5. RLS
ALTER TABLE public.pm_charges ENABLE ROW LEVEL SECURITY;

-- Tenants: read only their own charges
CREATE POLICY "Tenants view own charges"
  ON public.pm_charges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_tenants t
      WHERE t.id = pm_charges.tenant_id AND t.user_id = auth.uid()
    )
  );

-- Ops/PM staff: full read
CREATE POLICY "Ops staff view all charges"
  ON public.pm_charges FOR SELECT
  TO authenticated
  USING (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'leasing_agent'::public.app_role)
  );

-- Ops/PM staff: write (insert/update/delete)
CREATE POLICY "Ops staff manage charges"
  ON public.pm_charges FOR ALL
  TO authenticated
  USING (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'leasing_agent'::public.app_role)
  )
  WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'leasing_agent'::public.app_role)
  );

-- 6. Triggers

-- 6a. Auto-number
CREATE OR REPLACE FUNCTION public.generate_pm_charge_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.charge_number IS NULL OR NEW.charge_number = '' THEN
    NEW.charge_number := 'CHG-' || LPAD(nextval('public.pm_charge_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pm_charges_number
  BEFORE INSERT ON public.pm_charges
  FOR EACH ROW EXECUTE FUNCTION public.generate_pm_charge_number();

-- 6b. Recompute status from amount_paid
CREATE OR REPLACE FUNCTION public.pm_charges_sync_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Don't override terminal manual statuses
  IF NEW.status IN ('waived','cancelled','written_off') THEN
    RETURN NEW;
  END IF;
  IF NEW.amount_paid >= NEW.amount AND NEW.amount > 0 THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partially_paid';
  ELSE
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pm_charges_sync_status
  BEFORE INSERT OR UPDATE OF amount, amount_paid ON public.pm_charges
  FOR EACH ROW EXECUTE FUNCTION public.pm_charges_sync_status();

-- 6c. Touch updated_at
CREATE TRIGGER trg_pm_charges_touch
  BEFORE UPDATE ON public.pm_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6d. Audit log
CREATE OR REPLACE FUNCTION public.audit_pm_charges_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'pm.charge.create','pm_charge', NEW.id::text, NULL, false,
      NULL,
      jsonb_build_object('tenant_id',NEW.tenant_id,'type',NEW.charge_type,'amount',NEW.amount,'due_date',NEW.due_date,'status',NEW.status),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'pm.charge.update','pm_charge', NEW.id::text, NULL, false,
      jsonb_build_object('amount',OLD.amount,'amount_paid',OLD.amount_paid,'status',OLD.status),
      jsonb_build_object('amount',NEW.amount,'amount_paid',NEW.amount_paid,'status',NEW.status),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'pm.charge.delete','pm_charge', OLD.id::text, NULL, false,
      jsonb_build_object('tenant_id',OLD.tenant_id,'type',OLD.charge_type,'amount',OLD.amount,'status',OLD.status),
      NULL, NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_pm_charges_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pm_charges
  FOR EACH ROW EXECUTE FUNCTION public.audit_pm_charges_change();
