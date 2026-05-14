ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tip NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(5,4);
  v_amount_paid NUMERIC(12,2);
  v_tip NUMERIC(12,2);
  v_tax NUMERIC(12,2);
  v_total NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_invoice_id := OLD.invoice_id;
  ELSE v_invoice_id := NEW.invoice_id; END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.invoice_line_items WHERE invoice_id = v_invoice_id;

  SELECT tax_rate, amount_paid, COALESCE(tip, 0) INTO v_tax_rate, v_amount_paid, v_tip
  FROM public.invoices WHERE id = v_invoice_id;

  v_tax := ROUND(v_subtotal * COALESCE(v_tax_rate, 0.13), 2);
  v_total := ROUND(v_subtotal + v_tax + COALESCE(v_tip, 0), 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax = v_tax,
      total = v_total,
      balance_due = v_total - COALESCE(v_amount_paid, 0)
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Trigger to recalc total when tip changes directly on invoices
CREATE OR REPLACE FUNCTION public.recalc_invoice_on_tip_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_tax NUMERIC(12,2); v_total NUMERIC(12,2);
BEGIN
  IF NEW.tip IS DISTINCT FROM OLD.tip OR NEW.tax_rate IS DISTINCT FROM OLD.tax_rate THEN
    v_tax := ROUND(COALESCE(NEW.subtotal,0) * COALESCE(NEW.tax_rate, 0.13), 2);
    v_total := ROUND(COALESCE(NEW.subtotal,0) + v_tax + COALESCE(NEW.tip, 0), 2);
    NEW.tax := v_tax;
    NEW.total := v_total;
    NEW.balance_due := v_total - COALESCE(NEW.amount_paid, 0);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS recalc_invoice_on_tip_change_trg ON public.invoices;
CREATE TRIGGER recalc_invoice_on_tip_change_trg
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_on_tip_change();