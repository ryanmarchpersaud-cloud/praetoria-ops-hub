
-- =========================================================
-- Phase 7A · Migration 2/9 — pm_payments
-- =========================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.pm_payment_method AS ENUM (
    'cash','cheque','e_transfer','card','ach','manual','stripe','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pm_payment_status AS ENUM (
    'pending','cleared','failed','refunded','reversed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Numbering
CREATE SEQUENCE IF NOT EXISTS public.pm_payment_number_seq START 1;

-- 3. Table
CREATE TABLE IF NOT EXISTS public.pm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE RESTRICT,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  amount_allocated NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_allocated >= 0),
  amount_refunded NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0),
  method public.pm_payment_method NOT NULL,
  status public.pm_payment_status NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  stripe_payment_intent_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  reversal_reason TEXT,
  refund_reason TEXT,
  reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_payments_tenant   ON public.pm_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_payments_lease    ON public.pm_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_payments_property ON public.pm_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_payments_status   ON public.pm_payments(status);
CREATE INDEX IF NOT EXISTS idx_pm_payments_received ON public.pm_payments(received_at);
CREATE INDEX IF NOT EXISTS idx_pm_payments_stripe   ON public.pm_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- 4. GRANTS (before RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_payments TO authenticated;
GRANT ALL ON public.pm_payments TO service_role;
GRANT USAGE ON SEQUENCE public.pm_payment_number_seq TO authenticated, service_role;

-- 5. RLS
ALTER TABLE public.pm_payments ENABLE ROW LEVEL SECURITY;

-- Tenants read own payments
CREATE POLICY "Tenants view own payments"
  ON public.pm_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_tenants t
      WHERE t.id = pm_payments.tenant_id AND t.user_id = auth.uid()
    )
  );

-- Ops/PM staff read all
CREATE POLICY "Ops staff view all payments"
  ON public.pm_payments FOR SELECT
  TO authenticated
  USING (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'leasing_agent'::public.app_role)
  );

-- Ops/PM staff manage (insert/update/delete). Trigger enforces immutability on cleared rows.
CREATE POLICY "Ops staff manage payments"
  ON public.pm_payments FOR ALL
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
CREATE OR REPLACE FUNCTION public.generate_pm_payment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := 'PAY-' || LPAD(nextval('public.pm_payment_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pm_payments_number
  BEFORE INSERT ON public.pm_payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_pm_payment_number();

-- 6b. Touch updated_at
CREATE TRIGGER trg_pm_payments_touch
  BEFORE UPDATE ON public.pm_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6c. Status state machine + cleared-row immutability
CREATE OR REPLACE FUNCTION public.pm_payments_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN := FALSE;
  v_actor UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New rows may only enter as pending, cleared, or failed
    IF NEW.status NOT IN ('pending','cleared','failed') THEN
      RAISE EXCEPTION 'New payment must start as pending, cleared, or failed (got %)', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'cleared' AND NEW.cleared_at IS NULL THEN
      NEW.cleared_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Cleared / refunded / reversed rows are permanent history
    IF OLD.status IN ('cleared','refunded','reversed','partially_refunded') THEN
      RAISE EXCEPTION 'Cannot delete a % payment (%). Use reversal or refund instead.', OLD.status, OLD.payment_number
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF v_actor IS NOT NULL THEN
    v_is_admin := public.is_admin_or_owner(v_actor);
  END IF;

  -- Validate status transitions
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_allowed := CASE OLD.status
      WHEN 'pending'  THEN NEW.status IN ('cleared','failed','cancelled')
      WHEN 'failed'   THEN NEW.status IN ('pending','cancelled')
      WHEN 'cleared'  THEN NEW.status IN ('refunded','reversed')
      WHEN 'refunded' THEN FALSE
      WHEN 'reversed' THEN FALSE
      WHEN 'cancelled' THEN FALSE
      ELSE FALSE
    END;
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Invalid payment status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    -- Stamp transition timestamps
    IF NEW.status = 'cleared'  AND NEW.cleared_at  IS NULL THEN NEW.cleared_at  := now(); END IF;
    IF NEW.status = 'refunded' AND NEW.refunded_at IS NULL THEN NEW.refunded_at := now(); END IF;
    IF NEW.status = 'reversed' AND NEW.reversed_at IS NULL THEN
      NEW.reversed_at := now();
      NEW.reversed_by := COALESCE(NEW.reversed_by, v_actor);
    END IF;
  END IF;

  -- Immutability of cleared history: once cleared/refunded/reversed, only refund/reversal-related
  -- and internal_notes may change. Everything else is frozen. Admin cannot override.
  IF OLD.status IN ('cleared','refunded','reversed') THEN
    IF NEW.tenant_id   IS DISTINCT FROM OLD.tenant_id
    OR NEW.lease_id    IS DISTINCT FROM OLD.lease_id
    OR NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.amount      IS DISTINCT FROM OLD.amount
    OR NEW.method      IS DISTINCT FROM OLD.method
    OR NEW.received_at IS DISTINCT FROM OLD.received_at
    OR NEW.cleared_at  IS DISTINCT FROM OLD.cleared_at
    OR NEW.external_ref IS DISTINCT FROM OLD.external_ref
    OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
    OR NEW.payment_number IS DISTINCT FROM OLD.payment_number
    OR NEW.created_by  IS DISTINCT FROM OLD.created_by
    OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Cleared payment % is immutable. Only refund/reversal fields and internal notes may be updated.', OLD.payment_number
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Refund amount cannot exceed original
  IF NEW.amount_refunded > NEW.amount THEN
    RAISE EXCEPTION 'Refunded amount (%.2f) exceeds payment amount (%.2f)', NEW.amount_refunded, NEW.amount
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_pm_payments_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.pm_payments
  FOR EACH ROW EXECUTE FUNCTION public.pm_payments_guard();

-- 6d. Audit log
CREATE OR REPLACE FUNCTION public.audit_pm_payments_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'pm.payment.create','pm_payment', NEW.id::text, NULL, false,
      NULL,
      jsonb_build_object('tenant_id',NEW.tenant_id,'amount',NEW.amount,'method',NEW.method,'status',NEW.status),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      CASE
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'pm.payment.status_change'
        ELSE 'pm.payment.update'
      END,
      'pm_payment', NEW.id::text, NULL, false,
      jsonb_build_object('status',OLD.status,'amount_refunded',OLD.amount_refunded),
      jsonb_build_object('status',NEW.status,'amount_refunded',NEW.amount_refunded,'reversal_reason',NEW.reversal_reason,'refund_reason',NEW.refund_reason),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'pm.payment.delete','pm_payment', OLD.id::text, NULL, false,
      jsonb_build_object('tenant_id',OLD.tenant_id,'amount',OLD.amount,'status',OLD.status),
      NULL, NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_pm_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pm_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_pm_payments_change();

-- 7. Revoke public execute on new SECURITY DEFINER audit function (least privilege)
REVOKE ALL ON FUNCTION public.audit_pm_payments_change() FROM PUBLIC, anon;
