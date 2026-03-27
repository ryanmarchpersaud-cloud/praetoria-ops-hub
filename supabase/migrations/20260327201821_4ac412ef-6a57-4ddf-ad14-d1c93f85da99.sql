-- Fix 1: Tighten operational table write access (exclude subcontractors from write ops)
-- Split ALL policies into SELECT + write policies for: customers, invoices, properties, quotes, visits

-- CUSTOMERS: drop ALL, add SELECT for non-customer, add write for staff_or_admin
DROP POLICY IF EXISTS "Staff full access to customers" ON public.customers;
CREATE POLICY "Staff view customers" ON public.customers FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- INVOICES
DROP POLICY IF EXISTS "Staff full access to invoices" ON public.invoices;
CREATE POLICY "Staff view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- PROPERTIES
DROP POLICY IF EXISTS "Staff full access to properties" ON public.properties;
CREATE POLICY "Staff view properties" ON public.properties FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
CREATE POLICY "Staff manage properties" ON public.properties FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- QUOTES
DROP POLICY IF EXISTS "Staff full access to quotes" ON public.quotes;
CREATE POLICY "Staff view quotes" ON public.quotes FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
CREATE POLICY "Staff manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- VISITS
DROP POLICY IF EXISTS "Staff full access to visits" ON public.visits;
CREATE POLICY "Staff view visits" ON public.visits FOR SELECT TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role));
CREATE POLICY "Staff manage visits" ON public.visits FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- Fix 2: Allow hr_admin to manage worker certs, equipment, training
-- Add hr_admin policies alongside existing admin/owner/manager ones

CREATE POLICY "HR admins manage worker certifications" ON public.worker_certifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));

CREATE POLICY "HR admins manage all equipment" ON public.worker_equipment_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));

CREATE POLICY "HR admins manage all training records" ON public.worker_training_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));

-- Also allow hr_admin to view/manage employee pay stubs and time off
CREATE POLICY "HR admins manage pay stubs" ON public.employee_pay_stubs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));

CREATE POLICY "HR admins manage time off requests" ON public.employee_time_off_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));

CREATE POLICY "HR admins manage emergency contacts" ON public.employee_emergency_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr_admin'::app_role));