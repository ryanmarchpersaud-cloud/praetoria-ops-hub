-- Fix Orane Williamson's invitation: the invited account was created with a typo
-- in the email (oranewilli**ii**amson2026@gmail.com). He signed up on his own with
-- the correct spelling, creating a second auth user with no role/profile linkage.
-- We correct the invited auth user's email to the real address and remove the
-- orphaned self-signup so the existing Lead Worker role, worker_profile and
-- history remain intact.

-- 1. Remove the orphaned self-signup profile row (empty, no owned data)
DELETE FROM public.profiles
WHERE user_id = 'ce8958fa-f67a-49ac-bf67-d492e42b62bd';

-- 2. Remove the orphaned auth user
DELETE FROM auth.users
WHERE id = 'ce8958fa-f67a-49ac-bf67-d492e42b62bd';

-- 3. Correct the email typo on the invited auth account
UPDATE auth.users
SET email = 'oranewilliamson2026@gmail.com',
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = 'd811e752-099c-41d2-a149-ec3df6e75b64';

-- 4. Sync the corrected email onto the worker profile
UPDATE public.worker_profiles
SET work_email = 'oranewilliamson2026@gmail.com'
WHERE user_id = 'd811e752-099c-41d2-a149-ec3df6e75b64';