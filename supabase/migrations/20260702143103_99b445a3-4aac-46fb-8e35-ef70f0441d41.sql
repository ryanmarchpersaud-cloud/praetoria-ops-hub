-- Lock down SECURITY DEFINER balance RPCs with internal access checks

CREATE OR REPLACE FUNCTION public.pm_get_tenant_balance(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Ops/finance staff always allowed
  IF public.is_ops_staff(v_actor) THEN
    v_allowed := true;
  ELSE
    -- Tenant may read their own balance
    SELECT EXISTS (
      SELECT 1 FROM public.pm_tenants
      WHERE id = p_tenant_id AND user_id = v_actor
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view this tenant balance' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT SUM(CASE
      WHEN status IN ('waived','cancelled','reversed','note') THEN 0
      WHEN type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN amount
      WHEN type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -amount
      ELSE 0 END)
    FROM public.pm_tenant_ledger WHERE tenant_id = p_tenant_id
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.pm_get_lease_balance(p_lease_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.is_ops_staff(v_actor) THEN
    v_allowed := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.pm_tenants
      WHERE lease_id = p_lease_id AND user_id = v_actor
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view this lease balance' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT SUM(CASE
      WHEN status IN ('waived','cancelled','reversed','note') THEN 0
      WHEN type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN amount
      WHEN type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -amount
      ELSE 0 END)
    FROM public.pm_tenant_ledger WHERE lease_id = p_lease_id
  ), 0);
END;
$$;

-- Revoke public/anon on all four; only authenticated + service_role
REVOKE ALL ON FUNCTION public.pm_get_tenant_balance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pm_get_lease_balance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pm_my_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pm_my_next_due() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pm_get_tenant_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pm_get_lease_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pm_my_balance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pm_my_next_due() TO authenticated, service_role;