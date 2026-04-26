import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

interface Invoice {
  total?: number | null;
  amount_paid?: number | null;
  issue_date?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export function RevenueTrendChart({ invoices, isLoading }: { invoices: Invoice[]; isLoading?: boolean }) {
  const data = useMemo(() => {
    const days: { date: string; label: string; invoiced: number; collected: number }[] = [];
    const today = startOfDay(new Date());
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      days.push({ date: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d'), invoiced: 0, collected: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const inv of invoices) {
      const issueKey = inv.issue_date ? format(new Date(inv.issue_date), 'yyyy-MM-dd') : (inv.created_at ? format(new Date(inv.created_at), 'yyyy-MM-dd') : null);
      if (issueKey && idx.has(issueKey)) days[idx.get(issueKey)!].invoiced += Number(inv.total ?? 0);
      const paidKey = inv.paid_at ? format(new Date(inv.paid_at), 'yyyy-MM-dd') : null;
      if (paidKey && idx.has(paidKey)) days[idx.get(paidKey)!].collected += Number(inv.amount_paid ?? inv.total ?? 0);
    }
    return days;
  }, [invoices]);

  const totalInvoiced = data.reduce((s, d) => s + d.invoiced, 0);
  const totalCollected = data.reduce((s, d) => s + d.collected, 0);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </span>
            Revenue Trend · 30 Days
          </CardTitle>
          <div className="flex gap-3 text-[11px] md:text-xs">
            <div className="text-right">
              <p className="text-muted-foreground font-semibold uppercase tracking-wide">Invoiced</p>
              <p className="font-extrabold tabular-nums text-foreground">${totalInvoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground font-semibold uppercase tracking-wide">Collected</p>
              <p className="font-extrabold tabular-nums text-emerald-600">${totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="h-48 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 70% 45%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="invoiced" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#invGrad)" name="Invoiced" />
                <Area type="monotone" dataKey="collected" stroke="hsl(142 70% 45%)" strokeWidth={2} fill="url(#colGrad)" name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
