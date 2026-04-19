import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RecordPaymentDialog } from '@/components/finance/RecordPaymentDialog';
import {
  Search, DollarSign, CreditCard, ArrowUpDown, ChevronUp, ChevronDown,
  CalendarIcon, TrendingUp, AlertTriangle, CheckCircle, Clock, X, Banknote,
  ArrowRight, Plus, User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO, subDays, subMonths, subWeeks, startOfMonth, startOfYear, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'disputed', label: 'Disputed' },
];

const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'card', label: 'Card' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'ach', label: 'ACH / Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_12', label: 'Last 12 Months' },
  { value: 'custom', label: 'Custom Range' },
];

type SortKey = 'date' | 'amount' | 'method' | 'status';

function getDateRange(key: string, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  switch (key) {
    case 'last_week': return { from: subWeeks(now, 1) };
    case 'last_30': return { from: subDays(now, 30) };
    case 'last_month': return { from: startOfMonth(subMonths(now, 1)), to: startOfMonth(now) };
    case 'this_month': return { from: startOfMonth(now) };
    case 'this_year': return { from: startOfYear(now) };
    case 'last_12': return { from: subMonths(now, 12) };
    case 'custom': return { from: customFrom, to: customTo };
    default: return {};
  }
}

function paymentStatusLabel(p: any): string {
  if (p.is_reversed) return 'Refunded';
  if (p.payment_type === 'refund') return 'Refunded';
  if (p.internal_note?.toLowerCase().includes('dispute')) return 'Disputed';
  return 'Succeeded';
}

function methodLabel(m: string | null): string {
  if (!m) return '—';
  const map: Record<string, string> = {
    card: 'Card', e_transfer: 'E-Transfer', ach: 'ACH', cash: 'Cash',
    cheque: 'Cheque', online: 'Online', stripe: 'Online (Stripe)',
  };
  return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function FinancePayments() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('last_30');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customCalOpen, setCustomCalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState<string>('');
  const perPage = 25;

  // Customer search for "Record Payment" entry
  const { data: customers = [] } = useQuery({
    queryKey: ['fp_customers_picker'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email')
        .order('company_name', { ascending: true, nullsFirst: false })
        .limit(500);
      return data || [];
    },
  });

  // Fetch all payments with invoice + customer data
  const { data: allPayments = [], isLoading } = useQuery({
    queryKey: ['finance_payments_full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_payments')
        .select('*, invoices(id, invoice_number, customer_id, customers(first_name, last_name, company_name, email))')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const active = allPayments.filter((p: any) => !p.is_reversed);
    const totalCollected = active.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const succeeded = active.filter((p: any) => paymentStatusLabel(p) === 'Succeeded');
    const succeededTotal = succeeded.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const refunded = allPayments.filter((p: any) => p.is_reversed);
    const refundedTotal = refunded.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pending = active.filter((p: any) => !p.reconciled);
    const pendingTotal = pending.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    return {
      totalCollected, succeededCount: succeeded.length, succeededTotal,
      refundedCount: refunded.length, refundedTotal,
      pendingCount: pending.length, pendingTotal,
      total: allPayments.length,
    };
  }, [allPayments]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...allPayments];

    if (statusFilter !== 'all') {
      list = list.filter((p: any) => {
        const s = paymentStatusLabel(p).toLowerCase().replace(' ', '_');
        return s === statusFilter;
      });
    }
    if (methodFilter !== 'all') {
      list = list.filter((p: any) => p.payment_method === methodFilter);
    }

    const range = getDateRange(dateFilter, customFrom, customTo);
    if (range.from) list = list.filter((p: any) => isAfter(parseISO(p.payment_date), range.from!));
    if (range.to) list = list.filter((p: any) => isBefore(parseISO(p.payment_date), range.to!));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) => {
        const inv = p.invoices;
        const cust = inv?.customers;
        return (
          inv?.invoice_number?.toLowerCase().includes(q) ||
          cust?.first_name?.toLowerCase().includes(q) ||
          cust?.last_name?.toLowerCase().includes(q) ||
          cust?.company_name?.toLowerCase().includes(q) ||
          p.reference_number?.toLowerCase().includes(q) ||
          p.payment_method?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime(); break;
        case 'amount': cmp = Number(a.amount) - Number(b.amount); break;
        case 'method': cmp = (a.payment_method || '').localeCompare(b.payment_method || ''); break;
        case 'status': cmp = paymentStatusLabel(a).localeCompare(paymentStatusLabel(b)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allPayments, statusFilter, methodFilter, dateFilter, search, sortKey, sortDir, customFrom, customTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" />
      : sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;

  const hasFilters = statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'last_30' || search;
  const clearFilters = () => { setStatusFilter('all'); setMethodFilter('all'); setDateFilter('last_30'); setSearch(''); setPage(1); };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all payments, payouts, and transaction statuses</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(stats.totalCollected)}</p>
            <p className="text-xs text-muted-foreground">{stats.total} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Succeeded</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(stats.succeededTotal)}</p>
            <p className="text-xs text-muted-foreground">{stats.succeededCount} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(stats.pendingTotal)}</p>
            <p className="text-xs text-muted-foreground">{stats.pendingCount} awaiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Refunded</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(stats.refundedTotal)}</p>
            <p className="text-xs text-muted-foreground">{stats.refundedCount} refunds</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={v => { setMethodFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={v => { setDateFilter(v); setPage(1); if (v === 'custom') setCustomCalOpen(true); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {dateFilter === 'custom' && (
          <Popover open={customCalOpen} onOpenChange={setCustomCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {customFrom ? format(customFrom, 'MMM d') : 'From'} – {customTo ? format(customTo, 'MMM d') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={{ from: customFrom, to: customTo }} onSelect={(range: any) => { setCustomFrom(range?.from); setCustomTo(range?.to); }} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        )}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search client, invoice, reference..." className="pl-8 h-8 text-xs" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Payments Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Client</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                <span className="flex items-center">Date <SortIcon col="date" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center">Status <SortIcon col="status" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('method')}>
                <span className="flex items-center">Method <SortIcon col="method" /></span>
              </TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('amount')}>
                <span className="flex items-center justify-end">Amount <SortIcon col="amount" /></span>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No payments match your filters
                </TableCell>
              </TableRow>
            ) : pageItems.map((p: any) => {
              const inv = p.invoices;
              const cust = inv?.customers;
              const clientName = cust ? `${cust.first_name} ${cust.last_name}` : '—';
              const statusStr = paymentStatusLabel(p);
              const statusVariant = statusStr === 'Succeeded' ? 'Paid' : statusStr === 'Refunded' ? 'Voided' : statusStr;

              return (
                <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/finance/payments/${p.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium">{clientName}</p>
                    {inv?.invoice_number && (
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-xs text-primary hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {inv.invoice_number}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {format(parseISO(p.payment_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell><StatusBadge status={statusVariant} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      {p.payment_method === 'card' ? <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> : <Banknote className="h-3.5 w-3.5 text-muted-foreground" />}
                      {methodLabel(p.payment_method)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {p.reference_number || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("text-sm font-semibold tabular-nums", p.is_reversed && "text-destructive line-through")}>
                      {fmt(Number(p.amount))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">Prev</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
