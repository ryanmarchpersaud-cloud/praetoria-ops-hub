
-- Step 1: Extend timesheets with approval workflow + supervisor fields
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Index for fast lookups by approval status / range
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_clockin ON public.timesheets(user_id, clock_in DESC);

-- Allow staff (admin/manager/ops/HR) to approve via update; existing policies already allow staff manage,
-- but explicitly tighten: workers can only update their OWN pending entries (not approved).
DROP POLICY IF EXISTS "Users can update own timesheets" ON public.timesheets;
CREATE POLICY "Users can update own pending timesheets"
  ON public.timesheets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Aggregator: returns approved hours per user in a date range (clock_out - clock_in in hours)
CREATE OR REPLACE FUNCTION public.aggregate_approved_hours(
  _start_date date,
  _end_date date
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  total_hours numeric,
  entry_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.user_id,
    COALESCE(wp.full_name, 'Unknown') AS full_name,
    COALESCE(wp.hourly_rate, 0) AS hourly_rate,
    ROUND(SUM(EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0)::numeric, 2) AS total_hours,
    COUNT(*)::integer AS entry_count
  FROM public.timesheets t
  LEFT JOIN public.worker_profiles wp ON wp.user_id = t.user_id
  WHERE t.status = 'approved'
    AND t.clock_out IS NOT NULL
    AND t.clock_in::date >= _start_date
    AND t.clock_in::date <= _end_date
  GROUP BY t.user_id, wp.full_name, wp.hourly_rate
  ORDER BY full_name;
$$;
