
-- Fix 1: Restore ops-staff management of training quiz questions.
-- Workers/subs/customers remain excluded (they use the SECURITY DEFINER
-- RPC that strips correct_answer). is_ops_staff covers owner/admin/hr_admin,
-- HR, managers and ops_manager who need to build quizzes.
DROP POLICY IF EXISTS "Only HR admins can manage quiz questions directly" ON public.training_quiz_questions;
DROP POLICY IF EXISTS "Ops staff can manage quiz questions" ON public.training_quiz_questions;
DROP POLICY IF EXISTS "Ops staff can view quiz questions" ON public.training_quiz_questions;

CREATE POLICY "Ops staff can manage quiz questions"
  ON public.training_quiz_questions
  FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Fix 2: Let each authenticated user read the role_permissions rows for
-- their own role(s) so custom grants configured in Settings actually apply.
-- The full matrix stays restricted to admin/owner via the existing manage policy.
DROP POLICY IF EXISTS "Users can view their own role permissions" ON public.role_permissions;

CREATE POLICY "Users can view their own role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = role_permissions.role
    )
  );
