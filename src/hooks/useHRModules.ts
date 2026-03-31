import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/* ─── Insurance Providers ─── */
export function useInsuranceProviders() {
  return useQuery({
    queryKey: ['hr_insurance_providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_insurance_providers')
        .select('*')
        .order('provider_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: any) => {
      const { error } = provider.id
        ? await supabase.from('hr_insurance_providers').update(provider).eq('id', provider.id)
        : await supabase.from('hr_insurance_providers').insert(provider);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_insurance_providers'] }),
  });
}

/* ─── Checklist Templates ─── */
export function useChecklistTemplates() {
  return useQuery({
    queryKey: ['hr_checklist_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChecklistAssignments() {
  return useQuery({
    queryKey: ['hr_checklist_assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_checklist_assignments')
        .select('*, hr_checklist_templates(name, items, checklist_type)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tmpl: any) => {
      const { error } = tmpl.id
        ? await supabase.from('hr_checklist_templates').update(tmpl).eq('id', tmpl.id)
        : await supabase.from('hr_checklist_templates').insert(tmpl);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_checklist_templates'] }),
  });
}

export function useAssignChecklist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ template_id, user_id, checklist_type }: { template_id: string; user_id: string; checklist_type: string }) => {
      const { error } = await supabase.from('hr_checklist_assignments').insert({
        template_id, user_id, checklist_type, assigned_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_checklist_assignments'] }),
  });
}

export function useUpdateChecklistProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed_items, status }: { id: string; completed_items: string[]; status: string }) => {
      const { error } = await supabase.from('hr_checklist_assignments').update({
        completed_items,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_checklist_assignments'] }),
  });
}

/* ─── Case Notes ─── */
export function useCaseNotes(employeeUserId?: string) {
  return useQuery({
    queryKey: ['hr_case_notes', employeeUserId],
    queryFn: async () => {
      let q = supabase.from('hr_case_notes').select('*').order('created_at', { ascending: false });
      if (employeeUserId) q = q.eq('employee_user_id', employeeUserId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCaseNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (note: { employee_user_id: string; note_type: string; subject: string; body?: string; is_confidential?: boolean }) => {
      const { error } = await supabase.from('hr_case_notes').insert({ ...note, created_by: user?.id ?? '' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_case_notes'] }),
  });
}

/* ─── Compensation ─── */
export function useCompensationRecords(employeeUserId?: string) {
  return useQuery({
    queryKey: ['hr_compensation_records', employeeUserId],
    queryFn: async () => {
      let q = supabase.from('hr_compensation_records').select('*').order('effective_date', { ascending: false });
      if (employeeUserId) q = q.eq('employee_user_id', employeeUserId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddCompensationRecord() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rec: { employee_user_id: string; record_type: string; effective_date: string; pay_rate?: number; pay_type?: string; notes?: string }) => {
      const { error } = await supabase.from('hr_compensation_records').insert({ ...rec, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_compensation_records'] }),
  });
}

/* ─── Review Schedules ─── */
export function useReviewSchedules() {
  return useQuery({
    queryKey: ['hr_review_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_review_schedules')
        .select('*')
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: any) => {
      const { error } = review.id
        ? await supabase.from('hr_review_schedules').update(review).eq('id', review.id)
        : await supabase.from('hr_review_schedules').insert(review);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_review_schedules'] }),
  });
}

/* ─── WCB Claims ─── */
export function useWCBClaims() {
  return useQuery({
    queryKey: ['hr_wcb_claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_wcb_claims')
        .select('*')
        .order('injury_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertWCBClaim() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (claim: any) => {
      const payload = { ...claim, created_by: claim.created_by || user?.id };
      const { error } = claim.id
        ? await supabase.from('hr_wcb_claims').update(payload).eq('id', claim.id)
        : await supabase.from('hr_wcb_claims').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_wcb_claims'] }),
  });
}

/* ─── SGI Driver Records ─── */
export function useSGIDriverRecords() {
  return useQuery({
    queryKey: ['hr_sgi_driver_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_sgi_driver_records')
        .select('*')
        .order('licence_expiry', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSGIRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rec: any) => {
      const { error } = rec.id
        ? await supabase.from('hr_sgi_driver_records').update(rec).eq('id', rec.id)
        : await supabase.from('hr_sgi_driver_records').insert(rec);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_sgi_driver_records'] }),
  });
}

/* ─── Benefit Enrollments ─── */
export function useBenefitEnrollments() {
  return useQuery({
    queryKey: ['hr_benefit_enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_benefit_enrollments')
        .select('*, hr_insurance_providers(provider_name, provider_type)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertEnrollment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (enr: any) => {
      const payload = { ...enr, created_by: enr.created_by || user?.id };
      const { error } = enr.id
        ? await supabase.from('hr_benefit_enrollments').update(payload).eq('id', enr.id)
        : await supabase.from('hr_benefit_enrollments').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_benefit_enrollments'] }),
  });
}
