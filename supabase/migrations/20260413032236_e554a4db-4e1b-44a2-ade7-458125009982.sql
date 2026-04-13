
CREATE OR REPLACE FUNCTION public.generate_incident_report_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE 
  next_num INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 4) AS INTEGER)), 0) + attempt
    INTO next_num FROM public.incident_reports WHERE report_number IS NOT NULL;
    
    -- Check if this number already exists
    IF NOT EXISTS (SELECT 1 FROM public.incident_reports WHERE report_number = 'IR-' || LPAD(next_num::TEXT, 5, '0')) THEN
      NEW.report_number := 'IR-' || LPAD(next_num::TEXT, 5, '0');
      RETURN NEW;
    END IF;
    
    IF attempt >= max_attempts THEN
      -- Fallback: use a timestamp-based suffix
      NEW.report_number := 'IR-' || LPAD(next_num::TEXT, 5, '0');
      RETURN NEW;
    END IF;
  END LOOP;
END;
$function$;
