
-- ============================================================
-- 1. CHECK CONSTRAINTS
-- ============================================================
ALTER TABLE public.quote_line_items
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_unit_price_non_negative CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_line_total_non_negative CHECK (line_total >= 0);

ALTER TABLE public.quotes
  ADD CONSTRAINT chk_subtotal_non_negative CHECK (subtotal >= 0),
  ADD CONSTRAINT chk_tax_non_negative CHECK (tax >= 0),
  ADD CONSTRAINT chk_total_non_negative CHECK (total >= 0);

-- Configurable tax_rate (default 13% HST Ontario)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1300;

-- Email format checks
ALTER TABLE public.leads
  ADD CONSTRAINT chk_lead_email_format CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$');
ALTER TABLE public.customers
  ADD CONSTRAINT chk_customer_email_format CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$');

-- Name length constraints
ALTER TABLE public.leads
  ADD CONSTRAINT chk_lead_first_name_len CHECK (char_length(first_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_lead_last_name_len CHECK (char_length(last_name) BETWEEN 1 AND 100);
ALTER TABLE public.customers
  ADD CONSTRAINT chk_customer_first_name_len CHECK (char_length(first_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_customer_last_name_len CHECK (char_length(last_name) BETWEEN 1 AND 100);

-- Quote number not empty
ALTER TABLE public.quotes
  ADD CONSTRAINT chk_quote_number_not_empty CHECK (quote_number <> '');

-- ============================================================
-- 2. AUTO-CALCULATE line_total = quantity * unit_price
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_calc_line_item_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_line_item_total();

-- ============================================================
-- 3. AUTO-RECALCULATE QUOTE TOTALS FROM LINE ITEMS
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(5,4);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quote_id;
  ELSE
    v_quote_id := NEW.quote_id;
  END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.quote_line_items WHERE quote_id = v_quote_id;

  SELECT tax_rate INTO v_tax_rate FROM public.quotes WHERE id = v_quote_id;

  UPDATE public.quotes
  SET subtotal = v_subtotal,
      tax = ROUND(v_subtotal * COALESCE(v_tax_rate, 0.13), 2),
      total = ROUND(v_subtotal + (v_subtotal * COALESCE(v_tax_rate, 0.13)), 2)
  WHERE id = v_quote_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_recalc_quote_totals
  AFTER INSERT OR UPDATE OR DELETE
  ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_quote_totals();

-- Recalculate when tax_rate changes
CREATE OR REPLACE FUNCTION public.recalc_quote_on_tax_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tax_rate IS DISTINCT FROM OLD.tax_rate THEN
    NEW.tax := ROUND(NEW.subtotal * NEW.tax_rate, 2);
    NEW.total := ROUND(NEW.subtotal + (NEW.subtotal * NEW.tax_rate), 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_recalc_quote_on_tax_change
  BEFORE UPDATE OF tax_rate
  ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_quote_on_tax_change();

-- ============================================================
-- 4. ADDITIONAL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_follow_up_due ON public.quotes(follow_up_due_at) WHERE follow_up_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_sent_status ON public.quotes(sent_status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_record ON public.files(record_type, record_id);

-- ============================================================
-- 5. ENSURE updated_at TRIGGERS EXIST
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leads_updated_at') THEN
    CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at') THEN
    CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
