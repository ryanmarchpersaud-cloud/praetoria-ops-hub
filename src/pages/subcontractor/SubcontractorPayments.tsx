import { useSubcontractorProfile, useSubcontractorPayments } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function SubcontractorPayments() {
  const { data: profile } = useSubcontractorProfile();
  const { data: payments = [], isLoading } = useSubcontractorPayments(profile?.id);

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Payments</h1>

      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Paid to Date</p>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No payments recorded yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">${Number(p.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}{p.payment_method ? ` · ${p.payment_method}` : ''}</p>
                </div>
                {p.reference_number && <span className="text-[10px] text-muted-foreground font-mono">{p.reference_number}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
