import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { subDays } from 'date-fns';

interface Invoice { total?: number | null; issue_date?: string | null; created_at?: string | null; jobs?: { service_category?: string | null } | null; job_id?: string | null }
interface Job { id: string; service_category?: string | null }

const COLORS = [
  'hsl(217 91% 60%)', // blue
  'hsl(142 71% 45%)', // green
  'hsl(38 92% 50%)',  // amber
  'hsl(280 65% 60%)', // violet
  'hsl(0 72% 60%)',   // rose
  'hsl(195 85% 55%)', // cyan
  'hsl(25 95% 55%)',  // orange
  'hsl(160 60% 45%)', // teal
];

export function ServiceMixDonut({ invoices, jobs, isLoading }: { invoices: Invoice[]; jobs: Job[]; isLoading?: boolean }) {
  const { slices, total } = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const jobCat = new Map<string, string>(jobs.map(j => [j.id, j.service_category ?? 'Other']));
    const tally = new Map<string, number>();
    for (const inv of invoices) {
      const dt = inv.issue_date ?? inv.created_at;
      if (!dt) continue;
      if (new Date(dt) < cutoff) continue;
      const cat = inv.jobs?.service_category || (inv.job_id ? jobCat.get(inv.job_id) : null) || 'Other';
      tally.set(cat, (tally.get(cat) ?? 0) + Number(inv.total ?? 0));
    }
    const arr = Array.from(tally.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const total = arr.reduce((s, r) => s + r.value, 0);
    return { slices: arr, total };
  }, [invoices, jobs]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 dark:bg-violet-950/30">
            <PieIcon className="h-4 w-4 text-violet-600" />
          </span>
          Service Mix · 30 Days
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : slices.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-8 text-center">No invoiced revenue in the last 30 days</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {slices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">Total</p>
                <p className="text-base font-extrabold tabular-nums">${(total / 1000).toFixed(1)}k</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-auto">
              {slices.map((s, i) => {
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                return (
                  <div key={s.name} className="flex items-center gap-1.5 text-[10px] md:text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate flex-1 font-medium">{s.name}</span>
                    <span className="tabular-nums font-extrabold text-foreground">{pct}%</span>
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
