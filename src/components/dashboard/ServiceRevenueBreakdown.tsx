import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { subDays } from 'date-fns';
import { SERVICE_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Brand color per service (matches QuotePrint footer + memory: project/service-categories-master)
const SERVICE_COLORS: Record<string, string> = {
  'Snow & Ice': '#2563EB',
  'Maintenance & Repairs': '#DC2626',
  'Property Care & Landscaping': '#F97316',
  'Property Management': '#16A34A',
  'Electrical': '#7C3AED',
  'Plumbing': '#0D9488',
  'Carpentry & Renovations': '#92400E',
  'Roofing & Exteriors': '#374151',
  'Painting & Finishing': '#EAB308',
  'Cleaning Services': '#0EA5E9',
  'Heating, Ventilation & Air Conditioning': '#F43F5E',
  'Concrete & Masonry': '#6B7280',
  'Security & Smart Home': '#111827',
  'Fencing & Decking': '#7c2d12',
  'Junk Removal': '#c2410c',
  'Power Washing': '#0891B2',
  'Tiling & Flooring': '#A16207',
  'Gutter Cleaning & Repair': '#65A30D',
  'Window Cleaning': '#0284C7',
  'Pest Control': '#854D0E',
  'Moving & Hauling': '#9333EA',
  'Insulation & Drywall': '#B91C1C',
  'Appliance Install & Repair': '#0F766E',
  'Garage Doors': '#475569',
  'Locksmith Services': '#1E40AF',
  'Other': '#94A3B8',
};

interface Invoice {
  total?: number | null;
  issue_date?: string | null;
  created_at?: string | null;
  job_id?: string | null;
  jobs?: { service_category?: string | null } | null;
}
interface Job { id: string; service_category?: string | null }

type RangeKey = '30' | '90' | '365' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '30', label: '30D', days: 30 },
  { key: '90', label: '90D', days: 90 },
  { key: '365', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: null },
];

export function ServiceRevenueBreakdown({
  invoices,
  jobs,
  isLoading,
}: {
  invoices: Invoice[];
  jobs: Job[];
  isLoading?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('90');

  const { rows, total, activeCount } = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)!;
    const cutoff = cfg.days ? subDays(new Date(), cfg.days) : null;
    const prevCutoffStart = cfg.days ? subDays(new Date(), cfg.days * 2) : null;

    const jobCat = new Map<string, string>(
      jobs.map(j => [j.id, j.service_category ?? 'Other']),
    );

    const tally = new Map<string, { revenue: number; jobs: Set<string>; prev: number }>();
    for (const cat of SERVICE_CATEGORIES) {
      tally.set(cat, { revenue: 0, jobs: new Set(), prev: 0 });
    }

    for (const inv of invoices) {
      const dt = inv.issue_date ?? inv.created_at;
      if (!dt) continue;
      const d = new Date(dt);
      const cat =
        inv.jobs?.service_category ||
        (inv.job_id ? jobCat.get(inv.job_id) : null) ||
        'Other';
      const bucket = tally.get(cat) ?? tally.get('Other')!;
      const amt = Number(inv.total ?? 0);

      if (!cutoff || d >= cutoff) {
        bucket.revenue += amt;
        if (inv.job_id) bucket.jobs.add(inv.job_id);
      } else if (prevCutoffStart && d >= prevCutoffStart && d < cutoff) {
        bucket.prev += amt;
      }
    }

    const arr = Array.from(tally.entries())
      .map(([name, v]) => {
        const trend =
          v.prev > 0 ? ((v.revenue - v.prev) / v.prev) * 100 : v.revenue > 0 ? 100 : 0;
        return {
          name,
          revenue: Math.round(v.revenue),
          jobs: v.jobs.size,
          trend: Math.round(trend),
          color: SERVICE_COLORS[name] ?? '#94A3B8',
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const total = arr.reduce((s, r) => s + r.revenue, 0);
    const activeCount = arr.filter(r => r.revenue > 0).length;
    return { rows: arr, total, activeCount };
  }, [invoices, jobs, range]);

  const top = rows.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/30">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </span>
              Service Revenue Breakdown
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 ml-10">
              {activeCount} of 25 services billing · ${(total / 1000).toFixed(1)}k total
            </p>
          </div>
          <div className="flex gap-1 bg-muted/40 rounded-md p-0.5">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded transition-colors',
                  range === r.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : total === 0 ? (
          <p className="text-[11px] text-muted-foreground py-12 text-center">
            No invoiced revenue in this period
          </p>
        ) : (
          <>
            {/* Top 10 bar chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top}
                  layout="vertical"
                  margin={{ top: 4, right: 50, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 20) + '…' : v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, _n, p: any) => {
                      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                      return [
                        `$${v.toLocaleString()} · ${pct}% · ${p.payload.jobs} jobs`,
                        'Revenue',
                      ];
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18}>
                    {top.map((r, i) => (
                      <Cell key={i} fill={r.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Full 25-service detail table */}
            <div className="border-t pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                All 25 Services · Sorted by revenue
              </p>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
                {rows.map(r => {
                  const pct = total > 0 ? (r.revenue / total) * 100 : 0;
                  const TrendIcon =
                    r.trend > 5 ? TrendingUp : r.trend < -5 ? TrendingDown : Minus;
                  const trendColor =
                    r.trend > 5
                      ? 'text-emerald-600'
                      : r.trend < -5
                        ? 'text-rose-600'
                        : 'text-muted-foreground';
                  return (
                    <div
                      key={r.name}
                      className="grid grid-cols-[1fr_auto] gap-2 items-center py-1 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ background: r.color }}
                          />
                          <span className="text-[11px] font-semibold truncate">{r.name}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {r.jobs} {r.jobs === 1 ? 'job' : 'jobs'}
                          </span>
                        </div>
                        <div className="ml-4 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, r.revenue > 0 ? 1 : 0)}%`,
                              background: r.color,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'flex items-center gap-0.5 text-[10px] font-bold tabular-nums',
                            trendColor,
                          )}
                        >
                          <TrendIcon className="h-3 w-3" />
                          {r.revenue > 0 && r.trend !== 0 ? `${Math.abs(r.trend)}%` : '—'}
                        </span>
                        <span className="text-[11px] font-extrabold tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-extrabold tabular-nums w-16 text-right">
                          ${(r.revenue / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
