DROP POLICY IF EXISTS "Staff can view quiz questions" ON public.training_quiz_questions;

CREATE POLICY "Authenticated users can view quiz questions for assigned courses"
  ON public.training_quiz_questions
  FOR SELECT TO authenticated
  USING (
    is_ops_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.training_assignments ta
      WHERE ta.user_id = auth.uid()
        AND ta.course_id = training_quiz_questions.course_id
    )
  );