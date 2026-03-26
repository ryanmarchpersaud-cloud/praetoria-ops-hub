import { useState } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileEdit, Eye, CheckCircle, Send, XCircle, Clock, ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QUOTE_APPROVAL_STATUSES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { CreateQuoteDialog } from '@/components/CreateQuoteDialog';

const statusMeta: Record<string, { icon: typeof FileEdit; color: string; label: string }> = {
  Draft: { icon: FileEdit, color: 'text-muted-foreground', label: 'Drafts' },
  'Needs review': { icon: Eye, color: 'text-warning', label: 'Review' },
  Approved: { icon: CheckCircle, color: 'text-success', label: 'Approved' },
  Sent: { icon: Send, color: 'text-primary', label: 'Sent' },
  Declined: { icon: XCircle, color: 'text-destructive', label: 'Declined' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const defaultCustomerId = searchParams.get('customer_id') || undefined;
  const { data: quotes = [], isLoading } = useQuotes({
    approval_status: statusFilter || undefined,
  });

  const allQuotes = useQuotes({}).data || [];
  const counts = QUOTE_APPROVAL_STATUSES.reduce((acc, s) => {
    acc[s] = allQuotes.filter((q: any) => q.approval_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = allQuotes.filter((q: any) =>
    q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent'
  ).length;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Quotes</h1>
        <p className="text-xs md:text-sm text-muted-foreground">{allQuotes.length} total</p>
      </div>

      {/* Status chips — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {QUOTE_APPROVAL_STATUSES.map(s => {
          const meta = statusMeta[s];
          const Icon = meta.icon;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? '' : s)}
              className={`
                shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95
                ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}
              `}
            >
              <Icon className={`h-3 w-3 ${isActive ? 'text-primary' : meta.color}`} />
              {meta.label}
              <span className={`ml-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}>{counts[s] || 0}</span>
            </button>
          );
        })}
        <button
          onClick={() => setStatusFilter(statusFilter === '__overdue' ? '' : '__overdue')}
          className={`
            shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95
            ${statusFilter === '__overdue' ? 'bg-destructive/10 border-destructive/30 text-destructive' : `bg-card border-border ${overdueCount > 0 ? 'text-destructive border-destructive/20' : 'text-muted-foreground'}`}
          `}
        >
          <Clock className="h-3 w-3" />
          Overdue
          <span className="ml-0.5">{overdueCount}</span>
        </button>
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
        ) : quotes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No quotes found</p>
        ) : (
          quotes
            .filter((q: any) => {
              if (statusFilter === '__overdue') return q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
              return true;
            })
            .map((q: any) => {
              const isOverdue = q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
              return (
                <Link
                  key={q.id}
                  to={`/quotes/${q.id}`}
                  className={`block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors ${isOverdue ? 'border-destructive/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium mono text-sm">{q.quote_number}</p>
                        <StatusBadge status={q.approval_status} showIcon={false} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {q.leads?.first_name} {q.leads?.last_name}
                        {q.leads?.company_name && ` — ${q.leads.company_name}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">{q.service_category}</span>
                        {isOverdue && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-[11px] text-destructive font-medium flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> Overdue
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm mono">${Number(q.total).toLocaleString()}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </Link>
              );
            })
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
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
                  if (statusFilter === '__overdue') return q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
                  return true;
                })
                .map((q: any) => {
                  const isOverdue = q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && q.approval_status === 'Sent';
                  return (
                    <TableRow key={q.id} className={`cursor-pointer hover:bg-muted/50 ${isOverdue ? 'bg-destructive/5' : ''}`} onClick={() => navigate(`/quotes/${q.id}`)}>
                      <TableCell><Link to={`/quotes/${q.id}`} className="font-medium mono text-sm hover:text-primary">{q.quote_number}</Link></TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {q.leads?.first_name} {q.leads?.last_name}
                          {q.leads?.company_name && <span className="block text-xs text-muted-foreground">{q.leads.company_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.service_category}</TableCell>
                      <TableCell className="text-sm font-medium text-right mono">${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><StatusBadge status={q.approval_status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {q.follow_up_due_at ? (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {isOverdue && <Clock className="h-3 w-3" />}
                            {formatDistanceToNow(new Date(q.follow_up_due_at), { addSuffix: true })}
                          </span>
                        ) : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</TableCell>
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
