
-- Visits: cancellation + reinstatement audit fields
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS status_before_cancellation text,
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reinstated_by uuid,
  ADD COLUMN IF NOT EXISTS reinstatement_reason text;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS status_before_cancellation text,
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reinstated_by uuid,
  ADD COLUMN IF NOT EXISTS reinstatement_reason text;

-- Trigger for visits
CREATE OR REPLACE FUNCTION public.track_visit_cancel_reinstate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    -- Transition INTO Cancelled
    IF NEW.visit_status = 'Cancelled' AND (OLD.visit_status IS NULL OR OLD.visit_status <> 'Cancelled') THEN
      NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
      NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
      NEW.status_before_cancellation := COALESCE(NEW.status_before_cancellation, OLD.visit_status::text);
      NEW.reinstated_at := NULL;
      NEW.reinstated_by := NULL;
      NEW.reinstatement_reason := NULL;
    END IF;

    -- Transition OUT OF Cancelled
    IF OLD.visit_status = 'Cancelled' AND NEW.visit_status <> 'Cancelled' THEN
      NEW.reinstated_at := COALESCE(NEW.reinstated_at, now());
      NEW.reinstated_by := COALESCE(NEW.reinstated_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visits_track_cancel_reinstate ON public.visits;
CREATE TRIGGER trg_visits_track_cancel_reinstate
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.track_visit_cancel_reinstate();

-- Trigger for jobs
CREATE OR REPLACE FUNCTION public.track_job_cancel_reinstate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Cancelled' AND (OLD.status IS NULL OR OLD.status <> 'Cancelled') THEN
      NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
      NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
      NEW.status_before_cancellation := COALESCE(NEW.status_before_cancellation, OLD.status::text);
      NEW.reinstated_at := NULL;
      NEW.reinstated_by := NULL;
      NEW.reinstatement_reason := NULL;
    END IF;

    IF OLD.status = 'Cancelled' AND NEW.status <> 'Cancelled' THEN
      NEW.reinstated_at := COALESCE(NEW.reinstated_at, now());
      NEW.reinstated_by := COALESCE(NEW.reinstated_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_track_cancel_reinstate ON public.jobs;
CREATE TRIGGER trg_jobs_track_cancel_reinstate
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.track_job_cancel_reinstate();
