-- Fix existing quote with 'AUTO' quote_number
UPDATE public.quotes SET quote_number = 'PQ-00001' WHERE id = '60fcb0db-fb14-4d47-9162-c0d9898910f7' AND quote_number = 'AUTO';

-- Update trigger to also catch 'AUTO' as a trigger condition
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quotes
  WHERE quote_number ~ '^PQ-[0-9]+$';
  NEW.quote_number := 'PQ-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Update trigger condition to also catch 'AUTO'
DROP TRIGGER IF EXISTS set_quote_number ON public.quotes;
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '' OR NEW.quote_number = 'AUTO')
  EXECUTE FUNCTION generate_quote_number();