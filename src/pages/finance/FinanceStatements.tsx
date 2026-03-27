import { useState, useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, Printer, Search, User, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export default function FinanceStatements() {
  const { data: allInvoices = [], isLoading: invLoading } = useInvoices({});
  const { data: customers = [], isLoading: custLoading } = useCustomers();

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openBalanceOnly, setOpenBalanceOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  const isLoading = invLoading || custLoading;

  // Customer list with balances
  const customerSummaries = useMemo(() => {
    const map: Record<string, { id: string; name: string; company: string; email: string; totalOwed: number; invoiceCount: number; oldestDue: string | null }> = {};
    allInvoices.forEach((inv: any) => {
      if (!inv.customer_id) return;
      if (!map[inv.customer_id]) {
        map[inv.customer_id] = {
          id: inv.customer_id,
          name: `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim(),
          company: inv.customers?.company_name || '',
          email: inv.customers?.email || '',
          totalOwed: 0, invoiceCount: 0, oldestDue: null,
        };
      }
      if (['Sent', 'Viewed', 'Partially Paid', 'Overdue'].includes(inv.status) && Number(inv.balance_due) > 0) {
        map[inv.customer_id].totalOwed += Number(inv.balance_due);
        map[inv.customer_id].invoiceCount++;
        if (!map[inv.customer_id].oldestDue || inv.due_date < map[inv.customer_id].oldestDue!) {
          map[inv.customer_id].oldestDue = inv.due_date;
        }
      }
    });
    let list = Object.values(map).sort((a, b) => b.totalOwed - a.totalOwed);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
    }
    return list;
  }, [allInvoices, search]);

  // Statement data for selected customer
  const statementData = useMemo(() => {
    if (!selectedCustomer) return null;
    let invoices = allInvoices.filter((i: any) => i.customer_id === selectedCustomer);
    if (dateFrom) invoices = invoices.filter((i: any) => i.issue_date >= dateFrom);
    if (dateTo) invoices = invoices.filter((i: any) => i.issue_date <= dateTo);
    if (openBalanceOnly) invoices = invoices.filter((i: any) => Number(i.balance_due) > 0);
    invoices.sort((a: any, b: any) => a.issue_date.localeCompare(b.issue_date));

    const cust = customers.find((c: any) => c.id === selectedCustomer);
    const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const totalPaid = invoices.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
    const totalBalance = invoices.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);

    return { customer: cust, invoices, totalBilled, totalPaid, totalBalance };
  }, [selectedCustomer, allInvoices, customers, dateFrom, dateTo, openBalanceOnly]);

  const exportCSV = () => {
    if (!statementData) return;
    const csv = [
      'Invoice #,Issue Date,Due Date,Status,Total,Paid,Balance',
      ...statementData.invoices.map((i: any) => `${i.invoice_number},${i.issue_date},${i.due_date},${i.status},${i.total},${i.amount_paid},${i.balance_due}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `statement-${statementData.customer?.first_name}-${statementData.customer?.last_name}.csv`; a.click();
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  if (showStatement && statementData) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowStatement(false)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Customer Statement</h1>
            <p className="text-sm text-muted-foreground">
              {statementData.customer?.first_name} {statementData.customer?.last_name}
              {statementData.customer?.company_name && ` · ${statementData.customer.company_name}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>

        {/* Statement Header */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-lg font-bold">{fmt(statementData.totalBilled)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-lg font-bold text-accent">{fmt(statementData.totalPaid)}</p></div>
            <div><p className="text-xs text-muted-foreground">Balance Due</p><p className="text-lg font-bold text-destructive">{fmt(statementData.totalBalance)}</p></div>
            <div><p className="text-xs text-muted-foreground">Invoices</p><p className="text-lg font-bold">{statementData.invoices.length}</p></div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[140px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[140px]" />
          </div>
          <Button variant={openBalanceOnly ? 'default' : 'outline'} size="sm" onClick={() => setOpenBalanceOnly(!openBalanceOnly)}>
            {openBalanceOnly ? 'Open Balance Only' : 'All Invoices'}
          </Button>
        </div>

        {/* Invoice Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementData.invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No invoices for this period</TableCell></TableRow>
                ) : statementData.invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm font-mono text-primary">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{format(parseISO(inv.issue_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm">{format(parseISO(inv.due_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{inv.status}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmt(Number(inv.total))}</TableCell>
                    <TableCell className="text-right text-sm font-mono text-accent">{fmt(Number(inv.amount_paid || 0))}</TableCell>
                    <TableCell className={cn("text-right text-sm font-bold font-mono", Number(inv.balance_due) > 0 ? 'text-destructive' : 'text-accent')}>
                      {fmt(Number(inv.balance_due || 0))}
                    </TableCell>
                  </TableRow>
                ))}
                {statementData.invoices.length > 0 && (
                  <TableRow className="font-bold border-t-2 bg-muted/20">
                    <TableCell colSpan={4}>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{fmt(statementData.totalBilled)}</TableCell>
                    <TableCell className="text-right font-mono text-accent">{fmt(statementData.totalPaid)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{fmt(statementData.totalBalance)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Aging Summary */}
        {(() => {
          const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
          statementData.invoices.filter((i: any) => Number(i.balance_due) > 0).forEach((inv: any) => {
            const days = differenceInDays(new Date(), parseISO(inv.due_date));
            const bal = Number(inv.balance_due);
            if (days <= 0) buckets.current += bal;
            else if (days <= 30) buckets.d30 += bal;
            else if (days <= 60) buckets.d60 += bal;
            else if (days <= 90) buckets.d90 += bal;
            else buckets.d90plus += bal;
          });
          return (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Aging Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3 text-center">
                  <div><p className="text-[10px] text-muted-foreground">Current</p><p className="font-bold text-sm">{fmt(buckets.current)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">1–30 Days</p><p className="font-bold text-sm text-warning">{fmt(buckets.d30)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">31–60 Days</p><p className="font-bold text-sm text-orange-500">{fmt(buckets.d60)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">61–90 Days</p><p className="font-bold text-sm text-destructive">{fmt(buckets.d90)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">90+ Days</p><p className="font-bold text-sm text-destructive">{fmt(buckets.d90plus)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  }

  // Default: customer list view
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Statements</h1>
          <p className="text-sm text-muted-foreground">Generate and review customer billing statements</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-8 h-8 text-xs" />
      </div>

      {/* Customer List */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Open Balance</TableHead>
                <TableHead className="text-right"># Open</TableHead>
                <TableHead>Oldest Due</TableHead>
                <TableHead className="w-28">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerSummaries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No customers with invoice history</TableCell></TableRow>
              ) : customerSummaries.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.company && <p className="text-[10px] text-muted-foreground">{c.company}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className={cn("text-right text-sm font-bold font-mono", c.totalOwed > 0 ? 'text-destructive' : 'text-accent')}>
                    {fmt(c.totalOwed)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{c.invoiceCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.oldestDue ? format(parseISO(c.oldestDue), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setSelectedCustomer(c.id); setShowStatement(true); }}>
                      <FileText className="h-3 w-3 mr-1" /> Statement
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
