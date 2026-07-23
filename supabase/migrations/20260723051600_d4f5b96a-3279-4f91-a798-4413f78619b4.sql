
-- 1. New assignees table
CREATE TABLE public.operational_task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.operational_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('worker','subcontractor')),
  notified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_op_task_assignees_task ON public.operational_task_assignees(task_id);
CREATE INDEX idx_op_task_assignees_user ON public.operational_task_assignees(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_task_assignees TO authenticated;
GRANT ALL ON public.operational_task_assignees TO service_role;

ALTER TABLE public.operational_task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage all task assignees"
  ON public.operational_task_assignees FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Assignees can view their own link"
  ON public.operational_task_assignees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Migrate existing single assignments
INSERT INTO public.operational_task_assignees (task_id, user_id, assignee_type, notified_at, created_at)
SELECT id, assigned_to, COALESCE(assignee_type, 'worker'), created_at, created_at
FROM public.operational_tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 3. Extend RLS on operational_tasks so any assignee (multi) can view / update
CREATE POLICY "Multi assignees can view tasks"
  ON public.operational_tasks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operational_task_assignees a
    WHERE a.task_id = operational_tasks.id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Multi assignees can update tasks"
  ON public.operational_tasks FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operational_task_assignees a
    WHERE a.task_id = operational_tasks.id AND a.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.operational_task_assignees a
    WHERE a.task_id = operational_tasks.id AND a.user_id = auth.uid()
  ));

-- 4. Replace legacy notify trigger with a no-op wrapper (multi-assignee trigger handles it)
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Multi-assignee notifications are now handled by
  -- notify_operational_task_assignee on operational_task_assignees.
  -- Keep this function to preserve the existing trigger without duplicating notifications.
  RETURN NEW;
END;
$function$;

-- 5. New trigger: notify each newly added assignee exactly once
CREATE OR REPLACE FUNCTION public.notify_operational_task_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_priority text;
BEGIN
  SELECT task_title, COALESCE(priority::text, 'medium')
    INTO v_title, v_priority
  FROM public.operational_tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
  VALUES (
    'task_assigned'::notification_event,
    'in_app'::notification_channel,
    (CASE WHEN NEW.assignee_type = 'subcontractor' THEN 'subcontractor' ELSE 'worker' END)::notification_audience,
    NEW.user_id,
    'task',
    NEW.task_id,
    'New Task: ' || COALESCE(v_title, ''),
    'You have been assigned a new task: ' || COALESCE(v_title, '') || '. Priority: ' || v_priority,
    'sent',
    now()
  );

  UPDATE public.operational_task_assignees SET notified_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_operational_task_assignee
AFTER INSERT ON public.operational_task_assignees
FOR EACH ROW EXECUTE FUNCTION public.notify_operational_task_assignee();
