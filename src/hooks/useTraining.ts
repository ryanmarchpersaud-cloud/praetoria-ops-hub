import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/* ───── Admin / HR hooks ───── */

export function useTrainingCourses() {
  return useQuery({
    queryKey: ['training_courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTrainingCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['training_course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useTrainingQuizQuestions(courseId: string | undefined) {
  return useQuery({
    queryKey: ['training_quiz_questions', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      // Ops-staff path: returns full row including correct_answer (RLS-gated).
      const { data, error } = await supabase
        .from('training_quiz_questions')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!courseId,
  });
}

// Test-taker path — returns quiz questions WITHOUT correct_answer via a
// SECURITY DEFINER RPC. Use this on any worker/subcontractor quiz screen.
export function useAssignedQuizQuestions(courseId: string | undefined) {
  return useQuery({
    queryKey: ['assigned_quiz_questions', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await (supabase.rpc as any)('get_training_quiz_questions', {
        _course_id: courseId,
      });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!courseId,
  });
}

export function useAllAssignments() {
  return useQuery({
    queryKey: ['training_assignments_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_assignments')
        .select('*, training_courses(title, category, content_type, is_mandatory)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (course: {
      title: string;
      description?: string;
      category: string;
      target_audience: string;
      is_mandatory: boolean;
      mandatory_for_roles?: string[];
      mandatory_for_service_lines?: string[];
      content_type: string;
      video_url?: string;
      document_urls?: string[];
      estimated_duration_minutes?: number;
      pass_mark?: number;
      max_retakes?: number;
      renewal_period_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('training_courses')
        .insert(course as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training_courses'] });
    },
  });
}

export function useCreateQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: {
      course_id: string;
      question_text: string;
      question_type: string;
      options: any;
      correct_answer: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('training_quiz_questions')
        .insert(q as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['training_quiz_questions', v.course_id] });
    },
  });
}

export function useAssignCourseToUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ course_id, user_ids, due_date, assigned_by }: {
      course_id: string;
      user_ids: string[];
      due_date?: string;
      assigned_by?: string;
    }) => {
      const rows = user_ids.map(uid => ({
        course_id,
        user_id: uid,
        due_date: due_date || null,
        assigned_by: assigned_by || null,
        status: 'not_started',
      }));
      const { error } = await supabase
        .from('training_assignments')
        .upsert(rows as any, { onConflict: 'course_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training_assignments'] });
      qc.invalidateQueries({ queryKey: ['training_assignments_all'] });
    },
  });
}

/* ───── Worker / Subcontractor self-service hooks ───── */

export function useMyAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training_assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_assignments')
        .select('*, training_courses(id, title, description, category, content_type, video_url, document_urls, estimated_duration_minutes, pass_mark, max_retakes, is_mandatory)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useMyQuizAttempts(assignmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training_quiz_attempts', assignmentId],
    queryFn: async () => {
      if (!assignmentId || !user) return [];
      const { data, error } = await supabase
        .from('training_quiz_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!assignmentId && !!user,
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignment_id, user_id, answers, score, passed }: {
      assignment_id: string;
      user_id: string;
      answers: any;
      score: number;
      passed: boolean;
    }) => {
      // Insert attempt
      const { error: aErr } = await supabase
        .from('training_quiz_attempts')
        .insert({ assignment_id, user_id, answers, score, passed } as any);
      if (aErr) throw aErr;

      // Update assignment
      const updates: any = {
        score,
        attempts: undefined, // will be incremented via raw query
        status: passed ? 'passed' : 'failed',
      };
      if (passed) {
        updates.completed_at = new Date().toISOString();
        updates.status = 'passed';
      }

      // Get current attempts count then update
      const { data: current } = await supabase
        .from('training_assignments')
        .select('attempts')
        .eq('id', assignment_id)
        .single();

      const { error: uErr } = await supabase
        .from('training_assignments')
        .update({
          score,
          attempts: (current?.attempts ?? 0) + 1,
          status: passed ? 'passed' : 'failed',
          ...(passed ? { completed_at: new Date().toISOString() } : {}),
        } as any)
        .eq('id', assignment_id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training_assignments'] });
      qc.invalidateQueries({ queryKey: ['training_quiz_attempts'] });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, acknowledged_at }: {
      id: string;
      status?: string;
      acknowledged_at?: string;
    }) => {
      const updates: any = {};
      if (status) updates.status = status;
      if (acknowledged_at) updates.acknowledged_at = acknowledged_at;
      if (status === 'in_progress' && !acknowledged_at) updates.started_at = new Date().toISOString();
      if (status === 'passed') updates.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('training_assignments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training_assignments'] });
      qc.invalidateQueries({ queryKey: ['training_assignments_all'] });
    },
  });
}

/* ───── Compliance summary hooks (for HR dashboard) ───── */

export function useComplianceSummary() {
  return useQuery({
    queryKey: ['compliance_summary'],
    queryFn: async () => {
      // Get all assignments with course info
      const { data: assignments, error } = await supabase
        .from('training_assignments')
        .select('status, due_date, expiry_date, training_courses(is_mandatory)');
      if (error) throw error;
      const all = assignments ?? [];
      const mandatory = all.filter((a: any) => a.training_courses?.is_mandatory);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        totalAssignments: all.length,
        completed: all.filter((a: any) => a.status === 'passed').length,
        overdue: all.filter((a: any) => a.due_date && a.due_date < today && a.status !== 'passed').length,
        expiringSoon: all.filter((a: any) => {
          if (!a.expiry_date) return false;
          const exp = new Date(a.expiry_date);
          const in30 = new Date();
          in30.setDate(in30.getDate() + 30);
          return exp <= in30 && exp >= new Date();
        }).length,
        mandatoryTotal: mandatory.length,
        mandatoryCompleted: mandatory.filter((a: any) => a.status === 'passed').length,
        notStarted: all.filter((a: any) => a.status === 'not_started').length,
        inProgress: all.filter((a: any) => a.status === 'in_progress').length,
        failed: all.filter((a: any) => a.status === 'failed').length,
      };
    },
  });
}
