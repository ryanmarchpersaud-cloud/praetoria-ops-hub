ALTER TABLE public.comms_settings
  ADD COLUMN IF NOT EXISTS production_pilot_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prae_comms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prae_execution_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_recipient_allowlist text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.comms_mailboxes
   SET is_active = false, inbound_enabled = false, outbound_enabled = false
 WHERE environment = 'production';

INSERT INTO public.comms_mailboxes (
  label, display_name, email_address, credential_secret_prefix,
  environment, division, assigned_rep_user_id,
  imap_host, imap_port, smtp_host, smtp_port, sync_start_mode
)
SELECT
  'IONOS Production Pilot (Administration)', 'Praetoria Group Administration',
  'admin@praetoriagroup.ca', 'IONOS_PROD_ADMIN_EMAIL',
  'production', 'administration', 'e0f175d8-4a5a-4259-8c95-2604e0576660'::uuid,
  'imap.ionos.com', 993, 'smtp.ionos.com', 587, 'future_only'
WHERE NOT EXISTS (
  SELECT 1 FROM public.comms_mailboxes WHERE email_address = 'admin@praetoriagroup.ca'
);

UPDATE public.comms_mailboxes
   SET is_active = true, inbound_enabled = true, outbound_enabled = true,
       sync_start_mode = 'future_only', emergency_paused = false
 WHERE email_address = 'admin@praetoriagroup.ca' AND environment = 'production';

CREATE UNIQUE INDEX IF NOT EXISTS comms_mailboxes_one_active_production
  ON public.comms_mailboxes ((environment))
  WHERE environment = 'production' AND is_active;

ALTER TABLE public.prae_approvals
  ADD COLUMN IF NOT EXISTS execution_state text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_receipt jsonb;

DO $$ BEGIN
  ALTER TABLE public.prae_approvals
    ADD CONSTRAINT prae_approvals_execution_state_check
    CHECK (execution_state IN ('not_started','executing','complete','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.prae_claim_execution(_approval_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.prae_approvals%ROWTYPE; v_stopped boolean; v_recomputed text; v_updated int;
BEGIN
  SELECT stopped INTO v_stopped FROM public.prae_emergency_stop WHERE id LIMIT 1;
  IF COALESCE(v_stopped, true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'emergency_stop_active');
  END IF;

  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF r.state <> 'approved' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_approved'); END IF;
  IF r.execution_state <> 'not_started' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_executed', 'execution_state', r.execution_state);
  END IF;

  BEGIN v_recomputed := public.prae_content_hash(r.content_binding);
  EXCEPTION WHEN OTHERS THEN v_recomputed := NULL; END;
  IF v_recomputed IS NULL OR r.content_hash_version <> 2
     OR NOT public.prae_constant_time_eq(v_recomputed, r.content_hash) THEN
    UPDATE public.prae_approvals SET state = 'invalidated', updated_at = now() WHERE id = _approval_id;
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'invalidated_by_edit', NULL, 'system',
            'stored binding no longer matches the stored hash at execution time');
    RETURN jsonb_build_object('ok', false, 'reason', 'content_changed');
  END IF;

  UPDATE public.prae_approvals
     SET execution_state = 'executing', updated_at = now()
   WHERE id = _approval_id AND state = 'approved' AND execution_state = 'not_started';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_executed'); END IF;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (_approval_id, 'execution_started', r.decided_by_user_id, r.decided_by_role,
          'execution claimed using the immutable stored content binding');

  RETURN jsonb_build_object('ok', true, 'approval_id', r.id, 'division', r.division,
                            'channel', r.channel, 'content_hash', r.content_hash,
                            'content_binding', r.content_binding,
                            'decided_by_user_id', r.decided_by_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.prae_complete_execution(_approval_id uuid, _status text, _receipt jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_state text;
BEGIN
  IF _status NOT IN ('complete','failed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;
  UPDATE public.prae_approvals
     SET execution_state = _status,
         executed_at = CASE WHEN _status = 'complete' THEN now() ELSE executed_at END,
         execution_receipt = COALESCE(_receipt, '{}'::jsonb),
         updated_at = now()
   WHERE id = _approval_id AND execution_state = 'executing'
  RETURNING execution_state INTO v_state;
  IF v_state IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_executing'); END IF;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (_approval_id,
          CASE WHEN _status = 'complete' THEN 'execution_complete' ELSE 'execution_failed' END,
          NULL, 'system', COALESCE(_receipt->>'summary', _status));

  RETURN jsonb_build_object('ok', true, 'execution_state', v_state);
END $$;

REVOKE ALL ON FUNCTION public.prae_claim_execution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prae_claim_execution(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.prae_claim_execution(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.prae_complete_execution(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prae_complete_execution(uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.prae_complete_execution(uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prae_claim_execution(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_complete_execution(uuid, text, jsonb) TO service_role;