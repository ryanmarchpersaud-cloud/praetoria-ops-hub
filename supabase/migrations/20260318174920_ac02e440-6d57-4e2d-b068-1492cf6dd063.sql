
DROP POLICY "Service role can insert integration logs" ON public.integration_logs;
CREATE POLICY "Staff can insert integration logs"
  ON public.integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'customer'::app_role));
