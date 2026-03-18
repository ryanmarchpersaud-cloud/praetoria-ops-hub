import { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileEdit, Send, Eye, CheckCircle, AlertCircle, Clock, Ban, ChevronRight, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';

const INVOICE_STATUSES = ['Draft', 'Sent', 'Viewed', 'Paid', 'Partially Paid', 'Overdue', 'Failed', 'Voided'] as const;

const statusMeta: Record<string, { icon: typeof FileEdit; color: string; label: string }> = {
  Draft: { icon: FileEdit, color: 'text-muted-foreground', label: 'Draft' },
  Sent: { icon: Send, color: 'text-primary', label: 'Sent' },
  Viewed: { icon: Eye, color: 'text-blue-500', label: 'Viewed' },
  Paid: { icon: CheckCircle, color: 'text-success', label: 'Paid' },
  'Partially Paid': { icon: DollarSign, color: 'text-warning', label: 'Partial' },
  Overdue: { icon: Clock, color: 'text-destructive', label: 'Overdue' },
  Failed: { icon: AlertCircle, color: 'text-destructive', label: 'Failed' },
  Voided: { icon: Ban, color: 'text-muted-foreground', label: 'Voided' },
};

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: invoices = [], isLoading } = useInvoices({ status: statusFilter || undefined });
  const allInvoices = useInvoices({}).data || [];

  const counts = INVOICE_STATUSES.reduce((acc, s) => {
    acc[s] = allInvoices.filter((i: any) => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const totalOutstanding = allInvoices
    .filter((i: any) => ['Sent', 'Viewed', 'Overdue', 'Partially Paid'].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.balance_due || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Invoices</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{allInvoices.length} total · ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding</p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <FileEdit className="h-3.5 w-3.5" /> New Invoice
        </Link>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {INVOICE_STATUSES.map(s => {
          const meta = statusMeta[s];
          const Icon = meta.icon;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? '' : s)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95
                ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}`}
            >
              <Icon className={`h-3 w-3 ${isActive ? 'text-primary' : meta.color}`} />
              {meta.label}
              <span className={`ml-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}>{counts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {statusFilter && (
        <button onClick={() => setStatusFilter('')} className="text-xs text-muted-foreground hover:text-foreground">
          Clear filter ×
        </button>
      )}

      {/* Mobile: Card list */}
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
              className={`block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors ${
                inv.status === 'Overdue' || inv.status === 'Failed' ? 'border-destructive/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium mono text-sm">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} showIcon={false} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {inv.customers?.first_name} {inv.customers?.last_name}
                    {inv.customers?.company_name && ` — ${inv.customers.company_name}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Due {format(new Date(inv.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-semibold text-sm mono">${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {Number(inv.balance_due) > 0 && Number(inv.balance_due) !== Number(inv.total) && (
                      <p className="text-[10px] text-destructive">bal ${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Job</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : (
              invoices.map((inv: any) => (
                <TableRow key={inv.id} className={`cursor-pointer hover:bg-muted/50 ${inv.status === 'Overdue' || inv.status === 'Failed' ? 'bg-destructive/5' : ''}`} onClick={() => window.location.href = `/invoices/${inv.id}`}>
                  <TableCell>
                    <Link to={`/invoices/${inv.id}`} className="font-medium mono text-sm hover:text-primary" onClick={e => e.stopPropagation()}>{inv.invoice_number}</Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {inv.customers?.first_name} {inv.customers?.last_name}
                    {inv.customers?.company_name && <span className="block text-xs text-muted-foreground">{inv.customers.company_name}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inv.jobs?.job_title || '—'}</TableCell>
                  <TableCell className="text-sm font-medium text-right mono">${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-sm font-medium text-right mono ${Number(inv.balance_due) > 0 ? 'text-destructive' : 'text-success'}`}>
                    ${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.due_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
