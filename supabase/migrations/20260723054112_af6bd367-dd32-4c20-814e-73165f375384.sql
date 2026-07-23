
-- 1) Extra columns for requirement fulfillment
ALTER TABLE public.operational_tasks
  ADD COLUMN IF NOT EXISTS receipt_amount numeric,
  ADD COLUMN IF NOT EXISTS receipt_vendor text,
  ADD COLUMN IF NOT EXISTS receipt_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_notes text;

-- 2) Prevent non-staff (worker/subcontractor assignees) from altering
--    admin-owned fields on the task while still allowing them to
--    upload receipts/photos, add completion/follow-up notes and change status.
CREATE OR REPLACE FUNCTION public.enforce_operational_task_worker_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff/admin can change anything.
  IF public.is_staff_or_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-staff: reset admin-controlled fields to their existing values.
  NEW.task_title           := OLD.task_title;
  NEW.task_category        := OLD.task_category;
  NEW.task_description     := OLD.task_description;
  NEW.customer_id          := OLD.customer_id;
  NEW.customer_name_text   := OLD.customer_name_text;
  NEW.property_id          := OLD.property_id;
  NEW.property_name_text   := OLD.property_name_text;
  NEW.job_id               := OLD.job_id;
  NEW.visit_id             := OLD.visit_id;
  NEW.priority             := OLD.priority;
  NEW.assigned_to          := OLD.assigned_to;
  NEW.assignee_type        := OLD.assignee_type;
  NEW.due_date             := OLD.due_date;
  NEW.due_time             := OLD.due_time;
  NEW.budget_limit         := OLD.budget_limit;
  NEW.materials_parts_list := OLD.materials_parts_list;
  NEW.receipt_required     := OLD.receipt_required;
  NEW.photos_required      := OLD.photos_required;
  NEW.follow_up_required   := OLD.follow_up_required;
  NEW.created_by           := OLD.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_operational_task_worker_scope ON public.operational_tasks;
CREATE TRIGGER trg_enforce_operational_task_worker_scope
BEFORE UPDATE ON public.operational_tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_operational_task_worker_scope();

-- 3) Storage policies for task-attachments bucket.
--    Path convention: <task_id>/<kind>/<filename> where kind in ('receipts','photos').
--    Staff can manage everything; assignees (via legacy assigned_to OR
--    operational_task_assignees) can read/write files for their tasks.
DROP POLICY IF EXISTS "task_attachments_staff_all" ON storage.objects;
CREATE POLICY "task_attachments_staff_all"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'task-attachments' AND public.is_staff_or_admin(auth.uid()))
WITH CHECK (bucket_id = 'task-attachments' AND public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "task_attachments_assignee_select" ON storage.objects;
CREATE POLICY "task_attachments_assignee_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 FROM public.operational_tasks t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (
        t.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.operational_task_assignees a
          WHERE a.task_id = t.id AND a.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "task_attachments_assignee_insert" ON storage.objects;
CREATE POLICY "task_attachments_assignee_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 FROM public.operational_tasks t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (
        t.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.operational_task_assignees a
          WHERE a.task_id = t.id AND a.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "task_attachments_assignee_delete" ON storage.objects;
CREATE POLICY "task_attachments_assignee_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND owner = auth.uid()
);
