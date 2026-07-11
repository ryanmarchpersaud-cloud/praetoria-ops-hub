import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSubcontractorProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subcontractor_profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSubcontractorAssignments(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_assignments', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('subcontractor_assignments')
        .select('*, visits(id, visit_number, visit_status, visit_type, service_date, arrival_time, properties(property_name, address_line_1, city), customers:customer_id(first_name, last_name)), jobs(job_title, service_category)')
        .eq('subcontractor_id', subcontractorId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];

      // Expand job-level assignments (visit_id NULL) into one synthetic row per visit on
      // that job, so the sub's schedule surfaces every visit they are responsible for.
      const jobIds = Array.from(
        new Set(rows.filter(r => !r.visit_id && r.job_id).map(r => r.job_id))
      );
      let extraVisits: any[] = [];
      if (jobIds.length) {
        const { data: vRows } = await supabase
          .from('visits')
          .select('id, visit_number, visit_status, visit_type, service_date, arrival_time, job_id, archived_at, properties(property_name, address_line_1, city), customers:customer_id(first_name, last_name)')
          .in('job_id', jobIds as string[])
          .neq('visit_status', 'Cancelled')
          .is('archived_at', null);
        extraVisits = vRows ?? [];
      }
      const seenVisitIds = new Set(rows.filter(r => r.visits?.id).map(r => r.visits.id));
      const synthesized = extraVisits
        .filter(v => !seenVisitIds.has(v.id))
        .map(v => {
          const parent = rows.find(r => r.job_id === v.job_id && !r.visit_id);
          return {
            ...(parent || {}),
            id: `${parent?.id || 'job'}::${v.id}`,
            visit_id: v.id,
            visits: v,
            jobs: parent?.jobs,
            assignment_status: parent?.assignment_status || 'assigned',
            assigned_at: parent?.assigned_at,
          };
        });

      // Also strip out any direct-assignment rows whose joined visit is
      // cancelled or archived so the sub portal never surfaces those.
      const cleanedRows = rows.filter(r => {
        if (!r.visits) return true;
        return r.visits.visit_status !== 'Cancelled' && !r.visits.archived_at;
      });

      return [...cleanedRows, ...synthesized];
    },
    enabled: !!subcontractorId,
  });
}

export function useSubcontractorDocuments(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_documents', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('subcontractor_documents')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subcontractorId,
  });
}

export function useSubcontractorInvoices(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_invoices', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('subcontractor_invoices')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subcontractorId,
  });
}

export function useSubcontractorPayments(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_payments', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('subcontractor_payments')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subcontractorId,
  });
}

// Admin: list all subcontractors
export function useAllSubcontractors() {
  return useQuery({
    queryKey: ['all_subcontractors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('company_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Admin: single subcontractor by id
export function useSubcontractorById(id: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_by_id', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
