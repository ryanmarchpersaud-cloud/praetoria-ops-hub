
-- Create a proper sequence for incident report numbers
CREATE SEQUENCE IF NOT EXISTS public.incident_report_number_seq START WITH 3;

-- Replace the trigger function with a sequence-based version
CREATE OR REPLACE FUNCTION public.generate_incident_report_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.report_number := 'IR-' || LPAD(nextval('public.incident_report_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;
