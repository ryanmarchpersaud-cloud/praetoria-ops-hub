CREATE OR REPLACE FUNCTION public.prae_create_approval(_content_binding jsonb, _division text, _ttl_minutes integer DEFAULT 15, _is_synthetic boolean DEFAULT true)
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

  -- 256 bits of randomness from two v4 UUIDs (gen_random_uuid is available in this schema).
  v_nonce := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
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

  RETURN jsonb_build_object('ok', true, 'approval_id', v_id, 'nonce', v_nonce,
                            'content_hash', v_hash, 'expires_at', v_expires);
END $function$;

REVOKE ALL ON FUNCTION public.prae_create_approval(jsonb, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prae_create_approval(jsonb, text, integer, boolean) TO authenticated, service_role;