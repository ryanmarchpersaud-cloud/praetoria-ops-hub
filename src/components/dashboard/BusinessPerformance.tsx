import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Briefcase, CreditCard, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  invoices: any[];
  jobs: any[];
  isLoading: boolean;
}

export function BusinessPerformance({ invoices, jobs, isLoading }: Props) {
  // Receivables: all unpaid invoice balances
  const unpaid = invoices.filter((i: any) => !['Paid', 'Voided', 'Draft'].includes(i.status));
  const totalReceivables = unpaid.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
  const customersOwing = new Set(unpaid.map((i: any) => i.customers?.company_name || `${i.customers?.first_name} ${i.customers?.last_name}`)).size;

  // Revenue this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = invoices.filter((i: any) => i.status === 'Paid' && i.paid_at && new Date(i.paid_at) >= thisMonthStart);
  const revenueThisMonth = paidThisMonth.reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  // Upcoming jobs this week
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const upcomingJobs = jobs.filter(j =>
    j.scheduled_date &&
    new Date(j.scheduled_date) >= now &&
    new Date(j.scheduled_date) <= weekEnd &&
    ['Scheduled', 'In Progress'].includes(j.status)
  );

  // Recently paid
  const recentPaid = invoices.filter((i: any) => i.status === 'Paid' && i.paid_at);
  const collectedTotal = recentPaid.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);

  const widgets = [
    {
      title: 'Receivables',
      value: `$${totalReceivables.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      detail: `${customersOwing} customer${customersOwing !== 1 ? 's' : ''} owing`,
      icon: DollarSign,
      iconClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      link: '/invoices?status=Overdue',
    },
    {
      title: 'Revenue This Month',
      value: `$${revenueThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      detail: `${paidThisMonth.length} invoice${paidThisMonth.length !== 1 ? 's' : ''} collected`,
      icon: TrendingUp,
      iconClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
      link: '/invoices?status=Paid',
    },
    {
      title: 'Upcoming Jobs',
      value: String(upcomingJobs.length),
      detail: 'Next 7 days',
      icon: Briefcase,
      iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/jobs?status=Scheduled',
    },
    {
      title: 'Total Collected',
      value: `$${collectedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      detail: `${recentPaid.length} paid invoice${recentPaid.length !== 1 ? 's' : ''}`,
      icon: CreditCard,
      iconClass: 'text-primary bg-primary/10',
      link: '/invoices?status=Paid',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </span>
          Business Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          widgets.map(w => (
            <Link key={w.title} to={w.link} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
              <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', w.iconClass)}>
                <w.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{w.title}</p>
                <p className="text-sm font-bold">{w.value}</p>
                <p className="text-[10px] text-muted-foreground">{w.detail}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
