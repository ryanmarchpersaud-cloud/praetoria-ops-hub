
CREATE OR REPLACE FUNCTION public.pm_reschedule_event(
  p_source     text,
  p_id         uuid,
  p_new_start  timestamptz,
  p_field      text DEFAULT NULL  -- for move_out ('move_out_date'|'inspection_date') and staff_task ('due_date'|'reminder_at')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_full     boolean;
  v_leasing  boolean;
  v_assigned uuid;
  v_status   text;
  v_old      timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  v_full    := public.is_ops_staff(v_uid) OR public.is_property_manager(v_uid);
  v_leasing := public.is_leasing_agent(v_uid);
  IF NOT (v_full OR v_leasing) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_new_start IS NULL THEN
    RAISE EXCEPTION 'New start required';
  END IF;

  IF p_source = 'showing' THEN
    SELECT assigned_to, status::text, scheduled_at INTO v_assigned, v_status, v_old
      FROM public.pm_showings WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
    IF v_status IN ('completed','cancelled','no_show') THEN RAISE EXCEPTION 'Cannot reschedule % showing', v_status; END IF;
    IF NOT v_full AND v_assigned IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
    UPDATE public.pm_showings
       SET scheduled_at = p_new_start, updated_at = now()
     WHERE id = p_id;

  ELSIF p_source = 'inspection' THEN
    SELECT assigned_to, status::text, scheduled_for INTO v_assigned, v_status, v_old
      FROM public.pm_inspections WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
    IF v_status IN ('completed','cancelled','reviewed','archived') THEN RAISE EXCEPTION 'Cannot reschedule % inspection', v_status; END IF;
    IF NOT v_full AND v_assigned IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
    UPDATE public.pm_inspections
       SET scheduled_for = p_new_start, updated_at = now()
     WHERE id = p_id;

  ELSIF p_source = 'move_out' THEN
    IF p_field IS NULL OR p_field NOT IN ('move_out_date','inspection_date') THEN
      RAISE EXCEPTION 'p_field must be move_out_date or inspection_date';
    END IF;
    SELECT assigned_to, status::text,
           CASE WHEN p_field='move_out_date' THEN move_out_date::timestamptz ELSE inspection_date::timestamptz END
      INTO v_assigned, v_status, v_old
      FROM public.pm_move_out_checklists WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
    IF v_status IN ('completed','cancelled','archived') THEN RAISE EXCEPTION 'Cannot reschedule % move-out', v_status; END IF;
    IF NOT v_full AND v_assigned IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
    IF p_field = 'move_out_date' THEN
      UPDATE public.pm_move_out_checklists SET move_out_date = p_new_start::date, updated_at = now() WHERE id = p_id;
    ELSE
      UPDATE public.pm_move_out_checklists SET inspection_date = p_new_start::date, updated_at = now() WHERE id = p_id;
    END IF;

  ELSIF p_source = 'staff_task' THEN
    IF p_field IS NULL OR p_field NOT IN ('due_date','reminder_at') THEN
      RAISE EXCEPTION 'p_field must be due_date or reminder_at';
    END IF;
    SELECT assigned_to, status::text,
           CASE WHEN p_field='due_date' THEN due_date::timestamptz ELSE reminder_at END
      INTO v_assigned, v_status, v_old
      FROM public.pm_staff_tasks WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
    IF v_status IN ('completed','cancelled','archived') THEN RAISE EXCEPTION 'Cannot reschedule % task', v_status; END IF;
    IF NOT v_full AND v_assigned IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
    IF p_field = 'due_date' THEN
      UPDATE public.pm_staff_tasks SET due_date = p_new_start::date, updated_at = now() WHERE id = p_id;
    ELSE
      UPDATE public.pm_staff_tasks SET reminder_at = p_new_start, updated_at = now() WHERE id = p_id;
    END IF;

  ELSIF p_source = 'owner_approval' THEN
    IF NOT v_full THEN
      RAISE EXCEPTION 'Only admin or property manager can reschedule owner approvals' USING ERRCODE = '42501';
    END IF;
    SELECT status::text, due_date::timestamptz INTO v_status, v_old
      FROM public.pm_owner_approvals WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
    IF v_status IN ('approved','declined','cancelled','archived') THEN RAISE EXCEPTION 'Cannot reschedule % approval', v_status; END IF;
    UPDATE public.pm_owner_approvals SET due_date = p_new_start::date, updated_at = now() WHERE id = p_id;

  ELSE
    RAISE EXCEPTION 'Unsupported event source: %', p_source;
  END IF;

  RETURN jsonb_build_object(
    'source', p_source,
    'id', p_id,
    'old_start', v_old,
    'new_start', p_new_start
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pm_reschedule_event(text, uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_reschedule_event(text, uuid, timestamptz, text) TO authenticated;
