import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAllFinancePayments, useUpdatePaymentReconciled } from '@/hooks/useFinancePayments';
import { Scale, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export default function FinanceReconciliation() {
  const [accountId, setAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [stmtOpening, setStmtOpening] = useState('');
  const [stmtClosing, setStmtClosing] = useState('');
  const [localReconciled, setLocalReconciled] = useState<Record<string, boolean>>({});

  const { data: accounts } = useFinanceAccounts();
  const { data: payments, isLoading } = useAllFinancePayments({
    accountId: accountId || undefined,
    dateFrom: periodStart || undefined,
    dateTo: periodEnd || undefined,
  });
  const updateReconciled = useUpdatePaymentReconciled();

  const toggleReconciled = (paymentId: string, current: boolean) => {
    const newVal = !current;
    setLocalReconciled(prev => ({ ...prev, [paymentId]: newVal }));
    updateReconciled.mutate({ paymentId, reconciled: newVal });
  };

  const isReconciled = (p: any) => localReconciled[p.id] !== undefined ? localReconciled[p.id] : p.reconciled;

  const reconciledTotal = useMemo(() => {
    return (payments ?? [])
      .filter((p: any) => isReconciled(p))
      .reduce((s: number, p: any) => {
        const amt = Number(p.amount || 0);
        return s + (p.payment_type === 'invoice_payment' ? amt : -amt);
      }, 0);
  }, [payments, localReconciled]);

  const opening = Number(stmtOpening || 0);
  const closing = Number(stmtClosing || 0);
  const expectedChange = closing - opening;
  const difference = reconciledTotal - expectedChange;
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match transactions against bank statements</p>
        </div>
      </div>

      {/* Setup */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Reconciliation Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).filter((a: any) => a.is_active).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Period Start</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
            <div><Label>Period End</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
            <div><Label>Statement Opening</Label><Input type="number" step="0.01" value={stmtOpening} onChange={e => setStmtOpening(e.target.value)} /></div>
            <div><Label>Statement Closing</Label><Input type="number" step="0.01" value={stmtClosing} onChange={e => setStmtClosing(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Difference Summary */}
      {accountId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Reconciled Net</p><p className="text-lg font-bold">{fmt(reconciledTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Expected Change</p><p className="text-lg font-bold">{fmt(expectedChange)}</p></CardContent></Card>
          <Card className={isBalanced ? 'border-accent/50' : 'border-destructive/50'}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Difference</p>
              <p className={`text-lg font-bold ${isBalanced ? 'text-accent' : 'text-destructive'}`}>
                {fmt(difference)}
              </p>
            </CardContent>
          </Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {isBalanced ? <><CheckCircle className="h-4 w-4 text-accent" /><span className="text-sm font-medium text-accent">Balanced</span></> :
                <><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-sm font-medium text-warning">Unresolved</span></>}
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Transactions */}
      {accountId && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (payments ?? []).length === 0 ? (
              <div className="p-12 text-center">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No transactions in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">✓</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Payee / Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payments ?? []).map((p: any) => {
                      const rec = isReconciled(p);
                      return (
                        <TableRow key={p.id} className={rec ? 'bg-accent/5' : ''}>
                          <TableCell>
                            <Checkbox checked={rec} onCheckedChange={() => toggleReconciled(p.id, rec)} />
                          </TableCell>
                          <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{p.payment_type === 'invoice_payment' ? 'Invoice Pmt' : p.payment_type === 'bill_payment' ? 'Bill Pmt' : p.payment_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{p.reference_number || '—'}</TableCell>
                          <TableCell className="text-sm">
                            {(p as any).finance_bills?.finance_vendors?.vendor_name ||
                             (p as any).invoices?.invoice_number ||
                             p.internal_note || '—'}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${p.payment_type === 'invoice_payment' ? 'text-accent' : 'text-destructive'}`}>
                            {p.payment_type === 'invoice_payment' ? '+' : '-'}{fmt(Number(p.amount))}
                          </TableCell>
                          <TableCell>
                            {rec ? <Badge className="bg-accent/10 text-accent">Reconciled</Badge> : <Badge variant="outline">Pending</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!accountId && (
        <Card>
          <CardContent className="p-12 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select an account and period to begin reconciliation</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
