
DROP POLICY IF EXISTS "Staff view automation logs" ON public.automation_logs;
CREATE POLICY "Ops staff view automation logs" ON public.automation_logs
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view automation rules" ON public.automation_rules;
CREATE POLICY "Ops staff view automation rules" ON public.automation_rules
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view client hub settings" ON public.client_hub_settings;
CREATE POLICY "Ops staff view client hub settings" ON public.client_hub_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view company settings" ON public.company_settings;
CREATE POLICY "Ops staff view company settings" ON public.company_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view finance categories" ON public.finance_categories;
CREATE POLICY "Ops staff view finance categories" ON public.finance_categories
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view messaging settings" ON public.messaging_settings;
CREATE POLICY "Ops staff view messaging settings" ON public.messaging_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage templates" ON public.notification_templates;
CREATE POLICY "Ops staff manage notification templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view payment settings" ON public.payment_settings;
CREATE POLICY "Ops staff view payment settings" ON public.payment_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view portal settings" ON public.portal_settings;
CREATE POLICY "Ops staff view portal settings" ON public.portal_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view route settings" ON public.route_settings;
CREATE POLICY "Ops staff view route settings" ON public.route_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view schedule settings" ON public.schedule_settings;
CREATE POLICY "Ops staff view schedule settings" ON public.schedule_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view request booking settings" ON public.request_booking_settings;
CREATE POLICY "Ops staff view request booking settings" ON public.request_booking_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view territories" ON public.service_territories;
CREATE POLICY "Ops staff view territories" ON public.service_territories
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view vendors" ON public.vendors;
CREATE POLICY "Ops staff view vendors" ON public.vendors
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view work settings" ON public.work_settings;
CREATE POLICY "Ops staff view work settings" ON public.work_settings
  FOR SELECT TO authenticated USING (public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Subs manage own documents" ON storage.objects;

CREATE POLICY "Subcontractors update own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'subcontractor-documents'
    AND (storage.foldername(name))[1] = public.get_subcontractor_id_for_user(auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'subcontractor-documents'
    AND (storage.foldername(name))[1] = public.get_subcontractor_id_for_user(auth.uid())::text
  );

CREATE POLICY "Subcontractors delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'subcontractor-documents'
    AND (storage.foldername(name))[1] = public.get_subcontractor_id_for_user(auth.uid())::text
  );
