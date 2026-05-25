
-- customer_billing_profiles
DROP POLICY IF EXISTS "Staff full access to billing_profiles" ON public.customer_billing_profiles;
CREATE POLICY "Ops staff full access to billing_profiles" ON public.customer_billing_profiles
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- customer_notification_preferences
DROP POLICY IF EXISTS "Staff full access to notification_preferences" ON public.customer_notification_preferences;
CREATE POLICY "Ops staff full access to notification_preferences" ON public.customer_notification_preferences
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- customer_recurring_requests
DROP POLICY IF EXISTS "Staff full access to recurring requests" ON public.customer_recurring_requests;
CREATE POLICY "Ops staff full access to recurring requests" ON public.customer_recurring_requests
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- customer_referrals
DROP POLICY IF EXISTS "Staff full access to referrals" ON public.customer_referrals;
CREATE POLICY "Ops staff full access to referrals" ON public.customer_referrals
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- customer_service_preferences
DROP POLICY IF EXISTS "Staff full access to service preferences" ON public.customer_service_preferences;
CREATE POLICY "Ops staff full access to service preferences" ON public.customer_service_preferences
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Staff view expenses" ON public.expenses;
CREATE POLICY "Ops staff view expenses" ON public.expenses
  FOR SELECT USING (public.is_ops_staff(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Staff full access to notifications" ON public.notifications;
CREATE POLICY "Ops staff full access to notifications" ON public.notifications
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- service_requests
DROP POLICY IF EXISTS "Customers can view own requests" ON public.service_requests;
CREATE POLICY "Customers can view own requests" ON public.service_requests
  FOR SELECT USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage all requests" ON public.service_requests;
CREATE POLICY "Ops staff can manage all requests" ON public.service_requests
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- timesheets
DROP POLICY IF EXISTS "Users can view own timesheets" ON public.timesheets;
CREATE POLICY "Users can view own timesheets" ON public.timesheets
  FOR SELECT USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can manage all timesheets" ON public.timesheets;
CREATE POLICY "Ops staff can manage all timesheets" ON public.timesheets
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

-- hr_insurance_providers
DROP POLICY IF EXISTS "Authenticated users can view providers" ON public.hr_insurance_providers;
CREATE POLICY "Staff can view providers" ON public.hr_insurance_providers
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

-- Storage: visit-photos upload must be ops staff or assigned to visit
DROP POLICY IF EXISTS "Authenticated users can upload visit photos" ON storage.objects;
CREATE POLICY "Assigned users can upload visit photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'visit-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND (
          public.is_worker_assigned_to_visit(auth.uid(), ((storage.foldername(name))[1])::uuid)
          OR public.is_sub_assigned_to_visit(auth.uid(), ((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );
