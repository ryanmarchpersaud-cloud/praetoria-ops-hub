
-- Phase 5D: Owner Statements Foundation

CREATE SEQUENCE IF NOT EXISTS public.pm_owner_statement_number_seq START 1;

-- Statements
CREATE TABLE public.pm_owner_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.pm_property_owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','finalized','shared','void','cancelled')),
  prepared_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ,
  opening_balance NUMERIC(12,2) DEFAULT 0,
  rent_charged NUMERIC(12,2) DEFAULT 0,
  rent_collected NUMERIC(12,2) DEFAULT 0,
  property_expenses NUMERIC(12,2) DEFAULT 0,
  maintenance_expenses NUMERIC(12,2) DEFAULT 0,
  management_fees NUMERIC(12,2) DEFAULT 0,
  adjustments NUMERIC(12,2) DEFAULT 0,
  net_owner_amount NUMERIC(12,2) DEFAULT 0,
  admin_notes TEXT,
  owner_visible_notes TEXT,
  owner_visible BOOLEAN NOT NULL DEFAULT false,
  prepared_by UUID,
  finalized_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_owner_statements_owner ON public.pm_owner_statements(owner_id);
CREATE INDEX idx_pm_owner_statements_property ON public.pm_owner_statements(property_id);
CREATE INDEX idx_pm_owner_statements_status ON public.pm_owner_statements(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_statements TO authenticated;
GRANT ALL ON public.pm_owner_statements TO service_role;

ALTER TABLE public.pm_owner_statements ENABLE ROW LEVEL SECURITY;

-- Ops staff: full access
CREATE POLICY "ops_staff_manage_owner_statements"
  ON public.pm_owner_statements FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Owner: read finalized/shared + owner_visible statements for owner records tied to their user
CREATE POLICY "owner_read_visible_statements"
  ON public.pm_owner_statements FOR SELECT TO authenticated
  USING (
    owner_visible = true
    AND status IN ('finalized','shared')
    AND EXISTS (
      SELECT 1 FROM public.pm_property_owners po
      WHERE po.id = pm_owner_statements.owner_id
        AND po.user_id = auth.uid()
    )
  );

-- Statement number trigger
CREATE OR REPLACE FUNCTION public.generate_pm_owner_statement_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.statement_number IS NULL OR NEW.statement_number = '' THEN
    NEW.statement_number := 'OS-' || LPAD(nextval('public.pm_owner_statement_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_owner_statement_number
  BEFORE INSERT ON public.pm_owner_statements
  FOR EACH ROW EXECUTE FUNCTION public.generate_pm_owner_statement_number();

CREATE TRIGGER trg_pm_owner_statements_updated
  BEFORE UPDATE ON public.pm_owner_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Line items
CREATE TABLE public.pm_owner_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.pm_owner_statements(id) ON DELETE CASCADE,
  line_date DATE,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  line_type TEXT NOT NULL
    CHECK (line_type IN (
      'rent_charge','rent_payment','property_expense','maintenance_expense',
      'management_fee','adjustment','credit','owner_contribution',
      'owner_payout_placeholder','other'
    )),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  pst_amount NUMERIC(12,2) DEFAULT 0,
  source_table TEXT,
  source_id UUID,
  owner_visible_note TEXT,
  admin_note TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_owner_statement_lines_stmt ON public.pm_owner_statement_lines(statement_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_statement_lines TO authenticated;
GRANT ALL ON public.pm_owner_statement_lines TO service_role;

ALTER TABLE public.pm_owner_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_staff_manage_statement_lines"
  ON public.pm_owner_statement_lines FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "owner_read_visible_statement_lines"
  ON public.pm_owner_statement_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_owner_statements s
      JOIN public.pm_property_owners po ON po.id = s.owner_id
      WHERE s.id = pm_owner_statement_lines.statement_id
        AND s.owner_visible = true
        AND s.status IN ('finalized','shared')
        AND po.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_pm_owner_statement_lines_updated
  BEFORE UPDATE ON public.pm_owner_statement_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalc totals from lines
CREATE OR REPLACE FUNCTION public.pm_recalc_owner_statement_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stmt_id UUID;
  v_rent_charge NUMERIC(12,2);
  v_rent_pay NUMERIC(12,2);
  v_prop_exp NUMERIC(12,2);
  v_maint_exp NUMERIC(12,2);
  v_mgmt NUMERIC(12,2);
  v_adj NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_stmt_id := OLD.statement_id; ELSE v_stmt_id := NEW.statement_id; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN line_type='rent_charge' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN line_type='rent_payment' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN line_type='property_expense' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN line_type='maintenance_expense' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN line_type='management_fee' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN line_type IN ('adjustment','credit','owner_contribution') THEN amount ELSE 0 END),0)
    INTO v_rent_charge, v_rent_pay, v_prop_exp, v_maint_exp, v_mgmt, v_adj
  FROM public.pm_owner_statement_lines WHERE statement_id = v_stmt_id;

  UPDATE public.pm_owner_statements
  SET rent_charged = v_rent_charge,
      rent_collected = v_rent_pay,
      property_expenses = v_prop_exp,
      maintenance_expenses = v_maint_exp,
      management_fees = v_mgmt,
      adjustments = v_adj,
      net_owner_amount = ROUND(v_rent_pay - v_prop_exp - v_maint_exp - v_mgmt + v_adj + COALESCE(opening_balance,0), 2),
      updated_at = now()
  WHERE id = v_stmt_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_recalc_stmt_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.pm_owner_statement_lines
  FOR EACH ROW EXECUTE FUNCTION public.pm_recalc_owner_statement_totals();
