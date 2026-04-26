import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  status?: string | null;
  total?: number | null;
  balance_due?: number | null;
  due_date?: string | null;
  paid_at?: string | null;
}

export function ARAgingPanel({ invoices, isLoading }: { invoices: Invoice[]; isLoading?: boolean }) {
  const buckets = useMemo(() => {
    const b = { current: 0, d30: 0, d60: 0, d90: 0, total: 0, count: 0 };
    const today = new Date();
    for (const inv of invoices) {
      const balance = Number(inv.balance_due ?? 0);
      if (balance <= 0 || inv.paid_at) continue;
      b.total += balance;
      b.count += 1;
      if (!inv.due_date) { b.current += balance; continue; }
      const days = differenceInDays(today, new Date(inv.due_date));
      if (days <= 0) b.current += balance;
      else if (days <= 30) b.d30 += balance;
      else if (days <= 60) b.d60 += balance;
      else b.d90 += balance;
    }
    return b;
  }, [invoices]);

  const rows = [
    { key: 'current', label: 'Current', value: buckets.current, color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' },
    { key: 'd30', label: '1–30 days', value: buckets.d30, color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' },
    { key: 'd60', label: '31–60 days', value: buckets.d60, color: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50' },
    { key: 'd90', label: '60+ days', value: buckets.d90, color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' },
  ];

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/30">
              <DollarSign className="h-4 w-4 text-rose-600" />
            </span>
            AR Aging
          </CardTitle>
          <Link to="/finance/invoices" className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-2">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Outstanding</p>
                <p className="text-2xl md:text-3xl font-extrabold tabular-nums text-foreground">{fmt(buckets.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Invoices</p>
                <p className="text-2xl md:text-3xl font-extrabold tabular-nums text-foreground">{buckets.count}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {rows.map(r => (
                <div key={r.key} className={cn('rounded-lg border p-2.5', r.color)}>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{r.label}</p>
                  <p className="text-lg md:text-xl font-extrabold tabular-nums">{fmt(r.value)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
