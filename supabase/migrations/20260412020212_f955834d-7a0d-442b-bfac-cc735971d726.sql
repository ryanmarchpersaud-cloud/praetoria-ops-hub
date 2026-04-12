CREATE POLICY "Authenticated users can view providers"
ON public.hr_insurance_providers
FOR SELECT
TO authenticated
USING (true);