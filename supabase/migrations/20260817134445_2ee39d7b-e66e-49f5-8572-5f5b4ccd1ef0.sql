-- 1. Narrow ops staff read on the 'attachments' bucket to known operational folders
DROP POLICY IF EXISTS "Ops staff read all attachments" ON storage.objects;
CREATE POLICY "Ops staff read operational attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND is_ops_staff(auth.uid())
  AND (
    (storage.foldername(name))[1] IN ('incidents','incident-shares','messaging','customer-documents','quotes','invoices','jobs','visits','agreements','logos')
    OR array_length(storage.foldername(name), 1) IS NULL
  )
);

-- 2. Allow internal staff to read HR checklist templates (non-sensitive), ops staff keep manage rights
DROP POLICY IF EXISTS "Staff can view checklist templates" ON public.hr_checklist_templates;
CREATE POLICY "Staff can view checklist templates"
ON public.hr_checklist_templates FOR SELECT TO authenticated
USING (is_staff_or_admin(auth.uid()) OR is_hr_privileged(auth.uid()));

-- 3. Prevent admins from modifying their own role rows (self privilege escalation edge case)
DROP POLICY IF EXISTS "Admins manage non-owner roles" ON public.user_roles;
CREATE POLICY "Admins manage non-owner roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'owner'::app_role
  AND NOT is_owner(user_id)
  AND user_id <> auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'owner'::app_role
  AND NOT is_owner(user_id)
  AND user_id <> auth.uid()
);

-- 4. Restrict worker equipment updates at the policy level too (defence in depth alongside trigger)
DROP POLICY IF EXISTS "Workers request replacements" ON public.worker_equipment_items;
CREATE POLICY "Workers request replacements"
ON public.worker_equipment_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);