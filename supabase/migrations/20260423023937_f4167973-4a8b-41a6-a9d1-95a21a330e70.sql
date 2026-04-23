CREATE OR REPLACE FUNCTION public.can_submit_field_lead(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_worker_role(_user_id)
    OR public.has_role(_user_id, 'subcontractor'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = _user_id
        AND COALESCE(tm.is_active, false) = true
        AND COALESCE(tm.status, '') IN ('Active', 'Invited')
        AND (
          COALESCE(tm.portal_worker, false) = true
          OR COALESCE(tm.portal_subcontractor, false) = true
        )
    )
  );
$$;

DROP POLICY IF EXISTS "Workers create leads from field" ON public.leads;
DROP POLICY IF EXISTS "Subcontractors create leads from field" ON public.leads;
DROP POLICY IF EXISTS "Workers view own field leads" ON public.leads;
DROP POLICY IF EXISTS "Subcontractors view own field leads" ON public.leads;

CREATE POLICY "Field users create leads from field"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_submit_field_lead(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Field users view own field leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.can_submit_field_lead(auth.uid())
  AND created_by = auth.uid()
);