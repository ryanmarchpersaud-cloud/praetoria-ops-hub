CREATE OR REPLACE FUNCTION public.is_hr_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'hr_admin')
  )
$$;

DROP POLICY IF EXISTS "Ops staff can manage case notes" ON public.hr_case_notes;
CREATE POLICY "HR privileged manage case notes"
  ON public.hr_case_notes FOR ALL TO authenticated
  USING (public.is_hr_privileged(auth.uid()))
  WITH CHECK (public.is_hr_privileged(auth.uid()));

DROP POLICY IF EXISTS "Ops staff can manage WCB claims" ON public.hr_wcb_claims;
CREATE POLICY "HR privileged manage WCB claims"
  ON public.hr_wcb_claims FOR ALL TO authenticated
  USING (public.is_hr_privileged(auth.uid()))
  WITH CHECK (public.is_hr_privileged(auth.uid()));

DROP POLICY IF EXISTS "Ops staff can manage SGI records" ON public.hr_sgi_driver_records;
CREATE POLICY "HR privileged manage SGI records"
  ON public.hr_sgi_driver_records FOR ALL TO authenticated
  USING (public.is_hr_privileged(auth.uid()))
  WITH CHECK (public.is_hr_privileged(auth.uid()));

DROP POLICY IF EXISTS "Ops staff can manage compensation" ON public.hr_compensation_records;
CREATE POLICY "HR privileged manage compensation"
  ON public.hr_compensation_records FOR ALL TO authenticated
  USING (public.is_hr_privileged(auth.uid()))
  WITH CHECK (public.is_hr_privileged(auth.uid()));

DROP POLICY IF EXISTS "Owners and HR admins manage worker documents" ON public.worker_documents;
CREATE POLICY "Owners and HR admins manage worker documents"
  ON public.worker_documents FOR ALL TO authenticated
  USING (public.is_hr_privileged(auth.uid()))
  WITH CHECK (public.is_hr_privileged(auth.uid()));