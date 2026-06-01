import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfDay } from 'date-fns';

interface PerformerRow {
  user_id: string;
  full_name: string;
  hours: number;
  visits: number;
  revenue: number;
}

function useTopPerformers() {
  return useQuery({
    queryKey: ['dashboard_top_performers'],
    queryFn: async (): Promise<PerformerRow[]> => {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const end = endOfDay(new Date());

      const [tsRes, visitsRes, profilesRes] = await Promise.all([
        supabase
          .from('timesheets')
          .select('user_id, clock_in, clock_out, status')
          .eq('status', 'approved')
          .not('clock_out', 'is', null)
          .gte('clock_in', start.toISOString())
          .lte('clock_in', end.toISOString()),
        supabase
          .from('visits')
          .select('id, assigned_worker_id, job_id, visit_status, service_date')
          .eq('visit_status', 'Completed')
          .gte('service_date', start.toISOString().slice(0, 10))
          .lte('service_date', end.toISOString().slice(0, 10)),
        supabase.from('worker_profiles').select('user_id, full_name'),
      ]);

      if (tsRes.error) throw tsRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      // Pull invoice totals for jobs visited, and count ALL visits per job so we
      // can apportion revenue per visit. Monthly/recurring jobs bill once but
      // generate many visits — attributing the full invoice to every visit
      // massively inflates the per-worker revenue number.
      const jobIds = Array.from(new Set((visitsRes.data ?? []).map(v => v.job_id).filter(Boolean))) as string[];
      const jobRevenue = new Map<string, number>();
      const jobVisitCount = new Map<string, number>();
      if (jobIds.length > 0) {
        const [{ data: invs }, { data: allVisits }] = await Promise.all([
          supabase.from('invoices').select('job_id, total').in('job_id', jobIds),
          supabase.from('visits').select('job_id').in('job_id', jobIds),
        ]);
        for (const inv of invs ?? []) {
          if (!inv.job_id) continue;
          jobRevenue.set(inv.job_id, (jobRevenue.get(inv.job_id) ?? 0) + Number(inv.total ?? 0));
        }
        for (const v of allVisits ?? []) {
          if (!v.job_id) continue;
          jobVisitCount.set(v.job_id, (jobVisitCount.get(v.job_id) ?? 0) + 1);
        }
      }

      // Name lookup: worker_profiles first, team_members as fallback so people
      // who aren't fully onboarded as worker_profiles don't show as "Unknown".
      const userIds = new Set<string>();
      for (const t of tsRes.data ?? []) if (t.user_id) userIds.add(t.user_id);
      for (const v of visitsRes.data ?? []) if (v.assigned_worker_id) userIds.add(v.assigned_worker_id);
      const nameOf = new Map<string, string>(
        ((profilesRes.data ?? [])
          .map((p: any) => [p.user_id, p.full_name])
          .filter(([, n]: any) => !!n)) as [string, string][]
      );
      const missing = Array.from(userIds).filter(id => !nameOf.has(id));
      if (missing.length > 0) {
        const { data: tm } = await supabase
          .from('team_members')
          .select('user_id, full_name')
          .in('user_id', missing);
        for (const r of tm ?? []) {
          if (r.user_id && r.full_name && !nameOf.has(r.user_id)) nameOf.set(r.user_id, r.full_name);
        }
      }

      const map = new Map<string, PerformerRow>();

      for (const t of tsRes.data ?? []) {
        if (!t.user_id || !t.clock_out) continue;
        const hrs = (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000;
        const row = map.get(t.user_id) ?? { user_id: t.user_id, full_name: nameOf.get(t.user_id) ?? 'Unknown', hours: 0, visits: 0, revenue: 0 };
        row.hours += hrs;
        map.set(t.user_id, row);
      }

      for (const v of visitsRes.data ?? []) {
        if (!v.assigned_worker_id) continue;
        const row = map.get(v.assigned_worker_id) ?? { user_id: v.assigned_worker_id, full_name: nameOf.get(v.assigned_worker_id) ?? 'Unknown', hours: 0, visits: 0, revenue: 0 };
        row.visits += 1;
        if (v.job_id) {
          const total = jobRevenue.get(v.job_id) ?? 0;
          const count = jobVisitCount.get(v.job_id) ?? 1;
          // Apportion job's invoiced revenue across all of its visits so a
          // monthly contract isn't counted as $X per visit.
          row.revenue += total / count;
        }
        map.set(v.assigned_worker_id, row);
      }

      return Array.from(map.values())
        .sort((a, b) => (b.hours + b.visits * 2) - (a.hours + a.visits * 2))
        .slice(0, 5);
    },
  });
}

const medalStyle = (rank: number) => {
  if (rank === 0) return { emoji: '🥇', ring: 'ring-2 ring-amber-400', bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-amber-300 dark:border-amber-800' };
  if (rank === 1) return { emoji: '🥈', ring: 'ring-1 ring-slate-300', bg: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' };
  if (rank === 2) return { emoji: '🥉', ring: 'ring-1 ring-orange-300', bg: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50' };
  return { emoji: `${rank + 1}`, ring: '', bg: 'bg-card border-border/60' };
};

export function TopPerformersLeaderboard() {
  const { data: performers = [], isLoading } = useTopPerformers();
  const maxHours = Math.max(...performers.map(p => p.hours), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/30">
              <Trophy className="h-4 w-4 text-amber-600" />
            </span>
            Top Performers · This Week
          </CardTitle>
          <Link to="/employees" className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : performers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-4 text-center">No approved timesheets this week yet</p>
        ) : (
          <div className="space-y-2">
            {performers.map((p, i) => {
              const m = medalStyle(i);
              const widthPct = Math.max((p.hours / maxHours) * 100, 5);
              return (
                <div key={p.user_id} className={cn('rounded-lg border p-2.5 transition-all', m.bg, m.ring)}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base font-extrabold w-6 text-center shrink-0">{m.emoji}</span>
                    <p className="text-xs md:text-sm font-bold truncate flex-1">{p.full_name}</p>
                    <div className="flex gap-3 text-[10px] md:text-[11px] tabular-nums shrink-0">
                      <span className="text-muted-foreground">
                        <span className="font-extrabold text-foreground">{p.hours.toFixed(1)}</span>h
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-extrabold text-foreground">{p.visits}</span> visits
                      </span>
                      {p.revenue > 0 && (
                        <span className="font-extrabold text-emerald-600">
                          ${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
