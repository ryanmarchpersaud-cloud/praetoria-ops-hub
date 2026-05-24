DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or ops staff view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));