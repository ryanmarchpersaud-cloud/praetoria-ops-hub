import { useState } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileEdit, Eye, CheckCircle, Send, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QUOTE_APPROVAL_STATUSES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

const statusMeta: Record<string, { icon: typeof FileEdit; color: string; label: string }> = {
  Draft: { icon: FileEdit, color: 'text-muted-foreground', label: 'Drafts' },
  'Needs review': { icon: Eye, color: 'text-warning', label: 'Needs Review' },
  Approved: { icon: CheckCircle, color: 'text-success', label: 'Approved' },
  Sent: { icon: Send, color: 'text-primary', label: 'Sent' },
  Declined: { icon: XCircle, color: 'text-destructive', label: 'Declined' },
};

export default function Quotes() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: quotes = [], isLoading } = useQuotes({
    approval_status: statusFilter || undefined,
  });

  // Counts by status
  const allQuotes = useQuotes({}).data || [];
  const counts = QUOTE_APPROVAL_STATUSES.reduce((acc, s) => {
    acc[s] = allQuotes.filter((q: any) => q.approval_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = allQuotes.filter((q: any) =>
    q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Quotes</h1>
        <p className="text-sm text-muted-foreground">{allQuotes.length} total quotes</p>
      </div>

      {/* ── Status Summary Cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUOTE_APPROVAL_STATUSES.map(s => {
          const meta = statusMeta[s];
          const Icon = meta.icon;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? '' : s)}
              className={`
                stat-card text-left cursor-pointer transition-all
                ${isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
              `}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{meta.label}</span>
              </div>
              <p className="text-xl font-bold">{counts[s] || 0}</p>
            </button>
          );
        })}
        {/* Follow-up overdue */}
        <button
          onClick={() => setStatusFilter(statusFilter === '__overdue' ? '' : '__overdue')}
          className={`
            stat-card text-left cursor-pointer transition-all
            ${statusFilter === '__overdue' ? 'ring-2 ring-destructive ring-offset-1 ring-offset-background' : ''}
            ${overdueCount > 0 ? 'border-destructive/30' : ''}
          `}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className={`h-3.5 w-3.5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Overdue</span>
          </div>
          <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-destructive' : ''}`}>{overdueCount}</p>
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {QUOTE_APPROVAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {statusFilter && statusFilter !== '__overdue' && (
          <button onClick={() => setStatusFilter('')} className="text-xs text-muted-foreground hover:text-foreground">
            Clear filter ×
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Follow-up</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : quotes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No quotes found</TableCell></TableRow>
            ) : (
              quotes
                .filter((q: any) => {
                  if (statusFilter === '__overdue') {
                    return q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
                  }
                  return true;
                })
                .map((q: any) => {
                  const isOverdue = q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
                  return (
                    <TableRow
                      key={q.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isOverdue ? 'bg-destructive/5' : ''}`}
                    >
                      <TableCell>
                        <Link to={`/quotes/${q.id}`} className="font-medium mono text-sm hover:text-primary transition-colors">
                          {q.quote_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {q.leads?.first_name} {q.leads?.last_name}
                          {q.leads?.company_name && (
                            <span className="block text-xs text-muted-foreground">{q.leads.company_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{q.service_category}</TableCell>
                      <TableCell className="text-sm font-medium text-right mono">
                        ${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell><StatusBadge status={q.approval_status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {q.follow_up_due_at ? (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {isOverdue && <Clock className="h-3 w-3" />}
                            {formatDistanceToNow(new Date(q.follow_up_due_at), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
