ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS time_clock_context text NOT NULL DEFAULT 'operations';

ALTER TABLE public.timesheets
  DROP CONSTRAINT IF EXISTS timesheets_time_clock_context_check;

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_time_clock_context_check
  CHECK (time_clock_context IN ('operations', 'pm_staff'));

CREATE INDEX IF NOT EXISTS idx_timesheets_pm_context_clock
  ON public.timesheets (time_clock_context, clock_in DESC, clock_out)
  WHERE time_clock_context = 'pm_staff';

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
  IF auth.uid() IS NULL OR NOT (
    public.is_ops_staff(auth.uid())
    OR public.has_role(auth.uid(), 'property_manager'::public.app_role)
  ) THEN
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
  pm_time_rows AS (
    SELECT
      t.id,
      t.user_id,
      t.clock_in,
      t.clock_out,
      COALESCE(rr.role, 'pm_staff_preview') AS role
    FROM public.timesheets t
    LEFT JOIN role_rows rr ON rr.user_id = t.user_id
    WHERE (rr.user_id IS NOT NULL OR t.time_clock_context = 'pm_staff')
      AND (t.clock_out IS NULL OR t.clock_out >= v_start)
  ),
  active_rows AS (
    SELECT DISTINCT ON (ptr.user_id)
      ptr.user_id,
      ptr.clock_in,
      ptr.role
    FROM pm_time_rows ptr
    WHERE ptr.clock_out IS NULL
    ORDER BY ptr.user_id, ptr.clock_in DESC
  ),
  active_summary AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'user_id', ar.user_id,
            'name', COALESCE(NULLIF(p.display_name, ''), wp.full_name, au.email, 'PM Staff'),
            'role', ar.role,
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
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    LEFT JOIN public.worker_profiles wp ON wp.user_id = ar.user_id
    LEFT JOIN auth.users au ON au.id = ar.user_id
  ),
  completed_by_user AS (
    SELECT
      ptr.user_id,
      MAX(ptr.clock_out) AS latest_clock_out,
      MAX(ptr.role) AS role,
      SUM(GREATEST(0, EXTRACT(EPOCH FROM (ptr.clock_out - GREATEST(ptr.clock_in, v_start))) / 3600.0)) AS hours
    FROM pm_time_rows ptr
    WHERE ptr.clock_out IS NOT NULL
      AND ptr.clock_out >= v_start
    GROUP BY ptr.user_id
  ),
  completed_summary AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'user_id', c.user_id,
            'name', COALESCE(NULLIF(p.display_name, ''), wp.full_name, au.email, 'PM Staff'),
            'role', c.role,
            'hours', c.hours,
            'clock_out', c.latest_clock_out
          )
          ORDER BY c.latest_clock_out DESC
        ),
        '[]'::jsonb
      ) AS clocked_out_today,
      COALESCE(SUM(c.hours), 0) AS completed_hours_today
    FROM completed_by_user c
    LEFT JOIN public.profiles p ON p.user_id = c.user_id
    LEFT JOIN public.worker_profiles wp ON wp.user_id = c.user_id
    LEFT JOIN auth.users au ON au.id = c.user_id
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