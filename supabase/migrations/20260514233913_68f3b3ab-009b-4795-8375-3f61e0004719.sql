
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_deletion_requests_user ON public.account_deletion_requests(user_id);
CREATE INDEX idx_account_deletion_requests_status ON public.account_deletion_requests(status);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion request"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can update deletion requests"
  ON public.account_deletion_requests FOR UPDATE
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE TRIGGER trg_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_admins_account_deletion_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (event, channel, audience, record_type, record_id, subject, body, status, sent_at)
  VALUES (
    'account_deletion_requested', 'in_app', 'admin', 'account_deletion_request', NEW.id,
    'Account deletion requested',
    'User ' || COALESCE(NEW.email, NEW.user_id::text) || ' has requested account deletion from inside the app.',
    'sent', now()
  );
  PERFORM public.write_audit_log(
    'account.deletion_requested', 'account_deletion_request', NEW.id::text, NULL, true,
    NULL, jsonb_build_object('user_id', NEW.user_id, 'email', NEW.email, 'reason', NEW.reason),
    NULL, NULL, NULL
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_account_deletion_request_notify
  AFTER INSERT ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_account_deletion_request();
