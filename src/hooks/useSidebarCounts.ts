import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SidebarCounts {
  leads: number;
  quotes: number;
  jobs: number;
  visits: number;
  invoices: number;
  requests: number;
}

export function useSidebarCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sidebar_counts', user?.id],
    queryFn: async (): Promise<SidebarCounts> => {
      const [
        leadsRes,
        quotesRes,
        jobsRes,
        visitsRes,
        invoicesRes,
        requestsRes,
      ] = await Promise.all([
        // New leads that haven't been reviewed
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'New'),

        // Quotes awaiting action (draft or follow-up overdue)
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .in('approval_status', ['Draft', 'Approved'])
          .eq('sent_status', 'Not sent'),

        // Jobs that are unscheduled or need attention
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Draft', 'Scheduled'] as any),

        // Today's visits or visits in progress
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Scheduled', 'In Progress']),

        // Overdue or unpaid invoices
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Sent', 'Overdue', 'Partially Paid']),

        // Pending service requests
        supabase
          .from('service_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['New', 'Pending']),
      ]);

      return {
        leads: leadsRes.count ?? 0,
        quotes: quotesRes.count ?? 0,
        jobs: jobsRes.count ?? 0,
        visits: visitsRes.count ?? 0,
        invoices: invoicesRes.count ?? 0,
        requests: requestsRes.count ?? 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000, // refresh every 30s
    staleTime: 15000,
  });
}
