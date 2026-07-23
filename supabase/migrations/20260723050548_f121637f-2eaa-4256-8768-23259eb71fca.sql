
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'task_assigned'::notification_event,
      'in_app'::notification_channel,
      (CASE WHEN NEW.assignee_type = 'subcontractor' THEN 'subcontractor' ELSE 'worker' END)::notification_audience,
      NEW.assigned_to,
      'task',
      NEW.id,
      'New Task: ' || COALESCE(NEW.task_title, ''),
      'You have been assigned a new task: ' || COALESCE(NEW.task_title, '') || '. Priority: ' || COALESCE(NEW.priority::text, 'medium'),
      'sent',
      now()
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'task_completed'::notification_event,
      'in_app'::notification_channel,
      'admin'::notification_audience,
      NEW.created_by,
      'task',
      NEW.id,
      'Task Completed: ' || COALESCE(NEW.task_title, ''),
      'The task "' || COALESCE(NEW.task_title, '') || '" has been marked as completed.',
      'sent',
      now()
    );
  END IF;
  RETURN NEW;
END;
$function$;
