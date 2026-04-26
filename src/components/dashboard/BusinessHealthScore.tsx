import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Invoice { paid_at?: string | null; balance_due?: number | null; due_date?: string | null; total?: number | null }
interface Quote { approval_status?: string | null }
interface Visit { visit_status?: string | null; service_date?: string | null }
interface Lead { status?: string | null; created_at?: string | null }

export function BusinessHealthScore({
  invoices, quotes, visits, leads, isLoading,
}: {
  invoices: Invoice[]; quotes: Quote[]; visits: Visit[]; leads: Lead[]; isLoading?: boolean;
}) {
  const { score, factors, label } = useMemo(() => {
    // 1. AR Health (30 pts) — % of outstanding that is current vs overdue
    let outstanding = 0, overdue = 0;
    const today = new Date();
    for (const inv of invoices) {
      const bal = Number(inv.balance_due ?? 0);
      if (bal <= 0 || inv.paid_at) continue;
      outstanding += bal;
      if (inv.due_date && differenceInDays(today, new Date(inv.due_date)) > 0) overdue += bal;
    }
    const arPct = outstanding > 0 ? 1 - (overdue / outstanding) : 1;
    const arScore = Math.round(arPct * 30);

    // 2. Conversion (25 pts) — quotes approved / quotes sent
    const sent = quotes.filter(q => ['Sent', 'Approved'].includes(q.approval_status ?? '')).length;
    const approved = quotes.filter(q => q.approval_status === 'Approved').length;
    const convPct = sent > 0 ? approved / sent : 0.5;
    const convScore = Math.round(Math.min(convPct, 1) * 25);

    // 3. Visit completion (20 pts) — completed / scheduled today + last 7d
    const completed = visits.filter(v => v.visit_status === 'Completed').length;
    const totalVisits = visits.length;
    const visitPct = totalVisits > 0 ? completed / totalVisits : 0.5;
    const visitScore = Math.round(Math.min(visitPct, 1) * 20);

    // 4. Lead pipeline (15 pts) — has new leads in last 14d
    const recentLeads = leads.filter(l => l.created_at && differenceInDays(today, new Date(l.created_at)) <= 14).length;
    const leadScore = Math.min(recentLeads, 15);

    // 5. Cash velocity (10 pts) — recent paid invoices
    const recentlyPaid = invoices.filter(i => i.paid_at && differenceInDays(today, new Date(i.paid_at)) <= 14).length;
    const cashScore = Math.min(recentlyPaid * 2, 10);

    const total = arScore + convScore + visitScore + leadScore + cashScore;
    const factors = [
      { key: 'ar', label: 'AR Health', value: arScore, max: 30 },
      { key: 'conv', label: 'Conversion', value: convScore, max: 25 },
      { key: 'visits', label: 'Visit Completion', value: visitScore, max: 20 },
      { key: 'leads', label: 'Pipeline', value: leadScore, max: 15 },
      { key: 'cash', label: 'Cash Velocity', value: cashScore, max: 10 },
    ];

    let label: { text: string; color: string; ring: string; glow: string };
    if (total >= 80) label = { text: 'Excellent', color: 'text-emerald-500', ring: 'stroke-emerald-500', glow: 'shadow-emerald-500/30' };
    else if (total >= 60) label = { text: 'Healthy', color: 'text-emerald-600', ring: 'stroke-emerald-500', glow: 'shadow-emerald-500/20' };
    else if (total >= 40) label = { text: 'Watch', color: 'text-amber-500', ring: 'stroke-amber-500', glow: 'shadow-amber-500/30' };
    else label = { text: 'Action Needed', color: 'text-rose-500', ring: 'stroke-rose-500', glow: 'shadow-rose-500/40' };

    return { score: total, factors, label };
  }, [invoices, quotes, visits, leads]);

  // Circle math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className={cn('overflow-hidden shadow-lg transition-all', label.glow)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Business Health</p>
              <p className={cn('text-xs font-extrabold', label.color)}>{label.text}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex items-center gap-4">
            {/* Score ring */}
            <div className="relative shrink-0">
              <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                <circle
                  cx="80" cy="80" r={radius}
                  stroke="hsl(var(--muted))" strokeWidth="12" fill="none"
                />
                <circle
                  cx="80" cy="80" r={radius}
                  className={cn(label.ring, 'transition-all duration-1000 ease-out')}
                  strokeWidth="12" fill="none" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className={cn('text-5xl md:text-6xl font-black tabular-nums leading-none', label.color)}>
                  {score}
                </p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">/ 100</p>
              </div>
            </div>

            {/* Factor breakdown */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {factors.map(f => {
                const pct = (f.value / f.max) * 100;
                const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
                return (
                  <div key={f.key}>
                    <div className="flex items-baseline justify-between text-[10px] mb-0.5">
                      <span className="font-bold text-muted-foreground uppercase tracking-wide">{f.label}</span>
                      <span className="font-extrabold tabular-nums text-foreground">{f.value}<span className="text-muted-foreground font-medium">/{f.max}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
