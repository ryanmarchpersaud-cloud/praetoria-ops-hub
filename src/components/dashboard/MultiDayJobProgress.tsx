import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarRange, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useMultiDayJobProgress } from '@/hooks/useDashboardInsights';
import { cn } from '@/lib/utils';

export function MultiDayJobProgress() {
  const { data: jobs = [], isLoading } = useMultiDayJobProgress();

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <CalendarRange className="h-4 w-4 text-violet-600" />
            </span>
            Multi-Day Job Progress
          </CardTitle>
          <Link to="/jobs" className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1.5">No multi-day jobs in progress.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(j => {
              const pct = Math.round((j.completed / j.total) * 100);
              return (
                <Link key={j.id} to={`/jobs/${j.id}`} className="block group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium truncate group-hover:underline">
                        <span className="font-mono text-muted-foreground mr-1.5">{j.job_number}</span>
                        {j.job_title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {j.nextDate ? `Next visit ${format(new Date(`${j.nextDate}T12:00:00`), 'MMM d')}` : 'No upcoming visit scheduled'}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums shrink-0">
                      {j.completed}/{j.total} visits
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500')}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
