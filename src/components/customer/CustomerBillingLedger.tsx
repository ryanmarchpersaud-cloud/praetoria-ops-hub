import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  customerId: string;
}

type LedgerItem = {
  id: string;
  type: 'invoice' | 'payment';
  date: string;
  label: string;
  appliedTo: string;
  amount: number;
  link?: string;
};

const currency = (n: number) => '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CustomerBillingLedger({ customerId }: Props) {
  const { data: invoices = [], isLoading: loadingI } = useQuery({
    queryKey: ['cbl_invoices', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('invoices')
        .select('id, invoice_number, status, total, balance_due, created_at, issue_date')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  const { data: payments = [], isLoading: loadingP } = useQuery({
    queryKey: ['cbl_payments', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      // Get invoice IDs for this customer first
      const { data: custInvoices } = await supabase.from('invoices')
        .select('id, invoice_number').eq('customer_id', customerId);
      if (!custInvoices || custInvoices.length === 0) return [];
      const invoiceIds = custInvoices.map(i => i.id);
      const { data } = await supabase.from('finance_payments')
        .select('id, amount, payment_date, payment_method, invoice_id, reference_number, is_reversed')
        .in('invoice_id', invoiceIds)
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });
      // Attach invoice number
      return (data || []).map((p: any) => ({
        ...p,
        invoice_number: custInvoices.find(i => i.id === p.invoice_id)?.invoice_number || '',
      }));
    },
    enabled: !!customerId,
  });

  const isLoading = loadingI || loadingP;

  const { ledger, currentBalance } = useMemo(() => {
    const items: LedgerItem[] = [];

    invoices.forEach((inv: any) => {
      items.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        date: inv.issue_date || inv.created_at,
        label: inv.invoice_number,
        appliedTo: '—',
        amount: Number(inv.total || 0),
        link: `/invoices/${inv.id}`,
      });
    });

    payments.forEach((p: any) => {
      items.push({
        id: `pay-${p.id}`,
        type: 'payment',
        date: p.payment_date,
        label: 'Payment',
        appliedTo: p.invoice_number || '—',
        amount: -Number(p.amount || 0),
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const balance = invoices.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);

    return { ledger: items, currentBalance: balance };
  }, [invoices, payments]);

  const lifetimeValue = invoices
    .filter((i: any) => i.status === 'Paid')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Billing
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Lifetime value</p>
              <p className="text-sm font-bold font-mono">{currency(lifetimeValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Current balance</p>
              <p className={cn("text-sm font-bold font-mono", currentBalance > 0 ? "text-destructive" : "text-success")}>
                {currency(currentBalance)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : ledger.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No billing history</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left font-medium px-3 py-2">Item</th>
                  <th className="text-left font-medium px-3 py-2">Applied to</th>
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 20).map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'invoice' ? (
                          <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-success shrink-0" />
                        )}
                        {item.link ? (
                          <Link to={item.link} className="text-primary hover:underline font-medium">
                            {item.label}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.label}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{item.appliedTo}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.date && !isNaN(new Date(item.date).getTime())
                        ? format(new Date(item.date), 'MMM dd, yyyy')
                        : '—'}
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono font-medium",
                      item.amount < 0 ? "text-success" : "text-foreground"
                    )}>
                      {item.amount < 0 ? '-' : ''}{currency(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20 font-medium">
                  <td colSpan={3} className="px-3 py-2">Current balance</td>
                  <td className={cn(
                    "px-3 py-2 text-right font-mono",
                    currentBalance > 0 ? "text-destructive" : "text-success"
                  )}>
                    {currency(currentBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
