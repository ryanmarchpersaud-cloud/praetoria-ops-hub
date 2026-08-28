import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  invoices: any[];
  isLoading: boolean;
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function MonthComparisonPanel({ invoices, isLoading }: Props) {
  const now = new Date();
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidIn = (from: Date, to: Date) =>
    invoices
      .filter((i: any) => i.paid_at && new Date(i.paid_at) >= from && new Date(i.paid_at) < to)
      .reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);

  const thisMonth = paidIn(thisStart, new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const lastMonth = paidIn(lastStart, thisStart);
  const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
  const up = delta >= 0;

  // A/R aging buckets on unpaid balances
  const open = invoices.filter(
    (i: any) => !['Paid', 'Voided', 'Draft', 'Refunded'].includes(i.status) && Number(i.balance_due || 0) > 0
  );
  const buckets = [
    { label: '0–30 days', min: 0, max: 30, className: 'bg-emerald-500' },
    { label: '31–60 days', min: 31, max: 60, className: 'bg-amber-500' },
    { label: '60+ days', min: 61, max: Infinity, className: 'bg-rose-500' },
  ].map(b => {
    const rows = open.filter((i: any) => {
      const base = i.due_date || i.issue_date || i.created_at;
      if (!base) return false;
      const age = Math.floor((now.getTime() - new Date(base).getTime()) / 86_400_000);
      return age >= b.min && age <= b.max;
    });
    return { ...b, count: rows.length, total: rows.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0) };
  });
  const arTotal = buckets.reduce((s, b) => s + b.total, 0);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight">Revenue & Receivables</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">This month collected</p>
                <p className="text-2xl font-extrabold tabular-nums">{money(thisMonth)}</p>
                <p className={cn('text-[11px] font-semibold flex items-center gap-1', up ? 'text-emerald-600' : 'text-rose-600')}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(delta).toFixed(0)}% vs last month
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Last month collected</p>
                <p className="text-2xl font-extrabold tabular-nums text-muted-foreground">{money(lastMonth)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">A/R aging</p>
                <p className="text-xs font-bold tabular-nums">{money(arTotal)}</p>
              </div>
              {buckets.map(b => (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">{b.label} · {b.count}</span>
                    <span className="font-bold tabular-nums">{money(b.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', b.className)}
                      style={{ width: arTotal > 0 ? `${(b.total / arTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
