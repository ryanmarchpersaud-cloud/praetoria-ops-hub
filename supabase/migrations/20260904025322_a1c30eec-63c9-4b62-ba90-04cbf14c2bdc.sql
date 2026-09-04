-- Phase 1G — mobile approval inbox + Twilio alert channel (no duplicate systems).

ALTER TABLE public.prae_approvals
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'email_reply',
  ADD COLUMN IF NOT EXISTS source_message_id uuid,
  ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_message_sid text;

-- Authorised alert phones -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prae_authorized_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  label text,
  e164 text NOT NULL UNIQUE CHECK (e164 ~ '^\+[1-9][0-9]{6,14}$'),
  active boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  opted_out_at timestamptz,
  divisions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prae_authorized_phones TO authenticated;
GRANT ALL ON public.prae_authorized_phones TO service_role;
ALTER TABLE public.prae_authorized_phones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prae_phones_admin_read" ON public.prae_authorized_phones;
CREATE POLICY "prae_phones_admin_read" ON public.prae_authorized_phones
  FOR SELECT TO authenticated USING (public.is_admin_or_owner(auth.uid()));

-- SMS log: idempotency, rate limiting and inbound replay protection --------
CREATE TABLE IF NOT EXISTS public.prae_sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  e164 text NOT NULL,
  message_sid text UNIQUE,
  idempotency_key text UNIQUE,
  approval_id uuid REFERENCES public.prae_approvals(id) ON DELETE SET NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prae_sms_log_rate_idx ON public.prae_sms_log (e164, created_at DESC);

GRANT SELECT ON public.prae_sms_log TO authenticated;
GRANT ALL ON public.prae_sms_log TO service_role;
ALTER TABLE public.prae_sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prae_sms_log_admin_read" ON public.prae_sms_log;
CREATE POLICY "prae_sms_log_admin_read" ON public.prae_sms_log
  FOR SELECT TO authenticated USING (public.is_admin_or_owner(auth.uid()));

-- Re-issue a single-use nonce to an authenticated, authorised session.
-- The nonce never travels in an SMS or a URL; it is minted only for a live,
-- signed-in owner/admin session that is already looking at the approval.
CREATE OR REPLACE FUNCTION public.prae_issue_nonce(_approval_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  r public.prae_approvals%ROWTYPE;
  v_nonce text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  SELECT role::text INTO v_role FROM public.user_roles
   WHERE user_id = v_uid AND role IN ('owner','admin') ORDER BY role LIMIT 1;

  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF NOT public.prae_division_allowed(v_uid, r.division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;
  IF r.state <> 'pending' OR r.nonce_used THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_pending');
  END IF;
  IF now() >= r.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  v_nonce := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.prae_approvals
     SET nonce_digest = public.prae_sha256_hex(v_nonce),
         viewed_at = COALESCE(viewed_at, now()),
         updated_at = now()
   WHERE id = _approval_id AND state = 'pending' AND nonce_used = false;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (_approval_id, 'nonce_issued', v_uid, v_role, 'single-use nonce issued to an authenticated session');

  RETURN jsonb_build_object('ok', true, 'nonce', v_nonce, 'expires_at', r.expires_at);
END $$;

REVOKE ALL ON FUNCTION public.prae_issue_nonce(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prae_issue_nonce(uuid) TO authenticated, service_role;

-- Engage (never release) the emergency stop. Used by the inbound PAUSE command.
CREATE OR REPLACE FUNCTION public.prae_engage_emergency_stop(_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prae_emergency_stop
     SET stopped = true, reason = COALESCE(_reason, 'engaged'), updated_at = now()
   WHERE id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.prae_engage_emergency_stop(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prae_engage_emergency_stop(text) TO service_role;