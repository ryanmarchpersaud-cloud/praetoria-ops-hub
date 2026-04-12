-- Repair legacy placeholder invoice numbers and harden automatic invoice numbering

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix_text text;
  escaped_prefix text;
  next_num integer;
BEGIN
  SELECT COALESCE(NULLIF(trim(invoice_prefix), ''), 'INV')
  INTO prefix_text
  FROM public.company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  escaped_prefix := regexp_replace(prefix_text, '([][(){}.*+?^$|\\-])', '\\\1', 'g');

  SELECT COALESCE(
    MAX(
      (regexp_match(invoice_number, '^' || escaped_prefix || '-([0-9]+)$'))[1]::integer
    ),
    0
  ) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number ~ ('^' || escaped_prefix || '-[0-9]+$');

  NEW.invoice_number := prefix_text || '-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Normalize any legacy placeholder invoice numbers so they stop breaking the generator
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM public.invoices
  WHERE invoice_number IS NULL
     OR btrim(invoice_number) = ''
     OR upper(invoice_number) IN ('DRAFT', 'AUTO')
     OR invoice_number !~ '^[A-Z]+-[0-9]+$'
),
prefix AS (
  SELECT COALESCE(NULLIF(trim(invoice_prefix), ''), 'INV') AS prefix_text
  FROM public.company_settings
  ORDER BY created_at ASC
  LIMIT 1
),
base AS (
  SELECT COALESCE(
    MAX((regexp_match(invoice_number, '^[A-Z]+-([0-9]+)$'))[1]::integer),
    0
  ) AS max_num
  FROM public.invoices
  WHERE invoice_number ~ '^[A-Z]+-[0-9]+$'
)
UPDATE public.invoices i
SET invoice_number = p.prefix_text || '-' || LPAD((b.max_num + n.seq)::text, 5, '0')
FROM numbered n
CROSS JOIN prefix p
CROSS JOIN base b
WHERE i.id = n.id;

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR btrim(NEW.invoice_number) = '' OR upper(NEW.invoice_number) IN ('DRAFT', 'AUTO'))
  EXECUTE FUNCTION public.generate_invoice_number();