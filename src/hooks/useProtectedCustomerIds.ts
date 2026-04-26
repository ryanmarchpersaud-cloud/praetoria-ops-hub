import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a Set of customer ids that are on the protected list.
 * Use this in create forms (visit/job/quote/invoice/task) to disable the
 * submit button and show an inline warning when the chosen customer is protected.
 */
export function useProtectedCustomerIds() {
  const { data } = useQuery({
    queryKey: ['protected_customer_ids'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protected_customers')
        .select('customer_id');
      if (error) {
        // Non-admins can't read this — that's fine, the DB still blocks writes.
        return new Set<string>();
      }
      return new Set((data ?? []).map((r) => r.customer_id));
    },
  });
  return data ?? new Set<string>();
}
