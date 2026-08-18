import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSignature, Eye } from 'lucide-react';
import { format } from 'date-fns';
import {
  ACTIVATION_PENDING_BANNER, PROVISIONAL_BANNER, combinedStatusMeta,
} from '@/lib/combinedDocument';

/** The same combined records shown under Quotations and under Documents → Agreements. */
export function useMyCombinedDocuments(customerId?: string) {
  return useQuery({
    queryKey: ['portal_combined_documents', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreements')
        .select('id, title, agreement_number, quotation_number, doc_status, status, version, signing_token, created_at, customer_signed_at, merge_data')
        .eq('customer_id', customerId!)
        .eq('is_combined_document', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function PortalCombinedDocuments({ customerId }: { customerId?: string }) {
  const { data: docs = [], isLoading } = useMyCombinedDocuments(customerId);

  if (isLoading || docs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Combined Quotation &amp; Service Agreement</h2>
      {docs.map((d: any) => {
        const meta = combinedStatusMeta(d.doc_status);
        const merge = (d.merge_data || {}) as Record<string, string>;
        const signable = ['sent', 'delivered', 'viewed', 'signing_in_progress', 'ready_to_send'].includes(d.status);
        const provisional = d.doc_status === 'provisional_estimate';
        const active = d.doc_status === 'active_service_agreement';

        return (
          <Card key={d.id}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {d.quotation_number ? `${d.quotation_number} · ` : ''}{d.agreement_number} · v{d.version || 1}
                  </p>
                </div>
                <Badge className={meta.className}>{meta.short}</Badge>
              </div>

              {provisional && (
                <p className="rounded border border-amber-300 bg-amber-50 p-2 text-[11px] font-semibold text-amber-900">
                  {PROVISIONAL_BANNER}
                </p>
              )}
              {!provisional && !active && (
                <p className="rounded border border-blue-200 bg-blue-50 p-2 text-[11px] font-semibold text-blue-900">
                  {ACTIVATION_PENDING_BANNER}
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                {merge.service_address ? `${merge.service_address}, ${merge.service_city}` : null}
                {merge.season_label ? ` · Season ${merge.season_label}` : null}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  Issued {format(new Date(d.created_at), 'MMMM d, yyyy')}
                  {d.customer_signed_at ? ` · Signed ${format(new Date(d.customer_signed_at), 'MMMM d, yyyy')}` : ''}
                </span>
                <Button size="sm" variant={signable ? 'default' : 'outline'} onClick={() => window.open(`/sign/${d.signing_token}`, '_blank')}>
                  {signable
                    ? <><FileSignature className="h-3.5 w-3.5 mr-1" /> Review &amp; Sign</>
                    : <><Eye className="h-3.5 w-3.5 mr-1" /> View / Download</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
