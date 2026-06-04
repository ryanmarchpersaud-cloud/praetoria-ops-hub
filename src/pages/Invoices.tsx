import { useState, useMemo, useCallback } from 'react';
import { useInvoices, useUpdateInvoice } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ChevronRight, ChevronDown, ChevronUp, Search, Plus, MoreHorizontal,
  FileStack, Send, FileDown, Check, Printer, Download, CheckCircle,
  XCircle, Clock, CalendarIcon, ArrowUpDown, Receipt, TrendingUp,
  DollarSign, BarChart3, AlertCircle, X, User, ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, subDays, subMonths, startOfMonth, startOfYear, subWeeks, isAfter, isBefore, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useActionPermissions } from '@/hooks/useActionPermissions';

// ── Status mapping: UI labels → backend values ──
const STATUS_OPTIONS = [
  { value: '', label: 'All', dot: '' },
  { value: 'Draft', label: 'Draft', dot: 'bg-muted-foreground' },
  { value: 'Sent', label: 'Sent / Issued', dot: 'bg-info' },
  { value: 'Viewed', label: 'Awaiting Payment', dot: 'bg-warning' },
  { value: 'Sent,Viewed', label: 'Awaiting — Not Due Yet', dot: 'bg-amber-500' },
  { value: 'Overdue', label: 'Past Due', dot: 'bg-destructive' },
  { value: 'Paid', label: 'Paid', dot: 'bg-success' },
  { value: 'Partially Paid', label: 'Partially Paid', dot: 'bg-amber-400' },
  { value: 'Voided', label: 'Void', dot: 'bg-muted-foreground' },
  { value: 'Failed', label: 'Bad Debt / Written Off', dot: 'bg-destructive' },
] as const;

const DATE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_12', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
] as const;

type SortKey = 'client' | 'invoice_number' | 'issue_date' | 'due_date' | 'status' | 'total' | 'balance';
type SortDir = 'asc' | 'desc';

function getDateRange(key: string, customFrom?: Date, customTo?: Date): { from?: Date; to?: Date } {
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

const ITEMS_PER_PAGE = 25;

const currency = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currencyShort = (n: number) => n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + n.toFixed(0);

export default function Invoices() {
  const navigate = useNavigate();
  const { data: allInvoices = [], isLoading } = useInvoices({});
  const updateInvoice = useUpdateInvoice();
  const { canManageInvoices, canEditInvoiceDrafts } = useActionPermissions();

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('last_30');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customCalOpen, setCustomCalOpen] = useState(false);

  const [customerFilter, setCustomerFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);

  const { data: customerResults = [] } = useCustomers(customerSearch || undefined);

  // ── Sort ──
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── Active card highlight ──
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // ── Computed stats (always from allInvoices, not filtered) ──
  const stats = useMemo(() => {
    const pastDue = allInvoices.filter((i: any) => i.status === 'Overdue');
    const sentNotDue = allInvoices.filter((i: any) => ['Sent', 'Viewed', 'Partially Paid'].includes(i.status));
    const drafts = allInvoices.filter((i: any) => i.status === 'Draft');
    const paid = allInvoices.filter((i: any) => i.status === 'Paid');
    const last30 = subDays(new Date(), 30);
    const issued = allInvoices.filter((i: any) => i.status !== 'Draft' && isAfter(parseISO(i.created_at), last30));
    const issuedTotal = issued.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const avg = issued.length > 0 ? issuedTotal / issued.length : 0;

    // Payment time: avg days between issue_date and paid_at for paid invoices
    const paidWithDates = paid.filter((i: any) => i.paid_at && i.issue_date);
    const avgPayDays = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s: number, i: any) => s + differenceInDays(parseISO(i.paid_at), parseISO(i.issue_date)), 0) / paidWithDates.length)
      : null;

    return {
      pastDue, sentNotDue, drafts, paid, issued,
      pastDueTotal: pastDue.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0),
      sentNotDueTotal: sentNotDue.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0),
      draftTotal: drafts.reduce((s: number, i: any) => s + Number(i.total || 0), 0),
      issuedCount: issued.length,
      issuedTotal,
      avgInvoice: avg,
      paidCount: paid.length,
      avgPayDays,
    };
  }, [allInvoices]);

  // ── Status counts ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': allInvoices.length };
    STATUS_OPTIONS.forEach(opt => {
      if (opt.value) {
        const vals = opt.value.split(',');
        counts[opt.value] = allInvoices.filter((i: any) => vals.includes(i.status)).length;
      }
    });
    return counts;
  }, [allInvoices]);

  // ── Filtered & sorted list ──
  const invoices = useMemo(() => {
    let list = [...allInvoices];

    if (statusFilter) {
      const statuses = statusFilter.split(',');
      list = list.filter((i: any) => statuses.includes(i.status));
    }

    if (customerFilter) {
      list = list.filter((i: any) => i.customer_id === customerFilter);
    }

    const range = getDateRange(dateFilter, customFrom, customTo);
    if (range.from) list = list.filter((i: any) => isAfter(parseISO(i.created_at), range.from!));
    if (range.to) list = list.filter((i: any) => isBefore(parseISO(i.created_at), range.to!));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i: any) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.customers?.first_name?.toLowerCase().includes(q) ||
        i.customers?.last_name?.toLowerCase().includes(q) ||
        i.customers?.company_name?.toLowerCase().includes(q) ||
        i.customer_memo?.toLowerCase().includes(q) ||
        i.properties?.property_name?.toLowerCase().includes(q) ||
        i.jobs?.job_number?.toLowerCase().includes(q) ||
        i.jobs?.job_title?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortKey) {
        case 'client': {
          const na = `${a.customers?.first_name || ''} ${a.customers?.last_name || ''}`.trim().toLowerCase();
          const nb = `${b.customers?.first_name || ''} ${b.customers?.last_name || ''}`.trim().toLowerCase();
          cmp = na.localeCompare(nb);
          break;
        }
        case 'invoice_number': cmp = (a.invoice_number || '').localeCompare(b.invoice_number || ''); break;
        case 'issue_date': cmp = new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime(); break;
        case 'due_date': cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime(); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'total': cmp = Number(a.total) - Number(b.total); break;
        case 'balance': cmp = Number(a.balance_due) - Number(b.balance_due); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allInvoices, statusFilter, dateFilter, searchQuery, sortKey, sortDir, customFrom, customTo]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(invoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = invoices.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const handleCardClick = (card: string, filter: string, date: string) => {
    setActiveCard(card);
    setStatusFilter(filter);
    setDateFilter(date);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFilter('last_30');
    setSearchQuery('');
    setCustomerFilter('');
    setCustomerSearch('');
    setActiveCard(null);
    setPage(1);
  };

  const selectedStatusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'All';
  const selectedDateLabel = DATE_OPTIONS.find(o => o.value === dateFilter)?.label || 'All time';

  const hasActiveFilters = statusFilter || dateFilter !== 'last_30' || searchQuery || customerFilter;

  // ── Batch actions ──
  const handleBatchStatus = async (status: string) => {
    const targets = invoices.filter((i: any) => i.status === 'Draft');
    if (targets.length === 0) { toast.info('No applicable invoices for this action.'); return; }
    try {
      for (const inv of targets) {
        await updateInvoice.mutateAsync({ id: inv.id, status });
      }
      toast.success(`${targets.length} invoice(s) updated to ${status}.`);
    } catch { toast.error('Failed to update some invoices.'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage drafts, sent invoices, payments, balances, and delivery actions
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEditInvoiceDrafts && (
            <Link to="/invoices/new">
              <Button className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> New Invoice
              </Button>
            </Link>
          )}
          {canManageInvoices && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <MoreHorizontal className="h-4 w-4" /> More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => toast.info('Batch create coming soon')}>
                  <FileStack className="h-4 w-4 mr-2" /> Batch Create Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Batch deliver coming soon')}>
                  <Send className="h-4 w-4 mr-2" /> Batch Send / Deliver
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Export coming soon')}>
                  <Download className="h-4 w-4 mr-2" /> Export Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Import coming soon')}>
                  <FileDown className="h-4 w-4 mr-2" /> Import Invoice Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchStatus('Sent')}>
                  <Send className="h-4 w-4 mr-2" /> Mark All Draft → Sent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchStatus('Paid')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark All Draft → Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchStatus('Voided')}>
                  <XCircle className="h-4 w-4 mr-2" /> Mark All Draft → Void
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Bulk print coming soon')}>
                  <Printer className="h-4 w-4 mr-2" /> Print Selected PDFs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Bulk download coming soon')}>
                  <Download className="h-4 w-4 mr-2" /> Download Selected PDFs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ═══ SUMMARY DASHBOARD CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-28" />
              </CardContent></Card>
            ))}
          </>
        ) : (
          <>
            {/* CARD A: Overview */}
            <Card className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              activeCard === 'overview' && "ring-2 ring-primary/30 shadow-md"
            )} onClick={() => handleCardClick('overview', '', 'all')}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">Overview</p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                      Past due ({stats.pastDue.length})
                    </span>
                    <span className="font-semibold text-foreground">{currency(stats.pastDueTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-warning inline-block" />
                      Sent, not due ({stats.sentNotDue.length})
                    </span>
                    <span className="font-semibold text-foreground">{currency(stats.sentNotDueTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" />
                      Draft ({stats.drafts.length})
                    </span>
                    <span className="font-semibold text-foreground">{currency(stats.draftTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD B: Issued */}
            <Card className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              activeCard === 'issued' && "ring-2 ring-primary/30 shadow-md"
            )} onClick={() => handleCardClick('issued', 'Sent,Viewed,Overdue,Partially Paid,Paid', 'last_30')}>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-info/10 flex items-center justify-center">
                      <Receipt className="h-3.5 w-3.5 text-info" />
                    </div>
                    <p className="text-sm font-semibold">Issued</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Past 30 days</p>
                <div className="mt-auto pt-2">
                  <span className="text-2xl font-bold">{stats.issuedCount}</span>
                  <p className="text-xs text-muted-foreground">{currencyShort(stats.issuedTotal)}</p>
                </div>
              </CardContent>
            </Card>

            {/* CARD C: Average Invoice */}
            <Card className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              activeCard === 'average' && "ring-2 ring-primary/30 shadow-md"
            )} onClick={() => handleCardClick('average', '', 'last_30')}>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <p className="text-sm font-semibold">Average Invoice</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Past 30 days</p>
                <div className="mt-auto pt-2">
                  <span className="text-2xl font-bold">{currency(stats.avgInvoice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* CARD D: Payment Time */}
            <Card className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              activeCard === 'payment' && "ring-2 ring-primary/30 shadow-md"
            )} onClick={() => handleCardClick('payment', 'Paid', 'all')}>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5 text-success" />
                    </div>
                    <p className="text-sm font-semibold">Payment Time</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-auto pt-2">
                  {stats.avgPayDays !== null ? (
                    <>
                      <span className="text-2xl font-bold">{stats.avgPayDays}</span>
                      <span className="text-xs text-muted-foreground ml-1">days avg</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">No data yet</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{stats.paidCount} paid invoice{stats.paidCount !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══ FILTER BAR ═══ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card border rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Status filter */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                Status <span className="font-normal text-muted-foreground">|</span> {selectedStatusLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search statuses…"
                  value={statusSearch}
                  onChange={e => setStatusSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {STATUS_OPTIONS.filter(o => o.label.toLowerCase().includes(statusSearch.toLowerCase())).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setStatusOpen(false); setStatusSearch(''); setPage(1); setActiveCard(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-sm transition-colors text-left"
                  >
                    {statusFilter === opt.value ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="w-3.5 shrink-0" />}
                    {opt.dot && <span className={cn("h-2 w-2 rounded-full shrink-0", opt.dot)} />}
                    <span className="flex-1">{opt.label}</span>
                    <span className="text-muted-foreground/50">({statusCounts[opt.value] || 0})</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date filter */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <CalendarIcon className="h-3 w-3" /> {selectedDateLabel}
                {dateFilter === 'custom' && customFrom && (
                  <span className="text-muted-foreground ml-1">
                    {format(customFrom, 'MMM d')} – {customTo ? format(customTo, 'MMM d') : 'now'}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-1 min-w-[200px]">
                {DATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (opt.value === 'custom') { setCustomCalOpen(true); }
                      else { setDateFilter(opt.value); setDateOpen(false); setPage(1); setActiveCard(null); }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-sm transition-colors text-left"
                  >
                    {dateFilter === opt.value ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="w-3.5 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </div>
              {customCalOpen && (
                <div className="border-t p-3 space-y-3">
                  <p className="text-xs font-medium">Select custom range</p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-8 w-32 justify-start">
                          {customFrom ? format(customFrom, 'MMM d, yyyy') : 'Start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-8 w-32 justify-start">
                          {customTo ? format(customTo, 'MMM d, yyyy') : 'End date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button size="sm" className="w-full text-xs" onClick={() => {
                    setDateFilter('custom');
                    setCustomCalOpen(false);
                    setDateOpen(false);
                    setPage(1);
                    setActiveCard(null);
                  }}>Apply Range</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Customer quick-search filter */}
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <User className="h-3 w-3" />
                {customerFilter ? 'Customer filtered' : 'Customer'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search customers…"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="max-h-56 overflow-y-auto p-1">
                {customerResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">No customers found</p>
                ) : (
                  customerResults.map((c: any) => {
                    const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
                    const display = c.company_name ? `${c.company_name}${name ? ` — ${name}` : ''}` : name || 'Unknown';
                    const isSelected = customerFilter === c.id;
                    return (
                      <div key={c.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted rounded-sm transition-colors">
                        <button
                          onClick={() => { setCustomerFilter(isSelected ? '' : c.id); setCustomerOpen(false); setCustomerSearch(''); setPage(1); setActiveCard(null); }}
                          className="flex-1 text-left text-xs truncate"
                        >
                          <span className={isSelected ? 'font-medium text-primary' : ''}>{display}</span>
                        </button>
                        <Link
                          to={`/customers/${c.id}`}
                          onClick={() => setCustomerOpen(false)}
                          className="shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary"
                          title="View customer profile"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoices, customers, jobs…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-8 h-8 w-full md:w-64 text-xs"
          />
        </div>
      </div>

      {/* ═══ RESULTS HEADER ═══ */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          All invoices <span className="text-muted-foreground">({invoices.length} result{invoices.length !== 1 ? 's' : ''})</span>
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* ═══ MOBILE CARDS ═══ */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </CardContent></Card>
          ))
        ) : paginatedInvoices.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices match your filters</p>
            {hasActiveFilters && (
              <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear all filters</Button>
            )}
          </CardContent></Card>
        ) : (
          paginatedInvoices.map((inv: any) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
              <Card className="hover:shadow-sm active:bg-muted/50 transition-all">
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {inv.customers?.first_name} {inv.customers?.last_name}
                    </p>
                    {inv.customers?.company_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{inv.customers.company_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{inv.invoice_number}</p>
                    <p className={cn("text-[11px] mt-0.5", inv.status === 'Overdue' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      Due {format(new Date(inv.due_date), 'MMM d, yyyy')}
                      {inv.status === 'Overdue' && (() => {
                        const days = differenceInDays(new Date(), parseISO(inv.due_date));
                        return days > 0 ? ` · ${days}d late` : '';
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <StatusBadge status={inv.status} showIcon={false} />
                      <p className="font-semibold text-sm font-mono mt-1">{currency(Number(inv.total))}</p>
                      {Number(inv.balance_due) > 0 && (
                        <p className="text-[10px] text-muted-foreground">bal {currency(Number(inv.balance_due))}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* ═══ DESKTOP TABLE ═══ */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('client')}>
                <span className="flex items-center">Client <SortIcon col="client" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('invoice_number')}>
                <span className="flex items-center">Invoice # <SortIcon col="invoice_number" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('issue_date')}>
                <span className="flex items-center">Issued <SortIcon col="issue_date" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                <span className="flex items-center">Due Date <SortIcon col="due_date" /></span>
              </TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center">Status <SortIcon col="status" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('total')}>
                <span className="flex items-center justify-end">Total <SortIcon col="total" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('balance')}>
                <span className="flex items-center justify-end">Balance <SortIcon col="balance" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No invoices match your filters</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters}>Clear all filters</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv: any) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <TableCell>
                    <p className="text-sm font-medium">
                      {inv.customers?.first_name} {inv.customers?.last_name}
                    </p>
                    {inv.customers?.company_name && (
                      <p className="text-[11px] text-muted-foreground">{inv.customers.company_name}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-sm font-mono text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(inv.issue_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className={cn(
                      inv.status === 'Overdue' && 'text-destructive font-medium'
                    )}>
                      {format(new Date(inv.due_date), 'MMM d, yyyy')}
                      {inv.status === 'Overdue' && (() => {
                        const days = differenceInDays(new Date(), parseISO(inv.due_date));
                        return days > 0 ? <span className="ml-1 text-[10px]">({days}d late)</span> : null;
                      })()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {inv.jobs?.job_title || inv.properties?.property_name || inv.customer_memo || '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-sm font-medium text-right font-mono">
                    {currency(Number(inv.total))}
                  </TableCell>
                  <TableCell className={cn(
                    "text-sm font-medium text-right font-mono",
                    Number(inv.balance_due) > 0 ? "text-destructive" : "text-success"
                  )}>
                    {currency(Number(inv.balance_due))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ═══ PAGINATION ═══ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="text-xs h-8"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 text-xs p-0"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            {totalPages > 7 && <span className="text-xs text-muted-foreground px-1">…</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="text-xs h-8"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
