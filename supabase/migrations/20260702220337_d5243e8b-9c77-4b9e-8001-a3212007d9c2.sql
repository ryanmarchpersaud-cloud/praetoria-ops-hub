-- Provision TEST Leasing Agent for QA of the PM Staff Portal.
-- Email: junk@praetoriagroup.ca
-- Temporary password will be set; user should change it after first login.

DO $$
DECLARE
  target_email text := 'junk@praetoriagroup.ca';
  new_user_id uuid;
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = target_email;

  IF existing_id IS NULL THEN
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      target_email,
      crypt('LeasingTest2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Test","last_name":"Leasing Agent","display_name":"TEST Leasing Agent"}'::jsonb,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', target_email,
        'email_verified', true
      ),
      'email',
      new_user_id::text,
      now(), now(), now()
    );

    existing_id := new_user_id;
  END IF;

  -- Grant leasing_agent role (idempotent).
  INSERT INTO public.user_roles (user_id, role)
  VALUES (existing_id, 'leasing_agent'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Explicitly ensure NO other role is present (defensive scope isolation).
  DELETE FROM public.user_roles
   WHERE user_id = existing_id
     AND role <> 'leasing_agent'::app_role;
END $$;