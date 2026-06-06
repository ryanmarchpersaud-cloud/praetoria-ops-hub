
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS gst_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS pst_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS gst_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pst_amount numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoices ALTER COLUMN tax_rate SET DEFAULT 0.11;

-- Backfill rates based on the current combined tax_rate
UPDATE public.invoices
   SET gst_rate = 0.05, pst_rate = 0.06
 WHERE gst_rate IS NULL AND pst_rate IS NULL
   AND ROUND(COALESCE(tax_rate,0)::numeric, 4) = 0.1100;

UPDATE public.invoices
   SET gst_rate = 0.05, pst_rate = NULL
 WHERE gst_rate IS NULL AND pst_rate IS NULL
   AND ROUND(COALESCE(tax_rate,0)::numeric, 4) = 0.0500;

UPDATE public.invoices
   SET gst_rate = NULL, pst_rate = 0.06
 WHERE gst_rate IS NULL AND pst_rate IS NULL
   AND ROUND(COALESCE(tax_rate,0)::numeric, 4) = 0.0600;

-- Backfill amounts from subtotal × rate
UPDATE public.invoices
   SET gst_amount = ROUND(COALESCE(subtotal,0) * COALESCE(gst_rate,0), 2),
       pst_amount = ROUND(COALESCE(subtotal,0) * COALESCE(pst_rate,0), 2);

-- Update recalc trigger function to maintain GST/PST amounts and an effective combined rate
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(7,4);
  v_gst_rate NUMERIC(7,4);
  v_pst_rate NUMERIC(7,4);
  v_amount_paid NUMERIC(12,2);
  v_tip NUMERIC(12,2);
  v_effective NUMERIC(7,4);
  v_gst NUMERIC(12,2);
  v_pst NUMERIC(12,2);
  v_tax NUMERIC(12,2);
  v_total NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_invoice_id := OLD.invoice_id;
  ELSE v_invoice_id := NEW.invoice_id; END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.invoice_line_items WHERE invoice_id = v_invoice_id;

  SELECT tax_rate, gst_rate, pst_rate, amount_paid, COALESCE(tip, 0)
    INTO v_tax_rate, v_gst_rate, v_pst_rate, v_amount_paid, v_tip
  FROM public.invoices WHERE id = v_invoice_id;

  IF v_gst_rate IS NOT NULL OR v_pst_rate IS NOT NULL THEN
    v_effective := COALESCE(v_gst_rate, 0) + COALESCE(v_pst_rate, 0);
  ELSE
    v_effective := COALESCE(v_tax_rate, 0.11);
  END IF;

  v_gst := ROUND(v_subtotal * COALESCE(v_gst_rate, 0), 2);
  v_pst := ROUND(v_subtotal * COALESCE(v_pst_rate, 0), 2);
  v_tax := ROUND(v_subtotal * v_effective, 2);
  v_total := ROUND(v_subtotal + v_tax + COALESCE(v_tip, 0), 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax = v_tax,
      gst_amount = v_gst,
      pst_amount = v_pst,
      total = v_total,
      balance_due = v_total - COALESCE(v_amount_paid, 0)
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
