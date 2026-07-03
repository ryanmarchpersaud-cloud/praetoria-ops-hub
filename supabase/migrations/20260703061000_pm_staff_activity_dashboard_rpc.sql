-- PM dashboard staff activity RPC
-- Counts property-management staff clock-ins/clock-outs from the server side so
-- admin/ops dashboards are not blocked by user_roles RLS and all hours are
-- anchored to the America/Regina business day.

CREATE OR REPLACE FUNCTION public.pm_get_staff_activity_today()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_apps_waiting integer := 0;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ops_staff(auth.uid()) THEN
    RETURN jsonb_build_object(
      'clockedIn', '[]'::jsonb,
      'clockedOutToday', '[]'::jsonb,
      'hoursTodayTotal', 0,
      'appsWaiting', 0
    );
  END IF;

  v_start := ((now() AT TIME ZONE 'America/Regina')::date::timestamp AT TIME ZONE 'America/Regina');

  SELECT COUNT(*)::integer
    INTO v_apps_waiting
  FROM public.pm_applications
  WHERE admin_review_status IN ('in_review', 'pending');

  WITH role_rows AS (
    SELECT
      ur.user_id,
      CASE
        WHEN bool_or(ur.role = 'property_manager'::public.app_role) THEN 'property_manager'
        ELSE 'leasing_agent'
      END AS role
    FROM public.user_roles ur
    WHERE ur.role IN ('leasing_agent'::public.app_role, 'property_manager'::public.app_role)
    GROUP BY ur.user_id
  ),
  active_rows AS (
    SELECT DISTINCT ON (t.user_id)
      t.user_id,
      t.clock_in
    FROM public.timesheets t
    JOIN role_rows rr ON rr.user_id = t.user_id
    WHERE t.clock_out IS NULL
    ORDER BY t.user_id, t.clock_in DESC
  ),
  active_summary AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'user_id', ar.user_id,
            'name', COALESCE(NULLIF(p.display_name, ''), 'PM Staff'),
            'role', rr.role,
            'clock_in', ar.clock_in,
            'elapsed', GREATEST(0, EXTRACT(EPOCH FROM (now() - ar.clock_in)) / 3600.0)
          )
          ORDER BY ar.clock_in DESC
        ),
        '[]'::jsonb
      ) AS clocked_in,
      COALESCE(
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (now() - GREATEST(ar.clock_in, v_start))) / 3600.0)),
        0
      ) AS active_hours_today
    FROM active_rows ar
    JOIN role_rows rr ON rr.user_id = ar.user_id
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
  ),
  completed_by_user AS (
    SELECT
      t.user_id,
      MAX(t.clock_out) AS latest_clock_out,
      SUM(GREATEST(0, EXTRACT(EPOCH FROM (t.clock_out - GREATEST(t.clock_in, v_start))) / 3600.0)) AS hours
    FROM public.timesheets t
    JOIN role_rows rr ON rr.user_id = t.user_id
    WHERE t.clock_out IS NOT NULL
      AND t.clock_out >= v_start
    GROUP BY t.user_id
  ),
  completed_summary AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'user_id', c.user_id,
            'name', COALESCE(NULLIF(p.display_name, ''), 'PM Staff'),
            'role', rr.role,
            'hours', c.hours,
            'clock_out', c.latest_clock_out
          )
          ORDER BY c.latest_clock_out DESC
        ),
        '[]'::jsonb
      ) AS clocked_out_today,
      COALESCE(SUM(c.hours), 0) AS completed_hours_today
    FROM completed_by_user c
    JOIN role_rows rr ON rr.user_id = c.user_id
    LEFT JOIN public.profiles p ON p.user_id = c.user_id
  )
  SELECT jsonb_build_object(
    'clockedIn', a.clocked_in,
    'clockedOutToday', c.clocked_out_today,
    'hoursTodayTotal', ROUND((a.active_hours_today + c.completed_hours_today)::numeric, 2),
    'appsWaiting', v_apps_waiting
  )
    INTO v_result
  FROM active_summary a
  CROSS JOIN completed_summary c;

  RETURN COALESCE(v_result, jsonb_build_object(
    'clockedIn', '[]'::jsonb,
    'clockedOutToday', '[]'::jsonb,
    'hoursTodayTotal', 0,
    'appsWaiting', v_apps_waiting
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.pm_get_staff_activity_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_get_staff_activity_today() TO authenticated;
