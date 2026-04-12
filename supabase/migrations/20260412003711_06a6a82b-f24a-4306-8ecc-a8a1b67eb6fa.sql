
-- Trigger for job assignment
CREATE OR REPLACE FUNCTION public.notify_worker_job_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when assigned_to is set or changed
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'worker_assigned',
      'in_app',
      'worker',
      NEW.assigned_to,
      'job',
      NEW.id,
      'New Job Assignment: ' || COALESCE(NEW.job_number, '') || ' — ' || COALESCE(NEW.job_title, ''),
      'You have been assigned to job ' || COALESCE(NEW.job_number, '') || '. Tap to view details.',
      'sent',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_worker_job_assigned
AFTER INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_worker_job_assigned();

-- Trigger for visit assignment
CREATE OR REPLACE FUNCTION public.notify_worker_visit_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_worker_id IS NOT NULL AND (OLD.assigned_worker_id IS DISTINCT FROM NEW.assigned_worker_id) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'worker_assigned',
      'in_app',
      'worker',
      NEW.assigned_worker_id,
      'visit',
      NEW.id,
      'New Visit Assignment: ' || COALESCE(NEW.visit_number, '') || ' on ' || COALESCE(NEW.service_date::text, ''),
      'You have been assigned to visit ' || COALESCE(NEW.visit_number, '') || '. Check your schedule for details.',
      'sent',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_worker_visit_assigned
AFTER INSERT OR UPDATE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.notify_worker_visit_assigned();
