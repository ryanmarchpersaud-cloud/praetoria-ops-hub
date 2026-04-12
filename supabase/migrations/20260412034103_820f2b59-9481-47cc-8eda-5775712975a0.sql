
-- Fix template management policy
DROP POLICY "Authenticated users can manage templates" ON public.agreement_templates;

CREATE POLICY "Authenticated can insert templates"
  ON public.agreement_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update templates"
  ON public.agreement_templates FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete templates"
  ON public.agreement_templates FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix signature insert - require agreement exists
DROP POLICY "Anyone can insert signature" ON public.agreement_signatures;

CREATE POLICY "Can insert signature for valid agreement"
  ON public.agreement_signatures FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = agreement_id
      AND a.status IN ('sent', 'viewed')
    )
  );

-- Fix audit log insert
DROP POLICY "Anyone can insert audit log" ON public.agreement_audit_log;

CREATE POLICY "Can insert audit for valid agreement"
  ON public.agreement_audit_log FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = agreement_id
    )
  );
