
-- =====================================================
-- TRAINING / LMS SYSTEM — Course Catalog & Assignments
-- =====================================================

-- Training courses (the catalog)
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  target_audience TEXT NOT NULL DEFAULT 'all', -- 'worker', 'subcontractor', 'all'
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  mandatory_for_roles TEXT[] DEFAULT '{}',
  mandatory_for_service_lines TEXT[] DEFAULT '{}',
  content_type TEXT NOT NULL DEFAULT 'document', -- 'video', 'document', 'quiz', 'policy', 'mixed'
  video_url TEXT,
  document_urls TEXT[] DEFAULT '{}',
  estimated_duration_minutes INTEGER,
  pass_mark INTEGER, -- percentage, NULL = no quiz
  max_retakes INTEGER DEFAULT 3,
  renewal_period_days INTEGER, -- NULL = no renewal
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions for courses
CREATE TABLE public.training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false'
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course assignments (HR assigns to users)
CREATE TABLE public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'passed', 'failed', 'expired'
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INTEGER, -- percentage
  attempts INTEGER NOT NULL DEFAULT 0,
  certificate_url TEXT,
  acknowledged_at TIMESTAMPTZ,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Quiz attempt records
CREATE TABLE public.training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy acknowledgements (lightweight sign-offs)
CREATE TABLE public.training_policy_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  UNIQUE(course_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_policy_signoffs ENABLE ROW LEVEL SECURITY;

-- RLS: training_courses — staff can read active, ops_staff can manage
CREATE POLICY "Staff can view active courses" ON public.training_courses
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can manage courses" ON public.training_courses
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- RLS: training_quiz_questions — read if staff, manage if ops_staff
CREATE POLICY "Staff can view quiz questions" ON public.training_quiz_questions
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Ops staff can manage quiz questions" ON public.training_quiz_questions
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- RLS: training_assignments — users see own, ops_staff see all
CREATE POLICY "Users see own assignments" ON public.training_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can manage assignments" ON public.training_assignments
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Users can update own assignment progress" ON public.training_assignments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: training_quiz_attempts — users see/create own, ops_staff see all
CREATE POLICY "Users manage own quiz attempts" ON public.training_quiz_attempts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

-- RLS: training_policy_signoffs — users see/create own, ops_staff see all
CREATE POLICY "Users manage own signoffs" ON public.training_policy_signoffs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER set_training_courses_updated_at BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_training_assignments_updated_at BEFORE UPDATE ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
