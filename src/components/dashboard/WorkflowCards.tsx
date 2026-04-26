import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquarePlus, FileText, Briefcase, Receipt, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStat {
  label: string;
  count: number;
  total?: number;
}

interface WorkflowCardProps {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  link: string;
  stats: WorkflowStat[];
  isLoading: boolean;
}

function WorkflowCard({ title, icon: Icon, iconClass, link, stats, isLoading }: WorkflowCardProps) {
  return (
    <Link to={link}>
      <Card className="hover:shadow-md transition-all cursor-pointer active:scale-[0.98] h-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconClass)}>
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-base md:text-lg font-extrabold tracking-tight">{title}</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{s.label}</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {s.count}
                    {s.total !== undefined && (
                      <span className="text-muted-foreground ml-1 font-medium">
                        (${s.total.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface WorkflowCardsProps {
  requests: any[];
  quotes: any[];
  jobs: any[];
  invoices: any[];
  isLoading: boolean;
}

export function WorkflowCards({ requests, quotes, jobs, invoices, isLoading }: WorkflowCardsProps) {
  const reqNew = requests.filter(r => ['New', 'new', 'Open', 'open', 'Pending', 'pending'].includes(r.status)).length;
  const reqReview = requests.filter(r => ['In Review', 'in_review', 'In Progress', 'in_progress', 'Assessment Complete', 'assessment_complete'].includes(r.status)).length;

  const qApproved = quotes.filter(q => q.approval_status === 'Approved');
  const qDraft = quotes.filter(q => q.approval_status === 'Draft' || q.approval_status === 'Needs review');

  const jActive = jobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled');
  const jNeedsInvoice = jobs.filter(j => j.status === 'Completed');
  const jDraft = jobs.filter(j => j.status === 'Draft');

  const iAwaiting = invoices.filter((i: any) => i.status === 'Sent' || i.status === 'Viewed');
  const iDraft = invoices.filter((i: any) => i.status === 'Draft');
  const iPastDue = invoices.filter((i: any) => i.status === 'Overdue');
  const awaitingTotal = iAwaiting.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
  const pastDueTotal = iPastDue.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);

  // Payment KPIs
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const iPaidThisMonth = invoices.filter((i: any) => i.status === 'Paid' && i.paid_at && new Date(i.paid_at) >= monthStart);
  const paidThisMonthTotal = iPaidThisMonth.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
  const iOutstanding = invoices.filter((i: any) => !['Paid', 'Voided', 'Draft', 'Refunded'].includes(i.status));
  const outstandingTotal = iOutstanding.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <WorkflowCard
        title="Requests"
        icon={MessageSquarePlus}
        iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        link="/requests"
        isLoading={isLoading}
        stats={[
          { label: 'New', count: reqNew },
          { label: 'In Review', count: reqReview },
        ]}
      />
      <WorkflowCard
        title="Quotes"
        icon={FileText}
        iconClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        link="/quotes"
        isLoading={isLoading}
        stats={[
          { label: 'Approved', count: qApproved.length, total: qApproved.reduce((s, q) => s + Number(q.total || 0), 0) },
          { label: 'Draft / Review', count: qDraft.length },
        ]}
      />
      <WorkflowCard
        title="Jobs"
        icon={Briefcase}
        iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        link="/jobs"
        isLoading={isLoading}
        stats={[
          { label: 'Active', count: jActive.length },
          { label: 'Requires Invoicing', count: jNeedsInvoice.length },
          { label: 'Draft', count: jDraft.length },
        ]}
      />
      <WorkflowCard
        title="Invoices"
        icon={Receipt}
        iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
        link="/invoices"
        isLoading={isLoading}
        stats={[
          { label: 'Awaiting Payment', count: iAwaiting.length, total: awaitingTotal },
          { label: 'Past Due', count: iPastDue.length, total: pastDueTotal },
          { label: 'Draft', count: iDraft.length },
        ]}
      />
      <WorkflowCard
        title="Payments"
        icon={DollarSign}
        iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        link="/finance/invoices"
        isLoading={isLoading}
        stats={[
          { label: 'Paid This Month', count: iPaidThisMonth.length, total: paidThisMonthTotal },
          { label: 'Overdue', count: iPastDue.length, total: pastDueTotal },
          { label: 'Outstanding A/R', count: iOutstanding.length, total: outstandingTotal },
        ]}
      />
    </div>
  );
}
