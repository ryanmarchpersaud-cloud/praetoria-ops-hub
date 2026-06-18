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
  incidents: number;
}

async function countRows(table: string, column: string, values: string[]): Promise<number> {
  const { count, error } = await (supabase as any)
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in(column, values);
  if (error) {
    console.error(`Sidebar count error (${table}):`, error.message);
    return 0;
  }
  return count ?? 0;
}

async function countOpenIncidents(): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('incident_reports')
    .select('id', { count: 'exact', head: true })
    .or('follow_up_status.is.null,follow_up_status.eq.open,follow_up_status.eq.investigating,follow_up_status.eq.pending');

  if (error) {
    console.error('Sidebar count error (incident_reports):', error.message);
    return 0;
  }

  return count ?? 0;
}

export function useSidebarCounts() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['sidebar_counts', userId],
    queryFn: async (): Promise<SidebarCounts> => {
      const [leads, quotes, jobs, visits, invoices, requests, incidents] = await Promise.all([
        countRows('leads', 'status', ['New']),
        countRows('quotes', 'sent_status', ['Not sent']),
        countRows('jobs', 'status', ['Draft', 'Scheduled']),
        countRows('visits', 'visit_status', ['Scheduled', 'In Progress']),
        countRows('invoices', 'status', ['Sent', 'Overdue', 'Partially Paid']),
        countRows('service_requests', 'status', ['New', 'Pending', 'Open', 'open', 'new']),
        countOpenIncidents(),
      ]);

      return { leads, quotes, jobs, visits, invoices, requests, incidents };
    },
    enabled: !!userId,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
