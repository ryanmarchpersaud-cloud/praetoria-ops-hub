
-- Add report_number, severity, and corrective_action_notes to incident_reports
ALTER TABLE public.incident_reports
  ADD COLUMN report_number text UNIQUE,
  ADD COLUMN severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN corrective_action_notes text;

-- Auto-generate report numbers like IR-00001
CREATE OR REPLACE FUNCTION public.generate_incident_report_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.incident_reports WHERE report_number IS NOT NULL;
  NEW.report_number := 'IR-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_incident_report_number
  BEFORE INSERT ON public.incident_reports
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION public.generate_incident_report_number();

-- Backfill existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.incident_reports
  WHERE report_number IS NULL
)
UPDATE public.incident_reports
SET report_number = 'IR-' || LPAD(numbered.rn::TEXT, 5, '0')
FROM numbered
WHERE public.incident_reports.id = numbered.id;
