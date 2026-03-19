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

export function useSidebarCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sidebar_counts', user?.id],
    queryFn: async (): Promise<SidebarCounts> => {
      const [leads, quotes, jobs, visits, invoices, requests] = await Promise.all([
        countRows('leads', 'status', ['New']),
        countRows('quotes', 'sent_status', ['Not sent']),
        countRows('jobs', 'status', ['Draft', 'Scheduled']),
        countRows('visits', 'status', ['Scheduled', 'In Progress']),
        countRows('invoices', 'status', ['Sent', 'Overdue', 'Partially Paid']),
        countRows('service_requests', 'status', ['New', 'Pending']),
      ]);

      return { leads, quotes, jobs, visits, invoices, requests };
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
