-- ============ CUSTOMERS: scope worker/subcontractor visibility ============
DROP POLICY IF EXISTS "Workers view all customers" ON public.customers;
DROP POLICY IF EXISTS "Subcontractors view all customers" ON public.customers;

CREATE POLICY "Workers view assigned customers"
ON public.customers FOR SELECT TO authenticated
USING (
  is_worker_role(auth.uid()) AND (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.customer_id = customers.id AND is_worker_assigned_to_job(auth.uid(), j.id))
    OR EXISTS (SELECT 1 FROM public.visits v WHERE v.customer_id = customers.id AND is_worker_assigned_to_visit(auth.uid(), v.id))
  )
);

CREATE POLICY "Subcontractors view assigned customers"
ON public.customers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'subcontractor'::app_role) AND (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.customer_id = customers.id AND is_sub_assigned_to_job(auth.uid(), j.id))
    OR EXISTS (SELECT 1 FROM public.visits v WHERE v.customer_id = customers.id AND is_sub_assigned_to_visit(auth.uid(), v.id))
  )
);

-- ============ TEAM_MEMBERS: filter directory ============
DROP POLICY IF EXISTS "Authenticated users view team members for messaging" ON public.team_members;

CREATE POLICY "Ops staff and field roles view team directory"
ON public.team_members FOR SELECT TO authenticated
USING (
  is_ops_staff(auth.uid())
  OR is_worker_role(auth.uid())
  OR has_role(auth.uid(), 'subcontractor'::app_role)
  OR user_id = auth.uid()
);

-- ============ PROFILES: remove duplicate ============
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- ============ AGREEMENT_TEMPLATES: ops-only read ============
DROP POLICY IF EXISTS "Authenticated users can view active templates" ON public.agreement_templates;

CREATE POLICY "Ops staff view agreement templates"
ON public.agreement_templates FOR SELECT TO authenticated
USING (is_ops_staff(auth.uid()));

-- ============ STORAGE: agreement-attachments ============
DROP POLICY IF EXISTS "Anon can read agreement files for signing" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read agreement files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload agreement files" ON storage.objects;

CREATE POLICY "Ops staff read agreement files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agreement-attachments' AND is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff upload agreement files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agreement-attachments' AND is_ops_staff(auth.uid()));

-- ============ STORAGE: attachments bucket — remove blanket read ============
DROP POLICY IF EXISTS "attachments_authenticated_read_all" ON storage.objects;

CREATE POLICY "Owners read own attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());

CREATE POLICY "Ops staff read all attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments' AND is_ops_staff(auth.uid()));

-- ============ STORAGE: visit-photos — restrict deletes ============
DROP POLICY IF EXISTS "Authenticated users can delete visit photos" ON storage.objects;

CREATE POLICY "Ops staff delete visit photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'visit-photos' AND is_ops_staff(auth.uid()));