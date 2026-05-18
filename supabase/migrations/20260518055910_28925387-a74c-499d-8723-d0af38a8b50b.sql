
-- 1. Crew members table (workers beyond the lead `visits.assigned_worker_id`)
CREATE TABLE IF NOT EXISTS public.visit_crew_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  worker_user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'helper',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visit_id, worker_user_id)
);

CREATE INDEX IF NOT EXISTS idx_visit_crew_members_visit ON public.visit_crew_members(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_crew_members_worker ON public.visit_crew_members(worker_user_id);

ALTER TABLE public.visit_crew_members ENABLE ROW LEVEL SECURITY;

-- 2. Helper: is this user in the visit's crew?
CREATE OR REPLACE FUNCTION public.is_worker_in_visit_crew(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visit_crew_members
    WHERE visit_id = _visit_id AND worker_user_id = _user_id
  )
$$;

-- 3. RLS on crew table
CREATE POLICY "Ops staff full access visit_crew_members"
  ON public.visit_crew_members FOR ALL
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Workers view own crew rows"
  ON public.visit_crew_members FOR SELECT
  USING (worker_user_id = auth.uid());

-- 4. Update visit policies so crew members can see/update the visit
DROP POLICY IF EXISTS "Workers view assigned visits" ON public.visits;
CREATE POLICY "Workers view assigned visits"
  ON public.visits FOR SELECT
  USING (
    public.is_worker_role(auth.uid()) AND (
      assigned_worker_id = auth.uid()
      OR public.is_worker_assigned_to_visit(auth.uid(), id)
      OR public.is_worker_in_visit_crew(auth.uid(), id)
      OR (job_id IS NOT NULL AND public.is_worker_assigned_to_job(auth.uid(), job_id))
    )
  );

DROP POLICY IF EXISTS "Workers update assigned visits" ON public.visits;
CREATE POLICY "Workers update assigned visits"
  ON public.visits FOR UPDATE
  USING (
    public.is_worker_role(auth.uid()) AND (
      assigned_worker_id = auth.uid()
      OR public.is_worker_in_visit_crew(auth.uid(), id)
      OR (job_id IS NOT NULL AND public.is_worker_assigned_to_job(auth.uid(), job_id))
    )
  );

-- 5. Notify worker when added to a crew
CREATE OR REPLACE FUNCTION public.notify_worker_crew_assigned()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_visit RECORD;
BEGIN
  SELECT visit_number, service_date INTO v_visit FROM public.visits WHERE id = NEW.visit_id;
  INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
  VALUES (
    'worker_crew_assigned', 'in_app', 'worker', NEW.worker_user_id, 'visit', NEW.visit_id,
    'Added to Crew: ' || COALESCE(v_visit.visit_number,'') || ' on ' || COALESCE(v_visit.service_date::text,''),
    'You have been added as crew on visit ' || COALESCE(v_visit.visit_number,'') || '. Check your schedule for details.',
    'sent', now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_worker_crew_assigned ON public.visit_crew_members;
CREATE TRIGGER trg_notify_worker_crew_assigned
AFTER INSERT ON public.visit_crew_members
FOR EACH ROW EXECUTE FUNCTION public.notify_worker_crew_assigned();
