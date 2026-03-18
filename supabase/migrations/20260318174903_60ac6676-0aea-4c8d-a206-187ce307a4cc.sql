
CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  event_name text NOT NULL,
  channel text,
  status text NOT NULL DEFAULT 'success',
  recipient text,
  record_type text,
  record_id text,
  provider_response_id text,
  error_message text,
  environment text DEFAULT 'production',
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view integration logs"
  ON public.integration_logs FOR SELECT
  TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Service role can insert integration logs"
  ON public.integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_integration_logs_created_at ON public.integration_logs (created_at DESC);
CREATE INDEX idx_integration_logs_provider ON public.integration_logs (provider);
CREATE INDEX idx_integration_logs_event ON public.integration_logs (event_name);
