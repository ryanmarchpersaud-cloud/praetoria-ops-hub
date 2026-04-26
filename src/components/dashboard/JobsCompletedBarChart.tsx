import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

function useCompletedVisits7d() {
  const start = format(subDays(startOfDay(new Date()), 6), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard_completed_visits_7d', start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, service_date, visit_status')
        .eq('visit_status', 'Completed')
        .gte('service_date', start);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function JobsCompletedBarChart() {
  const { data: visits = [], isLoading } = useCompletedVisits7d();

  const data = useMemo(() => {
    const days: { key: string; label: string; count: number; isToday: boolean }[] = [];
    const today = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      days.push({
        key: format(d, 'yyyy-MM-dd'),
        label: i === 0 ? 'Today' : format(d, 'EEE'),
        count: 0,
        isToday: i === 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const v of visits) {
      if (!v.service_date) continue;
      const k = v.service_date.slice(0, 10);
      if (idx.has(k)) days[idx.get(k)!].count += 1;
    }
    return days;
  }, [visits]);

  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total / 7;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </span>
            Visits Completed · 7 Days
          </CardTitle>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">Total / Avg</p>
            <p className="text-sm font-extrabold tabular-nums"><span className="text-foreground">{total}</span> <span className="text-muted-foreground font-semibold">/ {avg.toFixed(1)}</span></p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="h-40 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  formatter={(v: number) => [`${v} visits`, 'Completed']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? 'hsl(var(--primary))' : 'hsl(142 71% 45%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
