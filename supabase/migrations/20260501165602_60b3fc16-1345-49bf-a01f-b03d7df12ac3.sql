
CREATE POLICY "Self-claim personal ownership"
ON public.personal_account_owners FOR INSERT
WITH CHECK (auth.uid() = user_id);
