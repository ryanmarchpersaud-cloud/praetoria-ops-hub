import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  customerId: string;
}

export function CustomerCommunicationsCard({ customerId }: Props) {
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['customer_comms_card', customerId],
    queryFn: async () => {
      const [invIds, quoteIds, jobIds, reqIds, agreementRows] = await Promise.all([
        supabase.from('invoices').select('id').eq('customer_id', customerId),
        supabase.from('quotes').select('id').eq('customer_id', customerId),
        supabase.from('jobs').select('id').eq('customer_id', customerId),
        supabase.from('service_requests').select('id').eq('customer_id', customerId),
        supabase.from('agreements').select('id, title, agreement_number').eq('customer_id', customerId),
      ]);
      const agreements = agreementRows.data || [];
      const ids = [
        customerId,
        ...(invIds.data || []).map((r: any) => r.id),
        ...(quoteIds.data || []).map((r: any) => r.id),
        ...(jobIds.data || []).map((r: any) => r.id),
        ...(reqIds.data || []).map((r: any) => r.id),
        ...agreements.map((r: any) => r.id),
      ];
      const { data, error } = await supabase
        .from('activities')
        .select('id, action_name, record_type, status, created_at')
        .in('record_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) console.error('customer_comms_card error', error);

      let agreementEvents: any[] = [];
      if (agreements.length > 0) {
        const { data: auditRows } = await supabase
          .from('agreement_audit_log')
          .select('id, agreement_id, action, created_at')
          .in('agreement_id', agreements.map((a: any) => a.id))
          .in('action', ['sent', 'resent', 'reminder_sent', 'viewed', 'signed', 'declined'])
          .order('created_at', { ascending: false })
          .limit(50);
        const labels: Record<string, string> = {
          sent: 'Agreement sent',
          resent: 'Agreement reminder sent',
          reminder_sent: 'Agreement reminder sent',
          viewed: 'Agreement viewed by customer',
          signed: 'Agreement signed',
          declined: 'Agreement declined',
        };
        agreementEvents = (auditRows || []).map((r: any) => {
          const ag = agreements.find((a: any) => a.id === r.agreement_id);
          const name = ag?.agreement_number || ag?.title || 'Agreement';
          return {
            id: r.id,
            action_name: `${labels[r.action] || r.action} — ${name}`,
            created_at: r.created_at,
            link: `/agreements/${r.agreement_id}`,
          };
        });
      }

      return [...(data || []), ...agreementEvents].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!customerId,
  });


  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Communications
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">{communications.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </>
        ) : communications.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">No communications yet.</p>
        ) : (
          communications.slice(0, 8).map((c: any) => (
            <Link
              key={c.id}
              to={`/activity?focus=${c.id}`}
              className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <MessageCircle className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{c.action_name || 'Activity'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </Link>
          ))
        )}
        {communications.length > 8 && (
          <Link to={`/activity?customer=${customerId}`} className="block text-[10px] text-primary hover:underline pt-1">
            View all {communications.length} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
