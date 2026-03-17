import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Receipt, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-primary/10 text-primary',
    rejected: 'bg-destructive/10 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function SubcontractorInvoiceDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['subcontractor_invoice_detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subcontractor_invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related payment if exists
  const { data: payments = [] } = useQuery({
    queryKey: ['subcontractor_invoice_payments', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('subcontractor_payments')
        .select('*')
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="p-8 text-center text-muted-foreground">Invoice not found.</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/subcontractor/invoices" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{invoice.invoice_number}</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}</p>
        </div>
        <StatusChip status={invoice.status} />
      </div>

      {/* Amount */}
      <Card>
        <CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-foreground">${Number(invoice.amount).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{invoice.currency}</p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Invoice Date</p>
              <p className="text-sm text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Submitted</p>
              <p className="text-sm text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(invoice.submitted_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {invoice.service_period_start && invoice.service_period_end && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Service Period</p>
              <p className="text-sm text-foreground">
                {format(new Date(invoice.service_period_start), 'MMM d')} – {format(new Date(invoice.service_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {invoice.notes && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Notes</p>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {invoice.admin_review_notes && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Admin Review Notes</p>
              <p className="text-sm text-foreground">{invoice.admin_review_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-foreground">Submitted</span>
              <span className="text-muted-foreground ml-auto text-xs">{format(new Date(invoice.submitted_at), 'MMM d, yyyy')}</span>
            </div>
            {invoice.approved_at && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-foreground">Approved</span>
                <span className="text-muted-foreground ml-auto text-xs">{format(new Date(invoice.approved_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            {invoice.paid_at && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-foreground">Paid</span>
                <span className="text-muted-foreground ml-auto text-xs">{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payments</p>
            {payments.map((pmt: any) => (
              <div key={pmt.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">${Number(pmt.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pmt.payment_date ? format(new Date(pmt.payment_date), 'MMM d, yyyy') : 'Pending'}
                    {pmt.payment_method ? ` · ${pmt.payment_method}` : ''}
                  </p>
                </div>
                {pmt.reference_number && (
                  <span className="text-[10px] text-muted-foreground font-mono">{pmt.reference_number}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
