
-- Allow all authenticated users to read team_members for messaging directory
CREATE POLICY "Authenticated users view team members for messaging"
ON public.team_members
FOR SELECT TO authenticated
USING (true);
