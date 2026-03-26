import { useState, useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Search, Plus, MoreHorizontal, FileStack, Send, FileDown, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, subDays, subMonths, startOfMonth, startOfYear, subWeeks, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Overdue', label: 'Awaiting payment: past due', dot: 'bg-destructive' },
  { value: 'Sent,Viewed', label: 'Awaiting payment: not yet due', dot: 'bg-warning' },
  { value: 'Sent,Viewed,Overdue,Partially Paid', label: 'Awaiting payment: all', dot: 'bg-amber-400' },
  { value: 'Draft', label: 'Draft', dot: 'bg-muted-foreground' },
  { value: 'Paid', label: 'Paid', dot: 'bg-success' },
  { value: 'Failed', label: 'Bad debt', dot: 'bg-destructive' },
  { value: 'Voided', label: 'Voided', dot: 'bg-muted-foreground' },
] as const;

const DATE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_12', label: 'Last 12 months' },
] as const;

function getDateRange(key: string): { from?: Date; to?: Date } {
  const now = new Date();
  switch (key) {
    case 'last_week': return { from: subWeeks(now, 1) };
    case 'last_30': return { from: subDays(now, 30) };
    case 'last_month': {
      const s = startOfMonth(subMonths(now, 1));
      const e = startOfMonth(now);
      return { from: s, to: e };
    }
    case 'this_month': return { from: startOfMonth(now) };
    case 'this_year': return { from: startOfYear(now) };
    case 'last_12': return { from: subMonths(now, 12) };
    default: return {};
  }
}

export default function Invoices() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');

  const { data: allInvoices = [], isLoading } = useInvoices({});

  // Derived filtered list
  const invoices = useMemo(() => {
    let list = [...allInvoices];

    // Status filter
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      list = list.filter((i: any) => statuses.includes(i.status));
    }

    // Date filter
    const range = getDateRange(dateFilter);
    if (range.from) {
      list = list.filter((i: any) => isAfter(parseISO(i.created_at), range.from!));
    }
    if (range.to) {
      list = list.filter((i: any) => isBefore(parseISO(i.created_at), range.to!));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i: any) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.customers?.first_name?.toLowerCase().includes(q) ||
        i.customers?.last_name?.toLowerCase().includes(q) ||
        i.customers?.company_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allInvoices, statusFilter, dateFilter, searchQuery]);

  // Stats
  const pastDueInvoices = allInvoices.filter((i: any) => i.status === 'Overdue');
  const sentNotDue = allInvoices.filter((i: any) => ['Sent', 'Viewed', 'Partially Paid'].includes(i.status));
  const draftInvoices = allInvoices.filter((i: any) => i.status === 'Draft');
  const paidInvoices = allInvoices.filter((i: any) => i.status === 'Paid');

  const pastDueTotal = pastDueInvoices.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
  const sentNotDueTotal = sentNotDue.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
  const draftTotal = draftInvoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  // Issued past 30 days
  const last30 = subDays(new Date(), 30);
  const issuedLast30 = allInvoices.filter((i: any) => i.status !== 'Draft' && isAfter(parseISO(i.created_at), last30));
  const issuedTotal = issuedLast30.reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  // Average invoice past 30 days
  const avgInvoice = issuedLast30.length > 0 ? issuedTotal / issuedLast30.length : 0;

  const selectedStatusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'All';
  const selectedDateLabel = DATE_OPTIONS.find(o => o.value === dateFilter)?.label || 'All';

  const filteredStatusOptions = STATUS_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(statusSearch.toLowerCase())
  );

  // Counts per status option
  const statusCounts: Record<string, number> = {};
  STATUS_OPTIONS.forEach(opt => {
    if (!opt.value) {
      statusCounts[''] = allInvoices.length;
    } else {
      const statuses = opt.value.split(',');
      statusCounts[opt.value] = allInvoices.filter((i: any) => statuses.includes(i.status)).length;
    }
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Invoices</h1>
        <div className="flex items-center gap-2">
          <Link to="/invoices/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <MoreHorizontal className="h-4 w-4" /> More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => toast.info('Batch create coming soon')}>
                <FileStack className="h-4 w-4 mr-2" /> Batch Create Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Batch deliver coming soon')}>
                <Send className="h-4 w-4 mr-2" /> Batch Deliver Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Import coming soon')}>
                <FileDown className="h-4 w-4 mr-2" /> Import Invoice Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Overview</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive inline-block" /> Past due ({pastDueInvoices.length})</span>
                <span className="font-medium">${pastDueTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning inline-block" /> Sent but not due ({sentNotDue.length})</span>
                <span className="font-medium">${sentNotDueTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" /> Draft ({draftInvoices.length})</span>
                <span className="font-medium">${draftTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => { setStatusFilter('Sent,Viewed,Overdue,Partially Paid,Paid'); setDateFilter('last_30'); }}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Issued</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Past 30 days</p>
            <div className="mt-2">
              <span className="text-2xl font-bold">{issuedLast30.length}</span>
              <p className="text-[11px] text-muted-foreground">${issuedTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-sm font-semibold">Average invoice</p>
            <p className="text-[11px] text-muted-foreground">Past 30 days</p>
            <div className="mt-2">
              <span className="text-2xl font-bold">${avgInvoice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-sm font-semibold">Invoice payment time</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{paidInvoices.length}</span>
                <span className="text-[11px] text-muted-foreground">paid</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground font-medium">
          All invoices <span className="text-muted-foreground/60">({invoices.length} results)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status dropdown */}
          <div className="flex items-center gap-1.5">
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
                    placeholder="Search statuses"
                    value={statusSearch}
                    onChange={e => setStatusSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {filteredStatusOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setStatusFilter(opt.value); setStatusOpen(false); setStatusSearch(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-sm transition-colors text-left"
                    >
                      {statusFilter === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {statusFilter !== opt.value && <span className="w-3.5 shrink-0" />}
                      {'dot' in opt && opt.dot && <span className={`h-2 w-2 rounded-full ${opt.dot} shrink-0`} />}
                      <span>{opt.label}</span>
                      <span className="ml-auto text-muted-foreground/60">({statusCounts[opt.value] || 0})</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date dropdown */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  📅 {selectedDateLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1" align="start">
                {DATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setDateFilter(opt.value); setDateOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-sm transition-colors text-left"
                  >
                    {dateFilter === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    {dateFilter !== opt.value && <span className="w-3.5 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No invoices found</p>
        ) : (
          invoices.map((inv: any) => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {inv.customers?.first_name} {inv.customers?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground mono">{inv.invoice_number}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Due {format(new Date(inv.due_date), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <StatusBadge status={inv.status} showIcon={false} />
                    <p className="font-semibold text-sm mono mt-1">${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    {Number(inv.balance_due) > 0 && (
                      <p className="text-[10px] text-muted-foreground">bal ${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Invoice number</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : (
              invoices.map((inv: any) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <TableCell className="text-sm font-medium">
                    {inv.customers?.first_name} {inv.customers?.last_name}
                    {inv.customers?.company_name && (
                      <span className="block text-xs text-muted-foreground">{inv.customers.company_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm mono text-muted-foreground">
                    <Link to={`/invoices/${inv.id}`} className="hover:text-primary" onClick={e => e.stopPropagation()}>
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.due_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inv.jobs?.job_title || '—'}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-sm font-medium text-right mono">${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-sm font-medium text-right mono ${Number(inv.balance_due) > 0 ? 'text-destructive' : 'text-success'}`}>
                    ${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
