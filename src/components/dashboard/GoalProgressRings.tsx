import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const GOALS = {
  revenue: 50000,
  visits: 100,
  customers: 10,
};

interface Invoice { total?: number | null; issue_date?: string | null; created_at?: string | null }
interface Visit { visit_status?: string | null; service_date?: string | null }

function useNewCustomersThisMonth() {
  return useQuery({
    queryKey: ['mtd_new_customers'],
    queryFn: async () => {
      const start = startOfMonth(new Date()).toISOString();
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

interface RingDef {
  key: string;
  label: string;
  current: number;
  goal: number;
  color: string;
  trackColor: string;
  format: (v: number) => string;
}

function Ring({ ring, size = 110, stroke = 10 }: { ring: RingDef; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(ring.current / ring.goal, 1);
  const offset = c - pct * c;
  const pctLabel = Math.round(pct * 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ring.trackColor} strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ring.color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 4px ${ring.color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[9px] uppercase tracking-wide font-bold text-muted-foreground leading-none">{ring.label}</p>
        <p className="text-base md:text-lg font-extrabold tabular-nums leading-tight" style={{ color: ring.color }}>
          {pctLabel}%
        </p>
        <p className="text-[9px] tabular-nums text-muted-foreground font-medium leading-none">
          {ring.format(ring.current)}
        </p>
      </div>
    </div>
  );
}

export function GoalProgressRings({ invoices, visits, isLoading }: { invoices: Invoice[]; visits: Visit[]; isLoading?: boolean }) {
  const { data: newCustomers = 0 } = useNewCustomersThisMonth();

  const rings: RingDef[] = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const mtdRevenue = invoices.reduce((s, inv) => {
      const dt = inv.issue_date ?? inv.created_at;
      if (!dt || new Date(dt) < monthStart) return s;
      return s + Number(inv.total ?? 0);
    }, 0);
    const mtdVisits = visits.filter(v =>
      v.visit_status === 'Completed' &&
      v.service_date && new Date(v.service_date) >= monthStart
    ).length;

    return [
      { key: 'revenue', label: 'Revenue', current: mtdRevenue, goal: GOALS.revenue, color: 'hsl(142 71% 45%)', trackColor: 'hsl(142 71% 45% / 0.15)', format: (v) => `$${(v / 1000).toFixed(1)}k` },
      { key: 'visits', label: 'Visits', current: mtdVisits, goal: GOALS.visits, color: 'hsl(217 91% 60%)', trackColor: 'hsl(217 91% 60% / 0.15)', format: (v) => `${v}` },
      { key: 'customers', label: 'New Cust', current: newCustomers, goal: GOALS.customers, color: 'hsl(280 65% 60%)', trackColor: 'hsl(280 65% 60% / 0.15)', format: (v) => `${v}` },
    ];
  }, [invoices, visits, newCustomers]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 dark:bg-violet-950/30">
            <Target className="h-4 w-4 text-violet-600" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Monthly Goals</p>
            <p className="text-xs font-extrabold text-foreground">Progress this month</p>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className={cn('flex items-center justify-around gap-2 py-2')}>
            {rings.map(r => <Ring key={r.key} ring={r} />)}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Targets: ${GOALS.revenue.toLocaleString()} · {GOALS.visits} visits · {GOALS.customers} new customers
        </p>
      </CardContent>
    </Card>
  );
}
