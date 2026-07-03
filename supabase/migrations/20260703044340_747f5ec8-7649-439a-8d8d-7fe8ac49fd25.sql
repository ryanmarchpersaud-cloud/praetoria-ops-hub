
-- Event type enum
CREATE TYPE public.pm_finance_activity_type AS ENUM (
  'charge_created','charge_updated','charge_voided','charge_waived','charge_settled',
  'payment_received','payment_cleared','payment_failed','payment_refunded','payment_reversed','payment_cancelled',
  'allocation_created','allocation_removed',
  'credit_issued','credit_consumed','credit_voided',
  'receipt_issued','receipt_annotated','receipt_voided'
);

CREATE TABLE public.pm_finance_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  event_type public.pm_finance_activity_type NOT NULL,
  related_resource_type TEXT NOT NULL,
  related_resource_id UUID,
  related_reference TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_finance_activity_tenant_time ON public.pm_finance_activity(tenant_id, occurred_at DESC);
CREATE INDEX idx_pm_finance_activity_lease ON public.pm_finance_activity(lease_id);
CREATE INDEX idx_pm_finance_activity_type ON public.pm_finance_activity(event_type);
CREATE INDEX idx_pm_finance_activity_related ON public.pm_finance_activity(related_resource_type, related_resource_id);

-- Grants (append-only surface for authenticated; RLS controls read)
GRANT SELECT, INSERT ON public.pm_finance_activity TO authenticated;
GRANT ALL ON public.pm_finance_activity TO service_role;

-- Enable RLS
ALTER TABLE public.pm_finance_activity ENABLE ROW LEVEL SECURITY;

-- Tenants: read own only
CREATE POLICY "Tenants view own finance activity"
ON public.pm_finance_activity
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pm_tenants t
    WHERE t.id = pm_finance_activity.tenant_id
      AND t.user_id = auth.uid()
  )
);

-- Ops / PM staff: read all
CREATE POLICY "Ops and PM staff view finance activity"
ON public.pm_finance_activity
FOR SELECT
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- Ops / PM staff: manual insert (triggers use SECURITY DEFINER)
CREATE POLICY "Ops and PM staff insert finance activity"
ON public.pm_finance_activity
FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- Append-only guards: block updates and deletes
CREATE OR REPLACE FUNCTION public.pm_finance_activity_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'pm_finance_activity is append-only';
END;
$$;

CREATE TRIGGER trg_pm_finance_activity_no_update
BEFORE UPDATE ON public.pm_finance_activity
FOR EACH ROW EXECUTE FUNCTION public.pm_finance_activity_block_mutation();

CREATE TRIGGER trg_pm_finance_activity_no_delete
BEFORE DELETE ON public.pm_finance_activity
FOR EACH ROW EXECUTE FUNCTION public.pm_finance_activity_block_mutation();

-- Safe insert helper (never records sensitive payment method details)
CREATE OR REPLACE FUNCTION public.pm_finance_activity_write(
  p_tenant_id UUID,
  p_lease_id UUID,
  p_property_id UUID,
  p_event_type public.pm_finance_activity_type,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_reference TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pm_finance_activity (
    tenant_id, lease_id, property_id, event_type,
    related_resource_type, related_resource_id, related_reference,
    message, metadata, actor_id
  ) VALUES (
    p_tenant_id, p_lease_id, p_property_id, p_event_type,
    p_resource_type, p_resource_id, p_reference,
    p_message, COALESCE(p_metadata, '{}'::jsonb), auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pm_finance_activity_write(UUID,UUID,UUID,public.pm_finance_activity_type,TEXT,UUID,TEXT,TEXT,JSONB) FROM PUBLIC, anon;

-- ============================================================
-- Trigger: pm_charges
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_charges_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evt public.pm_finance_activity_type;
  v_msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_evt := 'charge_created';
    v_msg := 'Charge ' || NEW.charge_number || ' issued for $' || to_char(NEW.amount, 'FM999999990.00');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'void' AND OLD.status <> 'void' THEN
      v_evt := 'charge_voided';
      v_msg := 'Charge ' || NEW.charge_number || ' voided';
    ELSIF NEW.status = 'waived' AND OLD.status <> 'waived' THEN
      v_evt := 'charge_waived';
      v_msg := 'Charge ' || NEW.charge_number || ' waived';
    ELSIF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
      v_evt := 'charge_settled';
      v_msg := 'Charge ' || NEW.charge_number || ' fully paid';
    ELSE
      v_evt := 'charge_updated';
      v_msg := 'Charge ' || NEW.charge_number || ' updated';
    END IF;
  END IF;

  PERFORM public.pm_finance_activity_write(
    NEW.tenant_id, NEW.lease_id, NEW.property_id,
    v_evt, 'pm_charge', NEW.id, NEW.charge_number,
    v_msg,
    jsonb_build_object('amount', NEW.amount, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_charges_activity
AFTER INSERT OR UPDATE ON public.pm_charges
FOR EACH ROW EXECUTE FUNCTION public.pm_charges_activity();

-- ============================================================
-- Trigger: pm_payments  (method is NEVER included in message/metadata)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_payments_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evt public.pm_finance_activity_type;
  v_msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_evt := 'payment_received';
    v_msg := 'Payment ' || NEW.payment_number || ' recorded for $' || to_char(NEW.amount, 'FM999999990.00');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_evt := CASE NEW.status
      WHEN 'cleared'   THEN 'payment_cleared'
      WHEN 'failed'    THEN 'payment_failed'
      WHEN 'refunded'  THEN 'payment_refunded'
      WHEN 'reversed'  THEN 'payment_reversed'
      WHEN 'cancelled' THEN 'payment_cancelled'
      ELSE NULL
    END;
    IF v_evt IS NULL THEN RETURN NEW; END IF;
    v_msg := 'Payment ' || NEW.payment_number || ' ' || NEW.status::text;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.pm_finance_activity_write(
    NEW.tenant_id, NEW.lease_id, NEW.property_id,
    v_evt, 'pm_payment', NEW.id, NEW.payment_number,
    v_msg,
    jsonb_build_object('amount', NEW.amount, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_payments_activity
AFTER INSERT OR UPDATE ON public.pm_payments
FOR EACH ROW EXECUTE FUNCTION public.pm_payments_activity();

-- ============================================================
-- Trigger: pm_payment_allocations
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_allocations_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
  v_lease UUID;
  v_property UUID;
  v_pay_num TEXT;
  v_chg_num TEXT;
  v_amount NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT tenant_id, lease_id, property_id, payment_number INTO v_tenant, v_lease, v_property, v_pay_num
      FROM public.pm_payments WHERE id = NEW.payment_id;
    SELECT charge_number INTO v_chg_num FROM public.pm_charges WHERE id = NEW.charge_id;
    v_amount := NEW.amount;
    PERFORM public.pm_finance_activity_write(
      v_tenant, v_lease, v_property,
      'allocation_created', 'pm_payment_allocation', NEW.id, v_pay_num,
      'Allocated $' || to_char(v_amount, 'FM999999990.00') || ' from ' || v_pay_num || ' to ' || v_chg_num,
      jsonb_build_object('amount', v_amount, 'payment_id', NEW.payment_id, 'charge_id', NEW.charge_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT tenant_id, lease_id, property_id, payment_number INTO v_tenant, v_lease, v_property, v_pay_num
      FROM public.pm_payments WHERE id = OLD.payment_id;
    SELECT charge_number INTO v_chg_num FROM public.pm_charges WHERE id = OLD.charge_id;
    PERFORM public.pm_finance_activity_write(
      v_tenant, v_lease, v_property,
      'allocation_removed', 'pm_payment_allocation', OLD.id, v_pay_num,
      'Removed allocation of $' || to_char(OLD.amount, 'FM999999990.00') || ' from ' || COALESCE(v_pay_num,'payment') || ' to ' || COALESCE(v_chg_num,'charge'),
      jsonb_build_object('amount', OLD.amount, 'payment_id', OLD.payment_id, 'charge_id', OLD.charge_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_pm_allocations_activity
AFTER INSERT OR DELETE ON public.pm_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.pm_allocations_activity();

-- ============================================================
-- Trigger: pm_credits
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_credits_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evt public.pm_finance_activity_type;
  v_msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_evt := 'credit_issued';
    v_msg := 'Credit ' || NEW.credit_number || ' issued for $' || to_char(NEW.amount, 'FM999999990.00') || ' (' || NEW.source::text || ')';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'void' AND OLD.status <> 'void' THEN
      v_evt := 'credit_voided';
      v_msg := 'Credit ' || NEW.credit_number || ' voided';
    ELSIF NEW.consumed_amount > OLD.consumed_amount THEN
      v_evt := 'credit_consumed';
      v_msg := 'Credit ' || NEW.credit_number || ' consumed $' || to_char(NEW.consumed_amount - OLD.consumed_amount, 'FM999999990.00');
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.pm_finance_activity_write(
    NEW.tenant_id, NEW.lease_id, NEW.property_id,
    v_evt, 'pm_credit', NEW.id, NEW.credit_number,
    v_msg,
    jsonb_build_object('amount', NEW.amount, 'remaining', NEW.remaining_amount, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_credits_activity
AFTER INSERT OR UPDATE ON public.pm_credits
FOR EACH ROW EXECUTE FUNCTION public.pm_credits_activity();

-- ============================================================
-- Trigger: pm_receipts
-- ============================================================
CREATE OR REPLACE FUNCTION public.pm_receipts_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evt public.pm_finance_activity_type;
  v_msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_evt := 'receipt_issued';
    v_msg := 'Receipt ' || NEW.receipt_number || ' issued for $' || to_char(NEW.amount, 'FM999999990.00');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'voided' AND OLD.status <> 'voided' THEN
      v_evt := 'receipt_voided';
      v_msg := 'Receipt ' || NEW.receipt_number || ' voided';
    ELSIF (NEW.refunded_at IS NOT NULL AND OLD.refunded_at IS NULL)
       OR (NEW.reversed_at IS NOT NULL AND OLD.reversed_at IS NULL) THEN
      v_evt := 'receipt_annotated';
      v_msg := 'Receipt ' || NEW.receipt_number || ' annotated (refund/reversal noted)';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.pm_finance_activity_write(
    NEW.tenant_id, NEW.lease_id, NEW.property_id,
    v_evt, 'pm_receipt', NEW.id, NEW.receipt_number,
    v_msg,
    jsonb_build_object('amount', NEW.amount, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_receipts_activity
AFTER INSERT OR UPDATE ON public.pm_receipts
FOR EACH ROW EXECUTE FUNCTION public.pm_receipts_activity();
