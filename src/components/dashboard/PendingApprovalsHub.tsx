import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock, FileText, Receipt, Wallet, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

function usePendingApprovals() {
  return useQuery({
    queryKey: ['dashboard_pending_approvals'],
    queryFn: async () => {
      const [timesheets, subInvoices, expenses, draftQuotes] = await Promise.all([
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('subcontractor_invoices').select('id, amount', { count: 'exact' }).eq('status', 'submitted'),
        supabase.from('worker_expense_claims').select('id, amount', { count: 'exact' }).neq('status', 'reimbursed').neq('status', 'rejected'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).in('approval_status', ['Draft', 'Needs review']),
      ]);

      const subTotal = (subInvoices.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const expTotal = (expenses.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

      return {
        timesheets: timesheets.count ?? 0,
        subInvoices: subInvoices.count ?? 0,
        subInvoicesTotal: subTotal,
        expenses: expenses.count ?? 0,
        expensesTotal: expTotal,
        quotes: draftQuotes.count ?? 0,
      };
    },
  });
}

export function PendingApprovalsHub() {
  const { data, isLoading } = usePendingApprovals();

  const items = [
    {
      key: 'timesheets',
      label: 'Timesheets',
      count: data?.timesheets ?? 0,
      sub: 'Awaiting approval',
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50',
      link: '/hr/timesheets',
    },
    {
      key: 'subInvoices',
      label: 'Sub Invoices',
      count: data?.subInvoices ?? 0,
      sub: data?.subInvoicesTotal ? `$${data.subInvoicesTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Submitted',
      icon: Receipt,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50',
      link: '/subcontractors/invoices',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      count: data?.expenses ?? 0,
      sub: data?.expensesTotal ? `$${data.expensesTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Open claims',
      icon: Wallet,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
      link: '/finance/expenses',
    },
    {
      key: 'quotes',
      label: 'Quotes',
      count: data?.quotes ?? 0,
      sub: 'Need review',
      icon: FileText,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50',
      link: '/quotes',
    },
  ];

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/30 relative">
              <CheckSquare className="h-4 w-4 text-amber-600" />
              {total > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {total}
                </span>
              )}
            </span>
            Needs Approval
          </CardTitle>
          {total > 0 && (
            <span className="text-[10px] uppercase tracking-wide font-bold text-rose-600">
              {total} waiting
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map(item => (
              <Link
                key={item.key}
                to={item.link}
                className={cn(
                  'rounded-lg border p-2.5 transition-all active:scale-[0.97] hover:shadow-sm flex items-start gap-2',
                  item.bg
                )}
              >
                <item.icon className={cn('h-4 w-4 mt-0.5 shrink-0', item.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">{item.label}</p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  <p className={cn('text-xl md:text-2xl font-extrabold tabular-nums leading-none', item.count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                    {item.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium truncate">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
