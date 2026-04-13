
-- Create task category enum
CREATE TYPE public.task_category AS ENUM (
  'Shopping / Materials Pickup',
  'Parts Purchase',
  'Property Check',
  'Site Inspection',
  'Delivery / Drop-off',
  'Estimate Support',
  'Photo Verification',
  'Maintenance Check',
  'Other'
);

-- Create task status enum
CREATE TYPE public.task_status AS ENUM (
  'New',
  'Assigned',
  'In Progress',
  'Waiting',
  'Completed',
  'Cancelled'
);

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create the operational_tasks table
CREATE TABLE public.operational_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_title TEXT NOT NULL,
  task_category public.task_category NOT NULL DEFAULT 'Other',
  task_description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_type TEXT NOT NULL DEFAULT 'worker' CHECK (assignee_type IN ('worker', 'subcontractor')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'New',
  due_date DATE,
  due_time TIME,
  materials_parts_list TEXT,
  budget_limit NUMERIC(10,2),
  receipt_required BOOLEAN NOT NULL DEFAULT false,
  photos_required BOOLEAN NOT NULL DEFAULT false,
  follow_up_required BOOLEAN NOT NULL DEFAULT false,
  completion_notes TEXT,
  completion_photos TEXT[] DEFAULT '{}',
  receipt_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operational_tasks ENABLE ROW LEVEL SECURITY;

-- Admin/ops can do everything
CREATE POLICY "Staff can manage all tasks"
ON public.operational_tasks FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Workers can view their assigned tasks
CREATE POLICY "Workers can view assigned tasks"
ON public.operational_tasks FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Workers can update their assigned tasks (status, notes, photos, receipts)
CREATE POLICY "Workers can update assigned tasks"
ON public.operational_tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Subcontractors can view their assigned tasks
CREATE POLICY "Subcontractors can view assigned tasks"
ON public.operational_tasks FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Subcontractors can update their assigned tasks
CREATE POLICY "Subcontractors can update assigned tasks"
ON public.operational_tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Timestamp trigger
CREATE TRIGGER update_operational_tasks_updated_at
  BEFORE UPDATE ON public.operational_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger on assignment
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'task_assigned',
      'in_app',
      CASE WHEN NEW.assignee_type = 'subcontractor' THEN 'subcontractor' ELSE 'worker' END,
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
$$;

CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT OR UPDATE ON public.operational_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Notification on completion
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'task_completed',
      'in_app',
      'admin',
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
$$;

CREATE TRIGGER trg_notify_task_completed
  AFTER UPDATE ON public.operational_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_completed();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_tasks;
