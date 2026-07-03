
-- =========================================================
-- Phase 7A · Migration 3/9 — pm_payment_allocations
-- =========================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.pm_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.pm_payments(id) ON DELETE RESTRICT,
  charge_id  UUID NOT NULL REFERENCES public.pm_charges(id)  ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_id, charge_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_alloc_payment ON public.pm_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_pm_alloc_charge  ON public.pm_payment_allocations(charge_id);

-- 2. GRANTS (before RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_payment_allocations TO authenticated;
GRANT ALL ON public.pm_payment_allocations TO service_role;

-- 3. RLS
ALTER TABLE public.pm_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Tenants read allocations tied to their own payment or charge
CREATE POLICY "Tenants view own allocations"
  ON public.pm_payment_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_payments p
      JOIN public.pm_tenants t ON t.id = p.tenant_id
      WHERE p.id = pm_payment_allocations.payment_id AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.pm_charges c
      JOIN public.pm_tenants t ON t.id = c.tenant_id
      WHERE c.id = pm_payment_allocations.charge_id AND t.user_id = auth.uid()
    )
  );

-- Ops/PM staff read all
CREATE POLICY "Ops staff view all allocations"
  ON public.pm_payment_allocations FOR SELECT
  TO authenticated
  USING (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'leasing_agent'::public.app_role)
  );

-- Ops/PM staff manage allocations (guard trigger enforces integrity + immutability)
CREATE POLICY "Ops staff manage allocations"
  ON public.pm_payment_allocations FOR ALL
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

-- 4. Guard trigger — integrity + locks against cleared-history rewrites
CREATE OR REPLACE FUNCTION public.pm_payment_allocations_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pay      public.pm_payments%ROWTYPE;
  v_old_pay  public.pm_payments%ROWTYPE;
  v_charge   public.pm_charges%ROWTYPE;
  v_pay_alloc_total    NUMERIC(12,2);
  v_charge_alloc_total NUMERIC(12,2);
  v_delta_pay          NUMERIC(12,2);
  v_delta_charge       NUMERIC(12,2);
BEGIN
  -- On DELETE or UPDATE, first evaluate the OLD parent payment lock
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT * INTO v_old_pay FROM public.pm_payments WHERE id = OLD.payment_id;
    IF v_old_pay.status IN ('refunded','reversed','cancelled') THEN
      RAISE EXCEPTION 'Allocations on a % payment (%) are locked. Use a reversal/refund workflow instead of editing history.',
        v_old_pay.status, v_old_pay.payment_number
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Reverse the amount on both sides
    UPDATE public.pm_charges
       SET amount_paid = GREATEST(0, amount_paid - OLD.amount)
     WHERE id = OLD.charge_id;
    UPDATE public.pm_payments
       SET amount_allocated = GREATEST(0, amount_allocated - OLD.amount)
     WHERE id = OLD.payment_id;
    RETURN OLD;
  END IF;

  -- INSERT / UPDATE branch
  SELECT * INTO v_pay    FROM public.pm_payments WHERE id = NEW.payment_id;
  SELECT * INTO v_charge FROM public.pm_charges  WHERE id = NEW.charge_id;

  IF v_pay.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_charge.id IS NULL THEN
    RAISE EXCEPTION 'Charge not found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Cannot allocate against non-usable payments
  IF v_pay.status IN ('failed','cancelled') THEN
    RAISE EXCEPTION 'Cannot allocate a % payment (%)', v_pay.status, v_pay.payment_number
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_pay.status IN ('refunded','reversed') THEN
    RAISE EXCEPTION 'Payment % is % — allocations are locked.', v_pay.payment_number, v_pay.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Tenant on both sides must match
  IF v_pay.tenant_id IS DISTINCT FROM v_charge.tenant_id THEN
    RAISE EXCEPTION 'Payment tenant does not match charge tenant'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Cannot allocate against charges in a terminal non-owed state
  IF v_charge.status IN ('waived','cancelled','written_off') THEN
    RAISE EXCEPTION 'Cannot allocate to a % charge (%)', v_charge.status, v_charge.charge_number
      USING ERRCODE = 'check_violation';
  END IF;

  -- On UPDATE, only amount + notes may change; payment_id and charge_id are immutable
  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.charge_id  IS DISTINCT FROM OLD.charge_id THEN
      RAISE EXCEPTION 'Allocation payment/charge link is immutable. Delete and re-create instead.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Sum totals for the parent payment and charge, excluding this allocation row
  SELECT COALESCE(SUM(amount), 0) INTO v_pay_alloc_total
    FROM public.pm_payment_allocations
   WHERE payment_id = NEW.payment_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  SELECT COALESCE(SUM(amount), 0) INTO v_charge_alloc_total
    FROM public.pm_payment_allocations
   WHERE charge_id = NEW.charge_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_pay_alloc_total + NEW.amount > v_pay.amount + 0.005 THEN
    RAISE EXCEPTION 'Allocations (%.2f) would exceed payment amount (%.2f) on %',
      v_pay_alloc_total + NEW.amount, v_pay.amount, v_pay.payment_number
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_charge_alloc_total + NEW.amount > v_charge.amount + 0.005 THEN
    RAISE EXCEPTION 'Allocations (%.2f) would exceed charge amount (%.2f) on %',
      v_charge_alloc_total + NEW.amount, v_charge.amount, v_charge.charge_number
      USING ERRCODE = 'check_violation';
  END IF;

  -- Compute deltas to apply
  IF TG_OP = 'INSERT' THEN
    v_delta_pay    := NEW.amount;
    v_delta_charge := NEW.amount;
  ELSE
    v_delta_pay    := NEW.amount - OLD.amount;
    v_delta_charge := NEW.amount - OLD.amount;
  END IF;

  UPDATE public.pm_payments
     SET amount_allocated = amount_allocated + v_delta_pay
   WHERE id = NEW.payment_id;

  UPDATE public.pm_charges
     SET amount_paid = amount_paid + v_delta_charge
   WHERE id = NEW.charge_id;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pm_alloc_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.pm_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.pm_payment_allocations_guard();

-- 5. Audit
CREATE OR REPLACE FUNCTION public.audit_pm_allocations_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'pm.allocation.create','pm_payment_allocation', NEW.id::text, NULL, false,
      NULL,
      jsonb_build_object('payment_id',NEW.payment_id,'charge_id',NEW.charge_id,'amount',NEW.amount),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'pm.allocation.update','pm_payment_allocation', NEW.id::text, NULL, false,
      jsonb_build_object('amount',OLD.amount),
      jsonb_build_object('amount',NEW.amount),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'pm.allocation.delete','pm_payment_allocation', OLD.id::text, NULL, false,
      jsonb_build_object('payment_id',OLD.payment_id,'charge_id',OLD.charge_id,'amount',OLD.amount),
      NULL, NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_pm_alloc_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pm_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.audit_pm_allocations_change();

REVOKE ALL ON FUNCTION public.audit_pm_allocations_change() FROM PUBLIC, anon;
