
-- Fix stale enum reference in pm_charges activity trigger (prevents charge writes from erroring)
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
    IF NEW.status IN ('cancelled','written_off') AND OLD.status NOT IN ('cancelled','written_off') THEN
      v_evt := 'charge_voided';
      v_msg := 'Charge ' || NEW.charge_number || ' ' || NEW.status::text;
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

-- Owner access helper
CREATE OR REPLACE FUNCTION public.pm_owner_can_see_property(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pm_managed_properties p
    LEFT JOIN public.pm_property_owners po_primary ON po_primary.id = p.primary_owner_id
    LEFT JOIN public.pm_owner_properties op ON op.property_id = p.id
    LEFT JOIN public.pm_property_owners po_link ON po_link.id = op.owner_id
    WHERE p.id = _property_id
      AND (po_primary.user_id = _user_id OR po_link.user_id = _user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.pm_owner_can_see_property(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pm_owner_can_see_property(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.pm_owner_statement_sources
WITH (security_invoker = true)
AS
WITH charges_agg AS (
  SELECT
    c.property_id,
    date_trunc('month', COALESCE(c.due_date::timestamptz, c.created_at))::date AS period_month,
    COUNT(*) FILTER (WHERE c.status NOT IN ('cancelled','written_off'))                    AS charges_count,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status NOT IN ('cancelled','written_off')), 0)  AS charges_total,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'waived'), 0)                          AS charges_waived_total
  FROM public.pm_charges c
  WHERE c.property_id IS NOT NULL
  GROUP BY c.property_id, date_trunc('month', COALESCE(c.due_date::timestamptz, c.created_at))
),
payments_agg AS (
  SELECT
    p.property_id,
    date_trunc('month', COALESCE(p.cleared_at, p.received_at))::date AS period_month,
    COUNT(*) FILTER (WHERE p.status = 'cleared')                     AS payments_cleared_count,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'cleared'), 0)   AS payments_cleared_total,
    COALESCE(SUM(p.amount_refunded), 0)                              AS payments_refunded_total
  FROM public.pm_payments p
  WHERE p.property_id IS NOT NULL
  GROUP BY p.property_id, date_trunc('month', COALESCE(p.cleared_at, p.received_at))
),
combined AS (
  SELECT property_id, period_month FROM charges_agg
  UNION
  SELECT property_id, period_month FROM payments_agg
)
SELECT
  prop.id                                    AS property_id,
  prop.property_name,
  cmb.period_month,
  COALESCE(ch.charges_count, 0)              AS charges_count,
  COALESCE(ch.charges_total, 0)              AS charges_total,
  COALESCE(ch.charges_waived_total, 0)       AS charges_waived_total,
  COALESCE(pm.payments_cleared_count, 0)     AS payments_cleared_count,
  COALESCE(pm.payments_cleared_total, 0)     AS payments_cleared_total,
  COALESCE(pm.payments_refunded_total, 0)    AS payments_refunded_total,
  COALESCE(pm.payments_cleared_total, 0)
    - COALESCE(pm.payments_refunded_total, 0) AS net_collected
FROM combined cmb
JOIN public.pm_managed_properties prop ON prop.id = cmb.property_id
LEFT JOIN charges_agg  ch ON ch.property_id = cmb.property_id AND ch.period_month = cmb.period_month
LEFT JOIN payments_agg pm ON pm.property_id = cmb.property_id AND pm.period_month = cmb.period_month
WHERE
  public.is_ops_staff(auth.uid())
  OR public.is_pm_staff(auth.uid())
  OR public.pm_owner_can_see_property(auth.uid(), prop.id);

GRANT SELECT ON public.pm_owner_statement_sources TO authenticated;
GRANT ALL ON public.pm_owner_statement_sources TO service_role;
