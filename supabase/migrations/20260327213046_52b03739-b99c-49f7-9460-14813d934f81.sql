
-- ============================================================
-- Helper functions for assignment-based access
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_worker_assigned_to_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visits
    WHERE id = _visit_id AND assigned_worker_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_worker_assigned_to_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs WHERE id = _job_id AND assigned_to = _user_id
    UNION ALL
    SELECT 1 FROM public.visits WHERE job_id = _job_id AND assigned_worker_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_sub_assigned_to_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subcontractor_assignments sa
    JOIN public.subcontractors s ON s.id = sa.subcontractor_id
    WHERE sa.visit_id = _visit_id AND s.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_sub_assigned_to_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subcontractor_assignments sa
    JOIN public.subcontractors s ON s.id = sa.subcontractor_id
    WHERE sa.job_id = _job_id AND s.user_id = _user_id
  )
$$;

-- is_worker_role: true for staff/lead_worker/supervisor/dispatcher
CREATE OR REPLACE FUNCTION public.is_worker_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('staff', 'lead_worker', 'supervisor', 'dispatcher')
  )
$$;

-- is_ops_staff: admin-tier roles who see all ops records
CREATE OR REPLACE FUNCTION public.is_ops_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'ops_manager', 'accountant', 'hr_admin', 'manager')
  )
$$;

-- ============================================================
-- VISITS RLS: replace broad staff policies with assignment-based
-- ============================================================

DROP POLICY IF EXISTS "Staff manage visits" ON public.visits;
DROP POLICY IF EXISTS "Staff view visits" ON public.visits;
DROP POLICY IF EXISTS "Customers view own visits" ON public.visits;

-- Admin-tier: full CRUD
CREATE POLICY "Admin staff full access visits"
  ON public.visits FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid()))
  WITH CHECK (is_ops_staff(auth.uid()));

-- Workers: read only assigned visits
CREATE POLICY "Workers view assigned visits"
  ON public.visits FOR SELECT TO authenticated
  USING (
    is_worker_role(auth.uid())
    AND assigned_worker_id = auth.uid()
  );

-- Workers: update assigned visits (for status changes during execution)
CREATE POLICY "Workers update assigned visits"
  ON public.visits FOR UPDATE TO authenticated
  USING (
    is_worker_role(auth.uid())
    AND assigned_worker_id = auth.uid()
  )
  WITH CHECK (
    is_worker_role(auth.uid())
    AND assigned_worker_id = auth.uid()
  );

-- Subcontractors: read only assigned visits
CREATE POLICY "Subcontractors view assigned visits"
  ON public.visits FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND is_sub_assigned_to_visit(auth.uid(), id)
  );

-- Customers: own visits only
CREATE POLICY "Customers view own visits"
  ON public.visits FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = get_customer_id_for_user(auth.uid())
  );

-- ============================================================
-- JOBS RLS: replace broad staff policy with assignment-based
-- ============================================================

DROP POLICY IF EXISTS "Staff full access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers view own jobs" ON public.jobs;

-- Admin-tier: full CRUD
CREATE POLICY "Admin staff full access jobs"
  ON public.jobs FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid()))
  WITH CHECK (is_ops_staff(auth.uid()));

-- Workers: read only assigned jobs
CREATE POLICY "Workers view assigned jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (
    is_worker_role(auth.uid())
    AND is_worker_assigned_to_job(auth.uid(), id)
  );

-- Subcontractors: read only assigned jobs
CREATE POLICY "Subcontractors view assigned jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND is_sub_assigned_to_job(auth.uid(), id)
  );

-- Customers: own jobs only
CREATE POLICY "Customers view own jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = get_customer_id_for_user(auth.uid())
  );

-- ============================================================
-- SUBCONTRACTOR_ASSIGNMENTS: expand admin policy to include owner
-- ============================================================

DROP POLICY IF EXISTS "Admins manage all assignments" ON public.subcontractor_assignments;

CREATE POLICY "Admin staff manage assignments"
  ON public.subcontractor_assignments FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid()))
  WITH CHECK (is_ops_staff(auth.uid()));

-- ============================================================
-- CHILD TABLE: job_line_items — restrict to ops staff + assigned
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view job_line_items" ON public.job_line_items;
DROP POLICY IF EXISTS "Staff delete job_line_items" ON public.job_line_items;
DROP POLICY IF EXISTS "Staff insert job_line_items" ON public.job_line_items;
DROP POLICY IF EXISTS "Staff update job_line_items" ON public.job_line_items;

CREATE POLICY "Admin staff manage job_line_items"
  ON public.job_line_items FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid()))
  WITH CHECK (is_ops_staff(auth.uid()));

CREATE POLICY "Workers view assigned job_line_items"
  ON public.job_line_items FOR SELECT TO authenticated
  USING (
    is_worker_role(auth.uid())
    AND is_worker_assigned_to_job(auth.uid(), job_id)
  );

-- ============================================================
-- CHILD TABLE: visit_photos — restrict to assignment
-- ============================================================

DROP POLICY IF EXISTS "Staff full access to visit_photos" ON public.visit_photos;
DROP POLICY IF EXISTS "Customers view own visit_photos" ON public.visit_photos;

CREATE POLICY "Admin staff manage visit_photos"
  ON public.visit_photos FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid()))
  WITH CHECK (is_ops_staff(auth.uid()));

-- Workers: manage photos for assigned visits
CREATE POLICY "Workers manage assigned visit_photos"
  ON public.visit_photos FOR ALL TO authenticated
  USING (
    is_worker_role(auth.uid())
    AND is_worker_assigned_to_visit(auth.uid(), visit_id)
  )
  WITH CHECK (
    is_worker_role(auth.uid())
    AND is_worker_assigned_to_visit(auth.uid(), visit_id)
  );

-- Subcontractors: view photos for assigned visits
CREATE POLICY "Subs view assigned visit_photos"
  ON public.visit_photos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'subcontractor'::app_role)
    AND is_sub_assigned_to_visit(auth.uid(), visit_id)
  );

-- Customers: view own visit photos
CREATE POLICY "Customers view own visit_photos"
  ON public.visit_photos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND v.customer_id = get_customer_id_for_user(auth.uid())
    )
  );
