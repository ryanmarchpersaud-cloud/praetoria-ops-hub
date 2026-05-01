-- 1) Add metadata to customer_warnings
ALTER TABLE public.customer_warnings
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_warnings_active ON public.customer_warnings(customer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_warnings_severity ON public.customer_warnings(severity) WHERE is_active = true;

-- 2) Helper: bool — does customer have any active warnings?
CREATE OR REPLACE FUNCTION public.customer_has_active_warnings(_customer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.customer_warnings WHERE customer_id = _customer_id AND is_active = true);
$$;

-- 3) Helper: match a person to existing customers by email/phone, return matching customer ids (only those with active warnings)
CREATE OR REPLACE FUNCTION public.match_flagged_customers(_email text, _phone text)
RETURNS TABLE(customer_id uuid, match_field text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT c.id, 'email'::text
  FROM public.customers c
  WHERE _email IS NOT NULL AND _email <> ''
    AND lower(c.email) = lower(_email)
    AND public.customer_has_active_warnings(c.id)
  UNION
  SELECT DISTINCT c.id, 'phone'::text
  FROM public.customers c
  WHERE _phone IS NOT NULL AND _phone <> ''
    AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
    AND length(regexp_replace(_phone, '\D', '', 'g')) >= 7
    AND public.customer_has_active_warnings(c.id);
$$;

-- 4) Auto-flag: invoice overdue > 60 days
CREATE OR REPLACE FUNCTION public.auto_flag_overdue_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_days int; v_already boolean;
BEGIN
  IF NEW.customer_id IS NULL OR NEW.due_date IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.balance_due, 0) <= 0 THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('Sent','Overdue','Partial') THEN RETURN NEW; END IF;

  v_days := (CURRENT_DATE - NEW.due_date::date);
  IF v_days < 60 THEN RETURN NEW; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.customer_warnings
    WHERE customer_id = NEW.customer_id
      AND warning_type = 'payment_issue'
      AND auto_generated = true
      AND source = 'invoice:' || NEW.id::text
      AND is_active = true
  ) INTO v_already;

  IF v_already THEN RETURN NEW; END IF;

  INSERT INTO public.customer_warnings(customer_id, warning_type, severity, description, is_active, auto_generated, source)
  VALUES (
    NEW.customer_id, 'payment_issue', 'high',
    'Auto-flagged: Invoice ' || COALESCE(NEW.invoice_number,'') || ' is ' || v_days || ' days overdue ($' || COALESCE(NEW.balance_due,0)::text || ').',
    true, true, 'invoice:' || NEW.id::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_flag_overdue_invoice ON public.invoices;
CREATE TRIGGER trg_auto_flag_overdue_invoice
AFTER INSERT OR UPDATE OF due_date, balance_due, status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.auto_flag_overdue_invoice();

-- 5) Auto-flag: agreement cancelled before expiry
CREATE OR REPLACE FUNCTION public.auto_flag_early_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_already boolean;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('Cancelled','Terminated','Voided') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  -- only flag if cancelled before expiry (or no expiry but had been signed)
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN RETURN NEW; END IF;
  IF NEW.signed_at IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.customer_warnings
    WHERE customer_id = NEW.customer_id
      AND auto_generated = true
      AND source = 'agreement:' || NEW.id::text
      AND is_active = true
  ) INTO v_already;
  IF v_already THEN RETURN NEW; END IF;

  INSERT INTO public.customer_warnings(customer_id, warning_type, severity, description, is_active, auto_generated, source)
  VALUES (
    NEW.customer_id, 'general', 'high',
    'Auto-flagged: Service agreement "' || COALESCE(NEW.title,'') || '" was ended early (status: ' || NEW.status || ').',
    true, true, 'agreement:' || NEW.id::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_flag_early_cancellation ON public.agreements;
CREATE TRIGGER trg_auto_flag_early_cancellation
AFTER UPDATE OF status ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.auto_flag_early_cancellation();