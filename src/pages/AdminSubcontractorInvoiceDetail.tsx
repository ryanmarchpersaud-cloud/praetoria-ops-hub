import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt, Calendar, DollarSign, FileText, Building2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const statusColors: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paid: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function AdminSubcontractorInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['admin_sub_invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subcontractor_invoices')
        .select('*, subcontractors(id, company_name, contact_name, email)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateStatus = async (status: string) => {
    if (!id) return;
    const { error } = await supabase.from('subcontractor_invoices').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Invoice ${status}`);
    qc.invalidateQueries({ queryKey: ['admin_sub_invoice', id] });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="p-6 text-muted-foreground">Invoice not found.</div>;

  const sub = invoice.subcontractors as any;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {invoice.invoice_number}
          </h1>
          <p className="text-sm text-muted-foreground">Subcontractor Invoice</p>
        </div>
        <Badge className={`ml-auto capitalize ${statusColors[invoice.status] || 'bg-muted text-muted-foreground'}`}>{invoice.status}</Badge>
      </div>

      {/* Subcontractor Info */}
      {sub && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Subcontractor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{sub.company_name}</p>
            <p className="text-xs text-muted-foreground">{sub.contact_name} · {sub.email}</p>
            <Link to={`/subcontractors/${sub.id}`} className="text-xs text-primary hover:underline">View Full Profile →</Link>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">{fmt(Number(invoice.amount))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
            </div>
            {invoice.service_period_start && (
              <div>
                <p className="text-xs text-muted-foreground">Service Period</p>
                <p className="text-sm font-medium">
                  {format(new Date(invoice.service_period_start), 'MMM d')} — {invoice.service_period_end ? format(new Date(invoice.service_period_end), 'MMM d, yyyy') : 'Ongoing'}
                </p>
              </div>
            )}
          </div>
          {invoice.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
          {invoice.attachment_url && (
            <div>
              <a href={invoice.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> View Attachment
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {(invoice.status === 'submitted' || invoice.status === 'pending') && (
        <div className="flex gap-3">
          <Button className="flex-1 gap-2" onClick={() => updateStatus('approved')}>
            <CheckCircle className="h-4 w-4" /> Approve
          </Button>
          <Button variant="destructive" className="flex-1 gap-2" onClick={() => updateStatus('rejected')}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      )}
      {invoice.status === 'approved' && (
        <Button className="w-full gap-2" onClick={() => updateStatus('paid')}>
          <DollarSign className="h-4 w-4" /> Mark as Paid
        </Button>
      )}
    </div>
  );
}
