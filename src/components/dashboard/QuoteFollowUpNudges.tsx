import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BellRing, ChevronRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  quotes: any[];
  isLoading: boolean;
}

type Tier = { label: string; min: number; className: string };

const TIERS: Tier[] = [
  { label: '14d+ — final nudge', min: 14, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  { label: '7d+ — second nudge', min: 7, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  { label: '3d+ — first nudge', min: 3, className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
];

function tierFor(days: number): Tier | null {
  return TIERS.find(t => days >= t.min) ?? null;
}

function clientName(q: any) {
  const l = q.leads;
  if (!l) return 'Client';
  return l.company_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim() || 'Client';
}

export function QuoteFollowUpNudges({ quotes, isLoading }: Props) {
  const pending = quotes
    .filter((q: any) => {
      if (q.approval_status !== 'Sent' && q.sent_status !== 'Sent') return false;
      if (['Approved', 'Declined'].includes(q.approval_status)) return false;
      return !!(q.sent_at || q.created_at);
    })
    .map((q: any) => {
      const since = new Date(q.sent_at || q.created_at);
      const days = differenceInDays(new Date(), since);
      return { ...q, days, tier: tierFor(days) };
    })
    .filter((q: any) => q.tier)
    .sort((a: any, b: any) => b.days - a.days);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <BellRing className="h-4 w-4 text-amber-600" />
            </span>
            Quote Follow-ups
          </CardTitle>
          <Link to="/quotes" className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1.5">No sent quotes awaiting a nudge.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {pending.slice(0, 6).map((q: any) => (
              <Link
                key={q.id}
                to={`/quotes/${q.id}`}
                className="flex items-center justify-between gap-2 py-2 active:bg-muted/30 rounded transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-mono font-medium truncate">{q.quote_number}</p>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground truncate">
                    {clientName(q)} · ${Number(q.total || 0).toLocaleString()} · {q.days}d with no reply
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0 border-transparent', q.tier.className)}>
                  {q.tier.label}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
