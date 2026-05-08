
-- Pay stubs table
CREATE TABLE public.subcontractor_pay_stubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_stub_number TEXT,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | paid
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  confirmed_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  internal_notes TEXT,
  subcontractor_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pay_stubs_sub ON public.subcontractor_pay_stubs(subcontractor_id);

-- Pay stub line items
CREATE TABLE public.subcontractor_pay_stub_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_stub_id UUID NOT NULL REFERENCES public.subcontractor_pay_stubs(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  hours NUMERIC(6,2),
  hourly_rate NUMERIC(8,2),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  is_mixed BOOLEAN NOT NULL DEFAULT false,
  mixed_split JSONB, -- e.g. [{service_type, hours, hourly_rate, line_total}, ...]
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pay_stub_items_stub ON public.subcontractor_pay_stub_line_items(pay_stub_id);

-- RLS
ALTER TABLE public.subcontractor_pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_pay_stub_line_items ENABLE ROW LEVEL SECURITY;

-- Ops staff full access
CREATE POLICY "Ops staff manage pay stubs"
  ON public.subcontractor_pay_stubs FOR ALL
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff manage pay stub items"
  ON public.subcontractor_pay_stub_line_items FOR ALL
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Subcontractor read own
CREATE POLICY "Sub views own pay stubs"
  ON public.subcontractor_pay_stubs FOR SELECT
  USING (subcontractor_id = public.get_subcontractor_id_for_user(auth.uid()));

CREATE POLICY "Sub views own pay stub items"
  ON public.subcontractor_pay_stub_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subcontractor_pay_stubs ps
    WHERE ps.id = pay_stub_id
      AND ps.subcontractor_id = public.get_subcontractor_id_for_user(auth.uid())
  ));

-- Auto pay stub number
CREATE OR REPLACE FUNCTION public.generate_pay_stub_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.pay_stub_number IS NOT NULL AND NEW.pay_stub_number <> '' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(pay_stub_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.subcontractor_pay_stubs WHERE pay_stub_number ~ '^PS-[0-9]+$';
  NEW.pay_stub_number := 'PS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pay_stub_number BEFORE INSERT ON public.subcontractor_pay_stubs
  FOR EACH ROW EXECUTE FUNCTION public.generate_pay_stub_number();

CREATE TRIGGER trg_pay_stub_updated BEFORE UPDATE ON public.subcontractor_pay_stubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pay_stub_item_updated BEFORE UPDATE ON public.subcontractor_pay_stub_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalc totals
CREATE OR REPLACE FUNCTION public.recalc_pay_stub_totals()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_id UUID;
  v_sub NUMERIC(12,2);
  v_conf NUMERIC(12,2);
  v_pend NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_id := OLD.pay_stub_id; ELSE v_id := NEW.pay_stub_id; END IF;

  SELECT COALESCE(SUM(line_total), 0),
         COALESCE(SUM(CASE WHEN is_confirmed THEN line_total ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN is_confirmed THEN 0 ELSE line_total END), 0)
    INTO v_sub, v_conf, v_pend
  FROM public.subcontractor_pay_stub_line_items WHERE pay_stub_id = v_id;

  UPDATE public.subcontractor_pay_stubs
    SET subtotal = v_sub,
        confirmed_subtotal = v_conf,
        pending_subtotal = v_pend,
        total = v_sub
    WHERE id = v_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_recalc_pay_stub
AFTER INSERT OR UPDATE OR DELETE ON public.subcontractor_pay_stub_line_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_pay_stub_totals();
