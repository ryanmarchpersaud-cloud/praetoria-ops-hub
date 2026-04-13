
-- Drop existing worker visit policies
DROP POLICY IF EXISTS "Workers view assigned visits" ON public.visits;
DROP POLICY IF EXISTS "Workers update assigned visits" ON public.visits;

-- Recreate: workers can view visits assigned directly OR via parent job
CREATE POLICY "Workers view assigned visits"
ON public.visits FOR SELECT
TO authenticated
USING (
  is_worker_role(auth.uid()) AND (
    assigned_worker_id = auth.uid()
    OR is_worker_assigned_to_visit(auth.uid(), id)
    OR (job_id IS NOT NULL AND is_worker_assigned_to_job(auth.uid(), job_id))
  )
);

-- Recreate: workers can update visits assigned directly OR via parent job
CREATE POLICY "Workers update assigned visits"
ON public.visits FOR UPDATE
TO authenticated
USING (
  is_worker_role(auth.uid()) AND (
    assigned_worker_id = auth.uid()
    OR (job_id IS NOT NULL AND is_worker_assigned_to_job(auth.uid(), job_id))
  )
)
WITH CHECK (
  is_worker_role(auth.uid()) AND (
    assigned_worker_id = auth.uid()
    OR (job_id IS NOT NULL AND is_worker_assigned_to_job(auth.uid(), job_id))
  )
);

-- Auto-inherit assigned_worker_id from parent job when visit is created without one
CREATE OR REPLACE FUNCTION public.inherit_worker_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_worker_id IS NULL AND NEW.job_id IS NOT NULL THEN
    SELECT assigned_to INTO NEW.assigned_worker_id
    FROM public.jobs
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inherit_worker_from_job
BEFORE INSERT ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.inherit_worker_from_job();
