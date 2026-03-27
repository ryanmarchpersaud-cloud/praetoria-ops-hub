-- ============================================================
-- RLS HARDENING MIGRATION
-- Fix critical data isolation gaps
-- ============================================================

-- 1. Create helper function: is_staff_or_admin (any non-customer, non-subcontractor role)
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role NOT IN ('customer', 'subcontractor')
  )
$$;

-- 2. Create helper function: is_admin_or_owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin')
  )
$$;

-- ============================================================
-- FIX: jobs table — replace wide-open policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can do everything with jobs" ON public.jobs;

CREATE POLICY "Staff full access to jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Customers view own jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = get_customer_id_for_user(auth.uid())
  );

-- ============================================================
-- FIX: leads table — replace wide-open policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can do everything with leads" ON public.leads;

CREATE POLICY "Staff full access to leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============================================================
-- FIX: quote_line_items — replace wide-open policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can do everything with quote_line_items" ON public.quote_line_items;

CREATE POLICY "Staff full access to quote_line_items"
  ON public.quote_line_items FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Customers view own quote line items"
  ON public.quote_line_items FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND quote_id IN (
      SELECT id FROM public.quotes
      WHERE customer_id = get_customer_id_for_user(auth.uid())
    )
  );

-- ============================================================
-- FIX: Expand admin-only policies to include 'owner' role
-- Update all policies that only check has_role('admin') to also accept 'owner'
-- ============================================================

-- customer_warnings: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins can manage customer warnings" ON public.customer_warnings;
CREATE POLICY "Admins and owners manage customer warnings"
  ON public.customer_warnings FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- incident_reports: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all incident reports" ON public.incident_reports;
CREATE POLICY "Admins and owners manage all incident reports"
  ON public.incident_reports FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- team_members: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all team_members" ON public.team_members;
CREATE POLICY "Admins and owners manage all team_members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- employee_pay_stubs: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all pay stubs" ON public.employee_pay_stubs;
CREATE POLICY "Admins and owners manage all pay stubs"
  ON public.employee_pay_stubs FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- employee_time_off_requests: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all time off" ON public.employee_time_off_requests;
CREATE POLICY "Admins and owners manage all time off"
  ON public.employee_time_off_requests FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- employee_emergency_contacts: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all emergency contacts" ON public.employee_emergency_contacts;
CREATE POLICY "Admins and owners manage all emergency contacts"
  ON public.employee_emergency_contacts FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- worker_certifications: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage worker certifications" ON public.worker_certifications;
CREATE POLICY "Admins and owners manage worker certifications"
  ON public.worker_certifications FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- worker_equipment_items: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all equipment" ON public.worker_equipment_items;
CREATE POLICY "Admins and owners manage all equipment"
  ON public.worker_equipment_items FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- worker_training_records: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all training records" ON public.worker_training_records;
CREATE POLICY "Admins and owners manage all training records"
  ON public.worker_training_records FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- subcontractors: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all subcontractors" ON public.subcontractors;
CREATE POLICY "Admins and owners manage all subcontractors"
  ON public.subcontractors FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- subcontractor_invoices: admin manage → admin or owner
DROP POLICY IF EXISTS "Admins manage all subcontractor invoices" ON public.subcontractor_invoices;
CREATE POLICY "Admins and owners manage all subcontractor invoices"
  ON public.subcontractor_invoices FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- files: replace wide-open policy
DROP POLICY IF EXISTS "Authenticated users can do everything with files" ON public.files;
CREATE POLICY "Staff full access to files"
  ON public.files FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Workers and subs manage own files"
  ON public.files FOR ALL
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());
