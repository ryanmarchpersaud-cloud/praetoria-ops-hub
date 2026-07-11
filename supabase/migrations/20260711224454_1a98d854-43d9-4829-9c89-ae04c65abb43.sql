
-- ────────────────────────────────────────────────────────────────
-- visit_pauses: informational log of pause/resume events on an
-- active visit timer. Does NOT alter arrival_time/completion_time
-- and does NOT feed payroll / job cost tracker.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visit_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  billing_classification TEXT NOT NULL DEFAULT 'informational',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_pauses TO authenticated;
GRANT ALL ON public.visit_pauses TO service_role;

CREATE INDEX IF NOT EXISTS visit_pauses_visit_idx ON public.visit_pauses(visit_id);
CREATE INDEX IF NOT EXISTS visit_pauses_open_idx
  ON public.visit_pauses(visit_id)
  WHERE ended_at IS NULL;

-- At most ONE open pause per visit
CREATE UNIQUE INDEX IF NOT EXISTS visit_pauses_one_open_per_visit
  ON public.visit_pauses(visit_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.visit_pauses ENABLE ROW LEVEL SECURITY;

-- Ops staff: full access
CREATE POLICY "Ops staff manage visit_pauses"
ON public.visit_pauses
FOR ALL
TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

-- Workers: view pauses on visits they are assigned to
CREATE POLICY "Workers view visit_pauses on assigned visits"
ON public.visit_pauses
FOR SELECT
TO authenticated
USING (
  public.is_worker_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = visit_pauses.visit_id
      AND (
        v.assigned_worker_id = auth.uid()
        OR public.is_worker_assigned_to_visit(auth.uid(), v.id)
        OR public.is_worker_in_visit_crew(auth.uid(), v.id)
        OR (v.job_id IS NOT NULL AND public.is_worker_assigned_to_job(auth.uid(), v.job_id))
      )
  )
);

-- Workers: create own pauses on assigned visits
CREATE POLICY "Workers create own visit_pauses"
ON public.visit_pauses
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_worker_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = visit_pauses.visit_id
      AND (
        v.assigned_worker_id = auth.uid()
        OR public.is_worker_assigned_to_visit(auth.uid(), v.id)
        OR public.is_worker_in_visit_crew(auth.uid(), v.id)
        OR (v.job_id IS NOT NULL AND public.is_worker_assigned_to_job(auth.uid(), v.job_id))
      )
  )
);

-- Workers: end (resume) their own open pauses
CREATE POLICY "Workers end own visit_pauses"
ON public.visit_pauses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_worker_role(auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_worker_role(auth.uid()));

-- Subcontractors: view pauses on visits they are assigned to
CREATE POLICY "Subs view visit_pauses on assigned visits"
ON public.visit_pauses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'subcontractor'::app_role)
  AND public.is_sub_assigned_to_visit(auth.uid(), visit_id)
);

-- Subcontractors: create own pauses on assigned visits
CREATE POLICY "Subs create own visit_pauses"
ON public.visit_pauses
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND has_role(auth.uid(), 'subcontractor'::app_role)
  AND public.is_sub_assigned_to_visit(auth.uid(), visit_id)
);

-- Subcontractors: end own open pauses
CREATE POLICY "Subs end own visit_pauses"
ON public.visit_pauses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND has_role(auth.uid(), 'subcontractor'::app_role))
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'subcontractor'::app_role));

-- Trigger: compute duration_seconds when ended_at set; enforce that
-- ended_at > started_at and cannot be un-set once closed.
CREATE OR REPLACE FUNCTION public.visit_pauses_bi_bu()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;

  IF NEW.ended_at IS NOT NULL AND NEW.ended_at <= NEW.started_at THEN
    RAISE EXCEPTION 'visit_pauses.ended_at must be greater than started_at';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.ended_at IS NOT NULL AND NEW.ended_at IS NULL THEN
    RAISE EXCEPTION 'Cannot reopen a closed pause';
  END IF;

  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::int);
  ELSE
    NEW.duration_seconds := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_pauses_bi_bu ON public.visit_pauses;
CREATE TRIGGER trg_visit_pauses_bi_bu
BEFORE INSERT OR UPDATE ON public.visit_pauses
FOR EACH ROW EXECUTE FUNCTION public.visit_pauses_bi_bu();
