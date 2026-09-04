-- 1. No-expiry approvals: NULL ttl means never expires.
CREATE OR REPLACE FUNCTION public.prae_create_approval(_content_binding jsonb, _division text, _ttl_minutes integer DEFAULT NULL, _is_synthetic boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_nonce text; v_id uuid; v_hash text; v_channel text; v_expires timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  IF _ttl_minutes IS NOT NULL AND (_ttl_minutes < 1 OR _ttl_minutes > 525600) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_ttl');
  END IF;
  IF NOT public.prae_division_allowed(v_uid, _division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;

  BEGIN
    v_hash := public.prae_content_hash(_content_binding);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_binding', 'detail', SQLERRM);
  END;
  v_channel := _content_binding->>'channel';

  v_nonce := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires := CASE WHEN _ttl_minutes IS NULL THEN 'infinity'::timestamptz
                    ELSE now() + make_interval(mins => _ttl_minutes) END;

  INSERT INTO public.prae_approvals (
    nonce_digest, content_hash, content_hash_version, content_binding,
    channel, division, state, nonce_used, is_synthetic, expires_at
  ) VALUES (
    public.prae_sha256_hex(v_nonce), v_hash, 2, _content_binding,
    v_channel, _division, 'pending', false, COALESCE(_is_synthetic, true), v_expires
  ) RETURNING id INTO v_id;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (v_id, 'created', v_uid, 'owner_or_admin',
          format('approval created for division %s (ttl %s, server-computed hash)', _division, COALESCE(_ttl_minutes::text, 'none')));

  RETURN jsonb_build_object('ok', true, 'approval_id', v_id, 'nonce', v_nonce,
                            'content_hash', v_hash, 'expires_at', v_expires);
END $function$;

-- 2. Reopen / remove the expiry on an existing approval.
CREATE OR REPLACE FUNCTION public.prae_reopen_approval(_approval_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_role text; r public.prae_approvals%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  SELECT role::text INTO v_role FROM public.user_roles
   WHERE user_id = v_uid AND role IN ('owner','admin') ORDER BY role LIMIT 1;

  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF NOT public.prae_division_allowed(v_uid, r.division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;
  IF r.state NOT IN ('pending','expired') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_reopenable', 'state', r.state);
  END IF;
  IF r.execution_state <> 'not_started' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_executed');
  END IF;

  UPDATE public.prae_approvals
     SET state = 'pending', nonce_used = false, expires_at = 'infinity'::timestamptz, updated_at = now()
   WHERE id = _approval_id;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (_approval_id, 'reopened', v_uid, v_role, 'approval reopened; expiry removed');

  RETURN jsonb_build_object('ok', true);
END $function$;

-- 3. Delete one approval (and its audit trail).
CREATE OR REPLACE FUNCTION public.prae_delete_approval(_approval_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); r public.prae_approvals%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF NOT public.prae_division_allowed(v_uid, r.division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;
  IF r.execution_state = 'executing' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'execution_in_progress');
  END IF;

  DELETE FROM public.prae_approval_audit WHERE approval_id = _approval_id;
  DELETE FROM public.prae_approvals WHERE id = _approval_id;
  RETURN jsonb_build_object('ok', true, 'deleted', 1);
END $function$;

-- 4. Clear out finished / stale items in one go.
CREATE OR REPLACE FUNCTION public.prae_delete_approvals(_states text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_ids uuid[]; v_n int;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  IF _states IS NULL OR array_length(_states, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_states');
  END IF;

  SELECT array_agg(id) INTO v_ids FROM public.prae_approvals
   WHERE state = ANY(_states)
     AND execution_state <> 'executing'
     AND public.prae_division_allowed(v_uid, division);

  IF v_ids IS NULL THEN RETURN jsonb_build_object('ok', true, 'deleted', 0); END IF;

  DELETE FROM public.prae_approval_audit WHERE approval_id = ANY(v_ids);
  DELETE FROM public.prae_approvals WHERE id = ANY(v_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'deleted', v_n);
END $function$;

REVOKE ALL ON FUNCTION public.prae_reopen_approval(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.prae_delete_approval(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.prae_delete_approvals(text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.prae_reopen_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prae_delete_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prae_delete_approvals(text[]) TO authenticated;