
-- Enums
CREATE TYPE public.pm_credit_source AS ENUM ('overpayment','goodwill','deposit_refund','correction','other');
CREATE TYPE public.pm_credit_status AS ENUM ('available','partially_consumed','fully_consumed','void');

-- Sequence for CRD-##### numbering
CREATE SEQUENCE IF NOT EXISTS public.pm_credit_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_pm_credit_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.pm_credit_number_seq');
  RETURN 'CRD-' || LPAD(n::text, 5, '0');
END;
$$;

-- Table
CREATE TABLE public.pm_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_number TEXT NOT NULL UNIQUE DEFAULT public.generate_pm_credit_number(),
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE RESTRICT,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  source public.pm_credit_source NOT NULL,
  source_payment_id UUID REFERENCES public.pm_payments(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  consumed_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (consumed_amount >= 0),
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  status public.pm_credit_status NOT NULL DEFAULT 'available',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_credits_tenant ON public.pm_credits(tenant_id);
CREATE INDEX idx_pm_credits_lease ON public.pm_credits(lease_id);
CREATE INDEX idx_pm_credits_status ON public.pm_credits(status);
CREATE INDEX idx_pm_credits_source_payment ON public.pm_credits(source_payment_id);

-- GRANTs (no anon; tenants/staff only via authenticated + RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_credits TO authenticated;
GRANT ALL ON public.pm_credits TO service_role;
GRANT USAGE ON SEQUENCE public.pm_credit_number_seq TO authenticated, service_role;

-- Enable RLS
ALTER TABLE public.pm_credits ENABLE ROW LEVEL SECURITY;

-- Policies
-- Tenants: view own credits only
CREATE POLICY "Tenants view own credits"
ON public.pm_credits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pm_tenants t
    WHERE t.id = pm_credits.tenant_id
      AND t.user_id = auth.uid()
  )
);

-- Ops / PM staff: full manage
CREATE POLICY "Ops and PM staff view credits"
ON public.pm_credits
FOR SELECT
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "Ops and PM staff insert credits"
ON public.pm_credits
FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "Ops and PM staff update credits"
ON public.pm_credits
FOR UPDATE
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

CREATE POLICY "Ops and PM staff delete credits"
ON public.pm_credits
FOR DELETE
TO authenticated
USING (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.pm_credits_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_credits_touch
BEFORE UPDATE ON public.pm_credits
FOR EACH ROW EXECUTE FUNCTION public.pm_credits_touch_updated_at();

-- Integrity + status guard
CREATE OR REPLACE FUNCTION public.pm_credits_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.consumed_amount > NEW.amount THEN
      RAISE EXCEPTION 'consumed_amount (%) cannot exceed amount (%)', NEW.consumed_amount, NEW.amount;
    END IF;
    NEW.remaining_amount := NEW.amount - NEW.consumed_amount;
    IF NEW.status <> 'void' THEN
      IF NEW.consumed_amount = 0 THEN
        NEW.status := 'available';
      ELSIF NEW.consumed_amount < NEW.amount THEN
        NEW.status := 'partially_consumed';
      ELSE
        NEW.status := 'fully_consumed';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Void is terminal / immutable except un-voiding is disallowed
    IF OLD.status = 'void' AND NEW.status <> 'void' THEN
      RAISE EXCEPTION 'Void credits are immutable';
    END IF;
    IF OLD.status = 'void' THEN
      -- Block content changes on void rows
      IF NEW.amount <> OLD.amount OR NEW.consumed_amount <> OLD.consumed_amount OR NEW.source <> OLD.source OR NEW.tenant_id <> OLD.tenant_id THEN
        RAISE EXCEPTION 'Void credits are immutable';
      END IF;
    END IF;

    IF NEW.consumed_amount > NEW.amount THEN
      RAISE EXCEPTION 'consumed_amount (%) cannot exceed amount (%)', NEW.consumed_amount, NEW.amount;
    END IF;

    NEW.remaining_amount := NEW.amount - NEW.consumed_amount;

    IF NEW.status = 'void' THEN
      IF NEW.voided_at IS NULL THEN NEW.voided_at := now(); END IF;
    ELSE
      IF NEW.consumed_amount = 0 THEN
        NEW.status := 'available';
      ELSIF NEW.consumed_amount < NEW.amount THEN
        NEW.status := 'partially_consumed';
      ELSE
        NEW.status := 'fully_consumed';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_credits_guard
BEFORE INSERT OR UPDATE ON public.pm_credits
FOR EACH ROW EXECUTE FUNCTION public.pm_credits_guard();

-- Block delete when consumption history exists
CREATE OR REPLACE FUNCTION public.pm_credits_block_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.consumed_amount > 0 THEN
    RAISE EXCEPTION 'Cannot delete credit % with consumption history; void it instead', OLD.credit_number;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_pm_credits_block_delete
BEFORE DELETE ON public.pm_credits
FOR EACH ROW EXECUTE FUNCTION public.pm_credits_block_delete();

-- Audit logging (mirrors pm_charges / pm_payments pattern)
CREATE OR REPLACE FUNCTION public.audit_pm_credits_change()
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
    'pm_credit',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'credit_number', COALESCE(NEW.credit_number, OLD.credit_number),
      'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
      'source', COALESCE(NEW.source, OLD.source),
      'amount', COALESCE(NEW.amount, OLD.amount),
      'consumed_amount', COALESCE(NEW.consumed_amount, OLD.consumed_amount),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_pm_credits_audit
AFTER INSERT OR UPDATE OR DELETE ON public.pm_credits
FOR EACH ROW EXECUTE FUNCTION public.audit_pm_credits_change();
