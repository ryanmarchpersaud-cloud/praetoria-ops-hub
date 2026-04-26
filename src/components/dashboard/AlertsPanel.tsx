import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Receipt, Briefcase, ShieldAlert, Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertItem {
  id: string;
  label: string;
  detail: string;
  icon: React.ElementType;
  iconClass: string;
  link: string;
}

interface Props {
  invoices: any[];
  jobs: any[];
  visits: any[];
  incidents: any[];
  certifications: any[];
  subcontractorInvoices?: any[];
  isLoading: boolean;
}

export function AlertsPanel({ invoices, jobs, visits, incidents, certifications, subcontractorInvoices = [], isLoading }: Props) {
  const alerts: AlertItem[] = [];

  // Past due invoices
  const pastDue = invoices.filter((i: any) => i.status === 'Overdue');
  if (pastDue.length > 0) {
    const total = pastDue.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
    alerts.push({
      id: 'past-due-invoices',
      label: `${pastDue.length} past due invoice${pastDue.length > 1 ? 's' : ''}`,
      detail: `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} outstanding`,
      icon: Receipt,
      iconClass: 'text-destructive bg-destructive/10',
      link: '/invoices?status=Overdue',
    });
  }

  // Unassigned jobs
  const unassigned = jobs.filter(j => !j.assigned_to && ['Draft', 'Scheduled'].includes(j.status));
  if (unassigned.length > 0) {
    alerts.push({
      id: 'unassigned-jobs',
      label: `${unassigned.length} unassigned job${unassigned.length > 1 ? 's' : ''}`,
      detail: 'Need crew assignment',
      icon: Briefcase,
      iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/jobs?status=Draft',
    });
  }

  // Overdue visits
  const overdueVisits = visits.filter(v => v.visit_status === 'Missed');
  if (overdueVisits.length > 0) {
    alerts.push({
      id: 'overdue-visits',
      label: `${overdueVisits.length} missed visit${overdueVisits.length > 1 ? 's' : ''}`,
      detail: 'Require follow-up',
      icon: AlertTriangle,
      iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/visits',
    });
  }

  // Incidents needing review
  if (incidents.length > 0) {
    alerts.push({
      id: 'open-incidents',
      label: `${incidents.length} incident${incidents.length > 1 ? 's' : ''} open`,
      detail: 'Awaiting review',
      icon: ShieldAlert,
      iconClass: 'text-destructive bg-destructive/10',
      link: '/incidents',
    });
  }

  // Expiring certifications
  if (certifications.length > 0) {
    alerts.push({
      id: 'expiring-certs',
      label: `${certifications.length} expiring certification${certifications.length > 1 ? 's' : ''}`,
      detail: 'Within 30 days',
      icon: Award,
      iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/employees',
    });
  }

  // Subcontractor invoices needing review
  const pendingSubInv = subcontractorInvoices.filter((i: any) => i.status === 'submitted');
  if (pendingSubInv.length > 0) {
    const total = pendingSubInv.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    alerts.push({
      id: 'pending-sub-invoices',
      label: `${pendingSubInv.length} subcontractor invoice${pendingSubInv.length > 1 ? 's' : ''} to review`,
      detail: `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending approval`,
      icon: Receipt,
      iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/subcontractors/invoices',
    });
  }

  // Jobs requiring invoicing
  const needsInvoice = jobs.filter(j => j.status === 'Completed');
  if (needsInvoice.length > 0) {
    alerts.push({
      id: 'needs-invoicing',
      label: `${needsInvoice.length} job${needsInvoice.length > 1 ? 's' : ''} need invoicing`,
      detail: 'Completed, not yet billed',
      icon: Receipt,
      iconClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
      link: '/jobs?status=Completed',
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/15">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </span>
          Alerts
          {!isLoading && alerts.length > 0 && (
            <span className="ml-auto text-[11px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">All clear — no alerts</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map(a => (
              <Link key={a.id} to={a.link} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', a.iconClass)}>
                  <a.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground">{a.detail}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
