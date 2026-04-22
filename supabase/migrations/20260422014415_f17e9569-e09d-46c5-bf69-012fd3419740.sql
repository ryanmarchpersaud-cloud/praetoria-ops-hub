ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Flag the 5 testers we just created with the shared temp password
UPDATE public.profiles
SET must_change_password = true
WHERE user_id IN (
  '7e58181f-b2d1-4986-b17e-bda4679877ae', -- Islam
  'ebd9b1ff-25d6-4901-88ed-f69b3d48c8e4', -- Olutayo
  'df7d2665-0bf1-432c-a064-8c0517b50e58', -- Ryan
  '3a7a164a-57ce-464c-96f1-610b6cf23118', -- Shadiya
  '5d936db7-c0a4-4231-b59d-9d812a41efa3'  -- Sebastian
);

-- Make sure profiles exist for them (handle_new_user normally creates these on signup,
-- but Islam predates this and the others may have been created without metadata)
INSERT INTO public.profiles (user_id, display_name, must_change_password)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), true
FROM auth.users u
WHERE u.id IN (
  '7e58181f-b2d1-4986-b17e-bda4679877ae',
  'ebd9b1ff-25d6-4901-88ed-f69b3d48c8e4',
  'df7d2665-0bf1-432c-a064-8c0517b50e58',
  '3a7a164a-57ce-464c-96f1-610b6cf23118',
  '5d936db7-c0a4-4231-b59d-9d812a41efa3'
)
ON CONFLICT (user_id) DO UPDATE SET must_change_password = true;