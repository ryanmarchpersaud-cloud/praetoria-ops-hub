
-- 1. Tighten pm_moveout_photos_update WITH CHECK to mirror USING (ownership guard)
DROP POLICY IF EXISTS "pm_moveout_photos_update" ON storage.objects;
CREATE POLICY "pm_moveout_photos_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pm-move-out-photos'
    AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'pm-move-out-photos'
    AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  );

-- 2. Remove public read on property-photos bucket (bucket already flipped to private).
DROP POLICY IF EXISTS "Public read property photos" ON storage.objects;

-- 3. Quiz answer keys — restrict SELECT and manage to owner/admin/hr_admin.
DROP POLICY IF EXISTS "Ops staff can view quiz questions" ON public.training_quiz_questions;
DROP POLICY IF EXISTS "Ops staff can manage quiz questions" ON public.training_quiz_questions;

CREATE POLICY "Admins manage quiz questions"
  ON public.training_quiz_questions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr_admin'::app_role)
  );

-- Test-takers continue to use get_training_quiz_questions() SECURITY DEFINER RPC
-- which strips correct_answer.

-- 4. Restrict role_permissions matrix visibility to admin/owner only.
DROP POLICY IF EXISTS "Ops staff can view role_permissions" ON public.role_permissions;

CREATE POLICY "Admins view role_permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
