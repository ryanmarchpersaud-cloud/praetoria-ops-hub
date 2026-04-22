
-- Generic before/after diff trigger function
CREATE OR REPLACE FUNCTION public.audit_high_risk_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed jsonb := '{}'::jsonb;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_key text;
  v_old jsonb;
  v_new jsonb;
  v_action text;
  v_target_id text;
  v_customer_id uuid;
BEGIN
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);

  -- Compute delta of changed columns
  FOR v_key IN SELECT jsonb_object_keys(v_new)
  LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key)
       AND v_key NOT IN ('updated_at', 'created_at')
    THEN
      v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
      v_after  := v_after  || jsonb_build_object(v_key, v_new -> v_key);
    END IF;
  END LOOP;

  -- If nothing meaningful changed, skip
  IF v_before = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  v_action := TG_TABLE_NAME || '.update';
  v_target_id := COALESCE((v_new ->> 'id'), (v_old ->> 'id'));

  -- Best-effort customer scope for tenant filtering
  IF (v_new ? 'customer_id') THEN
    BEGIN
      v_customer_id := (v_new ->> 'customer_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_customer_id := NULL;
    END;
  END IF;

  PERFORM public.write_audit_log(
    v_action,
    TG_TABLE_NAME,
    v_target_id,
    v_customer_id,
    true,
    v_before,
    v_after,
    NULL, NULL, NULL
  );

  RETURN NEW;
END;
$$;

-- Attach to high-risk tables (idempotent)
DROP TRIGGER IF EXISTS trg_audit_invoices_update ON public.invoices;
CREATE TRIGGER trg_audit_invoices_update
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_high_risk_update();

DROP TRIGGER IF EXISTS trg_audit_customers_update ON public.customers;
CREATE TRIGGER trg_audit_customers_update
  AFTER UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_high_risk_update();

DROP TRIGGER IF EXISTS trg_audit_pay_stubs_update ON public.employee_pay_stubs;
CREATE TRIGGER trg_audit_pay_stubs_update
  AFTER UPDATE ON public.employee_pay_stubs
  FOR EACH ROW EXECUTE FUNCTION public.audit_high_risk_update();

DROP TRIGGER IF EXISTS trg_audit_finance_accounts_update ON public.finance_accounts;
CREATE TRIGGER trg_audit_finance_accounts_update
  AFTER UPDATE ON public.finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_high_risk_update();
