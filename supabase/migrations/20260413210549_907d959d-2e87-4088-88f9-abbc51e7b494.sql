
CREATE POLICY "Subcontractors insert activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND user_id = auth.uid()
  );
