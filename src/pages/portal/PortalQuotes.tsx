import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { FileText } from 'lucide-react';

export default function PortalQuotes() {
  const { data: customer } = useCustomerProfile();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['portal_quotes', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, service_category, approval_status, total, created_at, scope_of_work')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Quotes</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No quotes found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm font-mono">{q.quote_number}</span>
                  </div>
                  <StatusBadge status={q.approval_status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{q.service_category}</span>
                  <span className="font-medium text-foreground">${(q.total || 0).toFixed(2)}</span>
                </div>
                {q.scope_of_work && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.scope_of_work}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(q.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
