import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useVisits(filters?: { visit_status?: string; visit_type?: string; search?: string }) {
  return useQuery({
    queryKey: ['visits', filters],
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select('*, jobs(id, job_title, job_number), properties(id, property_name), customers(first_name, last_name, company_name), visit_photos(id)')
        .order('service_date', { ascending: false });
      if (filters?.visit_status) query = query.eq('visit_status', filters.visit_status as any);
      if (filters?.visit_type) query = query.eq('visit_type', filters.visit_type as any);
      if (filters?.search) query = query.or(`visit_number.ilike.%${filters.search}%,service_summary.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;

      const visitIds = (data || []).map((v: any) => v.id);

      // Fetch crew members + subcontractor assignments in parallel
      const [crewRes, subAssignRes] = await Promise.all([
        visitIds.length
          ? supabase.from('visit_crew_members').select('visit_id, worker_user_id').in('visit_id', visitIds)
          : Promise.resolve({ data: [] as any[] }),
        visitIds.length
          ? supabase.from('subcontractor_assignments').select('visit_id, subcontractor_id').in('visit_id', visitIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const crewRows = (crewRes as any).data || [];
      const subAssignRows = (subAssignRes as any).data || [];

      // All worker IDs we need names for (lead + crew)
      const workerIds = [...new Set([
        ...(data || []).map((v: any) => v.assigned_worker_id).filter(Boolean),
        ...crewRows.map((c: any) => c.worker_user_id).filter(Boolean),
      ])];
      let workerMap: Record<string, string> = {};
      if (workerIds.length > 0) {
        const { data: workers } = await supabase
          .from('worker_profiles')
          .select('user_id, full_name')
          .in('user_id', workerIds);
        if (workers) {
          workerMap = Object.fromEntries(workers.map((w: any) => [w.user_id, w.full_name]));
        }
      }

      const subIds: string[] = [...new Set(subAssignRows.map((s: any) => s.subcontractor_id).filter(Boolean) as string[])];
      let subMap: Record<string, string> = {};
      if (subIds.length > 0) {
        const { data: subs } = await supabase
          .from('subcontractors')
          .select('id, company_name, contact_name')
          .in('id', subIds);
        if (subs) {
          subMap = Object.fromEntries(subs.map((s: any) => [s.id, s.company_name || s.contact_name || 'Subcontractor']));
        }
      }

      const crewByVisit: Record<string, string[]> = {};
      crewRows.forEach((c: any) => {
        const name = workerMap[c.worker_user_id];
        if (!name) return;
        if (!crewByVisit[c.visit_id]) crewByVisit[c.visit_id] = [];
        crewByVisit[c.visit_id].push(name);
      });
      const subsByVisit: Record<string, string[]> = {};
      subAssignRows.forEach((s: any) => {
        const name = subMap[s.subcontractor_id];
        if (!name) return;
        if (!subsByVisit[s.visit_id]) subsByVisit[s.visit_id] = [];
        subsByVisit[s.visit_id].push(name);
      });

      return (data || []).map((v: any) => ({
        ...v,
        worker_profiles: v.assigned_worker_id && workerMap[v.assigned_worker_id]
          ? { full_name: workerMap[v.assigned_worker_id] }
          : null,
        crew_names: crewByVisit[v.id] || [],
        subcontractor_names: subsByVisit[v.id] || [],
      }));
    },
  });
}

export function useVisit(id: string | undefined) {
  return useQuery({
    queryKey: ['visit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('visits').select('*, jobs(*), properties(*), customers(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: any) => {
      // Clean "none" sentinel values to null
      const cleaned = { ...visit };
      if (cleaned.job_id === 'none' || cleaned.job_id === '') cleaned.job_id = null;
      if (cleaned.assigned_worker_id === 'none' || cleaned.assigned_worker_id === '') cleaned.assigned_worker_id = null;
      const { data, error } = await supabase.from('visits').insert(cleaned).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });
      qc.invalidateQueries({ queryKey: ['property_visits'] });
      qc.invalidateQueries({ queryKey: ['employees_admin'] });
    },
  });
}

export function useUpdateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('visits').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['visit', data.id] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });
      qc.invalidateQueries({ queryKey: ['property_visits'] });
    },
  });
}
