
-- =========================================================
-- 1) QUIZ ANSWERS EXPOSURE FIX
-- =========================================================

-- Replace the broad SELECT policy so assigned test-takers can no longer
-- read training_quiz_questions directly (which exposes correct_answer).
DROP POLICY IF EXISTS "Authenticated users can view quiz questions for assigned course" ON public.training_quiz_questions;

CREATE POLICY "Ops staff can view quiz questions"
  ON public.training_quiz_questions
  FOR SELECT
  TO authenticated
  USING (public.is_ops_staff(auth.uid()));

-- Secure function to return quiz questions WITHOUT correct_answer for
-- test-takers with a matching assignment (or ops staff).
CREATE OR REPLACE FUNCTION public.get_training_quiz_questions(_course_id uuid)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  question_text text,
  question_type text,
  options jsonb,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.course_id, q.question_text, q.question_type, q.options, q.sort_order
  FROM public.training_quiz_questions q
  WHERE q.course_id = _course_id
    AND (
      public.is_ops_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.training_assignments ta
        WHERE ta.user_id = auth.uid() AND ta.course_id = _course_id
      )
    )
  ORDER BY q.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_training_quiz_questions(uuid) TO authenticated;

-- Secure function that grades and records a quiz attempt server-side so
-- the client never needs to know the correct_answer.
CREATE OR REPLACE FUNCTION public.submit_training_quiz(
  _assignment_id uuid,
  _answers jsonb
)
RETURNS TABLE (score integer, passed boolean, correct_count integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.training_assignments%ROWTYPE;
  v_course public.training_courses%ROWTYPE;
  v_total integer := 0;
  v_correct integer := 0;
  v_score integer := 0;
  v_passed boolean := false;
  v_pass_mark integer;
  v_q RECORD;
BEGIN
  SELECT * INTO v_assignment
  FROM public.training_assignments
  WHERE id = _assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  IF v_assignment.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized for this assignment';
  END IF;

  SELECT * INTO v_course FROM public.training_courses WHERE id = v_assignment.course_id;

  FOR v_q IN
    SELECT id, correct_answer FROM public.training_quiz_questions
    WHERE course_id = v_assignment.course_id
  LOOP
    v_total := v_total + 1;
    IF (_answers ->> v_q.id::text) IS NOT NULL
       AND (_answers ->> v_q.id::text) = v_q.correct_answer THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    v_score := 0;
  ELSE
    v_score := ROUND((v_correct::numeric / v_total::numeric) * 100);
  END IF;

  v_pass_mark := COALESCE(v_course.pass_mark, 70);
  v_passed := v_score >= v_pass_mark;

  INSERT INTO public.training_quiz_attempts (assignment_id, user_id, answers, score, passed)
  VALUES (_assignment_id, auth.uid(), _answers, v_score, v_passed);

  UPDATE public.training_assignments
  SET score = v_score,
      attempts = COALESCE(attempts, 0) + 1,
      status = CASE WHEN v_passed THEN 'passed' ELSE 'failed' END,
      completed_at = CASE WHEN v_passed THEN now() ELSE completed_at END
  WHERE id = _assignment_id;

  RETURN QUERY SELECT v_score, v_passed, v_correct, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_training_quiz(uuid, jsonb) TO authenticated;


-- =========================================================
-- 2) SHARED STORAGE BUCKETS LOCK-DOWN
--    (attachments / avatars / property-photos)
-- =========================================================

-- Drop the broad multi-bucket policies that let any authenticated user
-- read/write across every other user's folder.
DROP POLICY IF EXISTS "Authenticated can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update attachments" ON storage.objects;

-- ── avatars: keep public read (existing "Anyone can view avatars" policy)
--    Writes must be scoped to the caller's own folder or ops staff.
CREATE POLICY "Avatars: user or ops upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Avatars: user or ops update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Avatars: user or ops delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ── property-photos: scope reads and writes to the uploader or ops staff.
CREATE POLICY "Property photos: user or ops read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
    )
  );

CREATE POLICY "Property photos: user or ops upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Property photos: user or ops update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Property photos: user or ops delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (
      public.is_ops_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
    )
  );

-- Note: the existing "attachments" bucket policies already cover
-- owner-scoped SELECT/INSERT/UPDATE/DELETE plus ops-staff SELECT and
-- anon-read of public logo prefixes, so no additional attachments
-- policy is needed here.
