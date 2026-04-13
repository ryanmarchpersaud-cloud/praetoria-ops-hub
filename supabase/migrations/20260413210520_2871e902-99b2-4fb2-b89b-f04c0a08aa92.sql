
-- Allow subcontractors to update visits they are assigned to
CREATE POLICY "Subcontractors update assigned visits"
  ON public.visits
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND is_sub_assigned_to_visit(auth.uid(), id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND is_sub_assigned_to_visit(auth.uid(), id)
  );
