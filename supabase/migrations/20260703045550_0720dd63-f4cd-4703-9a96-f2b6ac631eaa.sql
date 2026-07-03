
-- Phase 7A · Migration 9 of 9

-- 1. BACKFILL (idempotent; no-op when legacy ledger empty)
INSERT INTO public.pm_charges (
  tenant_id, lease_id, property_id, unit_id,
  charge_type, amount, amount_paid,
  status, due_date, period_start, period_end,
  description, source_table, source_id, source_ref,
  created_by, created_at
)
SELECT
  l.tenant_id, l.lease_id, l.property_id, l.unit_id,
  CASE l.type
    WHEN 'rent_charge'       THEN 'rent'::pm_charge_type
    WHEN 'late_fee'          THEN 'late_fee'::pm_charge_type
    WHEN 'deposit'           THEN 'deposit'::pm_charge_type
    WHEN 'nsf_fee'           THEN 'nsf_fee'::pm_charge_type
    WHEN 'adjustment_charge' THEN 'adjustment_charge'::pm_charge_type
    ELSE 'other'::pm_charge_type
  END,
  l.amount, 0::numeric,
  CASE l.status
    WHEN 'waived'    THEN 'waived'::pm_charge_status
    WHEN 'cancelled' THEN 'cancelled'::pm_charge_status
    WHEN 'reversed'  THEN 'cancelled'::pm_charge_status
    ELSE 'open'::pm_charge_status
  END,
  COALESCE(l.due_date, l.entry_date, l.created_at::date),
  l.period_start, l.period_end,
  l.description, 'pm_tenant_ledger', l.id, l.reference,
  l.created_by, l.created_at
FROM public.pm_tenant_ledger l
WHERE l.type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee')
  AND NOT EXISTS (
    SELECT 1 FROM public.pm_charges c
    WHERE c.source_table = 'pm_tenant_ledger' AND c.source_id = l.id
  );

INSERT INTO public.pm_payments (
  tenant_id, lease_id, property_id,
  amount, amount_allocated, amount_refunded,
  method, status, external_ref,
  received_at, cleared_at, notes,
  created_by, created_at
)
SELECT
  l.tenant_id, l.lease_id, l.property_id,
  l.amount, 0::numeric, 0::numeric,
  CASE lower(COALESCE(l.payment_method,''))
    WHEN 'cash'       THEN 'cash'::pm_payment_method
    WHEN 'cheque'     THEN 'cheque'::pm_payment_method
    WHEN 'check'      THEN 'cheque'::pm_payment_method
    WHEN 'e_transfer' THEN 'e_transfer'::pm_payment_method
    WHEN 'etransfer'  THEN 'e_transfer'::pm_payment_method
    WHEN 'card'       THEN 'card'::pm_payment_method
    WHEN 'stripe'     THEN 'stripe'::pm_payment_method
    WHEN 'ach'        THEN 'ach'::pm_payment_method
    WHEN 'manual'     THEN 'manual'::pm_payment_method
    ELSE 'other'::pm_payment_method
  END,
  CASE l.status
    WHEN 'reversed'  THEN 'reversed'::pm_payment_status
    WHEN 'cancelled' THEN 'cancelled'::pm_payment_status
    ELSE 'cleared'::pm_payment_status
  END,
  'ledger:' || l.id::text,
  COALESCE(l.paid_date::timestamptz, l.entry_date::timestamptz, l.created_at),
  CASE WHEN l.status NOT IN ('reversed','cancelled')
       THEN COALESCE(l.paid_date::timestamptz, l.entry_date::timestamptz, l.created_at)
       ELSE NULL END,
  l.description, l.created_by, l.created_at
FROM public.pm_tenant_ledger l
WHERE l.type = 'payment'
  AND NOT EXISTS (
    SELECT 1 FROM public.pm_payments p
    WHERE p.external_ref = 'ledger:' || l.id::text
  );

INSERT INTO public.pm_credits (
  tenant_id, lease_id, property_id,
  source, amount, consumed_amount, remaining_amount,
  status, notes,
  issued_by, issued_at, created_at
)
SELECT
  l.tenant_id, l.lease_id, l.property_id,
  CASE l.type
    WHEN 'deposit_refund'    THEN 'deposit_refund'::pm_credit_source
    WHEN 'adjustment_credit' THEN 'correction'::pm_credit_source
    WHEN 'other_credit'      THEN 'goodwill'::pm_credit_source
    ELSE 'goodwill'::pm_credit_source
  END,
  l.amount, 0::numeric, l.amount,
  CASE l.status
    WHEN 'reversed'  THEN 'void'::pm_credit_status
    WHEN 'cancelled' THEN 'void'::pm_credit_status
    ELSE 'available'::pm_credit_status
  END,
  COALESCE(l.description, '') || ' [ledger:' || l.id::text || ']',
  l.created_by, l.created_at, l.created_at
FROM public.pm_tenant_ledger l
WHERE l.type IN ('credit','adjustment_credit','deposit_refund','other_credit')
  AND NOT EXISTS (
    SELECT 1 FROM public.pm_credits c
    WHERE c.notes LIKE '%[ledger:' || l.id::text || ']%'
  );

-- 2. SWITCH BALANCE READS
CREATE OR REPLACE FUNCTION public.pm_get_tenant_balance(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
  v_charges_open numeric := 0;
  v_credits_avail numeric := 0;
  v_payments_unapplied numeric := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF public.is_ops_staff(v_actor) THEN
    v_allowed := true;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.pm_tenants WHERE id = p_tenant_id AND user_id = v_actor) INTO v_allowed;
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view this tenant balance' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(balance), 0) INTO v_charges_open
  FROM public.pm_charges
  WHERE tenant_id = p_tenant_id AND status NOT IN ('waived','cancelled','written_off');

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_credits_avail
  FROM public.pm_credits
  WHERE tenant_id = p_tenant_id AND status IN ('available','partially_consumed');

  SELECT COALESCE(SUM(GREATEST(amount - amount_allocated - amount_refunded, 0)), 0)
    INTO v_payments_unapplied
  FROM public.pm_payments
  WHERE tenant_id = p_tenant_id AND status = 'cleared';

  RETURN v_charges_open - v_credits_avail - v_payments_unapplied;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pm_my_balance()
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor uuid := auth.uid(); v_total numeric := 0; r RECORD;
BEGIN
  IF v_actor IS NULL THEN RETURN 0; END IF;
  FOR r IN SELECT id FROM public.pm_tenants WHERE user_id = v_actor LOOP
    v_total := v_total + public.pm_get_tenant_balance(r.id);
  END LOOP;
  RETURN v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.pm_get_tenant_balance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pm_my_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_get_tenant_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pm_my_balance() TO authenticated, service_role;

-- 3. SWITCH AGING READS
CREATE OR REPLACE FUNCTION public.pm_get_tenant_aging(p_tenant_id uuid)
RETURNS TABLE(
  tenant_id uuid, balance numeric,
  current_amt numeric, d_0_30 numeric, d_31_60 numeric, d_61_90 numeric, d_90_plus numeric,
  oldest_due date, as_of date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
  v_today date := (now() AT TIME ZONE 'America/Regina')::date;
  v_credit numeric := 0;
  v_current numeric := 0;
  v_b1 numeric := 0; v_b2 numeric := 0; v_b3 numeric := 0; v_b4 numeric := 0;
  v_oldest date := NULL;
  r RECORD; v_remaining numeric; v_apply numeric; v_days_past int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF public.is_ops_staff(v_actor) THEN
    v_allowed := true;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.pm_tenants WHERE id = p_tenant_id AND user_id = v_actor) INTO v_allowed;
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view this tenant aging' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_credit
  FROM public.pm_credits
  WHERE tenant_id = p_tenant_id AND status IN ('available','partially_consumed');

  v_credit := v_credit + COALESCE((
    SELECT SUM(GREATEST(amount - amount_allocated - amount_refunded, 0))
    FROM public.pm_payments
    WHERE tenant_id = p_tenant_id AND status = 'cleared'
  ), 0);

  FOR r IN
    SELECT due_date AS effective_due, balance AS remaining
    FROM public.pm_charges
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('waived','cancelled','written_off')
      AND balance > 0
    ORDER BY due_date ASC, created_at ASC
  LOOP
    v_remaining := COALESCE(r.remaining, 0);
    IF v_credit > 0 THEN
      v_apply := LEAST(v_credit, v_remaining);
      v_credit := v_credit - v_apply;
      v_remaining := v_remaining - v_apply;
    END IF;
    IF v_remaining <= 0 THEN CONTINUE; END IF;
    IF v_oldest IS NULL OR r.effective_due < v_oldest THEN v_oldest := r.effective_due; END IF;
    v_days_past := (v_today - r.effective_due);
    IF v_days_past <= 0 THEN v_current := v_current + v_remaining;
    ELSIF v_days_past <= 30 THEN v_b1 := v_b1 + v_remaining;
    ELSIF v_days_past <= 60 THEN v_b2 := v_b2 + v_remaining;
    ELSIF v_days_past <= 90 THEN v_b3 := v_b3 + v_remaining;
    ELSE v_b4 := v_b4 + v_remaining;
    END IF;
  END LOOP;

  IF v_credit > 0 THEN v_current := v_current - v_credit; END IF;

  tenant_id := p_tenant_id;
  balance := v_current + v_b1 + v_b2 + v_b3 + v_b4;
  current_amt := v_current;
  d_0_30 := v_b1; d_31_60 := v_b2; d_61_90 := v_b3; d_90_plus := v_b4;
  oldest_due := v_oldest; as_of := v_today;
  RETURN NEXT; RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.pm_get_tenant_aging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_get_tenant_aging(uuid) TO authenticated, service_role;

-- 4. PARITY REPORT (ops-only)
CREATE OR REPLACE FUNCTION public.pm_finance_parity_report()
RETURNS TABLE(tenant_id uuid, legacy_balance numeric, new_balance numeric, delta numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.is_ops_staff(v_actor) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH legacy AS (
    SELECT t.id AS tenant_id,
      COALESCE(SUM(CASE
        WHEN l.status IN ('waived','cancelled','reversed','note') THEN 0
        WHEN l.type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN l.amount
        WHEN l.type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -l.amount
        ELSE 0 END), 0) AS bal
    FROM public.pm_tenants t
    LEFT JOIN public.pm_tenant_ledger l ON l.tenant_id = t.id
    GROUP BY t.id
  ),
  normalized AS (
    SELECT t.id AS tenant_id,
      COALESCE((SELECT SUM(balance) FROM public.pm_charges c
                 WHERE c.tenant_id = t.id AND c.status NOT IN ('waived','cancelled','written_off')), 0)
      - COALESCE((SELECT SUM(remaining_amount) FROM public.pm_credits cr
                   WHERE cr.tenant_id = t.id AND cr.status IN ('available','partially_consumed')), 0)
      - COALESCE((SELECT SUM(GREATEST(amount - amount_allocated - amount_refunded, 0))
                   FROM public.pm_payments p
                   WHERE p.tenant_id = t.id AND p.status = 'cleared'), 0)
      AS bal
    FROM public.pm_tenants t
  )
  SELECT l.tenant_id, l.bal, n.bal, (n.bal - l.bal)
  FROM legacy l JOIN normalized n ON n.tenant_id = l.tenant_id
  ORDER BY ABS(n.bal - l.bal) DESC, l.tenant_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.pm_finance_parity_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_finance_parity_report() TO authenticated, service_role;
