-- Auto-stamp arrival_time when a visit enters In Progress, and completion_time when Completed.
CREATE OR REPLACE FUNCTION public.auto_stamp_visit_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    IF NEW.visit_status = 'In Progress' AND NEW.arrival_time IS NULL THEN
      NEW.arrival_time := now();
    END IF;
    IF NEW.visit_status = 'Completed' THEN
      IF NEW.arrival_time IS NULL THEN
        NEW.arrival_time := now();
      END IF;
      IF NEW.completion_time IS NULL THEN
        NEW.completion_time := now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_stamp_visit_times ON public.visits;
CREATE TRIGGER trg_auto_stamp_visit_times
BEFORE UPDATE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.auto_stamp_visit_times();

-- Backfill PV-00154 will be done separately once user provides actual time.