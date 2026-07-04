
-- Phase 15: PM Calendar aggregator function (read-only, no new tables)
CREATE OR REPLACE FUNCTION public.pm_calendar_events(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (
  event_id          text,
  source            text,
  event_type        text,
  title             text,
  start_at          timestamptz,
  end_at            timestamptz,
  all_day           boolean,
  status            text,
  priority          text,
  property_id       uuid,
  unit_id           uuid,
  tenant_id         uuid,
  owner_id          uuid,
  assigned_staff_id uuid,
  related_id        uuid,
  action_url        text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_full       boolean;
  v_leasing    boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_full    := public.is_ops_staff(v_uid) OR public.is_property_manager(v_uid);
  v_leasing := public.is_leasing_agent(v_uid);

  IF NOT (v_full OR v_leasing) THEN
    RETURN;
  END IF;

  -- Showings
  RETURN QUERY
  SELECT
    ('showing:' || s.id::text),
    'pm_showings',
    'showing',
    COALESCE('Showing', 'Showing')::text,
    s.scheduled_at,
    s.scheduled_at + make_interval(mins => COALESCE(s.duration_minutes, 30)),
    false,
    COALESCE(s.status, 'scheduled'),
    NULL::text,
    s.property_id,
    s.unit_id,
    NULL::uuid,
    NULL::uuid,
    s.assigned_to,
    s.id,
    ('/property-management/showings/' || s.id::text)
  FROM public.pm_showings s
  WHERE s.scheduled_at IS NOT NULL
    AND s.scheduled_at >= p_start
    AND s.scheduled_at <  p_end
    AND (v_full OR s.assigned_to = v_uid);

  -- Inspections
  RETURN QUERY
  SELECT
    ('inspection:' || i.id::text),
    'pm_inspections',
    'inspection',
    COALESCE(i.title, 'Inspection'),
    i.scheduled_for,
    i.scheduled_for + interval '1 hour',
    false,
    COALESCE(i.status::text, 'scheduled'),
    NULL::text,
    i.property_id,
    i.unit_id,
    i.tenant_id,
    i.owner_id,
    i.assigned_to,
    i.id,
    ('/property-management/inspections/' || i.id::text)
  FROM public.pm_inspections i
  WHERE i.scheduled_for IS NOT NULL
    AND i.scheduled_for >= p_start
    AND i.scheduled_for <  p_end
    AND (v_full OR i.assigned_to = v_uid);

  -- Move-Ins (use lease start date as scheduled date if available)
  RETURN QUERY
  SELECT
    ('move_in:' || m.id::text),
    'pm_move_in_checklists',
    'move_in',
    'Move-In'::text,
    (l.start_date::timestamptz),
    (l.start_date::timestamptz) + interval '1 day',
    true,
    COALESCE(m.status, 'scheduled'),
    NULL::text,
    m.property_id,
    m.unit_id,
    l.tenant_id,
    NULL::uuid,
    m.assigned_to,
    m.id,
    ('/property-management/move-ins/' || m.id::text)
  FROM public.pm_move_in_checklists m
  LEFT JOIN public.pm_leases l ON l.id = m.lease_id
  WHERE l.start_date IS NOT NULL
    AND l.start_date >= p_start::date
    AND l.start_date <  p_end::date
    AND (v_full OR m.assigned_to = v_uid);

  -- Move-Outs (move_out_date or inspection_date)
  RETURN QUERY
  SELECT
    ('move_out:' || mo.id::text),
    'pm_move_out_checklists',
    'move_out',
    'Move-Out'::text,
    (COALESCE(mo.move_out_date, mo.inspection_date)::timestamptz),
    (COALESCE(mo.move_out_date, mo.inspection_date)::timestamptz) + interval '1 day',
    true,
    COALESCE(mo.status, 'scheduled'),
    NULL::text,
    mo.property_id,
    mo.unit_id,
    mo.tenant_id,
    NULL::uuid,
    mo.assigned_to,
    mo.id,
    ('/property-management/move-outs/' || mo.id::text)
  FROM public.pm_move_out_checklists mo
  WHERE COALESCE(mo.move_out_date, mo.inspection_date) IS NOT NULL
    AND COALESCE(mo.move_out_date, mo.inspection_date) >= p_start::date
    AND COALESCE(mo.move_out_date, mo.inspection_date) <  p_end::date
    AND (v_full OR mo.assigned_to = v_uid);

  -- Lease Renewals (current lease end date)
  RETURN QUERY
  SELECT
    ('lease_renewal:' || r.id::text),
    'pm_lease_renewals',
    'lease_renewal',
    'Lease Renewal'::text,
    (r.current_lease_end_date::timestamptz),
    (r.current_lease_end_date::timestamptz) + interval '1 day',
    true,
    COALESCE(r.status, 'scheduled'),
    NULL::text,
    r.property_id,
    r.unit_id,
    r.tenant_id,
    NULL::uuid,
    r.assigned_to,
    r.id,
    ('/property-management/lease-renewals/' || r.id::text)
  FROM public.pm_lease_renewals r
  WHERE r.current_lease_end_date IS NOT NULL
    AND r.current_lease_end_date >= p_start::date
    AND r.current_lease_end_date <  p_end::date
    AND (v_full OR r.assigned_to = v_uid);

  -- Staff Tasks (due date and/or reminder)
  RETURN QUERY
  SELECT
    ('staff_task:' || t.id::text),
    'pm_staff_tasks',
    'staff_task',
    COALESCE(t.title, 'Task'),
    COALESCE(t.reminder_at, t.due_date::timestamptz),
    COALESCE(t.reminder_at, t.due_date::timestamptz) + interval '30 minutes',
    (t.reminder_at IS NULL),
    COALESCE(t.status, 'scheduled'),
    COALESCE(t.priority, 'normal'),
    t.property_id,
    t.unit_id,
    NULL::uuid,
    NULL::uuid,
    t.assigned_to,
    t.id,
    ('/property-management/tasks/' || t.id::text)
  FROM public.pm_staff_tasks t
  WHERE COALESCE(t.reminder_at, t.due_date::timestamptz) IS NOT NULL
    AND COALESCE(t.reminder_at, t.due_date::timestamptz) >= p_start
    AND COALESCE(t.reminder_at, t.due_date::timestamptz) <  p_end
    AND (v_full OR t.assigned_to = v_uid);

  -- Owner Approvals (due date)
  IF v_full THEN
    RETURN QUERY
    SELECT
      ('owner_approval:' || a.id::text),
      'pm_owner_approvals',
      'owner_approval_due',
      COALESCE(a.title, 'Owner Approval Due'),
      (a.due_date::timestamptz),
      (a.due_date::timestamptz) + interval '1 day',
      true,
      COALESCE(a.status, 'scheduled'),
      COALESCE(a.priority, 'normal'),
      a.property_id,
      a.unit_id,
      NULL::uuid,
      a.owner_id,
      NULL::uuid,
      a.id,
      ('/property-management/owner-approvals/' || a.id::text)
    FROM public.pm_owner_approvals a
    WHERE a.due_date IS NOT NULL
      AND a.due_date >= p_start::date
      AND a.due_date <  p_end::date;
  END IF;

  -- Maintenance follow-ups (use updated_at of open items as follow-up cue only if in-range)
  RETURN QUERY
  SELECT
    ('work_order:' || w.id::text),
    'pm_work_orders',
    'work_order_appointment',
    COALESCE(w.title, 'Work Order'),
    w.updated_at,
    w.updated_at + interval '1 hour',
    false,
    COALESCE(w.status, 'scheduled'),
    COALESCE(w.priority, 'normal'),
    w.property_id,
    w.unit_id,
    w.tenant_id,
    NULL::uuid,
    w.assigned_worker_id,
    w.id,
    ('/property-management/work-orders/' || w.id::text)
  FROM public.pm_work_orders w
  WHERE w.status IN ('scheduled','in_progress','on_hold')
    AND w.updated_at >= p_start
    AND w.updated_at <  p_end
    AND (v_full OR w.assigned_worker_id = v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.pm_calendar_events(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_calendar_events(timestamptz, timestamptz) TO authenticated;
