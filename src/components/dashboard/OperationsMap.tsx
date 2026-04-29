import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Briefcase, Users, Clock, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface OperationsMapProps {
  visits: any[];
  jobs: any[];
  employees: any[];
  requests: any[];
  isLoading: boolean;
}

export function OperationsMap({ visits, jobs, employees, requests, isLoading }: OperationsMapProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const metrics = useMemo(() => {
    const scheduled = visits.filter(v => v.visit_status === 'Scheduled');
    const inProgress = visits.filter(v => v.visit_status === 'In Progress');
    const completed = visits.filter(v => v.visit_status === 'Completed');
    const activeJobs = jobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled');
    const unassignedJobs = jobs.filter(j => !j.assigned_to && j.status !== 'Completed' && j.status !== 'Cancelled');
    const needsInvoicing = jobs.filter(j => j.status === 'Completed');
    const openRequests = requests.filter(r =>
      ['New', 'new', 'Open', 'open', 'Pending', 'pending'].includes(r.status)
    );

    return {
      scheduled: scheduled.length,
      inProgress: inProgress.length,
      completed: completed.length,
      activeJobs: activeJobs.length,
      unassigned: unassignedJobs.length,
      needsInvoicing: needsInvoicing.length,
      openRequests: openRequests.length,
      crewOnDuty: employees.filter(e => e.employment_status === 'Active' || e.employment_status === 'active').length,
    };
  }, [visits, jobs, employees, requests]);

  const tiles = [
    { label: "Today's Visits", value: visits.length, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', link: '/visits' },
    { label: 'In Progress', value: metrics.inProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', link: '/visits' },
    { label: 'Completed', value: metrics.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', link: '/visits' },
    { label: 'Active Jobs', value: metrics.activeJobs, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5', link: '/jobs' },
    { label: 'Unassigned', value: metrics.unassigned, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', link: '/jobs', alert: metrics.unassigned > 0 },
    { label: 'Open Requests', value: metrics.openRequests, icon: MapPin, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', link: '/requests', alert: metrics.openRequests > 0 },
    { label: 'Needs Invoicing', value: metrics.needsInvoicing, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', link: '/invoices' },
    { label: 'Crew On Duty', value: metrics.crewOnDuty, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30', link: '/employees' },
  ];

  // Build visit list for the dispatch feed
  const visitFeed = visits.slice(0, 6);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </span>
            Operations Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </span>
            Operations Control
          </CardTitle>
          <Link to="/schedule" className="text-[10px] md:text-xs text-primary flex items-center gap-0.5 hover:underline">
            Dispatch <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-5 space-y-3">
        {/* Metric tiles */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          {tiles.map(t => (
            <Link
              key={t.label}
              to={t.link}
              className={cn(
                'rounded-lg p-2 md:p-3 transition-all hover:shadow-sm active:scale-[0.97] border border-border/50',
                t.bg,
                t.alert && 'ring-1 ring-rose-300/50 dark:ring-rose-700/50'
              )}
            >
              <t.icon className={cn('h-3 w-3 md:h-3.5 md:w-3.5 mb-1', t.color)} />
              <p className="text-base md:text-lg font-bold leading-none text-foreground">{t.value}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.label}</p>
            </Link>
          ))}
        </div>

        {/* Live visit feed */}
        {visitFeed.length > 0 && (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
              <p className="text-[11px] font-semibold text-foreground">Today's Dispatch — {format(new Date(), 'EEEE, MMM d')}</p>
            </div>
            <div className="divide-y divide-border/50">
              {visitFeed.map((v: any) => (
                <Link
                  key={v.id}
                  to={`/visits/${v.id}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    v.visit_status === 'Completed' && 'bg-emerald-500',
                    v.visit_status === 'In Progress' && 'bg-amber-500 animate-pulse',
                    v.visit_status === 'Scheduled' && 'bg-blue-400',
                    !['Completed', 'In Progress', 'Scheduled'].includes(v.visit_status) && 'bg-muted-foreground'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {v.jobs?.job_title || v.visit_number || 'Visit'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {v.customers?.first_name} {v.customers?.last_name}
                      {v.properties?.property_name && ` · ${v.properties.property_name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-medium text-foreground">
                      {v.scheduled_start_time ? format(new Date(`2000-01-01T${v.scheduled_start_time}`), 'h:mm a') : '—'}
                    </p>
                    <p className={cn(
                      'text-[9px] font-semibold',
                      v.visit_status === 'Completed' && 'text-emerald-600',
                      v.visit_status === 'In Progress' && 'text-amber-600',
                      v.visit_status === 'Scheduled' && 'text-blue-600',
                    )}>
                      {v.visit_status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {visits.length > 6 && (
              <Link to="/visits" className="block text-center text-[10px] text-primary py-1.5 border-t border-border/50 hover:bg-muted/20">
                +{visits.length - 6} more visits →
              </Link>
            )}
          </div>
        )}

        {visitFeed.length === 0 && (
          <div className="border border-border/50 rounded-lg p-6 text-center">
            <MapPin className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No visits scheduled for today</p>
            <Link to="/schedule-new-visits" className="text-[11px] text-primary hover:underline mt-1 inline-block">
              Schedule visits →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
