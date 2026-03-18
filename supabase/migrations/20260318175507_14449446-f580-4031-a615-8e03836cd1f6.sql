
-- Part A: Harden integration_logs RLS
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Staff can read integration logs" ON public.integration_logs;
DROP POLICY IF EXISTS "Edge functions can insert logs" ON public.integration_logs;
DROP POLICY IF EXISTS "Authenticated staff can read integration logs" ON public.integration_logs;
DROP POLICY IF EXISTS "Service role inserts integration logs" ON public.integration_logs;

-- Ensure RLS is enabled
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: only admin/manager roles (not customers, not subcontractors)
CREATE POLICY "Staff can read integration logs"
ON public.integration_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Writes happen via service_role key in edge functions, which bypasses RLS.
-- This makes the table append-only and backend-write-only for normal users.
