-- Allow workers to update their own profile_photo_url
CREATE POLICY "Workers can update own photo"
ON public.worker_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);