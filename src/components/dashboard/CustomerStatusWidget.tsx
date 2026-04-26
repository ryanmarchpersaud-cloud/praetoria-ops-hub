import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, PauseCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Row = { customer_status: string | null };

export function CustomerStatusWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'customer-status-30d'],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from('customers')
        .select('customer_status')
        .gte('updated_at', since.toISOString());
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const tally = { Active: 0, Paused: 0, Lost: 0 };
      for (const r of rows) {
        const s = (r.customer_status || 'Active') as keyof typeof tally;
        if (s in tally) tally[s] += 1;
      }
      return { ...tally, total: rows.length };
    },
    staleTime: 60_000,
  });

  const items = [
    { label: 'Active', value: data?.Active ?? 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40' },
    { label: 'Paused', value: data?.Paused ?? 0, icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40' },
    { label: 'Lost', value: data?.Lost ?? 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40' },
  ];

  const total = data?.total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-950/40">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </span>
          Customer Status
        </CardTitle>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last 30 days</span>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] text-muted-foreground">Total updated</p>
          <p className="text-lg font-bold leading-none">{isLoading ? '—' : total}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map(i => (
            <Link
              key={i.label}
              to={`/customers?status=${i.label}`}
              className={`rounded-lg border p-2.5 transition-all hover:shadow-sm active:scale-[0.97] ${i.bg}`}
            >
              <i.icon className={`h-3.5 w-3.5 ${i.color} mb-1`} />
              <p className="text-xl font-bold leading-none text-foreground">
                {isLoading ? '—' : i.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {i.label} · {isLoading ? '—' : `${pct(i.value)}%`}
              </p>
            </Link>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Counts customers updated in the last 30 days.
        </p>
      </CardContent>
    </Card>
  );
}
