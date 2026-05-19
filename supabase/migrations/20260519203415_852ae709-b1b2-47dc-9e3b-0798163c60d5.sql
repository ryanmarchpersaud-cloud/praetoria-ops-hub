CREATE OR REPLACE FUNCTION public.is_sub_assigned_to_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits v
    JOIN public.subcontractor_assignments sa
      ON sa.visit_id = v.id
      OR (sa.job_id IS NOT NULL AND sa.job_id = v.job_id)
      OR (sa.property_id IS NOT NULL AND sa.property_id = v.property_id)
    JOIN public.subcontractors s ON s.id = sa.subcontractor_id
    WHERE v.id = _visit_id
      AND s.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Subs view assigned visit_photos" ON public.visit_photos;
DROP POLICY IF EXISTS "Subs manage assigned visit_photos" ON public.visit_photos;

CREATE POLICY "Subs manage assigned visit_photos"
  ON public.visit_photos FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'subcontractor'::public.app_role)
    AND public.is_sub_assigned_to_visit(auth.uid(), visit_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'subcontractor'::public.app_role)
    AND public.is_sub_assigned_to_visit(auth.uid(), visit_id)
  );

CREATE OR REPLACE FUNCTION public.complete_assigned_visit(
  _visit_id uuid,
  _crew_notes text DEFAULT NULL,
  _service_summary text DEFAULT NULL,
  _customer_visible_notes text DEFAULT NULL,
  _weather_notes text DEFAULT NULL,
  _snow_depth text DEFAULT NULL
)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_visit public.visits%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_allowed boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit
  FROM public.visits
  WHERE id = _visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_visit.job_id IS NOT NULL THEN
    SELECT * INTO v_job
    FROM public.jobs
    WHERE id = v_visit.job_id;
  END IF;

  v_allowed := public.is_ops_staff(v_actor)
    OR public.is_worker_assigned_to_visit(v_actor, _visit_id)
    OR public.is_sub_assigned_to_visit(v_actor, _visit_id);

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You are not assigned to this visit' USING ERRCODE = '42501';
  END IF;

  UPDATE public.visits
  SET visit_status = 'Completed',
      completion_time = now(),
      crew_notes = COALESCE(_crew_notes, crew_notes),
      service_summary = COALESCE(_service_summary, service_summary),
      customer_visible_notes = COALESCE(_customer_visible_notes, customer_visible_notes),
      weather_notes = COALESCE(_weather_notes, weather_notes),
      snow_depth = COALESCE(_snow_depth, snow_depth)
  WHERE id = _visit_id
  RETURNING * INTO v_visit;

  IF v_job.id IS NOT NULL AND v_job.service_frequency = 'one-time' THEN
    UPDATE public.jobs
    SET status = 'Completed'
    WHERE id = v_job.id;
  END IF;

  RETURN v_visit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_assigned_visit(uuid, text, text, text, text, text) TO authenticated;