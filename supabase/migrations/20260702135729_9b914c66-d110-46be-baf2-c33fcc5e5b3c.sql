
ALTER TABLE public.pm_tenant_ledger
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS related_charge_id uuid REFERENCES public.pm_tenant_ledger(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reverses_entry_id uuid REFERENCES public.pm_tenant_ledger(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_path text,
  ADD COLUMN IF NOT EXISTS receipt_tenant_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.pm_tenant_ledger DROP CONSTRAINT IF EXISTS pm_tenant_ledger_type_chk;
ALTER TABLE public.pm_tenant_ledger
  ADD CONSTRAINT pm_tenant_ledger_type_chk CHECK (type IN (
    'rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee',
    'payment','credit','adjustment_credit','deposit_refund','other_credit',
    'payment_plan_note'
  ));

ALTER TABLE public.pm_tenant_ledger DROP CONSTRAINT IF EXISTS pm_tenant_ledger_status_chk;
ALTER TABLE public.pm_tenant_ledger
  ADD CONSTRAINT pm_tenant_ledger_status_chk CHECK (status IN (
    'posted','unpaid','partially_paid','paid','waived','cancelled',
    'recorded','pending','cleared','reversed','nsf','note'
  ));

CREATE INDEX IF NOT EXISTS idx_pm_ledger_tenant_date ON public.pm_tenant_ledger(tenant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_pm_ledger_lease ON public.pm_tenant_ledger(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_ledger_related ON public.pm_tenant_ledger(related_charge_id);

DROP POLICY IF EXISTS "Tenants view own ledger" ON public.pm_tenant_ledger;
DROP POLICY IF EXISTS "Tenants view own visible ledger" ON public.pm_tenant_ledger;
CREATE POLICY "Tenants view own visible ledger"
  ON public.pm_tenant_ledger FOR SELECT
  USING (
    tenant_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_tenants t
      WHERE t.id = pm_tenant_ledger.tenant_id AND t.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.pm_get_tenant_balance(p_tenant_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE
    WHEN status IN ('waived','cancelled','reversed','note') THEN 0
    WHEN type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN amount
    WHEN type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -amount
    ELSE 0 END), 0)
  FROM public.pm_tenant_ledger WHERE tenant_id = p_tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.pm_get_lease_balance(p_lease_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE
    WHEN status IN ('waived','cancelled','reversed','note') THEN 0
    WHEN type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN amount
    WHEN type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -amount
    ELSE 0 END), 0)
  FROM public.pm_tenant_ledger WHERE lease_id = p_lease_id;
$$;

CREATE OR REPLACE FUNCTION public.pm_my_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE
    WHEN l.status IN ('waived','cancelled','reversed','note') THEN 0
    WHEN l.type IN ('rent_charge','late_fee','deposit','adjustment_charge','other_charge','nsf_fee') THEN l.amount
    WHEN l.type IN ('payment','credit','adjustment_credit','deposit_refund','other_credit') THEN -l.amount
    ELSE 0 END), 0)
  FROM public.pm_tenant_ledger l
  JOIN public.pm_tenants t ON t.id = l.tenant_id
  WHERE t.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.pm_my_next_due()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT MIN(l.due_date) FROM public.pm_tenant_ledger l
  JOIN public.pm_tenants t ON t.id = l.tenant_id
  WHERE t.user_id = auth.uid()
    AND l.type = 'rent_charge'
    AND l.status NOT IN ('paid','waived','cancelled');
$$;

GRANT EXECUTE ON FUNCTION public.pm_get_tenant_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_get_lease_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_my_next_due() TO authenticated;
