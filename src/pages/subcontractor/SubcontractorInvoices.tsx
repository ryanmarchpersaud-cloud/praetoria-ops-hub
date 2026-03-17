import { useSubcontractorProfile, useSubcontractorInvoices } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-primary/10 text-primary',
    rejected: 'bg-destructive/10 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function SubcontractorInvoices() {
  const { data: profile } = useSubcontractorProfile();
  const { data: invoices = [], isLoading } = useSubcontractorInvoices(profile?.id);

  const totals = {
    pending: invoices.filter((i: any) => i.status === 'submitted' || i.status === 'pending').reduce((s: number, i: any) => s + Number(i.amount), 0),
    approved: invoices.filter((i: any) => i.status === 'approved').reduce((s: number, i: any) => s + Number(i.amount), 0),
    paid: invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0),
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Invoices</h1>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.pending.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.approved.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.paid.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Paid</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No invoices submitted yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv: any) => (
            <Card key={inv.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(inv.invoice_date), 'MMM d, yyyy')} · ${Number(inv.amount).toFixed(2)}
                  </p>
                  {inv.service_period_start && inv.service_period_end && (
                    <p className="text-[10px] text-muted-foreground/70">
                      Period: {format(new Date(inv.service_period_start), 'MMM d')} – {format(new Date(inv.service_period_end), 'MMM d')}
                    </p>
                  )}
                </div>
                <StatusChip status={inv.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
