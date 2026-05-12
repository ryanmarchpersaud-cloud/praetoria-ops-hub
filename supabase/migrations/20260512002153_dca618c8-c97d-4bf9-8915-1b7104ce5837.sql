-- Allow subcontractors to view properties tied to visits/jobs they are assigned to.
-- Without this policy, the worker/subcontractor app's visit detail join to
-- properties returns null and the address field is blank on the schedule.
CREATE POLICY "Subcontractors view properties for assigned work"
ON public.properties
FOR SELECT
USING (
  has_role(auth.uid(), 'subcontractor'::app_role)
  AND (
    -- Property is on a visit directly assigned to this subcontractor user
    id IN (
      SELECT v.property_id FROM public.visits v
      WHERE v.assigned_worker_id = auth.uid()
        AND v.property_id IS NOT NULL
    )
    -- Or the property is on a subcontractor_assignments row for their company
    OR id IN (
      SELECT sa.property_id FROM public.subcontractor_assignments sa
      JOIN public.subcontractors s ON s.id = sa.subcontractor_id
      WHERE s.user_id = auth.uid()
        AND sa.property_id IS NOT NULL
    )
    -- Or the property belongs to a visit linked through subcontractor_assignments
    OR id IN (
      SELECT v.property_id FROM public.visits v
      JOIN public.subcontractor_assignments sa ON sa.visit_id = v.id
      JOIN public.subcontractors s ON s.id = sa.subcontractor_id
      WHERE s.user_id = auth.uid()
        AND v.property_id IS NOT NULL
    )
  )
);