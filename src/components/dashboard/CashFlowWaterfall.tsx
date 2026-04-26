import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Waves, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Invoice {
  amount_paid?: number | null;
  paid_at?: string | null;
  issue_date?: string | null;
  created_at?: string | null;
}

export function CashFlowWaterfall({
  invoices,
  isLoading,
}: {
  invoices: Invoice[];
  isLoading?: boolean;
}) {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const { data: expenses, isLoading: loadExp } = useQuery({
    queryKey: ['cashflow_expenses', monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('amount_total, expense_date, category, status')
        .gte('expense_date', monthStart.toISOString().slice(0, 10))
        .lte('expense_date', monthEnd.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bills, isLoading: loadBills } = useQuery({
    queryKey: ['cashflow_bills', monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_bills')
        .select('amount_paid, bill_date, status')
        .gte('bill_date', monthStart.toISOString().slice(0, 10))
        .lte('bill_date', monthEnd.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const steps = useMemo(() => {
    // Money IN — invoice payments collected this month
    const cashIn = invoices.reduce((sum, inv) => {
      if (!inv.paid_at) return sum;
      const d = new Date(inv.paid_at);
      if (d >= monthStart && d <= monthEnd) return sum + Number(inv.amount_paid ?? 0);
      return sum;
    }, 0);

    // Categorized expenses
    const expByGroup: Record<string, number> = {
      Payroll: 0,
      Materials: 0,
      Operations: 0,
      Other: 0,
    };
    for (const e of expenses ?? []) {
      const amt = Number(e.amount_total ?? 0);
      const cat = (e.category ?? '').toLowerCase();
      if (cat.includes('payroll') || cat.includes('wage') || cat.includes('labor')) {
        expByGroup.Payroll += amt;
      } else if (
        cat.includes('material') ||
        cat.includes('supply') ||
        cat.includes('equipment') ||
        cat.includes('fuel')
      ) {
        expByGroup.Materials += amt;
      } else if (
        cat.includes('rent') ||
        cat.includes('insurance') ||
        cat.includes('utility') ||
        cat.includes('software') ||
        cat.includes('vehicle') ||
        cat.includes('admin')
      ) {
        expByGroup.Operations += amt;
      } else {
        expByGroup.Other += amt;
      }
    }
    const billsPaid = (bills ?? []).reduce((s, b) => s + Number(b.amount_paid ?? 0), 0);
    expByGroup.Operations += billsPaid;

    const totalOut = Object.values(expByGroup).reduce((s, v) => s + v, 0);
    const net = cashIn - totalOut;

    // Build waterfall steps with running balance
    const arr: { label: string; value: number; type: 'in' | 'out' | 'net'; running: number }[] =
      [];
    let running = 0;

    arr.push({ label: 'Cash In', value: cashIn, type: 'in', running: cashIn });
    running = cashIn;

    for (const [label, value] of Object.entries(expByGroup)) {
      if (value <= 0) continue;
      arr.push({ label, value, type: 'out', running: running - value });
      running -= value;
    }

    arr.push({ label: 'Net', value: net, type: 'net', running: net });

    return { steps: arr, cashIn, totalOut, net };
  }, [invoices, expenses, bills, monthStart, monthEnd]);

  const loading = isLoading || loadExp || loadBills;
  const maxAbs = Math.max(
    steps.cashIn,
    steps.totalOut,
    Math.abs(steps.net),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30">
                <Waves className="h-4 w-4 text-emerald-600" />
              </span>
              Cash Flow · {format(new Date(), 'MMMM yyyy')}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 ml-10">
              Money in vs money out · Live month-to-date
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Net Position
            </p>
            <p
              className={cn(
                'text-2xl font-extrabold tabular-nums',
                steps.net >= 0 ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {steps.net >= 0 ? '+' : '−'}${Math.abs(steps.net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : steps.cashIn === 0 && steps.totalOut === 0 ? (
          <p className="text-[11px] text-muted-foreground py-12 text-center">
            No financial activity this month yet
          </p>
        ) : (
          <div className="space-y-2">
            {steps.steps.map((s, i) => {
              const widthPct = (Math.abs(s.value) / maxAbs) * 100;
              const isIn = s.type === 'in';
              const isOut = s.type === 'out';
              const isNet = s.type === 'net';
              const positive = s.value >= 0;
              const barColor = isIn
                ? 'bg-emerald-500'
                : isOut
                  ? 'bg-rose-500'
                  : positive
                    ? 'bg-blue-600'
                    : 'bg-rose-600';
              const Icon = isIn ? ArrowUpRight : isOut ? ArrowDownRight : null;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-bold">
                      {Icon && <Icon className={cn('h-3 w-3', isIn ? 'text-emerald-600' : 'text-rose-600')} />}
                      {isNet && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider',
                            positive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                          )}
                        >
                          NET
                        </span>
                      )}
                      <span className={cn(isNet && 'font-extrabold')}>{s.label}</span>
                    </span>
                    <span className="tabular-nums font-extrabold">
                      {isOut ? '−' : isIn ? '+' : positive ? '+' : '−'}$
                      {Math.abs(s.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden relative">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', barColor)}
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                    />
                  </div>
                  {!isNet && (
                    <p className="text-[10px] text-muted-foreground tabular-nums text-right">
                      Running: ${s.running.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
