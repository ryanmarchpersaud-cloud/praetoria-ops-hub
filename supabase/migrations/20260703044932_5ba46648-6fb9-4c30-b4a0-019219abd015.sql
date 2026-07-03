
-- Phase 7A · Migration 8 of 9
-- Adds read-only aging helpers. Leaves pm_get_tenant_balance / pm_my_balance untouched.

-- Aging report for a specific tenant (ops staff OR the tenant themselves).
CREATE OR REPLACE FUNCTION public.pm_get_tenant_aging(p_tenant_id uuid)
RETURNS TABLE(
  tenant_id      uuid,
  balance        numeric,
  current_amt    numeric,
  d_0_30         numeric,
  d_31_60        numeric,
  d_61_90        numeric,
  d_90_plus      numeric,
  oldest_due     date,
  as_of          date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
  v_today date := (now() AT TIME ZONE 'America/Regina')::date;
  v_credit numeric := 0;
  v_current numeric := 0;
  v_b1 numeric := 0;
  v_b2 numeric := 0;
  v_b3 numeric := 0;
  v_b4 numeric := 0;
  v_oldest date := NULL;
  r RECORD;
  v_remaining numeric;
  v_apply numeric;
  v_days_past int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.is_ops_staff(v_actor) THEN
    v_allowed := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.pm_tenants
      WHERE id = p_tenant_id AND user_id = v_actor
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view this tenant aging' USING ERRCODE = '42501';
  END IF;

  -- Sum of credit-like entries (payments, credits, refunds out to tenant, adjustments).
  SELECT COALESCE(SUM(amount), 0) INTO v_credit
  FROM public.pm_tenant_ledger
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('waived','cancelled','reversed','note')
    AND type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit');

  -- Walk charge rows oldest-first, apply available credit FIFO, bucket remainder.
  FOR r IN
    SELECT
      COALESCE(due_date, entry_date, created_at::date) AS effective_due,
      amount
    FROM public.pm_tenant_ledger
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('waived','cancelled','reversed','note')
      AND type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee')
    ORDER BY COALESCE(due_date, entry_date, created_at::date) ASC, created_at ASC
  LOOP
    v_remaining := COALESCE(r.amount, 0);

    IF v_credit > 0 THEN
      v_apply := LEAST(v_credit, v_remaining);
      v_credit := v_credit - v_apply;
      v_remaining := v_remaining - v_apply;
    END IF;

    IF v_remaining <= 0 THEN
      CONTINUE;
    END IF;

    -- Track oldest still-outstanding due date.
    IF v_oldest IS NULL OR r.effective_due < v_oldest THEN
      v_oldest := r.effective_due;
    END IF;

    v_days_past := (v_today - r.effective_due);

    IF v_days_past <= 0 THEN
      v_current := v_current + v_remaining;
    ELSIF v_days_past <= 30 THEN
      v_b1 := v_b1 + v_remaining;
    ELSIF v_days_past <= 60 THEN
      v_b2 := v_b2 + v_remaining;
    ELSIF v_days_past <= 90 THEN
      v_b3 := v_b3 + v_remaining;
    ELSE
      v_b4 := v_b4 + v_remaining;
    END IF;
  END LOOP;

  -- Any leftover credit is surfaced as a negative "current" (tenant has a positive credit balance).
  IF v_credit > 0 THEN
    v_current := v_current - v_credit;
  END IF;

  tenant_id   := p_tenant_id;
  balance     := v_current + v_b1 + v_b2 + v_b3 + v_b4;
  current_amt := v_current;
  d_0_30      := v_b1;
  d_31_60     := v_b2;
  d_61_90     := v_b3;
  d_90_plus   := v_b4;
  oldest_due  := v_oldest;
  as_of       := v_today;
  RETURN NEXT;
  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.pm_get_tenant_aging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_get_tenant_aging(uuid) TO authenticated, service_role;

-- Tenant-scoped convenience wrapper.
CREATE OR REPLACE FUNCTION public.pm_my_aging()
RETURNS TABLE(
  tenant_id      uuid,
  balance        numeric,
  current_amt    numeric,
  d_0_30         numeric,
  d_31_60        numeric,
  d_61_90        numeric,
  d_90_plus      numeric,
  oldest_due     date,
  as_of          date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_tenant
  FROM public.pm_tenants
  WHERE user_id = v_actor
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tenant IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.pm_get_tenant_aging(v_tenant);
END;
$function$;

REVOKE ALL ON FUNCTION public.pm_my_aging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_my_aging() TO authenticated, service_role;
