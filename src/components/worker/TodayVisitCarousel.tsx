import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChevronRight, Plus, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInSeconds } from 'date-fns';

interface VisitCard {
  id: string;
  visit_number: string;
  visit_status: string;
  visit_type: string | null;
  service_date: string;
  arrival_time: string | null;
  completion_time: string | null;
  service_summary: string | null;
  properties: { property_name: string; address_line_1: string | null; city: string | null } | null;
  customers: { first_name: string; last_name: string; phone: string | null } | null;
  jobs: { assigned_to: string | null; service_category: string | null } | null;
  assigned_worker_name?: string | null;
}

interface TodayVisitCarouselProps {
  visits: VisitCard[];
  workerInitials: string;
}

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TodayVisitCarousel({ visits, workerInitials }: TodayVisitCarouselProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = visits.filter(v => v.visit_status === 'Completed').length;

  // Sort: in-progress first, then scheduled, then completed
  const sorted = useMemo(() => {
    const order: Record<string, number> = { 'In Progress': 0, 'En Route': 1, 'Scheduled': 2, 'Planned': 3, 'Completed': 4 };
    return [...visits].sort((a, b) => (order[a.visit_status] ?? 3) - (order[b.visit_status] ?? 3));
  }, [visits]);

  if (visits.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Summary line */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">
            {visits.length} visit{visits.length !== 1 ? 's' : ''} today
          </p>
          {completedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {completedCount} visit{completedCount !== 1 ? 's' : ''} complete
            </p>
          )}
        </div>
        <Link
          to="/worker/schedule"
          className="text-xs font-medium text-primary flex items-center gap-0.5 hover:underline"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {sorted.map(visit => {
          const isInProgress = visit.visit_status === 'In Progress' || visit.visit_status === 'En Route';
          const isCompleted = visit.visit_status === 'Completed';
          const customerName = visit.customers
            ? `${visit.customers.first_name} ${visit.customers.last_name}`
            : 'Unknown';
          const address = visit.properties?.address_line_1 || '';
          const propertyName = visit.properties?.property_name || '';
          const serviceCategory = (visit.jobs as any)?.service_category || visit.visit_type || '';
          const displayAddress = [propertyName, address].filter(Boolean).join(' • ');

          // Calculate elapsed time for in-progress visits
          let elapsedSeconds = 0;
          if (isInProgress && visit.arrival_time) {
            elapsedSeconds = Math.max(0, differenceInSeconds(now, new Date(visit.arrival_time)));
          }

          // Calculate completion duration
          let completionDuration = '';
          if (isCompleted && visit.arrival_time && visit.completion_time) {
            const dur = differenceInSeconds(new Date(visit.completion_time), new Date(visit.arrival_time));
            const h = Math.floor(dur / 3600);
            const m = Math.floor((dur % 3600) / 60);
            const s = dur % 60;
            completionDuration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }

          return (
            <Link
              key={visit.id}
              to={`/worker/visit/${visit.id}`}
              className="snap-start shrink-0 w-[280px]"
            >
              <Card className={cn(
                'h-full transition-shadow active:shadow-md overflow-hidden',
                isInProgress && 'ring-2 ring-primary/30',
                isCompleted && 'opacity-80'
              )}>
                <CardContent className="p-0">
                  {/* Left border accent */}
                  <div className="flex h-full">
                    <div className={cn(
                      'w-1 shrink-0 rounded-l-lg',
                      isCompleted ? 'bg-emerald-500' :
                      isInProgress ? 'bg-primary animate-pulse' :
                      'bg-primary'
                    )} />
                    <div className="flex-1 p-3 space-y-1.5">
                      {/* Top row: customer name + timer/completion */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isCompleted && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                            <p className={cn(
                              'text-sm font-semibold truncate',
                              isCompleted ? 'text-muted-foreground' : 'text-foreground'
                            )}>
                              {customerName}
                            </p>
                          </div>
                        </div>
                        {isInProgress && visit.arrival_time && (
                          <span className="text-xs font-mono font-bold text-primary tabular-nums whitespace-nowrap">
                            {formatTimer(elapsedSeconds)}
                          </span>
                        )}
                        {isCompleted && completionDuration && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                              {completionDuration}
                            </span>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          </div>
                        )}
                      </div>

                      {/* Time window */}
                      <p className="text-[11px] text-muted-foreground">
                        {visit.arrival_time
                          ? new Date(visit.arrival_time).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
                          : 'Anytime'}
                      </p>

                      {/* Address / property */}
                      {displayAddress && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {displayAddress}
                        </p>
                      )}

                      {/* Bottom row: service category + initials */}
                      <div className="flex items-center justify-between pt-0.5">
                        {serviceCategory && (
                          <span className="text-[11px] text-primary font-medium truncate">
                            {serviceCategory}
                          </span>
                        )}
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 ml-auto">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {workerInitials}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Schedule a New Job card */}
        <Link to="/worker/schedule" className="snap-start shrink-0 w-[280px]">
          <Card className="h-full border-dashed border-2 hover:border-primary/40 transition-colors">
            <CardContent className="p-0 h-full flex items-center justify-center min-h-[120px]">
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-5 w-5" />
                <span className="text-sm font-semibold">View Schedule</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
