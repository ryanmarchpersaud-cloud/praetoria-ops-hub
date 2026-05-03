CREATE OR REPLACE FUNCTION public.auto_flag_overdue_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_already boolean;
BEGIN
  IF NEW.customer_id IS NULL OR NEW.due_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.balance_due, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('Sent', 'Overdue', 'Partially Paid') THEN
    RETURN NEW;
  END IF;

  v_days := (CURRENT_DATE - NEW.due_date::date);
  IF v_days < 60 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.customer_warnings
    WHERE customer_id = NEW.customer_id
      AND warning_type = 'payment_issue'
      AND auto_generated = true
      AND source = 'invoice:' || NEW.id::text
      AND is_active = true
  ) INTO v_already;

  IF v_already THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_warnings(customer_id, warning_type, severity, description, is_active, auto_generated, source)
  VALUES (
    NEW.customer_id,
    'payment_issue',
    'high',
    'Auto-flagged: Invoice ' || COALESCE(NEW.invoice_number,'') || ' is ' || v_days || ' days overdue ($' || COALESCE(NEW.balance_due,0)::text || ').',
    true,
    true,
    'invoice:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;