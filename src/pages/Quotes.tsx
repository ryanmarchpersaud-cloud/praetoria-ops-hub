import { useState } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileEdit, Eye, CheckCircle, Send, XCircle, Clock, ChevronRight, Plus, CalendarClock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QUOTE_APPROVAL_STATUSES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { CreateQuoteDialog } from '@/components/CreateQuoteDialog';
import { useActionPermissions } from '@/hooks/useActionPermissions';

const statusMeta: Record<string, { icon: typeof FileEdit; color: string; label: string }> = {
  Draft: { icon: FileEdit, color: 'text-muted-foreground', label: 'Drafts' },
  'Needs review': { icon: Eye, color: 'text-warning', label: 'Review' },
  Approved: { icon: CheckCircle, color: 'text-success', label: 'Approved' },
  Sent: { icon: Send, color: 'text-primary', label: 'Sent' },
  Declined: { icon: XCircle, color: 'text-destructive', label: 'Declined' },
};

/**
 * Tiny inline badge shown next to the client name so admins can see at a glance
 * whether a client accepted, declined, or hasn't replied to a quote.
 */
function ClientResponseBadge({ q }: { q: any }) {
  const status = q.approval_status as string | undefined;
  const overdue = q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date() && status === 'Sent';

  let label = '';
  let cls = '';
  let title = '';

  if (status === 'Approved') {
    label = '✓ Accepted';
    cls = 'bg-success/15 text-success border-success/30';
    title = 'Client accepted this quote';
  } else if (status === 'Declined') {
    label = '✕ Declined';
    cls = 'bg-destructive/15 text-destructive border-destructive/30';
    title = 'Client declined this quote';
  } else if (status === 'Sent' && overdue) {
    label = '⏰ No reply';
    cls = 'bg-warning/15 text-warning border-warning/30';
    title = 'Sent — follow-up overdue, client hasn\'t responded';
  } else if (status === 'Sent') {
    label = '… Awaiting';
    cls = 'bg-primary/10 text-primary border-primary/30';
    title = 'Sent to client — awaiting reply';
  } else if (status === 'Needs review') {
    label = 'Review';
    cls = 'bg-warning/10 text-warning border-warning/30';
    title = 'Internal review needed before sending';
  } else {
    return null; // Draft and unknown — no badge
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium leading-none whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

export default function Quotes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const defaultCustomerId = searchParams.get('customer_id') || undefined;
  const { data: quotes = [], isLoading } = useQuotes({
    approval_status: statusFilter || undefined,
  });
  const { canManageQuotes } = useActionPermissions();

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Quotes</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{allQuotes.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/quotes/follow-ups">
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">Follow-ups</span>
              {overdueCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                  {overdueCount}
                </span>
              )}
            </Link>
          </Button>
          {canManageQuotes && (
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Quote
            </Button>
          )}
        </div>
      </div>

      <CreateQuoteDialog open={createOpen} onOpenChange={setCreateOpen} defaultCustomerId={defaultCustomerId} />

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
                      {(() => {
                        const c = q.customers || q.leads;
                        const name = c ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() : '';
                        const display = c ? (c.company_name ? `${c.company_name}${name ? ` — ${name}` : ''}` : name || 'Unknown') : 'Unknown';
                        return (
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{display}</p>
                            <ClientResponseBadge q={q} />
                          </div>
                        );
                      })()}
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
                        {(() => {
                          const c = q.customers || q.leads;
                          if (!c) return <span className="text-muted-foreground">—</span>;
                          const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
                          const primary = c.company_name || name || 'Unknown';
                          const secondary = c.company_name && name ? name : null;
                          const target = q.customer_id ? `/customers/${q.customer_id}` : (q.lead_id ? `/leads/${q.lead_id}` : null);
                          const content = (
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{primary}</span>
                                <ClientResponseBadge q={q} />
                              </div>
                              {secondary && <span className="block text-xs text-muted-foreground">{secondary}</span>}
                            </div>
                          );
                          return target ? (
                            <Link to={target} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">{content}</Link>
                          ) : content;
                        })()}
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
