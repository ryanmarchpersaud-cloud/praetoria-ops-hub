import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Lead { status?: string | null }
interface Quote { approval_status?: string | null; sent_status?: string | null }
interface Job { status?: string | null }
interface Invoice { status?: string | null; paid_at?: string | null; balance_due?: number | null }

export function ConversionFunnel({
  leads, quotes, jobs, invoices, isLoading,
}: {
  leads: Lead[]; quotes: Quote[]; jobs: Job[]; invoices: Invoice[]; isLoading?: boolean;
}) {
  const stages = useMemo(() => {
    const leadCount = leads.length;
    const sentQuotes = quotes.filter(q => ['Sent', 'Approved'].includes(q.approval_status ?? '') || q.sent_status === 'sent').length;
    const approved = quotes.filter(q => q.approval_status === 'Approved').length;
    const jobCount = jobs.length;
    const invoiced = invoices.length;
    const paid = invoices.filter(i => i.paid_at || (Number(i.balance_due ?? 0) <= 0 && i.status !== 'draft')).length;

    return [
      { key: 'leads', label: 'Leads', value: leadCount, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-700 dark:text-blue-300', link: '/leads' },
      { key: 'quoted', label: 'Quotes Sent', value: sentQuotes, color: 'from-indigo-500 to-indigo-600', textColor: 'text-indigo-700 dark:text-indigo-300', link: '/quotes' },
      { key: 'approved', label: 'Approved', value: approved, color: 'from-violet-500 to-violet-600', textColor: 'text-violet-700 dark:text-violet-300', link: '/quotes' },
      { key: 'jobs', label: 'Jobs', value: jobCount, color: 'from-amber-500 to-amber-600', textColor: 'text-amber-700 dark:text-amber-300', link: '/jobs' },
      { key: 'invoiced', label: 'Invoiced', value: invoiced, color: 'from-orange-500 to-orange-600', textColor: 'text-orange-700 dark:text-orange-300', link: '/finance/invoices' },
      { key: 'paid', label: 'Paid', value: paid, color: 'from-emerald-500 to-emerald-600', textColor: 'text-emerald-700 dark:text-emerald-300', link: '/finance/invoices' },
    ];
  }, [leads, quotes, jobs, invoices]);

  const max = Math.max(...stages.map(s => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 dark:bg-violet-950/30">
            <Filter className="h-4 w-4 text-violet-600" />
          </span>
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-2">
            {stages.map((s, i) => {
              const widthPct = Math.max((s.value / max) * 100, 8);
              const prev = i > 0 ? stages[i - 1].value : null;
              const conv = prev !== null && prev > 0 ? Math.round((s.value / prev) * 100) : null;
              return (
                <Link
                  key={s.key}
                  to={s.link}
                  className="block group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-20 md:w-24 shrink-0 text-right">
                      <p className={cn('text-[11px] md:text-xs font-bold uppercase tracking-wide', s.textColor)}>{s.label}</p>
                      {conv !== null && (
                        <p className="text-[9px] md:text-[10px] text-muted-foreground font-semibold">{conv}% ▼</p>
                      )}
                    </div>
                    <div className="flex-1 relative h-9 md:h-10 bg-muted/40 rounded-md overflow-hidden">
                      <div
                        className={cn('h-full bg-gradient-to-r rounded-md transition-all group-hover:opacity-90', s.color)}
                        style={{ width: `${widthPct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-sm md:text-base font-extrabold text-white tabular-nums drop-shadow-sm">
                          {s.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            <p className="text-[10px] text-muted-foreground pt-2 text-center">
              Overall: <span className="font-bold text-foreground">{stages[0].value > 0 ? Math.round((stages[stages.length - 1].value / stages[0].value) * 100) : 0}%</span> of leads convert to paid
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
