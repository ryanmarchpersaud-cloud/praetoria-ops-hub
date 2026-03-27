import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStep6Metrics() {
  return useQuery({
    queryKey: ['step6_metrics'],
    queryFn: async () => {
      // Approved quotes not yet converted
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, approval_status, converted_job_id')
        .eq('approval_status', 'Approved');
      const approvedNotConverted = (quotes || []).filter(q => !(q as any).converted_job_id).length;
      const convertedQuotes = (quotes || []).filter(q => !!(q as any).converted_job_id).length;

      // Jobs with quote source
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, quote_id, billing_status');
      const jobsFromQuotes = (jobs || []).filter(j => !!(j as any).quote_id).length;
      const completedJobs = (jobs || []).filter(j => j.status === 'Completed').length;
      const invoicedJobs = (jobs || []).filter(j => (j as any).billing_status === 'invoiced').length;

      // Completed unbilled visits
      const { data: visits } = await supabase
        .from('visits')
        .select('id, visit_status, billing_status')
        .eq('visit_status', 'Completed');
      const completedVisits = (visits || []).length;
      const unbilledVisits = (visits || []).filter(v => (v as any).billing_status !== 'invoiced').length;
      const invoicedVisits = (visits || []).filter(v => (v as any).billing_status === 'invoiced').length;

      // Draft invoices from work
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, job_id, visit_id, quote_id')
        .eq('status', 'Draft');
      const draftInvoicesFromWork = (invoices || []).filter(i =>
        (i as any).job_id || (i as any).visit_id || (i as any).quote_id
      ).length;

      return {
        approvedNotConverted,
        convertedQuotes,
        jobsFromQuotes,
        completedJobs,
        invoicedJobs,
        completedVisits,
        unbilledVisits,
        invoicedVisits,
        draftInvoicesFromWork,
      };
    },
    staleTime: 30_000,
  });
}
