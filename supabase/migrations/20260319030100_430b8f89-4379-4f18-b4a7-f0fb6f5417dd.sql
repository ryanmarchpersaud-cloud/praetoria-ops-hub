
-- Allow workers to insert their own certifications (for submission, status = 'pending')
CREATE POLICY "Workers submit own certifications"
ON public.worker_certifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
