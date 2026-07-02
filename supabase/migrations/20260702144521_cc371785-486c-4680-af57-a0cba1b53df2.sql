
-- ============================================================
-- Phase 5C: Property Expenses Foundation
-- ============================================================

-- 1) pm_expenses
CREATE TABLE IF NOT EXISTS public.pm_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  maintenance_request_id UUID REFERENCES public.pm_maintenance_requests(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.pm_work_orders(id) ON DELETE SET NULL,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.finance_vendors(id) ON DELETE SET NULL,
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  reference_number TEXT,
  description TEXT,
  admin_note TEXT,
  owner_visible_note TEXT,
  tenant_visible_note TEXT,
  is_owner_visible BOOLEAN NOT NULL DEFAULT false,
  is_tenant_visible BOOLEAN NOT NULL DEFAULT false,
  is_billable_to_owner BOOLEAN NOT NULL DEFAULT false,
  is_billable_to_tenant BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pm_expenses_status_check CHECK (
    status IN ('draft','pending','approved','paid','reimbursed','billable','cancelled','disputed')
  )
);

CREATE INDEX IF NOT EXISTS idx_pm_expenses_property   ON public.pm_expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_unit       ON public.pm_expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_tenant     ON public.pm_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_lease      ON public.pm_expenses(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_wo         ON public.pm_expenses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_mreq       ON public.pm_expenses(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_status     ON public.pm_expenses(status);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_date       ON public.pm_expenses(expense_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_expenses TO authenticated;
GRANT ALL ON public.pm_expenses TO service_role;

ALTER TABLE public.pm_expenses ENABLE ROW LEVEL SECURITY;

-- Ops staff full access
CREATE POLICY "pm_expenses ops full access"
  ON public.pm_expenses FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Property owners: read only owner-visible expenses for their assigned properties
CREATE POLICY "pm_expenses owner read owner-visible"
  ON public.pm_expenses FOR SELECT
  TO authenticated
  USING (
    is_owner_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_property_owners po
      JOIN public.pm_owner_properties op ON op.owner_id = po.id
      WHERE po.user_id = auth.uid()
        AND op.property_id = pm_expenses.property_id
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_pm_expenses_updated_at ON public.pm_expenses;
CREATE TRIGGER trg_pm_expenses_updated_at
  BEFORE UPDATE ON public.pm_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto total (subtotal + gst + pst) if total not explicitly overridden
CREATE OR REPLACE FUNCTION public.pm_expense_recalc_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total IS NULL
     OR (TG_OP = 'INSERT' AND NEW.total = 0)
     OR (TG_OP = 'UPDATE' AND (
           NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.gst_amount IS DISTINCT FROM OLD.gst_amount
        OR NEW.pst_amount IS DISTINCT FROM OLD.pst_amount
     ) AND NEW.total = OLD.total) THEN
    NEW.total := ROUND(COALESCE(NEW.subtotal,0) + COALESCE(NEW.gst_amount,0) + COALESCE(NEW.pst_amount,0), 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_expense_recalc_total ON public.pm_expenses;
CREATE TRIGGER trg_pm_expense_recalc_total
  BEFORE INSERT OR UPDATE ON public.pm_expenses
  FOR EACH ROW EXECUTE FUNCTION public.pm_expense_recalc_total();

-- 2) pm_expense_attachments
CREATE TABLE IF NOT EXISTS public.pm_expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.pm_expenses(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'pm-receipts',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  is_owner_visible BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_expense_attachments_expense ON public.pm_expense_attachments(expense_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_expense_attachments TO authenticated;
GRANT ALL ON public.pm_expense_attachments TO service_role;

ALTER TABLE public.pm_expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_expense_attachments ops full"
  ON public.pm_expense_attachments FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "pm_expense_attachments owner read"
  ON public.pm_expense_attachments FOR SELECT
  TO authenticated
  USING (
    is_owner_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.pm_expenses e
      JOIN public.pm_property_owners po ON po.user_id = auth.uid()
      JOIN public.pm_owner_properties op ON op.owner_id = po.id AND op.property_id = e.property_id
      WHERE e.id = pm_expense_attachments.expense_id
        AND e.is_owner_visible = true
    )
  );

-- 3) Owner-safe expense view (excludes admin_note)
CREATE OR REPLACE VIEW public.pm_expenses_owner_safe AS
SELECT
  id, property_id, unit_id, work_order_id, maintenance_request_id,
  vendor_name, category, expense_date, due_date,
  subtotal, gst_amount, pst_amount, total,
  status, payment_method, paid_at, reference_number,
  description, owner_visible_note,
  is_billable_to_owner, created_at, updated_at
FROM public.pm_expenses
WHERE is_owner_visible = true;

GRANT SELECT ON public.pm_expenses_owner_safe TO authenticated;

-- 4) Tenant-safe ledger view (defense-in-depth: no admin_note)
DO $$
DECLARE has_admin_note boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pm_tenant_ledger' AND column_name='admin_note'
  ) INTO has_admin_note;

  IF has_admin_note THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.pm_tenant_ledger_tenant_safe AS
      SELECT id, tenant_id, lease_id, entry_date, due_date, type, status,
             amount, description, created_at, updated_at
      FROM public.pm_tenant_ledger
    $view$;
  ELSE
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.pm_tenant_ledger_tenant_safe AS
      SELECT id, tenant_id, lease_id, entry_date, due_date, type, status,
             amount, description, created_at, updated_at
      FROM public.pm_tenant_ledger
    $view$;
  END IF;
END $$;

GRANT SELECT ON public.pm_tenant_ledger_tenant_safe TO authenticated;

-- 5) Storage policies on pm-receipts (private bucket already created)
-- Ops staff: full
DROP POLICY IF EXISTS "pm-receipts ops all" ON storage.objects;
CREATE POLICY "pm-receipts ops all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'pm-receipts' AND public.is_ops_staff(auth.uid()))
  WITH CHECK (bucket_id = 'pm-receipts' AND public.is_ops_staff(auth.uid()));

-- Property owners: read receipts only when the linked attachment + expense are owner-visible
DROP POLICY IF EXISTS "pm-receipts owner read" ON storage.objects;
CREATE POLICY "pm-receipts owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pm-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.pm_expense_attachments a
      JOIN public.pm_expenses e ON e.id = a.expense_id
      JOIN public.pm_property_owners po ON po.user_id = auth.uid()
      JOIN public.pm_owner_properties op ON op.owner_id = po.id AND op.property_id = e.property_id
      WHERE a.storage_path = storage.objects.name
        AND a.is_owner_visible = true
        AND e.is_owner_visible = true
    )
  );
