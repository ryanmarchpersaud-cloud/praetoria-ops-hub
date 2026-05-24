UPDATE auth.users
SET email = 'ryanmarchpersaud@gmail.com',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '9e2d16be-48aa-42c1-8235-541b868a195b';

UPDATE auth.identities
SET identity_data = jsonb_set(
      COALESCE(identity_data, '{}'::jsonb),
      '{email}',
      '"ryanmarchpersaud@gmail.com"'::jsonb
    ),
    updated_at = now()
WHERE user_id = '9e2d16be-48aa-42c1-8235-541b868a195b'
  AND provider = 'email';