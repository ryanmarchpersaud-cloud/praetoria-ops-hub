import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Receipt, FileText, Briefcase, CalendarX } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useMissedVisitsYesterday } from '@/hooks/useDashboardInsights';
import { cn } from '@/lib/utils';

interface Props {
  invoices: any[];
  quotes: any[];
  jobs: any[];
  isLoading: boolean;
}

const STALE_QUOTE_DAYS = 5;

export function NeedsAttentionStrip({ invoices, quotes, jobs, isLoading }: Props) {
  const { data: missedVisits = [], isLoading: loadMissed } = useMissedVisitsYesterday();

  // Treat any unpaid invoice past its due date as overdue, even if the stored
  // status is still "Sent"/"Viewed"/"Partially Paid".
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = invoices.filter((i: any) => {
    if (['Paid', 'Voided', 'Draft'].includes(i.status)) return false;
    if (i.status === 'Overdue') return true;
    if (!i.due_date) return false;
    return new Date(`${String(i.due_date).slice(0, 10)}T00:00:00`) < today;
  });
  const overdueTotal = overdue.reduce(
    (s: number, i: any) => s + Number(i.balance_due ?? (Number(i.total || 0) - Number(i.amount_paid || 0))),
    0
  );

  const staleQuotes = quotes.filter(
    (q: any) =>
      ['Draft', 'Needs review'].includes(q.approval_status) &&
      q.created_at &&
      differenceInDays(new Date(), new Date(q.created_at)) >= STALE_QUOTE_DAYS
  );

  const uninvoiced = jobs.filter(
    (j: any) => (j.status === 'Completed' || j.status === 'Closed') && j.billing_status !== 'invoiced'
  );

  const items = [
    {
      key: 'overdue',
      label: 'Overdue invoices',
      value: overdue.length,
      sub: overdue.length ? `$${overdueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} outstanding` : 'None past due',
      icon: Receipt,
      link: '/invoices?status=Overdue',
      tone: 'rose' as const,
    },
    {
      key: 'stale',
      label: `Quotes idle ${STALE_QUOTE_DAYS}d+`,
      value: staleQuotes.length,
      sub: staleQuotes.length ? 'Draft / Needs review' : 'All quotes moving',
      icon: FileText,
      link: '/quotes',
      tone: 'amber' as const,
    },
    {
      key: 'uninvoiced',
      label: 'Completed, not invoiced',
      value: uninvoiced.length,
      sub: uninvoiced.length ? 'Ready to bill' : 'Nothing waiting',
      icon: Briefcase,
      link: '/jobs?status=Completed',
      tone: 'emerald' as const,
    },
    {
      key: 'missed',
      label: 'Missed visits yesterday',
      value: missedVisits.length,
      sub: missedVisits.length ? 'Not marked complete' : 'All visits closed out',
      icon: CalendarX,
      link: '/visits',
      tone: 'blue' as const,
    },
  ];

  const toneMap = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  };

  const totalFlagged = items.reduce((s, i) => s + i.value, 0);
  const loading = isLoading || loadMissed;

  return (
    <Card className={cn('border-l-4', totalFlagged > 0 ? 'border-l-amber-500' : 'border-l-emerald-500')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={cn('h-4 w-4', totalFlagged > 0 ? 'text-amber-600' : 'text-emerald-600')} />
          <h3 className="text-base md:text-lg font-extrabold tracking-tight">Needs Attention</h3>
          {!loading && (
            <span className="text-xs font-semibold text-muted-foreground">
              {totalFlagged > 0 ? `${totalFlagged} item${totalFlagged === 1 ? '' : 's'}` : 'All clear'}
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map(i => <Skeleton key={i.key} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map(item => (
              <Link
                key={item.key}
                to={item.link}
                className="rounded-lg border border-border p-3 hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('w-7 h-7 rounded-md flex items-center justify-center', toneMap[item.tone])}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-2xl font-extrabold tabular-nums leading-none">{item.value}</span>
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{item.sub}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
