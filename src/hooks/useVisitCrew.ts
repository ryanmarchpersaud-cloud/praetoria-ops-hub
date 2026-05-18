import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Crew = workers added beyond visit.assigned_worker_id (the "lead")
export function useVisitCrew(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit_crew', visitId],
    queryFn: async () => {
      if (!visitId) return [];
      const { data, error } = await supabase
        .from('visit_crew_members')
        .select('id, worker_user_id, role')
        .eq('visit_id', visitId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!visitId,
  });
}

export function useVisitSubAssignments(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit_sub_assignments', visitId],
    queryFn: async () => {
      if (!visitId) return [];
      const { data, error } = await supabase
        .from('subcontractor_assignments')
        .select('id, subcontractor_id')
        .eq('visit_id', visitId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!visitId,
  });
}

export function useAddVisitCrewMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, workerUserId }: { visitId: string; workerUserId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('visit_crew_members')
        .insert({ visit_id: visitId, worker_user_id: workerUserId, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['visit_crew', vars.visitId] });
    },
  });
}

export function useRemoveVisitCrewMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, workerUserId }: { visitId: string; workerUserId: string }) => {
      const { error } = await supabase
        .from('visit_crew_members')
        .delete()
        .eq('visit_id', visitId)
        .eq('worker_user_id', workerUserId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['visit_crew', vars.visitId] });
    },
  });
}

export function useAddVisitSubAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, subcontractorId, jobId }: { visitId: string; subcontractorId: string; jobId?: string | null }) => {
      const { error } = await supabase
        .from('subcontractor_assignments')
        .insert({ visit_id: visitId, subcontractor_id: subcontractorId, job_id: jobId ?? null });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['visit_sub_assignments', vars.visitId] });
    },
  });
}

export function useRemoveVisitSubAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, subcontractorId }: { visitId: string; subcontractorId: string }) => {
      const { error } = await supabase
        .from('subcontractor_assignments')
        .delete()
        .eq('visit_id', visitId)
        .eq('subcontractor_id', subcontractorId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['visit_sub_assignments', vars.visitId] });
    },
  });
}

export function useActiveSubcontractors() {
  return useQuery({
    queryKey: ['subcontractors_active_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, company_name, contact_name, status')
        .order('company_name', { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((s: any) =>
        !s.status || ['Active', 'active', 'Approved', 'approved'].includes(s.status)
      );
    },
  });
}
