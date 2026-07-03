import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Clock, AlertCircle, Users, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Invoice { total?: number | null; issue_date?: string | null; created_at?: string | null; balance_due?: number | null; paid_at?: string | null; due_date?: string | null }
interface Job { status?: string | null; created_at?: string | null }
interface Quote { approval_status?: string | null; created_at?: string | null }

function useTimesheetsLast30d() {
  return useQuery({
    queryKey: ['sparkline_timesheets_30d'],
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), 29).toISOString();
      const { data, error } = await supabase
        .from('timesheets')
        .select('clock_in, clock_out, status')
        .in('status', ['approved', 'submitted', 'pending'])
        .not('clock_out', 'is', null)
        .gte('clock_in', since);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCustomersLast30d() {
  return useQuery({
    queryKey: ['sparkline_customers_30d'],
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), 29).toISOString();
      const { data, error } = await supabase
        .from('customers')
        .select('created_at')
        .gte('created_at', since);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function buildBuckets(items: any[], dateField: (i: any) => string | null | undefined, valueField: (i: any) => number) {
  const today = startOfDay(new Date());
  const days: { date: string; v: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push({ date: format(subDays(today, i), 'yyyy-MM-dd'), v: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const item of items) {
    const d = dateField(item);
    if (!d) continue;
    const k = format(new Date(d), 'yyyy-MM-dd');
    if (idx.has(k)) days[idx.get(k)!].v += valueField(item);
  }
  return days;
}

interface SparkTile {
  key: string;
  label: string;
  value: string;
  subnote?: string;
  series: { v: number }[];
  trend: number;
  color: string;
  bgGradient: string;
  icon: React.ElementType;
  link?: string;
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SparklineKPIStrip({
  invoices, jobs, quotes, leads, isLoading,
}: {
  invoices: Invoice[]; jobs: Job[]; quotes: Quote[]; leads: { created_at?: string | null }[]; isLoading?: boolean;
}) {
  const { data: timesheets = [], isLoading: loadTs } = useTimesheetsLast30d();
  const { data: customers = [], isLoading: loadCust } = useCustomersLast30d();

  const tiles: SparkTile[] = useMemo(() => {
    const today = new Date();
    const halfAgo = subDays(today, 15);

    // Revenue (invoiced) per day
    const revBuckets = buildBuckets(invoices, (i) => i.issue_date ?? i.created_at, (i) => Number(i.total ?? 0));
    const revTotal = revBuckets.reduce((s, d) => s + d.v, 0);
    const rev1 = revBuckets.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const rev2 = revBuckets.slice(15).reduce((s, d) => s + d.v, 0);
    const revTrend = rev1 > 0 ? Math.round(((rev2 - rev1) / rev1) * 100) : 0;

    // Jobs created per day
    const jobBuckets = buildBuckets(jobs, (j) => j.created_at, () => 1);
    const jobTotal = jobBuckets.reduce((s, d) => s + d.v, 0);
    const j1 = jobBuckets.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const j2 = jobBuckets.slice(15).reduce((s, d) => s + d.v, 0);
    const jobTrend = j1 > 0 ? Math.round(((j2 - j1) / j1) * 100) : 0;

    // Hours worked per day (approved + submitted + pending)
    const hourBuckets = buildBuckets(timesheets, (t) => t.clock_in, (t) => {
      if (!t.clock_out) return 0;
      return (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000;
    });
    const hourTotal = hourBuckets.reduce((s, d) => s + d.v, 0);
    const pendingHours = timesheets
      .filter((t: any) => t.status !== 'approved' && t.clock_out)
      .reduce((s: number, t: any) => s + (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000, 0);
    const h1 = hourBuckets.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const h2 = hourBuckets.slice(15).reduce((s, d) => s + d.v, 0);
    const hourTrend = h1 > 0 ? Math.round(((h2 - h1) / h1) * 100) : 0;

    // AR outstanding per day (snapshot — total outstanding doesn't really vary per day; use overdue count trend)
    const arOverdueDaily = buildBuckets(invoices, (i) => i.due_date, (i) => {
      if (!i.due_date || i.paid_at) return 0;
      const bal = Number(i.balance_due ?? 0);
      if (bal <= 0) return 0;
      return differenceInDays(today, new Date(i.due_date)) > 0 ? bal : 0;
    });
    const arOutstanding = invoices.reduce((s, i) => s + (i.paid_at ? 0 : Number(i.balance_due ?? 0)), 0);
    const ar1 = arOverdueDaily.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const ar2 = arOverdueDaily.slice(15).reduce((s, d) => s + d.v, 0);
    const arTrend = ar1 > 0 ? Math.round(((ar2 - ar1) / ar1) * 100) : 0;

    // Customers per day
    const custBuckets = buildBuckets(customers, (c) => c.created_at, () => 1);
    const custTotal = custBuckets.reduce((s, d) => s + d.v, 0);
    const c1 = custBuckets.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const c2 = custBuckets.slice(15).reduce((s, d) => s + d.v, 0);
    const custTrend = c1 > 0 ? Math.round(((c2 - c1) / c1) * 100) : 0;

    // Quotes per day
    const qBuckets = buildBuckets(quotes, (q) => q.created_at, () => 1);
    const qTotal = qBuckets.reduce((s, d) => s + d.v, 0);
    const q1 = qBuckets.slice(0, 15).reduce((s, d) => s + d.v, 0);
    const q2 = qBuckets.slice(15).reduce((s, d) => s + d.v, 0);
    const qTrend = q1 > 0 ? Math.round(((q2 - q1) / q1) * 100) : 0;

    return [
      { key: 'rev', label: 'Revenue', value: `$${(revTotal / 1000).toFixed(1)}k`, series: revBuckets.map(d => ({ v: d.v })), trend: revTrend, color: 'hsl(142 71% 45%)', bgGradient: 'from-emerald-50 to-transparent dark:from-emerald-950/30', icon: DollarSign, link: '/finance/invoices' },
      { key: 'jobs', label: 'Jobs', value: `${jobTotal}`, series: jobBuckets.map(d => ({ v: d.v })), trend: jobTrend, color: 'hsl(217 91% 60%)', bgGradient: 'from-blue-50 to-transparent dark:from-blue-950/30', icon: Briefcase, link: '/jobs' },
      { key: 'hours', label: 'Hours', value: `${hourTotal.toFixed(0)}h`, subnote: pendingHours > 0 ? `${pendingHours.toFixed(0)}h awaiting approval` : undefined, series: hourBuckets.map(d => ({ v: d.v })), trend: hourTrend, color: 'hsl(280 65% 60%)', bgGradient: 'from-violet-50 to-transparent dark:from-violet-950/30', icon: Clock, link: '/finance/payroll' },
      { key: 'ar', label: 'AR Open', value: `$${(arOutstanding / 1000).toFixed(1)}k`, series: arOverdueDaily.map(d => ({ v: d.v })), trend: arTrend, color: 'hsl(0 72% 60%)', bgGradient: 'from-rose-50 to-transparent dark:from-rose-950/30', icon: AlertCircle, link: '/finance/invoices' },
      { key: 'cust', label: 'Customers', value: `${custTotal}`, series: custBuckets.map(d => ({ v: d.v })), trend: custTrend, color: 'hsl(195 85% 55%)', bgGradient: 'from-cyan-50 to-transparent dark:from-cyan-950/30', icon: Users, link: '/customers' },
      { key: 'quotes', label: 'Quotes', value: `${qTotal}`, series: qBuckets.map(d => ({ v: d.v })), trend: qTrend, color: 'hsl(38 92% 50%)', bgGradient: 'from-amber-50 to-transparent dark:from-amber-950/30', icon: FileText, link: '/quotes' },
    ];
  }, [invoices, jobs, quotes, customers, timesheets]);

  const loading = isLoading || loadTs || loadCust;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        : tiles.map(t => {
            const isUp = t.trend >= 0;
            const trendColor = t.key === 'ar'
              ? (isUp ? 'text-rose-600' : 'text-emerald-600') // AR up = bad
              : (isUp ? 'text-emerald-600' : 'text-rose-600');
            const TrendIcon = isUp ? TrendingUp : TrendingDown;
            const content = (
              <div className={cn(
                'rounded-xl border border-border/60 bg-gradient-to-b p-2.5 md:p-3 hover:shadow-md transition-all active:scale-[0.97] h-full',
                t.bgGradient
              )}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />
                  <span className={cn('text-[10px] font-extrabold tabular-nums flex items-center gap-0.5', trendColor)}>
                    <TrendIcon className="h-2.5 w-2.5" />
                    {Math.abs(t.trend)}%
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground leading-none">{t.label}</p>
                <p className="text-base md:text-lg font-extrabold tabular-nums leading-tight mt-0.5" style={{ color: t.color }}>
                  {t.value}
                </p>
                <div className="-mx-1 mt-1">
                  <Sparkline data={t.series} color={t.color} />
                </div>
              </div>
            );
            return t.link
              ? <Link key={t.key} to={t.link}>{content}</Link>
              : <div key={t.key}>{content}</div>;
          })
      }
    </div>
  );
}
