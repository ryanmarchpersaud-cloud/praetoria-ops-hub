CREATE TABLE public.prae_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce uuid NOT NULL UNIQUE,
  content_hash text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  division text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','rejected','expired','invalidated')),
  nonce_used boolean NOT NULL DEFAULT false,
  is_synthetic boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  decided_by_user_id uuid,
  decided_by_role text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prae_approvals TO authenticated;
GRANT ALL ON public.prae_approvals TO service_role;
ALTER TABLE public.prae_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prae_approvals_admin_read" ON public.prae_approvals
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.prae_approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.prae_approvals(id) ON DELETE RESTRICT,
  event text NOT NULL,
  actor_user_id uuid,
  actor_role text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prae_approval_audit TO authenticated;
GRANT SELECT, INSERT ON public.prae_approval_audit TO service_role;
ALTER TABLE public.prae_approval_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prae_audit_admin_read" ON public.prae_approval_audit
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.prae_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'prae_approval_audit is append-only';
END;
$$;

CREATE TRIGGER prae_audit_no_update
  BEFORE UPDATE OR DELETE ON public.prae_approval_audit
  FOR EACH ROW EXECUTE FUNCTION public.prae_audit_append_only();

CREATE TABLE public.prae_emergency_stop (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  stopped boolean NOT NULL DEFAULT true,
  reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prae_emergency_stop TO authenticated;
GRANT ALL ON public.prae_emergency_stop TO service_role;
ALTER TABLE public.prae_emergency_stop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prae_stop_admin_read" ON public.prae_emergency_stop
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

INSERT INTO public.prae_emergency_stop (id, stopped, reason)
VALUES (true, true, 'Phase 1E — execution disabled; approval foundation is not connected to any sending path');