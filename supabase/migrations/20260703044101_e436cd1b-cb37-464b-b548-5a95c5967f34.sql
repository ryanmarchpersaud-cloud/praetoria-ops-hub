
-- Enum for receipt status
CREATE TYPE public.pm_receipt_status AS ENUM ('issued','superseded','voided');

-- Sequence for RCPT-##### numbering
CREATE SEQUENCE IF NOT EXISTS public.pm_receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_pm_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.pm_receipt_number_seq');
  RETURN 'RCPT-' || LPAD(n::text, 5, '0');
END;
$$;

-- Table
CREATE TABLE public.pm_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE DEFAULT public.generate_pm_receipt_number(),
  payment_id UUID NOT NULL REFERENCES public.pm_payments(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE RESTRICT,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method public.pm_payment_method NOT NULL,
  cleared_at TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.pm_receipt_status NOT NULL DEFAULT 'issued',
  refunded_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  refund_note TEXT,
  reversal_note TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pm_receipts_one_active_per_payment
    EXCLUDE (payment_id WITH =) WHERE (status = 'issued')
);

CREATE INDEX idx_pm_receipts_tenant ON public.pm_receipts(tenant_id);
CREATE INDEX idx_pm_receipts_payment ON public.pm_receipts(payment_id);
CREATE INDEX idx_pm_receipts_status ON public.pm_receipts(status);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.pm_receipts TO authenticated;
GRANT ALL ON public.pm_receipts TO service_role;
GRANT USAGE ON SEQUENCE public.pm_receipt_number_seq TO authenticated, service_role;

-- Enable RLS
ALTER TABLE public.pm_receipts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenants view own receipts"
ON public.pm_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pm_tenants t
    WHERE t.id = pm_receipts.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Ops and PM staff view receipts"
ON public.pm_receipts
FOR SELECT
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "Ops and PM staff insert receipts"
ON public.pm_receipts
FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "Ops and PM staff update receipts"
ON public.pm_receipts
FOR UPDATE
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- No DELETE policy: receipts are non-destructive; hard delete blocked by trigger below

-- updated_at
CREATE OR REPLACE FUNCTION public.pm_receipts_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_receipts_touch
BEFORE UPDATE ON public.pm_receipts
FOR EACH ROW EXECUTE FUNCTION public.pm_receipts_touch_updated_at();

-- Guard: keep history non-destructive; enforce transitions
CREATE OR REPLACE FUNCTION public.pm_receipts_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Immutable snapshot fields
    IF NEW.amount <> OLD.amount OR NEW.method <> OLD.method
       OR NEW.cleared_at <> OLD.cleared_at OR NEW.payment_id <> OLD.payment_id
       OR NEW.tenant_id <> OLD.tenant_id OR NEW.receipt_number <> OLD.receipt_number THEN
      RAISE EXCEPTION 'Receipt snapshot fields are immutable';
    END IF;

    -- Voided is terminal
    IF OLD.status = 'voided' AND NEW.status <> 'voided' THEN
      RAISE EXCEPTION 'Voided receipts are immutable';
    END IF;

    IF NEW.status = 'voided' AND OLD.status <> 'voided' THEN
      NEW.voided_at := COALESCE(NEW.voided_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_receipts_guard
BEFORE UPDATE ON public.pm_receipts
FOR EACH ROW EXECUTE FUNCTION public.pm_receipts_guard();

-- Block hard delete entirely (mark voided instead)
CREATE OR REPLACE FUNCTION public.pm_receipts_block_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Receipts cannot be deleted; void the receipt to preserve history';
END;
$$;

CREATE TRIGGER trg_pm_receipts_block_delete
BEFORE DELETE ON public.pm_receipts
FOR EACH ROW EXECUTE FUNCTION public.pm_receipts_block_delete();

-- Auto-create on payment cleared, annotate on refund/reversal
CREATE OR REPLACE FUNCTION public.pm_receipts_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-create receipt when payment first becomes cleared
  IF NEW.status = 'cleared' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cleared') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pm_receipts r
      WHERE r.payment_id = NEW.id AND r.status = 'issued'
    ) THEN
      INSERT INTO public.pm_receipts (
        payment_id, tenant_id, lease_id, property_id,
        amount, method, cleared_at
      ) VALUES (
        NEW.id, NEW.tenant_id, NEW.lease_id, NEW.property_id,
        NEW.amount, NEW.method, COALESCE(NEW.cleared_at, now())
      );
    END IF;
  END IF;

  -- Annotate on refund (do not erase)
  IF TG_OP = 'UPDATE' AND NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    UPDATE public.pm_receipts
      SET refunded_at = COALESCE(NEW.refunded_at, now()),
          refund_note = NEW.refund_reason
      WHERE payment_id = NEW.id AND status = 'issued';
  END IF;

  -- Annotate on reversal (do not erase)
  IF TG_OP = 'UPDATE' AND NEW.status = 'reversed' AND OLD.status IS DISTINCT FROM 'reversed' THEN
    UPDATE public.pm_receipts
      SET reversed_at = COALESCE(NEW.reversed_at, now()),
          reversal_note = NEW.reversal_reason
      WHERE payment_id = NEW.id AND status = 'issued';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_receipts_from_payment
AFTER INSERT OR UPDATE ON public.pm_payments
FOR EACH ROW EXECUTE FUNCTION public.pm_receipts_from_payment();

-- Audit
CREATE OR REPLACE FUNCTION public.audit_pm_receipts_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id, action, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(),
    TG_OP,
    'pm_receipt',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'receipt_number', COALESCE(NEW.receipt_number, OLD.receipt_number),
      'payment_id', COALESCE(NEW.payment_id, OLD.payment_id),
      'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
      'amount', COALESCE(NEW.amount, OLD.amount),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_pm_receipts_audit
AFTER INSERT OR UPDATE ON public.pm_receipts
FOR EACH ROW EXECUTE FUNCTION public.audit_pm_receipts_change();
