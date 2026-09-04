CREATE OR REPLACE FUNCTION public.prae_decide_approval(_approval_id uuid, _nonce text, _decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_stopped boolean;
  r public.prae_approvals%ROWTYPE;
  v_updated int;
  v_state text;
  v_recomputed text;
BEGIN
  -- 1. Authentication and role BEFORE any state access, emergency-stop read or audit write.
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  SELECT role::text INTO v_role FROM public.user_roles
   WHERE user_id = v_uid AND role IN ('owner','admin') ORDER BY role LIMIT 1;

  IF _decision NOT IN ('approve','reject') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_decision');
  END IF;

  -- 2. Locked row, then division authorization. No audit row is written for an
  --    unauthorized caller, and the emergency stop is not consulted yet, so a
  --    caller who is out of division cannot mint emergency-stop audit entries.
  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT public.prae_division_allowed(v_uid, r.division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;

  -- 3. Emergency stop, only for a fully authorized caller.
  SELECT stopped INTO v_stopped FROM public.prae_emergency_stop WHERE id LIMIT 1;
  IF COALESCE(v_stopped, true) THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'emergency_stop_rejected', v_uid, v_role, 'emergency_stop_active');
    RETURN jsonb_build_object('ok', false, 'reason', 'emergency_stop_active');
  END IF;

  IF r.nonce_used OR r.state <> 'pending' THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'replay_rejected', v_uid, v_role,
            CASE WHEN r.nonce_used THEN 'nonce_already_used' ELSE 'not_pending' END);
    RETURN jsonb_build_object('ok', false, 'reason',
      CASE WHEN r.nonce_used THEN 'nonce_already_used' ELSE 'not_pending' END);
  END IF;

  IF NOT public.prae_constant_time_eq(public.prae_sha256_hex(_nonce), r.nonce_digest) THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'replay_rejected', v_uid, v_role, 'nonce_mismatch');
    RETURN jsonb_build_object('ok', false, 'reason', 'nonce_mismatch');
  END IF;

  IF now() >= r.expires_at THEN
    UPDATE public.prae_approvals
       SET state = 'expired', nonce_used = true, updated_at = now()
     WHERE id = _approval_id AND state = 'pending';
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'expired', v_uid, v_role, 'approval window elapsed');
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- 4. Server recomputes the hash from the immutable stored binding.
  BEGIN
    v_recomputed := public.prae_content_hash(r.content_binding);
  EXCEPTION WHEN OTHERS THEN
    v_recomputed := NULL;
  END;
  IF v_recomputed IS NULL
     OR r.content_hash_version <> 2
     OR NOT public.prae_constant_time_eq(v_recomputed, r.content_hash) THEN
    UPDATE public.prae_approvals
       SET state = 'invalidated', nonce_used = true, updated_at = now()
     WHERE id = _approval_id AND state = 'pending';
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'invalidated_by_edit', v_uid, v_role,
            'stored binding no longer matches the stored hash; approval invalidated');
    RETURN jsonb_build_object('ok', false, 'reason', 'content_changed');
  END IF;

  v_state := CASE WHEN _decision = 'approve' THEN 'approved' ELSE 'rejected' END;
  UPDATE public.prae_approvals
     SET state = v_state, nonce_used = true, decided_by_user_id = v_uid,
         decided_by_role = v_role, decided_at = now(), updated_at = now()
   WHERE id = _approval_id AND state = 'pending' AND nonce_used = false;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'replay_rejected', v_uid, v_role, 'already_decided');
    RETURN jsonb_build_object('ok', false, 'reason', 'already_decided');
  END IF;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (_approval_id, v_state, v_uid, v_role, 'decision recorded (execution disabled in Phase 1E)');

  RETURN jsonb_build_object('ok', true, 'state', v_state, 'executed', false);
END $function$;

REVOKE ALL ON FUNCTION public.prae_decide_approval(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prae_decide_approval(uuid, text, text) TO authenticated, service_role;