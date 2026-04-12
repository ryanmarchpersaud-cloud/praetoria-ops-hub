
CREATE OR REPLACE FUNCTION public.notify_quote_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'Approved' AND (OLD.approval_status IS DISTINCT FROM 'Approved') THEN
    INSERT INTO public.notifications (event, channel, audience, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'quote_approved',
      'in_app',
      'admin',
      'quote',
      NEW.id,
      'Quote ' || COALESCE(NEW.quote_number, '') || ' Approved',
      'A customer has approved quote ' || COALESCE(NEW.quote_number, '') || '. Ready to convert to a job.',
      'sent',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_quote_approved
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_approved();
