import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinanceDashboard, useFinanceExpenses, useFinanceBills } from '@/hooks/useFinance';
import { useAllFinancePayments } from '@/hooks/useFinancePayments';
import { usePayrollRuns, usePaidSubcontractorPayStubPayouts, useRemittances } from '@/hooks/usePayroll';
import { useStep6Metrics } from '@/hooks/useStep6Metrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportInvoices } from '@/lib/accountingExport';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const COLORS = ['hsl(215,65%,48%)', 'hsl(158,50%,42%)', 'hsl(38,90%,50%)', 'hsl(0,68%,52%)', 'hsl(270,50%,50%)', 'hsl(180,50%,40%)', 'hsl(30,70%,50%)', 'hsl(340,60%,50%)'];

export default function FinanceReports() {
  const [tab, setTab] = useState('category');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRange = (dateFrom || dateTo) ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined;
  const { data: stats, isLoading } = useFinanceDashboard(dateRange);
  const { data: expenses } = useFinanceExpenses({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  const { data: bills } = useFinanceBills();
  const { data: payments } = useAllFinancePayments({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });

  const { data: invoices } = useQuery({
    queryKey: ['finance_reports_invoices', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('invoices').select('total, balance_due, status, issue_date');
      if (dateFrom) q = q.gte('issue_date', dateFrom);
      if (dateTo) q = q.lte('issue_date', dateTo);
      const { data } = await q;
      return data || [];
    },
  });

  // Expense by Category
  const catData = Object.entries(stats?.categoryBreakdown ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Expense by Vendor
  const vendorMap: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    const v = (e as any).finance_vendors?.vendor_name || 'Unknown';
    vendorMap[v] = (vendorMap[v] || 0) + Number(e.amount_total || 0);
  });
  const vendorData = Object.entries(vendorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  // Invoice aging
  const invAging = { current: 0, '30days': 0, '60days': 0, '90plus': 0 };
  (invoices ?? []).filter((i: any) => ['sent', 'overdue'].includes(i.status)).forEach((i: any) => {
    const days = Math.floor((Date.now() - new Date(i.issue_date).getTime()) / 86400000);
    if (days <= 30) invAging.current += Number(i.balance_due);
    else if (days <= 60) invAging['30days'] += Number(i.balance_due);
    else if (days <= 90) invAging['60days'] += Number(i.balance_due);
    else invAging['90plus'] += Number(i.balance_due);
  });
  const agingData = [
    { name: 'Current', value: invAging.current },
    { name: '31-60 Days', value: invAging['30days'] },
    { name: '61-90 Days', value: invAging['60days'] },
    { name: '90+ Days', value: invAging['90plus'] },
  ];

  // Bills aging
  const billAging = { current: 0, '30days': 0, '60days': 0, '90plus': 0 };
  (bills ?? []).filter((b: any) => ['open', 'partial', 'overdue'].includes(b.status)).forEach((b: any) => {
    const days = Math.floor((Date.now() - new Date(b.bill_date || b.due_date).getTime()) / 86400000);
    if (days <= 30) billAging.current += Number(b.balance_due);
    else if (days <= 60) billAging['30days'] += Number(b.balance_due);
    else if (days <= 90) billAging['60days'] += Number(b.balance_due);
    else billAging['90plus'] += Number(b.balance_due);
  });
  const billAgingData = [
    { name: 'Current', value: billAging.current },
    { name: '31-60 Days', value: billAging['30days'] },
    { name: '61-90 Days', value: billAging['60days'] },
    { name: '90+ Days', value: billAging['90plus'] },
  ];

  // Payments summary
  const paymentData = useMemo(() => {
    const map: Record<string, { in: number; out: number }> = {};
    (payments ?? []).forEach((p: any) => {
      const key = p.payment_method || 'Unknown';
      if (!map[key]) map[key] = { in: 0, out: 0 };
      if (p.payment_type === 'invoice_payment') map[key].in += Number(p.amount || 0);
      else map[key].out += Number(p.amount || 0);
    });
    return Object.entries(map).map(([name, v]) => ({ name, cashIn: v.in, cashOut: v.out }));
  }, [payments]);
  const paymentTotals = paymentData.reduce((acc, r) => ({ cashIn: acc.cashIn + r.cashIn, cashOut: acc.cashOut + r.cashOut }), { cashIn: 0, cashOut: 0 });

  const exportCurrentTab = async () => {
    // Invoice-centric tabs export the full invoice list (with GST/PST, payments, etc.)
    if (tab === 'inv-summary' || tab === 'inv-aging' || tab === 'collections') {
      try {
        const count = await exportInvoices(dateFrom || undefined, dateTo || undefined);
        if (count > 0) toast.success(`Exported ${count} invoice${count === 1 ? '' : 's'}`);
        else toast.info('No invoices found for this report period.');
      } catch (e: any) {
        toast.error(`Export failed: ${e?.message || 'Unknown error'}`);
      }
      return;
    }
    let csv = '';
    if (tab === 'category') {
      csv = ['Category,Amount', ...catData.map(r => `${r.name},${r.value}`)].join('\n');
    } else if (tab === 'vendor') {
      csv = ['Vendor,Amount', ...vendorData.map(r => `${r.name},${r.value}`)].join('\n');
    } else if (tab === 'payments') {
      csv = ['Method,Cash In,Cash Out', ...paymentData.map(r => `${r.name},${r.cashIn},${r.cashOut}`)].join('\n');
    } else {
      csv = `Revenue,${stats?.totalRevenue ?? 0}\nExpenses,${stats?.totalExpenses ?? 0}\nNet,${stats?.grossMargin ?? 0}`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `finance-report-${tab}.csv`; a.click();
    toast.success('CSV exported');
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Reports</h1>
          <p className="text-sm text-muted-foreground">Preset financial reports and analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCurrentTab}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-muted-foreground">Date Range:</span>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] h-8" placeholder="From" />
        <span className="text-muted-foreground text-sm">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] h-8" placeholder="To" />
        {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="vendor">By Vendor</TabsTrigger>
          <TabsTrigger value="inv-aging">Invoice Aging</TabsTrigger>
          <TabsTrigger value="bill-aging">Bills Aging</TabsTrigger>
          <TabsTrigger value="revenue-expense">Revenue vs Expense</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="inv-summary">Invoice Summary</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="payouts">Subcontractor Payouts</TabsTrigger>
          <TabsTrigger value="remittances">Remittances</TabsTrigger>
          <TabsTrigger value="conversion">Quote Conversion</TabsTrigger>
          <TabsTrigger value="unbilled">Unbilled Work</TabsTrigger>
        </TabsList>

        <TabsContent value="category">
          <Card>
            <CardHeader><CardTitle className="text-sm">Expense by Category</CardTitle></CardHeader>
            <CardContent>
              {catData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={catData} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                      <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {catData.map(r => {
                        const total = catData.reduce((s, c) => s + c.value, 0);
                        return (
                          <TableRow key={r.name}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-right">{fmt(r.value)}</TableCell>
                            <TableCell className="text-right">{total > 0 ? ((r.value / total) * 100).toFixed(1) : '0'}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Vendors by Spend</CardTitle></CardHeader>
            <CardContent>
              {vendorData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={vendorData} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                      <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {vendorData.map(r => (
                        <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right">{fmt(r.value)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inv-aging">
          <Card>
            <CardHeader><CardTitle className="text-sm">Invoices Aging (Accounts Receivable)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => fmt(v)} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Table>
                  <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {agingData.map(r => (
                      <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right">{fmt(r.value)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2"><TableCell>Total</TableCell><TableCell className="text-right">{fmt(agingData.reduce((s, r) => s + r.value, 0))}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bill-aging">
          <Card>
            <CardHeader><CardTitle className="text-sm">Bills Aging (Accounts Payable)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={billAgingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => fmt(v)} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Table>
                  <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {billAgingData.map(r => (
                      <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right">{fmt(r.value)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2"><TableCell>Total</TableCell><TableCell className="text-right">{fmt(billAgingData.reduce((s, r) => s + r.value, 0))}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue-expense">
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue vs Expenses Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold text-accent">{fmt(stats?.totalRevenue ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-bold text-destructive">{fmt(stats?.totalExpenses ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Net</p><p className={`text-xl font-bold ${(stats?.grossMargin ?? 0) >= 0 ? 'text-accent' : 'text-destructive'}`}>{fmt(stats?.grossMargin ?? 0)}</p></div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[{ name: 'Revenue', value: stats?.totalRevenue ?? 0 }, { name: 'Expenses', value: stats?.totalExpenses ?? 0 }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`}>
                    <Cell fill="hsl(var(--accent))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment History by Method</CardTitle></CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => fmt(v)} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="cashIn" fill="hsl(var(--accent))" name="Cash In" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cashOut" fill="hsl(var(--destructive))" name="Cash Out" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">Cash In</TableHead><TableHead className="text-right">Cash Out</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paymentData.map(r => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right text-accent">{fmt(r.cashIn)}</TableCell>
                          <TableCell className="text-right text-destructive">{fmt(r.cashOut)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center text-muted-foreground py-12">No payment data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inv-summary">
          <Card>
            <CardHeader><CardTitle className="text-sm">Invoice Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {['Draft','Sent','Viewed','Partially Paid','Paid','Overdue','Voided','Failed'].map(st => {
                    const group = (invoices ?? []).filter((i: any) => i.status === st);
                    if (!group.length) return null;
                    return (
                      <TableRow key={st}>
                        <TableCell className="font-medium">{st}</TableCell>
                        <TableCell className="text-right">{group.length}</TableCell>
                        <TableCell className="text-right">{fmt(group.reduce((s: number, i: any) => s + Number(i.total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{fmt(group.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections">
          <Card>
            <CardHeader><CardTitle className="text-sm">Overdue / Collections</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(invoices ?? []).filter((i: any) => i.status === 'overdue' || (Number(i.balance_due) > 0 && new Date(i.issue_date) < new Date(Date.now() - 30*86400000))).slice(0, 20).map((i: any) => (
                    <TableRow key={i.total + i.issue_date}>
                      <TableCell className="font-medium">—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{i.issue_date}</TableCell>
                      <TableCell className="text-right">{fmt(Number(i.balance_due || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {(invoices ?? []).filter((i: any) => Number(i.balance_due) > 0).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No overdue invoices</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll"><PayrollReportTab dateFrom={dateFrom} dateTo={dateTo} /></TabsContent>
        <TabsContent value="payouts"><PayoutReportTab dateFrom={dateFrom} dateTo={dateTo} /></TabsContent>
        <TabsContent value="remittances"><RemittanceReportTab /></TabsContent>
        <TabsContent value="conversion"><ConversionFunnelTab /></TabsContent>
        <TabsContent value="unbilled"><UnbilledWorkTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Payroll Report Tab ── */
function PayrollReportTab() {
  const { data: runs } = usePayrollRuns();
  const processedRuns = (runs ?? []).filter(r => r.status === 'processed');

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Runs Summary</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Run #</TableHead><TableHead>Period</TableHead><TableHead>Pay Date</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {processedRuns.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.run_number || '—'}</TableCell>
                <TableCell>{r.pay_period_start} → {r.pay_period_end}</TableCell>
                <TableCell>{r.pay_date}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
            {processedRuns.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No processed payroll runs</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Payout Report Tab ── */
function PayoutReportTab() {
  const { data: runs } = usePayoutRuns();
  const processedRuns = (runs ?? []).filter(r => r.status === 'processed');

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Subcontractor Payout Runs</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Run #</TableHead><TableHead>Period</TableHead><TableHead>Payout Date</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {processedRuns.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.payout_run_number || '—'}</TableCell>
                <TableCell>{r.period_start} → {r.period_end}</TableCell>
                <TableCell>{r.payout_date}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
            {processedRuns.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No processed payout runs</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Remittance Report Tab ── */
function RemittanceReportTab() {
  const { data: rems } = useRemittances();

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Remittance Summary</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Rem #</TableHead><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rems ?? []).map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.remittance_number || '—'}</TableCell>
                <TableCell>{r.remittance_type}</TableCell>
                <TableCell>{r.period_start} → {r.period_end}</TableCell>
                <TableCell>{r.due_date}</TableCell>
                <TableCell className="text-right">{new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(r.amount))}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
            {(!rems || rems.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No remittances</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Quote Conversion Funnel Tab ── */
function ConversionFunnelTab() {
  const { data: m } = useStep6Metrics();
  const fmt = (n: number) => new Intl.NumberFormat('en-CA').format(n);
  const funnelData = [
    { stage: 'Approved Quotes (Not Converted)', count: m?.approvedNotConverted ?? 0 },
    { stage: 'Converted Quotes', count: m?.convertedQuotes ?? 0 },
    { stage: 'Jobs from Quotes', count: m?.jobsFromQuotes ?? 0 },
    { stage: 'Invoiced Jobs', count: m?.invoicedJobs ?? 0 },
  ];

  const exportCsv = () => {
    const csv = ['Stage,Count', ...funnelData.map(r => `${r.stage},${r.count}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'quote-conversion-funnel.csv'; a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Quote → Job Conversion Funnel</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelData.map((row, i) => (
            <div key={row.stage} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{row.stage}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${funnelData[0].count > 0 ? Math.max(5, (row.count / Math.max(funnelData[0].count, funnelData[1].count, 1)) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums">{fmt(row.count)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Unbilled Work Tab ── */
function UnbilledWorkTab() {
  const { data: m } = useStep6Metrics();

  const rows = [
    { label: 'Completed Visits (Total)', value: m?.completedVisits ?? 0 },
    { label: 'Unbilled Completed Visits', value: m?.unbilledVisits ?? 0 },
    { label: 'Invoiced Visits', value: m?.invoicedVisits ?? 0 },
    { label: 'Completed Jobs (Total)', value: m?.completedJobs ?? 0 },
    { label: 'Invoiced Jobs', value: m?.invoicedJobs ?? 0 },
    { label: 'Draft Invoices from Work', value: m?.draftInvoicesFromWork ?? 0 },
  ];

  const exportCsv = () => {
    const csv = ['Metric,Value', ...rows.map(r => `${r.label},${r.value}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'unbilled-work-report.csv'; a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Unbilled / Completed Work Summary</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.label}>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-right font-bold">{r.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
