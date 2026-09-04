DO $$
DECLARE v_real int;
BEGIN
  SELECT count(*) INTO v_real FROM public.prae_approvals WHERE is_synthetic IS DISTINCT FROM true;
  IF v_real > 0 THEN
    RAISE EXCEPTION 'Aborting: % non-synthetic prae_approvals rows present', v_real;
  END IF;
END $$;

-- 1. Replace the plaintext nonce column with a SHA-256 digest column.
ALTER TABLE public.prae_approvals ADD COLUMN IF NOT EXISTS nonce_digest text;
UPDATE public.prae_approvals
   SET nonce_digest = encode(sha256(convert_to(gen_random_uuid()::text, 'utf8')), 'hex')
 WHERE nonce_digest IS NULL;
ALTER TABLE public.prae_approvals ALTER COLUMN nonce_digest SET NOT NULL;
ALTER TABLE public.prae_approvals
  ADD CONSTRAINT prae_approvals_nonce_digest_hex CHECK (nonce_digest ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX IF NOT EXISTS prae_approvals_nonce_digest_key
  ON public.prae_approvals (nonce_digest);
ALTER TABLE public.prae_approvals DROP COLUMN IF EXISTS nonce;

-- 2. Versioned content binding + TTL bounds (default 15 min, hard max 60 min).
ALTER TABLE public.prae_approvals
  ADD COLUMN IF NOT EXISTS content_hash_version integer NOT NULL DEFAULT 2;
ALTER TABLE public.prae_approvals
  ADD COLUMN IF NOT EXISTS content_binding jsonb;
UPDATE public.prae_approvals
   SET expires_at = LEAST(expires_at, created_at + interval '60 minutes')
 WHERE expires_at > created_at + interval '60 minutes';
UPDATE public.prae_approvals
   SET expires_at = created_at + interval '15 minutes'
 WHERE expires_at <= created_at;
ALTER TABLE public.prae_approvals
  ADD CONSTRAINT prae_approvals_ttl_bounds
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '60 minutes');

-- 3. No browser writes, ever.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prae_approvals FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prae_approval_audit FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prae_emergency_stop FROM authenticated, anon;

-- 4. Helpers.
CREATE OR REPLACE FUNCTION public.prae_sha256_hex(_input text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(COALESCE(_input, ''), 'utf8')), 'hex')
$$;

-- Constant-time equality: both sides are hashed to fixed 32 bytes first, then
-- compared with a full-length XOR accumulation (no early exit, length-independent).
CREATE OR REPLACE FUNCTION public.prae_constant_time_eq(_a text, _b text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE ba bytea; bb bytea; acc int := 0; i int;
BEGIN
  IF _a IS NULL OR _b IS NULL THEN RETURN false; END IF;
  ba := sha256(convert_to(_a, 'utf8'));
  bb := sha256(convert_to(_b, 'utf8'));
  FOR i IN 0..31 LOOP
    acc := acc | (get_byte(ba, i) # get_byte(bb, i));
  END LOOP;
  RETURN acc = 0;
END $$;

-- Division access. Phase 1E.1: only owner/admin may approve at all. A user with
-- explicit division assignments is scoped to those divisions; a user with no
-- explicit assignment is organisation-wide.
CREATE OR REPLACE FUNCTION public.prae_division_allowed(_user_id uuid, _division text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_divs text[];
BEGIN
  IF _user_id IS NULL OR NOT public.is_admin_or_owner(_user_id) THEN RETURN false; END IF;
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT m.division FROM public.comms_mailboxes m
    WHERE m.division IS NOT NULL AND m.assigned_rep_user_id = _user_id
  ), ARRAY[]::text[]) INTO v_divs;
  IF array_length(v_divs, 1) IS NULL THEN RETURN true; END IF;
  RETURN _division = ANY (v_divs);
END $$;

-- 5. Create an approval; returns the raw nonce EXACTLY ONCE. Only the digest is stored.
CREATE OR REPLACE FUNCTION public.prae_create_approval(
  _channel text,
  _division text,
  _content_hash text,
  _content_binding jsonb DEFAULT NULL,
  _ttl_minutes integer DEFAULT 15,
  _is_synthetic boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_nonce text; v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  IF _channel NOT IN ('email','sms') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_channel');
  END IF;
  IF _ttl_minutes IS NULL OR _ttl_minutes <> floor(_ttl_minutes) OR _ttl_minutes < 1 OR _ttl_minutes > 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_ttl');
  END IF;
  IF _content_hash IS NULL OR _content_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_content_hash');
  END IF;
  IF NOT public.prae_division_allowed(v_uid, _division) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
  END IF;

  v_nonce := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.prae_approvals (
    nonce_digest, content_hash, content_hash_version, content_binding,
    channel, division, state, nonce_used, is_synthetic, expires_at
  ) VALUES (
    public.prae_sha256_hex(v_nonce), _content_hash, 2, _content_binding,
    _channel, _division, 'pending', false, COALESCE(_is_synthetic, true),
    now() + make_interval(mins => _ttl_minutes)
  ) RETURNING id INTO v_id;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (v_id, 'created', v_uid, 'owner_or_admin',
          format('approval created for division %s (ttl %s min)', _division, _ttl_minutes));

  -- raw nonce is returned here and NOWHERE else; it is never stored or logged.
  RETURN jsonb_build_object('ok', true, 'approval_id', v_id, 'nonce', v_nonce,
                            'expires_at', (now() + make_interval(mins => _ttl_minutes)));
END $$;

-- 6. Atomic, single-use decision.
CREATE OR REPLACE FUNCTION public.prae_decide_approval(
  _approval_id uuid,
  _nonce text,
  _decision text,
  _content_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_stopped boolean;
  r public.prae_approvals%ROWTYPE;
  v_updated int;
  v_state text;
BEGIN
  IF _decision NOT IN ('approve','reject') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_decision');
  END IF;

  SELECT stopped INTO v_stopped FROM public.prae_emergency_stop WHERE id LIMIT 1;
  IF COALESCE(v_stopped, true) THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    SELECT _approval_id, 'emergency_stop_rejected', v_uid, NULL, 'emergency_stop_active'
    WHERE EXISTS (SELECT 1 FROM public.prae_approvals WHERE id = _approval_id);
    RETURN jsonb_build_object('ok', false, 'reason', 'emergency_stop_active');
  END IF;

  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  SELECT role::text INTO v_role FROM public.user_roles
   WHERE user_id = v_uid AND role IN ('owner','admin') ORDER BY role LIMIT 1;

  -- Row lock makes the whole decision atomic against concurrent attempts.
  SELECT * INTO r FROM public.prae_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT public.prae_division_allowed(v_uid, r.division) THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'unauthorized_rejected', v_uid, v_role, 'division_not_permitted');
    RETURN jsonb_build_object('ok', false, 'reason', 'division_not_permitted');
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

  IF _content_hash IS NULL OR r.content_hash <> _content_hash THEN
    UPDATE public.prae_approvals
       SET state = 'invalidated', nonce_used = true, updated_at = now()
     WHERE id = _approval_id AND state = 'pending';
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    VALUES (_approval_id, 'invalidated_by_edit', v_uid, v_role,
            'proposed content changed; prior approval invalidated');
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
END $$;

REVOKE ALL ON FUNCTION public.prae_sha256_hex(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prae_constant_time_eq(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prae_division_allowed(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prae_create_approval(text, text, text, jsonb, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prae_decide_approval(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prae_create_approval(text, text, text, jsonb, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prae_decide_approval(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prae_sha256_hex(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_constant_time_eq(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_division_allowed(uuid, text) TO authenticated, service_role;