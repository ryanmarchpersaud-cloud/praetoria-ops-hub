import { useState, useMemo } from 'react';
import { useInvoices, useUpdateInvoice } from '@/hooks/useInvoices';
import { useRecordPayment } from '@/hooks/useFinancePayments';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Plus, FileText, DollarSign, Clock, AlertTriangle, CheckCircle,
  TrendingUp, ArrowRight, Download, Printer, Send, MoreHorizontal,
  ChevronDown, ChevronUp, ArrowUpDown, Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO, subDays, isAfter, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

type SortKey = 'invoice_number' | 'issue_date' | 'due_date' | 'customer' | 'total' | 'balance' | 'status';
type SortDir = 'asc' | 'desc';

export default function FinanceInvoices() {
  const nav = useNavigate();
  const { data: allInvoices = [], isLoading } = useInvoices({});
  const updateInvoice = useUpdateInvoice();
  const recordPayment = useRecordPayment();
  const { data: accounts = [] } = useFinanceAccounts();

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Payment dialog
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'e_transfer', account_id: '', reference: '', note: '' });

  // Stats
  const stats = useMemo(() => {
    const drafts = allInvoices.filter((i: any) => i.status === 'Draft');
    const sent = allInvoices.filter((i: any) => ['Sent', 'Viewed'].includes(i.status));
    const partial = allInvoices.filter((i: any) => i.status === 'Partially Paid');
    const paid = allInvoices.filter((i: any) => i.status === 'Paid');
    const overdue = allInvoices.filter((i: any) => i.status === 'Overdue');
    const badDebt = allInvoices.filter((i: any) => i.status === 'Failed');
    const paidThisMonth = paid.filter((i: any) => i.paid_at && isAfter(parseISO(i.paid_at), startOfMonth(new Date())));
    const arOutstanding = [...sent, ...partial, ...overdue].reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
    const avgVal = allInvoices.length > 0 ? allInvoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0) / allInvoices.length : 0;
    const paidWithDates = paid.filter((i: any) => i.paid_at && i.issue_date);
    const avgPayDays = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s: number, i: any) => s + differenceInDays(parseISO(i.paid_at), parseISO(i.issue_date)), 0) / paidWithDates.length)
      : null;
    return {
      total: allInvoices.length, drafts: drafts.length, awaiting: sent.length + partial.length,
      pastDue: overdue.length, paidMonth: paidThisMonth.length, avgVal, avgPayDays, arOutstanding,
      badDebt: badDebt.length,
    };
  }, [allInvoices]);

  // Filter
  const filtered = useMemo(() => {
    let list = [...allInvoices];
    if (statusFilter) {
      const vals = statusFilter.split(',');
      list = list.filter((i: any) => vals.includes(i.status));
    }
    const now = new Date();
    if (dateFilter === 'today') list = list.filter((i: any) => format(parseISO(i.issue_date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'));
    else if (dateFilter === '7d') list = list.filter((i: any) => isAfter(parseISO(i.issue_date), subDays(now, 7)));
    else if (dateFilter === '30d') list = list.filter((i: any) => isAfter(parseISO(i.issue_date), subDays(now, 30)));
    else if (dateFilter === 'month') list = list.filter((i: any) => isAfter(parseISO(i.issue_date), startOfMonth(now)));
    else if (dateFilter === 'last_month') { const lm = subMonths(now, 1); list = list.filter((i: any) => { const d = parseISO(i.issue_date); return isAfter(d, startOfMonth(lm)) && isBefore(d, startOfMonth(now)); }); }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i: any) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.customers?.first_name?.toLowerCase().includes(q) ||
        i.customers?.last_name?.toLowerCase().includes(q) ||
        i.customers?.company_name?.toLowerCase().includes(q) ||
        i.properties?.property_name?.toLowerCase().includes(q) ||
        i.jobs?.job_number?.toLowerCase().includes(q) ||
        i.jobs?.job_title?.toLowerCase().includes(q)
      );
    }

    list.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortKey) {
        case 'invoice_number': cmp = (a.invoice_number || '').localeCompare(b.invoice_number || ''); break;
        case 'issue_date': cmp = new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime(); break;
        case 'due_date': cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime(); break;
        case 'customer': cmp = `${a.customers?.first_name} ${a.customers?.last_name}`.localeCompare(`${b.customers?.first_name} ${b.customers?.last_name}`); break;
        case 'total': cmp = Number(a.total) - Number(b.total); break;
        case 'balance': cmp = Number(a.balance_due) - Number(b.balance_due); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allInvoices, statusFilter, dateFilter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ col }: { col: SortKey }) => sortKey !== col ? <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" /> : sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === pageItems.length ? new Set() : new Set(pageItems.map((i: any) => i.id)));

  // Payment dialog
  const openPayDialog = (inv: any) => {
    setPayInvoice(inv);
    setPayForm({ amount: String(Number(inv.balance_due || inv.total).toFixed(2)), method: 'e_transfer', account_id: '', reference: '', note: '' });
  };

  const submitPayment = async () => {
    if (!payInvoice) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Invalid amount'); return; }
    if (amount > Number(payInvoice.balance_due || payInvoice.total)) { toast.error('Amount exceeds balance due'); return; }
    try {
      await recordPayment.mutateAsync({
        invoice_id: payInvoice.id,
        payment_type: 'invoice_payment',
        amount,
        payment_method: payForm.method,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        account_id: payForm.account_id || null,
        reference_number: payForm.reference || null,
        internal_note: payForm.note || null,
      });
      setPayInvoice(null);
    } catch {}
  };

  // Bulk actions
  const bulkMarkSent = async () => {
    const ids = [...selected].filter(id => allInvoices.find((i: any) => i.id === id && i.status === 'Draft'));
    if (!ids.length) { toast.info('No draft invoices selected'); return; }
    for (const id of ids) { await updateInvoice.mutateAsync({ id, status: 'Sent', sent_at: new Date().toISOString() }); }
    toast.success(`${ids.length} invoice(s) marked sent`);
    setSelected(new Set());
  };

  const exportCSV = () => {
    const rows = (selected.size > 0 ? filtered.filter((i: any) => selected.has(i.id)) : filtered);
    const csv = [
      'Invoice #,Customer,Company,Issue Date,Due Date,Job,Status,Total,Paid,Balance',
      ...rows.map((i: any) => `${i.invoice_number},"${i.customers?.first_name} ${i.customers?.last_name}","${i.customers?.company_name || ''}",${i.issue_date},${i.due_date},${i.jobs?.job_number || ''},${i.status},${i.total},${i.amount_paid},${i.balance_due}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invoices-export.csv'; a.click();
    toast.success('CSV exported');
  };

  const kpis = [
    { label: 'Total Invoices', value: String(stats.total), icon: FileText, color: 'text-primary' },
    { label: 'Draft', value: String(stats.drafts), icon: FileText, color: 'text-muted-foreground' },
    { label: 'Awaiting Payment', value: String(stats.awaiting), icon: Clock, color: 'text-warning' },
    { label: 'Past Due', value: String(stats.pastDue), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Paid This Month', value: String(stats.paidMonth), icon: CheckCircle, color: 'text-accent' },
    { label: 'Avg Invoice', value: fmt(stats.avgVal), icon: TrendingUp, color: 'text-primary' },
    { label: 'Avg Pay Time', value: stats.avgPayDays !== null ? `${stats.avgPayDays}d` : '—', icon: Clock, color: 'text-accent' },
    { label: 'A/R Outstanding', value: fmt(stats.arOutstanding), icon: DollarSign, color: 'text-destructive' },
  ];

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoice Command Center</h1>
          <p className="text-sm text-muted-foreground">Manage invoices, payments, and receivables</p>
        </div>
        <div className="flex gap-2">
          <Link to="/invoices/new"><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Invoice</Button></Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4 mr-1" /> More</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={bulkMarkSent}><Send className="h-4 w-4 mr-2" /> Bulk Mark Sent</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav('/finance/accounts-receivable')}><DollarSign className="h-4 w-4 mr-2" /> A/R Aging</DropdownMenuItem>
              <DropdownMenuItem onClick={() => nav('/finance/statements')}><FileText className="h-4 w-4 mr-2" /> Statements</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-3 text-center">
              <k.icon className={cn("h-4 w-4 mx-auto mb-1", k.color)} />
              <p className="text-lg font-bold text-foreground">{k.value}</p>
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Viewed">Awaiting Payment</SelectItem>
            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Past Due</SelectItem>
            <SelectItem value="Failed">Bad Debt</SelectItem>
            <SelectItem value="Voided">Void</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={v => { setDateFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoices, customers, jobs..." className="pl-8 h-8 text-xs" />
        </div>
        {selected.size > 0 && (
          <Badge variant="outline" className="text-xs">{selected.size} selected</Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10"><Checkbox checked={selected.size === pageItems.length && pageItems.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('invoice_number')}><span className="flex items-center">Invoice # <SortIcon col="invoice_number" /></span></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('issue_date')}><span className="flex items-center">Issued <SortIcon col="issue_date" /></span></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}><span className="flex items-center">Due <SortIcon col="due_date" /></span></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('customer')}><span className="flex items-center">Customer <SortIcon col="customer" /></span></TableHead>
              <TableHead>Job / Quote</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}><span className="flex items-center">Status <SortIcon col="status" /></span></TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('total')}><span className="flex items-center justify-end">Total <SortIcon col="total" /></span></TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('balance')}><span className="flex items-center justify-end">Balance <SortIcon col="balance" /></span></TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-12">No invoices match your filters</TableCell></TableRow>
            ) : pageItems.map((inv: any) => (
              <TableRow key={inv.id} className="hover:bg-muted/50">
                <TableCell><Checkbox checked={selected.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} /></TableCell>
                <TableCell>
                  <Link to={`/invoices/${inv.id}`} className="text-sm font-mono text-primary hover:underline">{inv.invoice_number}</Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(parseISO(inv.issue_date), 'MMM d, yy')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(parseISO(inv.due_date), 'MMM d, yy')}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{inv.customers?.first_name} {inv.customers?.last_name}</p>
                  {inv.customers?.company_name && <p className="text-[10px] text-muted-foreground">{inv.customers.company_name}</p>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {inv.jobs ? <Link to={`/jobs/${inv.jobs.id}`} className="text-primary hover:underline">{inv.jobs.job_number}</Link> : '—'}
                </TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
                <TableCell className="text-sm font-medium text-right font-mono">{fmt(Number(inv.total))}</TableCell>
                <TableCell className="text-sm text-right font-mono text-accent">{fmt(Number(inv.amount_paid || 0))}</TableCell>
                <TableCell className={cn("text-sm font-medium text-right font-mono", Number(inv.balance_due) > 0 ? 'text-destructive' : 'text-accent')}>{fmt(Number(inv.balance_due || 0))}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => nav(`/invoices/${inv.id}`)}>View Detail</DropdownMenuItem>
                      {Number(inv.balance_due) > 0 && inv.status !== 'Draft' && inv.status !== 'Voided' && (
                        <DropdownMenuItem onClick={() => openPayDialog(inv)}>Record Payment</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => nav(`/invoices/${inv.id}/print`)}>Print / PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs h-8">Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs h-8">Next</Button>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={!!payInvoice} onOpenChange={o => !o && setPayInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment — {payInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span><span className="font-bold">{fmt(Number(payInvoice?.total || 0))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance Due</span><span className="font-bold text-destructive">{fmt(Number(payInvoice?.balance_due || payInvoice?.total || 0))}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Amount *</Label>
              <Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className="h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={payForm.method} onValueChange={v => setPayForm(p => ({ ...p, method: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e_transfer">E-Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deposit Account</Label>
              <Select value={payForm.account_id} onValueChange={v => setPayForm(p => ({ ...p, account_id: v }))}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a: any) => a.is_active).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference #</Label>
              <Input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} className="h-8" placeholder="Cheque #, confirmation code..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Note</Label>
              <Textarea rows={2} value={payForm.note} onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayInvoice(null)}>Cancel</Button>
            <Button onClick={submitPayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
