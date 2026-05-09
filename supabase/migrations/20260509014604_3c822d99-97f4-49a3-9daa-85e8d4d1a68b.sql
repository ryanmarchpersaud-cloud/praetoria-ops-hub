
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS pst_rate NUMERIC(5,4);

CREATE OR REPLACE FUNCTION public.recalc_quote_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(5,4);
  v_gst NUMERIC(5,4);
  v_pst NUMERIC(5,4);
  v_effective NUMERIC(7,4);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quote_id;
  ELSE
    v_quote_id := NEW.quote_id;
  END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.quote_line_items WHERE quote_id = v_quote_id;

  SELECT tax_rate, gst_rate, pst_rate INTO v_tax_rate, v_gst, v_pst
  FROM public.quotes WHERE id = v_quote_id;

  IF v_gst IS NOT NULL OR v_pst IS NOT NULL THEN
    v_effective := COALESCE(v_gst, 0) + COALESCE(v_pst, 0);
  ELSE
    v_effective := COALESCE(v_tax_rate, 0.13);
  END IF;

  UPDATE public.quotes
  SET subtotal = v_subtotal,
      tax = ROUND(v_subtotal * v_effective, 2),
      total = ROUND(v_subtotal + (v_subtotal * v_effective), 2)
  WHERE id = v_quote_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_quote_on_tax_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_effective NUMERIC(7,4);
BEGIN
  IF NEW.tax_rate IS DISTINCT FROM OLD.tax_rate
     OR NEW.gst_rate IS DISTINCT FROM OLD.gst_rate
     OR NEW.pst_rate IS DISTINCT FROM OLD.pst_rate THEN
    IF NEW.gst_rate IS NOT NULL OR NEW.pst_rate IS NOT NULL THEN
      v_effective := COALESCE(NEW.gst_rate, 0) + COALESCE(NEW.pst_rate, 0);
    ELSE
      v_effective := COALESCE(NEW.tax_rate, 0);
    END IF;
    NEW.tax := ROUND(NEW.subtotal * v_effective, 2);
    NEW.total := ROUND(NEW.subtotal + (NEW.subtotal * v_effective), 2);
  END IF;
  RETURN NEW;
END;
$function$;
