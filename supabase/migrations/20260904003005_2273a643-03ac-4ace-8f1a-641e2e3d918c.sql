-- ---------------------------------------------------------------------------
-- Phase 1E.2 — Server-authoritative approval binding and authorization ordering
-- ---------------------------------------------------------------------------

DO $$
DECLARE v_real int;
BEGIN
  SELECT count(*) INTO v_real FROM public.prae_approvals WHERE is_synthetic IS NOT TRUE;
  IF v_real > 0 THEN
    RAISE EXCEPTION 'aborting: % non-synthetic approval(s) exist', v_real;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Canonicalisation helpers (must byte-match the TypeScript canonicalizeAction)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prae_canonical_emails(_arr jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $fn$
DECLARE v jsonb; parts text[] := ARRAY[]::text[];
BEGIN
  IF _arr IS NULL OR jsonb_typeof(_arr) <> 'array' THEN
    RAISE EXCEPTION 'invalid_binding: address list must be an array';
  END IF;
  FOR v IN SELECT value FROM jsonb_array_elements(_arr) LOOP
    IF jsonb_typeof(v) <> 'string' THEN
      RAISE EXCEPTION 'invalid_binding: address must be a string';
    END IF;
    parts := parts || (to_json(lower(btrim(v #>> '{}')))::text);
  END LOOP;
  RETURN '[' || array_to_string(parts, ',') || ']';
END $fn$;

CREATE OR REPLACE FUNCTION public.prae_canonical_objects(_arr jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $fn$
DECLARE v jsonb; parts text[] := ARRAY[]::text[]; k text; n numeric; nkeys int;
BEGIN
  IF _arr IS NULL OR jsonb_typeof(_arr) <> 'array' THEN
    RAISE EXCEPTION 'invalid_binding: attachment/media list must be an array';
  END IF;
  FOR v IN SELECT value FROM jsonb_array_elements(_arr) LOOP
    IF jsonb_typeof(v) <> 'object' THEN
      RAISE EXCEPTION 'invalid_binding: attachment/media entry must be an object';
    END IF;
    FOR k IN SELECT jsonb_object_keys(v) LOOP
      IF k NOT IN ('storageObjectId','storageObjectVersion','filename','mimeType','sizeBytes','sha256') THEN
        RAISE EXCEPTION 'invalid_binding: unknown attachment field %', k;
      END IF;
    END LOOP;
    SELECT count(*) INTO nkeys FROM jsonb_object_keys(v);
    IF nkeys <> 6 THEN
      RAISE EXCEPTION 'invalid_binding: attachment/media entry must have exactly 6 fields';
    END IF;
    IF jsonb_typeof(v->'storageObjectId') <> 'string'
       OR jsonb_typeof(v->'storageObjectVersion') <> 'string'
       OR jsonb_typeof(v->'filename') <> 'string'
       OR jsonb_typeof(v->'mimeType') <> 'string'
       OR jsonb_typeof(v->'sha256') <> 'string' THEN
      RAISE EXCEPTION 'invalid_binding: attachment/media string fields malformed';
    END IF;
    IF jsonb_typeof(v->'sizeBytes') <> 'number' THEN
      RAISE EXCEPTION 'invalid_binding: sizeBytes must be a number';
    END IF;
    n := (v->>'sizeBytes')::numeric;
    IF n <> floor(n) OR n < 0 THEN
      RAISE EXCEPTION 'invalid_binding: sizeBytes must be a non-negative integer';
    END IF;
    IF lower(v->>'sha256') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'invalid_binding: sha256 must be 64 hex characters';
    END IF;
    parts := parts || (
      '[' || to_json(v->>'storageObjectId')::text
          || ',' || to_json(v->>'storageObjectVersion')::text
          || ',' || to_json(v->>'filename')::text
          || ',' || to_json(v->>'mimeType')::text
          || ',' || (n::bigint)::text
          || ',' || to_json(lower(v->>'sha256'))::text
          || ']');
  END LOOP;
  RETURN '[' || array_to_string(parts, ',') || ']';
END $fn$;

CREATE OR REPLACE FUNCTION public.prae_canonical_action(_b jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $fn$
DECLARE k text; ch text; body text;
BEGIN
  IF _b IS NULL OR jsonb_typeof(_b) <> 'object' THEN
    RAISE EXCEPTION 'invalid_binding: content_binding is required';
  END IF;
  ch := _b->>'channel';

  IF ch = 'email' THEN
    FOR k IN SELECT jsonb_object_keys(_b) LOOP
      IF k NOT IN ('channel','from','to','cc','subject','body','attachments') THEN
        RAISE EXCEPTION 'invalid_binding: unknown field %', k;
      END IF;
    END LOOP;
    IF jsonb_typeof(_b->'from') <> 'string'
       OR jsonb_typeof(_b->'subject') <> 'string'
       OR jsonb_typeof(_b->'body') <> 'string' THEN
      RAISE EXCEPTION 'invalid_binding: email requires from, subject and body strings';
    END IF;
    IF _b->'to' IS NULL OR _b->'attachments' IS NULL THEN
      RAISE EXCEPTION 'invalid_binding: email requires to and attachments';
    END IF;
    body := replace(_b->>'body', E'\r\n', E'\n');
    RETURN '["prae.v2","email",'
      || to_json(lower(btrim(_b->>'from')))::text || ','
      || public.prae_canonical_emails(_b->'to') || ','
      || public.prae_canonical_emails(COALESCE(_b->'cc', '[]'::jsonb)) || ','
      || to_json(_b->>'subject')::text || ','
      || to_json(body)::text || ','
      || public.prae_canonical_objects(_b->'attachments') || ']';

  ELSIF ch = 'sms' THEN
    FOR k IN SELECT jsonb_object_keys(_b) LOOP
      IF k NOT IN ('channel','fromNumber','toNumber','body','media') THEN
        RAISE EXCEPTION 'invalid_binding: unknown field %', k;
      END IF;
    END LOOP;
    IF jsonb_typeof(_b->'fromNumber') <> 'string'
       OR jsonb_typeof(_b->'toNumber') <> 'string'
       OR jsonb_typeof(_b->'body') <> 'string' THEN
      RAISE EXCEPTION 'invalid_binding: sms requires fromNumber, toNumber and body strings';
    END IF;
    IF _b->'media' IS NULL THEN
      RAISE EXCEPTION 'invalid_binding: sms requires media';
    END IF;
    body := replace(_b->>'body', E'\r\n', E'\n');
    RETURN '["prae.v2","sms",'
      || to_json(btrim(_b->>'fromNumber'))::text || ','
      || to_json(btrim(_b->>'toNumber'))::text || ','
      || to_json(body)::text || ','
      || public.prae_canonical_objects(_b->'media') || ']';
  END IF;

  RAISE EXCEPTION 'invalid_binding: unknown channel';
END $fn$;

CREATE OR REPLACE FUNCTION public.prae_content_hash(_b jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $fn$
  SELECT public.prae_sha256_hex(public.prae_canonical_action(_b))
$fn$;

-- --------------------------------------------------------------------------
-- Preserve the synthetic legacy row, permanently unusable
-- --------------------------------------------------------------------------

UPDATE public.prae_approvals a
   SET content_binding = jsonb_build_object(
         'channel', 'email',
         'from', 'synthetic@example.invalid',
         'to', jsonb_build_array('synthetic-recipient@example.invalid'),
         'subject', 'synthetic legacy approval (phase 1e.2 migration)',
         'body', 'This synthetic approval predates server-authoritative binding and is permanently invalidated.',
         'attachments', '[]'::jsonb),
       content_hash = public.prae_content_hash(jsonb_build_object(
         'channel', 'email',
         'from', 'synthetic@example.invalid',
         'to', jsonb_build_array('synthetic-recipient@example.invalid'),
         'subject', 'synthetic legacy approval (phase 1e.2 migration)',
         'body', 'This synthetic approval predates server-authoritative binding and is permanently invalidated.',
         'attachments', '[]'::jsonb)),
       content_hash_version = 2,
       state = 'invalidated',
       nonce_used = true,
       updated_at = now()
 WHERE a.is_synthetic IS TRUE;

INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
SELECT id, 'invalidated_by_edit', NULL, NULL,
       'phase 1e.2 security migration: caller-supplied content hash removed; synthetic row permanently invalidated and rebound to an explicit synthetic legacy binding'
  FROM public.prae_approvals WHERE is_synthetic IS TRUE;

-- --------------------------------------------------------------------------
-- Constraints: binding mandatory, version pinned
-- --------------------------------------------------------------------------

ALTER TABLE public.prae_approvals ALTER COLUMN content_binding SET NOT NULL;

ALTER TABLE public.prae_approvals
  DROP CONSTRAINT IF EXISTS prae_approvals_hash_version_supported;
ALTER TABLE public.prae_approvals
  ADD CONSTRAINT prae_approvals_hash_version_supported CHECK (content_hash_version = 2);

-- Bound fields are immutable after creation
CREATE OR REPLACE FUNCTION public.prae_approvals_bound_fields_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NEW.channel IS DISTINCT FROM OLD.channel
     OR NEW.division IS DISTINCT FROM OLD.division
     OR NEW.content_binding IS DISTINCT FROM OLD.content_binding
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR NEW.content_hash_version IS DISTINCT FROM OLD.content_hash_version THEN
    RAISE EXCEPTION 'prae_approvals: channel, division, content_binding, content_hash and content_hash_version are immutable';
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS prae_approvals_bound_fields_immutable ON public.prae_approvals;
CREATE TRIGGER prae_approvals_bound_fields_immutable
BEFORE UPDATE ON public.prae_approvals
FOR EACH ROW EXECUTE FUNCTION public.prae_approvals_bound_fields_immutable();

-- --------------------------------------------------------------------------
-- Replace the caller-controlled RPCs
-- --------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.prae_create_approval(text, text, text, jsonb, integer, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prae_decide_approval(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.prae_create_approval(text, text, text, jsonb, integer, boolean);
DROP FUNCTION IF EXISTS public.prae_decide_approval(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.prae_create_approval(
  _content_binding jsonb,
  _division text,
  _ttl_minutes integer DEFAULT 15,
  _is_synthetic boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_uid uuid := auth.uid(); v_nonce text; v_id uuid; v_hash text; v_channel text; v_expires timestamptz;
BEGIN
  -- Authorization first: identity and role before any state access or audit write.
  IF v_uid IS NULL OR NOT public.is_admin_or_owner(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_permitted');
  END IF;
  IF _ttl_minutes IS NULL OR _ttl_minutes < 1 OR _ttl_minutes > 60 THEN
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

  v_nonce := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + make_interval(mins => _ttl_minutes);

  INSERT INTO public.prae_approvals (
    nonce_digest, content_hash, content_hash_version, content_binding,
    channel, division, state, nonce_used, is_synthetic, expires_at
  ) VALUES (
    public.prae_sha256_hex(v_nonce), v_hash, 2, _content_binding,
    v_channel, _division, 'pending', false, COALESCE(_is_synthetic, true), v_expires
  ) RETURNING id INTO v_id;

  INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
  VALUES (v_id, 'created', v_uid, 'owner_or_admin',
          format('approval created for division %s (ttl %s min, server-computed hash)', _division, _ttl_minutes));

  -- raw nonce is returned here and NOWHERE else; it is never stored or logged.
  RETURN jsonb_build_object('ok', true, 'approval_id', v_id, 'nonce', v_nonce,
                            'content_hash', v_hash, 'expires_at', v_expires);
END $fn$;

CREATE OR REPLACE FUNCTION public.prae_decide_approval(
  _approval_id uuid,
  _nonce text,
  _decision text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
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

  SELECT stopped INTO v_stopped FROM public.prae_emergency_stop WHERE id LIMIT 1;
  IF COALESCE(v_stopped, true) THEN
    INSERT INTO public.prae_approval_audit (approval_id, event, actor_user_id, actor_role, detail)
    SELECT _approval_id, 'emergency_stop_rejected', v_uid, v_role, 'emergency_stop_active'
    WHERE EXISTS (SELECT 1 FROM public.prae_approvals WHERE id = _approval_id);
    RETURN jsonb_build_object('ok', false, 'reason', 'emergency_stop_active');
  END IF;

  -- 2. Locked transaction.
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

  -- 3. Server recomputes the hash from the immutable stored binding.
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
END $fn$;

-- --------------------------------------------------------------------------
-- Privilege matrix: exactly two public authenticated entry points
-- --------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.prae_sha256_hex(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_constant_time_eq(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_division_allowed(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_canonical_emails(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_canonical_objects(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_canonical_action(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_content_hash(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prae_approvals_bound_fields_immutable() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prae_sha256_hex(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_constant_time_eq(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_division_allowed(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_canonical_emails(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_canonical_objects(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_canonical_action(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.prae_content_hash(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.prae_create_approval(jsonb, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prae_decide_approval(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prae_create_approval(jsonb, text, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prae_decide_approval(uuid, text, text) TO authenticated, service_role;